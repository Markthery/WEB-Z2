import { UIComponent } from './UIComponent.js';

const WEATHER_CODES = [
  [[0], '☀️', 'Ясно'],
  [[1, 2], '🌤️', 'Малооблачно'],
  [[3], '☁️', 'Пасмурно'],
  [[45, 48], '🌫️', 'Туман'],
  [[51, 53, 55, 56, 57], '🌦️', 'Морось'],
  [[61, 63, 65, 66, 67], '🌧️', 'Дождь'],
  [[71, 73, 75, 77], '🌨️', 'Снег'],
  [[80, 81, 82], '🌧️', 'Ливень'],
  [[85, 86], '🌨️', 'Снегопад'],
  [[95, 96, 99], '⛈️', 'Гроза'],
];

function describe(code) {
  const found = WEATHER_CODES.find(([codes]) => codes.includes(code));
  return found ? { icon: found[1], text: found[2] } : { icon: '🌡️', text: 'Без описания' };
}

const fmt = (n) => `${Math.round(n)}°`;

/** Погода и прогноз на 5 дней — API Open-Meteo (геокодинг + прогноз). */
export class WeatherWidget extends UIComponent {
  static type = 'weather';
  static label = 'Погода';

  constructor(config = {}) {
    super({ title: 'Погода в пункте назначения', color: 'blue', ...config });
    this.city = config.state?.city ?? 'Стамбул';
    this.forecast = null;
  }

  renderBody() {
    const root = document.createElement('div');
    root.innerHTML = `
      <form class="inline-form">
        <input class="field" name="city" placeholder="Город" autocomplete="off" required>
        <button class="btn" type="submit" aria-label="Показать погоду">Найти</button>
      </form>
      <p class="status" role="status"></p>
      <div class="weather"></div>`;

    this.form = root.querySelector('form');
    this.statusEl = root.querySelector('.status');
    this.resultEl = root.querySelector('.weather');
    this.form.elements.city.value = this.city;

    this.listen(this.form, 'submit', (event) => {
      event.preventDefault();
      const query = this.form.elements.city.value.trim();
      if (query) this.load(query);
    });
    return root;
  }

  onMounted() {
    this.load(this.city);
  }

  getState() {
    return { city: this.city };
  }

  async load(query) {
    this.#setStatus('Загружаем прогноз…');
    try {
      const geo = await this.fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ru&format=json`
      );
      const place = geo.results?.[0];
      if (!place) throw new Error('Город не найден. Проверьте название');

      const params = new URLSearchParams({
        latitude: place.latitude,
        longitude: place.longitude,
        current: 'temperature_2m,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min',
        timezone: 'auto',
        forecast_days: '5',
      });
      const data = await this.fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);

      this.city = place.name;
      this.forecast = {
        place: place.country ? `${place.name}, ${place.country}` : place.name,
        current: data.current,
        daily: data.daily,
      };
      this.form.elements.city.value = place.name;
      this.#paint();
      this.emitChange();
    } catch (error) {
      if (error.name === 'AbortError' || !this.element) return;
      const offline = error instanceof TypeError;
      this.#setStatus(offline ? 'Нет связи с сервисом погоды. Проверьте интернет' : error.message, true);
    }
  }

  #setStatus(text, isError = false) {
    this.statusEl.textContent = text;
    this.statusEl.classList.toggle('is-error', isError);
    if (isError) this.resultEl.replaceChildren();
  }

  #paint() {
    const { place, current, daily } = this.forecast;
    const now = describe(current.weather_code);
    this.#setStatus('');

    const head = document.createElement('div');
    head.className = 'weather__now';
    head.innerHTML = '<span class="weather__icon"></span><div><p class="weather__temp"></p><p class="weather__desc"></p></div>';
    head.querySelector('.weather__icon').textContent = now.icon;
    head.querySelector('.weather__temp').textContent = fmt(current.temperature_2m);
    head.querySelector('.weather__desc').textContent = `${place} · ${now.text}, ветер ${Math.round(current.wind_speed_10m)} км/ч`;

    const days = document.createElement('ul');
    days.className = 'weather__days';
    daily.time.forEach((date, i) => {
      const li = document.createElement('li');
      const day = document.createElement('span');
      day.textContent = new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { weekday: 'short' });
      const icon = document.createElement('b');
      icon.textContent = describe(daily.weather_code[i]).icon;
      const temp = document.createElement('span');
      temp.textContent = `${fmt(daily.temperature_2m_max[i])} / ${fmt(daily.temperature_2m_min[i])}`;
      li.append(day, icon, temp);
      days.append(li);
    });

    this.resultEl.replaceChildren(head, days);
  }
}
