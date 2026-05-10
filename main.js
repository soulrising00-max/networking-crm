let db = null;
let allContacts = [];
let currentSearchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/networking-crm/sw.js', { scope: '/networking-crm/' });
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.type === 'RELOAD') window.location.reload();
    });
  }

  // 2. Install prompt
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      showInstallBanner(e);
    });
  }

  // 3. Open DB
  openDB()
    .then(instance => {
      db = instance;
      loadAndRender();
    })
    .catch(() => showStorageError());

  // 5. Search
  document.getElementById('search-box').addEventListener('input', e => {
    currentSearchTerm = e.target.value;
    renderContacts(allContacts, currentSearchTerm);
  });

  // 6. FAB
  document.getElementById('fab').addEventListener('click', () => showModal(null));

  // 7. Card actions via delegation
  document.getElementById('contact-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    if (action === 'mark') {
      const contact = contactById(id);
      if (contact) updateContact(db, { ...contact, lastContacted: todayStr() }).then(loadAndRender);
    } else if (action === 'edit') {
      showModal(contactById(id));
    } else if (action === 'delete') {
      const contact = contactById(id);
      if (contact) showDeleteConfirmation(id, contact.name, id => deleteContact(db, id).then(loadAndRender));
    }
  });

  // 8. Modal save
  document.getElementById('save-btn').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    const interval = parseInt(document.getElementById('input-interval').value, 10);
    const lastContactedRaw = document.getElementById('input-last').value;
    const notes = document.getElementById('input-notes').value.trim();
    const modal = document.getElementById('contact-modal');
    const editIdStr = modal.dataset.editId;
    const editId = editIdStr ? Number(editIdStr) : null;

    if (!name || name.length > 100) return;
    if (!interval || interval < 1) return;
    if (lastContactedRaw && !/^\d{4}-\d{2}-\d{2}$/.test(lastContactedRaw)) return;
    if (notes.length > 500) return;

    const lastContacted = lastContactedRaw || null;

    // Duplicate check (warn but don't block)
    const dupWarning = document.getElementById('duplicate-warning');
    const isDup = allContacts.some(c =>
      c.name.toLowerCase() === name.toLowerCase() && c.id !== editId
    );
    dupWarning.style.display = isDup ? '' : 'none';

    const contact = { name, interval, lastContacted, notes };

    if (editId) {
      updateContact(db, { ...contact, id: editId }).then(() => { hideModal(); loadAndRender(); });
    } else {
      addContact(db, contact).then(() => { hideModal(); loadAndRender(); });
    }
  });

  // 9. Modal cancel
  document.getElementById('cancel-btn').addEventListener('click', hideModal);

  // 10. Export
  document.getElementById('export-btn').addEventListener('click', () => {
    getAllContacts(db).then(contacts => {
      const data = { exportedAt: new Date().toISOString(), contacts };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'networking-crm-export.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // 11. Import
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

// 4. loadAndRender
function loadAndRender() {
  getAllContacts(db).then(contacts => {
    allContacts = contacts;
    renderContacts(allContacts, currentSearchTerm);
  });
}

// 12. validateImport
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
    if (item.lastContacted !== null && item.lastContacted !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(item.lastContacted))
      e.push(`[${i}] lastContacted invalid`);
    if (item.notes && item.notes.length > 500)
      e.push(`[${i}] notes too long`);
    if (e.length) {
      errors.push(...e);
    } else {
      const c = {
        name: item.name,
        interval: item.interval,
        lastContacted: item.lastContacted || null,
        notes: item.notes || ''
      };
      sanitized.push(c);
    }
  });
  if (errors.length) return { valid: false, errors };
  return { valid: true, contacts: sanitized };
}

// 13. contactById
function contactById(id) {
  return allContacts.find(c => c.id === Number(id)) || null;
}
