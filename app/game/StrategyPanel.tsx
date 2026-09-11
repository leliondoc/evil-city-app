import { useState } from 'react';
import { CREATURES, type State, type Lot } from './engine';
import {
  RESEARCH,
  research,
  researchReason,
  towerOrder,
  towerOccupant,
  towerInfluence,
  releaseTower,
  falseAlarm,
  lureReason,
  collectLoot,
  lootReason,
  type Research,
} from './strategy';
import { ASSETS } from './art';
import { GameButton as Button, PackIcon } from './PackUI';
import { AbilityCard, AbilityCosts } from './AbilityCard';
import { manorRequirement } from './progression';
const researchTime = (seconds: number) => {
  const remaining = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(remaining / 60)} min ${String(remaining % 60).padStart(2, '0')} s`;
};
type Action = (action: (s: State) => string | void) => unknown;
export function ResearchPanel({
  state: s,
  lot,
  onAction,
}: {
  state: State;
  lot: Lot;
  onAction: Action;
}) {
  if (!lot.owned || !['forge', 'crypt', 'den'].includes(lot.kind)) return null;
  return (
    <AbilityCard
      title="Recherches"
      icon={
        lot.kind === 'crypt'
          ? 'alchemist-avatar'
          : lot.kind === 'den'
            ? 'spear-goblin-avatar'
            : 'ui-sword'
      }
    >
      <p className="ability-meta">Améliorations permanentes · toute l’armée</p>
      {(Object.keys(RESEARCH) as Research[])
        .filter((key) => RESEARCH[key].room === lot.kind)
        .map((key) => {
          const r = RESEARCH[key],
            error = researchReason(s, key),
            acquired = s.strategy.research.includes(key),
            pending = s.strategy.pendingResearch?.find((job) => job.key === key),
            activeRoom = s.lots.some((room) => room.owned && room.hp > 0 && !room.construction && room.kind === r.room),
            tierError = manorRequirement(s, r.manor);
          return (
            <div className="research-choice" key={key}>
              <h5>{r.name}</h5>
              <p>{r.text}</p>
              <p className="ability-prerequisite">Prérequis : manoir niveau {r.manor}.</p>
              {!acquired && !pending && (
                <AbilityCosts cost={r.cost} available={s.resources} />
              )}
              {!acquired && <p className="ability-meta">Durée de recherche : {researchTime(r.duration)} · temps de jeu</p>}
              {pending && (
                <div className="research-progress">
                  <progress aria-label={`Recherche ${r.name}`} max={r.duration} value={pending.elapsed} />
                  <span>{researchTime(r.duration - pending.elapsed)} restantes{!activeRoom ? ' · Suspendue : reconstruisez le bâtiment requis.' : tierError ? ` · Suspendue : ${tierError}` : ''}</span>
                </div>
              )}
              <Button
                className="primary-btn"
                disabled={!!error}
                title={error || r.text}
                onClick={() => onAction((s) => research(s, key))}
              >
                {acquired ? 'Recherche acquise' : pending ? 'Recherche en cours…' : 'Rechercher'}
              </Button>
              {!acquired && (
                <p className="ability-status" data-blocked={!!error}>
                  <PackIcon asset="ui-info" /><span>{error || 'Recherche disponible'}</span>
                </p>
              )}
            </div>
          );
        })}
      <details className="ability-details">
        <summary>Combiner les effets</summary>
        <p>
          Feu + solvant : dégâts de feu ×2,5 contre les chevaliers et lanciers,
          ×2 contre les autres ennemis. Les braises propagent l’incendie.
        </p>
      </details>
      <p className="ability-footer">{s.strategy.comboHits} impacts combinés</p>
    </AbilityCard>
  );
}
export function TowerPanel({
  state: s,
  id,
  onAction,
}: {
  state: State;
  id: number;
  onAction: Action;
}) {
  const [choice, setChoice] = useState('');
  const tower = s.strategy.towers[id],
    occupant = towerOccupant(s, tower);
  const candidates = s.units.filter(
    (u) =>
      u.hp > 0 &&
      (!tower.owned || ['goblin', 'skeleton', 'specter'].includes(u.kind)),
  );
  const chosen =
    candidates.find((u) => String(u.id) === choice) ??
    candidates.find((u) => u.id === tower.occupant) ??
    candidates[0];
  const alarmError = lureReason(s, id),
    lootError = lootReason(s, id);
  return (
    <section className="selection-panel" aria-label="Détails de la tour">
      <h3 className="selection-name">{tower.name}</h3>
      <img
        className="tower-portrait"
        src={ASSETS[tower.owned ? 'tower-purple' : 'tower-blue'].src}
        alt=""
      />
      <p>
        {tower.owned
          ? 'Gobelin : racket. Squelette : guet et appel des défenseurs proches. Spectre : fausse alerte.'
          : 'Tenez la porte avec une créature pendant 8 secondes sans ennemi à proximité.'}
      </p>
      <p>
        {occupant
          ? `En poste : ${CREATURES[occupant.kind].name}`
          : tower.occupant
            ? 'La garnison est en route.'
            : 'Tour sans garnison.'}
      </p>
      <p className="reason">
        Influence :{' '}
        {towerInfluence(s, tower)
          .map((range) => `${range.label} : ${range.radius} cases`)
          .join(' · ')}
        .
      </p>
      {tower.progress > 0 && (
        <p>Capture : {Math.floor((tower.progress / 8) * 100)} %</p>
      )}
      {tower.reclaim > 0 && (
        <p className="reason">
          Reprise humaine : {Math.floor((tower.reclaim / 8) * 100)} %
        </p>
      )}
      <label className="tower-choice">
        Créature à envoyer
        <select
          value={chosen?.id ?? ''}
          onChange={(e) => setChoice(e.target.value)}
          disabled={s.won || s.lost || !candidates.length}
        >
          {!candidates.length && (
            <option value="">Aucune créature disponible</option>
          )}
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {CREATURES[u.kind].name} · {Math.ceil(u.hp)} PV
            </option>
          ))}
        </select>
      </label>
      <Button
        className="primary-btn"
        disabled={!chosen || chosen.id === tower.occupant || s.won || s.lost}
        onClick={() => chosen && onAction((s) => towerOrder(s, id, chosen.id))}
      >
        {chosen?.id === tower.occupant
          ? occupant
            ? 'Déjà en poste'
            : 'Garnison en route'
          : tower.owned
            ? 'Remplacer la garnison'
            : 'Capturer la tour'}
      </Button>
      {tower.owned && (
        <>
          <Button
            className="subtle-btn"
            disabled={!tower.occupant || s.won || s.lost}
            onClick={() => onAction((s) => releaseTower(s, id))}
          >
            Rappeler la garnison
          </Button>
          <AbilityCard title="Racket" icon="goblin-avatar">
            <p className="ability-meta">
              {Object.values(tower.loot).some((value) => value > 0)
                ? 'Butin à rapporter'
                : 'Aucun butin stocké'}
            </p>
            <AbilityCosts cost={tower.loot} label="Butin stocké" />
            <p>
              Le gobelin prélève 30 % des cargaisons proches. Limite : 30 par
              ressource. Le racket augmente la suspicion.
            </p>
            <Button
              className="primary-btn"
              disabled={!!lootError}
              title={lootError}
              onClick={() => onAction((s) => collectLoot(s, id))}
            >
              Rapporter le butin
            </Button>
            <p className="ability-status" data-blocked={!!lootError}>
              <PackIcon asset="ui-info" /><span>{lootError ||
                'Un gobelin libre rapporte le butin à pied. Sa mort ou un nouvel ordre fait perdre la cargaison.'}</span>
            </p>
          </AbilityCard>
          <AbilityCard title="Fausse alerte" icon="specter-avatar">
            <p>
              Attire les patrouilles proches pendant 12 s. Un combat engagé
              reste prioritaire ; les moines ne sont pas dupes.
            </p>
            <AbilityCosts cost={{ mana: 15 }} available={s.resources} />
            <Button
              className="primary-btn"
              disabled={!!alarmError}
              title={alarmError}
              onClick={() => onAction((s) => falseAlarm(s, id))}
            >
              Déclencher l’alerte
            </Button>
            <p className="ability-status" data-blocked={!!alarmError}>
              <PackIcon asset="ui-info" /><span>{alarmError || 'Disponible · récupération 60 s'}</span>
            </p>
          </AbilityCard>
          <p>
            Sans garnison, les humains reprennent la tour en 8 s. Le butin
            stocké est perdu.
          </p>
        </>
      )}
    </section>
  );
}
