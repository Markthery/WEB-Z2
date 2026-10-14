import { UIComponent } from './UIComponent.js';

/** Случайная цитата о путешествиях с кнопкой «Обновить». */
export class QuoteWidget extends UIComponent {
  static type = 'quote';
  static label = 'Цитата';

  #quotes = [
    { text: 'Путешествие в тысячу миль начинается с первого шага.', author: 'Лао-цзы' },
    { text: 'Не все те, кто блуждает, потеряны.', author: 'Дж. Р. Р. Толкин' },
    { text: 'Мир — это книга, и те, кто не путешествует, прочитали лишь одну страницу.', author: 'Блаженный Августин' },
    { text: 'Жизнь — это либо смелое приключение, либо ничто.', author: 'Хелен Келлер' },
    { text: 'Мы путешествуем не для того, чтобы убежать от жизни, а чтобы жизнь не убежала от нас.', author: 'Неизвестный автор' },
    { text: 'Лучшее время для путешествия — когда вы уже решились.', author: 'Неизвестный автор' },
  ];

  constructor(config = {}) {
    super({ title: 'Цитата дня', color: 'purple', ...config });
    this.current = config.state?.current ?? this.#pick();
  }

  renderBody() {
    const root = document.createElement('div');
    root.innerHTML = `
      <blockquote class="quote">
        <p class="quote__text"></p>
        <footer class="quote__author"></footer>
      </blockquote>
      <button class="btn btn--wide" type="button" data-action="refresh">Обновить</button>`;
    this.textEl = root.querySelector('.quote__text');
    this.authorEl = root.querySelector('.quote__author');

    this.listen(root.querySelector('[data-action="refresh"]'), 'click', () => this.refresh());
    this.#paint();
    return root;
  }

  refresh() {
    this.current = this.#pick(this.current);
    this.#paint();
    this.emitChange();
  }

  getState() {
    return { current: this.current };
  }

  #pick(exclude) {
    const pool = this.#quotes.filter((q) => q.text !== exclude?.text);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  #paint() {
    this.textEl.textContent = this.current.text;
    this.authorEl.textContent = this.current.author;
  }
}
