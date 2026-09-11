import { useState } from 'react';
import { Search } from 'lucide-react';
import { Sprite } from './Sprite';
import { BESTIARY_CREATURES, BESTIARY_HUMANS } from './bestiaryCatalog';
import { animationSequence, type Animation, type AssetKey } from './art';

export function Bestiary({ action }: { action: Animation }) {
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
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
                    entry.id,
                    action,
                    entry.id === 'spear-goblin' && mounted,
                  )}
                  ground="terrain-5"
                  figure
                  label={entry.name}
                />
                <strong>{entry.name}</strong>
                <span className="bestiary-badge available">Recrutable</span>
                <p>{entry.description}</p>
                {entry.id === 'spear-goblin' && (
                  <button
                    className="bestiary-mount"
                    aria-pressed={mounted}
                    onClick={() => setMounted((value) => !value)}
                  >
                    {mounted ? 'Voir à pied' : 'Voir le chevaucheur de cochon'}
                  </button>
                )}
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
                  ground={entry.terrain as AssetKey}
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
