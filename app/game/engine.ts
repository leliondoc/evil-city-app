export type BuildingKind =
  | 'hq'
  | 'den'
  | 'canteen'
  | 'forge'
  | 'crypt'
  | 'hall'
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
export type Selection = { type: 'lot' | 'unit'; id: number };
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
      'Le dernier bastion des gens du coin. Prenez la mairie pour devenir le seigneur du quartier.',
    short: 'Objectif de conquête',
    art: 5,
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
  construction: null | { kind: BuildingKind; progress: number };
}
export interface Unit extends Point {
  id: number;
  kind: CreatureKind;
  hp: number;
  task: 'idle' | 'build' | 'attack' | 'move' | 'forage';
  path: Point[];
  target: number | null;
  idleTime: number;
  facing: number;
}
export interface State {
  resources: Resources;
  lots: Lot[];
  units: Unit[];
  elapsed: number;
  nextId: number;
  recruits: { kind: CreatureKind; remaining: number }[];
  notice: string;
  noticeUntil: number;
  journal: string[];
  won: boolean;
  captures: number;
  recruited: number;
}

export function createGame(): State {
  const kinds: BuildingKind[] = [
    'house',
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
    elapsed: 0,
    nextId: 1,
    lots: kinds.map((kind, id) => ({
      id,
      x: STARTS[id % 3],
      y: STARTS[Math.floor(id / 3)],
      kind,
      owned: [3, 6, 7].includes(id),
      hp: kind === 'hall' ? 360 : kind === 'tavern' ? 140 : 85,
      maxHp: kind === 'hall' ? 360 : kind === 'tavern' ? 140 : 85,
      level: 1,
      construction: null,
    })),
    units: [],
    recruits: [],
    notice: '',
    noticeUntil: 0,
    journal: ['Trois gobelins, un manoir… le quartier ne se doute de rien.'],
    won: false,
    captures: 0,
    recruited: 0,
  };
  for (let i = 0; i < 3; i++) spawnUnit(state, 'goblin');
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
  });
}
export function buildReason(s: State, id: number, kind: BuildingKind): string {
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
  for (const u of army(s)) assign(u, entrance(s.lots[6]), 'move', null);
  announce(s, 'Repli au manoir. Les blessés s’y rétabliront.');
}
export function moveUnit(s: State, id: number, point: Point) {
  const u = s.units.find((v) => v.id === id);
  if (!u) return;
  assign(u, point, 'move', null);
}
export function upgradeCost(l: Lot): Cost {
  return { gold: 80 * l.level, wood: 35 * l.level };
}
export function upgradeReason(s: State, id: number) {
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
  }
  for (const u of s.units) {
    if (u.kind === 'goblin' && (u.task === 'idle' || u.task === 'forage'))
      rate.wood += 0.22;
    if (u.kind !== 'skeleton') rate.food -= u.kind === 'minotaur' ? 0.15 : 0.05;
  }
  return rate;
}
export function tick(s: State, dt: number) {
  s.elapsed += dt;
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
    let distance = CREATURES[u.kind].speed * dt;
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
    if (!u.path.length) {
      if (u.task === 'move' || u.task === 'forage') {
        u.task = 'idle';
        u.idleTime = 0;
      }
      if (u.task === 'idle') {
        u.idleTime += dt;
        const home = entrance(s.lots[6]);
        if (Math.hypot(u.x - home.x, u.y - home.y) < 4)
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
        (u) => u.task === 'attack' && u.target === lot.id && !u.path.length,
      );
      if (attackers.length) {
        const forge = s.lots
          .filter((l) => l.owned && l.kind === 'forge')
          .reduce((n, l) => Math.max(n, l.level), 0);
        const damage =
          attackers.reduce(
            (n, u) =>
              n +
              CREATURES[u.kind].damage *
                (s.resources.food <= 0 && u.kind !== 'skeleton' ? 0.6 : 1),
            0,
          ) *
          (1 + Math.max(0, forge - 1) * 0.15);
        lot.hp = Math.max(0, lot.hp - damage * dt);
        const retaliation =
          lot.kind === 'hall' ? 18 : lot.kind === 'tavern' ? 11 : 7;
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
          if (lot.kind === 'hall') s.won = true;
        }
      }
    }
  }
  const fallen = s.units.filter((u) => u.hp <= 0);
  if (fallen.length)
    announce(
      s,
      `${fallen.length} créature${fallen.length > 1 ? 's sont tombées' : ' est tombée'}. Un repli permet de soigner les autres.`,
    );
  s.units = s.units.filter((u) => u.hp > 0);
}
