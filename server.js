const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Card definitions ──────────────────────────────────────────────────────────
const CARD_SETS = [
  { id: 'usa',      country: 'USA',        flag: 'us', street: 'Americká'    },
  { id: 'armenia',  country: 'Arménie',    flag: 'am', street: 'Arménská'    },
  { id: 'bulgaria', country: 'Bulharsko',  flag: 'bg', street: 'Bulharská'   },
  { id: 'france',   country: 'Francie',    flag: 'fr', street: 'Francouzská' },
  { id: 'italy',    country: 'Itálie',     flag: 'it', street: 'Italská'     },
  { id: 'hungary',  country: 'Maďarsko',   flag: 'hu', street: 'Maďarská'    },
  { id: 'germany',  country: 'Německo',    flag: 'de', street: 'Německá'     },
  { id: 'norway',   country: 'Norsko',     flag: 'no', street: 'Norská'      },
  { id: 'poland',   country: 'Polsko',     flag: 'pl', street: 'Polská'      },
  { id: 'romania',  country: 'Rumunsko',   flag: 'ro', street: 'Rumunská'    },
  { id: 'russia',   country: 'Rusko',      flag: 'ru', street: 'Ruská'       },
  { id: 'slovakia', country: 'Slovensko',  flag: 'sk', street: 'Slovenská'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck() {
  const cards = [];
  CARD_SETS.forEach(set => {
    cards.push({ id: `${set.id}_flag`,    type: 'flag',    setId: set.id, country: set.country, flag: set.flag   });
    cards.push({ id: `${set.id}_outline`, type: 'outline', setId: set.id, country: set.country });
    cards.push({ id: `${set.id}_street`,  type: 'street',  setId: set.id, country: set.country, street: set.street });
  });
  return shuffle(cards).map((card, pos) => ({ ...card, pos, flipped: false, matched: false }));
}

function buildGameState(players) {
  return {
    cards: buildDeck(),
    players: players.map((p, i) => ({ id: p.id, name: p.name, score: 0, active: i === 0 })),
    currentIdx: 0,
    flipping: [],   // positions of currently face-up unmatched cards
    locked: false,  // board locked while checking / animating
    status: 'playing',
  };
}

// ─── Room storage ─────────────────────────────────────────────────────────────
const rooms = new Map();

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('[connect]', socket.id);

  // ── Create room ──
  socket.on('create-room', ({ playerName }) => {
    const code = generateCode();
    rooms.set(code, {
      code,
      players: [{ id: socket.id, name: playerName.trim().slice(0, 24) }],
      state: null,
    });
    socket.roomCode = code;
    socket.join(code);
    socket.emit('room-created', { code });
    console.log(`[room] ${code} created by "${playerName}"`);
  });

  // ── Join room ──
  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room)            return socket.emit('join-error', 'Místnost nenalezena.');
    if (room.players.length >= 2) return socket.emit('join-error', 'Místnost je plná.');
    if (room.state)       return socket.emit('join-error', 'Hra již probíhá.');

    room.players.push({ id: socket.id, name: playerName.trim().slice(0, 24) });
    socket.roomCode = code;
    socket.join(code);

    // Start game
    room.state = buildGameState(room.players);
    io.to(code).emit('game-start', { state: room.state });
    console.log(`[room] ${code} game started`);
  });

  // ── Flip card ──
  socket.on('flip-card', ({ pos }) => {
    const code = socket.roomCode;
    const room = code && rooms.get(code);
    if (!room || !room.state) return;

    const { state } = room;
    if (state.status !== 'playing') return;
    if (state.locked) return;

    const current = state.players[state.currentIdx];
    if (current.id !== socket.id) return socket.emit('flip-error', 'Nejsi na řadě!');

    const card = state.cards[pos];
    if (!card || card.flipped || card.matched) return;
    if (state.flipping.length >= 3) return;

    card.flipped = true;
    state.flipping.push(pos);

    io.to(code).emit('card-flipped', { pos, card });

    // Check triplet
    if (state.flipping.length === 3) {
      state.locked = true;
      const trio = state.flipping.map(p => state.cards[p]);
      const isMatch = trio.every(c => c.setId === trio[0].setId);

      if (isMatch) {
        trio.forEach(c => { c.matched = true; c.flipped = true; });
        current.score++;
        state.flipping = [];
        state.locked = false;

        const allDone = state.cards.every(c => c.matched);
        if (allDone) {
          state.status = 'finished';
          const winner = state.players.reduce((a, b) => b.score > a.score ? b : a);
          io.to(code).emit('game-over', { players: state.players, winner });
        } else {
          // Same player continues
          state.players.forEach((p, i) => { p.active = i === state.currentIdx; });
          io.to(code).emit('match-found', {
            positions: trio.map(c => c.pos),
            players: state.players,
            currentIdx: state.currentIdx,
          });
        }
      } else {
        // Flip back after delay, switch player
        setTimeout(() => {
          const toFlipBack = [...state.flipping];
          toFlipBack.forEach(p => { state.cards[p].flipped = false; });
          state.currentIdx = (state.currentIdx + 1) % 2;
          state.flipping = [];
          state.locked = false;
          state.players.forEach((p, i) => { p.active = i === state.currentIdx; });
          io.to(code).emit('no-match', {
            positions: toFlipBack,
            players: state.players,
            currentIdx: state.currentIdx,
          });
        }, 1500);
      }
    }
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code) {
      const room = rooms.get(code);
      if (room) {
        io.to(code).emit('player-left', { message: 'Soupeř se odpojil. Hra skončena.' });
        rooms.delete(code);
      }
    }
    console.log('[disconnect]', socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Pexetrio server běží na portu ${PORT}`));
