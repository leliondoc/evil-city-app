import { Check, LockKeyhole, ArrowUp } from 'lucide-react';
import { CreaturePortrait } from './CreaturePortrait';
import { Sprite } from './Sprite';
import type { CreatureKind } from './engine';
import type { AssetKey } from './art';

const TIERS: { level: number; name: string; building: AssetKey; units: [CreatureKind, string][]; research?: string }[] = [
  { level: 1, name: 'Grotte et cantine', building: 'cave', units: [['goblin', 'Gobelin bâtisseur'], ['spear-goblin', 'Gobelin lancier']] },
  { level: 2, name: 'Crypte', building: 'crypt-purple', units: [['skeleton', 'Squelette'], ['specter', 'Spectre'], ['alchemist', 'Alchimiste']], research: 'Chevaucheurs de cochons · recherche à la grotte' },
  { level: 3, name: 'Hutte des trolls', building: 'troll-house', units: [['troll', 'Troll'], ['minotaur', 'Minotaure']], research: 'Recherches de feu' },
];

export function ManorProgression({ level }: { level: number }) {
  return (
    <section className="manor-progression" aria-label="Paliers du manoir">
      <h4>Évolution du domaine</h4>
      <ol className="manor-tier-list">
        {TIERS.map(tier => {
          const state = tier.level <= level ? 'acquired' : tier.level === level + 1 ? 'next' : 'locked';
          const Icon = state === 'acquired' ? Check : state === 'next' ? ArrowUp : LockKeyhole;
          return (
            <li className="manor-tier" data-state={state} key={tier.level} aria-current={tier.level === level ? 'step' : undefined}>
              <div className="manor-tier-heading">
                <span className="manor-tier-number" aria-label={`Niveau ${tier.level}`}>{['I', 'II', 'III'][tier.level - 1]}</span>
                <span className="manor-tier-status"><Icon size={12} aria-hidden="true" />{state === 'acquired' ? 'Acquis' : state === 'next' ? 'Suivant' : 'Verrouillé'}</span>
              </div>
              <div className="manor-tier-content">
                <Sprite asset={tier.building} label="" className="manor-tier-building" />
                <div className="manor-tier-unlocks">
                  <h5>{tier.name}</h5>
                  <ul className="manor-tier-units" aria-label="Créatures débloquées">
                    {tier.units.map(([kind, name]) => <li key={kind} title={name}><CreaturePortrait kind={kind} label={name} /></li>)}
                  </ul>
                </div>
              </div>
              {tier.research && <p className="manor-tier-research">{tier.research}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
