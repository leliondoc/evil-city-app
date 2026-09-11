import { useState } from 'react';
import { Search } from 'lucide-react';
import { Sprite } from './Sprite';
import { BESTIARY_CREATURES, BESTIARY_HUMANS } from './bestiaryCatalog';
import { animationSequence, type Animation, type AssetKey } from './art';
import { CombatDetails } from './CombatDetails';
import { creatureCombatProfile, HUMAN_COMBAT } from './combat';
import type { HeroRole } from './engine';

export function Bestiary({ action }: { action: Animation }) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase('fr');
  const creatures = BESTIARY_CREATURES.filter((entry) =>
    `${entry.name} ${entry.description}`
      .toLocaleLowerCase('fr')
      .includes(query),
  );
  const humans = BESTIARY_HUMANS.filter((entry) =>
    `${entry.name} ${entry.description}`
      .toLocaleLowerCase('fr')
      .includes(query),
  );
  const count = creatures.length + humans.length;
  return (
    <>
      <label className="bestiary-search">
        <Search size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Chercher une unité…"
          aria-label="Chercher dans le bestiaire"
        />
        <span>
          {count}/{BESTIARY_CREATURES.length + BESTIARY_HUMANS.length}
        </span>
      </label>
      {creatures.length > 0 && (
        <section
          className="bestiary-faction"
          data-faction="horde"
          aria-label="Votre horde"
        >
          <h3>Votre horde</h3>
          <div className="bestiary-grid">
            {creatures.map((entry) => (
              <article className="bestiary-creature" key={entry.id}>
                <Sprite
                  sequence={animationSequence(
                    entry.kind,
                    action,
                    entry.mounted,
                  )}
                  figure
                  label={entry.name}
                />
                <strong>{entry.name}</strong>
                <span className="bestiary-badge available">{entry.mounted ? 'Évolution par recherche' : 'Recrutable'}</span>
                <p>{entry.description}</p>
                <CombatDetails profile={creatureCombatProfile(entry.kind, entry.mounted)} />
              </article>
            ))}
          </div>
        </section>
      )}
      {humans.length > 0 && (
        <section
          className="bestiary-faction"
          data-faction="humans"
          aria-label="Les humains"
        >
          <h3>Les humains</h3>
          <div className="bestiary-grid">
            {humans.map((entry) => (
              <article className="bestiary-creature" key={entry.id}>
                <Sprite
                  sequence={entry.actions[action] as AssetKey[]}
                  figure
                  label={entry.name}
                />
                <strong>{entry.name}</strong>
                <span className="bestiary-badge">
                  {entry.id.startsWith('hero-')
                    ? 'Guilde de l’Aube'
                    : 'Ville humaine'}
                </span>
                <p>{entry.description}</p>
                {entry.id === 'guard' || entry.id.startsWith('hero-') ? (
                  <CombatDetails profile={HUMAN_COMBAT[entry.id === 'guard' ? 'guard' : entry.id.slice(5) as HeroRole]} />
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}
      {!count && (
        <p className="reason">Aucune unité ne correspond à cette recherche.</p>
      )}
    </>
  );
}
