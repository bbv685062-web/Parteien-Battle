'use strict';

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const store = require('./state');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => res.redirect('/control.html'));

app.get('/api/state', (req, res) => {
  res.json(store.getState());
});

// simple per-connection rate limiting for anonymous votes
const voteTimestamps = new Map(); // socket.id -> { [partyId]: lastTs }

function broadcastState() {
  io.emit('state:full', store.getState());
}

io.on('connection', (socket) => {
  socket.emit('state:full', store.getState());

  socket.on('points:add', ({ partyId, amount, source }) => {
    if (!partyId) return;

    if (source === 'vote') {
      const cooldownMs = (store.getState().voteCooldownSeconds || 0) * 1000;
      const now = Date.now();
      const perSocket = voteTimestamps.get(socket.id) || {};
      const last = perSocket[partyId] || 0;
      if (cooldownMs > 0 && now - last < cooldownMs) {
        socket.emit('vote:rejected', {
          partyId,
          retryInMs: cooldownMs - (now - last)
        });
        return;
      }
      perSocket[partyId] = now;
      voteTimestamps.set(socket.id, perSocket);
      amount = 1; // anonymous votes always count as exactly 1 point
    }

    const result = store.addPoints(partyId, amount);
    if (!result) return;
    io.emit('effect:points', { partyId, amount: result.amount, source: source || 'control' });
    broadcastState();
  });

  socket.on('party:add', (data) => {
    store.addParty(data || {});
    broadcastState();
  });

  socket.on('party:update', ({ id, patch }) => {
    if (!id) return;
    store.updateParty(id, patch || {});
    broadcastState();
  });

  socket.on('party:remove', ({ id }) => {
    if (!id) return;
    store.removeParty(id);
    broadcastState();
  });

  socket.on('meta:update', (patch) => {
    store.updateMeta(patch || {});
    broadcastState();
  });

  socket.on('battle:end', () => {
    const result = store.endBattle();
    if (!result) return;
    io.emit('battle:ended', result);
    broadcastState();
  });

  socket.on('battle:reset', () => {
    store.resetBattle();
    io.emit('battle:reset');
    broadcastState();
  });

  socket.on('disconnect', () => {
    voteTimestamps.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Parteien-Battle Server läuft auf http://localhost:${PORT}`);
  console.log(`  Kontroll-/Overlay-Bildschirm: http://localhost:${PORT}/control.html`);
  console.log(`  Anonyme Abstimmungsseite:     http://localhost:${PORT}/vote.html`);
});
