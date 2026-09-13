import { entrance, findPath, walk, resourceApproach, supplyActive, type State, type Lot, type HumanWorker, type Point } from './engine.ts';
import { isHaunted } from './domain.ts';

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const damaged = (lot: Lot) => lot.kind !== 'empty' && !lot.construction && lot.hp > 0 && lot.hp < lot.maxHp;
const blocked = (s: State, lot: Lot) => isHaunted(s, lot) || (lot.owned ? s.enemies : s.units).some(actor => actor.hp > 0 && distance(actor, entrance(lot)) < 8);

function releaseWorker(s: State, worker: HumanWorker) {
  delete worker.repairing;
  worker.phase = worker.cargo > 0 ? 'return' : 'outbound';
  worker.progress = 0;
  const site = s.sites[worker.site];
  worker.path = findPath(worker, worker.cargo > 0 ? entrance(s.lots[site.home]) : resourceApproach(site));
}

/** Repairs require a living worker at the gate; fighting interrupts the work. */
export function advanceRepairs(s: State, dt: number) {
  for (const lot of s.lots) {
    lot.repairQuiet = damaged(lot) && !blocked(s, lot) ? (lot.repairQuiet ?? 0) + dt : 0;
  }
  for (const unit of s.units.filter(u => u.task === 'repair')) {
    const lot = unit.target === null ? undefined : s.lots[unit.target];
    if (!lot || !lot.owned || !damaged(lot) || blocked(s, lot) || unit.hp <= 0) {
      unit.task = 'idle'; unit.target = null; unit.path = []; continue;
    }
    if (unit.knockback) continue;
    if (!unit.path.length && distance(unit, entrance(lot)) > 0.8) unit.path = findPath(unit, entrance(lot));
    walk(s, unit, 1.8 * dt);
    if (!unit.path.length && distance(unit, entrance(lot)) <= 0.8) lot.hp = Math.min(lot.maxHp, lot.hp + 4 * dt);
  }
  for (const worker of s.workers.filter(w => w.repairing !== undefined)) {
    const lot = s.lots[worker.repairing!];
    if (!lot || lot.owned || !damaged(lot) || blocked(s, lot) || worker.hp <= 0 || !supplyActive(s, s.sites[worker.site])) {
      releaseWorker(s, worker); continue;
    }
    if (!worker.path.length && distance(worker, entrance(lot)) > 0.8) worker.path = findPath(worker, entrance(lot));
    walk(s, worker, 1.8 * dt);
    if (!worker.path.length && distance(worker, entrance(lot)) <= 0.8) lot.hp = Math.min(lot.maxHp, lot.hp + 4 * dt);
  }
  for (const lot of s.lots.filter(l => damaged(l) && (l.repairQuiet ?? 0) >= 5)) {
    const gate = entrance(lot);
    if (lot.owned) {
      if (s.units.some(u => u.hp > 0 && u.task === 'repair' && u.target === lot.id)) continue;
      const unit = s.units.filter(u => u.kind === 'goblin' && u.hp > 0 && !u.manualRest && !u.holdPosition && !u.knockback && !(u.manualUntil !== undefined && u.manualUntil > s.elapsed) && (u.task === 'idle' || u.task === 'forage') && !(u.gathering?.cargo) && !u.fighting)
        .sort((a, b) => distance(a, gate) - distance(b, gate))[0];
      if (!unit) continue;
      const path = findPath(unit, gate);
      if (!path.length && distance(unit, gate) > 0.8) continue;
      unit.task = 'repair'; unit.target = lot.id; unit.path = path; unit.idleTime = 0;
    } else {
      if (s.workers.some(w => w.hp > 0 && w.repairing === lot.id)) continue;
      const worker = s.workers.filter(w => w.hp > 0 && w.repairing === undefined && w.rebuilding === undefined && w.cannonId === undefined && !w.recovery && w.cargo === 0 && supplyActive(s, s.sites[w.site]))
        .sort((a, b) => distance(a, gate) - distance(b, gate))[0];
      if (!worker) continue;
      const path = findPath(worker, gate);
      if (!path.length && distance(worker, gate) > 0.8) continue;
      worker.repairing = lot.id; worker.path = path;
    }
  }
}
