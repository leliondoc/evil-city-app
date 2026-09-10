import { useState } from 'react';
import { CREATURES, RESOURCE_LABELS, type State, type Lot } from './engine';
import {
  RESEARCH,
  research,
  researchReason,
  towerOrder,
  towerOccupant,
  releaseTower,
  falseAlarm,
  lureReason,
  collectLoot,
  lootReason,
  type Research,
} from './strategy';
import { ASSETS } from './art';
import { GameButton as Button } from './PackUI';
type Action = (action: (s: State) => string | void) => unknown;
const costs = (value: Partial<State['resources']>) =>
  Object.entries(value)
    .filter(([, n]) => n > 0)
    .map(
      ([key, n]) =>
        `${n} ${RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS]}`,
    )
    .join(' · ');
export function ResearchPanel({
  state: s,
  lot,
  onAction,
}: {
  state: State;
  lot: Lot;
  onAction: Action;
}) {
  if (!lot.owned || !['forge', 'crypt'].includes(lot.kind)) return null;
  return (
    <div className="domain-card">
      <strong>Atelier des combos</strong>
      <p>
        Feu + solvant : dégâts de feu doublés. Les braises propagent l’incendie.
        Les améliorations s’appliquent à toute l’armée.
      </p>
      {(Object.keys(RESEARCH) as Research[])
        .filter((key) => RESEARCH[key].room === lot.kind)
        .map((key) => {
          const r = RESEARCH[key],
            error = researchReason(s, key);
          return (
            <div className="research-choice" key={key}>
              <strong>{r.name}</strong>
              <p>{r.text}</p>
              <p>{costs(r.cost)}</p>
              <Button
                className="subtle-btn"
                disabled={!!error}
                title={error || r.text}
                onClick={() => onAction((s) => research(s, key))}
              >
                {s.strategy.research.includes(key) ? 'Acquise' : 'Rechercher'}
              </Button>
              {error && <p className="reason">{error}</p>}
            </div>
          );
        })}
      <p>{s.strategy.comboHits} impacts combinés déclenchés.</p>
    </div>
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
    candidates.find((u) => String(u.id) === choice) ?? candidates[0];
  const alarmError = lureReason(s, id),
    lootError = lootReason(s, id);
  return (
    <section className="selection-panel" aria-label="Détails de la tour">
      <p className="eyebrow">
        {tower.owned ? 'Votre poste de quartier' : 'Tour humaine à capturer'}
      </p>
      <h3>{tower.name}</h3>
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
              {CREATURES[u.kind].name} #{u.id} · {Math.ceil(u.hp)} PV
            </option>
          ))}
        </select>
      </label>
      <Button
        className="primary-btn"
        disabled={!chosen || s.won || s.lost}
        onClick={() => chosen && onAction((s) => towerOrder(s, id, chosen.id))}
      >
        {tower.owned ? 'Affecter à la tour' : 'Capturer la tour'}
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
          <div className="domain-card">
            <strong>Butin : {costs(tower.loot) || 'aucun'}</strong>
            <p>
              Le gobelin prélève 30 % des cargaisons proches. Limite : 30 par
              ressource. Le racket augmente la suspicion.
            </p>
            <Button
              className="subtle-btn"
              disabled={!!lootError}
              title={lootError}
              onClick={() => onAction((s) => collectLoot(s, id))}
            >
              Rapporter le butin
            </Button>
            <p className="reason">
              {lootError ||
                'Un gobelin libre rapporte le butin à pied. Sa mort ou un nouvel ordre fait perdre la cargaison.'}
            </p>
          </div>
          <div className="domain-card">
            <strong>Fausse alerte · 15 essence</strong>
            <p>
              Attire les patrouilles proches pendant 12 s. Un combat engagé
              reste prioritaire ; les moines ne sont pas dupes.
            </p>
            <Button
              className="subtle-btn"
              disabled={!!alarmError}
              title={alarmError}
              onClick={() => onAction((s) => falseAlarm(s, id))}
            >
              Déclencher la fausse alerte
            </Button>
            <p className="reason">
              {alarmError || 'Disponible · récupération 60 s'}
            </p>
          </div>
          <p>
            Sans garnison, les humains reprennent la tour en 8 s. Le butin
            stocké est perdu.
          </p>
        </>
      )}
    </section>
  );
}
