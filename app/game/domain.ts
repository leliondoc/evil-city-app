import {
  announce,
  assign,
  capacity,
  clearShot,
  CREATURES,
  entrance,
  findPath,
  population,
  walk,
  type Enemy,
  type Lot,
  type Point,
  type State,
  type Unit,
} from './engine.ts';

export const BRIBE_GOLD = 100;
export const BRIBE_DELAY = 45;
export const REMAINS_CAP = 6;
export const RITUAL_REMAINS = 2;
export const RITUAL_MANA = 12;
export const DEATH_SECONDS = 1.4;
export interface Death extends Point {
  at: number;
}
export interface Corpse extends Point {
  human?: Pick<Enemy, 'kind' | 'role' | 'level' | 'maxHp' | 'damage'>;
  id: number;
  at: number;
  side: 'human' | 'evil';
  expiresAt: number;
  carrier?: { side: 'human' | 'evil'; id: number };
}
export interface DomainState {
  souls: {
    id: number;
    home: number;
    human: NonNullable<Corpse['human']>;
    expiresAt: number;
  }[];
  nextRescuerAt: number;
  resurrections: (Point & { at: number })[];
  resurrected: number;
  deaths: Death[];
  corpses: Corpse[];
  remains: number;
  autoCollect: boolean;
  ritualReadyAt: number;
  suspicion: number;
  bribe: { courierId: number; expiresAt: number } | null;
  bribeReadyAt: number;
  bribedUntil: number;
  lastBribe: string;
  recoveredByHumans: number;
}
export function createDomain(): DomainState {
  return {
    souls: [],
    nextRescuerAt: 0,
    resurrections: [],
    resurrected: 0,
    deaths: [],
    corpses: [],
    remains: 0,
    autoCollect: true,
    ritualReadyAt: 0,
    suspicion: 0,
    bribe: null,
    bribeReadyAt: 0,
    bribedUntil: 0,
    lastBribe: '',
    recoveredByHumans: 0,
  };
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const free = (u: Unit) =>
  u.hp > 0 && (u.task === 'idle' || u.task === 'forage');
const courierAvailable = (u: Unit) =>
  u.hp > 0 &&
  u.kind === 'goblin' &&
  ['idle', 'forage', 'eat', 'rest', 'collect'].includes(u.task);
const safe = (s: State, p: Point, range = 5) =>
  !s.enemies.some(
    (e) => e.hp > 0 && e.role !== 'monk' && distance(e, p) < range,
  );
const room = (s: State, kind: Lot['kind']) =>
  s.lots.find((l) => l.owned && l.hp > 0 && !l.construction && l.kind === kind);
function idle(u: Unit) {
  u.task = 'idle';
  u.target = null;
  u.path = [];
  u.activityProgress = 0;
}

export function isHaunted(s: State, lot: Lot): boolean {
  return (
    !lot.owned &&
    (lot.hauntedUntil ?? 0) > s.elapsed &&
    s.units.some(
      (u) =>
        u.id === lot.hauntedBy &&
        u.hp > 0 &&
        u.task === 'haunt' &&
        u.target === lot.id,
    )
  );
}
export function hauntReason(s: State, id: number, unitId?: number): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  const lot = s.lots[id];
  if (!lot || lot.owned || lot.kind === 'empty')
    return 'Choisissez un bâtiment humain.';
  if (
    isHaunted(s, lot) ||
    s.units.some((u) => u.hp > 0 && u.task === 'haunt' && u.target === id)
  )
    return 'Une hantise vise déjà ce bâtiment.';
  const ghost = s.units.find(
    (u) =>
      u.kind === 'specter' &&
      u.hp > 0 &&
      (unitId === undefined || u.id === unitId) &&
      u.task !== 'haunt' &&
      (u.hauntReadyAt ?? 0) <= s.elapsed,
  );
  return ghost
    ? ''
    : 'Invoquez un spectre à la crypte, ou attendez la fin de sa récupération.';
}
export function haunt(s: State, id: number, unitId?: number): string {
  const error = hauntReason(s, id, unitId);
  if (error) return error;
  const ghost = s.units.find(
    (u) =>
      u.kind === 'specter' &&
      u.hp > 0 &&
      (unitId === undefined || u.id === unitId) &&
      u.task !== 'haunt' &&
      (u.hauntReadyAt ?? 0) <= s.elapsed,
  )!;
  assign(ghost, entrance(s.lots[id]), 'haunt', id);
  announce(
    s,
    'Le spectre part hanter le bâtiment. Il doit atteindre son entrée et préparer son maléfice.',
  );
  return '';
}
export function exorcise(s: State, monk: Enemy, dt: number): boolean {
  const opponent = s.units.find((u) => u.id === monk.exorcising && u.hp > 0);
  if (monk.exorcismStreet && opponent && distance(monk, opponent) <= 8) {
    // Let the specter pass through the gate before either actor attacks.
    if (opponent.task === 'duel' && opponent.path.length) return true;
    monk.facing = opponent.x >= monk.x ? 1 : -1;
    if (distance(monk, opponent) <= 2.2 && clearShot(monk, opponent)) {
      monk.path = [];
      monk.fighting = true;
      opponent.hp = Math.max(0, opponent.hp - monkDamage(monk, opponent) * dt);
    } else {
      if (!monk.path.length || distance(monk.path.at(-1)!, opponent) > 1)
        monk.path = findPath(monk.path[0] ?? monk, opponent);
      walk(s, monk, 1.35 * dt);
    }
    return true;
  }
  monk.exorcising = undefined;
  monk.exorcismStreet = undefined;
  const lot = s.lots
    .filter(
      (l) =>
        isHaunted(s, l) &&
        !s.enemies.some(
          (e) => e.id !== monk.id && e.hp > 0 && e.exorcising === l.hauntedBy,
        ),
    )
    .sort(
      (a, b) => distance(monk, entrance(a)) - distance(monk, entrance(b)),
    )[0];
  monk.exorcising = lot?.hauntedBy;
  if (!lot) return false;
  const destination = { x: entrance(lot).x - 1, y: lot.y + 8.5 };
  if (distance(monk, destination) > 0.5) {
    if (!monk.path.length || distance(monk.path.at(-1)!, destination) > 1)
      monk.path = findPath(monk, destination);
    walk(s, monk, 1.35 * dt);
  } else {
    monk.path = [];
    const ghost = s.units.find((u) => u.id === lot.hauntedBy)!;
    monk.exorcismStreet = { x: entrance(lot).x + 1, y: lot.y + 8.5 };
    assign(ghost, monk.exorcismStreet, 'duel', monk.id);
    ghost.hauntReadyAt = s.elapsed + 60;
    lot.hauntedBy = undefined;
    lot.hauntedUntil = undefined;
    announce(
      s,
      'Le moine provoque le spectre en duel dans la rue ! La hantise cesse. Vous pouvez soutenir le spectre ou lui ordonner de fuir.',
    );
  }
  return true;
}
export function bribeReason(s: State): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  if (!s.lots.some((l) => l.kind === 'hall' && !l.owned))
    return 'La mairie est déjà sous votre contrôle.';
  if (s.domain.bribe) return 'Une bourse est déjà en route.';
  if (s.elapsed < s.domain.bribeReadyAt)
    return `Nouvelle bourse dans ${Math.ceil(s.domain.bribeReadyAt - s.elapsed)} s.`;
  if (s.resources.gold < BRIBE_GOLD)
    return `Il faut ${BRIBE_GOLD} or pour acheter le silence de la mairie.`;
  if (!s.units.some(courierAvailable))
    return 'Il faut un gobelin disponible, hors chantier.';
  return '';
}
export function sendBribe(s: State): string {
  const error = bribeReason(s);
  if (error) return error;
  const hall = s.lots.find((l) => l.kind === 'hall' && !l.owned)!;
  const courier = s.units
    .filter(courierAvailable)
    .sort(
      (a, b) => distance(a, entrance(hall)) - distance(b, entrance(hall)),
    )[0];
  s.resources.gold -= BRIBE_GOLD;
  s.domain.bribe = { courierId: courier.id, expiresAt: s.elapsed + 120 };
  s.domain.bribeReadyAt = s.elapsed + 120;
  s.domain.lastBribe =
    'Bourse en route : escortez le gobelin jusqu’à la mairie.';
  assign(courier, entrance(hall), 'bribe', hall.id);
  announce(s, s.domain.lastBribe);
  return '';
}
export function ritualReason(s: State): string {
  if (s.won || s.lost) return 'La partie est terminée.';
  if (!room(s, 'crypt')) return 'Terminez une crypte pour accomplir le rituel.';
  if (s.elapsed < s.domain.ritualReadyAt)
    return `La crypte récupère encore ${Math.ceil(s.domain.ritualReadyAt - s.elapsed)} s.`;
  if (s.domain.remains < RITUAL_REMAINS)
    return 'Rapportez deux dépouilles à la crypte.';
  if (s.resources.mana < RITUAL_MANA) return 'Le rituel demande 12 essence.';
  if (population(s) + 1 > capacity(s))
    return 'Il faut une place libre dans vos tanières.';
  return '';
}
export function raiseSkeleton(s: State): string {
  const error = ritualReason(s);
  if (error) return error;
  s.domain.remains -= RITUAL_REMAINS;
  s.resources.mana -= RITUAL_MANA;
  s.domain.ritualReadyAt = s.elapsed + 45;
  s.recruits.push({
    kind: 'skeleton',
    remaining: 12,
    source: room(s, 'crypt')!.id,
  });
  announce(
    s,
    'La crypte relève un squelette. Le rituel dure 12 s et réserve une place.',
  );
  return '';
}
export function monkDamage(monk: Enemy, target: Unit): number {
  const undead = target.kind === 'skeleton' || target.kind === 'specter';
  return 6 * (1 + (monk.level - 1) * 0.1) * (undead ? 2 : 1);
}
export function leaveDeath(s: State, actor: Point) {
  s.domain.deaths.push({ x: actor.x, y: actor.y, at: s.elapsed });
}
export function leaveCorpse(
  s: State,
  actor: Point &
    Partial<Pick<Enemy, 'role' | 'level' | 'maxHp' | 'damage' | 'revived'>> & {
      kind?: string;
    },
  side: Corpse['side'],
) {
  s.domain.corpses.push({
    id: s.nextId++,
    at: s.elapsed,
    x: actor.x,
    y: actor.y,
    side,
    human:
      side === 'human' && actor.role && !actor.revived
        ? {
            kind: actor.kind === 'hero' ? 'hero' : 'guard',
            role: actor.role,
            level: actor.level!,
            maxHp: actor.maxHp!,
            damage: actor.damage!,
          }
        : undefined,
    expiresAt: s.elapsed + 100,
  });
  s.domain.suspicion = Math.min(100, s.domain.suspicion + 2);
}

export function advanceDomain(s: State, dt: number) {
  const d = s.domain;
  d.resurrections = d.resurrections.filter((r) => s.elapsed - r.at < 1.5);
  d.souls = d.souls.filter(
    (soul) => soul.expiresAt > s.elapsed && !s.lots[soul.home].owned,
  );
  const guild = s.lots.find((l) => l.kind === 'guild' && !l.owned);
  if (
    d.souls.length &&
    guild &&
    !isHaunted(s, guild) &&
    d.nextRescuerAt <= s.elapsed &&
    !s.enemies.some((e) => e.hp > 0 && e.role === 'monk') &&
    s.economy.stocks.gold >= 15 &&
    s.economy.stocks.food >= 10
  ) {
    s.economy.stocks.gold -= 15;
    s.economy.stocks.food -= 10;
    d.nextRescuerAt = s.elapsed + 90;
    s.enemies.push({
      id: s.nextId++,
      kind: 'hero',
      role: 'monk',
      ...entrance(guild),
      hp: 85,
      maxHp: 85,
      damage: 0,
      level: 1,
      path: [],
      target: 6,
      facing: 1,
      fighting: false,
      healTarget: null,
      attackCooldown: 0,
    });
    announce(
      s,
      'Un moine quitte la guilde pour ressusciter les morts récupérés.',
    );
  }
  d.deaths = d.deaths.filter((death) => s.elapsed - death.at < DEATH_SECONDS);
  d.suspicion = Math.max(0, d.suspicion - dt * 0.04);
  for (const lot of s.lots) {
    if (lot.hauntedBy !== undefined && !isHaunted(s, lot)) {
      const ghost = s.units.find((u) => u.id === lot.hauntedBy);
      if (ghost?.task === 'haunt' && ghost.target === lot.id) idle(ghost);
      lot.hauntedBy = undefined;
      lot.hauntedUntil = undefined;
    }
  }
  if (d.bribe) {
    const courier = s.units.find((u) => u.id === d.bribe!.courierId);
    const hall = s.lots.find((l) => l.kind === 'hall' && !l.owned);
    if (
      !courier ||
      courier.hp <= 0 ||
      courier.task !== 'bribe' ||
      !hall ||
      s.elapsed >= d.bribe.expiresAt
    ) {
      d.bribe = null;
      if (courier?.task === 'bribe') idle(courier);
      d.lastBribe =
        'Bourse perdue : courrier interrompu, tué, trop lent ou mairie conquise. Aucun renfort retardé.';
      announce(s, d.lastBribe);
    }
  }
  for (const c of d.corpses) {
    if (!c.carrier) continue;
    const actor =
      c.carrier.side === 'evil'
        ? s.units.find(
            (u) =>
              u.id === c.carrier!.id &&
              u.hp > 0 &&
              u.task === 'deliver' &&
              u.target === c.id,
          )
        : s.workers.find(
            (w) =>
              w.id === c.carrier!.id &&
              w.hp > 0 &&
              w.recovery?.corpseId === c.id &&
              w.recovery.returning,
          );
    if (actor) {
      c.x = actor.x;
      c.y = actor.y;
    } else {
      c.carrier = undefined;
      c.expiresAt = s.elapsed + 60;
    }
  }
  d.corpses = d.corpses.filter((c) => c.carrier || c.expiresAt > s.elapsed);
  // Human workers recover nearby human bodies only when they have no goods to lose.
  for (const w of s.workers) {
    if (w.hp <= 0) continue;
    const home = s.lots[s.sites[w.site].home];
    if (home.owned) continue;
    if (isHaunted(s, home)) {
      walk(s, w, 2.2 * dt);
      continue;
    }
    if (!w.recovery && w.cargo === 0) {
      const c = d.corpses.find(
        (c) =>
          c.side === 'human' &&
          !c.carrier &&
          distance(c, w) < 5 &&
          !s.workers.some((other) => other.recovery?.corpseId === c.id),
      );
      if (c) {
        w.recovery = { corpseId: c.id, returning: false };
        w.path = findPath(w, c);
      }
    }
    if (!w.recovery) continue;
    const c = d.corpses.find((c) => c.id === w.recovery!.corpseId);
    if (
      !c ||
      (c.carrier && (c.carrier.side !== 'human' || c.carrier.id !== w.id))
    ) {
      w.recovery = undefined;
      w.phase = 'return';
      w.path = findPath(w, entrance(home));
      continue;
    }
    walk(s, w, 1.5 * dt);
    if (w.path.length) continue;
    if (!w.recovery.returning && distance(w, c) < 1.5) {
      c.carrier = { side: 'human', id: w.id };
      w.recovery.returning = true;
      w.path = findPath(w, entrance(home));
    } else if (w.recovery.returning && distance(w, entrance(home)) < 1) {
      d.corpses = d.corpses.filter((body) => body.id !== c.id);
      d.recoveredByHumans++;
      if (c.human && d.souls.length < 6)
        d.souls.push({
          id: c.id,
          home: home.id,
          human: c.human,
          expiresAt: s.elapsed + 120,
        });
      w.recovery = undefined;
      w.phase = 'return';
    }
  }
}

export function resurrect(s: State, monk: Enemy, dt: number): boolean {
  const candidates = s.domain.souls.filter(
    (soul) =>
      !s.lots[soul.home].owned &&
      !s.enemies.some(
        (e) => e.id !== monk.id && e.hp > 0 && e.resurrecting === soul.id,
      ),
  );
  const soul =
    candidates.find((soul) => soul.id === monk.resurrecting) ?? candidates[0];
  if (!soul) {
    monk.resurrecting = undefined;
    monk.resurrectionProgress = 0;
    return false;
  }
  if (monk.resurrecting !== soul.id) monk.resurrectionProgress = 0;
  monk.resurrecting = soul.id;
  const home = s.lots[soul.home],
    target = entrance(home);
  if (
    isHaunted(s, home) ||
    s.units.some((u) => u.hp > 0 && distance(u, monk) < 3) ||
    (monk.resurrectionHp !== undefined && monk.hp < monk.resurrectionHp)
  ) {
    monk.resurrectionProgress = 0;
    monk.resurrectionHp = monk.hp;
    return false;
  }
  monk.resurrectionHp = monk.hp;
  if (distance(monk, target) > 1) {
    if (!monk.path.length || distance(monk.path.at(-1)!, target) > 1)
      monk.path = findPath(monk, target);
    walk(s, monk, 1.35 * dt);
    return true;
  }
  monk.path = [];
  if (s.economy.stocks.gold < 25 || s.economy.stocks.food < 15) {
    monk.resurrectionProgress = 0;
    return false;
  }
  monk.resurrectionProgress = (monk.resurrectionProgress ?? 0) + dt;
  if (monk.resurrectionProgress >= 10) {
    s.economy.stocks.gold -= 25;
    s.economy.stocks.food -= 15;
    s.domain.souls = s.domain.souls.filter((body) => body.id !== soul.id);
    s.enemies.push({
      ...soul.human,
      ...target,
      id: s.nextId++,
      hp: Math.ceil(soul.human.maxHp * 0.6),
      revived: true,
      path: findPath(target, entrance(s.lots[6])),
      target: 6,
      facing: 1,
      fighting: false,
      healTarget: null,
      attackCooldown: 0,
    });
    s.domain.resurrected++;
    s.domain.resurrections.push({ ...target, at: s.elapsed });
    monk.resurrecting = undefined;
    monk.resurrectionProgress = 0;
    announce(
      s,
      'Résurrection ! Un humain revient avec 60 % de sa vie. Il ne pourra plus être ressuscité.',
    );
  }
  return true;
}

export function advanceSpecialUnit(s: State, u: Unit, dt: number): boolean {
  const d = s.domain;
  if (u.task === 'duel') {
    const monk = s.enemies.find(
      (e) => e.id === u.target && e.hp > 0 && e.exorcising === u.id,
    );
    if (!monk) {
      idle(u);
      return true;
    }
    walk(s, u, CREATURES[u.kind].speed * dt);
    if (!u.path.length && distance(u, monk) <= 2.2 && clearShot(u, monk)) {
      u.fighting = true;
      u.facing = monk.x >= u.x ? 1 : -1;
      monk.hp = Math.max(0, monk.hp - 12 * dt);
    }
    return true;
  }
  const needs = ['eat', 'rest', 'restore'];
  if (needs.includes(u.task) && !safe(s, u)) idle(u);
  if (free(u) && safe(s, u)) {
    const crypt = room(s, 'crypt');
    if (
      u.kind === 'goblin' &&
      crypt &&
      d.autoCollect &&
      d.remains +
        s.units.filter((v) => v.task === 'collect' || v.task === 'deliver')
          .length <
        REMAINS_CAP
    ) {
      const body = d.corpses
        .filter(
          (c) =>
            !c.carrier &&
            safe(s, c) &&
            !s.units.some(
              (v) => v.hp > 0 && v.task === 'collect' && v.target === c.id,
            ),
        )
        .sort((a, b) => distance(u, a) - distance(u, b))[0];
      if (body) assign(u, body, 'collect', body.id);
    }
    if (free(u)) {
      const canteen = room(s, 'canteen');
      const lair =
        u.kind === 'skeleton' || u.kind === 'specter' ? crypt : room(s, 'den');
      const alive = u.kind !== 'skeleton' && u.kind !== 'specter';
      if (
        alive &&
        canteen &&
        s.resources.food > 0 &&
        s.elapsed >= (u.nextMealAt ?? 65)
      )
        assign(u, entrance(canteen), 'eat', canteen.id);
      else if (
        lair &&
        (s.elapsed >= (u.nextRestAt ?? 90) ||
          (!alive && u.hp < CREATURES[u.kind].hp * 0.8))
      )
        assign(u, entrance(lair), alive ? 'rest' : 'restore', lair.id);
    }
  }
  if (u.task === 'haunt') {
    const lot = u.target === null ? undefined : s.lots[u.target];
    if (!lot || lot.owned) {
      idle(u);
      return true;
    }
    walk(s, u, CREATURES[u.kind].speed * dt);
    if (!u.path.length && distance(u, entrance(lot)) < 1) {
      u.activityProgress = (u.activityProgress ?? 0) + dt;
      if (u.activityProgress >= 3 && lot.hauntedBy === undefined) {
        lot.hauntedBy = u.id;
        lot.hauntedUntil = s.elapsed + 30;
        u.hauntReadyAt = s.elapsed + 60;
        d.suspicion = Math.min(100, d.suspicion + 18);
        const guild = s.lots.find((l) => !l.owned && l.kind === 'guild');
        if (guild && !s.enemies.some((e) => e.hp > 0 && e.role === 'monk')) {
          s.enemies.push({
            id: s.nextId++,
            kind: 'hero',
            role: 'monk',
            ...entrance(guild),
            hp: 85,
            maxHp: 85,
            damage: 0,
            level: 1,
            path: [],
            target: 6,
            facing: 1,
            fighting: false,
            healTarget: null,
            attackCooldown: 0,
          });
        }
        // Workers flee home, keeping their cargo for when the curse ends.
        for (const w of s.workers.filter(
          (w) => s.sites[w.site].home === lot.id,
        )) {
          w.path = findPath(w, entrance(lot));
          w.phase = 'return';
          w.recovery = undefined;
        }
        announce(
          s,
          'Hantise ! Livraisons et renforts suspendus pendant 30 s. Les moines vont intervenir.',
        );
      }
    }
    return true;
  }
  if (u.task === 'bribe') {
    if (!d.bribe || d.bribe.courierId !== u.id || u.target === null) {
      idle(u);
      return true;
    }
    const hall = s.lots[u.target];
    walk(s, u, CREATURES.goblin.speed * dt);
    if (
      !u.path.length &&
      distance(u, entrance(hall)) < 1 &&
      !isHaunted(s, hall)
    ) {
      const m = s.mobilization.guard;
      d.bribedUntil = s.elapsed + BRIBE_DELAY;
      if (m.nextRaidAt !== null)
        m.nextRaidAt = Math.max(s.elapsed, m.nextRaidAt) + BRIBE_DELAY;
      d.suspicion = Math.max(0, d.suspicion - 15);
      d.bribe = null;
      d.lastBribe =
        'Bourse livrée : prochaine patrouille retardée de 45 s. Les gardes déjà dehors restent hostiles.';
      announce(s, d.lastBribe);
      assign(u, entrance(s.lots[6]), 'move', null);
    }
    return true;
  }
  if (u.task === 'collect' || u.task === 'deliver') {
    const c = d.corpses.find((c) => c.id === u.target);
    const crypt = room(s, 'crypt');
    if (
      !c ||
      !crypt ||
      (c.carrier && (c.carrier.side !== 'evil' || c.carrier.id !== u.id))
    ) {
      idle(u);
      return true;
    }
    if (u.task === 'collect' && (!d.autoCollect || !safe(s, c))) {
      idle(u);
      return true;
    }
    if (
      u.task === 'deliver' &&
      !u.path.length &&
      distance(u, entrance(crypt)) >= 1
    )
      u.path = findPath(u, entrance(crypt));
    walk(s, u, (u.task === 'deliver' ? 1.5 : CREATURES.goblin.speed) * dt);
    if (u.path.length) return true;
    if (u.task === 'collect' && distance(u, c) < 1.5) {
      c.carrier = { side: 'evil', id: u.id };
      assign(u, entrance(crypt), 'deliver', c.id);
    } else if (u.task === 'deliver' && distance(u, entrance(crypt)) < 1) {
      d.remains = Math.min(REMAINS_CAP, d.remains + 1);
      d.corpses = d.corpses.filter((body) => body.id !== c.id);
      announce(
        s,
        `Une dépouille rejoint la crypte (${d.remains}/${REMAINS_CAP}).`,
      );
      idle(u);
    }
    return true;
  }
  if (needs.includes(u.task)) {
    const lot = u.target === null ? undefined : s.lots[u.target];
    const expected =
      u.task === 'eat' ? 'canteen' : u.task === 'rest' ? 'den' : 'crypt';
    if (!lot?.owned || lot.kind !== expected || lot.construction) {
      idle(u);
      return true;
    }
    walk(s, u, CREATURES[u.kind].speed * dt);
    if (!u.path.length && distance(u, entrance(lot)) < 1) {
      if (u.task === 'eat' && s.resources.food <= 0) {
        idle(u);
        return true;
      }
      u.activityProgress = (u.activityProgress ?? 0) + dt;
      if (u.task !== 'eat')
        u.hp = Math.min(CREATURES[u.kind].hp, u.hp + 4 * dt);
      if (u.activityProgress >= 4) {
        if (u.task === 'eat') u.nextMealAt = s.elapsed + 70;
        else u.nextRestAt = s.elapsed + 100;
        idle(u);
      }
    }
    return true;
  }
  return false;
}

export function thought(s: State, u: Unit): string {
  if (u.task === 'duel') return u.path.length ? 'Défi du moine' : 'Duel';
  if (u.task === 'bribe') return 'Bourse';
  if (u.task === 'collect') return 'Collecte';
  if (u.task === 'deliver') return 'Dépouille';
  if (u.task === 'haunt')
    return u.activityProgress && u.activityProgress >= 3
      ? 'Hantise'
      : 'Maléfice';
  if (u.task === 'eat') return u.path.length ? 'À table !' : 'Repas';
  if (u.task === 'rest') return u.path.length ? 'Au lit' : 'Zzz';
  if (u.task === 'restore') return u.path.length ? 'À la crypte' : 'Régénère';
  if (
    u.kind !== 'skeleton' &&
    u.kind !== 'specter' &&
    s.resources.food <= 0 &&
    s.elapsed >= (u.nextMealAt ?? 65)
  )
    return 'Faim';
  return '';
}
