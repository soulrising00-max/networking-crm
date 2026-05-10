function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeDelta(lastContacted, interval) {
  if (!lastContacted) return 999;
  const last = parseDate(lastContacted);
  const due = new Date(last.getTime() + interval * 86400000);
  const today = parseDate(todayStr());
  return Math.floor((today - due) / 86400000);
}

function formatDelta(delta) {
  if (delta === 999) return 'Never contacted';
  if (delta > 0) return `${delta} day(s) overdue`;
  if (delta === 0) return 'Due today';
  return `Due in ${Math.abs(delta)} day(s)`;
}

// Returns days since last contact regardless of interval. 999 if never contacted.
function computeSilenceDays(lastContacted) {
  if (!lastContacted) return 999;
  const last = parseDate(lastContacted);
  const today = parseDate(todayStr());
  return Math.floor((today - last) / 86400000);
}
