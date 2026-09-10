export type BuildingKind =
  | 'hq'
  | 'den'
  | 'canteen'
  | 'forge'
  | 'crypt'
  | 'hall'
  | 'guild'
  | 'house'
  | 'tavern'
  | 'empty';
export type CreatureKind = 'goblin' | 'troll' | 'skeleton' | 'minotaur';
export type Point = { x: number; y: number };
export type Resources = {
  gold: number;
  wood: number;
  food: number;
  mana: number;
};
export type Cost = Partial<Resources>;
export type Selection = {
  type: 'lot' | 'unit' | 'enemy' | 'worker' | 'resource' | 'guildHero';
  id: number;
};
export type BuildingDef = {
  name: string;
  description: string;
  short: string;
  art: number;
  cost: Cost;
  duration: number;
};
export const BUILDINGS: Record<BuildingKind, BuildingDef> = {
  hq: {
    name: 'Manoir du mal',
    description:
      'Le cœur de votre domaine. Le tribut finance vos ambitions, et ses caves distillent la magie.',
    short: 'Or et essence',
    art: 0,
    cost: {},
    duration: 0,
  },
  den: {
    name: 'Tanière gobeline',
    description:
      'Des lits de fortune, une odeur douteuse. Accueille 6 créatures de plus et collecte un petit tribut.',
    short: '+6 places · +15 or/min',
    art: 1,
    cost: { gold: 70, wood: 25 },
    duration: 18,
  },
  canteen: {
    name: 'Cantine des hordes',
    description:
      'La boulangerie a changé de clientèle. Ses fournées nourrissent votre armée et permettent de recruter.',
    short: '+45 vivres/min',
    art: 2,
    cost: { gold: 80, wood: 25 },
    duration: 18,
  },
  forge: {
    name: 'Forge des trolls',
    description:
      'Un ancien garage, beaucoup de suie. Débloque les trolls et améliore la puissance de toute votre armée.',
    short: 'Débloque les trolls',
    art: 3,
    cost: { gold: 110, wood: 45 },
    duration: 24,
  },
  crypt: {
    name: 'Crypte des murmures',
    description:
      'Les anciens voisins ont repris du service. Débloque les squelettes et produit de l’essence.',
    short: '+24 essence/min',
    art: 4,
    cost: { gold: 130, wood: 35, mana: 15 },
    duration: 26,
  },
  hall: {
    name: 'Hôtel de ville',
    description:
      'La mairie mobilise la garde. Sa conquête arrête les renforts, mais les soldats déjà sortis restent dangereux.',
    short: 'Objectif de conquête',
    art: 5,
    cost: {},
    duration: 0,
  },
  guild: {
    name: 'Guilde des héros',
    description:
      'Les Lames de l’Aube préparent des expéditions contre votre manoir. Prenez leur guilde pour interrompre les prochains raids.',
    short: 'Source des expéditions',
    art: 4,
    cost: {},
    duration: 0,
  },
  house: {
    name: 'Maison des Tilleuls',
    description:
      'Une maison bien tranquille. Une fois conquise, elle verse un tribut et peut être transformée.',
    short: '+21 or/min',
    art: 6,
    cost: {},
    duration: 0,
  },
  tavern: {
    name: 'Auberge du Merle',
    description:
      'Le rendez-vous du quartier. Sous votre influence, son aubergiste vous versera un généreux tribut.',
    short: '+42 or/min',
    art: 7,
    cost: {},
    duration: 0,
  },
  empty: {
    name: 'Terrain en friche',
    description:
      'Un terrain libre pour vos prochains travaux. Choisissez un bâtiment dans la barre du bas.',
    short: 'Prêt à bâtir',
    art: -1,
    cost: {},
    duration: 0,
  },
};
export const CREATURES: Record<
  CreatureKind,
  {
    name: string;
    job: string;
    description: string;
    art: number;
    cost: Cost;
    hp: number;
    damage: number;
    speed: number;
    size: number;
    population: number;
  }
> = {
  goblin: {
    name: 'Gobelin',
    job: 'Bâtisseur',
    description:
      'Construit vos bâtiments et récupère du bois entre deux chantiers. Petit, efficace, peu porté sur les combats.',
    art: 0,
    cost: { gold: 35, food: 8 },
    hp: 45,
    damage: 0,
    speed: 2.1,
    size: 31,
    population: 1,
  },
  troll: {
    name: 'Troll',
    job: 'Combattant',
    description:
      'Le gros bras de votre quartier. Solide au combat, il exige une forge et des repas réguliers.',
    art: 1,
    cost: { gold: 60, food: 20 },
    hp: 100,
    damage: 12,
    speed: 1.7,
    size: 42,
    population: 1,
  },
  skeleton: {
    name: 'Squelette',
    job: 'Garde infatigable',
    description:
      'Un soldat peu coûteux, fragile mais qui ne mange jamais. La crypte le rappelle parmi vos voisins.',
    art: 2,
    cost: { gold: 45, mana: 15 },
    hp: 65,
    damage: 10,
    speed: 1.9,
    size: 37,
    population: 1,
  },
  minotaur: {
    name: 'Minotaure',
    job: 'Colosse de siège',
    description:
      'Un colosse à cornes qui brise les défenses. Il occupe 3 places et réclame 3 fois plus de nourriture.',
    art: 3,
    cost: { gold: 220, mana: 60, food: 35 },
    hp: 350,
    damage: 38,
    speed: 1.2,
    size: 68,
    population: 3,
  },
};
export const BUILD_OPTIONS: BuildingKind[] = [
  'canteen',
  'forge',
  'den',
  'crypt',
];
export const RECRUIT_OPTIONS: CreatureKind[] = [
  'goblin',
  'troll',
  'skeleton',
  'minotaur',
];
export const BOARD = 32;
export const STARTS = [2, 12, 22];
export interface Lot {
  id: number;
  x: number;
  y: number;
  kind: BuildingKind;
  owned: boolean;
  hp: number;
  maxHp: number;
  level: number;
  humanKind: BuildingKind;
  construction: null | { kind: BuildingKind; progress: number };
}
export interface Unit extends Point {
  id: number;
  kind: CreatureKind;
  hp: number;
  task:
    | 'idle'
    | 'build'
    | 'attack'
    | 'move'
    | 'forage'
    | 'defend'
    | 'sabotage'
    | 'hunt';
  path: Point[];
  target: number | null;
  idleTime: number;
  facing: number;
  fighting: boolean;
}
export type EnemyKind = 'guard' | 'hero';
export type HeroRole = 'warrior' | 'lancer' | 'archer' | 'monk';
export const GUILD_ROLES: readonly HeroRole[] = [
  'warrior',
  'lancer',
  'archer',
  'monk',
];
export const HEROES = {
  warrior: {
    name: 'Chevalier de l’Aube',
    short: 'Chevalier',
    hp: 140,
    damage: 12,
    speed: 1.5,
    range: 1.4,
    description:
      'Le combattant de première ligne de la guilde. Il marche sur votre manoir et affronte vos créatures au corps à corps.',
  },
  lancer: {
    name: 'Lancier de l’Aube',
    short: 'Lancier',
    hp: 175,
    damage: 10,
    speed: 1.25,
    range: 2.3,
    description:
      'Un héros robuste dont la lance frappe avant le contact. Il protège l’avancée de son expédition.',
  },
  archer: {
    name: 'Archère de l’Aube',
    short: 'Archère',
    hp: 70,
    damage: 9,
    speed: 1.6,
    range: 5.5,
    description:
      'Elle tire des flèches à distance. Approchez vos combattants pour la neutraliser ; les bâtiments bloquent ses tirs.',
  },
  monk: {
    name: 'Moine de l’Aube',
    short: 'Moine',
    hp: 85,
    damage: 0,
    speed: 1.35,
    range: 4,
    description:
      'Il soigne les membres blessés de son expédition à proximité. Il ne peut pas endommager vos bâtiments.',
  },
} as const;
/** Shared by the expedition preview and actual raid mobilization. */
export function heroParty(level: number): HeroRole[] {
  if (level === 1) return ['warrior'];
  if (level === 2) return ['warrior', 'archer'];
  if (level === 3) return ['warrior', 'archer', 'monk'];
  return level === 4 ? [...GUILD_ROLES] : [...GUILD_ROLES, 'warrior'];
}
export const ENEMIES = {
  guard: {
    name: 'Garde du quartier',
    hp: 55,
    damage: 6,
    speed: 1.35,
    description:
      'Reprend vos propriétés, puis attaque le manoir. Ses renforts viennent de la mairie.',
  },
  hero: {
    name: 'Chevalier de l’Aube',
    hp: 140,
    damage: 12,
    speed: 1.5,
    description:
      'Un héros de la guilde. Il vise le manoir et combat les créatures qui lui barrent la route.',
  },
} as const;
export interface Enemy extends Point {
  id: number;
  kind: EnemyKind;
  role: HeroRole;
  hp: number;
  maxHp: number;
  damage: number;
  level: number;
  path: Point[];
  target: number;
  facing: number;
  fighting: boolean;
  healTarget: number | null;
  attackCooldown: number;
}
export function enemyDefinition(enemy: Pick<Enemy, 'kind' | 'role'>) {
  return enemy.kind === 'guard'
    ? { ...ENEMIES.guard, range: 1.4 }
    : HEROES[enemy.role];
}
export interface Projectile extends Point {
  id: number;
  target: { type: 'lot' | 'unit'; id: number };
  damage: number;
  angle: number;
  life: number;
}
export interface Mobilization {
  active: boolean;
  nextRaidAt: number | null;
  waves: number;
  reason: string;
  starved: boolean;
}
export const PRESSURE = {
  guard: {
    territory: 5 / 9,
    time: 180,
    warning: 25,
    interval: 100,
    source: 'hall',
  },
  hero: {
    territory: 6 / 9,
    time: 360,
    warning: 35,
    interval: 140,
    source: 'guild',
  },
  levelEvery: 120,
  maxLevel: 6,
} as const;
export function territory(s: State) {
  return s.lots.filter((l) => l.owned).length / s.lots.length;
}
export function humanLevel(s: State) {
  return s.economy.level;
}
export function sourceBuilding(s: State, kind: EnemyKind) {
  return s.lots.find((l) => l.kind === PRESSURE[kind].source);
}
export type Supply = 'gold' | 'wood' | 'food';
export const SUPPLIES = {
  gold: {
    name: 'Gisement d’or',
    worker: 'Mineur',
    label: 'Or',
    tool: 'Pickaxe',
    cargo: 'Gold',
    art: 'gold-deposit',
  },
  wood: {
    name: 'Camp de bûcherons',
    worker: 'Bûcheron',
    label: 'Bois',
    tool: 'Axe',
    cargo: 'Wood',
    art: 'tree-2',
  },
  food: {
    name: 'Bergerie',
    worker: 'Berger',
    label: 'Vivres',
    tool: 'Knife',
    cargo: 'Meat',
    art: 'sheep',
  },
} as const;
export const UPGRADE_SUPPLIES = { gold: 25, wood: 20, food: 15 };
export interface ResourceSite extends Point {
  id: number;
  kind: Supply;
  home: number;
  hp: number;
  maxHp: number;
  repairAt: number;
  recruitAt: number;
}
export interface HumanWorker extends Point {
  id: number;
  site: number;
  hp: number;
  maxHp: number;
  path: Point[];
  facing: number;
  phase: 'outbound' | 'harvest' | 'return';
  cargo: number;
  progress: number;
}
export function supplyActive(s: State, site: ResourceSite) {
  return !s.lots[site.home].owned && site.hp > 0;
}
export function suppliesAvailable(
  s: State,
  cost: Partial<Record<Supply, number>>,
) {
  return Object.entries(cost).every(
    ([key, value]) => s.economy.stocks[key as Supply] >= value,
  );
}
function spendSupplies(s: State, cost: Partial<Record<Supply, number>>) {
  for (const [key, value] of Object.entries(cost))
    s.economy.stocks[key as Supply] -= value;
}
function spawnWorker(s: State, site: ResourceSite) {
  const home = entrance(s.lots[site.home]);
  s.workers.push({
    id: s.nextId++,
    ...home,
    site: site.id,
    hp: 35,
    maxHp: 35,
    path: findPath(home, site),
    facing: 1,
    phase: 'outbound',
    cargo: 0,
    progress: 0,
  });
}
export function raidSupplyReason(s: State, target: Selection) {
  if (s.won || s.lost) return 'La partie est terminée.';
  if (!army(s).length)
    return 'Recrutez des combattants pour piller les humains.';
  if (target.type === 'resource') {
    const site = s.sites.find((site) => site.id === target.id);
    if (!site || !supplyActive(s, site)) return 'Ce site ne produit plus.';
  } else if (target.type === 'worker') {
    if (!s.workers.some((w) => w.id === target.id && w.hp > 0))
      return 'Ce paysan a quitté le quartier.';
  } else return 'Choisissez un paysan ou un site de production.';
  return '';
}
export function raidSupply(s: State, target: Selection) {
  const error = raidSupplyReason(s, target);
  if (error) return error;
  const point =
    target.type === 'resource'
      ? s.sites.find((site) => site.id === target.id)!
      : s.workers.find((w) => w.id === target.id)!;
  for (const u of army(s))
    assign(
      u,
      point,
      target.type === 'resource' ? 'sabotage' : 'hunt',
      target.id,
    );
  announce(
    s,
    'Votre armée part couper le ravitaillement humain. La garde peut intervenir sur le trajet.',
  );
  return '';
}
function advanceEconomy(s: State, dt: number) {
  for (const site of s.sites) {
    if (s.lots[site.home].owned) continue;
    if (
      site.hp <= 0 &&
      s.elapsed >= site.repairAt &&
      suppliesAvailable(s, { gold: 10, wood: 10 })
    ) {
      spendSupplies(s, { gold: 10, wood: 10 });
      site.hp = site.maxHp;
      announce(
        s,
        `${SUPPLIES[site.kind].name} réparée : la production humaine reprend.`,
      );
    }
    if (
      supplyActive(s, site) &&
      !s.workers.some((w) => w.site === site.id && w.hp > 0) &&
      s.elapsed >= site.recruitAt &&
      suppliesAvailable(s, { gold: 8, food: 5 })
    ) {
      spendSupplies(s, { gold: 8, food: 5 });
      spawnWorker(s, site);
    }
  }
  for (const w of s.workers) {
    const site = s.sites[w.site];
    if (w.hp <= 0 || !supplyActive(s, site)) continue;
    walk(w, 1.8 * dt);
    if (w.path.length) continue;
    if (w.phase === 'outbound') {
      w.phase = 'harvest';
      w.progress = 0;
    }
    if (w.phase === 'harvest') {
      w.progress += dt;
      if (w.progress >= 6) {
        w.cargo = 10;
        w.phase = 'return';
        w.path = findPath(w, entrance(s.lots[site.home]));
      }
    } else if (w.phase === 'return') {
      s.economy.stocks[site.kind] += w.cargo;
      s.economy.delivered[site.kind] += w.cargo;
      w.cargo = 0;
      w.phase = 'outbound';
      w.path = findPath(w, site);
    }
  }
  if (
    s.economy.level < PRESSURE.maxLevel &&
    s.elapsed >= s.economy.nextUpgradeAt &&
    suppliesAvailable(s, UPGRADE_SUPPLIES)
  ) {
    spendSupplies(s, UPGRADE_SUPPLIES);
    s.economy.level++;
    s.economy.nextUpgradeAt = s.elapsed + PRESSURE.levelEvery;
  }
}
function cleanupSupplies(s: State) {
  for (const w of s.workers) {
    const site = s.sites[w.site];
    if (w.hp <= 0) {
      s.resources[site.kind] += w.cargo || 4;
      site.recruitAt = s.elapsed + 40;
      announce(
        s,
        `${SUPPLIES[site.kind].worker} éliminé. Livraison perdue ; remplacement dans au moins 40 s.`,
      );
    }
  }
  s.workers = s.workers.filter(
    (w) => w.hp > 0 && supplyActive(s, s.sites[w.site]),
  );
}
export interface State {
  resources: Resources;
  economy: {
    stocks: Record<Supply, number>;
    delivered: Record<Supply, number>;
    level: number;
    nextUpgradeAt: number;
  };
  workers: HumanWorker[];
  sites: ResourceSite[];
  lots: Lot[];
  units: Unit[];
  elapsed: number;
  nextId: number;
  recruits: { kind: CreatureKind; remaining: number }[];
  notice: string;
  noticeUntil: number;
  journal: string[];
  won: boolean;
  lost: boolean;
  enemies: Enemy[];
  projectiles: Projectile[];
  mobilization: Record<EnemyKind, Mobilization>;
  defeatedEnemies: number;
  humanLevelAnnounced: number;
  captures: number;
  recruited: number;
}

export function createGame(): State {
  const kinds: BuildingKind[] = [
    'guild',
    'tavern',
    'hall',
    'den',
    'empty',
    'house',
    'hq',
    'empty',
    'house',
  ];
  const state: State = {
    resources: { gold: 300, wood: 125, food: 60, mana: 30 },
    economy: {
      stocks: { gold: 45, wood: 25, food: 35 },
      delivered: { gold: 0, wood: 0, food: 0 },
      level: 1,
      nextUpgradeAt: 120,
    },
    workers: [],
    sites: [
      {
        id: 0,
        kind: 'food',
        home: 1,
        x: 18.5,
        y: 1.5,
        hp: 110,
        maxHp: 110,
        repairAt: 0,
        recruitAt: 0,
      },
      {
        id: 1,
        kind: 'gold',
        home: 5,
        x: 30.5,
        y: 10.5,
        hp: 140,
        maxHp: 140,
        repairAt: 0,
        recruitAt: 0,
      },
      {
        id: 2,
        kind: 'wood',
        home: 8,
        x: 30.5,
        y: 25.5,
        hp: 120,
        maxHp: 120,
        repairAt: 0,
        recruitAt: 0,
      },
    ],
    elapsed: 0,
    nextId: 1,
    lots: kinds.map((kind, id) => ({
      id,
      x: STARTS[id % 3],
      y: STARTS[Math.floor(id / 3)],
      kind,
      owned: [3, 6, 7].includes(id),
      hp:
        kind === 'hq'
          ? 500
          : kind === 'hall'
            ? 360
            : kind === 'guild'
              ? 220
              : kind === 'tavern'
                ? 140
                : 85,
      maxHp:
        kind === 'hq'
          ? 500
          : kind === 'hall'
            ? 360
            : kind === 'guild'
              ? 220
              : kind === 'tavern'
                ? 140
                : 85,
      level: 1,
      humanKind: kind === 'den' ? 'house' : kind,
      construction: null,
    })),
    units: [],
    recruits: [],
    notice: '',
    noticeUntil: 0,
    journal: ['Trois gobelins, un manoir… le quartier ne se doute de rien.'],
    won: false,
    lost: false,
    enemies: [],
    projectiles: [],
    mobilization: {
      guard: {
        active: false,
        nextRaidAt: null,
        waves: 0,
        reason: '',
        starved: false,
      },
      hero: {
        active: false,
        nextRaidAt: null,
        waves: 0,
        reason: '',
        starved: false,
      },
    },
    defeatedEnemies: 0,
    humanLevelAnnounced: 1,
    captures: 0,
    recruited: 0,
  };
  for (let i = 0; i < 3; i++) spawnUnit(state, 'goblin');
  for (const site of state.sites) spawnWorker(state, site);
  return state;
}
export function entrance(lot: Lot): Point {
  return { x: lot.x + 4.5, y: lot.y + 7.5 };
}
export function population(s: State) {
  return (
    s.units.reduce((n, u) => n + CREATURES[u.kind].population, 0) +
    s.recruits.reduce((n, r) => n + CREATURES[r.kind].population, 0)
  );
}
export function capacity(s: State) {
  return (
    6 +
    s.lots
      .filter((l) => l.owned && l.kind === 'den')
      .reduce((n, l) => n + 6 * l.level, 0)
  );
}
export function hasBuilding(s: State, kind: BuildingKind) {
  return s.lots.some((l) => l.owned && l.kind === kind);
}
export function adjacent(s: State, lot: Lot) {
  return s.lots.some(
    (l) =>
      l.owned &&
      Math.abs((l.id % 3) - (lot.id % 3)) +
        Math.abs(Math.floor(l.id / 3) - Math.floor(lot.id / 3)) ===
        1,
  );
}
export function canAfford(s: State, cost: Cost) {
  return Object.entries(cost).every(
    ([key, value]) => s.resources[key as keyof Resources] >= value,
  );
}
function pay(s: State, cost: Cost) {
  for (const [key, value] of Object.entries(cost))
    s.resources[key as keyof Resources] -= value;
}
export function announce(s: State, message: string) {
  s.notice = message;
  s.noticeUntil = s.elapsed + 6;
  s.journal = [message, ...s.journal].slice(0, 5);
}
function blocked(x: number, y: number) {
  if (x < 0 || y < 0 || x >= BOARD || y >= BOARD) return true;
  return (
    STARTS.some((a) => x >= a + 1 && x <= a + 6) &&
    STARTS.some((b) => y >= b + 1 && y <= b + 5)
  );
}
export function findPath(from: Point, to: Point): Point[] {
  const sx = Math.min(31, Math.max(0, Math.floor(from.x))),
    sy = Math.min(31, Math.max(0, Math.floor(from.y)));
  let tx = Math.min(31, Math.max(0, Math.floor(to.x))),
    ty = Math.min(31, Math.max(0, Math.floor(to.y)));
  if (blocked(tx, ty)) {
    let best = Infinity;
    for (let y = 0; y < BOARD; y++)
      for (let x = 0; x < BOARD; x++) {
        const d = (x - tx) ** 2 + (y - ty) ** 2;
        if (!blocked(x, y) && d < best) {
          best = d;
          to = { x: x + 0.5, y: y + 0.5 };
        }
      }
    tx = Math.floor(to.x);
    ty = Math.floor(to.y);
  }
  const start = sy * BOARD + sx,
    goal = ty * BOARD + tx;
  if (start === goal) return [{ x: tx + 0.5, y: ty + 0.5 }];
  const prev = new Int32Array(BOARD * BOARD).fill(-1);
  prev[start] = start;
  const queue = [start];
  for (let head = 0; head < queue.length && prev[goal] === -1; head++) {
    const id = queue[head],
      x = id % BOARD,
      y = Math.floor(id / BOARD);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        next = ny * BOARD + nx;
      if (blocked(nx, ny) || prev[next] !== -1) continue;
      prev[next] = id;
      queue.push(next);
    }
  }
  if (prev[goal] === -1) return [];
  const path: Point[] = [];
  for (let p = goal; p !== start; p = prev[p])
    path.push({ x: (p % BOARD) + 0.5, y: Math.floor(p / BOARD) + 0.5 });
  return path.reverse();
}
function assign(
  u: Unit,
  point: Point,
  task: Unit['task'],
  target: number | null,
) {
  u.path = findPath(u, point);
  u.task = task;
  u.target = target;
  u.idleTime = 0;
}
function spawnUnit(s: State, kind: CreatureKind) {
  const home = entrance(s.lots[6]),
    id = s.nextId++;
  s.units.push({
    id,
    kind,
    x: home.x - 0.7 + (id % 3) * 0.6,
    y: home.y + 0.15 * (id % 2),
    hp: CREATURES[kind].hp,
    task: 'idle',
    path: [],
    target: null,
    idleTime: id * 0.5,
    facing: 1,
    fighting: false,
  });
}
export function buildReason(s: State, id: number, kind: BuildingKind): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  const l = s.lots[id];
  if (!l || !l.owned) return 'Sélectionnez une parcelle à vous.';
  if (l.construction) return 'Un chantier est déjà en cours.';
  if (l.kind !== 'empty' && l.kind !== 'house' && l.kind !== 'tavern')
    return 'Choisissez un terrain libre ou une maison conquise.';
  if (!BUILD_OPTIONS.includes(kind))
    return 'Ce bâtiment ne peut pas être construit.';
  if (!canAfford(s, BUILDINGS[kind].cost))
    return 'Il manque des ressources pour ce chantier.';
  if (!s.units.some((u) => u.kind === 'goblin'))
    return 'Recrutez un gobelin pour construire.';
  return '';
}
export function build(s: State, id: number, kind: BuildingKind): string {
  const error = buildReason(s, id, kind);
  if (error) return error;
  pay(s, BUILDINGS[kind].cost);
  s.lots[id].construction = { kind, progress: 0 };
  announce(s, `Chantier lancé : ${BUILDINGS[kind].name.toLowerCase()}.`);
  allocateWorkers(s);
  return '';
}
function allocateWorkers(s: State) {
  for (const lot of s.lots.filter((l) => l.construction)) {
    const workers = s.units.filter(
      (u) => u.kind === 'goblin' && u.target === lot.id && u.task === 'build',
    );
    const free = s.units.filter(
      (u) => u.kind === 'goblin' && (u.task === 'idle' || u.task === 'forage'),
    );
    const door = entrance(lot);
    free.sort(
      (a, b) =>
        Math.hypot(a.x - door.x, a.y - door.y) -
        Math.hypot(b.x - door.x, b.y - door.y),
    );
    for (const worker of free.slice(0, 3 - workers.length))
      assign(worker, door, 'build', lot.id);
  }
}
export const CLAIM_COST: Cost = { gold: 40, mana: 18 };
export function claimReason(s: State, id: number) {
  if (s.won || s.lost) return 'La partie est terminée.';
  const l = s.lots[id];
  if (!l || l.owned || l.kind !== 'empty')
    return 'Ce terrain ne peut pas être revendiqué.';
  if (!adjacent(s, l)) return 'Conquérez d’abord une parcelle voisine.';
  if (!canAfford(s, CLAIM_COST)) return 'Il faut 40 or et 18 essence.';
  return '';
}
export function claim(s: State, id: number) {
  const error = claimReason(s, id);
  if (error) return error;
  pay(s, CLAIM_COST);
  s.lots[id].owned = true;
  s.captures++;
  announce(s, 'La friche est à vous. Les gobelins attendent vos plans.');
  return '';
}
export function recruitReason(s: State, kind: CreatureKind) {
  if (s.won || s.lost) return 'La partie est terminée.';
  if (kind === 'troll' && !hasBuilding(s, 'forge'))
    return 'Construisez une forge pour recruter les trolls.';
  if (kind === 'skeleton' && !hasBuilding(s, 'crypt'))
    return 'Construisez une crypte pour éveiller les squelettes.';
  if (
    kind === 'minotaur' &&
    (!hasBuilding(s, 'forge') || !hasBuilding(s, 'crypt'))
  )
    return 'Le Minotaure exige une forge et une crypte.';
  if (population(s) + CREATURES[kind].population > capacity(s))
    return 'Plus de place. Construisez ou améliorez une tanière.';
  if (!canAfford(s, CREATURES[kind].cost))
    return 'Il manque des ressources pour ce recrutement.';
  return '';
}
export function recruit(s: State, kind: CreatureKind) {
  const error = recruitReason(s, kind);
  if (error) return error;
  pay(s, CREATURES[kind].cost);
  s.recruits.push({ kind, remaining: kind === 'minotaur' ? 15 : 6 });
  announce(s, `${CREATURES[kind].name} en route vers votre manoir.`);
  return '';
}
export function army(s: State) {
  return s.units.filter((u) => u.kind !== 'goblin');
}
export function attackReason(s: State, id: number) {
  if (s.won || s.lost) return 'La partie est terminée.';
  const l = s.lots[id];
  if (!l || l.owned || l.kind === 'empty')
    return 'Choisissez un bâtiment ennemi.';
  if (!adjacent(s, l)) return 'Prenez d’abord une parcelle voisine.';
  if (army(s).length === 0) return 'Recrutez des combattants avant d’attaquer.';
  return '';
}
export function attack(s: State, id: number) {
  const error = attackReason(s, id);
  if (error) return error;
  for (const u of army(s)) assign(u, entrance(s.lots[id]), 'attack', id);
  announce(
    s,
    `Votre armée marche vers ${BUILDINGS[s.lots[id].kind].name.toLowerCase()}.`,
  );
  return '';
}
export function retreat(s: State) {
  if (s.won || s.lost) return;
  for (const u of army(s)) assign(u, entrance(s.lots[6]), 'move', null);
  announce(s, 'Repli au manoir. Les blessés s’y rétabliront.');
}
export function moveUnit(s: State, id: number, point: Point) {
  if (s.won || s.lost) return;
  const u = s.units.find((v) => v.id === id);
  if (!u) return;
  assign(u, point, 'move', null);
}
export function upgradeCost(l: Lot): Cost {
  return { gold: 80 * l.level, wood: 35 * l.level };
}
export function upgradeReason(s: State, id: number) {
  if (s.won || s.lost) return 'La partie est terminée.';
  const l = s.lots[id];
  if (!l?.owned || l.kind === 'empty' || l.construction)
    return 'Choisissez un bâtiment terminé.';
  if (l.level >= 3) return 'Niveau maximal atteint.';
  if (!canAfford(s, upgradeCost(l)))
    return 'Il manque des ressources pour cette amélioration.';
  return '';
}
export function upgrade(s: State, id: number) {
  const error = upgradeReason(s, id);
  if (error) return error;
  const l = s.lots[id];
  pay(s, upgradeCost(l));
  l.level++;
  announce(s, `${BUILDINGS[l.kind].name} passe au niveau ${l.level}.`);
  return '';
}
export function rates(s: State): Resources {
  const rate: Resources = { gold: 0, wood: 0, food: 0, mana: 0 };
  for (const l of s.lots.filter((l) => l.owned)) {
    const n = l.level;
    if (l.kind === 'hq') {
      rate.gold += 0.85 * n;
      rate.mana += 0.18 * n;
    }
    if (l.kind === 'den') rate.gold += 0.25 * n;
    if (l.kind === 'canteen') rate.food += 0.75 * n;
    if (l.kind === 'crypt') rate.mana += 0.4 * n;
    if (l.kind === 'house') rate.gold += 0.35 * n;
    if (l.kind === 'tavern') rate.gold += 0.7 * n;
    if (l.kind === 'hall') {
      rate.gold += 1;
      rate.mana += 0.5;
    }
    if (l.kind === 'guild') rate.mana += 0.3 * n;
  }
  for (const u of s.units) {
    if (u.kind === 'goblin' && (u.task === 'idle' || u.task === 'forage'))
      rate.wood += 0.22;
    if (u.kind !== 'skeleton') rate.food -= u.kind === 'minotaur' ? 0.15 : 0.05;
  }
  return rate;
}
const distanceBetween = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
function nearest<T extends Point & { hp: number }>(
  from: Point,
  targets: T[],
  range: number,
): T | undefined {
  let closest: T | undefined;
  for (const target of targets) {
    const distance = distanceBetween(from, target);
    if (target.hp > 0 && distance < range) {
      closest = target;
      range = distance;
    }
  }
  return closest;
}
function walk(u: Point & { path: Point[]; facing: number }, distance: number) {
  while (u.path.length && distance > 0) {
    const p = u.path[0],
      dx = p.x - u.x,
      dy = p.y - u.y,
      d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.001) u.facing = dx >= 0 ? 1 : -1;
    if (d <= distance) {
      u.x = p.x;
      u.y = p.y;
      u.path.shift();
      distance -= d;
    } else {
      u.x += (dx / d) * distance;
      u.y += (dy / d) * distance;
      distance = 0;
    }
  }
}
function armyDamage(s: State, u: Unit) {
  const forge = Math.max(
    1,
    ...s.lots.filter((l) => l.owned && l.kind === 'forge').map((l) => l.level),
  );
  return (
    CREATURES[u.kind].damage *
    (1 + (forge - 1) * 0.15) *
    (s.resources.food <= 0 && u.kind !== 'skeleton' ? 0.6 : 1)
  );
}
export function defend(s: State, id = 6): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  if (!s.lots[id]?.owned) return 'Choisissez un bâtiment à vous.';
  if (!army(s).length)
    return 'Recrutez des combattants pour défendre le quartier.';
  for (const u of army(s)) assign(u, entrance(s.lots[id]), 'move', null);
  announce(
    s,
    `Votre armée se rassemble devant ${BUILDINGS[s.lots[id].kind].name.toLowerCase()}.`,
  );
  return '';
}
export function intercept(s: State, id: number): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  const enemy = s.enemies.find((e) => e.id === id && e.hp > 0);
  if (!enemy) return 'Cet ennemi a déjà été vaincu.';
  if (!army(s).length)
    return 'Recrutez des combattants pour intercepter cet ennemi.';
  for (const u of army(s)) assign(u, enemy, 'defend', id);
  return '';
}
function raidTarget(s: State, e: Pick<Enemy, 'kind' | 'x' | 'y'>): Lot {
  if (e.kind === 'hero') return s.lots[6];
  const outer = s.lots.filter((l) => l.owned && l.kind !== 'hq');
  return (
    outer.sort(
      (a, b) =>
        distanceBetween(e, entrance(a)) - distanceBetween(e, entrance(b)),
    )[0] ?? s.lots[6]
  );
}
function mobilize(s: State) {
  for (const kind of ['guard', 'hero'] as const) {
    const settings = PRESSURE[kind],
      m = s.mobilization[kind],
      source = sourceBuilding(s, kind);
    if (!source || source.owned) {
      m.active = false;
      m.starved = false;
      m.nextRaidAt = null;
      continue;
    }
    if (
      !m.active &&
      (territory(s) >= settings.territory || s.elapsed >= settings.time)
    ) {
      m.active = true;
      m.reason =
        territory(s) >= settings.territory
          ? `${Math.round(territory(s) * 100)} % du quartier sous votre influence`
          : 'Les humains ont eu le temps de se préparer';
      m.nextRaidAt = s.elapsed + settings.warning;
      announce(
        s,
        `${kind === 'guard' ? 'La garde se mobilise' : 'La guilde prépare une expédition'} : ${m.reason.toLowerCase()}. Départ dans ${settings.warning} s !`,
      );
    }
    if (m.nextRaidAt === null || s.elapsed < m.nextRaidAt) continue;
    if (s.enemies.length >= 16) continue;
    const level = humanLevel(s),
      point = entrance(source);
    const party = heroParty(level);
    const count =
      kind === 'guard' ? 2 + Math.floor((level - 1) / 2) : party.length;
    const cost = {
      gold: count * (kind === 'guard' ? 8 : 16),
      food: count * (kind === 'guard' ? 4 : 8),
    };
    m.starved = !suppliesAvailable(s, cost);
    if (m.starved) continue;
    spendSupplies(s, cost);
    for (let i = 0; i < count; i++) {
      const role = kind === 'guard' ? 'warrior' : party[i];
      const def = enemyDefinition({ kind, role });
      const hp = Math.round(def.hp * (1 + (level - 1) * 0.15));
      const enemy: Enemy = {
        id: s.nextId++,
        kind,
        role,
        ...point,
        x: point.x + i * 0.35,
        hp,
        maxHp: hp,
        damage: def.damage * (1 + (level - 1) * 0.12),
        level,
        path: [],
        target: 6,
        facing: -1,
        fighting: false,
        healTarget: null,
        attackCooldown: 0.6,
      };
      const target = raidTarget(s, enemy);
      enemy.target = target.id;
      enemy.path = findPath(enemy, entrance(target));
      s.enemies.push(enemy);
    }
    m.waves++;
    m.nextRaidAt =
      s.elapsed + Math.max(55, settings.interval - (level - 1) * 8);
    announce(
      s,
      kind === 'guard'
        ? `${count} gardes de niveau ${level} sortent de la mairie pour reprendre vos propriétés !`
        : `${count} héros de niveau ${level} quittent la guilde. Ils visent votre manoir !`,
    );
  }
}
function loseLot(s: State, lot: Lot) {
  if (lot.kind === 'hq') {
    lot.hp = 0;
    s.lost = true;
    announce(
      s,
      'Votre manoir est détruit. Les humains ont repris le quartier.',
    );
    return;
  }
  const previousName = BUILDINGS[lot.kind].name;
  lot.owned = false;
  lot.kind = lot.humanKind;
  lot.construction = null;
  lot.level = 1;
  lot.maxHp =
    lot.kind === 'hall'
      ? 360
      : lot.kind === 'guild'
        ? 220
        : lot.kind === 'tavern'
          ? 140
          : 85;
  lot.hp = lot.maxHp;
  for (const u of s.units.filter(
    (u) => u.task === 'build' && u.target === lot.id,
  )) {
    u.task = 'idle';
    u.target = null;
    u.path = [];
  }
  announce(
    s,
    `${previousName} a été repris par la garde. Vous perdez sa production.`,
  );
}
export function clearShot(from: Point, to: Point) {
  const steps = Math.ceil(distanceBetween(from, to) * 4);
  for (let i = 1; i < steps; i++)
    if (
      blocked(
        Math.floor(from.x + ((to.x - from.x) * i) / steps),
        Math.floor(from.y + ((to.y - from.y) * i) / steps),
      )
    )
      return false;
  return true;
}
function shoot(s: State, e: Enemy, target: Projectile['target'], point: Point) {
  if (e.attackCooldown > 0) return;
  e.attackCooldown = 0.8;
  s.projectiles.push({
    id: s.nextId++,
    x: e.x,
    y: e.y,
    target,
    damage: e.damage * 0.8,
    angle: Math.atan2(point.y - e.y, point.x - e.x),
    life: 2,
  });
}
function advanceProjectiles(s: State, dt: number) {
  for (const p of s.projectiles) {
    p.life -= dt;
    const target =
      p.target.type === 'unit'
        ? s.units.find((u) => u.id === p.target.id && u.hp > 0)
        : s.lots[p.target.id];
    if (!target || ('owned' in target && !target.owned)) {
      p.life = 0;
      continue;
    }
    const destination = 'owned' in target ? entrance(target) : target;
    if (!clearShot(p, destination)) {
      p.life = 0;
      continue;
    }
    const distance = distanceBetween(p, destination);
    if (distance <= 11 * dt) {
      target.hp = Math.max(0, target.hp - p.damage);
      if ('owned' in target && target.hp <= 0) loseLot(s, target);
      p.life = 0;
    } else {
      p.angle = Math.atan2(destination.y - p.y, destination.x - p.x);
      p.x += Math.cos(p.angle) * 11 * dt;
      p.y += Math.sin(p.angle) * 11 * dt;
    }
  }
  s.projectiles = s.projectiles.filter((p) => p.life > 0);
}
function advanceEnemies(s: State, dt: number) {
  for (const e of s.enemies) {
    if (e.hp <= 0 || s.lost) continue;
    e.fighting = false;
    e.healTarget = null;
    e.attackCooldown -= dt;
    const def = enemyDefinition(e);
    if (e.role === 'monk') {
      const ally = nearest(
        e,
        s.enemies.filter(
          (ally) =>
            ally.id !== e.id &&
            ally.kind === 'hero' &&
            ally.hp < ally.maxHp &&
            clearShot(e, ally),
        ),
        4,
      );
      if (ally) {
        e.path = [];
        e.healTarget = ally.id;
        ally.hp = Math.min(
          ally.maxHp,
          ally.hp + 7 * (1 + (e.level - 1) * 0.1) * dt,
        );
        e.facing = ally.x >= e.x ? 1 : -1;
        continue;
      }
    }
    const victim =
      e.role === 'monk'
        ? undefined
        : nearest(e, s.units, Math.max(4, def.range));
    if (victim) {
      if (distanceBetween(e, victim) <= def.range && clearShot(e, victim)) {
        e.path = [];
        e.fighting = true;
        e.facing = victim.x >= e.x ? 1 : -1;
        if (e.role === 'archer')
          shoot(s, e, { type: 'unit', id: victim.id }, victim);
        else victim.hp -= e.damage * dt;
        continue;
      }
      e.path = findPath(e, victim);
    } else {
      if (!s.lots[e.target].owned) e.target = raidTarget(s, e).id;
      const destination = entrance(s.lots[e.target]);
      if (
        distanceBetween(e, destination) <= (e.role === 'archer' ? 5 : 1.3) &&
        clearShot(e, destination)
      ) {
        e.path = [];
        e.fighting = e.damage > 0;
        const lot = s.lots[e.target];
        if (e.role === 'archer')
          shoot(s, e, { type: 'lot', id: lot.id }, destination);
        else {
          lot.hp = Math.max(0, lot.hp - e.damage * dt);
          if (lot.hp <= 0) loseLot(s, lot);
        }
        continue;
      }
      e.path = findPath(e, destination);
    }
    walk(e, def.speed * dt);
  }
}
export function tick(s: State, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  // Fixed maximum step keeps interception and combat reliable at ×3 speed.
  for (
    let remaining = dt;
    remaining > 1e-8 && !s.won && !s.lost;
    remaining -= 0.1
  )
    tickStep(s, Math.min(0.1, remaining));
}
function tickStep(s: State, dt: number) {
  s.elapsed += dt;
  advanceEconomy(s, dt);
  if (humanLevel(s) > s.humanLevelAnnounced) {
    s.humanLevelAnnounced = humanLevel(s);
    announce(
      s,
      `Les humains passent au niveau ${humanLevel(s)}. Leurs défenses et leurs prochains renforts se renforcent.`,
    );
  }
  mobilize(s);
  const income = rates(s);
  for (const key of Object.keys(income) as (keyof Resources)[])
    s.resources[key] = Math.max(0, s.resources[key] + income[key] * dt);
  for (const r of s.recruits) r.remaining -= dt;
  for (const r of s.recruits.filter((r) => r.remaining <= 0)) {
    spawnUnit(s, r.kind);
    s.recruited++;
    announce(s, `${CREATURES[r.kind].name} a rejoint votre domaine.`);
  }
  s.recruits = s.recruits.filter((r) => r.remaining > 0);
  allocateWorkers(s);
  for (const u of s.units) {
    u.fighting = false;
    if (u.kind !== 'goblin' && u.task !== 'move') {
      if (u.task === 'idle') {
        const threat = nearest(u, s.enemies, 4.5);
        if (threat) assign(u, threat, 'defend', threat.id);
      }
      if (u.task === 'defend') {
        const threat = s.enemies.find((e) => e.id === u.target && e.hp > 0);
        if (threat) u.path = findPath(u, threat);
        else {
          u.task = 'idle';
          u.target = null;
          u.path = [];
        }
      }
      const threat = nearest(u, s.enemies, 1.5);
      if (threat) {
        u.fighting = true;
        u.facing = threat.x >= u.x ? 1 : -1;
        threat.hp -= armyDamage(s, u) * dt;
      }
    }
    if (!u.fighting && (u.task === 'sabotage' || u.task === 'hunt')) {
      const target =
        u.task === 'sabotage'
          ? s.sites.find(
              (site) => site.id === u.target && supplyActive(s, site),
            )
          : s.workers.find(
              (w) =>
                w.id === u.target &&
                w.hp > 0 &&
                supplyActive(s, s.sites[w.site]),
            );
      if (!target) {
        u.task = 'idle';
        u.target = null;
        u.path = [];
      } else if (distanceBetween(u, target) <= 1.5 && clearShot(u, target)) {
        u.fighting = true;
        u.facing = target.x >= u.x ? 1 : -1;
        target.hp = Math.max(0, target.hp - armyDamage(s, u) * dt);
        if ('repairAt' in target && target.hp === 0) {
          target.repairAt = s.elapsed + 90;
          target.recruitAt = target.repairAt;
          s.resources[target.kind] += 15;
          announce(
            s,
            `${SUPPLIES[target.kind].name} sabotée ! +15 ${SUPPLIES[target.kind].label.toLowerCase()}. Production coupée pendant au moins 90 s.`,
          );
        }
      } else u.path = findPath(u, target);
    }
    if (!u.fighting) walk(u, CREATURES[u.kind].speed * dt);
    if (!u.path.length) {
      if (u.task === 'move' || u.task === 'forage') {
        u.task = 'idle';
        u.idleTime = 0;
      }
      if (u.task === 'idle') {
        u.idleTime += dt;
        const home = entrance(s.lots[6]);
        if (
          !u.fighting &&
          !nearest(u, s.enemies, 4) &&
          Math.hypot(u.x - home.x, u.y - home.y) < 4
        )
          u.hp = Math.min(CREATURES[u.kind].hp, u.hp + 2 * dt);
        if (u.kind === 'goblin' && u.idleTime > 4 + (u.id % 3)) {
          const plots = s.lots.filter((l) => l.owned);
          const p = plots[Math.floor(s.elapsed / 8 + u.id) % plots.length];
          assign(
            u,
            { x: p.x + (u.id % 2 ? 1.5 : 6.5), y: p.y + 7.5 },
            'forage',
            null,
          );
        }
      }
    }
  }
  for (const lot of s.lots) {
    if (lot.construction) {
      const workers = s.units.filter(
        (u) => u.task === 'build' && u.target === lot.id && !u.path.length,
      );
      lot.construction.progress +=
        (dt * workers.length) / BUILDINGS[lot.construction.kind].duration;
      if (lot.construction.progress >= 1) {
        lot.kind = lot.construction.kind;
        lot.construction = null;
        lot.level = 1;
        lot.hp = lot.maxHp = 180;
        announce(s, `${BUILDINGS[lot.kind].name} est prête.`);
        for (const u of s.units.filter(
          (u) => u.task === 'build' && u.target === lot.id,
        )) {
          u.task = 'idle';
          u.target = null;
        }
      }
    }
    if (!lot.owned) {
      const attackers = s.units.filter(
        (u) =>
          u.hp > 0 &&
          !u.fighting &&
          u.task === 'attack' &&
          u.target === lot.id &&
          !u.path.length,
      );
      if (attackers.length) {
        const damage = attackers.reduce((n, u) => n + armyDamage(s, u), 0);
        lot.hp = Math.max(0, lot.hp - damage * dt);
        const retaliation =
          (lot.kind === 'hall'
            ? 18
            : lot.kind === 'guild'
              ? 14
              : lot.kind === 'tavern'
                ? 11
                : 7) *
          (1 + (humanLevel(s) - 1) * 0.12);
        for (const u of attackers)
          u.hp -= (retaliation * dt) / attackers.length;
        if (lot.hp <= 0) {
          lot.owned = true;
          lot.hp = lot.maxHp;
          s.captures++;
          s.resources.gold += lot.kind === 'hall' ? 150 : 65;
          s.resources.mana += 12;
          for (const u of s.units.filter(
            (u) => u.target === lot.id && u.task === 'attack',
          )) {
            u.task = 'idle';
            u.target = null;
            u.path = [];
          }
          announce(
            s,
            `${BUILDINGS[lot.kind].name} rejoint votre domaine. +${lot.kind === 'hall' ? 150 : 65} or.`,
          );
          for (const kind of ['guard', 'hero'] as const) {
            if (lot.kind === PRESSURE[kind].source) {
              s.mobilization[kind].active = false;
              s.mobilization[kind].nextRaidAt = null;
              announce(
                s,
                `${BUILDINGS[lot.kind].name} neutralisée. Les renforts sont coupés ; éliminez les ennemis encore dans les rues.`,
              );
            }
          }
        }
      }
    }
  }
  cleanupSupplies(s);
  advanceEnemies(s, dt);
  advanceProjectiles(s, dt);
  const defeated = s.enemies.filter((e) => e.hp <= 0);
  s.defeatedEnemies += defeated.length;
  s.resources.gold += defeated.length * 12;
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  for (const lot of s.lots.filter((l) => l.owned && l.hp > 0)) {
    if (!nearest(entrance(lot), s.enemies, 4))
      lot.hp = Math.min(lot.maxHp, lot.hp + dt * 1.5);
  }
  const fallen = s.units.filter((u) => u.hp <= 0);
  if (fallen.length && !s.lost)
    announce(
      s,
      `${fallen.length} créature${fallen.length > 1 ? 's sont tombées' : ' est tombée'}. Un repli permet de soigner les autres.`,
    );
  s.units = s.units.filter((u) => u.hp > 0);
  if (
    !s.lost &&
    hasBuilding(s, 'hall') &&
    hasBuilding(s, 'guild') &&
    !s.enemies.length &&
    !s.projectiles.length
  ) {
    s.won = true;
    announce(
      s,
      'La mairie et la guilde sont à vous. Le quartier est enfin soumis.',
    );
  }
}
