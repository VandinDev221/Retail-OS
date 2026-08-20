import { PaymentMethod, StockMovementType, UserRoleType } from './enums';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  storeId?: string;
  role: UserRoleType;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRoleType;
    tenantId: string;
    storeId?: string;
    permissions: string[];
  };
}

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  notes?: string;
}

export interface SalePaymentInput {
  method: PaymentMethod;
  amount: number;
  installments?: number;
  reference?: string;
}

export interface CreateSaleInput {
  customerId?: string;
  terminalId?: string;
  cashSessionId?: string;
  items: SaleItemInput[];
  payments: SalePaymentInput[];
  discount: number;
  notes?: string;
  idempotencyKey?: string;
}
