import { UIComponent } from './UIComponent.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Обратный отсчёт до вылета. */
export class CountdownWidget extends UIComponent {
  static type = 'countdown';
  static label = 'Обратный отсчёт';

  constructor(config = {}) {
    super({ title: 'До вылета', color: 'pink', ...config });
    this.destination = config.state?.destination ?? '';
    this.date = config.state?.date ?? '';
  }

  renderBody() {
    const root = document.createElement('div');
    root.innerHTML = `
      <label class="label">Куда летим
        <input class="field" name="destination" maxlength="40" placeholder="Например, Стамбул" autocomplete="off">
      </label>
      <label class="label">Дата вылета
        <input class="field" name="date" type="date">
      </label>
      <div class="countdown" aria-live="polite">
        <span class="countdown__num">—</span>
        <span class="countdown__text">Выберите дату поездки</span>
      </div>`;

    this.destInput = root.querySelector('[name="destination"]');
    this.dateInput = root.querySelector('[name="date"]');
    this.numEl = root.querySelector('.countdown__num');
    this.textEl = root.querySelector('.countdown__text');
    this.destInput.value = this.destination;
    this.dateInput.value = this.date;

    this.listen(root, 'input', (event) => {
      if (event.target === this.destInput) this.destination = this.destInput.value.trim();
      if (event.target === this.dateInput) this.date = this.dateInput.value;
      this.#paint();
      this.emitChange();
    });

    this.#paint();
    return root;
  }

  getState() {
    return { destination: this.destination, date: this.date };
  }

  #paint() {
    const place = this.destination ? ` в ${this.destination}` : '';
    if (!this.date) {
      this.numEl.textContent = '—';
      this.textEl.textContent = 'Выберите дату поездки';
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((new Date(`${this.date}T00:00:00`) - today) / DAY_MS);

    if (days > 0) {
      this.numEl.textContent = String(days);
      this.textEl.textContent = `${plural(days, ['день', 'дня', 'дней'])} до вылета${place}`;
    } else if (days === 0) {
      this.numEl.textContent = '0';
      this.textEl.textContent = `Сегодня вылет${place}!`;
    } else {
      this.numEl.textContent = '✓';
      this.textEl.textContent = 'Эта поездка уже позади. Выберите новую дату';
    }
  }
}
