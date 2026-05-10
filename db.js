function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('networkingCRM', 3);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('interactions')) {
        const store = db.createObjectStore('interactions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('contactId', 'contactId', { unique: false });
      }
      // MIGRATION SCAFFOLD: add future version upgrades here
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function getAllContacts(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readonly');
    const req = tx.objectStore('contacts').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function addContact(db, contact) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readwrite');
    const req = tx.objectStore('contacts').add(contact);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function updateContact(db, contact) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('contacts', 'readwrite');
    const req = tx.objectStore('contacts').put(contact);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function deleteContact(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['contacts', 'interactions'], 'readwrite');
    tx.objectStore('contacts').delete(id);
    const idx = tx.objectStore('interactions').index('contactId');
    const req = idx.getAllKeys(id);
    req.onsuccess = e => {
      e.target.result.forEach(k => tx.objectStore('interactions').delete(k));
    };
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

function getInteractionsByContact(db, contactId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('interactions', 'readonly');
    const req = tx.objectStore('interactions').index('contactId').getAll(contactId);
    req.onsuccess = e => resolve(e.target.result.sort((a, b) => b.date.localeCompare(a.date)));
    req.onerror = e => reject(e.target.error);
  });
}

function getAllInteractions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('interactions', 'readonly');
    const req = tx.objectStore('interactions').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function addInteraction(db, entry) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('interactions', 'readwrite');
    const req = tx.objectStore('interactions').add(entry);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function deleteInteraction(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('interactions', 'readwrite');
    const req = tx.objectStore('interactions').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e.target.error);
  });
}

function exportCSV(contacts, interactions) {
  const byContact = {};
  interactions.forEach(i => {
    if (!byContact[i.contactId]) byContact[i.contactId] = [];
    byContact[i.contactId].push(i);
  });

  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';

  const header = [
    'Name', 'Role/Company', 'How Met', 'Tag', 'Interval (days)',
    'Last Contacted', 'Last Topic', 'Next Action', 'Intent', 'Notes', 'Interaction Log'
  ].map(esc).join(',');

  const rows = contacts.map(c => {
    const log = (byContact[c.id] || [])
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(i => `${i.date}|${i.type}|${i.note}`)
      .join('; ');
    return [
      esc(c.name), esc(c.roleCompany || ''), esc(c.howMet || ''), esc(c.tag || ''),
      esc(c.interval), esc(c.lastContacted || ''), esc(c.lastTopic || ''),
      esc(c.nextAction || ''), esc(c.intent || ''), esc(c.notes || ''), esc(log)
    ].join(',');
  });

  return [header, ...rows].join('\r\n');
}
