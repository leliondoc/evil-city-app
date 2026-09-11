import { Sprite } from './Sprite';
import { GameButton, PackIcon, ResourceIcon, HealthBar } from './PackUI';
import {
  type State,
  type Selection,
  SUPPLIES,
  supplyActive,
  raidSupplyReason,
  UPGRADE_SUPPLIES,
  suppliesAvailable,
  PRESSURE,
  HUMAN_WORKER_CAP,
} from './engine';
import { type AssetKey } from './art';
import { SelectionPortrait } from './SelectionPortrait';
import { isHaunted } from './domain';

export function SupplyPanel({
  state: s,
  onSelect,
}: {
  state: State;
  onSelect: (selection: Selection) => void;
}) {
  const waiting =
    s.elapsed >= s.economy.nextUpgradeAt &&
    !suppliesAvailable(s, UPGRADE_SUPPLIES);
  return (
    <div className="supply-panel">
      <div className="supply-summary">
        <span>
          {s.workers.length}/{HUMAN_WORKER_CAP} paysans ·{' '}
          {s.sites.filter((site) => supplyActive(s, site)).length}/3 sites
        </span>
        <strong>
          {s.economy.level >= PRESSURE.maxLevel
            ? 'Niveau maximal'
            : waiting
              ? 'Amélioration bloquée : ressources manquantes'
              : `Niv. ${s.economy.level + 1} dans ≥ ${Math.max(0, Math.ceil(s.economy.nextUpgradeAt - s.elapsed))} s`}
        </strong>
      </div>
      <div className="supply-content">
        <p>
          Les humains recrutent un paysan toutes les 20 secondes, si leurs
          stocks permettent de payer 8 or et 5 vivres, jusqu’à 6 paysans (2 par
          site). Les livraisons financent leurs troupes. Une amélioration coûte
          25 or, 20 bois et 15 vivres ; les raids puisent dans les mêmes stocks.
        </p>
        <div className="supply-sites">
          {s.sites.map((site) => (
            <button
              key={site.id}
              onClick={() => onSelect({ type: 'resource', id: site.id })}
            >
              <ResourceIcon kind={site.kind} />
              <span>
                <strong>{SUPPLIES[site.kind].name}</strong>
                <small>
                  {s.lots[site.home].owned
                    ? 'Sous votre contrôle'
                    : isHaunted(s, s.lots[site.home])
                      ? 'Livraisons suspendues : bâtiment hanté'
                      : site.hp <= 0
                        ? `Sabotée · réparation dans ≥ ${Math.ceil(Math.max(0, site.repairAt - s.elapsed))} s`
                        : s.workers.some((w) => w.site === site.id)
                          ? 'Production active'
                          : 'Paysan manquant'}
                </small>
              </span>
              <b>
                {s.economy.stocks[site.kind]}
                <small>en stock</small>
              </b>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
export function SupplySelection({
  state: s,
  selection,
  onRaid,
  onGather,
  onSelect,
}: {
  state: State;
  selection: Selection;
  onRaid: () => void;
  onGather: () => void;
  onSelect: (selection: Selection) => void;
}) {
  const worker =
    selection.type === 'worker'
      ? s.workers.find((w) => w.id === selection.id)
      : undefined;
  const site = s.sites.find(
    (site) => site.id === (worker?.site ?? selection.id),
  );
  if (!site)
    return (
      <section className="selection-panel">
        <p>
          Ce paysan a quitté le quartier. Sélectionnez un site de production.
        </p>
      </section>
    );
  const def = SUPPLIES[site.kind],
    target = worker ?? site;
  const reason = raidSupplyReason(s, selection);
  return (
    <section className="selection-panel" aria-label="Détails du ravitaillement">
      <h3 className="selection-name">{worker ? def.worker : def.name}</h3>
      <div className="selection-art">
        {worker ? <SelectionPortrait asset="worker-avatar" label={def.worker} /> : <Sprite
          asset={
            site.kind === 'food'
                ? 'pig-idle'
                : (def.art as AssetKey)
          }
        />}
      </div>
      <p className="selection-text">
        {worker
          ? `Récolte 10 ${def.label.toLowerCase()}, puis les livre. L’éliminer fait perdre sa cargaison et interrompt sa route pendant au moins 40 s.`
          : `Alimente les humains en ${def.label.toLowerCase()}. Saboter ce site rapporte 15 ressources et coupe la production pendant au moins 90 s. Prendre son bâtiment arrête la production tant que vous le contrôlez.`}
      </p>
      {!worker && (
        <>
          <GameButton
            className="primary-btn"
            onClick={onGather}
            disabled={s.won || s.lost || site.hp <= 0}
          >
            <ResourceIcon kind={site.kind} /> Envoyer un gobelin récolter
          </GameButton>
          <p className="reason">
            {site.kind === 'food' &&
              'Vos gobelins récoltent les cochons en bas du pâturage ; les bergers humains gardent leurs moutons. '}
            Chargements de 30, livrés au manoir. Vous pouvez aussi sélectionner
            un gobelin puis donner un ordre sur ce site.
          </p>
        </>
      )}
      <div className="selection-stats">
        <span>
          {Math.ceil(target.hp)} / {target.maxHp} PV
        </span>
        <span>
          {worker
            ? worker.phase === 'harvest'
              ? 'Récolte'
              : worker.phase === 'return'
                ? `Livraison : ${worker.cargo}`
                : 'Vers le gisement'
            : supplyActive(s, site)
              ? 'En activité'
              : 'Production coupée'}
        </span>
      </div>
      <HealthBar
        value={(target.hp / target.maxHp) * 100}
        aria-label="Santé du ravitaillement"
      />
      <GameButton
        className="primary-btn"
        tone="red"
        disabled={!!reason}
        onClick={onRaid}
      >
        <PackIcon asset="ui-sword" />
        {worker ? 'Attaquer le paysan' : 'Saboter la production'}
      </GameButton>
      {reason && <p className="reason">{reason}</p>}
      <button
        className="subtle-btn"
        onClick={() => onSelect({ type: 'lot', id: site.home })}
      >
        Voir le bâtiment de livraison →
      </button>
      {!worker &&
        s.workers
          .filter((w) => w.site === site.id)
          .map((w) => (
            <button
              className="subtle-btn"
              key={w.id}
              onClick={() => onSelect({ type: 'worker', id: w.id })}
            >
              Suivre le {def.worker.toLowerCase()} →
            </button>
          ))}
      <p className="reason">
        Réparation : 10 or + 10 bois. Remplacement : 8 or + 5 vivres. Sans
        stocks, les humains doivent attendre.
      </p>
    </section>
  );
}
