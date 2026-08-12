import { describe, it, expect, beforeEach } from 'vitest';
import { A2UIRenderer, A2UIRootPayload } from '../src/renderer/a2uiRenderer';

describe('A2UI Renderer DOM Generation Tests (PRD-001 R7)', () => {
  let renderer: A2UIRenderer;
  let container: HTMLElement;

  beforeEach(() => {
    renderer = new A2UIRenderer();
    container = document.createElement('div');
  });

  it('renders canned A2UI payload into expected DOM nodes node-by-node', () => {
    const payload: A2UIRootPayload = {
      version: '1.0',
      title: 'Executive Summary',
      layout: {
        type: 'Container',
        id: 'root-container',
        children: [
          {
            type: 'Heading',
            level: 2,
            text: 'Quarterly Overview',
          },
          {
            type: 'Metric',
            id: 'metric-1',
            label: 'Total Revenue',
            value: '$150,000',
            change: '+12%',
            trend: 'up',
          },
          {
            type: 'Table',
            id: 'summary-table',
            headers: ['ID', 'Category', 'Value'],
            rows: [
              ['001', 'Direct Sales', '$90,000'],
              ['002', 'Partnerships', '$60,000'],
            ],
          },
        ],
      },
    };

    renderer.render(payload, container);

    // Assert Root Header
    const header = container.querySelector('.a2ui-header h2');
    expect(header).not.toBeNull();
    expect(header?.textContent).toBe('Executive Summary');

    // Assert Root Container
    const rootCont = container.querySelector('#root-container');
    expect(rootCont).not.toBeNull();

    // Assert Heading
    const heading = container.querySelector('.a2ui-h2');
    expect(heading?.textContent).toBe('Quarterly Overview');

    // Assert Metric Node
    const metricLabel = container.querySelector('.a2ui-metric-label');
    const metricVal = container.querySelector('.a2ui-metric-value');
    expect(metricLabel?.textContent).toBe('Total Revenue');
    expect(metricVal?.textContent).toBe('$150,000');

    // Assert Table Node
    const table = container.querySelector('table.a2ui-table');
    expect(table).not.toBeNull();
    const ths = container.querySelectorAll('th');
    expect(ths.length).toBe(3);
    expect(ths[0].textContent).toBe('ID');
    expect(ths[1].textContent).toBe('Category');
    expect(ths[2].textContent).toBe('Value');

    const tds = container.querySelectorAll('td');
    expect(tds.length).toBe(6);
    expect(tds[0].textContent).toBe('001');
    expect(tds[2].textContent).toBe('$90,000');
  });

  it('renders notice and button components safely', () => {
    const payload: A2UIRootPayload = {
      version: '1.0',
      layout: {
        type: 'Container',
        children: [
          {
            type: 'Notice',
            title: 'System Notice',
            message: 'All operations normal.',
            level: 'success',
          },
          {
            type: 'Button',
            label: 'View Details',
            actionUrl: 'https://example.com/details',
          },
        ],
      },
    };

    renderer.render(payload, container);

    const notice = container.querySelector('.a2ui-notice-success');
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain('System Notice');

    const btn = container.querySelector('a.a2ui-button');
    expect(btn?.getAttribute('href')).toBe('https://example.com/details');
    expect(btn?.textContent).toBe('View Details');
  });
});
