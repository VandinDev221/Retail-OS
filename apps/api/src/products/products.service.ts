import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { Prisma } from '@prisma/client';

export interface CreateProductDto {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  additionalBarcodes?: string[];
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  costPrice: number;
  salePrice: number;
  minStock?: number;
  maxStock?: number;
  trackLots?: boolean;
  ncm?: string;
  cest?: string;
  cfop?: string;
  taxPercentage?: number;
  active?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string; categoryId?: string; activeOnly?: boolean; storeId?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(query.activeOnly ? { active: true } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    };

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { barcode: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { additionalBarcodes: { some: { barcode: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, symbol: true } },
          additionalBarcodes: { select: { id: true, barcode: true } },
          stockBalances: query.storeId ? { where: { storeId: query.storeId } } : true,
          stockLots: query.storeId ? { where: { storeId: query.storeId, quantity: { gt: 0 } }, orderBy: { expirationDate: 'asc' } } : false,
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByBarcode(tenantId: string, barcode: string, storeId?: string) {
    const cleanCode = barcode.trim();

    // Cache check para lookup ultra-rápido no PDV
    const cacheKey = `product:barcode:${tenantId}:${cleanCode}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    // Buscar por barcode principal ou barcodes adicionais ou SKU
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        active: true,
        OR: [
          { barcode: cleanCode },
          { sku: cleanCode },
          { additionalBarcodes: { some: { barcode: cleanCode } } },
        ],
      },
      include: {
        category: true,
        unit: true,
        brand: true,
        additionalBarcodes: true,
        stockBalances: storeId ? { where: { storeId } } : true,
        stockLots: storeId
          ? {
              where: { storeId, quantity: { gt: 0 } },
              orderBy: { expirationDate: 'asc' }, // Ordenado para FEFO
            }
          : false,
      },
    });

    if (!product) {
      throw new NotFoundException(`Produto não encontrado com o código "${barcode}"`);
    }

    // Cacheia por 60 segundos
    await this.cacheService.set(cacheKey, product, 60);

    return product;
  }

  async findById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        brand: true,
        unit: true,
        additionalBarcodes: true,
        stockBalances: {
          include: { store: true, location: true },
        },
        stockLots: {
          where: { quantity: { gt: 0 } },
          orderBy: { expirationDate: 'asc' },
        },
      },
    });

    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto) {
    // Validar duplicidade de SKU ou Barcode
    if (dto.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { tenantId, sku: dto.sku },
      });
      if (existingSku) throw new ConflictException('Já existe um produto com este SKU');
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: { tenantId, barcode: dto.barcode },
      });
      if (existingBarcode) throw new ConflictException('Já existe um produto com este Código de Barras');
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          sku: dto.sku,
          barcode: dto.barcode,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          unitId: dto.unitId,
          costPrice: dto.costPrice,
          salePrice: dto.salePrice,
          minStock: dto.minStock ?? 0,
          maxStock: dto.maxStock,
          trackLots: dto.trackLots ?? false,
          ncm: dto.ncm,
          cest: dto.cest,
          cfop: dto.cfop,
          taxPercentage: dto.taxPercentage ?? 0,
          active: dto.active ?? true,
        },
      });

      if (dto.additionalBarcodes && dto.additionalBarcodes.length > 0) {
        await tx.productBarcode.createMany({
          data: dto.additionalBarcodes.map((code) => ({
            tenantId,
            productId: created.id,
            barcode: code,
          })),
        });
      }

      return created;
    });

    // Invalidação de cache
    if (dto.barcode) {
      await this.cacheService.del(`product:barcode:${tenantId}:${dto.barcode}`);
    }

    return this.findById(tenantId, product.id);
  }

  async update(tenantId: string, id: string, dto: Partial<CreateProductDto>) {
    const existing = await this.findById(tenantId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          description: dto.description,
          sku: dto.sku,
          barcode: dto.barcode,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          unitId: dto.unitId,
          costPrice: dto.costPrice,
          salePrice: dto.salePrice,
          minStock: dto.minStock,
          maxStock: dto.maxStock,
          trackLots: dto.trackLots,
          ncm: dto.ncm,
          cest: dto.cest,
          cfop: dto.cfop,
          taxPercentage: dto.taxPercentage,
          active: dto.active,
        },
      });

      if (dto.additionalBarcodes) {
        await tx.productBarcode.deleteMany({
          where: { productId: id, tenantId },
        });

        if (dto.additionalBarcodes.length > 0) {
          await tx.productBarcode.createMany({
            data: dto.additionalBarcodes.map((code) => ({
              tenantId,
              productId: id,
              barcode: code,
            })),
          });
        }
      }

      return prod;
    });

    // Limpar cache
    if (existing.barcode) await this.cacheService.del(`product:barcode:${tenantId}:${existing.barcode}`);
    if (dto.barcode) await this.cacheService.del(`product:barcode:${tenantId}:${dto.barcode}`);

    return this.findById(tenantId, updated.id);
  }

  // Categorias, Marcas e Unidades
  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createCategory(tenantId: string, data: { name: string; description?: string }) {
    return this.prisma.category.create({ data: { tenantId, name: data.name, description: data.description } });
  }

  async getBrands(tenantId: string) {
    return this.prisma.brand.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createBrand(tenantId: string, data: { name: string }) {
    return this.prisma.brand.create({ data: { tenantId, name: data.name } });
  }

  async getUnits(tenantId: string) {
    return this.prisma.unit.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createUnit(tenantId: string, data: { name: string; symbol: string }) {
    return this.prisma.unit.create({ data: { tenantId, name: data.name, symbol: data.symbol } });
  }
}
