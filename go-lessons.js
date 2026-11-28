import { BOARD_SIZE, CELLS, BLACK, WHITE, groupAt, placeGo } from './go-rules.js';

function shape(black, white = []) {
  const board = Array(CELLS).fill(0);
  black.forEach((point) => { board[point] = BLACK; });
  white.forEach((point) => { board[point] = WHITE; });
  return board;
}

function libertyQuestion(black, white = [], anchor = black[0]) {
  const board = shape(black, white);
  const group = groupAt(board, anchor);
  return [{
    board, targets: group.breaths, group: group.stones, selectAll: true,
    prompt: '把有藍框的黑棋的每一口氣，一個一個點出來。',
    hint: '氣是跟這串黑棋上下左右相連的空點。再找找看。',
    success: '全部找到了！這串黑棋的氣都標出來了。',
  }];
}

function captureQuestion(black, white, point) {
  return [{
    board: shape(black, white), targets: [point], stone: BLACK,
    prompt: '你拿黑子。找到白棋最後一口氣，下在那裡把它吃掉。',
    success: '吃到了！沒有氣的白棋已經從棋盤上拿掉。',
  }];
}

function forbiddenQuestion(white, point) {
  return [{
    board: shape([], white), targets: [point], stone: BLACK, expected: 'suicide',
    prompt: '找一個黑棋下了沒有氣、也吃不到白棋的空點。',
    success: '這個空點是禁著點，黑棋留在棋盤外。',
  }];
}

function koQuestion(row, col, turn = 0) {
  const shift = (dr, dc) => {
    for (let i = 0; i < turn; i++) [dr, dc] = [dc, -dr];
    return (row + dr) * BOARD_SIZE + col + dc;
  };
  const target = shift(0, 0);
  const take = shift(0, 1);
  const board = shape([shift(-1, 0), shift(0, -1), shift(1, 0)],
    [target, shift(-1, 1), shift(0, 2), shift(1, 1)]);
  const captured = placeGo(board, take, BLACK).board;
  const elsewhere = row <= 4 ? 70 : 10;
  const reply = row <= 4 ? 61 : 19;
  const whiteElsewhere = placeGo(captured, elsewhere, WHITE).board;
  const blackElsewhere = placeGo(whiteElsewhere, reply, BLACK).board;
  return [
    {
      board, targets: [take], stone: BLACK,
      prompt: '先用黑棋找出只剩一口氣的白棋，吃掉它。',
      success: '黑棋吃了一顆白棋，現在輪到白棋。',
    },
    {
      board: captured, previous: board, targets: [target], stone: WHITE, expected: 'ko',
      prompt: '白棋試著在剛才被吃掉的位置馬上吃回來。',
      success: '這一步會變回原來的棋盤，打劫時要先去別處下一手。',
    },
    {
      board: captured, targets: [elsewhere], stone: WHITE, cue: [elsewhere],
      prompt: '白棋先下在有圈的空點。',
      hint: '請點有圈的空點，先到別處下一手。',
      success: '白棋下在別處，小熊老師也會示範用黑棋在別處下一手。',
    },
    {
      board: blackElsewhere, previous: whiteElsewhere, targets: [target], stone: WHITE,
      prompt: '黑棋也在別處下了一手。現在用白棋回到原處吃回來。',
      success: '吃回來了！現在的棋盤和原來的棋盤不同。',
    },
  ];
}

const libertyDemo = libertyQuestion([40]);
libertyDemo[0].cue = libertyDemo[0].targets;

const captureDemo = captureQuestion([31, 39, 49], [40], 41);
captureDemo[0].cue = captureDemo[0].targets;

const forbiddenDemo = forbiddenQuestion([31, 39, 41, 49], 40);
forbiddenDemo[0].cue = forbiddenDemo[0].targets;

const koDemo = koQuestion(4, 4);
koDemo[0].cue = koDemo[0].targets;
koDemo[1].cue = koDemo[1].targets;

export const GO_LESSONS = [
  {
    title: '氣',
    intro: '棋子上下左右緊貼著的空點叫作「氣」。連在一起的棋子共用氣。',
    steps: libertyDemo,
    exercises: [
      libertyQuestion([0]), libertyQuestion([5]), libertyQuestion([60]),
      libertyQuestion([40], [31, 39]), libertyQuestion([38, 39]),
      libertyQuestion([8, 17], [7]), libertyQuestion([21, 30, 31], [20, 29, 40]),
      libertyQuestion([54, 63, 64], [55, 65, 72, 73]),
    ],
  },
  {
    title: '吃子',
    intro: '最後一口氣被堵住，整串棋子就會被拿離棋盤。',
    steps: captureDemo,
    exercises: [
      captureQuestion([1], [0], 9), captureQuestion([71], [80], 79),
      captureQuestion([3, 5], [4], 13), captureQuestion([19, 27, 37], [28], 29),
      captureQuestion([22, 23, 30, 33, 40], [31, 32], 41),
      captureQuestion([2, 12, 13], [3, 4], 5),
      captureQuestion([32, 33, 43, 50, 51], [31, 39, 41, 42, 49], 40),
      captureQuestion([30, 32, 38, 42, 48, 50], [39, 41], 40),
    ],
  },
  {
    title: '禁著點',
    intro: '如果新下的棋子沒有氣，這一步又吃不到對方的棋子，就不能下。',
    steps: forbiddenDemo,
    exercises: [
      forbiddenQuestion([1, 9], 0), forbiddenQuestion([7, 17], 8),
      forbiddenQuestion([63, 73], 72), forbiddenQuestion([71, 79], 80),
      forbiddenQuestion([3, 5, 13], 4), forbiddenQuestion([27, 37, 45], 36),
      forbiddenQuestion([55, 63, 65, 73], 64), forbiddenQuestion([15, 23, 25, 33, 45], 24),
    ],
  },
  {
    title: '打劫',
    intro: '如果馬上吃回來會回到剛才一模一樣的棋盤，就要先去別處下一手。',
    steps: koDemo,
    exercises: [
      koQuestion(2, 2), koQuestion(2, 6, 1), koQuestion(6, 6, 2),
      koQuestion(6, 2, 3), koQuestion(2, 4, 2), koQuestion(4, 6, 3),
      koQuestion(6, 4), koQuestion(4, 2, 1),
    ],
  },
];
