// src/pages/api/maze.js

// Wall bitflags
const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;

const revMap = {
  [NORTH]: SOUTH,
  [EAST]: WEST,
  [SOUTH]: NORTH,
  [WEST]: EAST,
};

const types = ["dfs", "eller", "wilson"];

// DFS maze generator returning steps
function generateDFS(n) {
  // Initialize grid and visited arrays
  const grid = new Uint8Array(n * n);
  const fullMask = NORTH | EAST | SOUTH | WEST;
  grid.fill(fullMask);
  const visited = new Uint8Array(n * n);

  // Steps: record a snapshot of the grid mask after each carve
  const steps = [];
  steps.push(Array.from(grid)); // initial state

  // Stack for DFS (stores index = y*n + x)
  const stack = [0];
  visited[0] = 1;

  while (stack.length) {
    const idx = stack[stack.length - 1];
    const x = idx % n;
    const y = Math.floor(idx / n);
    const neighbors = [];

    // Collect unvisited neighbors
    if (y > 0 && !visited[idx - n]) neighbors.push([idx - n, NORTH, SOUTH]);
    if (x < n - 1 && !visited[idx + 1]) neighbors.push([idx + 1, EAST, WEST]);
    if (y < n - 1 && !visited[idx + n]) neighbors.push([idx + n, SOUTH, NORTH]);
    if (x > 0 && !visited[idx - 1]) neighbors.push([idx - 1, WEST, EAST]);

    if (neighbors.length) {
      // Choose a random neighbor
      const [nidx, dir, rev] =
        neighbors[Math.floor(Math.random() * neighbors.length)];

      // Remove walls between current cell and neighbor
      grid[idx] &= ~dir;
      grid[nidx] &= ~rev;

      // Mark visited and push to stack
      visited[nidx] = 1;
      stack.push(nidx);

      // Record after carve
      steps.push(Array.from(grid));
    } else {
      // Backtrack
      stack.pop();
    }
  }

  return steps;
}

function generateEllers(n) {
  const grid = new Uint8Array(n * n);
  const fullMask = NORTH | EAST | SOUTH | WEST;
  grid.fill(fullMask);
  const steps = [Array.from(grid)];

  let nextSetId = 1;
  let rowSets = new Array(n).fill(0);

  for (let y = 0; y < n; y++) {
    // Assign sets for current row
    for (let x = 0; x < n; x++) {
      if (rowSets[x] === 0) {
        rowSets[x] = nextSetId++;
      }
    }

    // Step 1: carve right boundaries
    for (let x = 0; x < n - 1; x++) {
      const idx = y * n + x;
      if (rowSets[x] !== rowSets[x + 1] && Math.random() < 0.5) {
        // carve east
        grid[idx] &= ~EAST;
        grid[idx + 1] &= ~WEST;
        const oldSet = rowSets[x + 1];
        const newSet = rowSets[x];
        rowSets = rowSets.map((id) => (id === oldSet ? newSet : id));
        steps.push(Array.from(grid));
      }
    }

    // Step 2: carve down (if not last row)
    if (y < n - 1) {
      const setsMap = {};
      rowSets.forEach((id, x) => {
        if (!setsMap[id]) setsMap[id] = [];
        setsMap[id].push(x);
      });

      const nextRowSets = new Array(n).fill(0);
      Object.values(setsMap).forEach((xs) => {
        // ensure at least one carve down per set
        const carve = xs.filter(() => Math.random() < 0.5);
        if (carve.length === 0) {
          carve.push(xs[Math.floor(Math.random() * xs.length)]);
        }
        carve.forEach((x) => {
          const idx = y * n + x;
          grid[idx] &= ~SOUTH;
          grid[idx + n] &= ~NORTH;
          nextRowSets[x] = rowSets[x];
          steps.push(Array.from(grid));
        });
      });
      rowSets = nextRowSets;
    }

    // Step 3: final row unify
    if (y === n - 1) {
      for (let x = 0; x < n - 1; x++) {
        const idx = y * n + x;
        if (rowSets[x] !== rowSets[x + 1]) {
          grid[idx] &= ~EAST;
          grid[idx + 1] &= ~WEST;
          const oldSet = rowSets[x + 1];
          const newSet = rowSets[x];
          rowSets = rowSets.map((id) => (id === oldSet ? newSet : id));
          steps.push(Array.from(grid));
        }
      }
    }
  }

  return steps;
}

function generateWilson(n) {
  const grid = new Uint8Array(n * n);
  const fullMask = NORTH | EAST | SOUTH | WEST;
  grid.fill(fullMask);
  const steps = [Array.from(grid)];

  // Track in-tree cells
  const inTree = new Array(n * n).fill(false);
  // Initialize with a random start cell
  const first = Math.floor(Math.random() * n * n);
  inTree[first] = true;
  let remaining = n * n - 1;

  // Loop-erased random walks for remaining cells
  while (remaining > 0) {
    // Pick random cell not in tree
    let cell;
    do {
      cell = Math.floor(Math.random() * n * n);
    } while (inTree[cell]);

    const path = [[cell, 0]];
    const position = new Map([[cell, 0]]);

    // Walk until hitting tree
    while (!inTree[cell]) {
      const x = cell % n;
      const y = Math.floor(cell / n);
      const neighbors = [];
      if (y > 0) neighbors.push([cell - n, NORTH]);
      if (x < n - 1) neighbors.push([cell + 1, EAST]);
      if (y < n - 1) neighbors.push([cell + n, SOUTH]);
      if (x > 0) neighbors.push([cell - 1, WEST]);
      const [next, dir] =
        neighbors[Math.floor(Math.random() * neighbors.length)];
      cell = next;
      if (position.has(cell)) {
        const idx = position.get(cell);
        path.splice(idx + 1);
        position.clear();
        path.forEach(([c], i) => position.set(c, i));
      } else {
        position.set(cell, path.length);
        path.push([next, dir]);
      }
    }

    // Carve path into tree
    for (let i = 1; i < path.length; i++) {
      const [c, dir] = path[i];
      const [prev] = path[i - 1];
      grid[prev] &= ~dir;
      grid[c] &= ~revMap[dir];
      inTree[prev] = true;
      remaining--;
      steps.push(Array.from(grid));
    }
  }

  return steps;
}

function generateBST(n) {
  return [];
}

// BFS to find farthest node and distances
function bfs(grid, n, starts) {
  const dist = new Array(n * n).fill(-1);
  const queue = [];
  starts.forEach((i) => {
    dist[i] = 0;
    queue.push(i);
  });

  while (queue.length) {
    const idx = queue.shift();
    const x = idx % n;
    const y = Math.floor(idx / n);
    const d = dist[idx];
    if ((grid[idx] & NORTH) === 0 && dist[idx - n] === -1) {
      dist[idx - n] = d + 1;
      queue.push(idx - n);
    }
    if ((grid[idx] & EAST) === 0 && dist[idx + 1] === -1) {
      dist[idx + 1] = d + 1;
      queue.push(idx + 1);
    }
    if ((grid[idx] & SOUTH) === 0 && dist[idx + n] === -1) {
      dist[idx + n] = d + 1;
      queue.push(idx + n);
    }
    if ((grid[idx] & WEST) === 0 && dist[idx - 1] === -1) {
      dist[idx - 1] = d + 1;
      queue.push(idx - 1);
    }
  }

  return dist;
}

function edgeIndices(n) {
  const edges = [];
  for (let i = 0; i < n; i++) {
    edges.push(i); // top row
    edges.push(i + (n - 1) * n); // bottom row
    edges.push(i * n); // left col
    edges.push(i * n + (n - 1)); // right col
  }
  return Array.from(new Set(edges));
}

function chooseEdgeEndpoints(grid, n) {
  const edges = edgeIndices(n);
  let start = edges[0];
  let end = edges[0];
  let maxDist = -1;

  // For each edge cell as start, compute distances and find farthest edge
  for (const s of edges) {
    const dist = bfs(grid, n, [s]);
    for (const t of edges) {
      if (dist[t] > maxDist) {
        maxDist = dist[t];
        start = s;
        end = t;
      }
    }
  }

  return [start, end];
}

// API handler
export default function handler(req, res) {
  const { type = "dfs", size } = req.query;
  const n = parseInt(size, 10);

  // Validate size
  if (isNaN(n) || n < 4 || n > 50) {
    return res
      .status(400)
      .json({ error: "Size must be an integer between 5 and 50." });
  }
  // Only dfs supported for now
  if (!types.includes(type)) {
    return res
      .status(400)
      .json({ error: `Algorithm type '${type}' not supported.` });
  }

  // Generate and return steps

  let steps;
  if (type === "dfs") {
    steps = generateDFS(n);
  } else if (type === "eller") {
    steps = generateEllers(n);
  } else if (type === "wilson") {
    steps = generateWilson(n);
  }

  // Open entrance/exit on last step edges
  const lastGrid = Uint8Array.from(steps[steps.length - 1]);
  const [startIdx, endIdx] = chooseEdgeEndpoints(lastGrid, n);
  const sx = startIdx % n,
    sy = Math.floor(startIdx / n);
  const ex = endIdx % n,
    ey = Math.floor(endIdx / n);
  // remove outer walls
  if (sy === 0) lastGrid[startIdx] &= ~NORTH;
  else if (sx === 0) lastGrid[startIdx] &= ~WEST;
  else if (sy === n - 1) lastGrid[startIdx] &= ~SOUTH;
  else if (sx === n - 1) lastGrid[startIdx] &= ~EAST;
  if (ey === 0) lastGrid[endIdx] &= ~NORTH;
  else if (ex === 0) lastGrid[endIdx] &= ~WEST;
  else if (ey === n - 1) lastGrid[endIdx] &= ~SOUTH;
  else if (ex === n - 1) lastGrid[endIdx] &= ~EAST;

  steps[steps.length - 1] = Array.from(lastGrid);

  res
    .status(200)
    .json({ steps, start: { x: sx, y: sy }, end: { x: ex, y: ey } });
}
