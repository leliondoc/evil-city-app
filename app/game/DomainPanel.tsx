import { recruitmentSource, type Lot, type State, type Unit } from './engine';
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
import { AbilityCard, AbilityCosts } from './AbilityCard';
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
  const researchLot =
    lot ??
    (unit?.kind === 'spear-goblin'
      ? recruitmentSource(s, unit.kind)
      : undefined);
  const locked = s.won || s.lost;
  const hauntError = lot ? hauntReason(s, lot.id) : '';
  const bribeError = bribeReason(s);
  const ritualError = ritualReason(s);
  const resurrectionSite =
    lot &&
    !lot.owned &&
    lot.kind !== 'empty' &&
    (s.sites.some((site) => site.home === lot.id) ||
      s.domain.souls.some((body) => body.home === lot.id));
  return (
    <>
      {researchLot && (
        <ResearchPanel state={s} lot={researchLot} onAction={onAction} />
      )}
      {resurrectionSite && (
        <AbilityCard
          title="Résurrection humaine"
          icon="ui-shield"
          badge={`${s.domain.souls.filter((body) => body.home === lot.id).length} ici`}
        >
          <p>
            Le moine rend <b>60 % de vie</b> à un humain tombé, une seule fois.
          </p>
          <AbilityCosts cost={{ gold: 25, food: 15 }} />
          <p className="ability-meta">Stocks humains · rituel de 10 s</p>
          <details className="ability-details">
            <summary>Comment l’interrompre</summary>
            <p>Attaquez le moine, hantez ou capturez le bâtiment.</p>
          </details>
          <p className="ability-footer">
            {s.domain.resurrected} résurrections dans le quartier
          </p>
        </AbilityCard>
      )}
      {unit && (
        <AbilityCard
          title={thought(s, unit) || 'Ordres et besoins'}
          icon={unit.kind === 'specter' ? 'specter-avatar' : 'ui-info'}
        >
          {unit.kind === 'specter' ? (
            <>
              <p>Envoyez le spectre hanter un bâtiment humain.</p>
              <p className="ability-meta">
                Récupération :{' '}
                {Math.ceil(Math.max(0, (unit.hauntReadyAt ?? 0) - s.elapsed))} s
              </p>
            </>
          ) : (
            <p>
              Au calme, les créatures vont manger et se reposer. Vos ordres
              restent prioritaires.
            </p>
          )}
        </AbilityCard>
      )}
      {lot && !lot.owned && lot.kind !== 'empty' && (
        <AbilityCard
          title="Hantise"
          icon="specter-avatar"
          badge={
            isHaunted(s, lot)
              ? `${Math.ceil((lot.hauntedUntil ?? 0) - s.elapsed)} s`
              : undefined
          }
        >
          <p>
            Bloque les livraisons et les renforts pendant <b>30 s</b>.
          </p>
          <p className="ability-meta">Nécessite un spectre disponible</p>
          <Button
            className="primary-btn"
            disabled={!!hauntError}
            title={hauntError || 'Envoyer un spectre'}
            onClick={() => onAction((state) => haunt(state, lot.id))}
          >
            Hanter le bâtiment
          </Button>
          {hauntError && (
            <p className="ability-status" data-blocked="true">
              {hauntError}
            </p>
          )}
          <details className="ability-details">
            <summary>Réaction des humains</summary>
            <p>Le moine fait sortir le spectre et l’affronte dans la rue.</p>
          </details>
        </AbilityCard>
      )}
      {lot?.kind === 'hall' && !lot.owned && (
        <AbilityCard title="Pot-de-vin" icon="ui-gold">
          <p>
            Retarde la patrouille de <b>45 s</b> et retire{' '}
            <b>15 de suspicion</b> à la livraison.
          </p>
          <AbilityCosts cost={{ gold: BRIBE_GOLD }} available={s.resources} />
          <Button
            className="primary-btn"
            disabled={!!bribeError}
            title={bribeError || 'Envoyer la bourse'}
            onClick={() => onAction(sendBribe)}
          >
            Envoyer la bourse
          </Button>
          <p className="ability-status" data-blocked={!!bribeError}>
            {bribeError || 'Disponible · récupération 120 s'}
          </p>
          <details className="ability-details">
            <summary>Transport de la bourse</summary>
            <p>
              Un gobelin la livre à pied. Elle est perdue s’il est tué ou
              rappelé.
            </p>
          </details>
          {s.domain.lastBribe && (
            <p className="ability-footer">{s.domain.lastBribe}</p>
          )}
        </AbilityCard>
      )}
      {lot?.owned && lot.kind === 'crypt' && (
        <AbilityCard
          title="Relever les morts"
          icon="skeleton-avatar"
          badge={`${s.domain.remains}/${REMAINS_CAP}`}
        >
          <p>
            Transforme deux dépouilles en <b>un squelette</b>.
          </p>
          <AbilityCosts
            cost={{ mana: 12 }}
            available={s.resources}
            remains={{ needed: 2, available: s.domain.remains }}
          />
          <p className="ability-meta">
            Rituel 12 s · récupération 45 s · 1 place
          </p>
          <Button
            className="primary-btn"
            disabled={!!ritualError}
            title={ritualError || 'Deux dépouilles et 12 essence'}
            onClick={() => onAction(raiseSkeleton)}
          >
            Relever un squelette
          </Button>
          <p className="ability-status" data-blocked={!!ritualError}>
            {ritualError || 'Rituel disponible'}
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
            <span>
              Collecte automatique<small>Par les gobelins disponibles</small>
            </span>
          </label>
          <details className="ability-details">
            <summary>Où trouver des dépouilles ?</summary>
            <p>
              Les gobelins les ramassent hors du danger. Les paysans récupèrent
              aussi les leurs. Squelettes et spectres ne laissent aucun reste
              utilisable.
            </p>
          </details>
          <p className="ability-footer">
            {s.domain.corpses.filter((c) => !c.carrier).length} au sol ·{' '}
            {s.domain.recoveredByHumans} récupérées par les humains
          </p>
        </AbilityCard>
      )}
    </>
  );
}
