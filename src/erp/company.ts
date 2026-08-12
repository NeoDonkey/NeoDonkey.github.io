/**
 * NeoDonkey-ERP Dummy Company Generator & In-Memory Storage
 * 
 * Provides standard ERP data for visitors to explore the ERP immediately.
 */

export interface Article {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  stock: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  country: string;
  rating: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  currency: string;
  status: 'draft' | 'posted' | 'paid' | 'overdue';
}

export interface CompanyData {
  name: string;
  registrationNumber: string;
  currency: string;
  articles: Article[];
  suppliers: Supplier[];
  invoices: Invoice[];
}

export function generateDefaultCompany(): CompanyData {
  return {
    name: 'Donkey Logistics & Trade GmbH',
    registrationNumber: 'HRB 208491 B',
    currency: 'EUR',
    articles: [
      { id: 'art-1', sku: 'ND-1001', name: 'Organic Almond Butter 500g', category: 'Nuts & Butters', unitPrice: 8.90, stock: 1240 },
      { id: 'art-2', sku: 'ND-1002', name: 'Premium Medjool Dates 1kg', category: 'Dried Fruit', unitPrice: 14.50, stock: 850 },
      { id: 'art-3', sku: 'ND-1003', name: 'Cold-Pressed Coconut Oil 1L', category: 'Oils & Fats', unitPrice: 11.20, stock: 430 },
      { id: 'art-4', sku: 'ND-1004', name: 'Rolled Oats Gluten-Free 2.5kg', category: 'Grains & Cereals', unitPrice: 6.80, stock: 3100 },
      { id: 'art-5', sku: 'ND-1005', name: 'Freeze-Dried Raspberries 250g', category: 'Snacks & Superfoods', unitPrice: 12.90, stock: 190 },
    ],
    suppliers: [
      { id: 'sup-1', name: 'Almond Valley Co-Op', contactEmail: 'supply@almondvalley.example', country: 'Spain', rating: 4.8 },
      { id: 'sup-2', name: 'Sahara Harvest Ltd.', contactEmail: 'orders@saharaharvest.example', country: 'Morocco', rating: 4.6 },
      { id: 'sup-3', name: 'Nordic Oats AB', contactEmail: 'info@nordicoats.example', country: 'Sweden', rating: 4.9 },
    ],
    invoices: [
      { id: 'inv-101', number: 'INV-2026-001', date: '2026-07-15', dueDate: '2026-08-15', supplierId: 'sup-1', supplierName: 'Almond Valley Co-Op', amount: 11036.00, currency: 'EUR', status: 'paid' },
      { id: 'inv-102', number: 'INV-2026-002', date: '2026-07-28', dueDate: '2026-08-28', supplierId: 'sup-2', supplierName: 'Sahara Harvest Ltd.', amount: 12325.00, currency: 'EUR', status: 'posted' },
      { id: 'inv-103', number: 'INV-2026-003', date: '2026-08-02', dueDate: '2026-09-02', supplierId: 'sup-3', supplierName: 'Nordic Oats AB', amount: 21080.00, currency: 'EUR', status: 'posted' },
      { id: 'inv-104', number: 'INV-2026-004', date: '2026-06-10', dueDate: '2026-07-10', supplierId: 'sup-1', supplierName: 'Almond Valley Co-Op', amount: 4450.00, currency: 'EUR', status: 'overdue' },
    ],
  };
}

export class ERPStore {
  private company: CompanyData;

  constructor(initialData?: CompanyData) {
    this.company = initialData || generateDefaultCompany();
  }

  public getCompany(): CompanyData {
    return this.company;
  }

  public getArticles(): Article[] {
    return this.company.articles;
  }

  public getSuppliers(): Supplier[] {
    return this.company.suppliers;
  }

  public getInvoices(): Invoice[] {
    return this.company.invoices;
  }

  public getSummaryMetrics() {
    const totalInventoryValue = this.company.articles.reduce(
      (sum, art) => sum + art.unitPrice * art.stock,
      0
    );
    const totalInvoicesAmount = this.company.invoices.reduce(
      (sum, inv) => sum + inv.amount,
      0
    );
    const overdueCount = this.company.invoices.filter(i => i.status === 'overdue').length;

    return {
      totalArticles: this.company.articles.length,
      totalSuppliers: this.company.suppliers.length,
      totalInvoices: this.company.invoices.length,
      totalInventoryValue,
      totalInvoicesAmount,
      overdueCount,
    };
  }
}
