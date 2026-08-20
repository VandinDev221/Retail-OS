export const PERMISSIONS = [
  // Products
  'products:read',
  'products:create',
  'products:update',
  'products:delete',
  
  // Stock & Inventory
  'stock:read',
  'stock:adjust',
  'stock:inventory',
  'stock:lots',
  
  // Purchases
  'purchases:read',
  'purchases:create',
  'purchases:receive',
  'purchases:cancel',
  
  // Sales & POS
  'sales:read',
  'sales:create',
  'sales:cancel',
  'sales:refund',
  'sales:discount',
  
  // Cash register
  'cash:open',
  'cash:close',
  'cash:supply',
  'cash:sangria',
  'cash:view_blind_closure',
  
  // Customers & Suppliers
  'customers:read',
  'customers:write',
  'suppliers:read',
  'suppliers:write',
  
  // Finance
  'finance:read',
  'finance:payables',
  'finance:receivables',
  
  // Fiscal
  'fiscal:emit',
  'fiscal:cancel',
  'fiscal:manage',
  
  // Reports
  'reports:sales',
  'reports:stock',
  'reports:cash',
  'reports:finance',
  
  // Admin & Settings
  'users:manage',
  'roles:manage',
  'stores:manage',
  'settings:manage',
  'audit:read',
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: [...PERMISSIONS],
  GERENTE: [
    'products:read', 'products:create', 'products:update',
    'stock:read', 'stock:adjust', 'stock:inventory', 'stock:lots',
    'purchases:read', 'purchases:create', 'purchases:receive',
    'sales:read', 'sales:create', 'sales:cancel', 'sales:refund', 'sales:discount',
    'cash:open', 'cash:close', 'cash:supply', 'cash:sangria', 'cash:view_blind_closure',
    'customers:read', 'customers:write', 'suppliers:read', 'suppliers:write',
    'finance:read', 'finance:payables', 'finance:receivables',
    'fiscal:emit', 'fiscal:cancel', 'fiscal:manage',
    'reports:sales', 'reports:stock', 'reports:cash', 'reports:finance',
    'audit:read',
  ],
  CAIXA: [
    'products:read',
    'sales:read', 'sales:create',
    'cash:open', 'cash:close', 'cash:supply', 'cash:sangria',
    'customers:read', 'customers:write',
  ],
  ESTOQUISTA: [
    'products:read', 'products:create', 'products:update',
    'stock:read', 'stock:adjust', 'stock:inventory', 'stock:lots',
    'purchases:read', 'purchases:receive',
    'suppliers:read',
  ],
  VENDEDOR: [
    'products:read',
    'sales:read', 'sales:create',
    'customers:read', 'customers:write',
  ],
  FINANCEIRO: [
    'finance:read', 'finance:payables', 'finance:receivables',
    'reports:sales', 'reports:cash', 'reports:finance',
    'purchases:read', 'sales:read', 'cash:view_blind_closure',
  ],
};
