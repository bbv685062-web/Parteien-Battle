'use strict';

const socket = io();
let state = null;

const el = (id) => document.getElementById(id);
const listEl = el('voteList');
const toastEl = el('toast');

function render(newState) {
  state = newState;
  listEl.innerHTML = '';
  const sorted = [...state.parties].sort((a, b) => b.points - a.points);
  sorted.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'vote-card';
    card.style.background = p.color;
    card.dataset.id = p.id;
    card.innerHTML = `
      <span class="p-emoji">${p.emoji}</span>
      <span class="vc-name">${escapeHtml(p.name)}</span>
      <button class="vc-btn">Abstimmen</button>
    `;
    const btn = card.querySelector('.vc-btn');
    applyCooldownState(btn, p.id);
    btn.addEventListener('click', () => castVote(p.id, p, card, btn));
    listEl.appendChild(card);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function cooldownKey(partyId) {
  return 'pb_vote_' + partyId;
}

function applyCooldownState(btn, partyId) {
  const last = Number(localStorage.getItem(cooldownKey(partyId)) || 0);
  const cooldownMs = (state.voteCooldownSeconds || 0) * 1000;
  const remaining = cooldownMs - (Date.now() - last);
  if (remaining > 0) {
    lockButton(btn, remaining);
  }
}

function lockButton(btn, remainingMs) {
  btn.disabled = true;
  const end = Date.now() + remainingMs;
  const tick = () => {
    const left = end - Date.now();
    if (left <= 0) {
      btn.disabled = false;
      btn.textContent = 'Abstimmen';
      return;
    }
    btn.textContent = Math.ceil(left / 1000) + 's';
    requestAnimationFrame(() => setTimeout(tick, 200));
  };
  tick();
}

function castVote(partyId, party, card, btn) {
  if (btn.disabled) return;
  socket.emit('points:add', { partyId, amount: 1, source: 'vote' });
  localStorage.setItem(cooldownKey(partyId), String(Date.now()));
  FX.burst(card, '#ffffff', 18);
  FX.burst(card, party.color, 18);
  showToast('Danke! Deine Stimme für ' + party.name + ' wurde gezählt 🎉');
  const cooldownMs = (state.voteCooldownSeconds || 0) * 1000;
  if (cooldownMs > 0) lockButton(btn, cooldownMs);
}

let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2200);
}

socket.on('vote:rejected', () => {
  showToast('Du hast für diese Partei gerade schon abgestimmt – gleich nochmal versuchen!');
});

socket.on('state:full', render);
