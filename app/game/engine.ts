import {
  ISLAND_SITES,
  isIslandPathCell,
  isIslandGroundCell,
} from './islandRoutes.ts';
import {
  createDomain,
  advanceDomain,
  advanceSpecialUnit,
  leaveCorpse,
  leaveDeath,
  monkDamage,
  haunt,
  isHaunted,
  exorcise,
  resurrect,
  type DomainState,
} from './domain.ts';
import {
  createStrategy,
  advanceStrategy,
  strategyUnit,
  towerOrder,
  divertEnemy,
  hitEnemy,
  hasResearch,
  spreadBraises,
  type StrategyState,
} from './strategy.ts';

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
export type CreatureKind =
  | 'goblin'
  | 'troll'
  | 'skeleton'
  | 'minotaur'
  | 'specter'
  | 'alchemist';
export type Point = { x: number; y: number };
export type Resources = {
  gold: number;
  wood: number;
  food: number;
  mana: number;
};
export type Cost = Partial<Resources>;
export const RESOURCE_LABELS: Record<keyof Resources, string> = {
  gold: 'or',
  wood: 'bois',
  food: 'viande',
  mana: 'essence',
};
export type Selection =
  | {
      type:
        | 'lot'
        | 'unit'
        | 'enemy'
        | 'worker'
        | 'resource'
        | 'guildHero'
        | 'tower';
      id: number;
    }
  | { type: 'none'; id?: never }
  | { type: 'units'; ids: number[]; id?: never };
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
      'Le cœur de votre domaine. Les gobelins y déposent leurs récoltes ; ses caves distillent l’essence.',
    short: 'Dépôt et essence',
    art: 0,
    cost: {},
    duration: 0,
  },
  den: {
    name: 'Tanière gobeline',
    description:
      'Des lits de fortune, une odeur douteuse. Accueille 6 créatures de plus et leur permet de se reposer.',
    short: '+6 places · repos',
    art: 1,
    cost: { gold: 70, wood: 25 },
    duration: 18,
  },
  canteen: {
    name: 'Cantine des hordes',
    description:
      'La cantine sert les vivres rapportés par vos gobelins. Elle réduit la consommation de 20 % par niveau, jusqu’à 60 %, et permet de manger sur place.',
    short: '−20 % de consommation',
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
    cost: { gold: 180, wood: 75 },
    duration: 24,
  },
  crypt: {
    name: 'Crypte des murmures',
    description:
      'Débloque les squelettes et spectres, produit de l’essence et conserve les dépouilles pour les rituels. Les morts-vivants viennent s’y reconstituer.',
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
      'Une maison bien tranquille. Une fois conquise, elle peut être transformée.',
    short: 'Parcelle à transformer',
    art: 6,
    cost: {},
    duration: 0,
  },
  tavern: {
    name: 'Auberge du Merle',
    description:
      'Le rendez-vous du quartier. Sa conquête coupe les livraisons humaines et permet de transformer le bâtiment.',
    short: 'Coupe une route humaine',
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
  alchemist: {
    name: 'Alchimiste',
    job: 'Maître des mixtures',
    description:
      'Le chaman du pack projette ses mixtures à distance. Avec le solvant alchimique, ses cibles deviennent vulnérables aux armes enflammées et aux braises.',
    art: 5,
    cost: { gold: 100, mana: 35, food: 15 },
    hp: 60,
    damage: 3,
    speed: 1.8,
    size: 38,
    population: 1,
  },
  specter: {
    name: 'Spectre',
    job: 'Saboteur des ombres',
    description:
      'Hante un bâtiment humain pendant 30 s : ses livraisons et renforts s’arrêtent. Un moine peut le provoquer en duel dans la rue ; il riposte ou fuit sur votre ordre. Ne mange pas et ne conquiert pas.',
    art: 4,
    cost: { gold: 60, mana: 30 },
    hp: 50,
    damage: 0,
    speed: 2.4,
    size: 38,
    population: 1,
  },
  goblin: {
    name: 'Gobelin',
    job: 'Bâtisseur',
    description:
      'Construit vos bâtiments et récolte or, bois et vivres entre deux chantiers. Petit, efficace, peu porté sur les combats.',
    art: 0,
    cost: { gold: 15, food: 4 },
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
    cost: { gold: 90, food: 30 },
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
  'den',
  'canteen',
  'crypt',
  'forge',
];
export const BUILD_PREREQUISITES: Partial<Record<BuildingKind, BuildingKind>> =
  {
    canteen: 'den',
    crypt: 'canteen',
    forge: 'crypt',
  };
export function buildUnlockReason(s: State, kind: BuildingKind): string {
  const required = BUILD_PREREQUISITES[kind];
  if (!required || hasBuilding(s, required)) return '';
  return `Terminez ${BUILDINGS[required].name.toLowerCase()} pour débloquer ce bâtiment.`;
}
/** Information available before selecting a parcel, shared with the construction menu. */
export function buildMenuReason(s: State, kind: BuildingKind): string {
  const missing = Object.entries(BUILDINGS[kind].cost)
    .filter(([key, amount]) => s.resources[key as keyof Resources] < amount)
    .map(
      ([key, amount]) =>
        `${Math.ceil(amount - s.resources[key as keyof Resources])} ${RESOURCE_LABELS[key as keyof Resources]}`,
    );
  return [
    buildUnlockReason(s, kind),
    missing.length ? `Il manque : ${missing.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
export const RECRUIT_OPTIONS: CreatureKind[] = [
  'goblin',
  'troll',
  'skeleton',
  'minotaur',
  'specter',
  'alchemist',
];
export const BOARD = 32;
export const STARTS = [2, 12, 22];
export interface Lot {
  /** The visible guild defenders have left their posts; never duplicate them. */
  garrisonReleased?: boolean;
  hauntedUntil?: number;
  hauntedBy?: number;
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
  loot?: Cost;
  nextRestAt?: number;
  nextMealAt?: number;
  activityProgress?: number;
  hauntReadyAt?: number;
  moving?: boolean;
  gathering?: {
    site: number;
    kind: Supply;
    automatic?: boolean;
    phase: 'outbound' | 'harvest' | 'return';
    cargo: number;
    progress: number;
  };
  id: number;
  kind: CreatureKind;
  hp: number;
  task:
    | 'tower'
    | 'collect-loot'
    | 'deliver-loot'
    | 'idle'
    | 'build'
    | 'attack'
    | 'move'
    | 'forage'
    | 'defend'
    | 'sabotage'
    | 'hunt'
    | 'haunt'
    | 'duel'
    | 'collect'
    | 'deliver'
    | 'bribe'
    | 'eat'
    | 'rest'
    | 'restore';
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
    range: 1.9,
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
      'Il soigne ses alliés, riposte aux assaillants et chasse les spectres. Ses dégâts sont doublés contre les squelettes et spectres. Il ne peut pas endommager vos bâtiments.',
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
  /** A living aggressor is pursued without a distance or timeout leash. */
  pursuitTarget?: number;
  aggressors?: number[];
  revived?: boolean;
  resurrecting?: number;
  resurrectionProgress?: number;
  resurrectionHp?: number;
  solventUntil?: number;
  burningUntil?: number;
  comboAt?: number;
  spreadFire?: boolean;
  /** Specter being tracked, then challenged outside the haunted property. */
  exorcising?: number;
  exorcismStreet?: Point;
  moving?: boolean;
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
    ? { ...ENEMIES.guard, range: 1.9 }
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
    time: 540,
    warning: 25,
    interval: 100,
    source: 'hall',
  },
  hero: {
    territory: 6 / 9,
    time: 480,
    warning: 35,
    interval: 140,
    source: 'guild',
  },
  levelEvery: 120,
  firstUpgradeAt: 360,
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
    art: 'tree-3',
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
const SUPPLY_LOCATIONS: (Point & { kind: Supply; home: number; hp: number })[] =
  [
    { kind: 'food', home: 1, x: 19, y: 4.5, hp: 110 },
    { kind: 'gold', home: 5, ...ISLAND_SITES.gold, hp: 140 },
    { kind: 'wood', home: 8, ...ISLAND_SITES.wood, hp: 120 },
  ];
export interface HumanWorker extends Point {
  taxed?: boolean;
  recovery?: { corpseId: number; returning: boolean };
  moving?: boolean;
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
  return (
    !s.lots[site.home].owned && site.hp > 0 && !isHaunted(s, s.lots[site.home])
  );
}
/** A worker stands beside the resource, never inside its drawing. */
export function resourceApproach(
  site: Pick<ResourceSite, 'kind' | 'x' | 'y'>,
): Point {
  return site.kind === 'wood'
    ? { x: site.x + 0.75, y: site.y + 0.25 }
    : site.kind === 'gold'
      ? { x: site.x - 1, y: site.y }
      : { x: site.x, y: site.y };
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
    path: findPath(home, resourceApproach(site)),
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
  if (target.type !== 'resource' && target.type !== 'worker')
    return 'Choisissez un paysan ou un site de production.';
  const error = raidSupplyReason(s, target);
  if (error) return error;
  const point =
    target.type === 'resource'
      ? resourceApproach(s.sites.find((site) => site.id === target.id)!)
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
  }
  const living = s.workers.filter((w) => w.hp > 0);
  if (
    living.length < HUMAN_WORKER_CAP &&
    s.elapsed >= s.economy.workerReadyAt &&
    suppliesAvailable(s, { gold: 8, food: 5 })
  ) {
    const count = (site: ResourceSite) =>
      living.filter((w) => w.site === site.id).length;
    const site = s.sites
      .filter(
        (site) =>
          supplyActive(s, site) &&
          s.elapsed >= site.recruitAt &&
          count(site) < 2,
      )
      .sort((a, b) => count(a) - count(b) || a.id - b.id)[0];
    if (site) {
      spendSupplies(s, { gold: 8, food: 5 });
      spawnWorker(s, site);
      s.economy.workerReadyAt = s.elapsed + HUMAN_WORKER_SECONDS;
    }
  }
  for (const w of s.workers) {
    const site = s.sites[w.site];
    if (w.hp <= 0 || !supplyActive(s, site)) continue;
    if (w.recovery) continue;
    walk(s, w, 1.8 * dt);
    if (w.path.length) continue;
    if (w.phase === 'outbound') {
      w.phase = 'harvest';
      w.progress = 0;
    }
    if (w.phase === 'harvest') {
      w.facing = site.x >= w.x ? 1 : -1;
      w.progress += dt;
      if (w.progress >= 6) {
        w.cargo = 10;
        w.phase = 'return';
        w.path = findPath(w, entrance(s.lots[site.home]));
      }
    } else if (w.phase === 'return') {
      s.economy.stocks[site.kind] += w.cargo;
      s.economy.delivered[site.kind] += w.cargo;
      resourceGain(s, w, site.kind, w.cargo);
      w.cargo = 0;
      w.phase = 'outbound';
      w.path = findPath(w, resourceApproach(site));
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
      leaveCorpse(s, w, 'human');
      creditResource(s, site.kind, w.cargo || 4);
      site.recruitAt = s.elapsed + 40;
      announce(
        s,
        `${SUPPLIES[site.kind].worker} éliminé. Livraison perdue ; remplacement dans au moins 40 s.`,
      );
    }
  }
  s.workers = s.workers.filter(
    (w) =>
      w.hp > 0 && !s.lots[s.sites[w.site].home].owned && s.sites[w.site].hp > 0,
  );
}
export interface ResourceGain extends Point {
  id: number;
  kind: Supply;
  amount: number;
  at: number;
}
export const RESOURCE_GAIN_LIFETIME = 1.8;
export function resourceGain(
  s: State,
  point: Point,
  kind: Supply,
  amount: number,
) {
  if (amount <= 0) return;
  s.resourceGains.push({
    id: s.nextId++,
    x: point.x,
    y: point.y,
    kind,
    amount,
    at: s.elapsed,
  });
}
export interface State {
  strategy: StrategyState;
  domain: DomainState;
  resourceGains: ResourceGain[];
  resources: Resources;
  economy: {
    stocks: Record<Supply, number>;
    delivered: Record<Supply, number>;
    level: number;
    nextUpgradeAt: number;
    workerReadyAt: number;
  };
  workers: HumanWorker[];
  sites: ResourceSite[];
  lots: Lot[];
  units: Unit[];
  elapsed: number;
  nextId: number;
  recruits: {
    kind: CreatureKind;
    remaining: number;
    duration?: number;
    source?: number;
  }[];
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

export const HUMAN_WORKER_CAP = 6;
export const HUMAN_WORKER_SECONDS = 20;
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
    domain: createDomain(),
    strategy: createStrategy(),
    resourceGains: [],
    resources: { gold: 35, wood: 0, food: 24, mana: 0 },
    economy: {
      stocks: { gold: 45, wood: 25, food: 35 },
      delivered: { gold: 0, wood: 0, food: 0 },
      level: 1,
      nextUpgradeAt: PRESSURE.firstUpgradeAt,
      workerReadyAt: HUMAN_WORKER_SECONDS,
    },
    workers: [],
    sites: SUPPLY_LOCATIONS.map((site, id) => ({
      ...site,
      id,
      maxHp: site.hp,
      repairAt: 0,
      recruitAt: 0,
    })),
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
    journal: [
      'Un manoir, aucun ouvrier. Recrutez votre premier gobelin pour lancer le domaine.',
    ],
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
  return state;
}
export function entrance(lot: Lot): Point {
  return { x: lot.x + 4, y: lot.y + 7.5 };
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
export const RESOURCE_CAP = 1000;
/** All player income and loot share the same storage limit. Returns the credited amount. */
export function creditResource(
  s: State,
  kind: keyof Resources,
  amount: number,
) {
  const credited = Math.min(
    Math.max(0, amount),
    Math.max(0, RESOURCE_CAP - s.resources[kind]),
  );
  s.resources[kind] += credited;
  return credited;
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
function buildingBlocked(x: number, y: number) {
  if (x < 0 || y < 0 || x >= BOARD || y >= BOARD)
    return !isIslandGroundCell(x, y);
  return (
    STARTS.some((a) => x >= a + 1 && x <= a + 6) &&
    STARTS.some((b) => y >= b + 1 && y <= b + 5)
  );
}
function navigationLot(x: number, y: number) {
  const col = STARTS.findIndex((start) => x >= start && x < start + 8);
  const row = STARTS.findIndex((start) => y >= start && y < start + 8);
  return col < 0 || row < 0
    ? null
    : { id: row * 3 + col, x: STARTS[col], y: STARTS[row] };
}
function supplyGateRow(lot: { id: number; y: number }) {
  const site = SUPPLY_LOCATIONS.find((site) => site.home === lot.id);
  return site ? Math.floor(resourceApproach(site).y) - lot.y : -1;
}
function walkableCell(x: number, y: number) {
  if (x < 0 || y < 0 || x >= BOARD || y >= BOARD) return isIslandPathCell(x, y);
  const lot = navigationLot(x, y);
  if (!lot) return true; // The public street network.
  const dx = x - lot.x,
    dy = y - lot.y;
  // Front courtyard and driveway; the rest of each plot is an obstacle.
  if (dy === 7 && dx >= 1 && dx <= 6) return true;
  if (dx === 4 && dy === 6) return true;
  const row = supplyGateRow(lot);
  return row >= 0 && dx === 7 && dy >= row && dy <= 7;
}
function navigationPoint(x: number, y: number): Point {
  // Align the driveway and its street exit with the visible 40 px gate.
  const gate = x % 10 === 6 && (y % 10 >= 8 || y % 10 === 0);
  return { x: x + (gate ? 0 : 0.5), y: y + 0.5 };
}
const PATH_MIN_X = -14;
const PATH_MAX_Y = 36;
const PATH_WIDTH = BOARD - PATH_MIN_X;
function navigationTarget(point: Point): Point {
  let x = Math.min(BOARD - 1, Math.max(PATH_MIN_X, Math.floor(point.x)));
  let y = Math.min(PATH_MAX_Y, Math.max(0, Math.floor(point.y)));
  const lot = navigationLot(x, y);
  if (!walkableCell(x, y) && lot) {
    x = lot.x + 4;
    y = lot.y + 7;
  }
  return navigationPoint(x, y);
}
function crossesGate(
  x: number,
  y: number,
  nx: number,
  ny: number,
  sideAccess: Set<number>,
) {
  const a = navigationLot(x, y),
    b = navigationLot(nx, ny);
  if (a?.id === b?.id) return true;
  const lot = a || b;
  if (!lot) return true;
  const ix = a ? x : nx,
    iy = a ? y : ny;
  const ox = a ? nx : x,
    oy = a ? ny : y;
  return (
    (ix === lot.x + 4 && iy === lot.y + 7 && oy === lot.y + 8) ||
    (sideAccess.has(lot.id) &&
      ix === lot.x + 7 &&
      ox === lot.x + 8 &&
      iy === lot.y + supplyGateRow(lot))
  );
}
export function findPath(from: Point, to: Point): Point[] {
  const sx = Math.min(BOARD - 1, Math.max(PATH_MIN_X, Math.floor(from.x))),
    sy = Math.min(PATH_MAX_Y, Math.max(0, Math.floor(from.y)));
  const destination = navigationTarget(to),
    tx = Math.floor(destination.x),
    ty = Math.floor(destination.y);
  if (!walkableCell(sx, sy)) return [];
  const sourceLot = navigationLot(sx, sy)?.id,
    targetLot = navigationLot(tx, ty)?.id;
  const sideAccess = new Set<number>();
  for (const p of [from, destination]) {
    const lot = navigationLot(p.x, p.y);
    if (lot && p.x >= lot.x + 7) sideAccess.add(lot.id);
  }
  const start = sy * PATH_WIDTH + sx - PATH_MIN_X,
    goal = ty * PATH_WIDTH + tx - PATH_MIN_X;
  if (start === goal) return [destination];
  const prev = new Int32Array(PATH_WIDTH * (PATH_MAX_Y + 1)).fill(-1);
  prev[start] = start;
  const queue = [start];
  for (let head = 0; head < queue.length && prev[goal] === -1; head++) {
    const id = queue[head],
      x = (id % PATH_WIDTH) + PATH_MIN_X,
      y = Math.floor(id / PATH_WIDTH);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        next = ny * PATH_WIDTH + nx - PATH_MIN_X;
      if (!walkableCell(nx, ny) || prev[next] !== -1) continue;
      const lot = navigationLot(nx, ny);
      // A third-party garden must never serve as a shortcut between streets.
      if (lot && lot.id !== sourceLot && lot.id !== targetLot) continue;
      if (!crossesGate(x, y, nx, ny, sideAccess)) continue;
      prev[next] = id;
      queue.push(next);
    }
  }
  if (prev[goal] === -1) return [];
  const path: Point[] = [];
  for (let p = goal; p !== start; p = prev[p])
    path.push(
      navigationPoint(
        (p % PATH_WIDTH) + PATH_MIN_X,
        Math.floor(p / PATH_WIDTH),
      ),
    );
  // Start at the current cell's waypoint so a fresh order cannot cut a corner.
  path.push(navigationPoint(sx, sy));
  return path.reverse();
}
function pursue(u: Point & { path: Point[] }, point: Point) {
  const destination = navigationTarget(point),
    last = u.path.at(-1);
  if (last && last.x === destination.x && last.y === destination.y) return;
  const next = u.path[0];
  // Finish the current segment before changing direction, including at ×3 speed.
  u.path = findPath(next || u, destination);
}
export function assign(
  u: Unit,
  point: Point,
  task: Unit['task'],
  target: number | null,
) {
  if (u.task === 'deliver-loot' && task !== 'deliver-loot') u.loot = undefined;
  u.path = findPath(u, point);
  u.task = task;
  u.target = target;
  u.idleTime = 0;
  u.activityProgress = 0;
}
function spawnUnit(s: State, kind: CreatureKind, source = 6) {
  const home = entrance(s.lots[source]),
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
    nextRestAt: s.elapsed + 90 + (id % 15),
    nextMealAt: s.elapsed + 65 + (id % 15),
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
  const unavailable = buildMenuReason(s, kind);
  if (unavailable) return unavailable;
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
      (u) =>
        u.hp > 0 &&
        u.kind === 'goblin' &&
        ['idle', 'forage', 'eat', 'rest', 'collect'].includes(u.task),
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
  if (kind === 'goblin') {
    const workforce = goblinWorkforce(s);
    if (workforce.total + workforce.queued >= GOBLIN_CAP)
      return `Limite de ${GOBLIN_CAP} gobelins atteinte, recrutements en cours inclus.`;
  }
  if (kind === 'alchemist' && !hasBuilding(s, 'crypt'))
    return 'Construisez une crypte pour recruter un alchimiste.';
  if (kind === 'troll' && !hasBuilding(s, 'forge'))
    return 'Construisez une forge pour recruter les trolls.';
  if (kind === 'skeleton' && !hasBuilding(s, 'crypt'))
    return 'Construisez une crypte pour éveiller les squelettes.';
  if (kind === 'specter' && !hasBuilding(s, 'crypt'))
    return 'Construisez une crypte pour invoquer un spectre.';
  if (
    kind === 'minotaur' &&
    (!hasBuilding(s, 'forge') || !hasBuilding(s, 'crypt'))
  )
    return 'Le Minotaure exige une forge et une crypte.';
  if (population(s) + CREATURES[kind].population > capacity(s))
    return 'Plus de place. Construisez ou améliorez une tanière.';
  if (!canAfford(s, CREATURES[kind].cost)) {
    const missing = Object.entries(CREATURES[kind].cost)
      .filter(([key, amount]) => s.resources[key as keyof Resources] < amount)
      .map(
        ([key, amount]) =>
          `${Math.ceil(amount - s.resources[key as keyof Resources])} ${RESOURCE_LABELS[key as keyof Resources]}`,
      );
    return `Il manque : ${missing.join(', ')}.${s.resources.food < (CREATURES[kind].cost.food ?? 0) ? ' La cantine produit la viande.' : ''}`;
  }
  return '';
}
export function recruit(s: State, kind: CreatureKind) {
  const error = recruitReason(s, kind);
  if (error) return error;
  pay(s, CREATURES[kind].cost);
  const duration = kind === 'minotaur' ? 15 : 6;
  s.recruits.push({ kind, remaining: duration, duration });
  announce(s, `${CREATURES[kind].name} en route vers votre manoir.`);
  return '';
}
export function army(s: State) {
  return s.units.filter(
    (u) =>
      u.hp > 0 &&
      (u.kind !== 'goblin' || hasResearch(s, 'embers')) &&
      u.kind !== 'specter' &&
      !['tower', 'collect-loot', 'deliver-loot'].includes(u.task),
  );
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
/** Right-click orders apply only to the selected creature. */
export function commandUnit(
  s: State,
  id: number,
  target: Selection | null,
  point: Point,
): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  const unit = s.units.find((u) => u.id === id && u.hp > 0);
  if (!unit) return 'Cette créature n’est plus disponible.';
  if (unit.kind === 'goblin' && target?.type === 'resource')
    return gather(s, unit.id, target.id);
  if (target?.type === 'tower') return towerOrder(s, target.id, id);
  const lot =
    target?.type === 'lot'
      ? s.lots[target.id]
      : target?.type === 'guildHero'
        ? s.lots[0]
        : undefined;
  const hostile =
    target?.type === 'enemy' ||
    target?.type === 'worker' ||
    target?.type === 'resource' ||
    (lot && !lot.owned && lot.kind !== 'empty');
  if (hostile && unit.kind === 'specter') {
    if (lot) return haunt(s, lot.id, unit.id);
    return 'Le spectre hante les bâtiments. Clic droit sur une propriété humaine.';
  }
  if (hostile && unit.kind === 'goblin' && !hasResearch(s, 'embers'))
    return 'Les gobelins construisent. Sélectionnez un combattant pour attaquer.';
  if (target?.type === 'enemy') {
    const enemy = s.enemies.find((e) => e.id === target.id && e.hp > 0);
    if (!enemy) return 'Cet ennemi n’est plus dans le quartier.';
    assign(unit, enemy, 'defend', enemy.id);
    announce(
      s,
      `${CREATURES[unit.kind].name} intercepte ${enemyDefinition(enemy).name.toLowerCase()}.`,
    );
  } else if (lot && !lot.owned && lot.kind !== 'empty') {
    const error = attackReason(s, lot.id);
    if (error) return error;
    assign(unit, entrance(lot), 'attack', lot.id);
    announce(
      s,
      `${CREATURES[unit.kind].name} attaque ${BUILDINGS[lot.kind].name.toLowerCase()}.`,
    );
  } else if (target?.type === 'worker' || target?.type === 'resource') {
    const error = raidSupplyReason(s, target);
    if (error) return error;
    const destination =
      target.type === 'resource'
        ? resourceApproach(s.sites.find((site) => site.id === target.id)!)
        : s.workers.find((worker) => worker.id === target.id)!;
    assign(
      unit,
      destination,
      target.type === 'resource' ? 'sabotage' : 'hunt',
      target.id,
    );
    announce(
      s,
      `${CREATURES[unit.kind].name} part couper le ravitaillement humain.`,
    );
  } else {
    moveUnit(s, id, point);
  }
  return '';
}
export function commandUnits(
  s: State,
  ids: number[],
  target: Selection | null,
  point: Point,
): string {
  const living = [...new Set(ids)].filter((id) =>
    s.units.some((u) => u.id === id && u.hp > 0),
  );
  if (!living.length)
    return 'Aucune créature sélectionnée n’est encore disponible.';
  if (living.length === 1) return commandUnit(s, living[0], target, point);
  if (target?.type === 'tower') {
    const tower = s.strategy.towers[target.id];
    const chosen = living.find(
      (id) =>
        !tower?.owned ||
        s.units.some(
          (u) =>
            u.id === id && ['goblin', 'skeleton', 'specter'].includes(u.kind),
        ),
    );
    return chosen === undefined
      ? 'Affectez un gobelin, un squelette ou un spectre à cette tour.'
      : commandUnit(s, chosen, target, point);
  }
  let ordered = 0;
  let error = '';
  for (const id of living) {
    const result = commandUnit(s, id, target, point);
    if (result) error ||= result;
    else ordered++;
  }
  if (!ordered) return error;
  announce(
    s,
    `Ordre donné à ${ordered} créatures.${ordered < living.length ? ' Les gobelins restent à leur tâche : ils ne combattent pas.' : ''}`,
  );
  return '';
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
export function foodBalance(s: State) {
  const production = Math.round(harvestRates(s).food * 60);
  const kitchen = Math.max(
    0,
    ...s.lots
      .filter((l) => l.owned && l.kind === 'canteen' && !l.construction)
      .map((l) => l.level),
  );
  const rawConsumption = s.units.reduce(
    (total, u) =>
      total +
      (u.kind === 'skeleton' || u.kind === 'specter'
        ? 0
        : u.kind === 'minotaur'
          ? 9
          : 3),
    0,
  );
  const consumption = Math.ceil(
    rawConsumption * (1 - Math.min(0.6, kitchen * 0.2)),
  );
  return { production, consumption, net: production - consumption };
}
export const GOBLIN_CAP = 6;
export const GOBLIN_LOAD = 30;
const GOBLIN_HARVEST_PER_SECOND = 0.9;
const GOBLIN_HARVEST_SECONDS = 4;
const GOBLIN_HAUL_SPEED = 1.5;
function gathers(unit: Unit, kind: Supply) {
  return (
    unit.hp > 0 &&
    unit.kind === 'goblin' &&
    (unit.task === 'idle' || unit.task === 'forage') &&
    unit.gathering?.kind === kind
  );
}
function gatheringApproach(site: ResourceSite, u: Unit): Point {
  const p = resourceApproach(site);
  return site.kind === 'wood'
    ? { x: p.x, y: p.y + (u.id % 3) * 1.1 }
    : site.kind === 'gold'
      ? { x: p.x - (u.id % 2) * 0.7, y: p.y }
      : p;
}
/** Orders and automatic gathering use the same visible resource sites. */
export function gather(
  s: State,
  unitId: number,
  siteId: number,
  automatic = false,
): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  const u = s.units.find(
    (v) => v.id === unitId && v.hp > 0 && v.kind === 'goblin',
  );
  const site = s.sites.find((v) => v.id === siteId);
  if (!u || !site)
    return 'Choisissez un gobelin et une source de bois, d’or ou de vivres.';
  if (site.hp <= 0) return 'Ce site est détruit : attendez sa réparation.';
  const point = gatheringApproach(site, u);
  if (!findPath(u, point).length && distanceBetween(u, point) >= 1)
    return 'Cette ressource est inaccessible.';
  if ((u.gathering?.cargo ?? 0) > 0 && u.gathering?.site !== site.id)
    return 'Déposez le chargement actuel au manoir avant de changer de ressource.';
  u.gathering =
    u.gathering?.site === site.id
      ? u.gathering
      : {
          site: site.id,
          kind: site.kind,
          phase: 'outbound',
          cargo: 0,
          progress: 0,
        };
  u.gathering.automatic = automatic;
  const returning = u.gathering.cargo > 0;
  u.gathering.phase = returning ? 'return' : 'outbound';
  u.gathering.progress = 0;
  assign(u, returning ? entrance(s.lots[6]) : point, 'forage', site.id);
  return '';
}
export function gatheringText(u: Unit) {
  const g = u.gathering;
  if (!g || u.task !== 'forage') return 'Disponible';
  const name = g.kind === 'wood' ? 'bois' : g.kind === 'gold' ? 'or' : 'vivres';
  return g.phase === 'return'
    ? `Rapporte ${g.cargo} ${name}`
    : g.phase === 'harvest'
      ? `Récolte ${g.kind === 'gold' ? 'de l’or' : g.kind === 'food' ? 'des vivres' : 'du bois'}`
      : `Rejoint la source de ${name}`;
}
export function harvestRates(s: State): Record<Supply, number> {
  const result = { wood: 0, gold: 0, food: 0 };
  for (const u of s.units) {
    if (
      u.hp <= 0 ||
      u.kind !== 'goblin' ||
      !['idle', 'forage'].includes(u.task)
    )
      continue;
    const kind = u.gathering?.kind ?? automaticSite(s, u)?.kind;
    if (kind) result[kind] += GOBLIN_HARVEST_PER_SECOND;
  }
  return result;
}
function automaticSite(s: State, u: Unit) {
  const targets: Record<Supply, number> = { gold: 80, wood: 25, food: 24 };
  const score = (site: ResourceSite) => {
    const incoming = s.units
      .filter(
        (v) =>
          v.id !== u.id &&
          v.hp > 0 &&
          ['idle', 'forage'].includes(v.task) &&
          v.gathering?.kind === site.kind,
      )
      .reduce((sum, v) => sum + (v.gathering!.cargo || GOBLIN_LOAD), 0);
    return (
      (targets[site.kind] - s.resources[site.kind] - incoming) /
      targets[site.kind]
    );
  };
  return s.sites
    .filter((site) => site.hp > 0 && s.resources[site.kind] < RESOURCE_CAP)
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        ['gold', 'wood', 'food'].indexOf(a.kind) -
          ['gold', 'wood', 'food'].indexOf(b.kind),
    )[0];
}
function advanceGathering(s: State, u: Unit, dt: number): boolean {
  if (u.kind !== 'goblin') return false;
  if (u.task === 'idle') {
    const site =
      u.gathering && (!u.gathering.automatic || u.gathering.cargo > 0)
        ? s.sites.find((v) => v.id === u.gathering?.site)
        : automaticSite(s, u);
    if (!site) return false;
    // Deliver a retained load after an interrupted trip, even if its source was destroyed.
    if (u.gathering && u.gathering.cargo > 0) {
      u.gathering.phase = 'return';
      assign(u, entrance(s.lots[6]), 'forage', site.id);
    } else if (gather(s, u.id, site.id, u.gathering?.automatic ?? true))
      return false;
  }
  if (u.task !== 'forage' || !u.gathering) return false;
  const g = u.gathering;
  const site = s.sites.find((v) => v.id === g.site);
  if (!site || (site.hp <= 0 && g.cargo === 0)) {
    u.task = 'idle';
    u.path = [];
    u.target = null;
    u.gathering = undefined;
    return true;
  }
  const destination =
    g.phase === 'return' ? entrance(s.lots[6]) : gatheringApproach(site, u);
  if (!u.path.length && distanceBetween(u, destination) >= 1)
    u.path = findPath(u, destination);
  walk(s, u, CREATURES.goblin.speed * GOBLIN_HAUL_SPEED * dt);
  if (u.path.length || distanceBetween(u, destination) >= 1) return true;
  if (g.phase === 'return') {
    const amount = creditResource(s, g.kind, g.cargo);
    if (amount > 0) resourceGain(s, u, g.kind, amount);
    g.cargo = 0;
    g.progress = 0;
    g.phase = 'outbound';
    u.task = 'idle';
    u.target = null;
    return true;
  }
  g.phase = 'harvest';
  u.facing = site.x >= u.x ? 1 : -1;
  g.progress += dt;
  // Material resources enter storage only after a complete physical round trip.
  if (g.progress >= GOBLIN_HARVEST_SECONDS) {
    g.cargo = GOBLIN_LOAD;
    g.phase = 'return';
    g.progress = 0;
    assign(u, entrance(s.lots[6]), 'forage', site.id);
  }
  return true;
}
export function goblinWorkforce(s: State) {
  const goblins = s.units.filter((u) => u.kind === 'goblin' && u.hp > 0);
  const wood = goblins.filter((u) => gathers(u, 'wood')).length;
  const gold = goblins.filter((u) => gathers(u, 'gold')).length;
  const food = goblins.filter((u) => gathers(u, 'food')).length;
  const building = goblins.filter((u) => u.task === 'build').length;
  return {
    total: goblins.length,
    wood,
    gold,
    food,
    building,
    other: goblins.length - wood - gold - food - building,
    queued: s.recruits.filter((r) => r.kind === 'goblin').length,
  };
}
export function rates(s: State): Resources {
  const rate: Resources = { gold: 0, wood: 0, food: 0, mana: 0 };
  for (const l of s.lots.filter((l) => l.owned)) {
    const n = l.level;
    if (l.kind === 'hq') {
      rate.mana += 0.18 * n;
    }
    if (l.kind === 'crypt') rate.mana += 0.4 * n;
    if (l.kind === 'hall') {
      rate.mana += 0.5;
    }
    if (l.kind === 'guild') rate.mana += 0.3 * n;
  }
  rate.food = -foodBalance(s).consumption / 60;
  return rate;
}
const distanceBetween = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function atEntrance(u: Point & { path: Point[] }, lot: Lot) {
  return !u.path.length && distanceBetween(u, entrance(lot)) < 0.75;
}
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
type Walker = Unit | Enemy | HumanWorker;
function inStreet(point: Point) {
  const x = Math.floor(point.x),
    y = Math.floor(point.y);
  return !navigationLot(x, y) && walkableCell(x, y);
}
function trafficDistance(
  s: State,
  actor: Walker,
  dx: number,
  dy: number,
  distance: number,
) {
  const destination = {
    x: actor.x + dx * distance,
    y: actor.y + dy * distance,
  };
  // Courtyards stay free: units must be able to assemble at a building entrance.
  if (!inStreet(actor) && !inStreet(destination)) return distance;
  const ownArmy = s.units.some((unit) => unit.id === actor.id);
  const goal = actor.path.at(-1);
  let allowed = distance;
  for (const other of [...s.units, ...s.enemies, ...s.workers]) {
    if (other.id === actor.id || other.hp <= 0 || !inStreet(other)) continue;
    const forward = (other.x - actor.x) * dx + (other.y - actor.y) * dy;
    const sideways = Math.abs(
      (other.x - actor.x) * dy - (other.y - actor.y) * dx,
    );
    const gap =
      ('kind' in actor && actor.kind === 'minotaur') ||
      ('kind' in other && other.kind === 'minotaur')
        ? 1.6
        : 1.15;
    if (forward < -0.02 || forward > allowed + gap || sideways >= gap * 0.8)
      continue;
    const friendly = ownArmy === s.units.some((unit) => unit.id === other.id);
    // Combat handles opponents; civilian traffic must never blockade construction.
    if (!friendly) continue;
    // The marching file opens into combat positions around an engaged ally.
    if ('fighting' in other && other.fighting) continue;
    const next = other.path.find(
      (point) => distanceBetween(other, point) > 0.02,
    );
    if (!next) continue;
    if (friendly && next) {
      const length = distanceBetween(other, next);
      const alignment =
        ((next.x - other.x) * dx + (next.y - other.y) * dy) / length;
      const otherGoal = other.path.at(-1);
      const sameDestination =
        goal && otherGoal && distanceBetween(goal, otherGoal) < 0.1;
      if (sameDestination) {
        const remaining = (walker: Walker) =>
          walker.path.reduce(
            (total, p, i) =>
              total + distanceBetween(i ? walker.path[i - 1] : walker, p),
            0,
          );
        const difference = remaining(actor) - remaining(other);
        if (
          difference < -0.02 ||
          (Math.abs(difference) <= 0.02 && actor.id < other.id)
        )
          continue;
      }
      // Only follow the same convoy; crossing routes must remain open.
      if (alignment < -0.5) continue;
      if (Math.abs(alignment) < 0.5 && !sameDestination) continue;
    }
    // Let one member lead out when a group starts at exactly the same spot.
    if (friendly && Math.abs(forward) < 0.02 && actor.id < other.id) continue;
    allowed = Math.min(
      allowed,
      Math.max(0, forward - Math.sqrt(gap * gap - sideways * sideways)),
    );
  }
  return allowed;
}
export function walk(s: State, u: Walker, distance: number) {
  u.moving = false;
  while (u.path.length && distance > 0) {
    const p = u.path[0],
      dx = p.x - u.x,
      dy = p.y - u.y,
      d = Math.hypot(dx, dy);
    if (d < 0.00001) {
      u.path.shift();
      continue;
    }
    if (Math.abs(dx) > 0.001) u.facing = dx >= 0 ? 1 : -1;
    const wanted = Math.min(d, distance);
    const advance = trafficDistance(s, u, dx / d, dy / d, wanted);
    if (advance < 0.00001) break;
    u.moving = true;
    if (d <= advance) {
      u.x = p.x;
      u.y = p.y;
      u.path.shift();
    } else {
      u.x += (dx / d) * advance;
      u.y += (dy / d) * advance;
    }
    distance -= advance;
    if (advance < wanted) break;
  }
}
function armyDamage(s: State, u: Unit) {
  const forge = Math.max(
    1,
    ...s.lots.filter((l) => l.owned && l.kind === 'forge').map((l) => l.level),
  );
  return (
    (u.kind === 'goblin' && hasResearch(s, 'embers')
      ? 4
      : CREATURES[u.kind].damage) *
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
export function rememberAggressor(s: State, enemy: Enemy, attacker: Unit) {
  if (enemy.kind !== 'hero' || attacker.hp <= 0) return;
  enemy.aggressors ??= [];
  if (!enemy.aggressors.includes(attacker.id))
    enemy.aggressors.push(attacker.id);
  if (!s.units.some((u) => u.id === enemy.pursuitTarget && u.hp > 0)) {
    enemy.pursuitTarget = attacker.id;
    enemy.path = [];
  }
}
function releaseGuildDefenders(s: State, lot: Lot, attackers: Unit[]) {
  if (lot.garrisonReleased) return;
  lot.garrisonReleased = true;
  const level = humanLevel(s);
  const point = entrance(lot);
  for (const [i, role] of GUILD_ROLES.entries()) {
    const def = HEROES[role];
    const hp = Math.round(def.hp * (1 + (level - 1) * 0.15));
    s.enemies.push({
      id: s.nextId++,
      kind: 'hero',
      role,
      ...point,
      x: point.x - 0.9 + i * 0.6,
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
      pursuitTarget: attackers[i % attackers.length].id,
      aggressors: attackers.map(
        (_, index) => attackers[(i + index) % attackers.length].id,
      ),
    });
  }
  const pressure = s.mobilization.hero;
  if (!pressure.active) {
    pressure.active = true;
    pressure.reason = 'Votre armée a attaqué la guilde';
    pressure.nextRaidAt = s.elapsed + PRESSURE.hero.warning;
  }
  announce(
    s,
    'Les quatre héros quittent la guilde ! Ils poursuivront ses assaillants jusqu’à la mort.',
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
      (territory(s) >= settings.territory ||
        s.elapsed >= settings.time ||
        (kind === 'guard' && s.domain.suspicion >= 60))
    ) {
      m.active = true;
      m.reason =
        territory(s) >= settings.territory
          ? `${Math.round(territory(s) * 100)} % du quartier sous votre influence`
          : s.domain.suspicion >= 60 && kind === 'guard'
            ? 'Vos méfaits ont alerté le quartier'
            : 'Les humains ont eu le temps de se préparer';
      m.nextRaidAt = s.elapsed + settings.warning;
      announce(
        s,
        `${kind === 'guard' ? 'La garde se mobilise' : 'La guilde prépare une expédition'} : ${m.reason.toLowerCase()}. Départ dans ${settings.warning} s !`,
      );
    }
    if (m.nextRaidAt === null || s.elapsed < m.nextRaidAt) continue;
    if (
      isHaunted(s, source) ||
      (kind === 'guard' && s.elapsed < s.domain.bribedUntil)
    )
      continue;
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
      buildingBlocked(
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
    e.moving = false;
    e.healTarget = null;
    e.attackCooldown -= dt;
    const def = enemyDefinition(e);
    e.aggressors = e.aggressors?.filter((id) =>
      s.units.some((u) => u.id === id && u.hp > 0),
    );
    if (
      !s.units.some((u) => u.id === e.pursuitTarget && u.hp > 0) &&
      e.aggressors?.length
    ) {
      e.pursuitTarget = e.aggressors[0];
      e.path = [];
    }
    const aggressor = s.units.find((u) => u.id === e.pursuitTarget && u.hp > 0);
    if (e.pursuitTarget !== undefined && !aggressor) {
      e.pursuitTarget = undefined;
      e.path = [];
    }
    if (aggressor) {
      e.resurrectionProgress = 0;
      const range = e.role === 'monk' ? 2.2 : def.range;
      if (distanceBetween(e, aggressor) <= range && clearShot(e, aggressor)) {
        e.path = [];
        e.fighting = true;
        e.facing = aggressor.x >= e.x ? 1 : -1;
        if (e.role === 'archer')
          shoot(s, e, { type: 'unit', id: aggressor.id }, aggressor);
        else
          aggressor.hp = Math.max(
            0,
            aggressor.hp -
              (e.role === 'monk' ? monkDamage(e, aggressor) : e.damage) * dt,
          );
      } else {
        pursue(e, aggressor);
        walk(s, e, def.speed * dt);
      }
      continue;
    }
    if (e.role === 'monk') {
      const attacker = nearest(
        e,
        s.units.filter((u) => u.fighting && clearShot(e, u)),
        2.2,
      );
      if (attacker) {
        e.resurrectionProgress = 0;
        e.path = [];
        e.fighting = true;
        e.facing = attacker.x >= e.x ? 1 : -1;
        attacker.hp = Math.max(0, attacker.hp - monkDamage(e, attacker) * dt);
        continue;
      }
    }
    if (e.role === 'monk' && exorcise(s, e, dt)) continue;
    if (e.role === 'monk' && resurrect(s, e, dt)) continue;
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
      pursue(e, victim);
    } else {
      if (divertEnemy(s, e, dt)) continue;
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
      pursue(e, destination);
    }
    walk(s, e, def.speed * dt);
  }
}

/** Keep bodies apart during fights without pushing them through walls or fences. */
function separateCombatants(s: State, dt: number) {
  const bodies = [
    ...s.units
      .filter((u) => u.hp > 0)
      .map((actor) => ({ actor, enemy: false })),
    ...s.enemies
      .filter((actor) => actor.hp > 0)
      .map((actor) => ({ actor, enemy: true })),
  ];
  const remaining = new Map(bodies.map(({ actor }) => [actor.id, dt * 1.8]));
  const goals = new Map(
    bodies.map(({ actor }) => [actor.id, actor.path.at(-1)]),
  );
  const moved = new Set<number>();
  // The pack has side-facing attacks: radial separation alone still leaves
  // opponents vertically stacked, even when their ground positions do not touch.
  const opponents = new Map<number, Unit | Enemy>();
  for (const body of bodies) {
    if (!body.actor.fighting) continue;
    const opponent = nearest(
      body.actor,
      bodies
        .filter(
          (other) =>
            other.enemy !== body.enemy && clearShot(body.actor, other.actor),
        )
        .map((other) => other.actor),
      2.4,
    );
    if (opponent) opponents.set(body.actor.id, opponent);
  }
  const safeStep = (from: Point, to: Point) => {
    const steps = Math.max(1, Math.ceil(distanceBetween(from, to) / 0.08));
    let x = Math.floor(from.x),
      y = Math.floor(from.y);
    const sideAccess = new Set<number>();
    const lot = navigationLot(from.x, from.y);
    if (lot && from.x >= lot.x + 7) sideAccess.add(lot.id);
    for (let i = 1; i <= steps; i++) {
      const nx = Math.floor(from.x + ((to.x - from.x) * i) / steps);
      const ny = Math.floor(from.y + ((to.y - from.y) * i) / steps);
      if (!walkableCell(nx, ny)) return false;
      // Do not cut a blocked corner, even during a small diagonal nudge.
      if (
        nx !== x &&
        ny !== y &&
        (!walkableCell(nx, y) ||
          !walkableCell(x, ny) ||
          !crossesGate(x, y, nx, y, sideAccess) ||
          !crossesGate(nx, y, nx, ny, sideAccess) ||
          !crossesGate(x, y, x, ny, sideAccess) ||
          !crossesGate(x, ny, nx, ny, sideAccess))
      )
        return false;
      if (!crossesGate(x, y, nx, ny, sideAccess)) return false;
      x = nx;
      y = ny;
    }
    return true;
  };
  const nudge = (actor: Unit | Enemy, dx: number, dy: number) => {
    // Let marching and retreating units finish their route instead of repeatedly
    // snapping their path back to a cell center when a nearby enemy attacks.
    if (!actor.fighting) return;
    const distance = Math.hypot(dx, dy);
    const budget = Math.min(distance, remaining.get(actor.id) ?? 0);
    if (budget <= 0 || distance <= 0) return;
    dx *= budget / distance;
    dy *= budget / distance;
    for (const [x, y] of [
      [dx, dy],
      [dx, 0],
      [0, dy],
    ]) {
      const next = { x: actor.x + x, y: actor.y + y };
      if (Math.hypot(x, y) < 0.001 || !safeStep(actor, next)) continue;
      actor.x = next.x;
      actor.y = next.y;
      remaining.set(
        actor.id,
        (remaining.get(actor.id) ?? 0) - Math.hypot(x, y),
      );
      moved.add(actor.id);
      return;
    }
  };
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i],
          b = bodies[j];
        if (!a.actor.fighting && !b.actor.fighting) continue;
        if (
          a.enemy !== b.enemy &&
          ((Math.abs(a.actor.x - b.actor.x) < 1.5 &&
            Math.abs(a.actor.y - b.actor.y) > 0.3) ||
            Math.abs(a.actor.x - b.actor.x) < 1.2) &&
          (opponents.get(a.actor.id)?.id === b.actor.id ||
            opponents.get(b.actor.id)?.id === a.actor.id)
        ) {
          const dx = b.actor.x - a.actor.x,
            dy = b.actor.y - a.actor.y;
          const side =
            Math.abs(dx) > 0.05
              ? Math.sign(dx)
              : a.actor.id < b.actor.id
                ? 1
                : -1;
          const aLot = navigationLot(a.actor.x, a.actor.y),
            bLot = navigationLot(b.actor.x, b.actor.y);
          if (!!aLot !== !!bLot) {
            const lot = (aLot || bLot)!,
              inside = aLot ? a.actor : b.actor,
              outside = aLot ? b.actor : a.actor,
              gateX = lot.x + 4,
              streetY = lot.y + 8.5;
            // Leave through the gate before opening a lane beside the opponent.
            nudge(
              inside,
              gateX - inside.x,
              Math.abs(gateX - inside.x) < 0.1 ? streetY - inside.y : 0,
            );
            nudge(
              outside,
              gateX + (aLot ? side : -side) * 0.85 - outside.x,
              streetY - outside.y,
            );
            continue;
          }
          const gap =
            ('kind' in a.actor && a.actor.kind === 'minotaur') ||
            ('kind' in b.actor && b.actor.kind === 'minotaur')
              ? 1.8
              : 1.7;
          // Close the vertical offset while opening a horizontal fighting lane.
          // Each actor spends its bounded movement budget, respecting gates/walls.
          nudge(a.actor, (dx - side * gap) / 2, dy / 2);
          nudge(b.actor, (side * gap - dx) / 2, -dy / 2);
        }
        const gap = a.enemy === b.enemy ? 1.05 : 1.65;
        const distance = distanceBetween(a.actor, b.actor);
        if (distance >= gap || !clearShot(a.actor, b.actor)) continue;
        // Stable direction also separates actors starting at precisely the same position.
        const angle =
          (((a.actor.id * 17 + b.actor.id * 31) % 16) * Math.PI) / 8;
        const dx =
          distance > 0.001
            ? (b.actor.x - a.actor.x) / distance
            : Math.cos(angle);
        const dy =
          distance > 0.001
            ? (b.actor.y - a.actor.y) / distance
            : Math.sin(angle);
        const amount = (gap - distance) / 2;
        nudge(a.actor, -dx * amount, -dy * amount);
        nudge(b.actor, dx * amount, dy * amount);
      }
  // Reconnect displaced actors to the street graph before they resume their orders.
  for (const { actor } of bodies) {
    const goal = goals.get(actor.id);
    if (moved.has(actor.id) && goal) actor.path = findPath(actor, goal);
    const opponent = opponents.get(actor.id);
    if (opponent && Math.abs(opponent.x - actor.x) > 0.05)
      actor.facing = opponent.x > actor.x ? 1 : -1;
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
  advanceDomain(s, dt);
  advanceStrategy(s, dt);
  s.resourceGains = s.resourceGains.filter(
    (gain) => s.elapsed - gain.at < RESOURCE_GAIN_LIFETIME,
  );
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
  for (const key of Object.keys(income) as (keyof Resources)[]) {
    if (income[key] < 0)
      s.resources[key] = Math.max(0, s.resources[key] + income[key] * dt);
    else {
      creditResource(s, key, income[key] * dt);
    }
  }
  for (const r of s.recruits) r.remaining -= dt;
  for (const r of s.recruits.filter((r) => r.remaining <= 0)) {
    const source =
      r.source !== undefined &&
      s.lots[r.source]?.owned &&
      s.lots[r.source].kind === 'crypt'
        ? r.source
        : 6;
    spawnUnit(s, r.kind, source);
    s.recruited++;
    announce(s, `${CREATURES[r.kind].name} a rejoint votre domaine.`);
  }
  s.recruits = s.recruits.filter((r) => r.remaining > 0);
  allocateWorkers(s);
  for (const u of s.units) {
    if (u.hp <= 0) continue;
    u.fighting = false;
    if (strategyUnit(s, u, dt)) continue;
    if (advanceSpecialUnit(s, u, dt)) continue;
    if (advanceGathering(s, u, dt)) continue;
    if (
      (u.kind !== 'goblin' || hasResearch(s, 'embers')) &&
      u.kind !== 'specter' &&
      u.task !== 'move'
    ) {
      if (u.task === 'idle') {
        const threat = nearest(u, s.enemies, 4.5);
        if (threat) assign(u, threat, 'defend', threat.id);
      }
      if (u.task === 'defend') {
        const threat = s.enemies.find((e) => e.id === u.target && e.hp > 0);
        if (threat) pursue(u, threat);
        else {
          u.task = 'idle';
          u.target = null;
          u.path = [];
        }
      }
      const threat = nearest(
        u,
        s.enemies.filter((e) => clearShot(u, e)),
        u.kind === 'alchemist' ? 4 : 1.9,
      );
      if (threat) {
        u.fighting = true;
        u.facing = threat.x >= u.x ? 1 : -1;
        hitEnemy(s, u, threat, armyDamage(s, u), dt);
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
      const approach =
        target && 'repairAt' in target ? resourceApproach(target) : target;
      if (!target) {
        u.task = 'idle';
        u.target = null;
        u.path = [];
      } else if (
        approach &&
        distanceBetween(u, approach) <= 1.5 &&
        clearShot(u, approach)
      ) {
        u.fighting = true;
        u.facing = target.x >= u.x ? 1 : -1;
        target.hp = Math.max(0, target.hp - armyDamage(s, u) * dt);
        if ('repairAt' in target && target.hp === 0) {
          s.domain.suspicion = Math.min(100, s.domain.suspicion + 10);
          target.repairAt = s.elapsed + 90;
          target.recruitAt = target.repairAt;
          const loot = creditResource(s, target.kind, 15);
          announce(
            s,
            `${SUPPLIES[target.kind].name} sabotée ! +${Math.floor(loot)} ${SUPPLIES[target.kind].label.toLowerCase()}. Production coupée pendant au moins 90 s.`,
          );
        }
      } else if (approach) pursue(u, approach);
    }
    if (!u.fighting) {
      // Resume the siege after a skirmish has displaced a unit from the gate.
      if (
        u.task === 'attack' &&
        u.target !== null &&
        !u.path.length &&
        !atEntrance(u, s.lots[u.target])
      )
        u.path = findPath(u, entrance(s.lots[u.target]));
      walk(s, u, CREATURES[u.kind].speed * dt);
    }
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
      }
    }
  }
  for (const lot of s.lots) {
    if (lot.construction) {
      const workers = s.units.filter(
        (u) => u.task === 'build' && u.target === lot.id && atEntrance(u, lot),
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
          atEntrance(u, lot),
      );
      if (attackers.length) {
        const damage = attackers.reduce((n, u) => n + armyDamage(s, u), 0);
        lot.hp = Math.max(0, lot.hp - damage * dt);
        if (lot.kind === 'guild' && damage > 0)
          releaseGuildDefenders(s, lot, attackers);
        const retaliation =
          (lot.kind === 'hall'
            ? 18
            : lot.kind === 'guild'
              ? 0
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
          s.domain.suspicion = Math.min(100, s.domain.suspicion + 8);
          const loot = creditResource(
            s,
            'gold',
            lot.kind === 'hall' ? 150 : 65,
          );
          creditResource(s, 'mana', 12);
          for (const u of s.units.filter(
            (u) => u.target === lot.id && u.task === 'attack',
          )) {
            u.task = 'idle';
            u.target = null;
            u.path = [];
          }
          announce(
            s,
            `${BUILDINGS[lot.kind].name} rejoint votre domaine. +${Math.floor(loot)} or.`,
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
  separateCombatants(s, dt);
  advanceProjectiles(s, dt);
  spreadBraises(s);
  const defeated = s.enemies.filter((e) => e.hp <= 0);
  for (const e of defeated) leaveCorpse(s, e, 'human');
  s.defeatedEnemies += defeated.length;
  creditResource(s, 'gold', defeated.length * 12);
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  for (const lot of s.lots.filter((l) => l.owned && l.hp > 0)) {
    if (!nearest(entrance(lot), s.enemies, 4))
      lot.hp = Math.min(lot.maxHp, lot.hp + dt * 1.5);
  }
  const fallen = s.units.filter((u) => u.hp <= 0);
  for (const u of fallen)
    if (u.kind !== 'skeleton' && u.kind !== 'specter')
      leaveCorpse(s, u, 'evil');
    else leaveDeath(s, u);
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
