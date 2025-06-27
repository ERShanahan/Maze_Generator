// src/pages/index.js

import { useState, useEffect, memo } from 'react';

const DEFAULT_SIZE = 10;
const MIN_SIZE = 4;
const MAX_SIZE = 50;
const DELAY = 0.1;

const NORTH = 1;
const EAST  = 2;
const SOUTH = 4;
const WEST  = 8;

const ALGORITHMS = ['dfs', 'eller', 'wilson'];

const MazeCell = memo(function MazeCell({ mask, isStart, isEnd }) {
  const classes = ['cell'];
  if (mask & NORTH) classes.push('wall-top');
  if (mask & EAST)  classes.push('wall-right');
  if (mask & SOUTH) classes.push('wall-bottom');
  if (mask & WEST)  classes.push('wall-left');
  if (isStart) classes.push('cell-start');
  if (isEnd)   classes.push('cell-end');
  return <div className={classes.join(' ')} />;
});

function createEmptyMaze(n) {
  const grid = new Uint8Array(n * n);
  const full = NORTH | EAST | SOUTH | WEST;
  grid.fill(full);
  return grid;
}

export default function MazePage() {
  const [hiddenSize, setHiddenSize] = useState(DEFAULT_SIZE);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [algorithm, setAlgorithm] = useState(0);
  const [steps, setSteps] = useState([]);
  const [maze, setMaze] = useState(createEmptyMaze(DEFAULT_SIZE));
  const [generating, setGenerating] = useState(false);
  const [startPos, setStartPos]     = useState({ x: 0, y: 0 });
  const [endPos,   setEndPos]       = useState({ x: 0, y: 0 });

  async function fetchMaze() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/maze?type=${ALGORITHMS[algorithm]}&size=${hiddenSize}`);
      const text = await res.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (err) {
        console.error('Invalid JSON from API:', text);
        return;
      }
      if (!res.ok) {
        console.error('API responded with error:', payload.error || payload);
        return;
      }
      // API returns { steps, start, end }
      const newSteps = Array.isArray(payload) ? payload : payload.steps;
      setSteps(newSteps);
      setSize(hiddenSize);
      setMaze(new Uint8Array(newSteps[0]));
      setStartPos(payload.start);
      setEndPos(payload.end);
    } catch (e) {
      console.error('Error fetching maze:', e);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!steps.length) return;
    setGenerating(true);
    let idx = 0;
    const interval = setInterval(() => {
      setMaze(new Uint8Array(steps[idx]));
      idx++;
      if (idx >= steps.length) {
        clearInterval(interval);
        setGenerating(false);
      }
    }, DELAY);
    return () => clearInterval(interval);
  }, [steps]);

  const startIndex = startPos.y * size + startPos.x;
  const endIndex   = endPos.y   * size + endPos.x;

  return (
    <div className="container">
      <div className="controls">
        <button
          className="dim-btn"
          disabled={hiddenSize <= MIN_SIZE || generating}
          onClick={() => setHiddenSize(s => s - 1)}
        >▼</button>
        <span className="dimension-title"> {hiddenSize}×{hiddenSize} </span>
        <button
          className="dim-btn"
          disabled={hiddenSize >= MAX_SIZE || generating}
          onClick={() => setHiddenSize(s => s + 1)}
        >▲</button>
      </div>
      <div className="maze-container" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="algorithm-controls">
          <button
            className="alg-btn"
            disabled={algorithm >= ALGORITHMS.length - 1 || generating}
            onClick={() => setAlgorithm(i => i + 1)}
          >▲</button>
          <div className="alg-label">
            <span>{ALGORITHMS[algorithm]}</span>
          </div>
          <button
            className="alg-btn"
            disabled={algorithm <= 0 || generating}
            onClick={() => setAlgorithm(i => i - 1)}
          >▼</button>
        </div>

        <div className="maze" style={{ '--grid-size': size }}>
          {Array.from({ length: size * size }, (_, idx) => (
            <MazeCell key={idx} mask={maze[idx]} isStart={idx === startIndex} isEnd={idx === endIndex} />
          ))}
        </div>
      </div>

      <button
        className="generate-button"
        onClick={() => !generating && fetchMaze()}
        disabled={generating}
      >
        {generating ? 'Generating' : 'Generate'}
      </button>
    </div>
  );
}
