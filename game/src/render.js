// Sizzle Line: every pixel the game draws — the kitchen, the food, the chef,
// the order board and the screens. All art is drawn with canvas shapes, so the
// game needs no image files and no network.
import { INGREDIENTS, VIEW, WIN_SERVES } from './config.js';
import { STATIONS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const FLOOR_A = '#c98d5f';
const FLOOR_B = '#bd7f52';
const WALL = '#8a4b2d';
const COUNTER_TOP = '#e8d5b0';
const COUNTER_SIDE = '#7a5230';
const STEEL = '#9aa5ad';
const STEEL_DARK = '#6e7a82';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, align = 'center', weight = '700') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px Trebuchet MS, Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** Draw one ingredient as vector food, sized to fit a box of `size` pixels. */
export function drawFood(ctx, kind, state, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'bun') {
    ctx.fillStyle = state === 'burnt' ? '#3a2a1a' : '#e8b25c';
    roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.5);
    ctx.fill();
    ctx.fillStyle = state === 'burnt' ? '#2a1d10' : '#d99a3d';
    roundRect(ctx, -s, -s * 0.1, s * 2, s * 0.42, s * 0.2);
    ctx.fill();
    if (state !== 'burnt') {
      ctx.fillStyle = '#fff3d6';
      for (const [dx, dy] of [[-s * 0.5, -s * 0.32], [0, -s * 0.42], [s * 0.5, -s * 0.3]]) {
        ctx.beginPath();
        ctx.ellipse(dx, dy, s * 0.1, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#241812' : state === 'cooked' ? '#7a4a28' : '#d98a7a';
    roundRect(ctx, -s, -s * 0.42, s * 2, s * 0.84, s * 0.32);
    ctx.fill();
    if (state === 'cooked') {
      ctx.fillStyle = '#5d3418';
      for (const [dx, dy] of [[-s * 0.55, 0], [0, -s * 0.12], [s * 0.55, s * 0.08]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = state === 'burnt' ? '#4a3410' : '#f7c948';
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.55);
    ctx.lineTo(s, s * 0.55);
    ctx.lineTo(s, -s * 0.25);
    ctx.lineTo(-s, s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9a41f';
    for (const [dx, dy] of [[-s * 0.4, s * 0.3], [s * 0.3, s * 0.3]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = state === 'chopped' ? '#8fd694' : '#5da864';
    ctx.beginPath();
    for (let i = 0; i <= 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const r = s * (i % 2 === 0 ? 1 : 0.72);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a8f52';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, 0);
    ctx.lineTo(s * 0.6, 0);
    ctx.stroke();
  } else if (kind === 'tomato') {
    ctx.fillStyle = state === 'burnt' ? '#4a1a1a' : '#e05252';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state === 'burnt' ? '#331010' : '#f28b82';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e05252';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'onion') {
    ctx.fillStyle = '#efe6f2';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9b7fb0';
    ctx.lineWidth = 2.5;
    for (const r of [0.62, 0.34]) {
      ctx.beginPath();
      ctx.arc(0, 0, s * r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A small progress ring around a station slot (grill / chop). */
function progressRing(ctx, x, y, radius, fraction, colour) {
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
  ctx.stroke();
}

/** The kitchen itself: floor, walls, counters, bins, grill, board, plates, window. */
function drawKitchen(ctx, world) {
  // Tiled floor.
  for (let ty = 0; ty < 8; ty += 1) {
    for (let tx = 0; tx < 13; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(tx * 100, 118 + ty * 86, 100, 86);
    }
  }
  // Back wall and the pass shelf above the floor.
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 108, VIEW.width, 12);
  ctx.fillStyle = '#a85f36';
  ctx.fillRect(0, 0, VIEW.width, 108);

  // Ingredient bins, down the left wall.
  STATIONS.bins.kinds.forEach((kind, index) => {
    const x = STATIONS.bins.x;
    const y = STATIONS.bins.y + index * (STATIONS.bins.h + STATIONS.bins.gap);
    ctx.fillStyle = COUNTER_SIDE;
    roundRect(ctx, x, y, STATIONS.bins.w, STATIONS.bins.h, 10);
    ctx.fill();
    ctx.fillStyle = COUNTER_TOP;
    roundRect(ctx, x + 4, y + 4, STATIONS.bins.w - 8, STATIONS.bins.h - 8, 8);
    ctx.fill();
    drawFood(ctx, kind, 'ready', x + 32, y + STATIONS.bins.h / 2, 42);
    text(ctx, INGREDIENTS[kind].label.toUpperCase(), x + 58, y + STATIONS.bins.h / 2 - 10, 12, '#5a3a22', 'left');
    text(ctx, kind === 'patty' ? 'grill it' : kind === 'bun' || kind === 'cheese' ? 'ready' : 'chop it', x + 58, y + STATIONS.bins.h / 2 + 12, 10, '#8a6a4a', 'left', '400');
  });

  // Grill: two slots with progress rings.
  drawCounter(ctx, STATIONS.grill, 'GRILL', '#3d3d3d');
  world.grill.forEach((item, slot) => {
    const cx = STATIONS.grill.x + 52 + slot * 76;
    const cy = STATIONS.grill.y + 52;
    ctx.fillStyle = '#222';
    roundRect(ctx, cx - 32, cy - 26, 64, 52, 8);
    ctx.fill();
    if (item) {
      drawFood(ctx, 'patty', item.state, cx, cy, 44);
      const fraction = Math.min(1, item.progress / GRILL_SECONDS);
      progressRing(ctx, cx, cy, 34, fraction, item.state === 'burnt' ? '#ff7a6b' : '#ffd34d');
      if (item.state === 'cooked') text(ctx, 'READY', cx, cy + 44, 11, '#ffd34d');
      if (item.state === 'burnt') text(ctx, 'BURNT!', cx, cy + 44, 11, '#ff7a6b');
    }
  });

  // Chopping board: one slot with a progress bar.
  drawCounter(ctx, STATIONS.board, 'CHOP BOARD', '#8a6a3f');
  const board = world.board;
  const bx = STATIONS.board.x + STATIONS.board.w / 2;
  const by = STATIONS.board.y + 52;
  ctx.fillStyle = '#f3e2c0';
  roundRect(ctx, bx - 56, by - 30, 112, 60, 8);
  ctx.fill();
  if (board) {
    drawFood(ctx, board.kind, board.state, bx, by, 44);
    const fraction = Math.min(1, board.progress / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx - 40, by + 34, 80, 8);
    ctx.fillStyle = '#7dc383';
    ctx.fillRect(bx - 40, by + 34, 80 * fraction, 8);
    if (board.state === 'chopped') text(ctx, 'CHOPPED', bx, by + 52, 11, '#7dc383');
  } else {
    text(ctx, 'drop veg here', bx, by, 12, '#a98a5f', 'center', '400');
  }

  // Trash.
  drawCounter(ctx, STATIONS.trash, 'TRASH', '#5a5a5a');
  ctx.fillStyle = '#333';
  roundRect(ctx, STATIONS.trash.x + 58, STATIONS.trash.y + 26, 64, 48, 8);
  ctx.fill();
  text(ctx, 'bin it', STATIONS.trash.x + 90, STATIONS.trash.y + 50, 13, '#bbb', 'center', '400');

  // Plating counter: two white plates with their stacks.
  drawCounter(ctx, STATIONS.plates, 'PLATING', '#b08954');
  world.plates.forEach((plate, index) => {
    const px = STATIONS.plates.x + 84 + index * 220;
    const py = STATIONS.plates.y + 46;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(px, py, 62, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cfcfcf';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, py, 62, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    plate.items.forEach((item, layer) => {
      drawFood(ctx, item.kind, item.state, px, py - 6 - layer * 13, 34);
    });
    if (plate.items.length === 0) text(ctx, `plate ${index + 1}`, px, py, 12, '#a98a5f', 'center', '400');
  });

  // Serve window: a warm hatch with a bell.
  drawCounter(ctx, STATIONS.serve, 'SERVE', '#c96f4a');
  ctx.fillStyle = '#7a3a22';
  roundRect(ctx, STATIONS.serve.x + 18, STATIONS.serve.y + 26, STATIONS.serve.w - 36, 36, 8);
  ctx.fill();
  text(ctx, 'E to serve', STATIONS.serve.x + STATIONS.serve.w / 2, STATIONS.serve.y + 44, 14, '#ffe1c2');
}

/** A labelled counter block. */
function drawCounter(ctx, rect, label, topColour) {
  ctx.fillStyle = COUNTER_SIDE;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.fillStyle = topColour;
  roundRect(ctx, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, rect.x + rect.w / 2 - 52, rect.y - 16, 104, 20, 6);
  ctx.fill();
  text(ctx, label, rect.x + rect.w / 2, rect.y - 6, 11, '#ffe9c9');
}

/** The chef: a round cook with a white toque, an apron, and their carry stack. */
function drawChef(ctx, chef) {
  const { x, y } = chef;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f7fb8';
  ctx.beginPath();
  ctx.arc(x, y + 6, 16, 0, Math.PI);
  ctx.fill();
  ctx.fillRect(x - 16, y + 4, 32, 12);
  // Face.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(x, y - 4, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(x - 5, y - 6, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Toque.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - 8, y - 16, 8, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 16, 8, 0, Math.PI * 2);
  ctx.arc(x, y - 20, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 14, y - 18, 28, 6);
  // Carried ingredients stacked overhead.
  chef.carry.forEach((item, index) => {
    drawFood(ctx, item.kind, item.state, x, y - 40 - index * 16, 30);
  });
}

/** The order board across the top: tickets, timers, and the shift clock. */
function drawOrderBoard(ctx, world) {
  ctx.fillStyle = '#2b1d12';
  ctx.fillRect(0, 0, VIEW.width, 108);
  text(ctx, 'ORDERS', 24, 22, 15, '#ffd34d', 'left');
  world.tickets.forEach((ticket, index) => {
    const x = 110 + index * 188;
    const y = 10;
    const w = 180;
    const h = 88;
    const urgent = ticket.timeLeft < 12;
    ctx.fillStyle = urgent ? '#5a2320' : '#fff8ec';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#ff7a6b' : '#d9c9a8';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    text(ctx, `#${ticket.id} ${ticket.recipe.name.toUpperCase()}`, x + 10, y + 15, 12, urgent ? '#ffb3a7' : '#5a3a22', 'left');
    ticket.recipe.needs.forEach((need, slot) => {
      drawFood(ctx, need.kind, need.state, x + 20 + slot * 30, y + 44, 26);
    });
    const fraction = Math.max(0, ticket.timeLeft / ticket.timeMax);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, x + 10, y + 68, w - 20, 9, 4);
    ctx.fill();
    ctx.fillStyle = urgent ? '#ff7a6b' : fraction > 0.5 ? '#7dc383' : '#f7c948';
    roundRect(ctx, x + 10, y + 68, (w - 20) * fraction, 9, 4);
    ctx.fill();
    text(ctx, `${Math.ceil(ticket.timeLeft)}s`, x + w - 10, y + 15, 12, urgent ? '#ffb3a7' : '#8a6a4a', 'right');
  });
  if (world.tickets.length === 0) {
    text(ctx, 'No tickets — take a breath, chef.', 320, 54, 15, '#c9a97e', 'left', '400');
  }

  // Shift clock and score, top right.
  const seconds = Math.ceil(world.timeLeft);
  const clockColour = seconds <= 15 ? '#ff7a6b' : '#ffd34d';
  text(ctx, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, 1216, 30, 34, clockColour);
  text(ctx, 'SHIFT', 1216, 56, 11, '#c9a97e');
  const barW = 150;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(1141, 66, barW, 8);
  ctx.fillStyle = clockColour;
  ctx.fillRect(1141, 66, barW * (world.timeLeft / 90), 8);
  text(ctx, `SCORE ${world.score}`, 1120, 30, 22, '#fff', 'right');
  if (world.combo > 1) text(ctx, `COMBO x${world.combo}`, 1120, 58, 16, '#ffd34d', 'right');
  text(ctx, `SERVED ${world.served}/${WIN_SERVES}  ·  ${world.levelPacing().label.toUpperCase()}`, 1120, 82, 13, '#c9a97e', 'right');
}

/** Toasts float up from the bottom of the play area. */
function drawToasts(ctx, world) {
  world.toasts.forEach((toast, index) => {
    const alpha = Math.max(0, 1 - toast.age / 2.4);
    ctx.globalAlpha = alpha;
    const y = 660 - index * 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const width = ctx.measureText(toast.text).width + 28;
    roundRect(ctx, VIEW.width / 2 - width / 2, y - 14, width, 28, 14);
    ctx.fill();
    text(ctx, toast.text, VIEW.width / 2, y, 15, toast.colour);
    ctx.globalAlpha = 1;
  });
}

/** The title screen: name, how to play, and a live kitchen behind it. */
function drawTitle(ctx, world) {
  drawKitchen(ctx, world);
  drawChef(ctx, world.chef);
  drawOrderBoard(ctx, world);
  ctx.fillStyle = 'rgba(20,10,5,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SIZZLE LINE', VIEW.width / 2, 250, 84, '#ffd34d');
  text(ctx, 'Rush Hour Kitchen', VIEW.width / 2, 320, 34, '#fff', 'center', '400');
  text(ctx, 'Take tickets. Grill the patties. Chop the veg. Plate it. Serve it before the timer runs out.', VIEW.width / 2, 392, 19, '#ffe9c9', 'center', '400');
  text(ctx, 'WASD / arrows or click to move  ·  E or Space to pick up, cook, chop, plate and serve', VIEW.width / 2, 428, 17, '#c9a97e', 'center', '400');
  text(ctx, 'Serve 6 dishes in 90 seconds to finish the shift. Combos pay more.', VIEW.width / 2, 462, 17, '#c9a97e', 'center', '400');
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 350);
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER or click to start your shift', VIEW.width / 2, 540, 24, '#fff');
  ctx.globalAlpha = 1;
  text(ctx, 'Five recipes on the board — Classic Stack, Cheese Melt, Garden Fresh, The Works, Double Trouble', VIEW.width / 2, 600, 15, '#8a6a4a', 'center', '400');
}

/** The end screen: the shift's numbers and a star rating. */
function drawOver(ctx, world) {
  drawKitchen(ctx, world);
  drawOrderBoard(ctx, world);
  ctx.fillStyle = 'rgba(20,10,5,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, world.won ? 'SHIFT COMPLETE!' : 'SHIFT OVER', VIEW.width / 2, 240, 64, world.won ? '#8fd694' : '#ff7a6b');
  const stars = world.served >= 12 ? 3 : world.served >= 8 ? 2 : world.served >= 5 ? 1 : 0;
  for (let index = 0; index < 3; index += 1) {
    text(ctx, index < stars ? '★' : '☆', VIEW.width / 2 - 52 + index * 52, 310, 44, index < stars ? '#ffd34d' : '#6b5a4a');
  }
  text(ctx, `Score ${world.score}  ·  Dishes served ${world.served}  ·  Best combo x${world.bestCombo}`, VIEW.width / 2, 380, 22, '#fff', 'center', '400');
  text(ctx, `Tickets expired ${world.expired}  ·  Wrong serves ${world.mistakes}`, VIEW.width / 2, 416, 17, '#c9a97e', 'center', '400');
  text(ctx, world.won ? 'The dinner crowd is fed. The kitchen is yours.' : 'The crowd went hungry — the rush beat you this time.', VIEW.width / 2, 462, 18, '#ffe9c9', 'center', '400');
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 350);
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER or click to cook again', VIEW.width / 2, 540, 24, '#fff');
  ctx.globalAlpha = 1;
}

/** Draw one frame for the given screen. */
export function draw(ctx, world, screen) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  if (screen === SCREEN_OVER) {
    drawOver(ctx, world);
    return;
  }
  drawKitchen(ctx, world);
  drawChef(ctx, world.chef);
  drawOrderBoard(ctx, world);
  drawToasts(ctx, world);
}

