import { FiscalStatus, FiscalType } from '@prisma/client';

export interface EmitFiscalInput {
  tenantId: string;
  storeId: string;
  saleId: string;
  saleCode: string;
  type: FiscalType;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    ncm?: string;
    cfop?: string;
  }[];
  payments: {
    method: string;
    amount: number;
  }[];
  customer?: {
    name: string;
    document?: string;
  };
  totalAmount: number;
}

export interface FiscalResult {
  status: FiscalStatus;
  key?: string;
  number: number;
  series: number;
  protocol?: string;
  xml?: string;
  errorMessage?: string;
}

export abstract class FiscalProvider {
  abstract emitir(data: EmitFiscalInput): Promise<FiscalResult>;
  abstract consultar(key: string): Promise<FiscalResult>;
  abstract cancelar(key: string, reason: string): Promise<FiscalResult>;
  abstract inutilizar(series: number, startNum: number, endNum: number, reason: string): Promise<boolean>;
  abstract status(): Promise<{ online: boolean; message: string }>;
}
