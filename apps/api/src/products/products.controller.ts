import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService, CreateProductDto } from './products.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Produtos & Catálogo')
@ApiBearerAuth()
@Controller('products')
@UseGuards(PermissionsGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @Permissions('products:read')
  @ApiOperation({ summary: 'Listar produtos com paginação e filtros' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.productsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
      categoryId,
      storeId,
    });
  }

  @Get('barcode/:barcode')
  @Permissions('products:read')
  @ApiOperation({ summary: 'Busca rápida de produto por Código de Barras / SKU (Otimizado para PDV)' })
  async findByBarcode(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('storeId') storeId: string,
    @Param('barcode') barcode: string,
  ) {
    return this.productsService.findByBarcode(tenantId, barcode, storeId);
  }

  @Get('categories')
  @Permissions('products:read')
  @ApiOperation({ summary: 'Listar categorias' })
  async getCategories(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getCategories(tenantId);
  }

  @Post('categories')
  @Permissions('products:create')
  @ApiOperation({ summary: 'Criar nova categoria' })
  async createCategory(@CurrentUser('tenantId') tenantId: string, @Body() body: { name: string; description?: string }) {
    return this.productsService.createCategory(tenantId, body);
  }

  @Get('brands')
  @Permissions('products:read')
  @ApiOperation({ summary: 'Listar marcas' })
  async getBrands(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getBrands(tenantId);
  }

  @Post('brands')
  @Permissions('products:create')
  @ApiOperation({ summary: 'Criar marca' })
  async createBrand(@CurrentUser('tenantId') tenantId: string, @Body() body: { name: string }) {
    return this.productsService.createBrand(tenantId, body);
  }

  @Get('units')
  @Permissions('products:read')
  @ApiOperation({ summary: 'Listar unidades de medida' })
  async getUnits(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getUnits(tenantId);
  }

  @Post('units')
  @Permissions('products:create')
  @ApiOperation({ summary: 'Criar unidade de medida' })
  async createUnit(@CurrentUser('tenantId') tenantId: string, @Body() body: { name: string; symbol: string }) {
    return this.productsService.createUnit(tenantId, body);
  }

  @Get(':id')
  @Permissions('products:read')
  @ApiOperation({ summary: 'Detalhes do produto' })
  async findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.productsService.findById(tenantId, id);
  }

  @Post()
  @Permissions('products:create')
  @ApiOperation({ summary: 'Cadastrar produto' })
  async create(@CurrentUser('tenantId') tenantId: string, @Body() body: CreateProductDto) {
    return this.productsService.create(tenantId, body);
  }

  @Put(':id')
  @Permissions('products:update')
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Partial<CreateProductDto>) {
    return this.productsService.update(tenantId, id, body);
  }
}
