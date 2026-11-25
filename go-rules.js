export const BOARD_SIZE = 9;
export const BLACK = 1;
export const WHITE = 2;
export const PASS = -1;
export const CELLS = BOARD_SIZE ** 2;

export function neighbors(index) {
  const adjacent = [];
  if (index >= BOARD_SIZE) adjacent.push(index - BOARD_SIZE);
  if (index < BOARD_SIZE * (BOARD_SIZE - 1)) adjacent.push(index + BOARD_SIZE);
  if (index % BOARD_SIZE > 0) adjacent.push(index - 1);
  if (index % BOARD_SIZE < BOARD_SIZE - 1) adjacent.push(index + 1);
  return adjacent;
}

export function groupAt(board, index) {
  const stone = board[index];
  const group = new Set([index]);
  const breaths = new Set();
  for (const point of group) {
    for (const next of neighbors(point)) {
      if (!board[next]) breaths.add(next);
      else if (board[next] === stone) group.add(next);
    }
  }
  return { stones: [...group], breaths: [...breaths] };
}

// 先提走對方無氣的棋子，再查自己的氣及是否重現上一手之前的盤面。
export function placeGo(board, index, stone, previous = null) {
  if (index === PASS) return { board, captured: [] };
  if (!Number.isInteger(index) || index < 0 || index >= CELLS || board[index]) return { error: 'occupied' };
  const next = [...board];
  next[index] = stone;
  const captured = [];
  for (const point of neighbors(index)) {
    if (!next[point] || next[point] === stone) continue;
    const group = groupAt(next, point);
    if (group.breaths.length) continue;
    captured.push(...group.stones);
    group.stones.forEach((p) => { next[p] = 0; });
  }
  if (!groupAt(next, index).breaths.length) return { error: 'suicide' };
  if (previous && next.every((value, p) => value === previous[p])) return { error: 'ko' };
  return { board: next, captured };
}
