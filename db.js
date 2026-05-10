function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('networkingCRM', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
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
    const tx = db.transaction('contacts', 'readwrite');
    const req = tx.objectStore('contacts').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e.target.error);
  });
}
