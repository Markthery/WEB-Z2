/**
 * Базовый (абстрактный) класс всех виджетов.
 * Отвечает за обёртку, шапку, сворачивание, закрытие и очистку слушателей.
 */
export class UIComponent {
  static type = 'base';
  static label = 'Виджет';

  constructor({ id, title = 'Виджет', color = 'white', minimized = false } = {}) {
    if (new.target === UIComponent) {
      throw new Error('UIComponent — абстрактный класс, создавайте его наследников');
    }
    this.id = id ?? UIComponent.uid();
    this.title = title;
    this.color = color;
    this.minimized = minimized;

    this.element = null;
    this.body = null;
    this.onClose = null;   // назначает Dashboard
    this.onChange = null;  // назначает Dashboard (сохранение состояния)

    this._listeners = [];
    this._abort = new AbortController();
  }

  static uid() {
    return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  /** Возвращает DOM-элемент виджета (создаёт один раз). */
  render() {
    if (this.element) return this.element;

    const el = document.createElement('article');
    el.className = 'widget';
    el.dataset.color = this.color;
    el.dataset.id = this.id;
    el.innerHTML = `
      <header class="widget__header">
        <h2 class="widget__title"></h2>
        <div class="widget__controls">
          <button type="button" class="widget__btn" data-action="minimize"></button>
          <button type="button" class="widget__btn" data-action="close" aria-label="Закрыть виджет">×</button>
        </div>
      </header>
      <div class="widget__body"></div>`;
    el.querySelector('.widget__title').textContent = this.title;

    this.element = el;
    this.body = el.querySelector('.widget__body');
    this.body.append(this.renderBody());

    this.listen(el.querySelector('.widget__controls'), 'click', (event) => {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'minimize') this.minimize();
      if (btn.dataset.action === 'close') this.close();
    });

    this._syncMinimized();
    this.onMounted();
    return el;
  }

  /** Наследники возвращают DOM-узел с содержимым. */
  renderBody() {
    throw new Error(`${this.constructor.name}: метод renderBody() не реализован`);
  }

  /** Вызывается после того, как элемент создан (например, для загрузки данных). */
  onMounted() {}

  /** Состояние для сохранения. Переопределяется в наследниках. */
  getState() {
    return {};
  }

  minimize() {
    this.minimized = !this.minimized;
    this._syncMinimized();
    this.emitChange();
  }

  close() {
    this.onClose?.(this.id);
  }

  emitChange() {
    this.onChange?.(this);
  }

  /** Регистрирует слушатель так, чтобы destroy() смог его снять. */
  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push({ target, type, handler, options });
  }

  /** fetch с автоматической отменой при удалении виджета. */
  async fetchJson(url) {
    const response = await fetch(url, { signal: this._abort.signal });
    if (!response.ok) throw new Error(`Сервис ответил с ошибкой (${response.status})`);
    return response.json();
  }

  destroy() {
    this._abort.abort();
    this._listeners.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });
    this._listeners = [];
    this.element?.remove();
    this.element = null;
    this.body = null;
    this.onClose = null;
    this.onChange = null;
  }

  _syncMinimized() {
    const btn = this.element.querySelector('[data-action="minimize"]');
    this.element.classList.toggle('is-minimized', this.minimized);
    btn.textContent = this.minimized ? '+' : '–';
    btn.setAttribute('aria-label', this.minimized ? 'Развернуть виджет' : 'Свернуть виджет');
    btn.setAttribute('aria-expanded', String(!this.minimized));
  }
}
