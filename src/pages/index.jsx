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

const GEN_ALGORITHMS = ['dfs', 'eller', 'wilson'];
const SOL_ALGORITHMS = ['dfs', 'astar', 'djikstra'];

const MazeCell = memo(function MazeCell({ mask, isStart, isEnd, isVisited, isPath }) {
  const classes = ['cell'];
  if (mask & NORTH) classes.push('wall-top');
  if (mask & EAST)  classes.push('wall-right');
  if (mask & SOUTH) classes.push('wall-bottom');
  if (mask & WEST)  classes.push('wall-left');
  if (isStart) classes.push('cell-start');
  if (isEnd)   classes.push('cell-end');
  if (isVisited && !(isStart || isEnd)) classes.push('cell-visited');
  if (isPath && !(isStart || isEnd)) classes.push('cell-path');
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
  const [genAlgorithm, setGenAlgorithm] = useState(0);
  const [solAlgorithm, setSolAlgorithm] = useState(0);
  const [steps, setSteps] = useState([]);
  const [maze, setMaze] = useState(createEmptyMaze(DEFAULT_SIZE));
  const [generating, setGenerating] = useState(false);

  const [startPos, setStartPos]     = useState({ x: 0, y: 0 });
  const [endPos,   setEndPos]       = useState({ x: 0, y: 0 });

  const [visits, setVisits] = useState([]);  // intermediary cells
  const [path,   setPath]   = useState([]);  // final route

  const [visitIndex, setVisitIndex] = useState(0);
  const [pathIndex,  setPathIndex]  = useState(0);

  async function fetchMaze() {
    setGenerating(true);

    setVisits([]);
    setPath([]);
    setVisitIndex(0);
    setPathIndex(0);

    try {
      const res = await fetch(`/api/maze?type=${GEN_ALGORITHMS[genAlgorithm]}&size=${hiddenSize}`);
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

  async function fetchSolve() {
    setGenerating(true);

    setVisits([]);
    setPath([]);
    setVisitIndex(0);
    setPathIndex(0);

    const params = new URLSearchParams({
      type: SOL_ALGORITHMS[solAlgorithm],
      maze:  JSON.stringify(Array.from(maze)),
      start: JSON.stringify([startPos.x, startPos.y]),
      end:   JSON.stringify([endPos.x,   endPos.y  ])
    });

    try {
      const { visits: v, path: p } = await fetch(`/api/solve?${params}`)
        .then(r => r.json());
      setVisits(v);
      setPath(p);
    } catch (e) {
      console.error(e);
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

  useEffect(() => {
    if (!visits.length) return;
    setGenerating(true);
    let i = 0;
    const iv = setInterval(() => {
      setVisitIndex(i => {
        const next = i + 1;
        if (next >= visits.length) {
          clearInterval(iv);
          // once visits done, start path animation
          setPathIndex(0);
          if (!path.length) setGenerating(false);
        }
        return next;
      });
    }, DELAY);
    return () => clearInterval(iv);
  }, [visits]);

  useEffect(() => {
    if (!path.length || visitIndex < visits.length) return;
    setGenerating(true);
    let i = 0;
    const iv = setInterval(() => {
      setPathIndex(i => {
        const next = i + 1;
        if (next >= path.length) {
          clearInterval(iv);
          setGenerating(false);
        }
        return next;
      });
    }, DELAY);
    return () => clearInterval(iv);
  }, [path, visitIndex]);

  const startIndex = startPos.y * size + startPos.x;
  const endIndex   = endPos.y   * size + endPos.x;

  return (
    <div className="container">
      <div className="controls">
        <div className="gen-algorithm-controls">
          <button
            className="alg-btn"
            disabled={genAlgorithm >= GEN_ALGORITHMS.length - 1 || generating}
            onClick={() => setGenAlgorithm(i => i + 1)}
          >▲</button>
          <div className="alg-label">
            <span>{GEN_ALGORITHMS[genAlgorithm]}</span>
          </div>
          <button
            className="alg-btn"
            disabled={genAlgorithm <= 0 || generating}
            onClick={() => setGenAlgorithm(i => i - 1)}
          >▼</button>
        </div>
        <div className="sol-algorithm-controls">
          <button
            className="alg-btn"
            disabled={solAlgorithm >= SOL_ALGORITHMS.length - 1 || generating}
            onClick={() => setSolAlgorithm(i => i + 1)}
          >▲</button>
          <div className="alg-label">
            <span>{SOL_ALGORITHMS[solAlgorithm]}</span>
          </div>
          <button
            className="alg-btn"
            disabled={solAlgorithm <= 0 || generating}
            onClick={() => setSolAlgorithm(i => i - 1)}
          >▼</button>
        </div>
        <div className="size-controls">
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
      </div>
      <div className="maze-container" style={{ display: 'flex', alignItems: 'center' }}>

        <div className="maze" style={{ '--grid-size': size }}>
          {Array.from({ length: size * size }, (_, idx) => {
            const x = idx % size, y = Math.floor(idx/size);
            const visited = visits
              .slice(0, visitIndex)
              .some(([vx,vy]) => vx===x&&vy===y);
            const onPath  = path
              .slice(0, pathIndex)
              .some(([px,py]) => px===x&&py===y);
            return (
              <MazeCell 
                key={idx} 
                mask={maze[idx]} 
                isStart={idx === startIndex} 
                isEnd={idx === endIndex} 
                isVisited={visited} 
                isPath={onPath}
                />
              );
            }
          )}
        </div>
      </div>

      <div className="controls">
        <button
          className="generate-button"
          onClick={() => !generating && fetchMaze()}
          disabled={generating}
        >
          {generating ? 'Generating' : 'Generate'}
        </button>
        <button className="solve-button" onClick={() => !generating && fetchSolve()} disabled={generating || !maze.length}>Solve</button>
      </div>
    </div>
  );
}
