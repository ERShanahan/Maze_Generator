const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;

const types = ["dfs"];

function serialize([x, y]) {
  return `${x},${y}`;
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
  }

  return res.status(200).json({
    start: startCoord,
    end: endCoord,
    path: solution.path,
    visits: solution.visits,
  });
}
