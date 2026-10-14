import { Dashboard } from './js/Dashboard.js';
import { ToDoWidget } from './js/ToDoWidget.js';
import { QuoteWidget } from './js/QuoteWidget.js';
import { WeatherWidget } from './js/WeatherWidget.js';
import { CurrencyWidget } from './js/CurrencyWidget.js';
import { CountdownWidget } from './js/CountdownWidget.js';

const WIDGET_CLASSES = [CountdownWidget, ToDoWidget, WeatherWidget, CurrencyWidget, QuoteWidget];
const registry = Object.fromEntries(WIDGET_CLASSES.map((cls) => [cls.type, cls]));

const dashboard = new Dashboard(document.querySelector('#dashboard'), registry);
const counter = document.querySelector('#widget-count');
dashboard.onChange = () => {
  counter.textContent = dashboard.widgets.length;
};

// Кнопки панели инструментов — делегирование событий
document.querySelector('#toolbar').addEventListener('click', (event) => {
  const addBtn = event.target.closest('[data-add]');
  if (addBtn) {
    dashboard.addWidget(addBtn.dataset.add);
    return;
  }
  if (event.target.closest('[data-action="clear"]')) {
    dashboard.clear();
  }
});

// Восстановление сохранённой панели или стартовый набор виджетов
if (!dashboard.load()) {
  ['countdown', 'weather', 'currency', 'todo', 'quote'].forEach((type) => dashboard.addWidget(type));
}
counter.textContent = dashboard.widgets.length;

// Бегущие строки
const words = ['Паспорт', 'Билеты', 'Страховка', 'Зарядка', 'Виза', 'Отель', 'Трансфер', 'Валюта'];
document.querySelectorAll('[data-ticker]').forEach((track) => {
  const half = Array(4).fill(words).flat().map((w) => `<span>${w}</span><i>✦</i>`).join('');
  track.innerHTML = half + half;
});
