/**
 * Панель: хранит коллекцию активных виджетов, отрисовывает сетку
 * и сохраняет расположение в localStorage.
 */
const STORAGE_KEY = 'traveler-dashboard:v1';

export class Dashboard {
  #widgets = [];

  /**
   * @param {HTMLElement} container — куда рисуем панель
   * @param {Record<string, typeof import('./UIComponent.js').UIComponent>} registry — тип → класс
   */
  constructor(container, registry) {
    this.registry = registry;
    this.onChange = null;

    this.grid = document.createElement('div');
    this.grid.className = 'grid';
    this.empty = document.createElement('p');
    this.empty.className = 'empty';
    this.empty.textContent = 'Пока пусто. Нажмите любую кнопку выше, чтобы добавить виджет.';
    container.append(this.grid, this.empty);
  }

  get widgets() {
    return [...this.#widgets];
  }

  addWidget(widgetType, config = {}) {
    const WidgetClass = this.registry[widgetType];
    if (!WidgetClass) throw new Error(`Неизвестный тип виджета: ${widgetType}`);

    const widget = new WidgetClass(config);
    widget.onClose = (id) => this.removeWidget(id);
    widget.onChange = () => this.#save();

    this.#widgets.push(widget);
    this.grid.append(widget.render());
    this.#refresh();
    return widget;
  }

  removeWidget(widgetId) {
    const index = this.#widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return false;
    const [widget] = this.#widgets.splice(index, 1);
    widget.destroy();
    this.#refresh();
    return true;
  }

  clear() {
    this.widgets.forEach((w) => this.removeWidget(w.id));
  }

  /** Возвращает true, если в хранилище была сохранённая панель. */
  load() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      saved = null;
    }
    if (!Array.isArray(saved)) return false;

    saved.forEach(({ type, id, minimized, state }) => {
      if (this.registry[type]) this.addWidget(type, { id, minimized, state });
    });
    return true;
  }

  #refresh() {
    this.empty.hidden = this.#widgets.length > 0;
    this.#save();
    this.onChange?.(this);
  }

  #save() {
    const data = this.#widgets.map((w) => ({
      type: w.constructor.type,
      id: w.id,
      minimized: w.minimized,
      state: w.getState(),
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* хранилище недоступно — панель работает без сохранения */
    }
  }
}
