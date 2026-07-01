// ---------------------------------------------------------------------------
// GAME TYPES
// ---------------------------------------------------------------------------
// A small "list of known games" instead of hard-coding "Golf" everywhere.
// Adding a new game later is just one more entry here plus a matching
// <option> in index.html's <select> (the `id` values must match).
// `mode` picks which play-screen layout to use ("tally" = one-tap buttons,
// "numeric" = type in a point amount each round).
// `winCondition` says how to pick a winner when displaying history:
// "highest" for games like Golf/Rummy where most points wins. A game where
// lowest score wins (e.g. actual golf strokes) could use "lowest" instead.
const GAME_TYPES = [
  { id: "golf", name: "Golf", mode: "tally", winCondition: "highest" },
  { id: "rummy", name: "Rummy", mode: "numeric", winCondition: "highest" },
];

// Suit icons are purely decorative - they cycle through players so the
// tally buttons look like alternating playing cards.
const SUITS = [
  { icon: "♠", colorClass: "suit-black" }, // spade
  { icon: "♥", colorClass: "suit-red" }, // heart
  { icon: "♦", colorClass: "suit-red" }, // diamond
  { icon: "♣", colorClass: "suit-black" }, // club
];

// Key used to save the in-progress game to the browser's localStorage,
// which is just a small key/value store the browser keeps around even
// after you close the tab or refresh the page.
const STORAGE_KEY = "score-keeper-current-game";

// Separate key for the list of *finished* games, so it doesn't get wiped
// out every time the in-progress game is cleared.
const HISTORY_KEY = "score-keeper-history";

// ---------------------------------------------------------------------------
// ELEMENT REFERENCES
// ---------------------------------------------------------------------------
const setupScreen = document.getElementById("setup-screen");
const playScreen = document.getElementById("play-screen");
const historyScreen = document.getElementById("history-screen");
const allScreens = [setupScreen, playScreen, historyScreen];

const gameTypeSelect = document.getElementById("game-type-select");
const playerNameInput = document.getElementById("player-name-input");
const addPlayerButton = document.getElementById("add-player-button");
const playerListEl = document.getElementById("player-list");
const startGameButton = document.getElementById("start-game-button");
const viewHistoryButton = document.getElementById("view-history-button");
const playScreenTitle = document.getElementById("play-screen-title");
const playerScoresEl = document.getElementById("player-scores");
const undoButton = document.getElementById("undo-button");
const endGameButton = document.getElementById("end-game-button");
const historyListEl = document.getElementById("history-list");
const backToSetupButton = document.getElementById("back-to-setup-button");
const clearHistoryButton = document.getElementById("clear-history-button");

const modalOverlay = document.getElementById("modal-overlay");
const modalMessage = document.getElementById("modal-message");
const modalCancelButton = document.getElementById("modal-cancel-button");
const modalConfirmButton = document.getElementById("modal-confirm-button");

// Hides every screen, then shows just the one passed in. Centralizing this
// here (instead of writing hide/show pairs at every button click) means
// adding a fourth screen later won't require touching existing handlers.
function showScreen(screenToShow) {
  allScreens.forEach((screen) => screen.classList.add("hidden"));
  screenToShow.classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// MODAL (stand-in for the browser's built-in alert()/confirm())
// ---------------------------------------------------------------------------
// The browser's native alert()/confirm() dialogs are plain and unstyled -
// this shows the same styled box for both, and just hides the Cancel
// button for a plain one-button notice.
function closeModal() {
  modalOverlay.classList.add("hidden");
}

function showNotice(message) {
  modalMessage.textContent = message;
  modalCancelButton.classList.add("hidden");
  modalConfirmButton.onclick = closeModal;
  modalOverlay.classList.remove("hidden");
}

// `onConfirm` only runs if the user clicks OK, not Cancel - mirrors what
// `if (confirm(message)) { ... }` used to do.
function showConfirm(message, onConfirm) {
  modalMessage.textContent = message;
  modalCancelButton.classList.remove("hidden");
  modalCancelButton.onclick = closeModal;
  modalConfirmButton.onclick = () => {
    closeModal();
    onConfirm();
  };
  modalOverlay.classList.remove("hidden");
}

// Players typed in on the setup screen, before the game has started.
// This is just an in-memory list (not saved yet) - it becomes part of the
// saved game once "Start Game" is clicked.
let playersBeingSetUp = [];

// The game currently being played (or null if we're on the setup screen).
// Shape: { gameTypeId, players: string[], scores: { [name]: number }, pointLog: { player, amount }[] }
// `pointLog` remembers every point change in order (a tally tap is always
// +1, a numeric entry can be any amount), so "Undo" always knows exactly
// what to reverse - whoever was scored last, by however much.
let currentGame = null;

// ---------------------------------------------------------------------------
// SETUP SCREEN
// ---------------------------------------------------------------------------
function renderPlayerList() {
  playerListEl.innerHTML = "";
  playersBeingSetUp.forEach((name, index) => {
    const item = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "✕"; // an "x" character
    removeButton.addEventListener("click", () => {
      playersBeingSetUp.splice(index, 1);
      renderPlayerList();
    });

    item.append(nameSpan, removeButton);
    playerListEl.appendChild(item);
  });
}

addPlayerButton.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) return;

  // Score lookups use the player's name as a key (see startGame below), so
  // two players with the same name would overwrite each other's score.
  const alreadyAdded = playersBeingSetUp.some(
    (existingName) => existingName.toLowerCase() === name.toLowerCase()
  );
  if (alreadyAdded) {
    showNotice("That name has already been added.");
    return;
  }

  playersBeingSetUp.push(name);
  renderPlayerList();
  playerNameInput.value = "";
  playerNameInput.focus();
});

// Let players hit Enter instead of clicking "Add" every time.
playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addPlayerButton.click();
});

startGameButton.addEventListener("click", () => {
  if (playersBeingSetUp.length === 0) {
    showNotice("Add at least one player first.");
    return;
  }

  const gameType = GAME_TYPES.find((g) => g.id === gameTypeSelect.value);

  // Build the fresh game object. Object.fromEntries + map turns the
  // players array into a { name: 0, name: 0, ... } starting-scores object.
  currentGame = {
    gameTypeId: gameType.id,
    players: [...playersBeingSetUp],
    scores: Object.fromEntries(playersBeingSetUp.map((name) => [name, 0])),
    pointLog: [],
  };

  saveGame(currentGame);
  playersBeingSetUp = [];
  playerListEl.innerHTML = "";
  showPlayScreen();
});

// ---------------------------------------------------------------------------
// PLAY SCREEN (tally mode and numeric mode)
// ---------------------------------------------------------------------------
function showPlayScreen() {
  const gameType = GAME_TYPES.find((g) => g.id === currentGame.gameTypeId);
  playScreenTitle.textContent = gameType.name;
  undoButton.textContent =
    gameType.mode === "numeric" ? "Undo Last Entry" : "Undo Last Point";

  showScreen(playScreen);
  renderPlayerScores();
}

// Builds one "player card" per player, in whichever layout the game's mode
// needs. Called whenever the list of players changes (i.e. once, when the
// game starts) - scoring a point only needs to update the score number,
// not rebuild these cards, which is why that lives in updateScoreDisplay().
function renderPlayerScores() {
  const gameType = GAME_TYPES.find((g) => g.id === currentGame.gameTypeId);
  playerScoresEl.innerHTML = "";

  currentGame.players.forEach((name, index) => {
    const suit = SUITS[index % SUITS.length];
    const card =
      gameType.mode === "numeric"
        ? buildNumericPlayerCard(name, suit)
        : buildTallyPlayerCard(name, suit);
    playerScoresEl.appendChild(card);
  });
}

// Tally mode: the whole card is one big tappable button worth +1 point.
function buildTallyPlayerCard(name, suit) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `player-card ${suit.colorClass}`;
  card.dataset.player = name;

  card.innerHTML = `
    <span class="suit">${suit.icon}</span>
    <span class="player-name">${name}</span>
    <span class="player-score">${currentGame.scores[name]}</span>
  `;

  card.addEventListener("click", () => applyPoints(name, 1));
  return card;
}

// Numeric mode: the card just displays the name/score, plus a number input
// and "Add" button so any amount (positive or negative) can be entered.
function buildNumericPlayerCard(name, suit) {
  const card = document.createElement("div");
  card.className = `player-card numeric-card ${suit.colorClass}`;
  card.dataset.player = name;

  card.innerHTML = `
    <span class="suit">${suit.icon}</span>
    <span class="player-name">${name}</span>
    <span class="player-score">${currentGame.scores[name]}</span>
    <div class="score-entry">
      <input type="number" class="score-input" placeholder="+/- points" />
      <button type="button" class="add-score-button">Add</button>
    </div>
  `;

  const input = card.querySelector(".score-input");
  const addButton = card.querySelector(".add-score-button");

  const applyEnteredAmount = () => {
    const amount = parseInt(input.value, 10);
    if (Number.isNaN(amount) || amount === 0) return;
    applyPoints(name, amount);
    input.value = "";
  };

  addButton.addEventListener("click", applyEnteredAmount);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyEnteredAmount();
  });

  return card;
}

// Updates just the number on screen for one player, instead of re-creating
// every card. Re-using existing elements (rather than rebuilding the whole
// list) is a small performance habit worth learning early.
function updateScoreDisplay(name) {
  const card = playerScoresEl.querySelector(`[data-player="${CSS.escape(name)}"]`);
  card.querySelector(".player-score").textContent = currentGame.scores[name];
}

// Shared by both modes: a tally tap always calls this with amount = 1, a
// numeric entry calls it with whatever the player typed in.
function applyPoints(name, amount) {
  currentGame.scores[name] += amount;
  currentGame.pointLog.push({ player: name, amount });
  saveGame(currentGame);
  updateScoreDisplay(name);
}

undoButton.addEventListener("click", () => {
  if (currentGame.pointLog.length === 0) return;

  const lastEntry = currentGame.pointLog.pop();
  currentGame.scores[lastEntry.player] -= lastEntry.amount;
  saveGame(currentGame);
  updateScoreDisplay(lastEntry.player);
});

endGameButton.addEventListener("click", () => {
  showConfirm("End this game and save it to history?", () => {
    addToHistory(currentGame);
    clearGame();
    showScreen(setupScreen);
  });
});

viewHistoryButton.addEventListener("click", () => {
  renderHistory();
  showScreen(historyScreen);
});

backToSetupButton.addEventListener("click", () => {
  showScreen(setupScreen);
});

clearHistoryButton.addEventListener("click", () => {
  showConfirm("Clear all game history? This can't be undone.", () => {
    saveHistory([]);
    renderHistory();
  });
});

// ---------------------------------------------------------------------------
// PERSISTENCE (localStorage)
// ---------------------------------------------------------------------------
// localStorage only stores strings, so objects have to be converted to/from
// JSON text with JSON.stringify / JSON.parse.
function saveGame(game) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}

function clearGame() {
  localStorage.removeItem(STORAGE_KEY);
  currentGame = null;
}

function loadHistory() {
  const saved = localStorage.getItem(HISTORY_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Adds a finished game to the front of the history list (most recent first),
// stamped with the date/time it ended.
function addToHistory(game) {
  const history = loadHistory();
  history.unshift({ ...game, endedAt: new Date().toISOString() });
  saveHistory(history);
}

// ---------------------------------------------------------------------------
// HISTORY SCREEN
// ---------------------------------------------------------------------------
function renderHistory() {
  const history = loadHistory();
  historyListEl.innerHTML = "";

  if (history.length === 0) {
    historyListEl.innerHTML = "<p>No finished games yet.</p>";
    return;
  }

  history.forEach((game) => {
    const gameType = GAME_TYPES.find((g) => g.id === game.gameTypeId);

    // Sort players by score so the winner is always shown first.
    // For "highest" games (Golf) that means descending order.
    const sortDirection = gameType.winCondition === "lowest" ? 1 : -1;
    const rankedPlayers = Object.entries(game.scores).sort(
      (a, b) => (a[1] - b[1]) * sortDirection
    );
    const winningScore = rankedPlayers[0][1];

    const entry = document.createElement("div");
    entry.className = "history-entry";

    const scoreRowsHtml = rankedPlayers
      .map(([name, score]) => {
        const isWinner = score === winningScore;
        return `
          <div class="history-score-row ${isWinner ? "winner" : ""}">
            <span>${isWinner ? "🏆 " : ""}${name}</span>
            <span>${score}</span>
          </div>
        `;
      })
      .join("");

    entry.innerHTML = `
      <div class="history-entry-header">
        <span class="game-name">${gameType.name}</span>
        <span>${new Date(game.endedAt).toLocaleString()}</span>
      </div>
      ${scoreRowsHtml}
    `;

    historyListEl.appendChild(entry);
  });
}

// ---------------------------------------------------------------------------
// STARTUP
// ---------------------------------------------------------------------------
// If a game was already in progress (saved before a refresh or closed tab),
// resume it straight to the play screen instead of showing setup again.
const savedGame = loadGame();
if (savedGame) {
  currentGame = savedGame;
  showPlayScreen();
}
