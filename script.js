/* TriStrike — script.js
   - ember removed
   - winning line removed
   - winner popup added
*/

(() => {
  const boardEl = document.getElementById('board');

  const turnEl = document.getElementById('turnPlayer');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreDEl = document.getElementById('scoreD');
  const newRoundBtn = document.getElementById('newRound');
  const resetAllBtn = document.getElementById('resetAll');
  const modeInputs = document.querySelectorAll('input[name="mode"]');
  const playerMarkerSelect = document.getElementById('playerMarker');
  const cpuStartsCheckbox = document.getElementById('cpuStarts');
  const lastGameEl = document.getElementById('lastGame');

  const scoreXLarge = document.getElementById('scoreXLarge');
  const scoreOLarge = document.getElementById('scoreOLarge');
  const scoreDLarge = document.getElementById('scoreDLarge');

  const winnerModal = document.getElementById('winnerModal');
  const winnerMessageEl = document.getElementById('winnerMessage');
  const winnerCloseBtn = document.getElementById('winnerClose');

  const STORAGE_KEY = 'tristrike_ttt_v3';

  let board = Array(9).fill(null);
  let current = 'X';
  let mode = 'pvp';
  let humanMarker = 'X';
  let aiMarker = 'O';
  let scores = { X: 0, O: 0, D: 0 };

  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  /* ------------ Winner popup ------------ */
  function showWinner(message) {
    if (!winnerModal || !winnerMessageEl) return;
    winnerMessageEl.textContent = message;
    winnerModal.classList.add('show');
    winnerModal.setAttribute('aria-hidden', 'false');
  }

  function hideWinner() {
    if (!winnerModal) return;
    winnerModal.classList.remove('show');
    winnerModal.setAttribute('aria-hidden', 'true');
  }

  if (winnerCloseBtn) {
    winnerCloseBtn.addEventListener('click', () => hideWinner());
  }
  if (winnerModal) {
    winnerModal.addEventListener('click', (e) => {
      if (e.target === winnerModal) hideWinner();
    });
  }

  /* ------------ Persistence ------------ */
  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scores,
          last: lastGameEl?.textContent || ''
        })
      );
      window.dispatchEvent(new Event('tristrike.storage'));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.scores) scores = parsed.scores;
      if (parsed.last && lastGameEl) lastGameEl.textContent = parsed.last;
    } catch (e) {
      console.warn('Load failed', e);
    }
  }

  /* ------------ Game logic ------------ */
  function checkWinner(bd) {
    for (const [a,b,c] of lines) {
      if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
        return { winner: bd[a], line: [a,b,c] };
      }
    }
    if (bd.every(Boolean)) return { winner: 'D' };
    return null;
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    const result = checkWinner(board);
    const finished = !!result;

    board.forEach((v, i) => {
      const btn = document.createElement('button');
      btn.className = 'cell' + (v ? ' ' + v.toLowerCase() : '');
      btn.setAttribute('data-index', i);
      btn.setAttribute('aria-label', `Cell ${i+1} ${v ? ('occupied by ' + v) : 'empty'}`);
      btn.disabled = !!v || finished;

      if (v) btn.textContent = v;
      btn.addEventListener('click', onCellClick);
      boardEl.appendChild(btn);
    });
  }

  function updateUI() {
    if (turnEl) turnEl.textContent = current;
    if (scoreXEl) scoreXEl.textContent = scores.X;
    if (scoreOEl) scoreOEl.textContent = scores.O;
    if (scoreDEl) scoreDEl.textContent = scores.D;
    if (scoreXLarge) scoreXLarge.textContent = scores.X;
    if (scoreOLarge) scoreOLarge.textContent = scores.O;
    if (scoreDLarge) scoreDLarge.textContent = scores.D;
    renderBoard();
  }

  function place(idx, mark) {
    // No moves if cell taken or game ended
    if (board[idx]) return false;
    if (checkWinner(board)) return false;

    board[idx] = mark;

    const result = checkWinner(board);
    if (result && result.winner) {
      if (result.winner === 'D') {
        scores.D++;
        if (lastGameEl) lastGameEl.textContent = 'Draw';
        showWinner("It's a Draw");
      } else {
        scores[result.winner]++;
        if (lastGameEl) lastGameEl.textContent = `${result.winner} won`;

        // Decide message
        let msg = `${result.winner} Won`;
        if (mode === 'cpu') {
          if (result.winner === aiMarker) {
            msg = 'Computer Won';
          } else {
            msg = `${result.winner} Won`;
          }
        }
        showWinner(msg);
      }
      saveState();
    }

    current = mark === 'X' ? 'O' : 'X';
    updateUI();
    return true;
  }

  /* ------------ Minimax AI ------------ */
  function minimax(bd, player) {
    const win = checkWinner(bd);
    if (win) {
      if (win.winner === 'X') return { score: 10 };
      if (win.winner === 'O') return { score: -10 };
      return { score: 0 };
    }

    const moves = [];
    bd.forEach((cell, idx) => {
      if (!cell) {
        const copy = bd.slice();
        copy[idx] = player;
        const res = minimax(copy, player === 'X' ? 'O' : 'X');
        moves.push({ idx, score: res.score });
      }
    });

    if (!moves.length) return { score: 0 };

    if (player === 'X') {
      return moves.reduce((best, m) => m.score > best.score ? m : best, moves[0]);
    } else {
      return moves.reduce((best, m) => m.score < best.score ? m : best, moves[0]);
    }
  }

  function aiMove() {
    const ai = aiMarker;

    // first move center if free
    if (board.every(v => !v)) {
      if (!board[4]) { place(4, ai); return; }
    }

    const moves = [];
    board.forEach((cell, idx) => {
      if (!cell) {
        const copy = board.slice();
        copy[idx] = ai;
        const res = minimax(copy, ai === 'X' ? 'O' : 'X');
        moves.push({ idx, score: res.score });
      }
    });
    if (!moves.length) return;

    let best = moves[0];
    if (ai === 'X') {
      best = moves.reduce((b,m)=>m.score>b.score?m:b, moves[0]);
    } else {
      best = moves.reduce((b,m)=>m.score<b.score?m:b, moves[0]);
    }

    place(best.idx, ai);
  }

  /* ------------ Cell click ------------ */
  function onCellClick(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (board[idx] || checkWinner(board)) return;

    if (mode === 'pvp') {
      place(idx, current);
    } else {
      if (current !== humanMarker) return;
      if (!place(idx, humanMarker)) return;
      if (!checkWinner(board) && !board.every(Boolean)) {
        setTimeout(() => aiMove(), 320);
      }
    }
  }

  /* ------------ Control handlers ------------ */
  function newRound() {
    board = Array(9).fill(null);
    hideWinner();

    humanMarker = (playerMarkerSelect?.value === 'O') ? 'O' : 'X';
    aiMarker = humanMarker === 'X' ? 'O' : 'X';
    mode = document.querySelector('input[name="mode"]:checked')?.value || 'pvp';

    if (mode === 'cpu') {
      const cpuStarts = !!(cpuStartsCheckbox && cpuStartsCheckbox.checked);
      if (cpuStarts) {
        current = aiMarker;
        updateUI();
        setTimeout(() => {
          if (!checkWinner(board)) aiMove();
        }, 300);
        return;
      } else {
        current = humanMarker;
      }
    } else {
      current = 'X';
    }
    updateUI();
  }

  function resetAll() {
    if (!confirm('Reset scores and clear last result?')) return;
    scores = { X: 0, O: 0, D: 0 };
    if (lastGameEl) lastGameEl.textContent = '—';
    saveState();
    newRound();
  }

  /* ------------ Keyboard shortcuts ------------ */
  const keyMap = { '1':6,'2':7,'3':8,'4':3,'5':4,'6':5,'7':0,'8':1,'9':2 };

  window.addEventListener('keydown', (e) => {
    if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      newRound();
      return;
    }
    if (e.key.toLowerCase() === 'r') {
      resetAll();
      return;
    }
    if (keyMap[e.key] !== undefined) {
      const idx = keyMap[e.key];
      const btn = boardEl.querySelector(`[data-index="${idx}"]`);
      if (btn && !btn.disabled) btn.click();
    }
  });

  /* ------------ UI wiring ------------ */
  modeInputs.forEach(r => r.addEventListener('change', (ev) => {
    mode = ev.target.value;
    const cpuRow = document.getElementById('cpuStartRow');
    if (cpuRow) cpuRow.style.display = (mode === 'cpu') ? 'flex' : 'none';
    humanMarker = (playerMarkerSelect?.value === 'O') ? 'O' : 'X';
    aiMarker = humanMarker === 'X' ? 'O' : 'X';
    newRound();
  }));

  playerMarkerSelect?.addEventListener('change', () => newRound());
  cpuStartsCheckbox?.addEventListener('change', () => newRound());
  newRoundBtn?.addEventListener('click', (e) => { e.preventDefault(); newRound(); });
  resetAllBtn?.addEventListener('click', (e) => { e.preventDefault(); resetAll(); });

  window.addEventListener('storage', (ev) => {
    if (ev.key === STORAGE_KEY) {
      loadState();
      updateUI();
    }
  });

  window.addEventListener('tristrike.storage', () => {
    loadState();
    updateUI();
  });

  /* ------------ Init ------------ */
  function init() {
    loadState();
    const cpuRow = document.getElementById('cpuStartRow');
    if (cpuRow) cpuRow.style.display = 'none';

    humanMarker = (playerMarkerSelect?.value === 'O') ? 'O' : 'X';
    aiMarker = humanMarker === 'X' ? 'O' : 'X';
    mode = document.querySelector('input[name="mode"]:checked')?.value || 'pvp';

    if (mode === 'cpu' && cpuRow) cpuRow.style.display = 'flex';

    renderBoard();
    updateUI();
    console.info('TriStrike initialized', { mode, humanMarker, aiMarker });
  }

  init();

  // Optional debug handle
  window._tristrike = {
    newRound,
    resetAll,
    getState: () => ({ board: board.slice(), current, scores })
  };
})();
