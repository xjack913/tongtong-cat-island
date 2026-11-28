import assert from 'node:assert/strict';
import test from 'node:test';
import { BLACK, WHITE, PASS, CELLS, STAR_POINTS, groupAt, placeGo } from '../go-rules.js';
import { addMove, catMove, readMatch } from '../go-match.js';
import { GO_LESSONS } from '../go-lessons.js';

function boardOf(black, white) {
  const board = Array(CELLS).fill(0);
  for (const point of black) board[point] = BLACK;
  for (const point of white) board[point] = WHITE;
  return board;
}

const saved = { id: 'test-round-01', cat: 3, moves: [] };
const start = () => readMatch(saved, 100);
const beforeKo = boardOf([32, 42, 50], [31, 39, 41, 49]);

test('at a corner only adjacent empty crossings are liberties', () => {
  assert.deepEqual(new Set(groupAt(boardOf([0], []), 0).breaths), new Set([1, 9]));
});

test('one move counts two strings and wins when the total passes five', () => {
  const match = { ...start(), board: boardOf([30, 32, 38, 42, 48, 50], [39, 41]), captures: [0, 4, 0] };
  const next = addMove(match, 40);
  assert.equal(next.result, 'win');
  assert.equal(next.captures[BLACK], 6);
  assert.equal(next.board[39] + next.board[41], 0);
  assert.equal(addMove(next, PASS).error, 'finished');
});

test('a connected enemy string that touches the new stone twice is only counted once', () => {
  const board = boardOf([20, 30, 36, 39, 46, 47], [29, 37, 38]);
  const next = placeGo(board, 28, BLACK);
  assert.deepEqual(new Set(next.captured), new Set([29, 37, 38]));
  assert.equal(next.captured.length, 3);
});

test('a capture can give the placed stone a liberty where an ordinary move would fall under suicide', () => {
  const board = boardOf([32, 33, 43, 50, 51], [31, 39, 41, 42, 49]);
  const capture = placeGo(board, 40, BLACK);
  assert.deepEqual(new Set(capture.captured), new Set([41, 42]));
  assert.deepEqual(placeGo(capture.board, 41, WHITE, board).captured, [40]);
  const suicide = boardOf([], [31, 39, 41, 49]);
  assert.equal(placeGo(suicide, 40, BLACK).error, 'suicide');
  assert.equal(suicide[40], 0);
});

test('immediate ko recapture is refused and a recapture after alternating elsewhere works', () => {
  const capture = placeGo(beforeKo, 40, BLACK);
  assert.deepEqual(capture.captured, [41]);
  assert.equal(placeGo(capture.board, 41, WHITE, beforeKo).error, 'ko');
  const elsewhereWhite = placeGo(capture.board, 0, WHITE).board;
  const elsewhereBlack = placeGo(elsewhereWhite, 1, BLACK).board;
  assert.deepEqual(placeGo(elsewhereBlack, 41, WHITE, elsewhereWhite).captured, [40]);
});

test('saved replays reconstruct score and refuse occupied points, invalid cats and play after a draw', () => {
  assert.equal(readMatch({ ...saved, moves: [0, 0] }, 100), null);
  assert.equal(readMatch({ ...saved, moves: [81] }, 100), null);
  assert.equal(readMatch({ ...saved, cat: 100 }, 100), null);
  assert.equal(readMatch({ ...saved, moves: [PASS, PASS, 4] }, 100), null);
  const draw = readMatch({ ...saved, moves: [PASS, PASS] }, 100);
  assert.equal(draw.result, 'draw');
  assert.deepEqual(draw.captures, [0, 0, 0]);
  const replay = readMatch({ ...saved, moves: [1, 0, 9], result: 'loss', captures: [0, 9, 9] }, 100);
  assert.equal(replay.result, '');
  assert.deepEqual(replay.captures, [0, 1, 0]);
});

test('the board has four 3-3 marks and the center star point', () => {
  assert.deepEqual(STAR_POINTS, [20, 24, 40, 56, 60]);
});

test('all demonstrations and 32 different exercises agree with the shared rules', () => {
  for (const lesson of GO_LESSONS) {
    assert.equal(lesson.exercises.length, 8);
    const questions = [lesson.steps, ...lesson.exercises];
    assert.equal(new Set(questions.map(([first]) => first.board.join(''))).size, questions.length);
    for (const steps of questions) for (const step of steps) {
      if (step.selectAll) {
        const group = groupAt(step.board, step.group[0]);
        assert.ok(group.breaths.length > 0);
        assert.deepEqual(new Set(group.breaths), new Set(step.targets));
        assert.deepEqual(new Set(group.stones), new Set(step.group));
        continue;
      }
      for (const point of step.targets) {
        const result = placeGo(step.board, point, step.stone, step.previous);
        assert.equal(result.error, step.expected, lesson.title);
        if (lesson.title === '吃子') assert.ok(result.captured.length > 0);
      }
    }
  }
});

test('the G19 opponent only chooses legal moves, with both colors limited by the same rules', () => {
  let seed = 2;
  const random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 2 ** 32;
  for (let game = 0; game < 100; game++) {
    let match = start();
    while (!match.result) {
      if (match.moves.length % 2 === 0) {
        const choices = match.board.flatMap((stone, i) => !stone && !placeGo(match.board, i, BLACK, match.previous).error ? [i] : []);
        match = addMove(match, choices.length ? choices[Math.floor(random() * choices.length)] : PASS);
      } else {
        match = addMove(match, catMove(match, random));
      }
      assert.equal(match.error, undefined);
      assert.ok(match.moves.length <= 182);
    }
    assert.equal(readMatch(match, 100).result, match.result);
  }
});
