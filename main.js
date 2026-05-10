let db = null;
let allContacts = [];
let currentSearchTerm = '';
let currentTagFilter = '';
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/networking-crm/sw.js', { scope: '/networking-crm/' });
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.type === 'RELOAD') window.location.reload();
    });
  }

  // Install prompt
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      showInstallBanner(e);
    });
  }

  // Open DB
  openDB()
    .then(instance => { db = instance; loadAndRender(); })
    .catch(() => showStorageError());

  // Search
  document.getElementById('search-box').addEventListener('input', e => {
    currentSearchTerm = e.target.value;
    renderContacts(allContacts, currentSearchTerm, currentTagFilter);
  });

  // Tag filter bar
  document.getElementById('tag-filter-bar').addEventListener('click', e => {
    const btn = e.target.closest('[data-tag]');
    if (!btn) return;
    const tag = btn.dataset.tag;
    currentTagFilter = tag === currentTagFilter ? '' : tag;
    document.querySelectorAll('#tag-filter-bar [data-tag]').forEach(b => {
      b.classList.toggle('active', b.dataset.tag === currentTagFilter);
    });
    renderContacts(allContacts, currentSearchTerm, currentTagFilter);
  });

  // Tab switching
  document.getElementById('tab-all').addEventListener('click', () => {
    currentTab = 'all';
    setActiveTab('all');
    renderContacts(allContacts, currentSearchTerm, currentTagFilter);
  });
  document.getElementById('tab-reconnect').addEventListener('click', () => {
    currentTab = 'reconnect';
    setActiveTab('reconnect');
    renderReconnectView(allContacts);
  });

  // FAB
  document.getElementById('fab').addEventListener('click', () => showModal(null));

  // Card actions — delegation covers both #contact-list and #reconnect-view
  document.getElementById('app').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const contact = contactById(id);

    if (action === 'mark') {
      if (contact) updateContact(db, { ...contact, lastContacted: todayStr() }).then(loadAndRender);
    } else if (action === 'edit') {
      showModal(contact);
    } else if (action === 'delete') {
      if (contact) showDeleteConfirmation(id, contact.name, id => deleteContact(db, id).then(loadAndRender));
    } else if (action === 'log') {
      if (contact) {
        getInteractionsByContact(db, id).then(interactions => {
          showLogModal(
            contact,
            interactions,
            // onAdd
            entry => {
              addInteraction(db, entry).then(() => {
                // Update lastContacted if this entry date is more recent
                const c = contactById(id);
                if (!c.lastContacted || entry.date > c.lastContacted) {
                  updateContact(db, { ...c, lastContacted: entry.date }).then(() => loadAndRender());
                } else {
                  loadAndRender();
                }
                getInteractionsByContact(db, id).then(updated => {
                  renderLogEntries(updated, onDelete);
                });
              });
            },
            // onDelete
            function onDelete(entryId) {
              deleteInteraction(db, entryId).then(() => {
                getInteractionsByContact(db, id).then(updated => {
                  renderLogEntries(updated, onDelete);
                });
              });
            }
          );
        });
      }
    } else if (action === 'snippets') {
      if (contact) showSnippetsModal(contact.name);
    }
  });

  // Modal save
  document.getElementById('save-btn').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    const interval = parseInt(document.getElementById('input-interval').value, 10);
    const lastContactedRaw = document.getElementById('input-last').value;
    const roleCompany = document.getElementById('input-role-company').value.trim();
    const howMet = document.getElementById('input-how-met').value.trim();
    const lastTopic = document.getElementById('input-last-topic').value.trim();
    const nextAction = document.getElementById('input-next-action').value.trim();
    const intent = document.getElementById('input-intent').value.trim();
    const notes = document.getElementById('input-notes').value.trim();
    const tag = document.getElementById('input-tag').value;
    const modal = document.getElementById('contact-modal');
    const editIdStr = modal.dataset.editId;
    const editId = editIdStr ? Number(editIdStr) : null;

    if (!name || name.length > 100) return;
    if (!interval || interval < 1) return;
    if (lastContactedRaw && !/^\d{4}-\d{2}-\d{2}$/.test(lastContactedRaw)) return;
    if (notes.length > 500) return;
    if (nextAction.length > 300) return;
    if (intent.length > 300) return;

    const lastContacted = lastContactedRaw || null;

    const dupWarning = document.getElementById('duplicate-warning');
    const isDup = allContacts.some(c =>
      c.name.toLowerCase() === name.toLowerCase() && c.id !== editId
    );
    dupWarning.style.display = isDup ? '' : 'none';

    const contact = { name, interval, lastContacted, roleCompany, howMet, lastTopic, nextAction, intent, notes, tag };

    if (editId) {
      updateContact(db, { ...contact, id: editId }).then(() => { hideModal(); loadAndRender(); });
    } else {
      addContact(db, contact).then(() => { hideModal(); loadAndRender(); });
    }
  });

  document.getElementById('cancel-btn').addEventListener('click', hideModal);

  // Log modal close
  document.getElementById('log-close-btn').addEventListener('click', hideLogModal);

  // Snippets modal close
  document.getElementById('snippets-close-btn').addEventListener('click', hideSnippetsModal);

  // JSON Export
  document.getElementById('export-json-btn').addEventListener('click', () => {
    getAllContacts(db).then(contacts => {
      const data = { exportedAt: new Date().toISOString(), contacts };
      triggerDownload(JSON.stringify(data, null, 2), 'networking-crm-export.json', 'application/json');
    });
  });

  // CSV Export
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    Promise.all([getAllContacts(db), getAllInteractions(db)]).then(([contacts, interactions]) => {
      const csv = exportCSV(contacts, interactions);
      triggerDownload(csv, 'networking-crm-export.csv', 'text/csv');
    });
  });

  // Import
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const result = validateImport(parsed);
        if (!result.valid) {
          alert('Import failed: ' + result.errors.join(', '));
          return;
        }
        Promise.all(result.contacts.map(c => addContact(db, c))).then(loadAndRender);
      } catch {
        alert('Import failed: Invalid JSON');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
});

function loadAndRender() {
  getAllContacts(db).then(contacts => {
    allContacts = contacts;
    if (currentTab === 'all') {
      renderContacts(allContacts, currentSearchTerm, currentTagFilter);
    } else {
      renderReconnectView(allContacts);
    }
  });
}

function triggerDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function validateImport(data) {
  let arr = data && data.contacts ? data.contacts : data;
  if (!Array.isArray(arr)) return { valid: false, errors: ['Not a valid contacts array'] };
  const errors = [];
  const sanitized = [];
  arr.forEach((item, i) => {
    const e = [];
    if (!item.name || typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 100)
      e.push(`[${i}] name invalid`);
    if (!Number.isInteger(item.interval) || item.interval < 1)
      e.push(`[${i}] interval invalid`);
    if (item.lastContacted != null && !/^\d{4}-\d{2}-\d{2}$/.test(item.lastContacted))
      e.push(`[${i}] lastContacted invalid`);
    if (item.notes && item.notes.length > 500)
      e.push(`[${i}] notes too long`);
    if (e.length) {
      errors.push(...e);
    } else {
      sanitized.push({
        name: item.name,
        interval: item.interval,
        lastContacted: item.lastContacted || null,
        notes: item.notes || '',
        roleCompany: item.roleCompany || '',
        howMet: item.howMet || '',
        lastTopic: item.lastTopic || '',
        nextAction: item.nextAction || '',
        intent: item.intent || '',
        tag: item.tag || ''
      });
    }
  });
  if (errors.length) return { valid: false, errors };
  return { valid: true, contacts: sanitized };
}

function contactById(id) {
  return allContacts.find(c => c.id === Number(id)) || null;
}
