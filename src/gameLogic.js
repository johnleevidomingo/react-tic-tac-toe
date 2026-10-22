// Game rules and the computer player for a rows x cols board.
// The board is a flat array read row by row: the square at (row, col) is squares[row * cols + col].
// A player wins with min(rows, cols) of their marks in a row, column or diagonal.

export function createBoard(rows, cols) {
  return Array(rows * cols).fill(null);
}

export function winLength(rows, cols) {
  return Math.min(rows, cols);
}

export function otherPlayer(player) {
  return player === 'X' ? 'O' : 'X';
}

// X always moves first, so it is X's turn whenever both sides have the same number of marks.
export function nextPlayer(squares) {
  const xCount = squares.filter((square) => square === 'X').length;
  const oCount = squares.filter((square) => square === 'O').length;
  return xCount === oCount ? 'X' : 'O';
}

export function isBoardFull(squares) {
  return squares.every((square) => square !== null);
}

// Every run of winLength squares on the board, as lists of indices.
// They depend only on the board size, so each size is worked out once and reused.
const linesCache = new Map();

export function getLines(rows, cols) {
  const key = rows + 'x' + cols;
  if (!linesCache.has(key)) {
    const k = winLength(rows, cols);
    const directions = [
      [0, 1], // across a row
      [1, 0], // down a column
      [1, 1], // diagonal down-right
      [1, -1], // diagonal down-left
    ];
    const lines = [];
    const seen = new Set();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        for (const [dRow, dCol] of directions) {
          const endRow = row + dRow * (k - 1);
          const endCol = col + dCol * (k - 1);
          if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
            continue;
          }
          const line = [];
          for (let step = 0; step < k; step++) {
            line.push((row + dRow * step) * cols + (col + dCol * step));
          }
          // With k = 1 all four directions give the same single square; keep it once.
          const id = line.join(',');
          if (!seen.has(id)) {
            seen.add(id);
            lines.push(line);
          }
        }
      }
    }
    linesCache.set(key, lines);
  }
  return linesCache.get(key);
}

// Loops over every possible winning run instead of using the 3x3 regex.
export function calculateWinner(squares, rows, cols) {
  for (const line of getLines(rows, cols)) {
    const first = squares[line[0]];
    if (first && line.every((i) => squares[i] === first)) {
      return first;
    }
  }
  return null;
}

export function isGameOver(squares, rows, cols) {
  return calculateWinner(squares, rows, cols) !== null || isBoardFull(squares);
}

// ---------- Computer player ----------

// Any win scores far above any heuristic score.
const WIN_SCORE = 1000000;
// Rough cap on positions searched per move, so big boards stay responsive.
const SEARCH_BUDGET = 1000000;

// How promising a position looks, from X's point of view, when the search stops before the game ends.
// Each run that only one player has marks in counts for that player, more so the fuller it is.
function evaluate(board, lines) {
  let score = 0;
  for (const line of lines) {
    let x = 0;
    let o = 0;
    for (const i of line) {
      if (board[i] === 'X') x++;
      else if (board[i] === 'O') o++;
    }
    if (o === 0 && x > 0) score += 3 ** x;
    else if (x === 0 && o > 0) score -= 3 ** o;
  }
  return score;
}

// How many moves ahead to look: the whole game on small boards, fewer moves as the board grows.
function searchDepth(emptyCount) {
  let depth = 0;
  let positions = 1;
  while (depth < emptyCount && positions * (emptyCount - depth) <= SEARCH_BUDGET) {
    positions *= emptyCount - depth;
    depth++;
  }
  return Math.max(depth, 1);
}

// Open squares, nearest the center first. Trying good moves first lets alpha-beta skip more of the tree.
function orderedMoves(board, rows, cols) {
  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;
  const moves = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      moves.push({ i, distance: Math.abs(row - centerRow) + Math.abs(col - centerCol) });
    }
  }
  moves.sort((a, b) => a.distance - b.distance);
  return moves.map((move) => move.i);
}

// Recursive minimax with alpha-beta pruning. Scores are from X's point of view:
// positive means X wins, negative means O wins, 0 is a draw. Faster wins score higher.
// When depth reaches maxDepth the position is scored with evaluate() instead of searched further.
export function minimax(board, depth, isMaximizing, game, alpha = -Infinity, beta = Infinity) {
  const { rows, cols, lines, maxDepth } = game;
  const winner = calculateWinner(board, rows, cols);
  if (winner === 'X') {
    return WIN_SCORE - depth;
  }
  if (winner === 'O') {
    return depth - WIN_SCORE;
  }
  if (isBoardFull(board)) {
    return 0;
  }
  if (depth >= maxDepth) {
    return evaluate(board, lines);
  }

  // X is the maximizing player, O the minimizing one.
  let bestScore = isMaximizing ? -Infinity : Infinity;
  const player = isMaximizing ? 'X' : 'O';
  for (const i of orderedMoves(board, rows, cols)) {
    board[i] = player;
    const score = minimax(board, depth + 1, !isMaximizing, game, alpha, beta);
    board[i] = null; // undo the move
    if (isMaximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) {
      break; // the opponent will never allow this line, so stop looking at it
    }
  }
  return bestScore;
}

// Returns an open square that would win the game for player, or -1 if there is none.
function findWinningMove(board, rows, cols, player) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = player;
      const wins = calculateWinner(board, rows, cols) === player;
      board[i] = null;
      if (wins) {
        return i;
      }
    }
  }
  return -1;
}

// Picks the best open square for player, or -1 if the board is full.
export function findBestMove(squares, rows, cols, player) {
  const board = squares.slice();
  const moves = orderedMoves(board, rows, cols);
  if (moves.length === 0) {
    return -1;
  }

  // Quick checks first: take a win, otherwise block the opponent's.
  const win = findWinningMove(board, rows, cols, player);
  if (win !== -1) {
    return win;
  }
  const block = findWinningMove(board, rows, cols, otherPlayer(player));
  if (block !== -1) {
    return block;
  }

  const game = { rows, cols, lines: getLines(rows, cols), maxDepth: searchDepth(moves.length) };
  // minimax scores favor X, so flip the sign for O: the highest score is then always best for player.
  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const i of moves) {
    board[i] = player;
    // Pass the best score found so far, so moves that can't beat it are cut off early.
    const score =
      player === 'X'
        ? minimax(board, 1, false, game, bestScore, Infinity)
        : -minimax(board, 1, true, game, -Infinity, -bestScore);
    board[i] = null; // undo the move
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}
