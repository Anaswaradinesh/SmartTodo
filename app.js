// ── State ─────────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('smarttodo_tasks') || '[]');
let currentFilter = 'all';
let editingId = null;
let deletingId = null;

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  renderTasks();
  updateStats();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      openAddModal();
    }
    if (e.key === 'Escape') {
      closeAddModal();
      closeDeleteModal();
    }
  });

  document.getElementById('taskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openAddModal();
  });
});

// ── Greeting ──────────────────────────────────────
function setGreeting() {
  const now = new Date();
  const hour = now.getHours();
  let greet = 'Stay on track today ✦';
  if (hour < 12) greet = 'Good morning ✦';
  else if (hour < 17) greet = 'Good afternoon ✦';
  else greet = 'Good evening ✦';

  document.getElementById('greetingText').textContent = greet;

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pending = tasks.filter(t => !t.done).length;
  document.getElementById('greetingDate').textContent =
    `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()} · ${pending} pending task${pending !== 1 ? 's' : ''}`;
}

// ── Dark / Light Mode ─────────────────────────────
function toggleMode() {
  const body = document.body;
  const btn  = document.getElementById('modeBtn');
  if (body.classList.contains('dark')) {
    body.classList.replace('dark', 'light');
    btn.innerHTML = '<i class="ti ti-moon"></i><span>Dark mode</span>';
  } else {
    body.classList.replace('light', 'dark');
    btn.innerHTML = '<i class="ti ti-sun"></i><span>Light mode</span>';
  }
  localStorage.setItem('smarttodo_theme', body.classList.contains('dark') ? 'dark' : 'light');
}

// restore theme
const savedTheme = localStorage.getItem('smarttodo_theme') || 'dark';
document.body.className = savedTheme;
document.getElementById('modeBtn').innerHTML = savedTheme === 'dark'
  ? '<i class="ti ti-sun"></i><span>Light mode</span>'
  : '<i class="ti ti-moon"></i><span>Dark mode</span>';

// ── Filter ────────────────────────────────────────
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === f);
  });
  renderTasks();
}

// ── Render Tasks ──────────────────────────────────
function renderTasks() {
  const search    = document.getElementById('searchInput').value.toLowerCase();
  const pending   = document.getElementById('pendingList');
  const completed = document.getElementById('completedList');
  const empty     = document.getElementById('emptyState');

  pending.innerHTML   = '';
  completed.innerHTML = '';

  const filtered = tasks.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search) || (t.desc || '').toLowerCase().includes(search);
    if (!matchSearch) return false;
    if (currentFilter === 'pending')   return !t.done;
    if (currentFilter === 'completed') return t.done;
    if (currentFilter === 'high')      return t.priority === 'high';
    return true;
  });

  const pendingTasks   = filtered.filter(t => !t.done);
  const completedTasks = filtered.filter(t => t.done);

  if (filtered.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    pendingTasks.forEach(t   => pending.appendChild(createTaskEl(t)));
    completedTasks.forEach(t => completed.appendChild(createTaskEl(t)));
  }

  document.getElementById('completedLabel').style.display =
    completedTasks.length > 0 ? 'block' : 'none';

  updateStats();
  setGreeting();
  saveTasks();
}

// ── Task Element ──────────────────────────────────
function createTaskEl(task) {
  const div = document.createElement('div');
  div.className = `task-item ${task.done ? 'done' : ''}`;
  div.dataset.id = task.id;

  const badgeClass = task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'med' : 'low';
  const badgeText  = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  //const today = new Date().toISOString().split('T')[0];
  //const isOverdue = task.dueDate && task.dueDate < today && !task.done;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const isOverdue = task.dueDate && task.dueDate < today && !task.done;
  const dueHtml = task.dueDate
    ? `<span class="due ${isOverdue ? 'overdue' : ''}">
        <i class="ti ti-calendar" style="font-size:11px"></i>
        ${formatDate(task.dueDate)}
       </span>`
    : '';

  div.innerHTML = `
    <div class="check ${task.done ? 'checked' : ''}" onclick="toggleDone('${task.id}')"></div>
    <div class="task-content">
      <div class="task-text">${escapeHtml(task.name)}</div>
      ${task.desc ? `<div class="task-desc">${escapeHtml(task.desc)}</div>` : ''}
    </div>
    <div class="task-meta">
      <span class="badge ${badgeClass}">${badgeText}</span>
      ${dueHtml}
    </div>
    <div class="task-actions">
      <button class="icon-btn" title="Edit" onclick="openEditModal('${task.id}')">
        <i class="ti ti-edit"></i>
      </button>
      <button class="icon-btn danger" title="Delete" onclick="openDeleteModal('${task.id}')">
        <i class="ti ti-trash"></i>
      </button>
    </div>
  `;
  return div;
}

// ── Toggle Done ───────────────────────────────────
function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    if (task.done) task.completedAt = new Date().toISOString();
    else delete task.completedAt;
    renderTasks();
  }
}

// ── Add / Edit Modal ──────────────────────────────
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add new task';
  document.getElementById('modalTaskName').value = document.getElementById('taskInput').value || '';
  document.getElementById('modalDesc').value = '';
  document.getElementById('modalDueDate').value = '';
  document.querySelector('input[name="priority"][value="medium"]').checked = true;
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('modalTaskName').focus(), 50);
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit task';
  document.getElementById('modalTaskName').value = task.name;
  document.getElementById('modalDesc').value = task.desc || '';
  document.getElementById('modalDueDate').value = task.dueDate || '';
  document.querySelector(`input[name="priority"][value="${task.priority}"]`).checked = true;
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('modalTaskName').focus(), 50);
}

function closeAddModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('taskInput').value = '';
  editingId = null;
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeAddModal();
}

function saveTask() {
  const name = document.getElementById('modalTaskName').value.trim();
  if (!name) {
    document.getElementById('modalTaskName').focus();
    return;
  }
  const desc     = document.getElementById('modalDesc').value.trim();
  const dueDate  = document.getElementById('modalDueDate').value;
  const priority = document.querySelector('input[name="priority"]:checked').value;

  if (editingId) {
    const task = tasks.find(t => t.id === editingId);
    if (task) {
      task.name = name;
      task.desc = desc;
      task.dueDate = dueDate;
      task.priority = priority;
    }
  } else {
    tasks.unshift({
      id: genId(),
      name,
      desc,
      dueDate,
      priority,
      done: false,
      createdAt: new Date().toISOString()
    });
  }

  closeAddModal();
  renderTasks();
}

// ── Delete Modal ──────────────────────────────────
function openDeleteModal(id) {
  deletingId = id;
  document.getElementById('deleteOverlay').classList.add('open');
}

function closeDeleteModal(e) {
  if (e && e.target !== document.getElementById('deleteOverlay')) return;
  document.getElementById('deleteOverlay').classList.remove('open');
  deletingId = null;
}

function confirmDelete() {
  if (deletingId) {
    tasks = tasks.filter(t => t.id !== deletingId);
    deletingId = null;
    document.getElementById('deleteOverlay').classList.remove('open');
    renderTasks();
  }
}

// ── Stats ─────────────────────────────────────────
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  const rate    = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('totalCount').textContent     = total;
  document.getElementById('completedCount').textContent = done;
  document.getElementById('pendingCount').textContent   = pending;

  document.getElementById('progressFill').style.width = rate + '%';
  document.getElementById('progressText').textContent = `${done} of ${total} done · ${rate}%`;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekly = tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt) > weekAgo).length;
  document.getElementById('weeklyCount').textContent = weekly;

  //const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const dueToday = tasks.filter(t => t.dueDate === today && !t.done).length;
  document.getElementById('dueTodayCount').textContent = dueToday;

  document.getElementById('dashPending').textContent    = pending;
  document.getElementById('completionRate').textContent = rate + '%';

  const high = tasks.filter(t => t.priority === 'high').length;
  const med  = tasks.filter(t => t.priority === 'medium').length;
  const low  = tasks.filter(t => t.priority === 'low').length;
  const maxP = Math.max(high, med, low, 1);

  document.getElementById('highBar').style.width   = Math.round((high / maxP) * 100) + '%';
  document.getElementById('medBar').style.width    = Math.round((med  / maxP) * 100) + '%';
  document.getElementById('lowBar').style.width    = Math.round((low  / maxP) * 100) + '%';
  document.getElementById('highCount').textContent = high;
  document.getElementById('medCount').textContent  = med;
  document.getElementById('lowCount').textContent  = low;

  document.getElementById('overallBar').style.width  = rate + '%';
  document.getElementById('overallRate').textContent = rate + '%';
}

// ── Export CSV ────────────────────────────────────
function exportCSV() {
  if (tasks.length === 0) { alert('No tasks to export!'); return; }
  const header = ['Name','Description','Due Date','Priority','Status'];
  const rows   = tasks.map(t => [
    `"${t.name.replace(/"/g,'""')}"`,
    `"${(t.desc || '').replace(/"/g,'""')}"`,
    t.dueDate || '',
    t.priority,
    t.done ? 'Completed' : 'Pending'
  ]);
  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'smarttodo_tasks.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Helpers ───────────────────────────────────────
function saveTasks() {
  localStorage.setItem('smarttodo_tasks', JSON.stringify(tasks));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}