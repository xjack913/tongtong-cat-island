import { BLACK, WHITE, PASS, CELLS, neighbors, placeGo } from './go-rules.js';

export const CAT_LEVEL = 'G19';
export const WIN_COINS = 15;
export const CAPTURE_GOAL = 5;

export function addMove(match, point) {
  if (match.result) return { error: 'finished' };
  const color = match.moves.length % 2 === 0 ? BLACK : WHITE;
  const move = placeGo(match.board, point, color, match.previous);
  if (move.error) return move;
  const captures = [...match.captures];
  captures[color] += move.captured.length;
  let result = '';
  if (captures[color] >= CAPTURE_GOAL) result = color === BLACK ? 'win' : 'loss';
  else if (point === PASS && match.moves.at(-1) === PASS) result = 'draw';
  return {
    ...match,
    moves: [...match.moves, point],
    board: move.board,
    previous: match.board,
    captures,
    last: point === PASS ? undefined : point,
    result,
  };
}

// 過手以外的每手會增加盤上一顆棋子或累計提子數。連續過手會結束，
// 所以棋譜只需容許每次落子前各有一次過手，再加上終局的兩手。
const MAX_MOVES = 2 * (CELLS + 2 * (CAPTURE_GOAL - 1) + 1) + 2;

export function readMatch(saved, catCount) {
  if (!saved || typeof saved.id !== 'string' || !/^[a-z0-9-]{12,64}$/i.test(saved.id)
      || !Number.isInteger(saved.cat) || saved.cat < 0 || saved.cat >= catCount
      || !Array.isArray(saved.moves) || saved.moves.length > MAX_MOVES) return null;
  let match = { id: saved.id, cat: saved.cat, moves: [], board: Array(CELLS).fill(0), previous: null, captures: [0, 0, 0], result: '' };
  for (const point of saved.moves) {
    match = addMove(match, point);
    if (match.error) return null;
  }
  return match;
}

// G19 棋力固定。貓貓認得一部分吃子的機會，其餘時候只在附近找合法落點。
export function catMove(match, random = Math.random) {
  const legal = [];
  const captures = [];
  for (const [point, stone] of match.board.entries()) {
    if (stone) continue;
    const move = placeGo(match.board, point, WHITE, match.previous);
    if (move.error) continue;
    legal.push(point);
    if (move.captured.length) captures.push(point);
  }
  if (!legal.length) return PASS;
  const nearby = legal.filter((point) => neighbors(point).some((p) => match.board[p]));
  const choices = captures.length && random() < 0.50 ? captures : nearby.length ? nearby : legal;
  return choices[Math.floor(random() * choices.length)];
}
