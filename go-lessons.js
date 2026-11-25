import { CELLS, BLACK, WHITE, placeGo } from './go-rules.js';

const middle = 40;
const BREATHS = [31, 39, 41, 49];

function shape(black, white = []) {
  const board = Array(CELLS).fill(0);
  black.forEach((p) => { board[p] = BLACK; });
  white.forEach((p) => { board[p] = WHITE; });
  return board;
}

const koBoard = shape([31, 39, 49], [32, 40, 42, 50]);
const koCapture = placeGo(koBoard, 41, BLACK).board;
const remoteWhite = placeGo(koCapture, 10, WHITE).board;
const remoteBlack = placeGo(remoteWhite, 70, BLACK).board;

export const GO_LESSONS = [
  {
    title: '氣',
    intro: '棋子上下左右緊貼著的空點，叫作「氣」。斜角的空點不算。',
    steps: [{
      board: shape([middle]), targets: BREATHS,
      prompt: '點一個黑子的氣。',
      success: '答對了！四個畫圈的空點，就是這顆黑子的四口氣。',
    }],
  },
  {
    title: '吃子',
    intro: '最後一口氣被堵住，棋子就會被拿離棋盤。連在一起的棋子會一起數氣。',
    steps: [{
      board: shape([31, 39, 49], [middle]), targets: [41], stone: BLACK,
      prompt: '你拿黑子。點白子剩下的最後一口氣。',
      success: '白子已經沒有氣，把它從棋盤上拿起來！',
    }],
  },
  {
    title: '禁著點',
    intro: '如果新下的棋子沒有氣，這一步又吃不到對方的棋子，就不能下。',
    steps: [{
      board: shape([], BREATHS), targets: [middle], stone: BLACK, expected: 'suicide',
      prompt: '你拿黑子。試著點四顆白子包住的中間。',
      success: '這裡是禁著點。下進去沒有氣，也吃不到白子。黑子留在棋盤外。',
    }],
  },
  {
    title: '打劫',
    intro: '如果馬上吃回來會回到剛才一模一樣的棋盤，就要先去別處下一手。',
    steps: [
      {
        board: koBoard, targets: [41], stone: BLACK,
        prompt: '先用黑子，吃掉中間那顆只剩一口氣的白子。',
        success: '你用黑子吃掉了一顆白子。接下來輪到白子。',
      },
      {
        board: koCapture, previous: koBoard, targets: [40], stone: WHITE, expected: 'ko',
        prompt: '現在用白子，試試能不能馬上在原處吃回來。',
        success: '馬上吃回來會回到剛才一樣的棋盤。白子這回合要先下在別處。',
      },
      {
        board: koCapture, targets: [10], stone: WHITE,
        prompt: '先用白子下到左上角有圈的空點。',
        hint: '這一步請點左上角有圈的空點。',
        cue: [10],
        success: '白子下在左上角，老師會示範把黑子下在別處。',
      },
      {
        board: remoteBlack, previous: remoteWhite, targets: [40], stone: WHITE,
        prompt: '黑子也在別處下了一手。現在用白子在中間吃回來。',
        success: '可以吃回來了！這次的棋盤跟剛才不同。',
      },
    ],
  },
];
