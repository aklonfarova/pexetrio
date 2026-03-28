/* ═══════════════════════════════════════════════════════════════
   Kladenské Pexetrio – client v2 (fullscreen, satellite photos)
   ═══════════════════════════════════════════════════════════════ */

const socket = io();

// ─── State ────────────────────────────────────────────────────────────────────
let myId      = null;
let myIdx     = null;
let gameState = null;
let locked    = false;
let roomCode  = null;

// ─── Views ────────────────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'view-game') requestAnimationFrame(updateGridLayout);
}

const $ = id => document.getElementById(id);

// ─── URL param ────────────────────────────────────────────────────────────────
(function checkUrlRoom() {
  const code = new URLSearchParams(window.location.search).get('room');
  if (code) $('room-code-input').value = code.toUpperCase();
})();

// ─── Lobby handlers ───────────────────────────────────────────────────────────
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

$('player-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-create').click(); });
$('room-code-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-join').click(); });
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

$('btn-rematch').addEventListener('click', () => { location.href = '/'; });

// ─── Socket events ────────────────────────────────────────────────────────────
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
  const el = document.querySelector(`.card[data-pos="${pos}"]`);
  if (el) el.classList.add('flipped');
});

socket.on('match-found', ({ positions, players, currentIdx }) => {
  gameState.players = players;
  gameState.currentIdx = currentIdx;
  positions.forEach(pos => {
    gameState.cards[pos].matched = true;
    const el = document.querySelector(`.card[data-pos="${pos}"]`);
    if (el) el.classList.add('matched', 'flipped');
  });
  locked = false;
  updateScorebar();
  updateRemaining();
  const cur = players[currentIdx];
  if (cur.id === myId) setStatus('Výborně! Nalezl jsi trojici. Hraješ znovu!', 'success');
  else setStatus(`${cur.name} nalezl trojici a hraje znovu.`, 'info');
});

socket.on('no-match', ({ positions, players, currentIdx }) => {
  if (!gameState) return;
  gameState.players = players;
  gameState.currentIdx = currentIdx;
  (positions || []).forEach(pos => {
    const el = document.querySelector(`.card[data-pos="${pos}"]`);
    if (el) el.classList.remove('flipped');
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
  if (cur.id === myId) setStatus('Trojice se neshoduje. Jsi na řadě!', 'warning');
  else setStatus(`Trojice se neshoduje. Hraje ${cur.name}.`, 'info');
});

socket.on('game-over', ({ players, winner }) => {
  const tied = players[0].score === players[1].score;
  $('winner-title').textContent = tied ? 'Remíza!' : `🏆 ${winner.name}`;
  $('final-scores').innerHTML = players.map(p => `
    <div class="final-player ${!tied && p.id === winner.id ? 'final-winner' : ''}">
      <span class="fp-name">${p.name}</span>
      <span class="fp-score">${p.score} ${p.score === 1 ? 'bod' : p.score < 5 ? 'body' : 'bodů'}</span>
    </div>`).join('');
  showView('view-gameover');
});

socket.on('player-left', ({ message }) => { alert(message); location.href = '/'; });

// ─── Layout: fit all 36 cards in viewport ─────────────────────────────────────
function getGridConfig() {
  const w = window.innerWidth;
  if (w >= 860) return { cols: 9, rows: 4 };
  if (w >= 560) return { cols: 6, rows: 6 };
  return { cols: 4, rows: 9 };
}

function updateGridLayout() {
  const { cols, rows } = getGridConfig();
  const scoreH  = $('scorebar').offsetHeight  || 52;
  const statusH = $('status-bar').offsetHeight || 32;
  const padV = 6;  // total vertical padding
  const padH = 8;  // total horizontal padding

  const availH = window.innerHeight - scoreH - statusH - padV;
  const availW = window.innerWidth - padH;
  const gap = Math.max(3, Math.min(6, Math.floor(availW / 180)));

  let cardH = Math.floor((availH - gap * (rows - 1)) / rows);
  let cardW = Math.floor(cardH * 0.68);

  // Ensure horizontal fit
  const totalW = cardW * cols + gap * (cols - 1);
  if (totalW > availW) {
    cardW = Math.floor((availW - gap * (cols - 1)) / cols);
    cardH = Math.floor(cardW / 0.68);
  }

  // Minimum readability
  cardH = Math.max(cardH, 50);
  cardW = Math.max(cardW, 34);

  const root = document.documentElement;
  root.style.setProperty('--cols',   cols);
  root.style.setProperty('--card-w', cardW + 'px');
  root.style.setProperty('--card-h', cardH + 'px');
  root.style.setProperty('--gap',    gap + 'px');
}

window.addEventListener('resize', () => {
  if ($('view-game').classList.contains('active')) updateGridLayout();
});

// ─── Tile helpers ─────────────────────────────────────────────────────────────
function latLonToEsriTile(lat, lon, zoom) {
  const z = zoom;
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
  const latR = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * Math.pow(2, z));
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
}

// ─── Game rendering ───────────────────────────────────────────────────────────
function renderGame() {
  const board = $('board');
  board.innerHTML = '';
  gameState.cards.forEach(card => board.appendChild(createCardElement(card)));
  updateScorebar();
  updateRemaining();
  const cur = gameState.players[gameState.currentIdx];
  if (cur.id === myId) setStatus('Jsi na řadě! Otočte tři karty.', 'info');
  else setStatus(`Čekej – hraje ${cur.name}.`, 'muted');
}

function createCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched' : '');
  el.dataset.pos  = card.pos;
  el.dataset.set  = card.setId;
  el.dataset.type = card.type;
  el.innerHTML = `
    <div class="card-inner">
      <div class="card-back">
        <div class="card-back-pattern"></div>
        <div class="card-back-logo">Kladenské<br>Pexetrio</div>
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

  // ── FLAG ──
  if (card.type === 'flag') {
    return `
      <div class="flag-wrap">
        <img src="https://flagcdn.com/w320/${data.flag}.png"
             alt="Vlajka – ${data.name}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div class="flag-fallback" style="display:none">${data.name}</div>
      </div>
      <div class="card-label">Vlajka</div>`;
  }

  // ── OUTLINE ──
  if (card.type === 'outline') {
    return `
      <div class="outline-wrap">
        <svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg"
             aria-label="Obrys – ${data.name}">
          <path d="${data.outline}" class="outline-path"/>
        </svg>
      </div>
      <div class="card-label">Obrys státu</div>`;
  }

  // ── STREET (aerial satellite photo via server proxy) ──
  const primarySrc  = `/api/map?lat=${data.lat}&lon=${data.lon}&z=18`;
  const fallbackSrc = latLonToEsriTile(data.lat, data.lon, 17);
  return `
    <div class="street-photo-wrap">
      <img src="${primarySrc}" class="street-photo-img"
           alt="ul. ${data.street}, Kročehlavy" loading="lazy"
           onerror="if(this.src!=='${fallbackSrc}')this.src='${fallbackSrc}'"/>
      <div class="street-photo-overlay">
        <div class="street-sign">ul. ${data.street}</div>
      </div>
    </div>
    <div class="card-label">Kročehlavy, Kladno</div>`;
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
