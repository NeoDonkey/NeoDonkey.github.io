import { ERPStore } from './company';

export type ERPView = 'dashboard' | 'articles' | 'suppliers' | 'invoices';

export class ERPApp {
  private store: ERPStore;
  private currentView: ERPView = 'dashboard';
  private container: HTMLElement;

  constructor(container: HTMLElement, store?: ERPStore) {
    this.container = container;
    this.store = store || new ERPStore();
  }

  public render(): void {
    this.container.replaceChildren();

    const appWrapper = document.createElement('div');
    appWrapper.className = 'erp-wrapper';

    // Header / Nav
    const header = this.createHeader();
    appWrapper.appendChild(header);

    // Main content area
    const mainContent = document.createElement('main');
    mainContent.className = 'erp-main';
    mainContent.id = 'erp-main-content';

    switch (this.currentView) {
      case 'dashboard':
        mainContent.appendChild(this.renderDashboard());
        break;
      case 'articles':
        mainContent.appendChild(this.renderArticles());
        break;
      case 'suppliers':
        mainContent.appendChild(this.renderSuppliers());
        break;
      case 'invoices':
        mainContent.appendChild(this.renderInvoices());
        break;
    }

    appWrapper.appendChild(mainContent);
    this.container.appendChild(appWrapper);
  }

  public setView(view: ERPView): void {
    this.currentView = view;
    this.render();
  }

  public getCurrentView(): ERPView {
    return this.currentView;
  }

  public getStore(): ERPStore {
    return this.store;
  }

  private createHeader(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'erp-nav';

    const brand = document.createElement('div');
    brand.className = 'erp-brand';
    brand.innerHTML = `
      <span class="erp-logo">🫏</span>
      <span class="erp-title">${this.store.getCompany().name}</span>
    `;

    const tabs = document.createElement('div');
    tabs.className = 'erp-tabs';

    const views: { id: ERPView; label: string }[] = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'articles', label: 'Articles' },
      { id: 'suppliers', label: 'Suppliers' },
      { id: 'invoices', label: 'Invoices' },
    ];

    for (const v of views) {
      const btn = document.createElement('button');
      btn.className = `erp-tab-btn${this.currentView === v.id ? ' active' : ''}`;
      btn.textContent = v.label;
      btn.addEventListener('click', () => this.setView(v.id));
      tabs.appendChild(btn);
    }

    nav.appendChild(brand);
    nav.appendChild(tabs);
    return nav;
  }

  private renderDashboard(): HTMLElement {
    const section = document.createElement('section');
    section.className = 'erp-dashboard';

    const metrics = this.store.getSummaryMetrics();

    const header = document.createElement('div');
    header.className = 'erp-page-header';
    header.innerHTML = `
      <h2>Company Overview</h2>
      <p class="erp-subtext">Registration: ${this.store.getCompany().registrationNumber} | Currency: ${this.store.getCompany().currency}</p>
    `;
    section.appendChild(header);

    // Metric Cards Grid
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'erp-metrics-grid';

    cardsGrid.appendChild(this.createMetricCard('Inventory Value', `€${metrics.totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `${metrics.totalArticles} Articles in stock`));
    cardsGrid.appendChild(this.createMetricCard('Total Invoices', `€${metrics.totalInvoicesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, `${metrics.totalInvoices} Invoices recorded`));
    cardsGrid.appendChild(this.createMetricCard('Suppliers', `${metrics.totalSuppliers}`, 'Active partners'));
    cardsGrid.appendChild(this.createMetricCard('Overdue Invoices', `${metrics.overdueCount}`, metrics.overdueCount > 0 ? 'Requires attention' : 'All clear', metrics.overdueCount > 0 ? 'warning' : 'success'));

    section.appendChild(cardsGrid);
    return section;
  }

  private renderArticles(): HTMLElement {
    const section = document.createElement('section');
    section.className = 'erp-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Articles & Inventory';
    section.appendChild(h2);

    const table = document.createElement('table');
    table.className = 'erp-data-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>SKU</th>
          <th>Article Name</th>
          <th>Category</th>
          <th>Unit Price</th>
          <th>Stock</th>
        </tr>
      </thead>
      <tbody>
        ${this.store.getArticles().map(a => `
          <tr>
            <td><code>${a.sku}</code></td>
            <td><strong>${a.name}</strong></td>
            <td>${a.category}</td>
            <td>€${a.unitPrice.toFixed(2)}</td>
            <td><span class="badge ${a.stock < 500 ? 'badge-low' : 'badge-ok'}">${a.stock} units</span></td>
          </tr>
        `).join('')}
      </tbody>
    `;

    section.appendChild(table);
    return section;
  }

  private renderSuppliers(): HTMLElement {
    const section = document.createElement('section');
    section.className = 'erp-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Suppliers & Vendors';
    section.appendChild(h2);

    const table = document.createElement('table');
    table.className = 'erp-data-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Supplier Name</th>
          <th>Contact Email</th>
          <th>Country</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        ${this.store.getSuppliers().map(s => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.contactEmail}</td>
            <td>${s.country}</td>
            <td>★ ${s.rating.toFixed(1)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    section.appendChild(table);
    return section;
  }

  private renderInvoices(): HTMLElement {
    const section = document.createElement('section');
    section.className = 'erp-section';

    const h2 = document.createElement('h2');
    h2.textContent = 'Invoices';
    section.appendChild(h2);

    const table = document.createElement('table');
    table.className = 'erp-data-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Supplier</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${this.store.getInvoices().map(i => `
          <tr>
            <td><code>${i.number}</code></td>
            <td>${i.supplierName}</td>
            <td>${i.date}</td>
            <td>${i.dueDate}</td>
            <td><strong>€${i.amount.toFixed(2)}</strong></td>
            <td><span class="status-pill status-${i.status}">${i.status.toUpperCase()}</span></td>
          </tr>
        `).join('')}
      </tbody>
    `;

    section.appendChild(table);
    return section;
  }

  private createMetricCard(label: string, value: string, sub: string, type: 'normal' | 'warning' | 'success' = 'normal'): HTMLElement {
    const card = document.createElement('div');
    card.className = `erp-card erp-card-${type}`;
    card.innerHTML = `
      <div class="erp-card-label">${label}</div>
      <div class="erp-card-value">${value}</div>
      <div class="erp-card-subtext">${sub}</div>
    `;
    return card;
  }
}
