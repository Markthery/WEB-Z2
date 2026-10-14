import { UIComponent } from './UIComponent.js';

/** Чек-лист «Что взять с собой»: добавление, удаление, отметка выполненных. */
export class ToDoWidget extends UIComponent {
  static type = 'todo';
  static label = 'Чек-лист вещей';

  constructor(config = {}) {
    super({ title: 'Что взять с собой', color: 'lime', ...config });
    this.tasks = config.state?.tasks ?? [
      { id: UIComponent.uid(), text: 'Паспорт и билеты', done: false },
      { id: UIComponent.uid(), text: 'Зарядка и павербанк', done: false },
    ];
  }

  renderBody() {
    const root = document.createElement('div');
    root.innerHTML = `
      <form class="inline-form">
        <input class="field" name="text" placeholder="Например, солнцезащитные очки" maxlength="80" autocomplete="off" required>
        <button class="btn" type="submit" aria-label="Добавить вещь">+</button>
      </form>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="progress__bar"></div></div>
      <p class="muted todo__summary"></p>
      <ul class="todo-list"></ul>`;

    this.form = root.querySelector('form');
    this.listEl = root.querySelector('.todo-list');
    this.bar = root.querySelector('.progress__bar');
    this.progress = root.querySelector('.progress');
    this.summary = root.querySelector('.todo__summary');

    this.listen(this.form, 'submit', (event) => {
      event.preventDefault();
      const input = this.form.elements.text;
      const text = input.value.trim();
      if (!text) return;
      this.addTask(text);
      this.form.reset();
      input.focus();
    });

    // Делегирование: один слушатель на весь список
    this.listen(this.listEl, 'click', (event) => {
      const li = event.target.closest('li[data-id]');
      if (li && event.target.closest('[data-action="delete"]')) this.removeTask(li.dataset.id);
    });
    this.listen(this.listEl, 'change', (event) => {
      const li = event.target.closest('li[data-id]');
      if (li && event.target.matches('input[type="checkbox"]')) this.toggleTask(li.dataset.id);
    });

    this.#paint();
    return root;
  }

  addTask(text) {
    this.tasks.push({ id: UIComponent.uid(), text, done: false });
    this.#update();
  }

  removeTask(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.#update();
  }

  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.done = !task.done;
    this.#update();
  }

  getState() {
    return { tasks: this.tasks };
  }

  #update() {
    this.#paint();
    this.emitChange();
  }

  #paint() {
    this.listEl.replaceChildren(
      ...this.tasks.map((task) => {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        li.className = 'todo-item' + (task.done ? ' is-done' : '');

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.done;
        const span = document.createElement('span');
        span.textContent = task.text;
        label.append(checkbox, span);

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'icon-btn';
        del.dataset.action = 'delete';
        del.setAttribute('aria-label', `Удалить: ${task.text}`);
        del.textContent = '×';

        li.append(label, del);
        return li;
      })
    );

    const done = this.tasks.filter((t) => t.done).length;
    const percent = this.tasks.length ? Math.round((done / this.tasks.length) * 100) : 0;
    this.bar.style.width = `${percent}%`;
    this.progress.setAttribute('aria-valuenow', String(percent));
    this.summary.textContent = this.tasks.length
      ? `Собрано ${done} из ${this.tasks.length}`
      : 'Список пуст — добавьте первую вещь';
  }
}
