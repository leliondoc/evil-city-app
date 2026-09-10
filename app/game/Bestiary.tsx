import { useState } from 'react';
import { Search } from 'lucide-react';
import catalog from './bestiary.json';
import { Sprite } from './Sprite';
import type { Animation, AssetKey } from './art';

export function Bestiary({ action }: { action: Animation }) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase('fr');
  const entries = catalog.filter((entry) =>
    `${entry.name} ${entry.original}`.toLocaleLowerCase('fr').includes(query),
  );
  return (
    <>
      <label className="bestiary-search">
        <Search size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Chercher une créature…"
          aria-label="Chercher dans le bestiaire"
        />
        <span>
          {entries.length}/{catalog.length}
        </span>
      </label>
      <div className="bestiary-grid">
        {entries.map((entry) => (
          <article className="bestiary-creature" key={entry.id}>
            <Sprite
              sequence={entry.actions[action] as AssetKey[]}
              figure
              label={`${entry.name} — ${action === 'idle' ? 'repos' : action === 'walk' ? 'déplacement' : 'attaque'}`}
            />
            <strong>{entry.name}</strong>
            <span
              className={`bestiary-badge ${entry.recruitable ? 'available' : ''}`}
            >
              {entry.recruitable
                ? 'Recrutable'
                : entry.group === 'humans'
                  ? 'Faction humaine'
                  : 'Réserve du bestiaire'}
            </span>
            <p>{entry.description}</p>
            {!entry.recruitable && entry.group === 'creatures' && (
              <p className="bestiary-note">
                Animations disponibles · recrutement à venir.
              </p>
            )}
          </article>
        ))}
      </div>
      {!entries.length && (
        <p className="reason">
          Aucune créature ne correspond à cette recherche.
        </p>
      )}
    </>
  );
}
