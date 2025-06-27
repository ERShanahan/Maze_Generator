const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;

const types = ["dfs", "astar", "djikstra"];

function serialize([x, y]) {
  return `${x},${y}`;
}
function deserialize(key) {
  return key.split(",").map(Number);
}

function getNeighbors(maze, [x, y]) {
  const n = Math.floor(Math.sqrt(maze.length));
  const idx = y * n + x;
  const cell = maze[idx];
  const neighbors = [];

  // Up
  if (!(cell & NORTH) && y > 0) {
    neighbors.push([x, y - 1]);
  }
  // Right
  if (!(cell & EAST) && x < n - 1) {
    neighbors.push([x + 1, y]);
  }
  // Down
  if (!(cell & SOUTH) && y < n - 1) {
    neighbors.push([x, y + 1]);
  }
  // Left
  if (!(cell & WEST) && x > 0) {
    neighbors.push([x - 1, y]);
  }

  return neighbors;
}

function solveDFS(maze, start, end) {
  const stack = [{ pos: start, path: [start] }];
  const visited = new Set([serialize(start)]);
  const visits = [];

  while (stack.length) {
    const { pos, path } = stack.pop();
    const [x, y] = pos;
    visits.push(pos);

    // Found the exit!
    if (x === end[0] && y === end[1]) {
      return { path, visits };
    }

    for (const neighbor of getNeighbors(maze, pos)) {
      const key = serialize(neighbor);
      if (!visited.has(key)) {
        visited.add(key);
        stack.push({
          pos: neighbor,
          path: path.concat([neighbor]),
        });
      }
    }
  }

  // No path found
  return {};
}

function heuristic([x1, y1], [x2, y2]) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function solveAStar(maze, start, end) {
  const startKey = serialize(start);
  const endKey = serialize(end);

  // gScore = cost from start → node
  const gScore = { [startKey]: 0 };
  // fScore = gScore + heuristic → node
  const fScore = { [startKey]: heuristic(start, end) };

  // A simple priority queue: array of keys, sorted by fScore
  const openSet = new Set([startKey]);
  const openArr = [startKey];

  const cameFrom = {};
  const visits = [];

  while (openArr.length) {
    // pop the node with lowest fScore
    openArr.sort((a, b) => fScore[a] - fScore[b]);
    const currentKey = openArr.shift();
    openSet.delete(currentKey);

    const current = deserialize(currentKey);
    visits.push(current);

    if (currentKey === endKey) {
      // reconstruct path
      const path = [];
      let k = endKey;
      while (k) {
        path.push(deserialize(k));
        if (k === startKey) break;
        k = cameFrom[k];
      }
      return { path: path.reverse(), visits };
    }

    for (const nbr of getNeighbors(maze, current)) {
      const nbrKey = serialize(nbr);
      const tentativeG = gScore[currentKey] + 1;

      if (tentativeG < (gScore[nbrKey] ?? Infinity)) {
        cameFrom[nbrKey] = currentKey;
        gScore[nbrKey] = tentativeG;
        fScore[nbrKey] = tentativeG + heuristic(nbr, end);

        if (!openSet.has(nbrKey)) {
          openSet.add(nbrKey);
          openArr.push(nbrKey);
        }
      }
    }
  }

  // no path found
  return {};
}

function solveDijkstra(maze, start, end) {
  const startKey = serialize(start);
  const endKey = serialize(end);

  // dist = cost from start → node
  const dist = { [startKey]: 0 };

  const openSet = new Set([startKey]);
  const openArr = [startKey];

  const cameFrom = {};
  const visits = [];

  while (openArr.length) {
    // pick node with smallest dist[]
    openArr.sort((a, b) => dist[a] - dist[b]);
    const currentKey = openArr.shift();
    openSet.delete(currentKey);

    const current = deserialize(currentKey);
    visits.push(current);

    if (currentKey === endKey) {
      // reconstruct path
      const path = [];
      let k = endKey;
      while (k) {
        path.push(deserialize(k));
        if (k === startKey) break;
        k = cameFrom[k];
      }
      return { path: path.reverse(), visits };
    }

    for (const nbr of getNeighbors(maze, current)) {
      const nbrKey = serialize(nbr);
      const tentativeDist = dist[currentKey] + 1;

      if (tentativeDist < (dist[nbrKey] ?? Infinity)) {
        cameFrom[nbrKey] = currentKey;
        dist[nbrKey] = tentativeDist;

        if (!openSet.has(nbrKey)) {
          openSet.add(nbrKey);
          openArr.push(nbrKey);
        }
      }
    }
  }

  return {};
}

export default function handler(req, res) {
  const { type = "dfs", maze, start, end } = req.query;

  // 1) Algorithm type check
  if (!types.includes(type)) {
    return res
      .status(400)
      .json({ error: `Algorithm type '${type}' not supported.` });
  }

  let mazeArr, startCoord, endCoord;

  // 2) Parse & type-check the maze
  try {
    const raw = JSON.parse(maze);
    if (!Array.isArray(raw) || !raw.every((n) => Number.isInteger(n))) {
      throw new Error();
    }
    mazeArr = new Uint8Array(raw);
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Invalid 'maze'—expect JSON array of integers." });
  }

  // 3) Parse & type-check start
  try {
    const raw = JSON.parse(start);
    if (
      !Array.isArray(raw) ||
      raw.length !== 2 ||
      !raw.every((n) => Number.isInteger(n))
    ) {
      throw new Error();
    }
    startCoord = raw;
  } catch {
    return res
      .status(400)
      .json({ error: "Invalid 'start'—expect JSON [x, y] of integers." });
  }

  // 4) Parse & type-check end
  try {
    const raw = JSON.parse(end);
    if (
      !Array.isArray(raw) ||
      raw.length !== 2 ||
      !raw.every((n) => Number.isInteger(n))
    ) {
      throw new Error();
    }
    endCoord = raw;
  } catch {
    return res
      .status(400)
      .json({ error: "Invalid 'end'—expect JSON [x, y] of integers." });
  }

  // 5) Solve
  let solution = {};
  if (type === "dfs") {
    solution = solveDFS(mazeArr, startCoord, endCoord);
  } else if (type === "astar") {
    solution = solveAStar(mazeArr, startCoord, endCoord);
  } else if (type === "djikstra") {
    solution = solveDijkstra(mazeArr, startCoord, endCoord);
  }

  return res.status(200).json({
    start: startCoord,
    end: endCoord,
    path: solution.path,
    visits: solution.visits,
  });
}
