import { useState } from 'react';

function Square({ value, onSquareClick }) {
  return (
    <button className="square" onClick={onSquareClick}>
      {value}
    </button>
  );
}

function Board({ squares, status, onSquareClick }) {
  return (
    <>
      <div className="status">{status}</div>
      <div className="board-row">
        <Square value={squares[0]} onSquareClick={() => onSquareClick(0)} />
        <Square value={squares[1]} onSquareClick={() => onSquareClick(1)} />
        <Square value={squares[2]} onSquareClick={() => onSquareClick(2)} />
      </div>
      <div className="board-row">
        <Square value={squares[3]} onSquareClick={() => onSquareClick(3)} />
        <Square value={squares[4]} onSquareClick={() => onSquareClick(4)} />
        <Square value={squares[5]} onSquareClick={() => onSquareClick(5)} />
      </div>
      <div className="board-row">
        <Square value={squares[6]} onSquareClick={() => onSquareClick(6)} />
        <Square value={squares[7]} onSquareClick={() => onSquareClick(7)} />
        <Square value={squares[8]} onSquareClick={() => onSquareClick(8)} />
      </div>
    </>
  );
}

function SwitchPlayerButton({ humanPlayer, disabled, onSwitch }) {
  return (
    <button onClick={onSwitch} disabled={disabled}>
      Switch to Player {otherPlayer(humanPlayer)}
    </button>
  );
}

export default function Game() {
  // Each history entry is the board after one of your actions (a move or a switch)
  // plus the computer's reply.
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  // The side you control. The computer always plays the other side.
  const [humanPlayer, setHumanPlayer] = useState('X');
  const currentSquares = history[currentMove];
  const gameOver = isGameOver(currentSquares);

  function handlePlay(nextSquares) {
    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
  }

  function handleSquareClick(i) {
    if (gameOver || currentSquares[i]) {
      return;
    }
    const nextSquares = currentSquares.slice();
    nextSquares[i] = humanPlayer;

    // The computer answers for the other side, unless your move ended the game.
    if (!isGameOver(nextSquares)) {
      nextSquares[findBestMove(nextSquares, otherPlayer(humanPlayer))] = otherPlayer(humanPlayer);
    }
    handlePlay(nextSquares);
  }

  // The computer makes the best move for your side, then you take over the other side.
  function handleSwitch() {
    if (gameOver) {
      return;
    }
    const nextSquares = currentSquares.slice();
    nextSquares[findBestMove(nextSquares, humanPlayer)] = humanPlayer;
    setHumanPlayer(otherPlayer(humanPlayer));
    handlePlay(nextSquares);
  }

  function jumpTo(nextMove) {
    setCurrentMove(nextMove);
    // After time travel you control whichever side is due to move.
    setHumanPlayer(nextPlayer(history[nextMove]));
  }

  function handleReset() {
    setHistory([Array(9).fill(null)]);
    setCurrentMove(0);
    setHumanPlayer('X');
  }

  const winner = calculateWinner(currentSquares);
  let status;
  if (winner) {
    status = 'Winner: ' + winner;
  } else if (isBoardFull(currentSquares)) {
    status = 'Draw';
  } else {
    status = 'Your move (' + humanPlayer + ')';
  }

  const moves = history.map((squares, move) => {
    let description;
    if (move > 0) {
      description = 'Go to move #' + move;
    } else {
      description = 'Go to game start';
    }
    return (
      <li key={move}>
        <button onClick={() => jumpTo(move)}>{description}</button>
      </li>
    );
  });

  return (
    <div className="game">
      <div className="game-board">
        <Board squares={currentSquares} status={status} onSquareClick={handleSquareClick} />
      </div>
      <div className="game-info">
        <div className="controls">
          <button onClick={handleReset}>Reset</button>
          <SwitchPlayerButton humanPlayer={humanPlayer} disabled={gameOver} onSwitch={handleSwitch} />
        </div>
        <ol>{moves}</ol>
      </div>
    </div>
  );
}

// Matches any win in the 9-character board string (rows, columns, both diagonals).
// Empty squares are written as '-' so every square takes exactly one character.
const re = /^(?:(?:...){0,2}([OX])\1\1|.{0,2}([OX])..\2..\2|([OX])...\3...\3|..([OX]).\4.\4)/g;

export function calculateWinner(squares) {
  const board = squares.map((square) => square ?? '-').join('');
  // The g flag makes re remember where its last match ended, so reset it before each use.
  re.lastIndex = 0;
  const match = re.exec(board);
  if (!match) {
    return null;
  }
  // Exactly one of the four capture groups is filled: the winning player.
  return match[1] || match[2] || match[3] || match[4];
}

function isBoardFull(squares) {
  return squares.every((square) => square !== null);
}

export function isGameOver(squares) {
  return calculateWinner(squares) !== null || isBoardFull(squares);
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

// Scores a board from X's point of view: positive means X wins, negative means O wins, 0 is a draw.
// Faster wins (smaller depth) score higher, so the computer finishes a won game instead of stalling.
export function minimax(board, depth, isMaximizing) {
  const winner = calculateWinner(board);
  if (winner === 'X') {
    return 10 - depth;
  }
  if (winner === 'O') {
    return depth - 10;
  }
  if (isBoardFull(board)) {
    return 0;
  }

  // X is the maximizing player, O the minimizing one.
  let bestScore = isMaximizing ? -Infinity : Infinity;
  const player = isMaximizing ? 'X' : 'O';
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = player;
      const score = minimax(board, depth + 1, !isMaximizing);
      board[i] = null; // undo the move
      bestScore = isMaximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
    }
  }
  return bestScore;
}

// Tries every open square for player and returns the one minimax rates best.
export function findBestMove(squares, player) {
  const board = squares.slice();
  // minimax scores favor X, so flip the sign for O: the highest score is then always best for player.
  const sign = player === 'X' ? 1 : -1;
  let bestMove = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = player;
      const score = sign * minimax(board, 1, player !== 'X');
      board[i] = null; // undo the move
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}
