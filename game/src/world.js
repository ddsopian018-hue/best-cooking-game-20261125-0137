// Sizzle Line: the kitchen world — tickets, stations, cooking, plating, scoring.
// Pure rules, no drawing: render.js draws whatever this state holds, and shots.js
// plays it forward with a scripted chef, so the screenshots are real gameplay.
import {
  BURN_AFTER_SECONDS,
  CHEF,
  CHOP_SECONDS,
  GRILL_SECONDS,
  INGREDIENTS,
  LEVEL_PACING,
  MAX_TICKETS,
  RECIPE_POOL,
  RUSH_AT,
  SHIFT_SECONDS,
  VIEW,
  WIN_SERVES,
  recipeById,
} from './config.js';
import { makeRandom, randomPick } from './random.js';

// Where every station sits. The floor is the open middle; stations hug the walls
// so a straight walk through the centre never clips a counter.
export const STATIONS = {
  bins: {
    x: 24, y: 140, w: 120, h: 76, gap: 10,
    kinds: ['bun', 'patty', 'cheese', 'lettuce', 'tomato', 'onion'],
  },
  grill: { x: 1076, y: 140, w: 180, h: 116, slots: 2, label: 'GRILL' },
  board: { x: 1076, y: 286, w: 180, h: 116, label: 'CHOP BOARD' },
  trash: { x: 1076, y: 440, w: 180, h: 96, label: 'TRASH' },
  plates: { x: 380, y: 640, w: 460, h: 84, label: 'PLATING' },
  serve: { x: 1060, y: 640, w: 196, h: 84, label: 'SERVE' },
};

export const EVENT_PICKUP = 1;
export const EVENT_PLACE = 2;
export const EVENT_CHOP_DONE = 4;
export const EVENT_GRILL_DONE = 8;
export const EVENT_SERVE = 16;
export const EVENT_WRONG = 32;
export const EVENT_EXPIRE = 64;
export const EVENT_OVER = 128;
export const EVENT_RUSH = 256;

/** The point a chef stands at to work a station: in the open floor just outside
 * its edge, never behind another counter, so a walk to it never clips a station. */
export function stationPoint(station, index = 0) {
  if (station === STATIONS.bins) {
    const row = STATIONS.bins.kinds.indexOf(STATIONS.bins.kinds[index]);
    return { x: STATIONS.bins.x + STATIONS.bins.w + 34, y: STATIONS.bins.y + row * (STATIONS.bins.h + STATIONS.bins.gap) + STATIONS.bins.h / 2 };
  }
  if (station === STATIONS.grill) return { x: STATIONS.grill.x - 36, y: STATIONS.grill.y + STATIONS.grill.h / 2 };
  if (station === STATIONS.board) return { x: STATIONS.board.x - 36, y: STATIONS.board.y + STATIONS.board.h / 2 };
  if (station === STATIONS.trash) return { x: STATIONS.trash.x - 36, y: STATIONS.trash.y + STATIONS.trash.h / 2 };
  return { x: station.x + station.w / 2, y: station.y + station.h + 34 };
}

function platePoint(index) {
  const slot = 84 + index * 220;
  return { x: STATIONS.plates.x + slot, y: STATIONS.plates.y + STATIONS.plates.h + 34 };
}

function servePoint() {
  return { x: STATIONS.serve.x + STATIONS.serve.w / 2, y: STATIONS.serve.y + STATIONS.serve.h + 34 };
}

function newItem(kind, state = 'ready') {
  return { kind, state };
}

/** A plate is ready when its stack exactly matches some open ticket. */
export function plateMatchesTicket(plate, tickets) {
  for (const ticket of tickets) {
    if (stackMatches(plate.items, ticket.recipe.needs)) return ticket;
  }
  return null;
}

function stackMatches(items, needs) {
  if (items.length !== needs.length) return false;
  const have = items.map((item) => `${item.kind}:${item.state}`).sort().join('|');
  const want = needs.map((need) => `${need.kind}:${need.state}`).sort().join('|');
  return have === want;
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.random = makeRandom(this.seed);
    this.elapsed = 0;
    this.timeLeft = SHIFT_SECONDS;
    this.level = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.mistakes = 0;
    this.expired = 0;
    this.over = false;
    this.won = false;
    this.nextTicketId = 1;
    this.spawnIn = 2.5;
    this.chef = { x: 640, y: 430, carry: [] };
    this.grill = [null, null];
    this.board = null;
    this.plates = [{ items: [] }, { items: [] }];
    this.tickets = [];
    this.toasts = [];
    this.rushShown = false;
    this.spawnTicket();
  }

  levelPacing() {
    return LEVEL_PACING[this.level];
  }

  /** Deal a new ticket from the current level's recipe pool. */
  spawnTicket() {
    const pacing = this.levelPacing();
    const pool = RECIPE_POOL[this.level];
    const recipe = recipeById(randomPick(this.random, pool));
    const seconds = pacing.ticketSeconds * (0.9 + this.random() * 0.2);
    this.tickets.push({
      id: this.nextTicketId,
      recipe,
      timeLeft: seconds,
      timeMax: seconds,
    });
    this.nextTicketId += 1;
  }

  addToast(text, colour = '#fff') {
    this.toasts.push({ text, colour, age: 0 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  /** One fixed simulation step. `act` is {dx, dy, interact, target}. */
  step(dt, act) {
    if (this.over) return 0;
    let events = 0;
    this.elapsed += dt;
    this.timeLeft = Math.max(0, SHIFT_SECONDS - this.elapsed);

    // Rush levels arrive at 30s and 60s.
    const level = this.elapsed >= RUSH_AT[1] ? 2 : this.elapsed >= RUSH_AT[0] ? 1 : 0;
    if (level !== this.level) {
      this.level = level;
      events |= EVENT_RUSH;
      this.addToast(`${this.levelPacing().label.toUpperCase()}! Orders come faster!`, '#ffd34d');
    }

    // Ticket timers tick; an expired ticket breaks the combo.
    for (const ticket of this.tickets) ticket.timeLeft -= dt;
    const expiredTicket = this.tickets.find((ticket) => ticket.timeLeft <= 0);
    if (expiredTicket) {
      this.tickets = this.tickets.filter((ticket) => ticket !== expiredTicket);
      this.expired += 1;
      this.combo = 0;
      events |= EVENT_EXPIRE;
      this.addToast(`${expiredTicket.recipe.name} ticket expired!`, '#ff7a6b');
    }

    // New tickets arrive on the level's schedule.
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.tickets.length < MAX_TICKETS) {
      this.spawnTicket();
      this.spawnIn = this.levelPacing().spawnEvery * (0.85 + this.random() * 0.3);
    }

    // The grill cooks, then burns. The board chops.
    for (let slot = 0; slot < this.grill.length; slot += 1) {
      const item = this.grill[slot];
      if (!item) continue;
      item.progress += dt;
      if (item.state === 'raw' && item.progress >= GRILL_SECONDS) {
        item.state = 'cooked';
        events |= EVENT_GRILL_DONE;
      } else if (item.state === 'cooked' && item.progress >= GRILL_SECONDS + BURN_AFTER_SECONDS) {
        item.state = 'burnt';
        this.addToast('A patty burnt on the grill!', '#ff7a6b');
      }
    }
    if (this.board) {
      this.board.progress += dt;
      if (this.board.state === 'raw' && this.board.progress >= CHOP_SECONDS) {
        this.board.state = 'chopped';
        events |= EVENT_CHOP_DONE;
      }
    }

    // Toasts fade.
    for (const toast of this.toasts) toast.age += dt;
    this.toasts = this.toasts.filter((toast) => toast.age < 2.4);

    this.moveChef(dt, act);
    if (act.interact) events |= this.interact();

    if (this.timeLeft <= 0) {
      this.over = true;
      this.won = this.served >= WIN_SERVES;
      events |= EVENT_OVER;
    }
    return events;
  }

  moveChef(dt, act) {
    let dx = act.dx || 0;
    let dy = act.dy || 0;
    if (act.target) {
      const tx = act.target.x - this.chef.x;
      const ty = act.target.y - this.chef.y;
      const dist = Math.hypot(tx, ty);
      if (dist > 6) {
        dx = tx / dist;
        dy = ty / dist;
      }
    }
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
    }
    const nextX = this.chef.x + dx * CHEF.speed * dt;
    const nextY = this.chef.y + dy * CHEF.speed * dt;
    // Slide along counters: try the full step, then each axis alone.
    if (!this.hitsStation(nextX, nextY)) {
      this.chef.x = nextX;
      this.chef.y = nextY;
    } else if (!this.hitsStation(nextX, this.chef.y)) {
      this.chef.x = nextX;
    } else if (!this.hitsStation(this.chef.x, nextY)) {
      this.chef.y = nextY;
    }
  }

  /** True when a chef circle at (x, y) overlaps any station counter. */
  hitsStation(x, y) {
    const r = CHEF.radius;
    const rects = [
      { x: STATIONS.bins.x, y: STATIONS.bins.y, w: STATIONS.bins.w, h: 6 * STATIONS.bins.h + 5 * STATIONS.bins.gap },
      STATIONS.grill,
      STATIONS.board,
      STATIONS.trash,
      STATIONS.plates,
      STATIONS.serve,
    ];
    for (const rect of rects) {
      const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
      const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
      if (Math.hypot(x - cx, y - cy) < r) return true;
    }
    // The order board rail across the top is out of reach too.
    if (y - r < 118) return true;
    if (x - r < 8 || x + r > VIEW.width - 8 || y + r > VIEW.height - 8) return true;
    return false;
  }

  /** The nearest station the chef can reach from where they stand. */
  nearestStation() {
    const chef = this.chef;
    let best = null;
    let bestDist = 86;
    const consider = (name, point, extra = {}) => {
      const dist = Math.hypot(chef.x - point.x, chef.y - point.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { name, point, ...extra };
      }
    };
    STATIONS.bins.kinds.forEach((kind, index) => {
      consider('bin', stationPoint(STATIONS.bins, index), { kind });
    });
    consider('grill', stationPoint(STATIONS.grill));
    consider('board', stationPoint(STATIONS.board));
    consider('trash', stationPoint(STATIONS.trash));
    this.plates.forEach((plate, index) => consider('plates', platePoint(index), { plateIndex: index }));
    consider('serve', servePoint());
    return best;
  }

  interact() {
    const station = this.nearestStation();
    if (!station) return 0;
    const chef = this.chef;
    if (station.name === 'bin') {
      if (chef.carry.length >= CHEF.maxCarry) {
        this.addToast('Hands full!', '#ffd34d');
        return 0;
      }
      chef.carry.push(newItem(station.kind, 'ready'));
      return EVENT_PICKUP;
    }
    if (station.name === 'grill') {
      const rawPatty = chef.carry.findIndex((item) => item.kind === 'patty' && item.state === 'ready');
      const freeSlot = this.grill.findIndex((slot) => slot === null);
      if (rawPatty !== -1 && freeSlot !== -1) {
        const patty = chef.carry.splice(rawPatty, 1)[0];
        patty.state = 'raw';
        patty.progress = 0;
        this.grill[freeSlot] = patty;
        return EVENT_PLACE;
      }
      // Pick up a cooked patty first; a raw one can be taken back too.
      const readySlot = this.grill.findIndex((slot) => slot && slot.state !== 'raw');
      const anySlot = readySlot !== -1 ? readySlot : this.grill.findIndex((slot) => slot);
      if (anySlot !== -1 && chef.carry.length < CHEF.maxCarry) {
        const patty = this.grill[anySlot];
        this.grill[anySlot] = null;
        patty.state = patty.state === 'raw' ? 'ready' : patty.state;
        chef.carry.push(patty);
        return EVENT_PICKUP;
      }
      return 0;
    }
    if (station.name === 'board') {
      const rawVeg = chef.carry.findIndex(
        (item) => (item.kind === 'lettuce' || item.kind === 'tomato' || item.kind === 'onion') && item.state === 'ready',
      );
      if (rawVeg !== -1 && !this.board) {
        const veg = chef.carry.splice(rawVeg, 1)[0];
        veg.state = 'raw';
        veg.progress = 0;
        this.board = veg;
        return EVENT_PLACE;
      }
      // Take the veg back, chopped or still raw, so a wrong veg can be fixed.
      if (this.board && chef.carry.length < CHEF.maxCarry) {
        const veg = this.board;
        this.board = null;
        veg.state = veg.state === 'chopped' ? 'chopped' : 'ready';
        chef.carry.push(veg);
        return EVENT_PICKUP;
      }
      return 0;
    }
    if (station.name === 'plates') {
      const plate = this.plates[station.plateIndex];
      // Empty hands at a plated dish take the top item back off the plate.
      if (chef.carry.length === 0 && plate.items.length > 0) {
        chef.carry.push(plate.items.pop());
        return EVENT_PICKUP;
      }
      if (chef.carry.length === 0 || plate.items.length >= 6) return 0;
      plate.items.push(chef.carry.pop());
      return EVENT_PLACE;
    }
    if (station.name === 'serve') {
      return this.servePlate();
    }
    if (station.name === 'trash') {
      if (chef.carry.length === 0) return 0;
      chef.carry.pop();
      return EVENT_PLACE;
    }
    return 0;
  }

  /** Serve the first plate that matches an open ticket. */
  servePlate() {
    for (const plate of this.plates) {
      const ticket = plateMatchesTicket(plate, this.tickets);
      if (!ticket) continue;
      const timeBonus = Math.round((100 * ticket.timeLeft) / ticket.timeMax);
      const multiplier = 1 + this.combo * 0.25;
      const points = Math.round((ticket.recipe.price + timeBonus) * multiplier);
      this.score += points;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.served += 1;
      this.tickets = this.tickets.filter((other) => other !== ticket);
      plate.items = [];
      this.addToast(`Served ${ticket.recipe.name}! +${points} (x${multiplier.toFixed(2)})`, '#8fd694');
      return EVENT_SERVE;
    }
    const anyPlated = this.plates.some((plate) => plate.items.length > 0);
    if (anyPlated) {
      this.combo = 0;
      this.mistakes += 1;
      this.addToast('No ticket wants that plate!', '#ff7a6b');
      return EVENT_WRONG;
    }
    return 0;
  }
}
