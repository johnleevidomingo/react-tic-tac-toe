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

// Returns an open square that would win the game for player, or -1 if there is none.
function findWinningMove(squares, player) {
  for (let i = 0; i < squares.length; i++) {
    if (squares[i] === null) {
      const trial = squares.slice();
      trial[i] = player;
      if (calculateWinner(trial) === player) {
        return i;
      }
    }
  }
  return -1;
}

// Center first, then corners, then edges.
const moveOrder = [4, 0, 2, 6, 8, 1, 3, 5, 7];

// Picks player's move: win if possible, otherwise block the opponent, otherwise take the best open square.
export function findBestMove(squares, player) {
  const win = findWinningMove(squares, player);
  if (win !== -1) {
    return win;
  }
  const block = findWinningMove(squares, otherPlayer(player));
  if (block !== -1) {
    return block;
  }
  return moveOrder.find((i) => squares[i] === null);
}
