const TAGS = ['meetup', 'linkedin', 'github', 'college', 'ex-colleague'];

const SNIPPETS = [
  "Hey {name}, it's been a while — hope you're doing well! I've been thinking about our last conversation and wanted to reconnect. What have you been up to lately?",
  "Hi {name}! I came across something recently that reminded me of you. Would love to catch up soon — are you free for a quick call or coffee sometime this week?",
  "Hey {name}, just wanted to drop a quick note to stay in touch. Things have been busy on my end but I always value our conversations. Let me know how things are going with you!"
];

function renderContacts(contacts, searchTerm, tagFilter) {
  let filtered = contacts;
  if (searchTerm) {
    filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  if (tagFilter) {
    filtered = filtered.filter(c => (c.tag || '') === tagFilter);
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

  const nameRow = document.createElement('div');
  nameRow.className = 'card-name-row';

  const name = document.createElement('div');
  name.className = 'contact-name';
  name.textContent = c.name;
  nameRow.appendChild(name);

  if (c.tag) {
    const pill = document.createElement('span');
    pill.className = `tag-pill tag-${c.tag.replace('-', '')}`;
    pill.textContent = c.tag;
    nameRow.appendChild(pill);
  }

  const deltaLabel = document.createElement('div');
  const labelClass = c._delta === 999 || c._delta > 0 ? 'overdue' : c._delta === 0 ? 'due-today' : 'upcoming';
  deltaLabel.className = `delta-label ${labelClass}`;
  deltaLabel.textContent = formatDelta(c._delta);

  const meta = document.createElement('div');
  meta.className = 'contact-meta';
  meta.textContent = `Every ${c.interval} day(s)`;

  card.appendChild(nameRow);
  card.appendChild(deltaLabel);

  if (c.roleCompany) {
    const rc = document.createElement('div');
    rc.className = 'contact-meta';
    rc.textContent = c.roleCompany;
    card.appendChild(rc);
  }

  card.appendChild(meta);

  if (c.nextAction) {
    const na = document.createElement('div');
    na.className = 'contact-next-action';
    na.textContent = '→ ' + c.nextAction;
    card.appendChild(na);
  }

  if (c.notes) {
    const notes = document.createElement('div');
    notes.className = 'contact-meta';
    notes.textContent = c.notes;
    card.appendChild(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const markBtn = document.createElement('button');
  markBtn.className = 'btn-mark';
  markBtn.textContent = 'Mark Contacted';
  markBtn.dataset.id = c.id;
  markBtn.dataset.action = 'mark';

  const logBtn = document.createElement('button');
  logBtn.className = 'btn-log';
  logBtn.textContent = 'Log';
  logBtn.dataset.id = c.id;
  logBtn.dataset.action = 'log';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.textContent = 'Edit';
  editBtn.dataset.id = c.id;
  editBtn.dataset.action = 'edit';

  const snippetsBtn = document.createElement('button');
  snippetsBtn.className = 'btn-snippets';
  snippetsBtn.textContent = '💬';
  snippetsBtn.title = 'Message snippets';
  snippetsBtn.dataset.id = c.id;
  snippetsBtn.dataset.action = 'snippets';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.dataset.id = c.id;
  deleteBtn.dataset.action = 'delete';

  actions.appendChild(markBtn);
  actions.appendChild(logBtn);
  actions.appendChild(editBtn);
  actions.appendChild(snippetsBtn);
  actions.appendChild(deleteBtn);
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

function renderReconnectView(contacts) {
  const view = document.getElementById('reconnect-view');
  view.innerHTML = '';

  const buckets = [
    { label: '90+ days silent', min: 90 },
    { label: '60+ days silent', min: 60 },
    { label: '30+ days silent', min: 30 }
  ];

  let anyFound = false;

  buckets.forEach(bucket => {
    const matches = contacts.filter(c => {
      const silence = computeSilenceDays(c.lastContacted);
      return silence >= bucket.min;
    }).sort((a, b) => computeSilenceDays(b.lastContacted) - computeSilenceDays(a.lastContacted));

    if (!matches.length) return;
    anyFound = true;

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = bucket.label;
    view.appendChild(title);

    matches.forEach(c => {
      const silence = computeSilenceDays(c.lastContacted);
      const card = document.createElement('div');
      card.className = 'contact-card';

      const nameRow = document.createElement('div');
      nameRow.className = 'card-name-row';
      const name = document.createElement('div');
      name.className = 'contact-name';
      name.textContent = c.name;
      nameRow.appendChild(name);
      if (c.tag) {
        const pill = document.createElement('span');
        pill.className = `tag-pill tag-${c.tag.replace('-', '')}`;
        pill.textContent = c.tag;
        nameRow.appendChild(pill);
      }
      card.appendChild(nameRow);

      const silenceLabel = document.createElement('div');
      silenceLabel.className = 'delta-label overdue';
      silenceLabel.textContent = silence === 999 ? 'Never contacted' : `Silent for ${silence} days`;
      card.appendChild(silenceLabel);

      if (c.roleCompany) {
        const rc = document.createElement('div');
        rc.className = 'contact-meta';
        rc.textContent = c.roleCompany;
        card.appendChild(rc);
      }

      if (c.intent) {
        const intentEl = document.createElement('div');
        intentEl.className = 'contact-intent';
        intentEl.textContent = c.intent;
        card.appendChild(intentEl);
      }

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const markBtn = document.createElement('button');
      markBtn.className = 'btn-mark';
      markBtn.textContent = 'Mark Contacted';
      markBtn.dataset.id = c.id;
      markBtn.dataset.action = 'mark';

      const logBtn = document.createElement('button');
      logBtn.className = 'btn-log';
      logBtn.textContent = 'Log';
      logBtn.dataset.id = c.id;
      logBtn.dataset.action = 'log';

      const snippetsBtn = document.createElement('button');
      snippetsBtn.className = 'btn-snippets';
      snippetsBtn.textContent = '💬';
      snippetsBtn.title = 'Message snippets';
      snippetsBtn.dataset.id = c.id;
      snippetsBtn.dataset.action = 'snippets';

      actions.appendChild(markBtn);
      actions.appendChild(logBtn);
      actions.appendChild(snippetsBtn);
      card.appendChild(actions);
      view.appendChild(card);
    });
  });

  if (!anyFound) {
    const empty = document.createElement('div');
    empty.id = 'empty-state';
    empty.textContent = 'No contacts have been silent for 30+ days.';
    view.appendChild(empty);
  }
}

function showModal(contact) {
  const modal = document.getElementById('contact-modal');
  document.getElementById('modal-title').textContent = contact ? 'Edit Contact' : 'Add Contact';
  document.getElementById('input-name').value = contact ? contact.name : '';
  document.getElementById('input-interval').value = contact ? contact.interval : '';
  document.getElementById('input-last').value = contact ? (contact.lastContacted || '') : '';
  document.getElementById('input-role-company').value = contact ? (contact.roleCompany || '') : '';
  document.getElementById('input-how-met').value = contact ? (contact.howMet || '') : '';
  document.getElementById('input-last-topic').value = contact ? (contact.lastTopic || '') : '';
  document.getElementById('input-next-action').value = contact ? (contact.nextAction || '') : '';
  document.getElementById('input-intent').value = contact ? (contact.intent || '') : '';
  document.getElementById('input-notes').value = contact ? (contact.notes || '') : '';
  document.getElementById('input-tag').value = contact ? (contact.tag || '') : '';
  document.getElementById('duplicate-warning').style.display = 'none';
  modal.dataset.editId = contact ? contact.id : '';
  modal.classList.add('open');
}

function hideModal() {
  const modal = document.getElementById('contact-modal');
  modal.classList.remove('open');
  ['input-name','input-interval','input-last','input-role-company','input-how-met',
   'input-last-topic','input-next-action','input-intent','input-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('input-tag').value = '';
  modal.dataset.editId = '';
}

function showLogModal(contact, interactions, onAdd, onDelete) {
  const modal = document.getElementById('log-modal');
  document.getElementById('log-modal-title').textContent = contact.name + ' — Interaction Log';
  document.getElementById('log-entry-date').value = todayStr();
  document.getElementById('log-entry-type').value = 'call';
  document.getElementById('log-entry-note').value = '';
  modal.dataset.contactId = contact.id;

  renderLogEntries(interactions, onDelete);
  modal.classList.add('open');

  // wire up add button freshly each open
  const addBtn = document.getElementById('log-add-btn');
  const newAdd = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAdd, addBtn);
  newAdd.addEventListener('click', () => {
    const date = document.getElementById('log-entry-date').value;
    const type = document.getElementById('log-entry-type').value;
    const note = document.getElementById('log-entry-note').value.trim();
    if (!date || !note) return;
    onAdd({ contactId: contact.id, date, type, note });
  });
}

function renderLogEntries(interactions, onDelete) {
  const list = document.getElementById('log-entries');
  list.innerHTML = '';
  if (!interactions.length) {
    const empty = document.createElement('div');
    empty.className = 'log-empty';
    empty.textContent = 'No interactions logged yet.';
    list.appendChild(empty);
    return;
  }
  interactions.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'log-entry';

    const meta = document.createElement('div');
    meta.className = 'log-entry-meta';

    const dateBadge = document.createElement('span');
    dateBadge.className = 'log-date';
    dateBadge.textContent = entry.date;

    const typeBadge = document.createElement('span');
    typeBadge.className = `log-type log-type-${entry.type}`;
    typeBadge.textContent = entry.type;

    meta.appendChild(dateBadge);
    meta.appendChild(typeBadge);

    const note = document.createElement('div');
    note.className = 'log-note';
    note.textContent = entry.note;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-log-delete';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => onDelete(entry.id));

    row.appendChild(meta);
    row.appendChild(note);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function hideLogModal() {
  document.getElementById('log-modal').classList.remove('open');
}

function showSnippetsModal(contactName) {
  const modal = document.getElementById('snippets-modal');
  document.getElementById('snippets-modal-title').textContent = 'Message Snippets — ' + contactName;
  const container = document.getElementById('snippets-list');
  container.innerHTML = '';

  SNIPPETS.forEach((template, i) => {
    const text = template.replace(/{name}/g, contactName);
    const block = document.createElement('div');
    block.className = 'snippet-block';

    const para = document.createElement('p');
    para.className = 'snippet-text';
    para.textContent = text;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      });
    });

    block.appendChild(para);
    block.appendChild(copyBtn);
    container.appendChild(block);
  });

  modal.classList.add('open');
}

function hideSnippetsModal() {
  document.getElementById('snippets-modal').classList.remove('open');
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

function setActiveTab(tabName) {
  document.getElementById('tab-all').classList.toggle('active', tabName === 'all');
  document.getElementById('tab-reconnect').classList.toggle('active', tabName === 'reconnect');
  document.getElementById('contact-list').style.display = tabName === 'all' ? '' : 'none';
  document.getElementById('reconnect-view').style.display = tabName === 'reconnect' ? '' : 'none';
  document.getElementById('fab').style.display = tabName === 'all' ? '' : 'none';
}
