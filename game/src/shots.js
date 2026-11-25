// The screenshot scenes behind ?shot=start|play|rush|end. Each one plays the real
// rules forward from a fresh world with a fixed seed, steered by a scripted chef
// that works the oldest ticket station by station — so every frame is what a
// short game really looks like, and the same seed always gives the same frame.
import { CHEF, GRILL_SECONDS, SHIFT_SECONDS } from './config.js';
import { STATIONS, stationPoint } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;
const START_SECONDS = 3;
// 13.87s: the first plate holds cheese and patty while the chef carries the
// bun up to it — a dish mid-assembly, with two tickets on the board.
const PLAY_SECONDS = 13.87;
// 39.5s: the second plate is complete and the chef is at the serve window,
// in the Lunch Rush with the score on the board.
const RUSH_SECONDS = 39.5;

// Open-floor waypoints the pilot routes through when a straight walk is blocked;
// every leg the router uses is checked clear of counters first.
const NODES = {
  centre: { x: 610, y: 430 },
  topRight: { x: 1000, y: 200 },
  midRight: { x: 1040, y: 560 },
  bottomLeft: { x: 200, y: 760 },
  bottomRight: { x: 880, y: 760 },
};

// Every rectangle the chef cannot walk through, as the world sees them.
function blockers() {
  return [
    { x: STATIONS.bins.x, y: STATIONS.bins.y, w: STATIONS.bins.w, h: 6 * STATIONS.bins.h + 5 * STATIONS.bins.gap },
    STATIONS.grill,
    STATIONS.board,
    STATIONS.trash,
    STATIONS.plates,
    STATIONS.serve,
    { x: 0, y: 0, w: 1280, h: 118 },
  ];
}

/** True when the chef's circle at (x, y) would touch a counter or a wall. */
function pointBlocked(x, y) {
  const r = CHEF.radius + 2;
  for (const rect of blockers()) {
    const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    if (Math.hypot(x - cx, y - cy) < r) return true;
  }
  return x - r < 8 || x + r > 1272 || y + r > 792;
}

/** True when the chef can walk the straight line from `a` to `b`. */
function segmentClear(a, b) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    if (pointBlocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/** Shortest clear route (BFS over the waypoints) from `from` to `to`. */
function route(from, to) {
  if (segmentClear(from, to)) return [to];
  const names = Object.keys(NODES);
  const start = { name: 'start', point: from };
  const goal = { name: 'goal', point: to };
  const all = [start, ...names.map((name) => ({ name, point: NODES[name] })), goal];
  const previous = { start: null };
  const queue = ['start'];
  while (queue.length > 0) {
    const current = queue.shift();
    const currentPoint = all.find((node) => node.name === current).point;
    for (const node of all) {
      if (node.name in previous || node.name === current) continue;
      if (!segmentClear(currentPoint, node.point)) continue;
      previous[node.name] = current;
      queue.push(node.name);
      if (node.name === 'goal') {
        const path = [];
        let cursor = 'goal';
        while (cursor !== 'start') {
          path.unshift(all.find((item) => item.name === cursor).point);
          cursor = previous[cursor];
        }
        return path;
      }
    }
  }
  return [to];
}

function binPoint(kind) {
  return stationPoint(STATIONS.bins, STATIONS.bins.kinds.indexOf(kind));
}

function platePoint(index) {
  return { x: STATIONS.plates.x + 84 + index * 220, y: STATIONS.plates.y + STATIONS.plates.h + 34 };
}

function servePoint() {
  return { x: STATIONS.serve.x + STATIONS.serve.w / 2, y: STATIONS.serve.y + STATIONS.serve.h + 34 };
}

/** A scripted chef that works one ticket at a time, station by station. */
export class ShotPilot {
  constructor(world) {
    this.world = world;
    this.steps = [];
    this.stepIndex = 0;
    this.waypoints = [];
    this.arrived = false;
  }

  go(point, interact) {
    return { kind: 'go', point, interact };
  }

  wait(point, until) {
    return { kind: 'wait', point, until };
  }

  /** The next action the pilot wants, as a world step input. */
  act() {
    const world = this.world;
    // The ticket this plan works on is gone (served by nobody, or expired):
    // drop the rest of the plan and start over on the oldest open ticket.
    if (this.ticketId > 0 && !world.tickets.some((item) => item.id === this.ticketId)) {
      this.steps = [];
      this.stepIndex = 0;
      this.waypoints = [];
      this.arrived = false;
    }
    if (this.stepIndex >= this.steps.length) {
      this.buildPlanForTicket();
    }
    const step = this.steps[this.stepIndex];
    if (!step) return { dx: 0, dy: 0, interact: false, target: null };
    const chef = world.chef;
    if (step.kind === 'wait') {
      const dx = step.point.x - chef.x;
      const dy = step.point.y - chef.y;
      const dist = Math.hypot(dx, dy);
      if (step.until()) {
        this.stepIndex += 1;
        this.waypoints = [];
        this.arrived = false;
        return { dx: 0, dy: 0, interact: false, target: null };
      }
      if (dist > 10) return { dx: dx / dist, dy: dy / dist, interact: false, target: null };
      return { dx: 0, dy: 0, interact: false, target: null };
    }
    // A 'go' step: walk the waypoint route, then interact once on arrival.
    if (this.waypoints.length === 0 && !this.arrived) {
      this.waypoints = route(chef, step.point);
    }
    if (this.waypoints.length > 0) {
      const target = this.waypoints[0];
      const dx = target.x - chef.x;
      const dy = target.y - chef.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) {
        this.waypoints.shift();
        if (this.waypoints.length === 0) this.arrived = true;
        return { dx: 0, dy: 0, interact: false, target: null };
      }
      return { dx: dx / dist, dy: dy / dist, interact: false, target: null };
    }
    if (this.arrived) {
      this.stepIndex += 1;
      this.waypoints = [];
      this.arrived = false;
      return { dx: 0, dy: 0, interact: step.interact, target: null };
    }
    return { dx: 0, dy: 0, interact: false, target: null };
  }

  /** Build (or rebuild) the plan for the oldest ticket, one need at a time. */
  buildPlanForTicket() {
    const world = this.world;
    if (this.stepIndex < this.steps.length) return true;
    // A fresh plan: tidy, then work the freshest ticket's needs in order.
    // Freshest, not oldest: the pilot needs most of a ticket's life to cook
    // the dish, and chasing a ticket with seconds left always expires mid-plan.
    const ticket = [...world.tickets].sort((a, b) => b.timeLeft - a.timeLeft)[0];
    if (!ticket) {
      // No ticket yet: wait in the middle of the floor for one to arrive.
      this.steps = [this.wait({ x: 610, y: 430 }, () => world.tickets.length > 0)];
      this.stepIndex = 0;
      this.waypoints = [];
      this.arrived = false;
      this.ticketId = -1;
      return true;
    }
    const steps = [];
    const grillPoint = stationPoint(STATIONS.grill);
    const boardPoint = stationPoint(STATIONS.board);
    const trashPoint = stationPoint(STATIONS.trash);
    // Tidy first: empty the hands so a pickup never fails on a full carry,
    // then clear anything left cooking or chopped from a dead ticket.
    let hands = world.chef.carry.length;
    while (hands > 0) {
      steps.push(this.go(trashPoint, true));
      hands -= 1;
    }
    const plate0 = platePoint(0);
    for (let slot = 0; slot < world.grill.length; slot += 1) {
      if (world.grill[slot]) {
        steps.push(this.go(grillPoint, true));
        steps.push(this.go(trashPoint, true));
      }
    }
    if (world.board) {
      steps.push(this.go(boardPoint, true));
      steps.push(this.go(trashPoint, true));
    }
    // The plate already holds some of this ticket: keep what fits the recipe,
    // clear it when something on it belongs to no ticket at all.
    const needCounts = {};
    for (const need of ticket.recipe.needs) {
      const key = `${need.kind}:${need.state}`;
      needCounts[key] = (needCounts[key] || 0) + 1;
    }
    const plateCounts = {};
    for (const item of world.plates[0].items) {
      const key = `${item.kind}:${item.state}`;
      plateCounts[key] = (plateCounts[key] || 0) + 1;
    }
    const plateFits = Object.entries(plateCounts).every(([key, count]) => (needCounts[key] || 0) >= count);
    if (!plateFits) {
      const stacked = world.plates[0].items.length;
      for (let index = 0; index < stacked; index += 1) {
        steps.push(this.go(plate0, true));
        steps.push(this.go(trashPoint, true));
      }
      for (const key of Object.keys(plateCounts)) plateCounts[key] = 0;
    }
    const stillNeeded = { ...needCounts };
    for (const [key, count] of Object.entries(plateCounts)) {
      stillNeeded[key] = Math.max(0, (stillNeeded[key] || 0) - count);
    }
    // Fetch in batches of three (the chef's hands hold three): gather a batch
    // of prepped ingredients first, then plate them all in one trip to the
    // counter, instead of walking to the plate after every single ingredient.
    const toFetch = [];
    for (const need of ticket.recipe.needs) {
      const key = `${need.kind}:${need.state}`;
      if (stillNeeded[key] <= 0) continue;
      stillNeeded[key] -= 1;
      toFetch.push(need);
    }
    for (let start = 0; start < toFetch.length; start += 3) {
      const batch = toFetch.slice(start, start + 3);
      for (const need of batch) {
        if (need.kind === 'patty') {
          steps.push(this.go(binPoint('patty'), true));
          steps.push(this.go(grillPoint, true));
          steps.push(this.wait(grillPoint, () => world.grill.some((slot) => slot && slot.state === 'cooked')));
          steps.push(this.go(grillPoint, true));
        } else if (need.state === 'chopped') {
          steps.push(this.go(binPoint(need.kind), true));
          steps.push(this.go(boardPoint, true));
          steps.push(this.wait(boardPoint, () => world.board && world.board.state === 'chopped'));
          steps.push(this.go(boardPoint, true));
        } else {
          steps.push(this.go(binPoint(need.kind), true));
        }
      }
      for (let index = 0; index < batch.length; index += 1) {
        steps.push(this.go(plate0, true));
      }
    }
    steps.push(this.go(servePoint(), true));
    this.steps = steps;
    this.stepIndex = 0;
    this.waypoints = [];
    this.arrived = false;
    this.ticketId = ticket.id;
    return true;
  }
}

/**
 * Set `world` to the named scene (start, play, rush or end) and return the
 * screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  const pilot = new ShotPilot(world);
  if (name !== 'play' && name !== 'rush' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / SAMPLE; index += 1) {
      world.step(SAMPLE, pilot.act());
    }
    return { screen: SCREEN_TITLE };
  }
  const seconds = name === 'end' ? SHIFT_SECONDS + 1 : name === 'rush' ? RUSH_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < seconds / SAMPLE; index += 1) {
    world.step(SAMPLE, pilot.act());
    if (world.over) break;
  }
  return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY };
}
