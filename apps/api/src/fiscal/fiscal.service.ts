import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FiscalProvider } from './fiscal.provider';
import { FiscalType, FiscalStatus } from '@prisma/client';

@Injectable()
export class FiscalService {
  constructor(
    private prisma: PrismaService,
    private fiscalProvider: FiscalProvider,
  ) {}

  async getStatus() {
    return this.fiscalProvider.status();
  }

  async getDocuments(tenantId: string, storeId?: string) {
    return this.prisma.fiscalDocument.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
      },
      include: {
        sale: { select: { id: true, code: true, total: true, createdAt: true } },
        events: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async emitFiscalDocument(tenantId: string, saleId: string, type: FiscalType = FiscalType.NFCE) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
      },
    });

    if (!sale) throw new NotFoundException('Venda não encontrada');

    // Verificar se já existe documento emitido ou em processamento (Idempotência Fiscal)
    const existingDoc = await this.prisma.fiscalDocument.findFirst({
      where: {
        saleId: sale.id,
        status: { in: [FiscalStatus.AUTHORIZED, FiscalStatus.PROCESSING, FiscalStatus.PENDING] },
      },
    });

    if (existingDoc) {
      if (existingDoc.status === FiscalStatus.AUTHORIZED) {
        throw new BadRequestException('Esta venda já possui documento fiscal autorizado (SEFAZ)');
      }
      return existingDoc;
    }

    // Chamar provedor fiscal
    const result = await this.fiscalProvider.emitir({
      tenantId,
      storeId: sale.storeId,
      saleId: sale.id,
      saleCode: sale.code,
      type,
      totalAmount: Number(sale.total),
      items: sale.items.map((i) => ({
        name: i.product.name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
        ncm: i.product.ncm,
        cfop: i.product.cfop,
      })),
      payments: sale.payments.map((p) => ({
        method: p.method,
        amount: Number(p.amount),
      })),
      customer: sale.customer ? { name: sale.customer.name, document: sale.customer.document } : undefined,
    });

    // Salvar documento fiscal e evento
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.fiscalDocument.create({
        data: {
          tenantId,
          storeId: sale.storeId,
          saleId: sale.id,
          type,
          number: result.number,
          series: result.series,
          key: result.key,
          protocol: result.protocol,
          xml: result.xml,
          status: result.status,
          errorMessage: result.errorMessage,
          issuedAt: new Date(),
        },
      });

      await tx.fiscalEvent.create({
        data: {
          tenantId,
          fiscalDocumentId: doc.id,
          eventType: 'AUTORIZACAO',
          protocol: result.protocol,
          details: `Documento fiscal autorizado pela SEFAZ. Protocolo: ${result.protocol}`,
        },
      });

      return doc;
    });
  }

  async cancelFiscalDocument(tenantId: string, docId: string, reason: string) {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id: docId, tenantId },
    });

    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    if (!doc.key) throw new BadRequestException('Documento não possui chave de acesso');

    const result = await this.fiscalProvider.cancelar(doc.key, reason);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fiscalDocument.update({
        where: { id: doc.id },
        data: { status: result.status },
      });

      await tx.fiscalEvent.create({
        data: {
          tenantId,
          fiscalDocumentId: doc.id,
          eventType: 'CANCELAMENTO',
          protocol: result.protocol,
          details: `Cancelamento: ${reason}`,
        },
      });

      return updated;
    });
  }
}
