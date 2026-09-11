import {
  announce,
  creditResource,
  resourceGain,
  assign,
  clearShot,
  CREATURES,
  unitSpeed,
  spearUnlockReason,
  entrance,
  findPath,
  rememberAggressor,
  walk,
  type State,
  type Point,
  type Unit,
  type Enemy,
  type Cost,
  type Resources,
} from './engine.ts';

export type Research = 'embers' | 'solvent' | 'chain' | 'pig-riding';
export const RESEARCH: Record<
  Research,
  { name: string; text: string; cost: Cost; room: 'forge' | 'crypt' | 'den' }
> = {
  'pig-riding': {
    name: 'Chevaucheurs de porcs',
    text: 'Tous vos gobelins lanciers, actuels et futurs, montent un porc : vitesse +50 %. Conserve les bonus des armes enflammées.',
    cost: { gold: 150, wood: 40, food: 50 },
    room: 'den',
  },
  embers: {
    name: 'Armes enflammées',
    text: 'Arme aussi les gobelins. Les coups ajoutent 3 dégâts de feu/s et embrasent la cible.',
    cost: { gold: 120, wood: 50, mana: 20 },
    room: 'forge',
  },
  solvent: {
    name: 'Solvant alchimique',
    text: 'L’alchimiste marque ses cibles pendant 8 s : elles subissent deux fois les dégâts de feu.',
    cost: { gold: 90, mana: 35 },
    room: 'crypt',
  },
  chain: {
    name: 'Braises contagieuses',
    text: 'Un ennemi qui meurt en brûlant embrase les voisins proches. Se combine avec le solvant.',
    cost: { gold: 150, wood: 40, mana: 60 },
    room: 'forge',
  },
};
export type Tower = Point & {
  id: number;
  name: string;
  artX: number;
  artY: number;
  owned: boolean;
  occupant: number | null;
  progress: number;
  reclaim: number;
  loot: Cost;
  alarmAt: number;
  lureUntil: number;
  readyAt: number;
};
export type StrategyState = {
  research: Research[];
  towers: Tower[];
  comboHits: number;
};
export const TOWER_RANGE = {
  threat: 3,
  racket: 3.5,
  reinforcement: 8,
  lure: 14,
};
/** The overlay and the simulation share the same distances, centered on the door. */
export function towerInfluence(s: State, tower: Tower) {
  const kind = towerOccupant(s, tower)?.kind;
  if (kind === 'goblin')
    return [{ radius: TOWER_RANGE.racket, label: 'Racket' }];
  if (kind === 'specter')
    return [{ radius: TOWER_RANGE.lure, label: 'Fausse alerte · à activer' }];
  if (kind === 'skeleton')
    return [
      { radius: TOWER_RANGE.threat, label: 'Détection' },
      { radius: TOWER_RANGE.reinforcement, label: 'Appel des défenseurs' },
    ];
  return [{ radius: TOWER_RANGE.threat, label: 'Zone de capture / reprise' }];
}
export function createStrategy(): StrategyState {
  return {
    research: [],
    comboHits: 0,
    towers: [
      { id: 0, name: 'Tour du pont', x: -0.5, y: 20.5, artX: -0.5, artY: 18.5 },
    ].map((t) => ({
      ...t,
      owned: false,
      occupant: null,
      progress: 0,
      reclaim: 0,
      loot: {},
      alarmAt: 0,
      lureUntil: 0,
      readyAt: 0,
    })),
  };
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const hasResearch = (s: State, key: Research) =>
  s.strategy.research.includes(key);
export function researchReason(s: State, key: Research) {
  if (s.won || s.lost) return 'La partie est terminée.';
  if (hasResearch(s, key)) return 'Amélioration acquise.';
  const def = RESEARCH[key];
  if (!s.lots.some((l) => l.owned && !l.construction && l.kind === def.room))
    return `Construisez ${def.room === 'forge' ? 'la maison des trolls' : def.room === 'den' ? 'une grotte gobeline' : 'une crypte'}.`;
  if (key === 'pig-riding' && spearUnlockReason(s)) return spearUnlockReason(s);
  if (key === 'chain' && !hasResearch(s, 'embers'))
    return 'Recherchez les armes enflammées.';
  const labels = { gold: 'or', wood: 'bois', food: 'viande', mana: 'essence' };
  const missing = Object.entries(def.cost)
    .filter(([key, value]) => s.resources[key as keyof Resources] < value)
    .map(
      ([key, value]) =>
        `${Math.ceil(value - s.resources[key as keyof Resources])} ${labels[key as keyof Resources]}`,
    );
  return missing.length ? `Il manque : ${missing.join(', ')}.` : '';
}
export function research(s: State, key: Research) {
  const error = researchReason(s, key);
  if (error) return error;
  for (const [resource, amount] of Object.entries(RESEARCH[key].cost))
    s.resources[resource as keyof Resources] -= amount;
  s.strategy.research.push(key);
  announce(
    s,
    `${RESEARCH[key].name} : amélioration acquise pour toute votre armée.`,
  );
  return '';
}
export function hitEnemy(
  s: State,
  u: Unit,
  enemy: Enemy,
  damage: number,
  dt: number,
) {
  if (
    damage > 0 ||
    (u.kind === 'alchemist' && hasResearch(s, 'solvent')) ||
    hasResearch(s, 'embers')
  )
    rememberAggressor(s, enemy, u);
  enemy.hp -= damage * dt;
  if (u.kind === 'alchemist') {
    if (hasResearch(s, 'solvent')) enemy.solventUntil = s.elapsed + 8;
    return;
  }
  if (hasResearch(s, 'embers')) {
    const combo = (enemy.solventUntil ?? 0) > s.elapsed;
    enemy.hp -= 3 * (combo ? 2 : 1) * dt;
    enemy.burningUntil = s.elapsed + 3;
    if (combo && (enemy.comboAt ?? -10) + 1 <= s.elapsed) {
      enemy.comboAt = s.elapsed;
      s.strategy.comboHits++;
    }
  }
}
export function towerOccupant(s: State, tower: Tower) {
  return s.units.find(
    (u) =>
      u.hp > 0 &&
      u.id === tower.occupant &&
      u.task === 'tower' &&
      u.target === tower.id &&
      distance(u, tower) < 1,
  );
}
export function towerOrder(s: State, id: number, unitId: number): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  const tower = s.strategy.towers[id],
    u = s.units.find((u) => u.id === unitId && u.hp > 0);
  if (!tower || !u) return 'Choisissez une tour et une créature vivante.';
  if (tower.owned && !['goblin', 'skeleton', 'specter'].includes(u.kind))
    return 'Affectez un gobelin, un squelette ou un spectre à cette tour.';
  const path = findPath(u, tower);
  if (!path.length && distance(u, tower) > 1)
    return 'Cette tour est inaccessible.';
  const old = s.units.find((unit) => unit.id === tower.occupant);
  if (old && old.id !== u.id && old.task === 'tower')
    assign(old, entrance(s.lots[6]), 'move', null);
  for (const other of s.strategy.towers)
    if (other.occupant === u.id) {
      other.occupant = null;
      other.progress = 0;
    }
  tower.occupant = u.id;
  tower.progress = 0;
  assign(u, tower, 'tower', tower.id);
  announce(s, `${CREATURES[u.kind].name} rejoint ${tower.name.toLowerCase()}.`);
  return '';
}
export function releaseTower(s: State, id: number) {
  if (s.won || s.lost) return 'La partie est terminée.';
  const tower = s.strategy.towers[id];
  if (!tower) return 'Tour introuvable.';
  const u = s.units.find((u) => u.id === tower.occupant);
  if (u?.task === 'tower') assign(u, entrance(s.lots[6]), 'move', null);
  tower.occupant = null;
  tower.lureUntil = 0;
  return '';
}
export function lureReason(s: State, id: number) {
  const t = s.strategy.towers[id];
  if (s.won || s.lost) return 'La partie est terminée.';
  if (!t?.owned || towerOccupant(s, t)?.kind !== 'specter')
    return 'Installez un spectre dans la tour.';
  if (t.readyAt > s.elapsed)
    return `Disponible dans ${Math.ceil(t.readyAt - s.elapsed)} s.`;
  return s.resources.mana < 15
    ? 'Il manque 15 essence pour une fausse alerte.'
    : '';
}
export function falseAlarm(s: State, id: number) {
  const error = lureReason(s, id);
  if (error) return error;
  const t = s.strategy.towers[id];
  s.resources.mana -= 15;
  t.lureUntil = s.elapsed + 12;
  t.readyAt = s.elapsed + 60;
  s.domain.suspicion = Math.min(100, s.domain.suspicion + 8);
  announce(
    s,
    'Fausse alerte ! Les patrouilles proches convergent vers la tour pendant 12 s.',
  );
  return '';
}
export function divertEnemy(s: State, e: Enemy, dt: number) {
  if (e.role === 'monk') return false;
  const t = s.strategy.towers.find(
    (t) =>
      t.owned &&
      t.lureUntil > s.elapsed &&
      towerOccupant(s, t)?.kind === 'specter' &&
      distance(t, e) < TOWER_RANGE.lure,
  );
  if (!t) return false;
  if (distance(e, t) > 1.5) {
    if (!e.path.length || distance(e.path.at(-1)!, t) > 1)
      e.path = findPath(e, t);
    walk(s, e, 1.7 * dt);
  } else e.path = [];
  return true;
}
export function lootReason(s: State, id: number) {
  if (s.won || s.lost) return 'La partie est terminée.';
  const t = s.strategy.towers[id];
  if (!t?.owned || !Object.values(t.loot).some((n) => n > 0))
    return 'La tour ne contient aucun butin.';
  if (
    !s.units.some(
      (u) =>
        u.hp > 0 && u.kind === 'goblin' && ['idle', 'forage'].includes(u.task),
    )
  )
    return 'Il faut un gobelin libre pour transporter le butin.';
  return '';
}
export function collectLoot(s: State, id: number) {
  const error = lootReason(s, id);
  if (error) return error;
  const t = s.strategy.towers[id];
  const u = s.units.find(
    (u) =>
      u.hp > 0 && u.kind === 'goblin' && ['idle', 'forage'].includes(u.task),
  )!;
  assign(u, t, 'collect-loot', id);
  return '';
}
export function strategyUnit(s: State, u: Unit, dt: number) {
  if (!['tower', 'collect-loot', 'deliver-loot'].includes(u.task)) return false;
  walk(s, u, unitSpeed(s, u) * dt);
  if (u.path.length) return true;
  if (u.task === 'deliver-loot') {
    if (distance(u, entrance(s.lots[6])) < 1 && u.loot) {
      for (const [key, amount] of Object.entries(u.loot))
        creditResource(s, key as keyof Resources, amount);
      announce(s, 'Le butin de la tour arrive au manoir.');
    }
    u.loot = undefined;
    u.task = 'idle';
    u.target = null;
    return true;
  }
  const t = u.target === null ? undefined : s.strategy.towers[u.target];
  if (!t || (u.task === 'collect-loot' && !t.owned)) {
    u.task = 'idle';
    u.target = null;
    return true;
  }
  if (distance(u, t) > 1) {
    u.path = findPath(u, t);
    return true;
  }
  if (u.task === 'collect-loot') {
    const loot = { ...t.loot };
    t.loot = {};
    assign(u, entrance(s.lots[6]), 'deliver-loot', t.id);
    u.loot = loot;
    return true;
  }
  const threat = s.enemies.find(
    (e) => e.hp > 0 && distance(u, e) < 2.2 && clearShot(u, e),
  );
  if (
    threat &&
    (u.kind === 'skeleton' || u.kind === 'troll' || u.kind === 'minotaur')
  ) {
    u.fighting = true;
    u.facing = threat.x >= u.x ? 1 : -1;
    hitEnemy(s, u, threat, CREATURES[u.kind].damage, dt);
  }
  if (!t.owned) {
    if (s.enemies.some((e) => e.hp > 0 && distance(e, t) < TOWER_RANGE.threat))
      t.progress = 0;
    else t.progress += dt;
    if (t.progress >= 8) {
      t.owned = true;
      t.progress = 0;
      s.domain.suspicion = Math.min(100, s.domain.suspicion + 12);
      announce(
        s,
        u.kind === 'goblin'
          ? `${t.name} capturée. Votre gobelin reste en poste : le racket est actif.`
          : ['skeleton', 'specter'].includes(u.kind)
            ? `${t.name} capturée. Votre ${CREATURES[u.kind].name.toLowerCase()} reste en poste.`
            : `${t.name} capturée. Affectez-lui un gobelin, un squelette ou un spectre.`,
      );
      if (['goblin', 'skeleton', 'specter'].includes(u.kind)) {
        t.occupant = u.id;
        u.task = 'tower';
        u.target = t.id;
      } else {
        t.occupant = null;
        u.task = 'idle';
        u.target = null;
      }
    }
  }
  return true;
}
export function spreadBraises(s: State) {
  if (hasResearch(s, 'chain'))
    for (const e of s.enemies) {
      if (e.hp > 0 || (e.burningUntil ?? 0) <= s.elapsed || e.spreadFire)
        continue;
      e.spreadFire = true;
      for (const other of s.enemies)
        if (other.hp > 0 && distance(e, other) < 2.8 && clearShot(e, other))
          other.burningUntil = Math.max(other.burningUntil ?? 0, s.elapsed + 4);
    }
}
export function advanceStrategy(s: State, dt: number) {
  for (const e of s.enemies)
    if (e.hp > 0 && (e.burningUntil ?? 0) > s.elapsed) {
      e.hp -= 2 * ((e.solventUntil ?? 0) > s.elapsed ? 2 : 1) * dt;
    }
  spreadBraises(s);
  for (const t of s.strategy.towers) {
    const assigned = s.units.find(
      (u) =>
        u.id === t.occupant &&
        u.hp > 0 &&
        u.task === 'tower' &&
        u.target === t.id,
    );
    if (!assigned) {
      t.occupant = null;
      t.progress = 0;
      t.lureUntil = 0;
    }
    if (!t.owned) continue;
    const occupant = towerOccupant(s, t);
    const threats = s.enemies.filter(
      (e) =>
        e.hp > 0 && e.role !== 'monk' && distance(e, t) < TOWER_RANGE.threat,
    );
    t.reclaim = threats.length && !occupant ? t.reclaim + dt : 0;
    if (t.reclaim >= 8) {
      t.owned = false;
      t.reclaim = 0;
      t.loot = {};
      t.lureUntil = 0;
      announce(
        s,
        `${t.name} reprise par les humains. Le butin stocké est perdu.`,
      );
      continue;
    }
    if (
      occupant?.kind === 'skeleton' &&
      threats.length &&
      s.elapsed >= t.alarmAt
    ) {
      t.alarmAt = s.elapsed + 5;
      for (const u of s.units)
        if (
          u.hp > 0 &&
          u.task === 'idle' &&
          !['goblin', 'specter'].includes(u.kind) &&
          distance(u, t) < TOWER_RANGE.reinforcement
        )
          assign(u, threats[0], 'defend', threats[0].id);
    }
    if (occupant?.kind === 'goblin')
      for (const w of s.workers) {
        if (
          w.hp <= 0 ||
          w.cargo <= 0 ||
          w.taxed ||
          distance(w, t) > TOWER_RANGE.racket
        )
          continue;
        const kind = s.sites[w.site].kind,
          amount = Math.min(
            Math.ceil(w.cargo * 0.3),
            Math.max(0, 30 - (t.loot[kind] ?? 0)),
          );
        if (!amount) continue;
        w.cargo -= amount;
        w.taxed = true;
        t.loot[kind] = (t.loot[kind] ?? 0) + amount;
        const point = {
          x: t.artX,
          y: t.artY - 2 - ['gold', 'wood', 'food'].indexOf(kind) * 0.7,
        };
        const gain = s.resourceGains.find(
          (g) =>
            g.at === s.elapsed &&
            g.kind === kind &&
            g.x === point.x &&
            g.y === point.y,
        );
        if (gain) gain.amount += amount;
        else resourceGain(s, point, kind, amount);
        s.domain.suspicion = Math.min(100, s.domain.suspicion + amount);
      }
  }
  for (const w of s.workers) if (w.cargo <= 0) w.taxed = false;
}
