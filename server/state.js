'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.runtime.json');

function makeId() {
  return crypto.randomBytes(6).toString('hex');
}

const DEFAULT_PARTIES = [
  { name: 'AfD', color: '#1d4ed8', emoji: '🔷', infoUrl: '' },
  { name: 'BSW', color: '#7c3aed', emoji: '🟣', infoUrl: '' },
  { name: 'FDP', color: '#eab308', emoji: '🟡', infoUrl: '' },
  { name: 'Die Partei', color: '#f97316', emoji: '🎂', infoUrl: '' },
  { name: 'Die Grünen', color: '#22c55e', emoji: '🌻', infoUrl: '' },
  { name: 'SPD', color: '#dc2626', emoji: '🌹', infoUrl: '' },
  { name: 'Die Linke', color: '#db2777', emoji: '✊', infoUrl: '' },
  { name: 'CDU/CSU', color: '#4b5563', emoji: '⚫', infoUrl: '' }
].map((p) => ({
  id: makeId(),
  name: p.name,
  color: p.color,
  emoji: p.emoji,
  infoUrl: p.infoUrl,
  points: 0,
  actionsCount: 0,
  biggestBurst: 0,
  maxDeficit: 0
}));

function defaultState() {
  return {
    title: 'PARTEIEN BATTLE STREAM',
    subtitle: '1 Stimme = 1 Punkt für eure Partei',
    parties: DEFAULT_PARTIES,
    battleActive: true,
    voteCooldownSeconds: 20,
    lastBattleResult: null
  };
}

let state = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  ensureDataDir();
  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      state = JSON.parse(raw);
      return state;
    } catch (e) {
      console.error('Konnte state.runtime.json nicht lesen, verwende Standardwerte.', e);
    }
  }
  state = defaultState();
  save();
  return state;
}

let saveTimer = null;
function save() {
  ensureDataDir();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('Konnte Zustand nicht speichern:', e);
    }
  }, 150);
}

function getState() {
  if (!state) load();
  return state;
}

function findParty(id) {
  return getState().parties.find((p) => p.id === id);
}

function recomputeDeficits() {
  const parties = getState().parties;
  if (parties.length === 0) return;
  const leader = parties.reduce((a, b) => (b.points > a.points ? b : a), parties[0]);
  for (const p of parties) {
    if (p.id === leader.id) continue;
    const deficit = leader.points - p.points;
    if (deficit > p.maxDeficit) p.maxDeficit = deficit;
  }
}

function addPoints(partyId, amount) {
  const p = findParty(partyId);
  if (!p) return null;
  const amt = Math.max(1, Math.min(100000, Math.round(Number(amount) || 0)));
  p.points += amt;
  p.actionsCount += 1;
  if (amt > p.biggestBurst) p.biggestBurst = amt;
  recomputeDeficits();
  save();
  return { party: p, amount: amt };
}

function addParty({ name, color, emoji, infoUrl }) {
  const p = {
    id: makeId(),
    name: (name || 'Neue Partei').slice(0, 40),
    color: color || '#64748b',
    emoji: emoji || '🏳️',
    infoUrl: infoUrl || '',
    points: 0,
    actionsCount: 0,
    biggestBurst: 0,
    maxDeficit: 0
  };
  getState().parties.push(p);
  save();
  return p;
}

function updateParty(id, patch) {
  const p = findParty(id);
  if (!p) return null;
  if (typeof patch.name === 'string') p.name = patch.name.slice(0, 40);
  if (typeof patch.color === 'string') p.color = patch.color;
  if (typeof patch.emoji === 'string') p.emoji = patch.emoji.slice(0, 8);
  if (typeof patch.infoUrl === 'string') p.infoUrl = patch.infoUrl.slice(0, 300);
  save();
  return p;
}

function removeParty(id) {
  const s = getState();
  s.parties = s.parties.filter((p) => p.id !== id);
  save();
}

function endBattle() {
  const parties = getState().parties;
  if (parties.length === 0) return null;
  const sorted = [...parties].sort((a, b) => b.points - a.points);
  const winner = sorted[0];
  const second = sorted[1];
  const totalVergeben = parties.reduce((sum, p) => sum + p.points, 0);
  const aktionen = parties.reduce((sum, p) => sum + p.actionsCount, 0);
  const vorsprung = second ? winner.points - second.points : winner.points;
  const result = {
    winnerId: winner.id,
    winnerName: winner.name,
    winnerColor: winner.color,
    winnerEmoji: winner.emoji,
    points: winner.points,
    totalVergeben,
    aktionen,
    groessterBurst: winner.biggestBurst,
    vorsprung,
    aufholjagd: winner.maxDeficit,
    endedAt: Date.now()
  };
  getState().battleActive = false;
  getState().lastBattleResult = result;
  save();
  return result;
}

function resetBattle() {
  const s = getState();
  for (const p of s.parties) {
    p.points = 0;
    p.actionsCount = 0;
    p.biggestBurst = 0;
    p.maxDeficit = 0;
  }
  s.battleActive = true;
  s.lastBattleResult = null;
  save();
  return s;
}

function updateMeta({ title, subtitle, voteCooldownSeconds }) {
  const s = getState();
  if (typeof title === 'string') s.title = title.slice(0, 80);
  if (typeof subtitle === 'string') s.subtitle = subtitle.slice(0, 140);
  if (Number.isFinite(voteCooldownSeconds)) {
    s.voteCooldownSeconds = Math.max(0, Math.min(600, Math.round(voteCooldownSeconds)));
  }
  save();
  return s;
}

module.exports = {
  getState,
  addPoints,
  addParty,
  updateParty,
  removeParty,
  endBattle,
  resetBattle,
  updateMeta
};
