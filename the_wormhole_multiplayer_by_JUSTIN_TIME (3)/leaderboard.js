/**
 * @tweakable Maximum number of entries to show on the leaderboard
 */
const LEADERBOARD_MAX_ENTRIES = 10;

/**
 * @tweakable Color of initials for top 3 scores (rank 1, 2, 3)
 */
const LEADERBOARD_TOP3_COLORS = ["#ff0", "#ff8", "#ffd700"]; // gold, silver, bronze variant

/**
 * @tweakable Score font size (px)
 */
const LEADERBOARD_SCORE_FONT_SIZE = 18;

/**
 * @tweakable Score entry background color (alternating rows; even, odd)
 */
const LEADERBOARD_ROW_BG_COLORS = ["rgba(0,255,0,0.15)", "rgba(0,255,0,0.05)"];

/**
 * @tweakable Animation for leaderboard appearance (CSS animation name, or empty string for none)
 */
const LEADERBOARD_ANIMATION = "pulse";

/**
 * Show the leaderboard dialog with locally stored scores.
 */
function showLeaderboard() {
  let scores = JSON.parse(localStorage.getItem('highscores') || '[]');
  scores = scores.slice(0, LEADERBOARD_MAX_ENTRIES);

  const board = document.createElement('div');
  board.className = 'leaderboard';

  // Optional: add animation class if set
  if (LEADERBOARD_ANIMATION) {
    board.classList.add(LEADERBOARD_ANIMATION);
  }

  board.innerHTML = `
    <h2>HIGH SCORES</h2>
    <div style="margin:12px 0 18px 0;">
      ${scores.length === 0 ? '<span>No scores yet.</span>' : scores.map((s, i) => `
        <div class="score-entry"
          style="display:flex;justify-content:space-between;align-items:center;font-size:${LEADERBOARD_SCORE_FONT_SIZE}px;
            background:${LEADERBOARD_ROW_BG_COLORS[i%2]};margin-bottom:3px;padding:7px 10px 5px 13px;
            border-radius:6px;">
          <span style="min-width:2.5em;${i<3?`color:${LEADERBOARD_TOP3_COLORS[i]};font-weight:bold;`:''}">
            ${i+1}.
          </span>
          <span style="min-width:3.5em;text-align:center;${i<3?`color:${LEADERBOARD_TOP3_COLORS[i]};font-weight:bold;`:''}">
            ${s.initials}
          </span>
          <span style="min-width:5em;text-align:right;">
            ${s.score}
          </span>
        </div>
      `).join('')}
    </div>
    <button onclick="this.parentElement.remove()" class="control-button" style="margin-top: 10px;">CLOSE</button>
  `;
  document.body.appendChild(board);
}