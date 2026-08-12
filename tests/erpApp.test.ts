import { describe, it, expect, beforeEach } from 'vitest';
import { ERPApp } from '../src/erp/erpApp';

describe('Base ERP Application Tests (Progressive Enhancement - PRD-001 R2)', () => {
  let container: HTMLElement;
  let app: ERPApp;

  beforeEach(() => {
    container = document.createElement('div');
    app = new ERPApp(container);
    app.render();
  });

  it('renders dashboard overview by default with dummy company metrics', () => {
    const brand = container.querySelector('.erp-title');
    expect(brand?.textContent).toContain('GmbH');

    const metricsGrid = container.querySelector('.erp-metrics-grid');
    expect(metricsGrid).not.toBeNull();

    const metricCards = container.querySelectorAll('.erp-card');
    expect(metricCards.length).toBe(4);
  });

  it('navigates between views (Articles, Suppliers, Invoices)', () => {
    // Switch to Articles
    app.setView('articles');
    expect(app.getCurrentView()).toBe('articles');
    let h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Articles & Inventory');
    let rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);

    // Switch to Suppliers
    app.setView('suppliers');
    expect(app.getCurrentView()).toBe('suppliers');
    h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Suppliers & Vendors');
    rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);

    // Switch to Invoices
    app.setView('invoices');
    expect(app.getCurrentView()).toBe('invoices');
    h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Invoices');
    rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
  });

  it('functions completely standalone without Copilot enabled or loaded', () => {
    const store = app.getStore();
    expect(store.getArticles().length).toBeGreaterThan(0);
    expect(store.getInvoices().length).toBeGreaterThan(0);
    expect(store.getSummaryMetrics().totalArticles).toBe(5);
  });
});
