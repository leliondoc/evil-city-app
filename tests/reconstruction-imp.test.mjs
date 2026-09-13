import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, tick, entrance, CREATURES, build, recruitReason } from '../app/game/engine.ts';
import { hitEnemy } from '../app/game/strategy.ts';
import { animationSequence, ASSETS, workerArt } from '../app/game/art.ts';
import { ParticleFeedback } from '../app/game/particles.ts';

function unit(s, kind, point) {
  const u = { id: s.nextId++, kind, ...point, hp: CREATURES[kind].hp, task: 'idle', target: null,
    path: [], facing: 1, fighting: false, idleTime: 0, nextMealAt: Infinity, nextRestAt: Infinity };
  s.units.push(u); return u;
}
function ruin() {
  const s = createGame('faubourg');
  s.units = []; s.workers = [];
  s.economy.workerReadyAt = s.economy.nextUpgradeAt = Infinity;
  s.economy.stocks = { gold: 100, wood: 100, food: 100 };
  const lot = s.lots[8];
  Object.assign(lot, { owned: true, kind: 'empty', ruins: { quiet: 0, progress: 0, paid: false } });
  const w = { id: s.nextId++, ...entrance(lot), site: 0, hp: 35, maxHp: 35, phase: 'harvest',
    path: [], cargo: 0, progress: -1000, facing: 1 };
  s.workers.push(w);
  return { s, lot, w };
}
function advance(s, seconds) { for (let n = 0; n < seconds * 10; n++) tick(s, 0.1); }

test('A defeated human house becomes buildable ruins with a destruction explosion', () => {
  const s = createGame('faubourg'), lot = s.lots[8], fx = new ParticleFeedback();
  const u = unit(s, 'troll', entrance(lot));
  Object.assign(u, { task: 'attack', target: lot.id });
  lot.hp = 1; lot.garrisonReleased = true;
  fx.update(s); tick(s, 0.1);
  assert.equal(lot.kind, 'empty'); assert.equal(lot.owned, true); assert.ok(lot.ruins);
  assert.equal(fx.update(s).filter(p => p.key === 'fx-explosion').length, 1);
});

test('Rebuilding requires calm, supplies and a living worker physically at the ruins', () => {
  const { s, lot, w } = ruin();
  const protector = unit(s, 'goblin', entrance(lot));
  protector.holdPosition = entrance(lot);
  advance(s, 35); assert.equal(lot.ruins.progress, 0); assert.equal(lot.ruins.paid, false);
  s.units = []; s.economy.stocks.gold = 0;
  advance(s, 35); assert.equal(lot.ruins.progress, 0);
  s.economy.stocks.gold = 100;
  tick(s, 0.1);
  assert.equal(w.rebuilding, lot.id);
  assert.equal(s.economy.stocks.gold, 80);
  assert.equal(workerArt(w, s.sites[w.site]), 'pawn-hammer-work');
  advance(s, 26);
  assert.equal(lot.kind, 'house'); assert.equal(lot.owned, false);
  assert.equal(lot.hp, lot.maxHp); assert.equal(w.rebuilding, undefined);
  assert.equal(lot.garrisonReleased, true);
});

test('Returning troops interrupt construction; a player building cancels it permanently', () => {
  const { s, lot, w } = ruin();
  advance(s, 35); assert.ok(lot.ruins.progress > 0);
  const u = unit(s, 'goblin', entrance(lot)); u.manualUntil = Infinity;
  const progress = lot.ruins.progress;
  tick(s, 0.1); assert.equal(w.rebuilding, undefined);
  advance(s, 10); assert.equal(lot.ruins.progress, progress);
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  assert.equal(build(s, lot.id, 'canteen'), '');
  assert.equal(lot.ruins, undefined);
  advance(s, 60); assert.equal(lot.owned, true); assert.equal(lot.kind, 'canteen');
});

test('A killed builder cannot finish the house remotely; naturally empty land is untouched', () => {
  const { s, lot, w } = ruin();
  advance(s, 35); const progress = lot.ruins.progress;
  w.hp = 0; advance(s, 40);
  assert.equal(lot.ruins.progress, progress);
  assert.equal(s.lots[4].kind, 'empty'); assert.equal(s.lots[4].ruins, undefined);
});

test('Imp uses every attack phase and requires its own completed tower', () => {
  const sequence = animationSequence('imp', 'attack');
  assert.deepEqual(sequence, ['imp-attack-start', 'imp-attack-loop', 'imp-attack-end']);
  assert.ok(sequence.every(key => ASSETS[key].frames > 0));
  const s = createGame(); s.lots[6].level = 3;
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  assert.match(recruitReason(s, 'imp'), /tour des braises/);
  Object.assign(s.lots[7], { kind: 'sanctum', owned: true, hp: 180 });
  assert.equal(recruitReason(s, 'imp'), '');
});

test('Imp braises provoke fighters, heal only up to maximum and respect the eight-second cooldown', () => {
  const s = createGame(); const u = unit(s, 'imp', { x: 10.5, y: 20.5 }); u.hp = 270;
  const enemy = { id: s.nextId++, kind: 'hero', role: 'warrior', x: 11.5, y: 20.5,
    hp: 500, maxHp: 500, path: [], target: 6, level: 1, damage: 0, facing: -1, attackCooldown: 0 };
  s.enemies = [enemy];
  hitEnemy(s, u, enemy, 10, 0.1);
  assert.equal(enemy.hp, 481, 'Both claw and burst bypass physical armor');
  assert.equal(u.hp, 280); assert.equal(enemy.impTauntedBy, u.id); assert.equal(enemy.impTauntedUntil, 4);
  hitEnemy(s, u, enemy, 10, 0.1); assert.equal(enemy.hp, 480);
  s.elapsed = 8; hitEnemy(s, u, enemy, 10, 0.1); assert.equal(enemy.hp, 461);
});
