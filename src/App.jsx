import { useEffect, useState } from 'react';
import {
  calculateWinner,
  createBoard,
  findBestMove,
  isBoardFull,
  isGameOver,
  nextPlayer,
  otherPlayer,
  winLength,
} from './gameLogic';

const MIN_SIZE = 1;
const MAX_SIZE = 7;
const AUTOPLAY_DELAY_MS = 400;

function Square({ value, onSquareClick }) {
  return (
    <button className="square" onClick={onSquareClick}>
      {value}
    </button>
  );
}

function Board({ squares, rows, cols, status, onSquareClick }) {
  const boardRows = [];
  for (let row = 0; row < rows; row++) {
    const rowSquares = [];
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      rowSquares.push(<Square key={i} value={squares[i]} onSquareClick={() => onSquareClick(i)} />);
    }
    boardRows.push(
      <div key={row} className="board-row">
        {rowSquares}
      </div>
    );
  }
  return (
    <>
      <div className="status">{status}</div>
      {boardRows}
    </>
  );
}

function clampSize(value) {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) {
    return MIN_SIZE;
  }
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, n));
}

// Rows and columns inputs. The board only changes when you press the button.
function BoardSizeForm({ rows, cols, onResize }) {
  const [draftRows, setDraftRows] = useState(String(rows));
  const [draftCols, setDraftCols] = useState(String(cols));

  function handleSubmit(event) {
    event.preventDefault();
    const nextRows = clampSize(draftRows);
    const nextCols = clampSize(draftCols);
    setDraftRows(String(nextRows));
    setDraftCols(String(nextCols));
    onResize(nextRows, nextCols);
  }

  return (
    <form className="size-form" onSubmit={handleSubmit}>
      <label>
        Rows{' '}
        <input
          type="number"
          min={MIN_SIZE}
          max={MAX_SIZE}
          value={draftRows}
          onChange={(event) => setDraftRows(event.target.value)}
        />
      </label>
      <label>
        Columns{' '}
        <input
          type="number"
          min={MIN_SIZE}
          max={MAX_SIZE}
          value={draftCols}
          onChange={(event) => setDraftCols(event.target.value)}
        />
      </label>
      <button type="submit">New board</button>
    </form>
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
  // Each history entry is a board and its size, after one of your actions (a move or a switch)
  // plus the computer's reply, or after one computer move while it plays itself.
  const [history, setHistory] = useState([{ squares: createBoard(3, 3), rows: 3, cols: 3 }]);
  const [currentMove, setCurrentMove] = useState(0);
  // The side you control. The computer always plays the other side.
  const [humanPlayer, setHumanPlayer] = useState('X');
  const [autoPlaying, setAutoPlaying] = useState(false);
  const { squares: currentSquares, rows, cols } = history[currentMove];
  const gameOver = isGameOver(currentSquares, rows, cols);

  function handlePlay(nextSquares) {
    const nextHistory = [...history.slice(0, currentMove + 1), { squares: nextSquares, rows, cols }];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
  }

  function handleSquareClick(i) {
    if (gameOver || autoPlaying || currentSquares[i]) {
      return;
    }
    const nextSquares = currentSquares.slice();
    nextSquares[i] = humanPlayer;

    // The computer answers for the other side, unless your move ended the game.
    if (!isGameOver(nextSquares, rows, cols)) {
      const computer = otherPlayer(humanPlayer);
      nextSquares[findBestMove(nextSquares, rows, cols, computer)] = computer;
    }
    handlePlay(nextSquares);
  }

  // The computer makes the best move for your side, then you take over the other side.
  function handleSwitch() {
    if (gameOver) {
      return;
    }
    const nextSquares = currentSquares.slice();
    nextSquares[findBestMove(nextSquares, rows, cols, humanPlayer)] = humanPlayer;
    setHumanPlayer(otherPlayer(humanPlayer));
    handlePlay(nextSquares);
  }

  // While autoplay is on, the computer makes one move for whoever is next every AUTOPLAY_DELAY_MS.
  useEffect(() => {
    if (!autoPlaying) {
      return;
    }
    if (gameOver) {
      setAutoPlaying(false);
      setHumanPlayer(nextPlayer(currentSquares));
      return;
    }
    const timer = setTimeout(() => {
      const player = nextPlayer(currentSquares);
      const nextSquares = currentSquares.slice();
      nextSquares[findBestMove(nextSquares, rows, cols, player)] = player;
      handlePlay(nextSquares);
    }, AUTOPLAY_DELAY_MS);
    return () => clearTimeout(timer);
  });

  function toggleAutoPlay() {
    if (autoPlaying) {
      // Stopping hands you whichever side is due to move.
      setHumanPlayer(nextPlayer(currentSquares));
    }
    setAutoPlaying(!autoPlaying);
  }

  // Changing the board size starts a new game on the new board.
  function handleResize(nextRows, nextCols) {
    setHistory([{ squares: createBoard(nextRows, nextCols), rows: nextRows, cols: nextCols }]);
    setCurrentMove(0);
    setHumanPlayer('X');
    setAutoPlaying(false);
  }

  function jumpTo(nextMove) {
    setCurrentMove(nextMove);
    setAutoPlaying(false);
    // After time travel you control whichever side is due to move.
    setHumanPlayer(nextPlayer(history[nextMove].squares));
  }

  function handleReset() {
    setHistory([{ squares: createBoard(rows, cols), rows, cols }]);
    setCurrentMove(0);
    setHumanPlayer('X');
    setAutoPlaying(false);
  }

  const winner = calculateWinner(currentSquares, rows, cols);
  let status;
  if (winner) {
    status = 'Winner: ' + winner;
  } else if (isBoardFull(currentSquares)) {
    status = 'Draw';
  } else if (autoPlaying) {
    status = 'Computer is playing ' + nextPlayer(currentSquares);
  } else {
    status = 'Your move (' + humanPlayer + ')';
  }

  const moves = history.map((entry, move) => {
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
        <Board
          squares={currentSquares}
          rows={rows}
          cols={cols}
          status={status}
          onSquareClick={handleSquareClick}
        />
      </div>
      <div className="game-info">
        <BoardSizeForm rows={rows} cols={cols} onResize={handleResize} />
        <p className="rule">
          {rows} × {cols} board: {winLength(rows, cols)} in a row wins.
        </p>
        <div className="controls">
          <button onClick={handleReset}>Reset</button>
          <SwitchPlayerButton
            humanPlayer={humanPlayer}
            disabled={gameOver || autoPlaying}
            onSwitch={handleSwitch}
          />
          <button onClick={toggleAutoPlay} disabled={gameOver && !autoPlaying}>
            {autoPlaying ? 'Stop' : 'Computer plays itself'}
          </button>
        </div>
        <ol>{moves}</ol>
      </div>
    </div>
  );
}
