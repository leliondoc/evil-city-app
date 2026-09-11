import { upgradeAndFinish } from './upgrade-fixture.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  upgrade,
  upgradeReason,
  build,
  buildReason,
  claim,
  claimReason,
  attack,
  intercept,
  army,
  recruitReason,
  buildUnlockReason,
  buildMenuReason,
  capacity,
  rates,
  armyDamage,
  foodBalance,
  recruit,
  tick,
} from '../app/game/engine.ts';
import { research, RESEARCH, advanceResearch } from '../app/game/strategy.ts';
import {
  manorLevel,
  upgradeBenefit,
  buildingLevelEffect,
} from '../app/game/progression.ts';
import { mission } from '../app/game/mission.ts';

function funded() {
  const s = createGame();
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  return s;
}

test('The actual starting resources fund all three manor tiers through harvesting and a tier-one conquest', (t) => {
  const s = createGame();
  const milestones = [];
  let previous;
  for (
    let step = 0;
    step < 6000 &&
    !s.lost &&
    !s.lots.some((l) => l.owned && l.kind === 'forge');
    step++
  ) {
    const { current, hint } = mission(s);
    if (current?.id !== previous) {
      milestones.push(`${current?.id}@${Math.round(s.elapsed)}s`);
      previous = current?.id;
    }
    const workers =
      s.units.filter((u) => u.kind === 'goblin').length +
      s.recruits.filter((r) => r.kind === 'goblin').length;
    if (workers < 6 && !recruitReason(s, 'goblin')) recruit(s, 'goblin');
    const action = hint.action;
    if (action?.type === 'recruit' && !hint.reason) recruit(s, action.kind);
    else if (action?.type === 'inspect') {
      if (current.id === 'manor2' || current.id === 'manor3') {
        if (!upgradeReason(s, action.lotId)) upgrade(s, action.lotId);
      } else if (
        action.buildKind &&
        !buildReason(s, action.lotId, action.buildKind)
      ) {
        build(s, action.lotId, action.buildKind);
      } else if (current.id === 'claim' && !claimReason(s, action.lotId)) {
        claim(s, action.lotId);
      } else if (
        current.id === 'capture' &&
        !army(s).some((u) => u.task === 'attack')
      ) {
        attack(s, action.lotId);
      }
    }
    const threat = s.enemies.find((e) => e.hp > 0);
    if (
      threat &&
      current?.id !== 'capture' &&
      army(s).length &&
      !army(s).some((u) => u.task === 'defend' && u.target === threat.id)
    )
      intercept(s, threat.id);
    tick(s, 0.1);
  }
  t.diagnostic(milestones.join(' → '));
  assert.equal(s.lost, false);
  assert.equal(manorLevel(s), 3);
  assert.ok(
    s.lots.some((l) => l.owned && l.kind === 'forge'),
    `Progress stopped: ${milestones.join(' → ')}`,
  );
  assert.ok(
    milestones.findIndex((m) => m.startsWith('capture@')) <
      milestones.findIndex((m) => m.startsWith('manor2@')),
  );
});

test('Every construction entry point enforces the manor tier before spending resources', () => {
  for (const [kind, tier] of [
    ['crypt', 2],
    ['forge', 3],
  ]) {
    const s = funded();
    Object.assign(s.lots[5], {
      owned: true,
      kind: kind === 'crypt' ? 'canteen' : 'crypt',
    });
    const before = structuredClone(s);
    const expected = new RegExp(`manoir au niveau ${tier}`);
    assert.match(buildUnlockReason(s, kind), expected);
    assert.match(buildMenuReason(s, kind), expected);
    assert.match(build(s, 7, kind), expected);
    assert.deepEqual(s, before);
    while (manorLevel(s) < tier) assert.equal(upgradeAndFinish(s, 6), '');
    assert.equal(buildUnlockReason(s, kind), '');
    s.lots[5].construction = { kind: s.lots[5].kind, progress: 0.9 };
    assert.match(buildUnlockReason(s, kind), /Terminez/);
    s.lots[5].construction = null;
    s.lots[5].hp = 0;
    assert.match(buildUnlockReason(s, kind), /Terminez/);
  }
});

test('Building upgrades are capped by the manor and rejected orders do not spend or mutate', () => {
  for (const kind of ['den', 'canteen', 'crypt', 'forge', 'guild']) {
    const s = funded();
    Object.assign(s.lots[7], { kind, owned: true });
    for (const level of [1, 2]) {
      const before = structuredClone(s);
      assert.match(upgradeReason(s, 7), /manoir/);
      assert.ok(upgrade(s, 7));
      assert.deepEqual(s, before);
      assert.equal(upgradeAndFinish(s, 6), '');
      assert.equal(upgradeAndFinish(s, 7), '');
      assert.equal(s.lots[7].level, level + 1);
      assert.equal(s.lots[7].level, manorLevel(s));
    }
    const before = structuredClone(s);
    assert.match(upgrade(s, 7), /maximal/);
    assert.deepEqual(s, before);
  }
});

test('Captured properties with no level benefit cannot consume upgrade resources', () => {
  for (const kind of ['house', 'tavern', 'hall']) {
    const s = funded();
    Object.assign(s.lots[5], { owned: true, kind });
    const before = structuredClone(s);
    assert.match(upgrade(s, 5), /pas d’amélioration/);
    assert.deepEqual(s, before);
    assert.equal(upgradeBenefit(s.lots[5]), '');
  }
});

test('All research tiers are required even with a funded room; upgrades never grant research for free', () => {
  for (const [key, def] of Object.entries(RESEARCH)) {
    const s = funded();
    Object.assign(s.lots[5], { owned: true, kind: def.room });
    if (key === 'chain') s.strategy.research.push('embers');
    const before = structuredClone(s);
    assert.match(research(s, key), new RegExp(`niveau ${def.manor}`));
    assert.deepEqual(s, before);
    while (manorLevel(s) < def.manor) assert.equal(upgradeAndFinish(s, 6), '');
    assert.ok(!s.strategy.research.includes(key));
    assert.equal(research(s, key), '');
    advanceResearch(s, def.duration - 1);
    assert.ok(!s.strategy.research.includes(key));
    advanceResearch(s, 1);
    assert.ok(s.strategy.research.includes(key));
  }
});

test('Upgrade descriptions reflect the actual capacity, economy and army benefits', () => {
  const s = funded();
  recruit(s, 'spear-goblin');
  tick(s, 6.1);
  const soldier = s.units[0];
  assert.match(upgradeBenefit(s.lots[6]), /crypte.*cochons/);
  const essence = rates(s).mana;
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.ok(Math.abs(rates(s).mana - essence - 0.18) < 1e-8);
  assert.match(upgradeBenefit(s.lots[6]), /hutte.*feu/);
  assert.equal(upgradeAndFinish(s, 6), '');
  assert.match(upgradeBenefit(s.lots[3]), /6 → 12/);
  const places = capacity(s);
  upgradeAndFinish(s, 3);
  assert.equal(capacity(s) - places, 6);
  for (const kind of ['crypt', 'guild']) {
    Object.assign(s.lots[7], { kind, level: 1 });
    const before = rates(s).mana;
    upgradeAndFinish(s, 7);
    assert.ok(
      Math.abs(rates(s).mana - before - (kind === 'crypt' ? 0.4 : 0.3)) < 1e-8,
    );
  }
  Object.assign(s.lots[7], { kind: 'forge', level: 1 });
  const damage = armyDamage(s, soldier);
  upgradeAndFinish(s, 7);
  assert.ok(Math.abs(armyDamage(s, soldier) / damage - 1.15) < 1e-8);
  assert.match(buildingLevelEffect('forge', 2), /\+15 %/);
  s.resources = { gold: 1000, wood: 1000, food: 1000, mana: 1000 };
  Object.assign(s.lots[7], { kind: 'canteen', level: 1 });
  s.units = Array.from({ length: 10 }, (_, i) => ({ ...soldier, id: i + 100 }));
  assert.equal(foodBalance(s).consumption, 24);
  upgradeAndFinish(s, 7);
  assert.equal(foodBalance(s).consumption, 18);
  upgradeAndFinish(s, 7);
  assert.equal(foodBalance(s).consumption, 12);
});
