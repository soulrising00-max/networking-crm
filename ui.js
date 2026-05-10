function renderContacts(contacts, searchTerm) {
  let filtered = contacts;
  if (searchTerm) {
    filtered = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  filtered = filtered.map(c => ({ ...c, _delta: computeDelta(c.lastContacted, c.interval) }));
  filtered.sort((a, b) => b._delta - a._delta);

  const overdue = filtered.filter(c => c._delta >= 0);
  const upcoming = filtered.filter(c => c._delta < 0);

  const overdueCards = document.getElementById('overdue-cards');
  const upcomingCards = document.getElementById('upcoming-cards');
  const overdueSection = document.getElementById('overdue-section');
  const upcomingSection = document.getElementById('upcoming-section');
  const emptyState = document.getElementById('empty-state');

  overdueCards.innerHTML = '';
  upcomingCards.innerHTML = '';

  if (contacts.length === 0) {
    overdueSection.style.display = 'none';
    upcomingSection.style.display = 'none';
    renderEmptyState(true);
    return;
  }

  if (filtered.length === 0) {
    overdueSection.style.display = 'none';
    upcomingSection.style.display = 'none';
    renderEmptyState(false);
    return;
  }

  emptyState.style.display = 'none';
  overdueSection.style.display = overdue.length ? '' : 'none';
  upcomingSection.style.display = upcoming.length ? '' : 'none';

  overdue.forEach(c => overdueCards.appendChild(buildCard(c)));
  upcoming.forEach(c => upcomingCards.appendChild(buildCard(c)));
}

function buildCard(c) {
  const card = document.createElement('div');
  card.className = 'contact-card';

  const name = document.createElement('div');
  name.className = 'contact-name';
  name.textContent = c.name;

  const deltaLabel = document.createElement('div');
  const labelClass = c._delta === 999 || c._delta > 0 ? 'overdue' : c._delta === 0 ? 'due-today' : 'upcoming';
  deltaLabel.className = `delta-label ${labelClass}`;
  deltaLabel.textContent = formatDelta(c._delta);

  const meta = document.createElement('div');
  meta.className = 'contact-meta';
  meta.textContent = `Every ${c.interval} day(s)`;

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const markBtn = document.createElement('button');
  markBtn.className = 'btn-mark';
  markBtn.textContent = 'Mark Contacted';
  markBtn.dataset.id = c.id;
  markBtn.dataset.action = 'mark';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.textContent = 'Edit';
  editBtn.dataset.id = c.id;
  editBtn.dataset.action = 'edit';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.dataset.id = c.id;
  deleteBtn.dataset.action = 'delete';

  actions.appendChild(markBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  card.appendChild(name);
  card.appendChild(deltaLabel);
  card.appendChild(meta);
  if (c.notes) {
    const notes = document.createElement('div');
    notes.className = 'contact-meta';
    notes.textContent = c.notes;
    card.appendChild(notes);
  }
  card.appendChild(actions);
  return card;
}

function renderEmptyState(isFirstTime) {
  const el = document.getElementById('empty-state');
  el.textContent = isFirstTime
    ? 'No contacts yet. Tap + to add your first one.'
    : 'No contacts match your search.';
  el.style.display = '';
}

function showModal(contact) {
  const modal = document.getElementById('contact-modal');
  document.getElementById('modal-title').textContent = contact ? 'Edit Contact' : 'Add Contact';
  document.getElementById('input-name').value = contact ? contact.name : '';
  document.getElementById('input-interval').value = contact ? contact.interval : '';
  document.getElementById('input-last').value = contact ? (contact.lastContacted || '') : '';
  document.getElementById('input-notes').value = contact ? (contact.notes || '') : '';
  document.getElementById('duplicate-warning').style.display = 'none';
  modal.dataset.editId = contact ? contact.id : '';
  modal.classList.add('open');
}

function hideModal() {
  const modal = document.getElementById('contact-modal');
  modal.classList.remove('open');
  document.getElementById('input-name').value = '';
  document.getElementById('input-interval').value = '';
  document.getElementById('input-last').value = '';
  document.getElementById('input-notes').value = '';
  modal.dataset.editId = '';
}

function showDeleteConfirmation(id, name, onConfirm) {
  const modal = document.getElementById('delete-modal');
  const msg = document.getElementById('delete-message');
  msg.textContent = `Delete ${name}? This cannot be undone.`;
  modal.classList.add('open');

  const confirmBtn = document.getElementById('confirm-delete-btn');
  const cancelBtn = document.getElementById('cancel-delete-btn');

  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  newConfirm.addEventListener('click', () => {
    modal.classList.remove('open');
    onConfirm(id);
  });
  newCancel.addEventListener('click', () => modal.classList.remove('open'));
}

function showInstallBanner(deferredPrompt) {
  const banner = document.getElementById('install-banner');
  banner.classList.add('visible');
  const btn = document.getElementById('install-btn');
  btn.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => banner.classList.remove('visible'));
  });
}

function showStorageError() {
  const app = document.getElementById('app');
  const el = document.createElement('div');
  el.id = 'storage-error';
  el.textContent = 'Storage unavailable. Check if private browsing is enabled or if site permissions block storage.';
  app.innerHTML = '';
  app.appendChild(el);
}
