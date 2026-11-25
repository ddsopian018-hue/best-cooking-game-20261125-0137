// Sizzle Line: Rush Hour Kitchen — shared constants.
// One kitchen, one chef, one shift: take tickets, prep ingredients, plate, serve.
export const VIEW = { width: 1280, height: 800 };

// The shift: 90 seconds of service, three rush levels.
export const SHIFT_SECONDS = 90;
export const RUSH_AT = [30, 60];
export const WIN_SERVES = 6;

// Cooking times, in seconds.
export const GRILL_SECONDS = 4;
export const BURN_AFTER_SECONDS = 4;
export const CHOP_SECONDS = 2;

// The chef.
export const CHEF = { radius: 22, speed: 320, maxCarry: 3 };

// Ticket pacing per rush level: [spawn every seconds, ticket lasts seconds].
export const LEVEL_PACING = [
  { spawnEvery: 8, ticketSeconds: 48, label: 'Opening' },
  { spawnEvery: 6, ticketSeconds: 40, label: 'Lunch Rush' },
  { spawnEvery: 4.5, ticketSeconds: 34, label: 'Dinner Rush' },
];
export const MAX_TICKETS = 4;

// Every ingredient the kitchen stocks, with its counter-bin colour and label.
export const INGREDIENTS = {
  bun: { label: 'Bun', colour: '#e8b25c', dark: '#b97f2e' },
  patty: { label: 'Patty', colour: '#c96f4a', dark: '#8a3d22' },
  cheese: { label: 'Cheese', colour: '#f7c948', dark: '#d9a41f' },
  lettuce: { label: 'Lettuce', colour: '#7dc383', dark: '#4a8f52' },
  tomato: { label: 'Tomato', colour: '#e05252', dark: '#a92c2c' },
  onion: { label: 'Onion', colour: '#efe6f2', dark: '#9b7fb0' },
};

// A recipe is a name plus the exact stack a plate must hold to serve it.
export const RECIPES = [
  {
    id: 'classic',
    name: 'Classic Stack',
    price: 100,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
    ],
  },
  {
    id: 'cheese-melt',
    name: 'Cheese Melt',
    price: 110,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'ready' },
    ],
  },
  {
    id: 'garden',
    name: 'Garden Fresh',
    price: 120,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'onion', state: 'chopped' },
    ],
  },
  {
    id: 'works',
    name: 'The Works',
    price: 160,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'ready' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'onion', state: 'chopped' },
    ],
  },
  {
    id: 'double',
    name: 'Double Trouble',
    price: 190,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'ready' },
    ],
  },
];

// Which recipes the board may deal at each rush level (harder dishes unlock later).
export const RECIPE_POOL = [
  ['classic', 'cheese-melt'],
  ['classic', 'cheese-melt', 'garden', 'works'],
  ['classic', 'cheese-melt', 'garden', 'works', 'double'],
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

// Scoring: a served dish pays its price plus a speed bonus, multiplied by the
// combo the chef is riding. A wrong serve or an expired ticket breaks the combo.
export const SCORE = {
  speedBonusMax: 100,
  comboStep: 0.25,
};

// Words the game shows on its screens (also what the judge reads in the shots).
export const STRINGS = {
  title: 'SIZZLE LINE',
  subtitle: 'Rush Hour Kitchen',
  howTo:
    'Move with WASD / arrows or click a station. E (or Space) picks up, chops, grills and plates. Serve matching plates at the window before the ticket runs out.',
  startHint: 'Press ENTER or click to start your shift',
  overWin: 'SHIFT COMPLETE!',
  overLose: 'SHIFT OVER',
  restartHint: 'Press ENTER or click to cook again',
};
