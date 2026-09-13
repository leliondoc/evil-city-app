import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, CREATURES, HEROES, tick, commandUnit, entrance } from '../app/game/engine.ts';
import { throwPotion, healAlly, advanceAlchemy } from '../app/game/alchemy.ts';
import { armorPercent, physicalDamage } from '../app/game/combat.ts';
function unit(s, kind, x=10.5, y=20.5) {
 const u={id:s.nextId++,kind,x,y,hp:CREATURES[kind].hp,task:'idle',target:null,path:[],idleTime:0,facing:1,fighting:false,nextMealAt:Infinity,nextRestAt:Infinity};s.units.push(u);return u;
}
function enemy(s, role='warrior', x=14.5, y=20.5) {
 const e={id:s.nextId++,kind:'hero',role,x,y,hp:200,maxHp:200,damage:0,level:1,path:[],target:6,facing:-1,fighting:false,healTarget:null,attackCooldown:0};s.enemies.push(e);return e;
}
test('Potions travel, respect their cooldown, splash at most four enemies and ignore passive armor',()=>{
 const s=createGame();s.elapsed=1;const u=unit(s,'alchemist'),target=enemy(s);
 const others=[0.3,0.6,0.9,1.2,3].map(d=>enemy(s,'warrior',target.x+d));
 throwPotion(s,u,target);throwPotion(s,u,target);assert.equal(s.alchemy.potions.length,1);
 advanceAlchemy(s,0.1);assert.equal(target.hp,200,'No damage before impact');
 advanceAlchemy(s,1);assert.equal(target.hp,186.5,'13.5 magic damage despite 25% armor');
 for(const e of others.slice(0,3)) assert.ok(Math.abs(e.hp-191.9)<1e-8);
 for(const e of others.slice(3)) assert.equal(e.hp,200);
 assert.equal(u.hp,60);assert.equal(s.alchemy.potions.length,0);
});
test('Potions do not cross buildings or harm friendly units and hit the aimed location after a target dies',()=>{
 const s=createGame();const u=unit(s,'alchemist',4.5,4.5),e=enemy(s,'warrior',8,4.5);
 throwPotion(s,u,e);advanceAlchemy(s,1);assert.equal(e.hp,200);assert.equal(s.alchemy.potions.length,0);
 u.x=10.5;u.y=20.5;u.potionReadyAt=0;e.x=14.5;e.y=20.5;
 throwPotion(s,u,e);e.hp=0;const ally=unit(s,'skeleton',14.5,20.5);advanceAlchemy(s,1);assert.equal(ally.hp,CREATURES.skeleton.hp);
});
test('Alchemist healing prefers the most injured ally, caps HP, respects cooldown and explicit movement',()=>{
 const s=createGame();const u=unit(s,'alchemist'),a=unit(s,'troll',11),b=unit(s,'skeleton',11.5);
 a.hp=100;b.hp=5;healAlly(s,u);assert.equal(b.hp,30);assert.equal(a.hp,100);
 healAlly(s,u);assert.equal(b.hp,30);s.elapsed=8;b.hp=CREATURES.skeleton.hp-2;a.hp=CREATURES.troll.hp;
 healAlly(s,u);assert.equal(b.hp,CREATURES.skeleton.hp);
 s.elapsed=16;b.hp=10;u.task='move';healAlly(s,u);assert.equal(b.hp,10);
 b.hp=0;u.task='idle';healAlly(s,u);assert.equal(b.hp,0);
});
test('Passive armor consistently reduces physical damage for heavy humans and monsters',()=>{
 assert.equal(armorPercent({kind:'hero',role:'warrior'}),25);
 assert.equal(physicalDamage(100,{kind:'hero',role:'warrior'}),75);
 assert.equal(physicalDamage(100,{kind:'hero',role:'lancer'}),85);
 assert.equal(physicalDamage(100,{kind:'minotaur'}),80);
 assert.equal(physicalDamage(100,{kind:'troll'}),85);
 assert.equal(physicalDamage(100,{kind:'skeleton'}),90);
 assert.equal(physicalDamage(100,{kind:'alchemist'}),100);
});
test('Every occupied building deploys its defenders into the street once; the town hall fields four elite roles',()=>{
 for(const kind of ['house','tavern','hall','guild']){
  const s=createGame();const lot=s.lots.find(l=>l.kind===kind&&!l.owned);const p=entrance(lot);
  for(const neighbor of s.lots.filter(l=>Math.abs(l.id-lot.id)===3 || (Math.floor(l.id/3)===Math.floor(lot.id/3) && Math.abs(l.id-lot.id)===1))) neighbor.owned=true;
  const u=unit(s,'minotaur',p.x,lot.y+8.5);s.economy.stocks={gold:0,food:0,wood:0};
  assert.equal(commandUnit(s,u.id,{type:'lot',id:lot.id},p),'');tick(s,0.1);
  const defenders=s.enemies.filter(e=>e.garrisonLotId===lot.id);assert.ok(defenders.length);
  assert.ok(defenders.every(e=>e.y>=lot.y+8),'The fight begins outside the fence');
  if(kind==='hall'){assert.deepEqual(defenders.map(e=>e.role),Object.keys(HEROES));assert.ok(defenders.every(e=>e.maxHp>HEROES[e.role].hp));}
  const ids=defenders.map(e=>e.id);tick(s,0.1);assert.deepEqual(s.enemies.filter(e=>e.garrisonLotId===lot.id).map(e=>e.id),ids);
 }
});
test('A mixed late-game army can defeat the new town-hall garrison and capture its building',()=>{
 const s=createGame();const lot=s.lots.find(l=>l.kind==='hall');const p=entrance(lot);s.lots[5].owned=true;s.resources.food=1000;s.economy.nextUpgradeAt=Infinity;s.economy.workerReadyAt=Infinity;s.workers=[];s.economy.stocks={gold:0,food:0,wood:0};
 for(const [i,kind]of ['troll','troll','minotaur','minotaur','alchemist','alchemist','skeleton','skeleton'].entries()){
  const u=unit(s,kind,p.x+(i%3-1)*0.6,lot.y+9+(i>3?1:0));assert.equal(commandUnit(s,u.id,{type:'lot',id:lot.id},p),'');
 }
 for(let i=0;i<1200&&!lot.owned&&!s.lost;i++)tick(s,0.1);
 assert.equal(lot.owned,true);assert.ok(s.units.length>0);
});
