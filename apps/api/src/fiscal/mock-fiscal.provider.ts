import { Injectable, Logger } from '@nestjs/common';
import { FiscalProvider, EmitFiscalInput, FiscalResult } from './fiscal.provider';
import { FiscalStatus } from '@prisma/client';

@Injectable()
export class MockFiscalProvider implements FiscalProvider {
  private readonly logger = new Logger(MockFiscalProvider.name);

  async emitir(data: EmitFiscalInput): Promise<FiscalResult> {
    this.logger.log(`[FiscalProvider] Emitindo documento fiscal para a venda ${data.saleCode}`);
    
    // Gerar chave de acesso NFC-e simulada (44 dígitos)
    const uf = '35'; // SP
    const aamm = '2608';
    const cnpj = '12345678000190';
    const mod = '65'; // NFC-e
    const serie = '001';
    const nNF = String(Math.floor(100000 + Math.random() * 900000));
    const cNF = String(Math.floor(10000000 + Math.random() * 90000000));
    const cDV = '7';
    const key = `${uf}${aamm}${cnpj}${mod}${serie}${nNF}1${cNF}${cDV}`;

    const protocol = `135260000${Math.floor(100000 + Math.random() * 900000)}`;
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><infNFe Id="NFe${key}"><ide><nNF>${nNF}</nNF></ide><total><vNF>${data.totalAmount.toFixed(2)}</vNF></total></infNFe></NFe><protNFe><infProt><nProt>${protocol}</nProt></infProt></protNFe></nfeProc>`;

    return {
      status: FiscalStatus.AUTHORIZED,
      key,
      number: parseInt(nNF, 10),
      series: 1,
      protocol,
      xml: mockXml,
    };
  }

  async consultar(key: string): Promise<FiscalResult> {
    return {
      status: FiscalStatus.AUTHORIZED,
      key,
      number: 1,
      series: 1,
      protocol: '135260000123456',
    };
  }

  async cancelar(key: string, reason: string): Promise<FiscalResult> {
    this.logger.log(`[FiscalProvider] Cancelando documento fiscal ${key}: ${reason}`);
    return {
      status: FiscalStatus.CANCELLED,
      key,
      number: 1,
      series: 1,
      protocol: `135260000999999`,
    };
  }

  async inutilizar(series: number, startNum: number, endNum: number, reason: string): Promise<boolean> {
    this.logger.log(`[FiscalProvider] Inutilizando numeração ${series} de ${startNum} a ${endNum}`);
    return true;
  }

  async status(): Promise<{ online: boolean; message: string }> {
    return {
      online: true,
      message: 'SEFAZ Autorizadora Operacional (Ambiente de Homologação / Simulado)',
    };
  }
}
