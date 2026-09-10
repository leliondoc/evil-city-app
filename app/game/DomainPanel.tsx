import type { Lot, State, Unit } from './engine';
import {
  BRIBE_GOLD,
  REMAINS_CAP,
  bribeReason,
  haunt,
  hauntReason,
  isHaunted,
  raiseSkeleton,
  ritualReason,
  sendBribe,
  thought,
} from './domain';
import { GameButton as Button } from './PackUI';
import { ResearchPanel } from './StrategyPanel';

export function DomainPanel({
  state: s,
  lot,
  unit,
  onAction,
}: {
  state: State;
  lot?: Lot;
  unit?: Unit;
  onAction: (action: (s: State) => string | void) => unknown;
}) {
  const locked = s.won || s.lost;
  const hauntError = lot ? hauntReason(s, lot.id) : '';
  const bribeError = bribeReason(s);
  const ritualError = ritualReason(s);
  return (
    <>
      {lot && <ResearchPanel state={s} lot={lot} onAction={onAction} />}
      {lot && !lot.owned && (
        <div className="domain-card">
          <strong>Résurrection humaine</strong>
          <p>
            {s.domain.souls.filter((body) => body.home === lot.id).length}{' '}
            dépouilles prêtes ici. Rituel : 10 s, 25 or et 15 viande humains,
            retour à 60 % de vie, une seule fois. Attaquer le moine, hanter ou
            capturer le bâtiment interrompt le rituel.
          </p>
          <p>{s.domain.resurrected} résurrections dans le quartier.</p>
        </div>
      )}
      {unit && (
        <div className="domain-card">
          <strong>{thought(s, unit) || 'Prêt à recevoir vos ordres'}</strong>
          {unit.kind === 'specter' ? (
            <p>
              Envoyez ce spectre sur un bâtiment humain pour le hanter.
              Récupération :{' '}
              {Math.ceil(Math.max(0, (unit.hauntReadyAt ?? 0) - s.elapsed))} s.
            </p>
          ) : (
            <p>
              Au calme, les créatures rejoignent leur cantine ou leur lieu de
              repos. Vos ordres passent en priorité.
            </p>
          )}
        </div>
      )}
      {lot && !lot.owned && lot.kind !== 'empty' && (
        <div className="domain-card">
          <strong>
            {isHaunted(s, lot)
              ? `Hanté · ${Math.ceil((lot.hauntedUntil ?? 0) - s.elapsed)} s`
              : 'Un mauvais voisinage'}
          </strong>
          <p>
            Un spectre suspend les livraisons et les départs de renforts pendant
            30 s. Le moine de la guilde le fait sortir et l’affronte dans la
            rue.
          </p>
          <Button
            className="subtle-btn"
            disabled={!!hauntError}
            title={hauntError || 'Envoyer un spectre'}
            onClick={() => onAction((state) => haunt(state, lot.id))}
          >
            Hanter ce bâtiment
          </Button>
          {hauntError && <p className="reason">{hauntError}</p>}
        </div>
      )}
      {lot?.kind === 'hall' && !lot.owned && (
        <div className="domain-card">
          <strong>Acheter le silence · {BRIBE_GOLD} or</strong>
          <p>
            Un gobelin livre la bourse à pied. À l’arrivée : prochaine
            patrouille retardée de 45 s et suspicion −15. Bourse perdue s’il est
            tué ou rappelé.
          </p>
          <Button
            className="subtle-btn"
            disabled={!!bribeError}
            title={bribeError || 'Envoyer la bourse'}
            onClick={() => onAction(sendBribe)}
          >
            Envoyer un pot-de-vin
          </Button>
          <p className="reason">
            {bribeError || 'Une bourse au maximum toutes les 120 s.'}
          </p>
          {s.domain.lastBribe && <p>{s.domain.lastBribe}</p>}
        </div>
      )}
      {lot?.owned && lot.kind === 'crypt' && (
        <div className="domain-card">
          <strong>
            Dépouilles · {s.domain.remains}/{REMAINS_CAP}
          </strong>
          <p>
            Les gobelins libres rapportent les morts hors du danger. Les paysans
            récupèrent aussi les leurs. Les squelettes et spectres ne laissent
            aucun reste utilisable.
          </p>
          <Button
            className="subtle-btn"
            disabled={!!ritualError}
            title={ritualError || 'Deux dépouilles et 12 essence'}
            onClick={() => onAction(raiseSkeleton)}
          >
            Relever un squelette · 12 essence
          </Button>
          <p className="reason">
            {ritualError ||
              '2 dépouilles · rituel 12 s · récupération 45 s · 1 place.'}
          </p>
          <label className="domain-toggle">
            <input
              type="checkbox"
              checked={s.domain.autoCollect}
              disabled={locked}
              onChange={() =>
                onAction((state) => {
                  state.domain.autoCollect = !state.domain.autoCollect;
                })
              }
            />
            Collecte automatique des dépouilles
          </label>
          <p>
            {s.domain.corpses.filter((c) => !c.carrier).length} dépouilles au
            sol · {s.domain.recoveredByHumans} récupérées par les humains.
          </p>
        </div>
      )}
    </>
  );
}
