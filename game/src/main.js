// Sizzle Line: boot, game loop, screens, and the ?shot= staging used for the
// entry's screenshots. The loop runs on requestAnimationFrame with a fixed
// simulation step so the game plays the same at any frame rate.
import { VIEW } from './config.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { draw, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import {
  EVENT_CHOP_DONE,
  EVENT_EXPIRE,
  EVENT_GRILL_DONE,
  EVENT_OVER,
  EVENT_PICKUP,
  EVENT_PLACE,
  EVENT_RUSH,
  EVENT_SERVE,
  EVENT_WRONG,
} from './world.js';

const STEP = 1 / 60;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const world = new World(seed);
const input = new Input(canvas);
const sound = new Sound();
let screen = SCREEN_TITLE;
let accumulator = 0;
let lastTime = performance.now();

/** Play the sound for each event the world raised this step. */
function playEvents(events) {
  if (events & EVENT_PICKUP) sound.pickup();
  if (events & EVENT_PLACE) sound.place();
  if (events & EVENT_CHOP_DONE) sound.chop();
  if (events & EVENT_GRILL_DONE) sound.grillReady();
  if (events & EVENT_SERVE) sound.serve();
  if (events & (EVENT_WRONG | EVENT_EXPIRE)) sound.wrong();
  if (events & EVENT_RUSH) sound.rush();
}

/** Read the keys and the click target into one world step input. */
function readInput() {
  const { dx, dy } = input.moveVector();
  return { dx, dy, interact: input.takeInteract(), target: input.target };
}

function announce(text) {
  statusLine.textContent = text;
}

function frame(now) {
  const elapsed = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  if (screen === SCREEN_PLAY) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const events = world.step(STEP, readInput());
      playEvents(events);
      if (events & EVENT_OVER) {
        screen = SCREEN_OVER;
        announce(`Shift over. Score ${world.score}, ${world.served} dishes served.`);
        break;
      }
      if (world.timeLeft <= 15 && Math.floor(world.timeLeft) !== Math.floor(world.timeLeft + STEP)) {
        announce(`${Math.ceil(world.timeLeft)} seconds left. Score ${world.score}.`);
      }
    }
    if (input.takeStart()) {
      // Enter during play does nothing; the shift runs its course.
    }
  } else if (input.takeStart()) {
    sound.ensure();
    world.reset();
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Shift started. Take the tickets, cook, plate, serve.');
  }
  draw(ctx, world, screen);
  requestAnimationFrame(frame);
}

// In ?shot= mode the world is staged once and frozen: the screenshot shows
// exactly the frame the rules produced, with no live input.
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  draw(ctx, world, screen);
  document.title = `Sizzle Line — ${shotName} shot`;
} else {
  draw(ctx, world, screen);
  requestAnimationFrame(frame);
}

