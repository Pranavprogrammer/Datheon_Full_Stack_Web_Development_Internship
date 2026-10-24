(() => {
  'use strict';

  const STORAGE_KEY = 'momentum-task-manager-v1';
  const CATEGORY_NAMES = ['Work', 'Personal', 'Study'];
  const state = {
    tasks: loadFromLocalStorage(),
    filter: 'all',
    category: null,
    search: '',
    sort: 'created',
    draggedId: null
  };
  const $ = (selector) => document.querySelector(selector);
  let toastTimer;

  function loadFromLocalStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter(task =>
        task && typeof task.id === 'string' &&
        typeof task.title === 'string' &&
        CATEGORY_NAMES.includes(task.category)
      ).map(task => ({
        id: task.id,
        title: task.title.slice(0, 120),
        category: task.category,
        dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
        completed: Boolean(task.completed),
        createdAt: Number(task.createdAt) || Date.now(),
        order: Number.isFinite(task.order) ? task.order : 0
      }));
    } catch (error) {
      console.warn('Could not load saved tasks:', error);
      return [];
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
      return true;
    } catch (error) {
      console.error('Could not save tasks:', error);
      showToast('Could not save changes. Check browser storage settings.');
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function dateLabel(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: year !== new Date().getFullYear() ? 'numeric' : undefined });
  }

  function dueClass(dateString, completed) {
    if (!dateString || completed) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${dateString}T00:00:00`);
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'due-today';
    return '';
  }

  function dueLabel(dateString, completed) {
    if (!dateString) return '';
    const cls = dueClass(dateString, completed);
    const label = cls === 'overdue' ? 'Overdue · ' : cls === 'due-today' ? 'Due today · ' : 'Due · ';
    return `${label}${dateLabel(dateString)}`;
  }

  function filteredTasks() {
    let tasks = [...state.tasks];
    if (state.filter === 'active') tasks = tasks.filter(task => !task.completed);
    if (state.filter === 'completed') tasks = tasks.filter(task => task.completed);
    if (state.category) tasks = tasks.filter(task => task.category === state.category);
    const query = state.search.trim().toLowerCase();
    if (query) tasks = tasks.filter(task => task.title.toLowerCase().includes(query));
    if (state.sort === 'due') {
      tasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    } else if (state.sort === 'title') {
      tasks.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      tasks.sort((a, b) => b.createdAt - a.createdAt);
    }
    return tasks;
  }

  function updateCounts() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(task => task.completed).length;
    const active = total - completed;
    const rate = total ? Math.round(completed / total * 100) : 0;
    $('#allCount').textContent = total;
    $('#activeCount').textContent = active;
    $('#completedCount').textContent = completed;
    $('#tabAllCount').textContent = total;
    $('#tabActiveCount').textContent = active;
    $('#tabCompletedCount').textContent = completed;
    $('#totalStat').textContent = total;
    $('#progressStat').textContent = active;
    $('#doneStat').textContent = completed;
    $('#rateStat').textContent = `${rate}%`;
    $('#progressBar').style.width = `${rate}%`;
    $('#workCount').textContent = state.tasks.filter(t => t.category === 'Work').length;
    $('#personalCount').textContent = state.tasks.filter(t => t.category === 'Personal').length;
    $('#studyCount').textContent = state.tasks.filter(t => t.category === 'Study').length;
    $('#headingCount').textContent = filteredTasks().length;
    $('#listFooterText').textContent = `${filteredTasks().length} ${filteredTasks().length === 1 ? 'task' : 'tasks'} shown`;
  }

  function updateActiveControls() {
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.classList.toggle('active', button.dataset.filter === state.filter);
    });
    document.querySelectorAll('[data-category]').forEach(button => {
      button.classList.toggle('active', button.dataset.category === state.category);
    });
    const categoryText = state.category ? ` · ${state.category}` : '';
    const names = { all: 'All tasks', active: 'In progress', completed: 'Completed' };
    $('#listHeading').innerHTML = `${names[state.filter]}${escapeHtml(categoryText)} <span id="headingCount">${filteredTasks().length}</span>`;
  }

  function renderTasks() {
    updateCounts();
    updateActiveControls();
    const tasks = filteredTasks();
    $('#taskList').innerHTML = tasks.map(task => {
      const categoryClass = task.category.toLowerCase();
      const due = dueLabel(task.dueDate, task.completed);
      const overdueClass = dueClass(task.dueDate, task.completed);
      return `<article class="task-row ${task.completed ? 'completed' : ''}" data-task-id="${escapeHtml(task.id)}" draggable="true">
        <input class="task-check" type="checkbox" data-complete="${escapeHtml(task.id)}" ${task.completed ? 'checked' : ''} aria-label="Mark ${escapeHtml(task.title)} ${task.completed ? 'active' : 'completed'}" />
        <div class="task-main">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta"><span class="task-category ${categoryClass}">${escapeHtml(task.category)}</span>${due ? `<span class="task-due ${overdueClass}">${escapeHtml(due)}</span>` : ''}</div>
        </div>
        <div class="task-actions">
          <span class="drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
          <button class="task-action" type="button" data-edit="${escapeHtml(task.id)}" aria-label="Edit ${escapeHtml(task.title)}" title="Edit">✎</button>
          <button class="task-action delete" type="button" data-delete="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.title)}" title="Delete">×</button>
        </div>
      </article>`;
    }).join('');
    $('#emptyState').hidden = tasks.length > 0;
    $('#taskList').hidden = tasks.length === 0;
    $('#clearCompletedBtn').hidden = !state.tasks.some(task => task.completed);
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function addTask(title, category, dueDate) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    state.tasks.unshift({
      id: createId(),
      title: cleanTitle.slice(0, 120),
      category: CATEGORY_NAMES.includes(category) ? category : 'Work',
      dueDate: dueDate || '',
      completed: false,
      createdAt: Date.now(),
      order: 0
    });
    saveToLocalStorage();
    renderTasks();
    showToast('Task added — you’ve got this!');
  }

  function toggleTask(id) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveToLocalStorage();
    renderTasks();
    showToast(task.completed ? 'Nice work! Task completed.' : 'Task moved back to active.');
  }

  function deleteTask(id) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    state.tasks = state.tasks.filter(item => item.id !== id);
    saveToLocalStorage();
    renderTasks();
    showToast('Task deleted.');
  }

  function openEditDialog(id) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    $('#editTaskId').value = task.id;
    $('#editTitle').value = task.title;
    $('#editCategory').value = task.category;
    $('#editDueDate').value = task.dueDate;
    $('#editDialog').showModal();
    $('#editTitle').focus();
  }

  function updateTask(id, title, category, dueDate) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    task.title = cleanTitle.slice(0, 120);
    task.category = CATEGORY_NAMES.includes(category) ? category : task.category;
    task.dueDate = dueDate || '';
    saveToLocalStorage();
    renderTasks();
    showToast('Changes saved.');
  }

  function setFilter(filter) {
    state.filter = filter;
    state.category = null;
    renderTasks();
  }

  function setCategory(category) {
    state.category = state.category === category ? null : category;
    state.filter = 'all';
    renderTasks();
  }

  $('#taskForm').addEventListener('submit', event => {
    event.preventDefault();
    const titleInput = $('#taskTitle');
    if (!titleInput.value.trim()) {
      titleInput.focus();
      return;
    }
    addTask(titleInput.value, $('#taskCategory').value, $('#taskDueDate').value);
    $('#taskForm').reset();
    $('#taskCategory').value = 'Work';
    titleInput.focus();
  });

  $('#taskList').addEventListener('change', event => {
    const checkbox = event.target.closest('[data-complete]');
    if (checkbox) toggleTask(checkbox.dataset.complete);
  });

  $('#taskList').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    const del = event.target.closest('[data-delete]');
    if (edit) openEditDialog(edit.dataset.edit);
    if (del) deleteTask(del.dataset.delete);
  });

  $('#taskList').addEventListener('dragstart', event => {
    const row = event.target.closest('[data-task-id]');
    if (!row) return;
    state.draggedId = row.dataset.taskId;
    row.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', state.draggedId);
  });
  $('#taskList').addEventListener('dragover', event => {
    const row = event.target.closest('[data-task-id]');
    if (!row || row.dataset.taskId === state.draggedId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });
  $('#taskList').addEventListener('drop', event => {
    const row = event.target.closest('[data-task-id]');
    if (!row || !state.draggedId || row.dataset.taskId === state.draggedId) return;
    event.preventDefault();
    const from = state.tasks.findIndex(task => task.id === state.draggedId);
    const to = state.tasks.findIndex(task => task.id === row.dataset.taskId);
    if (from < 0 || to < 0) return;
    const [moved] = state.tasks.splice(from, 1);
    state.tasks.splice(to, 0, moved);
    state.tasks.forEach((task, index) => task.order = index);
    state.sort = 'manual';
    saveToLocalStorage();
    renderTasks();
    showToast('Task order updated.');
  });
  $('#taskList').addEventListener('dragend', () => {
    state.draggedId = null;
    document.querySelectorAll('.dragging,.drag-over').forEach(el => el.classList.remove('dragging', 'drag-over'));
  });

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });
  document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => setCategory(button.dataset.category));
  });
  $('#clearCategory').addEventListener('click', () => {
    state.category = null;
    state.filter = 'all';
    renderTasks();
  });

  $('#taskSearch').addEventListener('input', event => {
    state.search = event.target.value;
    renderTasks();
  });
  $('#sortTasks').addEventListener('change', event => {
    state.sort = event.target.value;
    renderTasks();
  });

  $('#clearCompletedBtn').addEventListener('click', () => {
    const completedCount = state.tasks.filter(task => task.completed).length;
    if (!completedCount) return;
    state.tasks = state.tasks.filter(task => !task.completed);
    saveToLocalStorage();
    renderTasks();
    showToast(`Cleared ${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'}.`);
  });

  $('#focusAddBtn').addEventListener('click', () => {
    $('#taskTitle').focus();
    $('#taskForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#emptyAddBtn').addEventListener('click', () => {
    $('#taskTitle').focus();
    $('#taskForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('#editForm').addEventListener('submit', event => {
    event.preventDefault();
    updateTask($('#editTaskId').value, $('#editTitle').value, $('#editCategory').value, $('#editDueDate').value);
    $('#editDialog').close();
  });
  $('#closeEditBtn').addEventListener('click', () => $('#editDialog').close());
  $('#cancelEditBtn').addEventListener('click', () => $('#editDialog').close());

  $('#themeToggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    $('#themeToggle').textContent = isDark ? '☀' : '☾';
    $('#themeToggle').setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    try { localStorage.setItem('momentum-theme', isDark ? 'dark' : 'light'); } catch {}
  });

  try {
    if (localStorage.getItem('momentum-theme') === 'dark') {
      document.body.classList.add('dark');
      $('#themeToggle').textContent = '☀';
      $('#themeToggle').setAttribute('aria-label', 'Switch to light mode');
    }
  } catch {}

  $('#todayLabel').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  }).toUpperCase();

  // Set the date input to today as a helpful default.
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  $('#taskDueDate').min = localToday;
  $('#editDueDate').min = localToday;
  renderTasks();
})();
