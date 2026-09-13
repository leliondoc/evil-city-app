import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, capacity, rates, foodBalance } from '../app/game/engine.ts';
import { upgradePreview } from '../app/game/upgradePreview.ts';

const site = (s, id, kind, level) => Object.assign(s.lots[id], { kind, level, owned: true, construction: null });
test('Army preview includes base capacity and every other cave without changing state', () => {
  const s = createGame(), lot = site(s, 3, 'den', 2);
  site(s, 7, 'den', 1);
  const before = JSON.stringify(s), preview = upgradePreview(s, lot);
  assert.equal(preview.from, '24 places'); assert.equal(preview.to, '30 places');
  assert.equal(JSON.stringify(s), before);
  lot.level++; assert.equal(preview.to, `${capacity(s)} places`);
  assert.equal(upgradePreview(s, lot), null);
});
test('A weaker canteen or troll hut never promises an additional global bonus', () => {
  for (const kind of ['canteen', 'forge']) {
    const s = createGame(), lot = site(s, 7, kind, 1);
    site(s, 4, kind, 3);
    const preview = upgradePreview(s, lot);
    assert.equal(preview.from, preview.to);
    assert.match(preview.note, /Aucun gain global/);
  }
});
test('A canteen overtaking another one previews the new best bonus and actual food consumption', () => {
  const s = createGame(), lot = site(s, 7, 'canteen', 2);
  site(s, 4, 'canteen', 2);
  s.units.push({ kind: 'troll' }, { kind: 'goblin' }, { kind: 'skeleton' });
  const before = foodBalance(s).consumption, preview = upgradePreview(s, lot);
  assert.equal(preview.from, '−40 %'); assert.equal(preview.to, '−60 %');
  lot.level++;
  assert.ok(preview.note.includes(`${before} → ${foodBalance(s).consumption} vivres/min`));
});
test('Essence previews show the whole domain, including conquered buildings', () => {
  for (const kind of ['hq', 'crypt', 'guild']) {
    const s = createGame(), lot = site(s, 7, kind, 1);
    site(s, 4, 'crypt', 2); site(s, 5, 'guild', 1); site(s, 8, 'hall', 1);
    const preview = upgradePreview(s, lot);
    const display = n => Number(n.toFixed(1)).toLocaleString('fr') + '/min';
    assert.equal(preview.from, display(rates(s).mana * 60));
    lot.level++;
    assert.equal(preview.to, display(rates(s).mana * 60));
    assert.match(preview.note, /Ce bâtiment/);
  }
});
