'use strict';

const socket = io();

let state = null;
let activePartyId = null;
let editPartyId = null;

const el = (id) => document.getElementById(id);

const partyListEl = el('partyList');
const titleEl = el('title');
const subtitleEl = el('subtitle');

// ---------- Rendering ----------

function render(newState) {
  state = newState;
  titleEl.textContent = state.title;
  subtitleEl.textContent = state.subtitle;

  const sorted = [...state.parties].sort((a, b) => b.points - a.points);
  partyListEl.innerHTML = '';
  sorted.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'party-row';
    row.style.background = p.color;
    row.dataset.id = p.id;
    row.innerHTML = `
      <span class="rank ${idx === 0 ? 'crown-rank' : ''}">${idx === 0 ? '👑' : '#' + (idx + 1)}</span>
      <span class="p-emoji">${p.emoji}</span>
      <span class="p-name">${escapeHtml(p.name)}</span>
      <span class="p-points">${formatNumber(p.points)}</span>
    `;
    row.addEventListener('click', () => openPointsMenu(p.id));
    partyListEl.appendChild(row);
  });

  // Einstellungen: Parteienliste synchron halten, falls Overlay offen ist
  if (!el('settingsOverlay').classList.contains('hidden')) {
    renderPartyEditList();
  }
}

function formatNumber(n) {
  return new Intl.NumberFormat('de-DE').format(n);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getParty(id) {
  return state.parties.find((p) => p.id === id);
}

function rowEl(id) {
  return partyListEl.querySelector(`.party-row[data-id="${id}"]`);
}

// ---------- Punkte-Menü ----------

function openPointsMenu(partyId) {
  activePartyId = partyId;
  const p = getParty(partyId);
  if (!p) return;
  el('pmEmoji').textContent = p.emoji;
  el('pmName').textContent = p.name;
  el('customAmount').value = '';
  el('pointsOverlay').classList.remove('hidden');
}

function closePointsMenu() {
  el('pointsOverlay').classList.add('hidden');
  activePartyId = null;
}

el('pmClose').addEventListener('click', closePointsMenu);
el('pointsOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'pointsOverlay') closePointsMenu();
});

document.querySelectorAll('.qp-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const amount = Number(btn.dataset.amount);
    sendPoints(amount);
  });
});

el('btnCustomAdd').addEventListener('click', () => {
  const val = Number(el('customAmount').value);
  if (!val || val <= 0) return;
  sendPoints(val);
});

function sendPoints(amount) {
  if (!activePartyId) return;
  socket.emit('points:add', { partyId: activePartyId, amount, source: 'control' });
  closePointsMenu();
}

el('pmEdit').addEventListener('click', () => {
  if (!activePartyId) return;
  closePointsMenu();
  openEditParty(activePartyId);
});

// ---------- Punkte-Effekt bei Vergabe ----------

socket.on('effect:points', ({ partyId, amount }) => {
  const p = getParty(partyId) || (state.parties || []).find((x) => x.id === partyId);
  const color = p ? p.color : '#fbbf24';
  const target = rowEl(partyId);
  if (target) {
    FX.burst(target, '#ffffff', 16);
    FX.burst(target, color, 16);
    FX.floatingPoints(target, '+' + formatNumber(amount), '#ffffff');
    target.classList.remove('pulse');
    void target.offsetWidth;
    target.classList.add('pulse');
  } else {
    FX.burst(null, color, 24);
  }
});

// ---------- Battle beenden / Sieger ----------

el('btnEnd').addEventListener('click', () => {
  if (!state || state.parties.length === 0) return;
  if (!confirm('Battle wirklich beenden und Sieger küren?')) return;
  socket.emit('battle:end');
});

let stopRain = null;

socket.on('battle:ended', (result) => {
  showWinnerOverlay(result);
});

function showWinnerOverlay(result) {
  el('winnerName').textContent = result.winnerName;
  el('winnerName').style.color = result.winnerColor;
  el('winnerPoints').textContent = formatNumber(result.points) + ' PTS';

  const lines = [
    `GESAMT VERGEBEN: <b>${formatNumber(result.totalVergeben)} Punkte</b>`,
    `AKTIONEN: <b>${formatNumber(result.aktionen)}</b>`,
    `GRÖSSTER BURST: <b>${formatNumber(result.groessterBurst)}</b>`,
    `VORSPRUNG: <b>${formatNumber(result.vorsprung)} Punkte</b>`
  ];
  if (result.aufholjagd > 0) {
    lines.push(`🔥 AUFHOLJAGD: <b>war mal ${formatNumber(result.aufholjagd)} Punkte hinten!</b>`);
  }
  el('statsBox').innerHTML = lines.join('<br/>');

  const voteUrl = buildVoteUrl();
  el('qrWrap').innerHTML = `<img src="${qrImageUrl(voteUrl)}" width="150" height="150" alt="QR Code" />`;

  el('winnerOverlay').classList.remove('hidden');
  FX.screenFlash(result.winnerColor);
  if (stopRain) stopRain();
  stopRain = FX.rain(4500, [result.winnerColor, '#fbbf24', '#ffffff']);
}

el('btnCloseWinner').addEventListener('click', () => {
  el('winnerOverlay').classList.add('hidden');
  if (stopRain) { stopRain(); stopRain = null; }
});

el('btnNewBattle').addEventListener('click', () => {
  socket.emit('battle:reset');
  el('winnerOverlay').classList.add('hidden');
  if (stopRain) { stopRain(); stopRain = null; }
});

socket.on('battle:reset', () => {
  el('winnerOverlay').classList.add('hidden');
  if (stopRain) { stopRain(); stopRain = null; }
});

// ---------- Einstellungen ----------

el('btnSettings').addEventListener('click', () => {
  el('metaTitle').value = state.title;
  el('metaSubtitle').value = state.subtitle;
  el('metaCooldown').value = state.voteCooldownSeconds;
  renderPartyEditList();
  el('settingsOverlay').classList.remove('hidden');
});

el('settingsClose').addEventListener('click', () => el('settingsOverlay').classList.add('hidden'));
el('settingsOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'settingsOverlay') el('settingsOverlay').classList.add('hidden');
});

el('btnSaveMeta').addEventListener('click', () => {
  socket.emit('meta:update', {
    title: el('metaTitle').value,
    subtitle: el('metaSubtitle').value,
    voteCooldownSeconds: Number(el('metaCooldown').value)
  });
});

function renderPartyEditList() {
  const list = el('partyEditList');
  list.innerHTML = '';
  state.parties.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'pe-row';
    row.innerHTML = `
      <span class="p-emoji" style="background:${p.color}">${p.emoji}</span>
      <span class="pe-name">${escapeHtml(p.name)}</span>
      <button title="Bearbeiten" data-id="${p.id}" class="pe-edit">✏️</button>
    `;
    row.querySelector('.pe-edit').addEventListener('click', () => openEditParty(p.id));
    list.appendChild(row);
  });
}

el('btnAddParty').addEventListener('click', () => {
  socket.emit('party:add', { name: 'Neue Partei', color: randomColor(), emoji: '🏳️' });
});

function randomColor() {
  const palette = ['#1d4ed8', '#7c3aed', '#eab308', '#f97316', '#22c55e', '#dc2626', '#db2777', '#0891b2'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function openEditParty(id) {
  const p = getParty(id);
  if (!p) return;
  editPartyId = id;
  el('epName').value = p.name;
  el('epEmoji').value = p.emoji;
  el('epColor').value = p.color;
  el('epUrl').value = p.infoUrl || '';
  el('editPartyOverlay').classList.remove('hidden');
}

el('editPartyClose').addEventListener('click', () => el('editPartyOverlay').classList.add('hidden'));
el('editPartyOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'editPartyOverlay') el('editPartyOverlay').classList.add('hidden');
});

el('btnSaveParty').addEventListener('click', () => {
  if (!editPartyId) return;
  socket.emit('party:update', {
    id: editPartyId,
    patch: {
      name: el('epName').value,
      emoji: el('epEmoji').value,
      color: el('epColor').value,
      infoUrl: el('epUrl').value
    }
  });
  el('editPartyOverlay').classList.add('hidden');
});

el('btnDeleteParty').addEventListener('click', () => {
  if (!editPartyId) return;
  if (!confirm('Diese Partei wirklich löschen?')) return;
  socket.emit('party:remove', { id: editPartyId });
  el('editPartyOverlay').classList.add('hidden');
});

// ---------- Voting-Link teilen ----------

function buildVoteUrl() {
  return window.location.origin + '/vote.html';
}

function qrImageUrl(url) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
}

el('btnShare').addEventListener('click', () => {
  const url = buildVoteUrl();
  el('shareUrl').textContent = url;
  el('shareQr').innerHTML = `<img src="${qrImageUrl(url)}" width="180" height="180" alt="QR Code" />`;
  el('shareOverlay').classList.remove('hidden');
});

el('shareClose').addEventListener('click', () => el('shareOverlay').classList.add('hidden'));
el('shareOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'shareOverlay') el('shareOverlay').classList.add('hidden');
});

el('btnCopyLink').addEventListener('click', async () => {
  const url = buildVoteUrl();
  try {
    await navigator.clipboard.writeText(url);
    el('btnCopyLink').textContent = 'Kopiert! ✅';
    setTimeout(() => (el('btnCopyLink').textContent = 'Link kopieren'), 1500);
  } catch (e) {
    prompt('Link kopieren:', url);
  }
});

// ---------- Socket Wiring ----------

socket.on('state:full', render);
