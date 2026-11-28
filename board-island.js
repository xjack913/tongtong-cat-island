import { BOARD_SIZE, CELLS, BLACK, WHITE, PASS, STAR_POINTS, placeGo } from './go-rules.js';
import { CAT_LEVEL, CAPTURE_GOAL, WIN_COINS } from './go-match.js';
import { GO_LESSONS } from './go-lessons.js';

const COLORS = ['空點', '黑子', '白子'];
const ARROW_KEYS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

export function createBoardIsland({ $, el, cats, owned, catIcon, getMatch, startMatch, playMove }) {
  const card = $('board-card');
  const grid = $('board-grid');
  const status = $('board-status');
  let view = 'home';
  let selected = null;
  let lesson = 0;
  let step = 0;
  let exercise = null;
  let answer = null;
  const found = new Set();
  let cursor = Math.floor(CELLS / 2);

  const cells = Array.from({ length: CELLS }, (_, point) => {
    const button = el('button', 'board-point');
    button.type = 'button';
    button.tabIndex = point === cursor ? 0 : -1;
    if (STAR_POINTS.includes(point)) button.classList.add('is-star');
    button.append(el('i'));
    button.addEventListener('focus', () => {
      cells[cursor].tabIndex = -1;
      cursor = point;
      button.tabIndex = 0;
    });
    button.addEventListener('click', () => choosePoint(point));
    return button;
  });
  grid.replaceChildren(...cells);
  grid.addEventListener('keydown', (event) => {
    const delta = ARROW_KEYS[event.key];
    if (!delta) return;
    event.preventDefault();
    const row = Math.min(BOARD_SIZE - 1, Math.max(0, Math.floor(cursor / BOARD_SIZE) + delta[0]));
    const col = Math.min(BOARD_SIZE - 1, Math.max(0, cursor % BOARD_SIZE + delta[1]));
    cells[row * BOARD_SIZE + col].focus();
  });

  function draw(board, { last, cue = [], group = [], selected = [] } = {}) {
    cells.forEach((cell, point) => {
      const stone = board[point];
      cell.dataset.stone = stone;
      cell.classList.toggle('is-last', last === point);
      cell.classList.toggle('is-answer', cue.includes(point));
      cell.classList.toggle('is-target-group', group.includes(point));
      cell.classList.toggle('is-found', selected.includes(point));
      const row = Math.floor(point / BOARD_SIZE) + 1;
      const col = point % BOARD_SIZE + 1;
      const mark = selected.includes(point) ? '，已找到的氣' : group.includes(point) ? '，這串棋' : cue.includes(point) ? '，有圈提示' : '';
      cell.setAttribute('aria-label', '第 ' + row + ' 橫排第 ' + col + ' 直排，' + COLORS[stone] + (STAR_POINTS.includes(point) ? '，星位' : '') + mark);
    });
  }

  function renderCats() {
    const children = owned().map((index) => {
      const item = el('li');
      const button = el('button', 'sticker board-cat');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(selected === index));
      const face = el('span', 'cat-swatch');
      face.style.background = cats[index].coat.body;
      face.innerHTML = catIcon;
      face.setAttribute('aria-hidden', 'true');
      button.append(face, el('span', '', cats[index].name));
      button.addEventListener('click', () => {
        selected = index;
        $('board-pick-error').textContent = '';
        for (const other of $('board-cats').querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === button));
        $('board-start').disabled = false;
      });
      item.append(button);
      return item;
    });
    $('board-cats').replaceChildren(...children);
    $('board-start').disabled = !owned().includes(selected);
  }

  function renderMatch(match) {
    const cat = cats[match.cat].name;
    $('board-caption').textContent = cat + '（' + CAT_LEVEL + '）拿白子，你拿黑子。';
    $('board-hint').textContent = '先累計吃到 ' + CAPTURE_GOAL + ' 顆對手棋子就贏。兩邊連續過手就平手。';
    $('board-score').textContent = '你吃了 ' + match.captures[BLACK] + ' 顆　｜　貓貓吃了 ' + match.captures[WHITE] + ' 顆';
    status.textContent = {
      win: '你贏了！拿到 ' + WIN_COINS + ' 個小魚金幣。',
      loss: cat + '先吃到 ' + CAPTURE_GOAL + ' 顆了！下次再一起玩。',
      draw: '你和' + cat + '都過手了，這一局平手。',
    }[match.result] || (match.moves.at(-1) === PASS ? cat + '過手了，輪到你。' : '輪到你下黑子。');
    $('board-result').hidden = !match.result;
    $('board-turn-actions').hidden = !!match.result;
    draw(match.board, match);
  }

  const lessonButtons = GO_LESSONS.map((topic, index) => {
    const button = el('button', 'sticker', topic.title);
    button.type = 'button';
    button.addEventListener('click', () => openLesson(index));
    return button;
  });
  $('board-lessons').replaceChildren(...lessonButtons);

  function lessonSteps(topic) {
    return exercise === null ? topic.steps : topic.exercises[exercise];
  }

  function progressLabel(topic, steps) {
    const activity = exercise === null ? '示範' : '練習 ' + (exercise + 1) + '／' + topic.exercises.length;
    return steps.length > 1 ? activity + ' · 第 ' + (step + 1) + ' 步' : activity;
  }

  function renderLesson(feedback = '', tone = '') {
    const topic = GO_LESSONS[lesson];
    const steps = lessonSteps(topic);
    const action = steps[step];
    lessonButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === lesson)));
    $('board-progress').textContent = progressLabel(topic, steps);
    $('board-caption').textContent = topic.intro;
    $('board-hint').textContent = action.prompt;
    status.dataset.tone = tone || (answer ? 'correct' : '');
    status.textContent = feedback || (answer ? action.success : '');
    const next = $('board-next');
    next.hidden = !answer;
    const hasStep = step + 1 < steps.length;
    next.textContent = hasStep ? '下一步' : exercise === null ? '開始練習'
      : exercise + 1 < topic.exercises.length ? '下一題' : '再練一輪';
    if (answer && !hasStep && exercise === topic.exercises.length - 1) status.textContent += ' 這一輪的 ' + topic.exercises.length + ' 題都完成了！';
    draw(answer?.board || action.board, { last: answer?.last, cue: answer?.cue || action.cue, group: action.group, selected: [...found] });
  }

  function choosePoint(point) {
    if (view === 'match') {
      const match = getMatch();
      if (!match || match.result) return;
      const error = playMove(match.id, point);
      if (error) status.textContent = error;
      else renderMatch(getMatch());
      return;
    }
    if (view !== 'go' || answer) return;
    const action = lessonSteps(GO_LESSONS[lesson])[step];
    if (found.has(point)) {
      renderLesson('這口氣已經找到囉，找找其他的。');
      return;
    }
    if (!action.targets.includes(point)) {
      renderLesson(action.hint || '再看一下題目，選一個位置試試看。', 'retry');
      return;
    }
    if (action.selectAll) {
      found.add(point);
      if (found.size === action.targets.length) answer = { board: action.board };
      const count = '已找到 ' + found.size + '／' + action.targets.length + ' 口氣。';
      renderLesson(answer ? action.success + ' ' + count : '答對了！' + count, 'correct');
      return;
    }
    const move = action.stone ? placeGo(action.board, point, action.stone, action.previous) : null;
    if (move?.error !== action.expected) {
      renderLesson('這個位置不能這樣下，再試試看。', 'retry');
      return;
    }
    answer = {
      board: move?.board || action.board,
      last: move?.board ? point : undefined,
      cue: action.expected ? [point] : [],
    };
    renderLesson();
  }

  function show(next) {
    view = next;
    $('board-home').hidden = view !== 'home';
    $('board-pick').hidden = view !== 'pick';
    $('board-lessons').hidden = view !== 'go';
    $('board-lesson-actions').hidden = view !== 'go';
    $('board-layout').hidden = view !== 'go' && view !== 'match';
    $('board-result').hidden = true;
    $('board-score').hidden = view !== 'match';
    $('board-progress').hidden = view !== 'go';
    $('board-turn-actions').hidden = true;
    status.dataset.tone = '';
    $('board-title').textContent = { home: '圍棋島', pick: '挑一隻貓貓', match: '來下圍棋', go: '小熊老師的圍棋課（G1）' }[view];
    $('board-play').setAttribute('aria-pressed', String(view === 'pick' || view === 'match'));
    $('board-learn').setAttribute('aria-pressed', String(view === 'go'));
    if (view === 'pick') {
      $('board-pick-error').textContent = '';
      renderCats();
    }
    if (view === 'match') renderMatch(getMatch());
    if (view === 'go') renderLesson();
  }

  function openLesson(index) {
    lesson = index;
    step = 0;
    exercise = null;
    answer = null;
    found.clear();
    show('go');
  }

  function open(which = 'home') {
    card.hidden = false;
    if (which === 'play') show(getMatch() ? 'match' : 'pick');
    else if (which === 'go') openLesson(0);
    else show('home');
    card.scrollTop = 0;
  }

  function begin(cat, errorNode) {
    const error = startMatch(cat);
    if (error) errorNode.textContent = error;
    else show('match');
  }

  $('board-play').addEventListener('click', () => open('play'));
  $('board-learn').addEventListener('click', () => open('go'));
  $('board-start').addEventListener('click', () => begin(selected, $('board-pick-error')));
  $('board-rematch').addEventListener('click', () => begin(getMatch()?.cat, status));
  $('board-change').addEventListener('click', () => {
    selected = null;
    show('pick');
  });
  $('board-retry').addEventListener('click', () => {
    step = 0;
    answer = null;
    found.clear();
    renderLesson();
  });
  $('board-pass').addEventListener('click', () => choosePoint(PASS));
  $('board-next').addEventListener('click', () => {
    if (!answer) return;
    const topic = GO_LESSONS[lesson];
    if (step + 1 < lessonSteps(topic).length) {
      step += 1;
    } else {
      step = 0;
      exercise = exercise === null ? 0 : (exercise + 1) % topic.exercises.length;
    }
    answer = null;
    found.clear();
    renderLesson();
  });

  return { open };
}
