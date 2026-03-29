/* ═══════════════════════════════════════════════════════════════
   Kladenské Pexetrio – client (emoji edition)
   ═══════════════════════════════════════════════════════════════ */

const socket = io();

let myId      = null;
let myIdx     = null;
let gameState = null;
let locked    = false;
let roomCode  = null;

// ─── Views ────────────────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'view-game') {
    // Two rAFs: first lets flex layout settle, second measures and sizes
    requestAnimationFrame(() => requestAnimationFrame(updateGridLayout));
  }
}

const $ = id => document.getElementById(id);

// ─── URL param ────────────────────────────────────────────────────────────────
(function () {
  const code = new URLSearchParams(window.location.search).get('room');
  if (code) $('room-code-input').value = code.toUpperCase();
})();

// ─── Lobby ────────────────────────────────────────────────────────────────────
function setError(msg) { $('lobby-error').textContent = msg; }

$('btn-create').addEventListener('click', () => {
  const name = $('player-name').value.trim();
  if (!name) return setError('Zadej prosím své jméno.');
  setError('');
  socket.emit('create-room', { playerName: name });
});

$('btn-join').addEventListener('click', () => {
  const name = $('player-name').value.trim();
  const code = $('room-code-input').value.trim().toUpperCase();
  if (!name) return setError('Zadej prosím své jméno.');
  if (!code || code.length < 4) return setError('Zadej platný kód místnosti.');
  setError('');
  socket.emit('join-room', { playerName: name, roomCode: code });
});

$('player-name').addEventListener('keydown',    e => { if (e.key === 'Enter') $('btn-create').click(); });
$('room-code-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-join').click(); });
$('room-code-input').addEventListener('input',   e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

$('btn-copy').addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?room=${roomCode}`;
  navigator.clipboard.writeText(url).then(() => {
    $('copy-confirm').textContent = '✓ Odkaz zkopírován!';
    setTimeout(() => { $('copy-confirm').textContent = ''; }, 3000);
  });
});

$('btn-rematch').addEventListener('click', () => { location.href = '/'; });

// ─── Socket ───────────────────────────────────────────────────────────────────
socket.on('connect', () => { myId = socket.id; });

socket.on('room-created', ({ code }) => {
  roomCode = code;
  $('display-code').textContent = code;
  history.replaceState(null, '', `?room=${code}`);
  showView('view-waiting');
});

socket.on('join-error', msg => setError(msg));
socket.on('flip-error', msg => console.warn(msg));

socket.on('game-start', ({ state }) => {
  gameState = state;
  myIdx = state.players.findIndex(p => p.id === myId);
  locked = false;
  renderGame();
  showView('view-game');
});

socket.on('card-flipped', ({ pos }) => {
  if (!gameState) return;
  gameState.cards[pos].flipped = true;
  document.querySelector(`.card[data-pos="${pos}"]`)?.classList.add('flipped');
});

socket.on('match-found', ({ positions, players, currentIdx }) => {
  gameState.players = players;
  gameState.currentIdx = currentIdx;
  positions.forEach(pos => {
    gameState.cards[pos].matched = true;
    document.querySelector(`.card[data-pos="${pos}"]`)?.classList.add('matched', 'flipped');
  });
  locked = false;
  updateScorebar();
  updateRemaining();
  const cur = players[currentIdx];
  if (cur.id === myId) setStatus('Výborně! Trojice nalezena – hraješ znovu!', 'success');
  else setStatus(`${cur.name} našel trojici a hraje znovu.`, 'info');
});

socket.on('no-match', ({ positions, players, currentIdx }) => {
  if (!gameState) return;
  gameState.players = players;
  gameState.currentIdx = currentIdx;
  (positions || []).forEach(pos => {
    document.querySelector(`.card[data-pos="${pos}"]`)?.classList.remove('flipped');
    if (gameState.cards[pos]) gameState.cards[pos].flipped = false;
  });
  // Safety net
  document.querySelectorAll('.card.flipped:not(.matched)').forEach(el => {
    el.classList.remove('flipped');
    const pos = parseInt(el.dataset.pos);
    if (gameState.cards[pos]) gameState.cards[pos].flipped = false;
  });
  locked = false;
  updateScorebar();
  const cur = players[currentIdx];
  if (cur.id === myId) setStatus('Trojice se neshoduje – jsi na řadě!', 'warning');
  else setStatus(`Trojice se neshoduje – hraje ${cur.name}.`, 'info');
});

socket.on('game-over', ({ players, winner }) => {
  const tied = players[0].score === players[1].score;
  $('winner-title').textContent = tied ? 'Remíza!' : `${winner.name} vyhrál!`;
  $('final-scores').innerHTML = players.map(p => `
    <div class="final-player ${!tied && p.id === winner.id ? 'final-winner' : ''}">
      <span class="fp-name">${p.name}</span>
      <span class="fp-score">${p.score} ${p.score === 1 ? 'bod' : p.score < 5 ? 'body' : 'bodů'}</span>
    </div>`).join('');
  showView('view-gameover');
});

socket.on('player-left', ({ message }) => { alert(message); location.href = '/'; });

// ─── Fullscreen grid layout ───────────────────────────────────────────────────
const SCOREBAR_H = 52;   // px – fixed, avoid measuring before paint
const STATUS_H   = 30;
const PAD_V      = 6;    // total vertical padding around board
const PAD_H      = 8;    // total horizontal padding

function getGridConfig() {
  const w = window.innerWidth;
  if (w >= 840) return { cols: 9, rows: 4 };
  if (w >= 540) return { cols: 6, rows: 6 };
  return { cols: 4, rows: 9 };
}

function updateGridLayout() {
  const { cols, rows } = getGridConfig();
  const gap = 4;

  const availH = window.innerHeight - SCOREBAR_H - STATUS_H - PAD_V;
  const availW = window.innerWidth  - PAD_H;

  let cardH = Math.floor((availH - gap * (rows - 1)) / rows);
  let cardW = Math.floor(cardH * 0.72);          // ~playing-card ratio

  const totalW = cardW * cols + gap * (cols - 1);
  if (totalW > availW) {
    cardW = Math.floor((availW - gap * (cols - 1)) / cols);
    cardH = Math.floor(cardW / 0.72);
  }

  cardH = Math.max(cardH, 40);
  cardW = Math.max(cardW, 28);

  const r = document.documentElement;
  r.style.setProperty('--cols',   cols);
  r.style.setProperty('--card-w', cardW + 'px');
  r.style.setProperty('--card-h', cardH + 'px');
  r.style.setProperty('--gap',    gap + 'px');
}

window.addEventListener('resize', () => {
  if ($('view-game').classList.contains('active')) updateGridLayout();
});

// ─── Render board ─────────────────────────────────────────────────────────────
function renderGame() {
  const board = $('board');
  board.innerHTML = '';
  gameState.cards.forEach(card => board.appendChild(createCardEl(card)));
  updateScorebar();
  updateRemaining();
  const cur = gameState.players[gameState.currentIdx];
  if (cur.id === myId) setStatus('Jsi na řadě – otočte tři karty!', 'info');
  else setStatus(`Hraje ${cur.name}…`, 'muted');
}

function createCardEl(card) {
  const el = document.createElement('div');
  el.className = 'card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched' : '');
  el.dataset.pos  = card.pos;
  el.dataset.set  = card.setId;

  const data  = CARDS_DATA[card.setId] || {};
  const emoji = data.emoji || '?';

  el.innerHTML = `
    <div class="card-inner">
      <div class="card-back">
        <div class="cb-pattern"></div>
        <div class="cb-logo">Kladenské<br>Pexetrio</div>
      </div>
      <div class="card-front">
        <div class="card-emoji">${emoji}</div>
      </div>
    </div>`;

  el.addEventListener('click', () => handleCardClick(card.pos));
  return el;
}

// ─── Card click ───────────────────────────────────────────────────────────────
function handleCardClick(pos) {
  if (locked || !gameState) return;
  const cur = gameState.players[gameState.currentIdx];
  if (cur.id !== myId) return;
  const card = gameState.cards[pos];
  if (!card || card.flipped || card.matched) return;
  const flippedCount = gameState.cards.filter(c => c.flipped && !c.matched).length;
  if (flippedCount >= 3) return;
  if (flippedCount === 2) locked = true;
  socket.emit('flip-card', { pos });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function updateScorebar() {
  gameState.players.forEach((p, i) => {
    $(`name-p${i}`).textContent = p.name;
    $(`pts-p${i}`).textContent  = p.score;
    $(`score-p${i}`).classList.toggle('active-player', i === gameState.currentIdx);
    $(`score-p${i}`).classList.toggle('is-me', p.id === myId);
  });
}

function updateRemaining() {
  const matched = gameState.cards.filter(c => c.matched).length / 3;
  $('remaining-count').textContent = 12 - matched;
}

function setStatus(msg, type = 'info') {
  const el = $('status-msg');
  el.textContent = msg;
  el.className = `status-msg status-${type}`;
}
