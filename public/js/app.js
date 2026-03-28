/* ═══════════════════════════════════════════════════════════════
   Kladenské Pexetrio – client
   ═══════════════════════════════════════════════════════════════ */

const socket = io();

// ─── State ────────────────────────────────────────────────────────────────────
let myId        = null;
let myIdx       = null;   // 0 or 1
let gameState   = null;
let pendingFlips = [];    // card positions queued for flip animation
let locked      = false;  // UI lock while server processes
let roomCode    = null;

// ─── Views ────────────────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setError(msg) {
  $('lobby-error').textContent = msg;
}

// ─── URL param helper ─────────────────────────────────────────────────────────
(function checkUrlRoom() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('room');
  if (code) {
    $('room-code-input').value = code.toUpperCase();
  }
})();

// ─── Lobby button handlers ────────────────────────────────────────────────────
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

$('player-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('btn-create').click();
});
$('room-code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('btn-join').click();
});
$('room-code-input').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

$('btn-copy').addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?room=${roomCode}`;
  navigator.clipboard.writeText(url).then(() => {
    $('copy-confirm').textContent = '✓ Odkaz zkopírován!';
    setTimeout(() => { $('copy-confirm').textContent = ''; }, 3000);
  });
});

$('btn-rematch').addEventListener('click', () => {
  location.href = '/';
});

// ─── Socket events ────────────────────────────────────────────────────────────
socket.on('connect', () => { myId = socket.id; });

socket.on('room-created', ({ code }) => {
  roomCode = code;
  $('display-code').textContent = code;
  showView('view-waiting');
  // Update browser URL so player can copy it
  history.replaceState(null, '', `?room=${code}`);
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

socket.on('card-flipped', ({ pos, card }) => {
  if (!gameState) return;
  const cardEl = document.querySelector(`.card[data-pos="${pos}"]`);
  if (cardEl) {
    gameState.cards[pos].flipped = true;
    cardEl.classList.add('flipped');
  }
});

socket.on('match-found', ({ positions, players, currentIdx }) => {
  gameState.players = players;
  gameState.currentIdx = currentIdx;

  positions.forEach(pos => {
    const el = document.querySelector(`.card[data-pos="${pos}"]`);
    if (el) {
      el.classList.add('matched');
      gameState.cards[pos].matched = true;
    }
  });

  locked = false;
  updateScorebar();
  updateRemaining();
  const me = players[myIdx];
  const currentPlayer = players[currentIdx];
  if (currentPlayer.id === myId) {
    setStatus('Výborně! Nalezl jsi trojici. Hraješ znovu!', 'success');
  } else {
    setStatus(`${currentPlayer.name} nalezl trojici a hraje znovu.`, 'info');
  }
});

socket.on('no-match', ({ positions, players, currentIdx }) => {
  if (!gameState) return;
  gameState.players = players;
  gameState.currentIdx = currentIdx;

  // Flip listed cards back visually
  (positions || []).forEach(pos => {
    const el = document.querySelector(`.card[data-pos="${pos}"]`);
    if (el) el.classList.remove('flipped');
    if (gameState.cards[pos]) gameState.cards[pos].flipped = false;
  });
  // Also flip any remaining visually-flipped unmatched cards (safety net)
  document.querySelectorAll('.card.flipped:not(.matched)').forEach(el => {
    el.classList.remove('flipped');
    const pos = parseInt(el.dataset.pos);
    if (gameState.cards[pos]) gameState.cards[pos].flipped = false;
  });

  locked = false;
  updateScorebar();
  const current = players[currentIdx];
  if (current.id === myId) {
    setStatus('Trojice se neshoduje. Jsi na řadě!', 'warning');
  } else {
    setStatus(`Trojice se neshoduje. Hraje ${current.name}.`, 'info');
  }
});

socket.on('game-over', ({ players, winner }) => {
  $('winner-title').textContent =
    winner.score === players[0].score && winner.score === players[1].score
      ? 'Remíza!'
      : `Vítěz: ${winner.name}`;

  const scoresHtml = players
    .map(p => `<div class="final-player ${p.id === winner.id ? 'final-winner' : ''}">
      <span class="fp-name">${p.name}</span>
      <span class="fp-score">${p.score} ${p.score === 1 ? 'bod' : p.score < 5 ? 'body' : 'bodů'}</span>
    </div>`)
    .join('');
  $('final-scores').innerHTML = scoresHtml;
  showView('view-gameover');
});

socket.on('player-left', ({ message }) => {
  alert(message);
  location.href = '/';
});

// ─── Game rendering ───────────────────────────────────────────────────────────
function renderGame() {
  const board = $('board');
  board.innerHTML = '';

  gameState.cards.forEach(card => {
    const el = createCardElement(card);
    board.appendChild(el);
  });

  updateScorebar();
  updateRemaining();

  const current = gameState.players[gameState.currentIdx];
  if (current.id === myId) {
    setStatus('Jsi na řadě! Otočte tři karty.', 'info');
  } else {
    setStatus(`Čekej – hraje ${current.name}.`, 'muted');
  }
}

function createCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card' +
    (card.flipped ? ' flipped' : '') +
    (card.matched ? ' matched' : '');
  el.dataset.pos = card.pos;
  el.dataset.set = card.setId;
  el.dataset.type = card.type;

  el.innerHTML = `
    <div class="card-inner">
      <div class="card-back">
        <div class="card-back-pattern"></div>
        <div class="card-back-label">Kladenské<br>Pexetrio</div>
      </div>
      <div class="card-front ${card.type}-card">
        ${renderFront(card)}
      </div>
    </div>`;

  el.addEventListener('click', () => handleCardClick(card.pos));
  return el;
}

function renderFront(card) {
  const data = CARDS_DATA[card.setId];
  if (!data) return '';

  if (card.type === 'flag') {
    return `
      <div class="flag-wrap">
        <img
          src="https://flagcdn.com/w320/${data.flag}.png"
          alt="Vlajka – ${data.name}"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
        />
        <div class="flag-fallback" style="display:none">${data.name}</div>
      </div>
      <div class="card-label">Vlajka</div>`;
  }

  if (card.type === 'outline') {
    return `
      <div class="outline-wrap">
        <svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-label="Obrys státu ${data.name}">
          <path d="${data.outline}" class="outline-path"/>
        </svg>
      </div>
      <div class="card-label">Obrys státu</div>`;
  }

  // street
  return `
    <div class="street-wrap">
      <div class="street-pole"></div>
      <div class="street-board">
        <div class="street-prefix">ul.</div>
        <div class="street-name">${data.street}</div>
      </div>
      <div class="street-sub">Kročehlavy, Kladno</div>
    </div>
    <div class="card-label">Ulice v Kročehlavech</div>`;
}

// ─── Card click ───────────────────────────────────────────────────────────────
function handleCardClick(pos) {
  if (locked) return;
  if (!gameState) return;

  const current = gameState.players[gameState.currentIdx];
  if (current.id !== myId) return;

  const card = gameState.cards[pos];
  if (!card || card.flipped || card.matched) return;

  const flippedCount = gameState.cards.filter(c => c.flipped && !c.matched).length;
  if (flippedCount >= 3) return;

  if (flippedCount === 2) locked = true;

  socket.emit('flip-card', { pos });
}

// ─── Score / status helpers ───────────────────────────────────────────────────
function updateScorebar() {
  const players = gameState.players;
  players.forEach((p, i) => {
    $(`name-p${i}`).textContent = p.name;
    $(`pts-p${i}`).textContent = p.score;
    $(`score-p${i}`).classList.toggle('active-player', p.id === players[gameState.currentIdx].id);
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
