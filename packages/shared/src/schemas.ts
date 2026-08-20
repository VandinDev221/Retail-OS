import { z } from 'zod';
import { PaymentMethod, UserRoleType } from './enums';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  tenantSlug: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  additionalBarcodes: z.array(z.string()).optional(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  costPrice: z.number().min(0, 'Preço de custo não pode ser negativo'),
  salePrice: z.number().min(0, 'Preço de venda não pode ser negativo'),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().optional().nullable(),
  trackLots: z.boolean().default(false),
  ncm: z.string().optional().nullable(),
  cest: z.string().optional().nullable(),
  cfop: z.string().optional().nullable(),
  taxPercentage: z.number().min(0).default(0),
  active: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const createSaleItemSchema = z.object({
  productId: z.string().uuid('ID de produto inválido'),
  quantity: z.number().positive('Quantidade deve ser maior que 0'),
  unitPrice: z.number().positive('Preço unitário deve ser positivo'),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const createSalePaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive('Valor do pagamento deve ser maior que zero'),
  installments: z.number().int().min(1).default(1),
  reference: z.string().optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  terminalId: z.string().uuid().optional().nullable(),
  cashSessionId: z.string().uuid().optional().nullable(),
  items: z.array(createSaleItemSchema).min(1, 'A venda deve conter pelo menos 1 item'),
  payments: z.array(createSalePaymentSchema).min(1, 'A venda deve conter pelo menos 1 pagamento'),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type CreateSaleDTO = z.infer<typeof createSaleSchema>;

export const openCashSessionSchema = z.object({
  cashRegisterId: z.string().uuid(),
  initialBalance: z.number().min(0, 'Valor inicial não pode ser negativo'),
  notes: z.string().optional(),
});

export const cashMovementSchema = z.object({
  amount: z.number().positive('Valor deve ser maior que zero'),
  reason: z.string().min(3, 'Motivo deve ter no mínimo 3 caracteres'),
  notes: z.string().optional(),
});

export const closeCashSessionSchema = z.object({
  reportedBalance: z.number().min(0, 'Saldo informado não pode ser negativo'),
  justification: z.string().optional(),
  notes: z.string().optional(),
});
