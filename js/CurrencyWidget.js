import { UIComponent } from './UIComponent.js';

const CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'TRY', 'AED', 'THB', 'CNY', 'JPY', 'KZT', 'GEL'];
const ratesCache = new Map(); // base → { rates, updated, at }
const CACHE_MS = 60 * 60 * 1000;

/** Конвертер валют — API open.er-api.com (без ключа). */
export class CurrencyWidget extends UIComponent {
  static type = 'currency';
  static label = 'Курс валют';

  constructor(config = {}) {
    super({ title: 'Курс валют', color: 'yellow', ...config });
    this.amount = config.state?.amount ?? 100;
    this.from = config.state?.from ?? 'USD';
    this.to = config.state?.to ?? 'RUB';
    this.rates = null;
    this.updated = '';
  }

  renderBody() {
    const options = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join('');
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="currency__row">
        <input class="field" name="amount" type="number" min="0" step="any" aria-label="Сумма">
        <select class="field" name="from" aria-label="Из валюты">${options}</select>
      </div>
      <button class="btn btn--swap" type="button" data-action="swap" aria-label="Поменять валюты местами">⇅</button>
      <div class="currency__row">
        <output class="currency__result">—</output>
        <select class="field" name="to" aria-label="В валюту">${options}</select>
      </div>
      <p class="status" role="status"></p>
      <p class="muted currency__rate"></p>`;

    this.amountEl = root.querySelector('[name="amount"]');
    this.fromEl = root.querySelector('[name="from"]');
    this.toEl = root.querySelector('[name="to"]');
    this.resultEl = root.querySelector('.currency__result');
    this.rateEl = root.querySelector('.currency__rate');
    this.statusEl = root.querySelector('.status');

    this.amountEl.value = this.amount;
    this.fromEl.value = this.from;
    this.toEl.value = this.to;

    this.listen(root, 'input', (event) => {
      if (event.target === this.amountEl) {
        this.amount = Number(this.amountEl.value) || 0;
        this.#paint();
        this.emitChange();
      }
    });
    this.listen(root, 'change', (event) => {
      if (event.target === this.fromEl) {
        this.from = this.fromEl.value;
        this.loadRates();
      }
      if (event.target === this.toEl) {
        this.to = this.toEl.value;
        this.#paint();
      }
      this.emitChange();
    });
    this.listen(root, 'click', (event) => {
      if (!event.target.closest('[data-action="swap"]')) return;
      [this.from, this.to] = [this.to, this.from];
      this.fromEl.value = this.from;
      this.toEl.value = this.to;
      this.loadRates();
      this.emitChange();
    });

    return root;
  }

  onMounted() {
    this.loadRates();
  }

  getState() {
    return { amount: this.amount, from: this.from, to: this.to };
  }

  async loadRates() {
    const base = this.from;
    const cached = ratesCache.get(base);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      this.rates = cached.rates;
      this.updated = cached.updated;
      this.#paint();
      return;
    }

    this.statusEl.classList.remove('is-error');
    this.statusEl.textContent = 'Загружаем курсы…';
    try {
      const data = await this.fetchJson(`https://open.er-api.com/v6/latest/${base}`);
      if (data.result !== 'success') throw new Error('Сервис не вернул курсы');
      const entry = { rates: data.rates, updated: data.time_last_update_utc, at: Date.now() };
      ratesCache.set(base, entry);
      if (base !== this.from) return; // пользователь уже выбрал другую валюту
      this.rates = entry.rates;
      this.updated = entry.updated;
      this.#paint();
    } catch (error) {
      if (error.name === 'AbortError' || !this.element) return;
      this.rates = null;
      this.statusEl.classList.add('is-error');
      this.statusEl.textContent =
        error instanceof TypeError ? 'Нет связи с сервисом курсов. Проверьте интернет' : error.message;
      this.resultEl.textContent = '—';
      this.rateEl.textContent = '';
    }
  }

  #paint() {
    if (!this.rates) return;
    const rate = this.rates[this.to];
    if (!rate) return;
    this.statusEl.textContent = '';
    const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
    this.resultEl.textContent = money.format(this.amount * rate);
    const updated = this.updated ? new Date(this.updated).toLocaleDateString('ru-RU') : '';
    this.rateEl.textContent = `1 ${this.from} = ${money.format(rate)} ${this.to}${updated ? ` · обновлено ${updated}` : ''}`;
  }
}
