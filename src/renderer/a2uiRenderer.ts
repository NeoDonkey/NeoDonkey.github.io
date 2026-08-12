import { sanitisePayload, sanitiseUrl } from '../sanitizer/sanitizer';

/**
 * A2UI Component Schema Types (v0.9.1 / v1.0 compatible)
 * Generic, domain-agnostic UI component definitions.
 */

export type A2UIComponentType =
  | 'Container'
  | 'Column'
  | 'Row'
  | 'Grid'
  | 'Card'
  | 'Heading'
  | 'Text'
  | 'Metric'
  | 'Table'
  | 'Chart'
  | 'Notice'
  | 'Button'
  | 'Divider';

export interface BaseA2UIComponent {
  type: A2UIComponentType;
  id?: string;
  className?: string;
}

export interface ContainerComponent extends BaseA2UIComponent {
  type: 'Container' | 'Column' | 'Row' | 'Grid';
  children: A2UIComponent[];
}

export interface CardComponent extends BaseA2UIComponent {
  type: 'Card';
  title?: string;
  subtitle?: string;
  children: A2UIComponent[];
}

export interface HeadingComponent extends BaseA2UIComponent {
  type: 'Heading';
  text: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface TextComponent extends BaseA2UIComponent {
  type: 'Text';
  text: string;
  variant?: 'body' | 'caption' | 'code' | 'muted';
}

export interface MetricComponent extends BaseA2UIComponent {
  type: 'Metric';
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface TableComponent extends BaseA2UIComponent {
  type: 'Table';
  caption?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartComponent extends BaseA2UIComponent {
  type: 'Chart';
  title?: string;
  chartType: 'bar' | 'line';
  data: ChartDataPoint[];
}

export interface NoticeComponent extends BaseA2UIComponent {
  type: 'Notice';
  title?: string;
  message: string;
  level?: 'info' | 'warning' | 'success' | 'error';
}

export interface ButtonComponent extends BaseA2UIComponent {
  type: 'Button';
  label: string;
  actionUrl?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface DividerComponent extends BaseA2UIComponent {
  type: 'Divider';
}

export type A2UIComponent =
  | ContainerComponent
  | CardComponent
  | HeadingComponent
  | TextComponent
  | MetricComponent
  | TableComponent
  | ChartComponent
  | NoticeComponent
  | ButtonComponent
  | DividerComponent;

export interface A2UIRootPayload {
  version?: string;
  title?: string;
  layout: A2UIComponent;
}

/**
 * A2UI to DOM.
 *
 * There is no business vocabulary in this file and there must never be one: no invoice, no
 * article, no supplier (PRD-001 R7). It renders components; the model supplies the meaning. The
 * ERP carries an open defect for making exactly this mistake in its own UI — see
 * `docs/COMPROMISES.md` #13 there — and reproducing it here would cost the site the one thing
 * it exists to demonstrate.
 *
 * Every string reaches the document through `textContent` and never through `innerHTML`, so a
 * component whose text is `<img onerror=…>` renders those characters instead of that element.
 * The payload is sanitised on the way in as well (PRD-001 R8); the two together are why a
 * hostile payload has nowhere left to execute.
 */
export class A2UIRenderer {
  /**
   * Main entry point to render an A2UI payload into a container element.
   */
  public render(payload: A2UIRootPayload, container: HTMLElement): void {
    // Clear container safely
    container.replaceChildren();

    payload = sanitisePayload(payload);

    if (!payload || !payload.layout) {
      const errorMsg = document.createElement('p');
      errorMsg.className = 'a2ui-error';
      errorMsg.textContent = 'Empty or invalid UI layout payload.';
      container.appendChild(errorMsg);
      return;
    }

    if (payload.title) {
      const header = document.createElement('header');
      header.className = 'a2ui-header';
      const h2 = document.createElement('h2');
      h2.textContent = payload.title;
      header.appendChild(h2);
      container.appendChild(header);
    }

    const rootElement = this.build(payload.layout);
    container.appendChild(rootElement);
  }

  /**
   * Recursively renders an individual A2UI component node.
   */
  public renderComponent(comp: A2UIComponent): HTMLElement {
    comp = sanitisePayload(comp);
    return this.build(comp);
  }

  private build(comp: A2UIComponent): HTMLElement {
    if (!comp || !comp.type) {
      const fallback = document.createElement('span');
      fallback.textContent = '';
      return fallback;
    }

    switch (comp.type) {
      case 'Container':
      case 'Column':
      case 'Row':
      case 'Grid':
        return this.renderContainer(comp);
      case 'Card':
        return this.renderCard(comp);
      case 'Heading':
        return this.renderHeading(comp);
      case 'Text':
        return this.renderText(comp);
      case 'Metric':
        return this.renderMetric(comp);
      case 'Table':
        return this.renderTable(comp);
      case 'Chart':
        return this.renderChart(comp);
      case 'Notice':
        return this.renderNotice(comp);
      case 'Button':
        return this.renderButton(comp);
      case 'Divider':
        return this.renderDivider();
      default: {
        const unknown = document.createElement('div');
        unknown.className = 'a2ui-unknown';
        unknown.textContent = `Unknown element type: ${(comp as { type: string }).type}`;
        return unknown;
      }
    }
  }

  private renderContainer(comp: ContainerComponent): HTMLElement {
    const el = document.createElement('div');
    const typeClass = comp.type.toLowerCase();
    el.className = `a2ui-container a2ui-${typeClass}${comp.className ? ' ' + comp.className : ''}`;
    if (comp.id) el.id = comp.id;

    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        el.appendChild(this.build(child));
      }
    }
    return el;
  }

  private renderCard(comp: CardComponent): HTMLElement {
    const card = document.createElement('div');
    card.className = 'a2ui-card';
    if (comp.id) card.id = comp.id;

    if (comp.title) {
      const cardTitle = document.createElement('h3');
      cardTitle.className = 'a2ui-card-title';
      cardTitle.textContent = comp.title;
      card.appendChild(cardTitle);
    }

    if (comp.subtitle) {
      const cardSubtitle = document.createElement('p');
      cardSubtitle.className = 'a2ui-card-subtitle';
      cardSubtitle.textContent = comp.subtitle;
      card.appendChild(cardSubtitle);
    }

    const body = document.createElement('div');
    body.className = 'a2ui-card-body';
    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        body.appendChild(this.build(child));
      }
    }
    card.appendChild(body);
    return card;
  }

  private renderHeading(comp: HeadingComponent): HTMLElement {
    const lvl = comp.level && comp.level >= 1 && comp.level <= 6 ? comp.level : 2;
    const tag = `h${lvl}` as keyof HTMLElementTagNameMap;
    const h = document.createElement(tag);
    h.className = `a2ui-heading a2ui-h${lvl}`;
    h.textContent = comp.text || '';
    if (comp.id) h.id = comp.id;
    return h;
  }

  private renderText(comp: TextComponent): HTMLElement {
    const p = document.createElement(comp.variant === 'code' ? 'code' : 'p');
    const variantClass = comp.variant ? ` a2ui-text-${comp.variant}` : '';
    p.className = `a2ui-text${variantClass}`;
    p.textContent = comp.text || '';
    if (comp.id) p.id = comp.id;
    return p;
  }

  private renderMetric(comp: MetricComponent): HTMLElement {
    const metric = document.createElement('div');
    metric.className = 'a2ui-metric';
    if (comp.id) metric.id = comp.id;

    const label = document.createElement('div');
    label.className = 'a2ui-metric-label';
    label.textContent = comp.label || '';
    metric.appendChild(label);

    const val = document.createElement('div');
    val.className = 'a2ui-metric-value';
    val.textContent = comp.value || '';
    metric.appendChild(val);

    if (comp.change) {
      const change = document.createElement('div');
      const trendClass = comp.trend ? ` a2ui-trend-${comp.trend}` : '';
      change.className = `a2ui-metric-change${trendClass}`;
      change.textContent = comp.change;
      metric.appendChild(change);
    }

    return metric;
  }

  private renderTable(comp: TableComponent): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'a2ui-table-wrapper';
    if (comp.id) wrapper.id = comp.id;

    const table = document.createElement('table');
    table.className = 'a2ui-table';

    if (comp.caption) {
      const cap = document.createElement('caption');
      cap.textContent = comp.caption;
      table.appendChild(cap);
    }

    if (Array.isArray(comp.headers) && comp.headers.length > 0) {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      for (const hText of comp.headers) {
        const th = document.createElement('th');
        th.textContent = hText;
        tr.appendChild(th);
      }
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    const tbody = document.createElement('tbody');
    if (Array.isArray(comp.rows)) {
      for (const rowCells of comp.rows) {
        const tr = document.createElement('tr');
        if (Array.isArray(rowCells)) {
          for (const cellVal of rowCells) {
            const td = document.createElement('td');
            td.textContent = String(cellVal);
            tr.appendChild(td);
          }
        }
        tbody.appendChild(tr);
      }
    }
    table.appendChild(tbody);

    wrapper.appendChild(table);
    return wrapper;
  }

  private renderChart(comp: ChartComponent): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'a2ui-chart-wrapper';
    if (comp.id) wrapper.id = comp.id;

    if (comp.title) {
      const chartTitle = document.createElement('h4');
      chartTitle.className = 'a2ui-chart-title';
      chartTitle.textContent = comp.title;
      wrapper.appendChild(chartTitle);
    }

    const container = document.createElement('div');
    container.className = `a2ui-chart a2ui-chart-${comp.chartType || 'bar'}`;

    if (Array.isArray(comp.data) && comp.data.length > 0) {
      const maxVal = Math.max(...comp.data.map(d => d.value), 1);

      for (const item of comp.data) {
        const barRow = document.createElement('div');
        barRow.className = 'a2ui-chart-item';

        const label = document.createElement('span');
        label.className = 'a2ui-chart-label';
        label.textContent = item.label;
        barRow.appendChild(label);

        const track = document.createElement('div');
        track.className = 'a2ui-chart-bar-track';

        const fill = document.createElement('div');
        fill.className = 'a2ui-chart-bar-fill';
        const pct = Math.min(100, Math.max(0, (item.value / maxVal) * 100));
        fill.style.width = `${pct}%`;
        if (item.color) {
          fill.style.backgroundColor = item.color;
        }

        track.appendChild(fill);
        barRow.appendChild(track);

        const valSpan = document.createElement('span');
        valSpan.className = 'a2ui-chart-value';
        valSpan.textContent = String(item.value);
        barRow.appendChild(valSpan);

        container.appendChild(barRow);
      }
    }

    wrapper.appendChild(container);
    return wrapper;
  }

  private renderNotice(comp: NoticeComponent): HTMLElement {
    const notice = document.createElement('div');
    const levelClass = comp.level ? ` a2ui-notice-${comp.level}` : ' a2ui-notice-info';
    notice.className = `a2ui-notice${levelClass}`;
    if (comp.id) notice.id = comp.id;

    if (comp.title) {
      const title = document.createElement('strong');
      title.className = 'a2ui-notice-title';
      title.textContent = comp.title;
      notice.appendChild(title);
    }

    const msg = document.createElement('p');
    msg.className = 'a2ui-notice-message';
    msg.textContent = comp.message || '';
    notice.appendChild(msg);

    return notice;
  }

  private renderButton(comp: ButtonComponent): HTMLElement {
    const btn = document.createElement(comp.actionUrl ? 'a' : 'button');
    const variantClass = comp.variant ? ` a2ui-btn-${comp.variant}` : ' a2ui-btn-primary';
    btn.className = `a2ui-button${variantClass}`;
    btn.textContent = comp.label || '';
    if (comp.id) btn.id = comp.id;

    if (comp.actionUrl) {
      btn.setAttribute('href', sanitiseUrl(comp.actionUrl));
    }

    return btn;
  }

  private renderDivider(): HTMLElement {
    const hr = document.createElement('hr');
    hr.className = 'a2ui-divider';
    return hr;
  }
}
