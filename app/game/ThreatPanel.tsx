import { useState, type ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ASSETS, type AssetKey } from './art';
import { SupplyPanel } from './SupplyPanel';
import { isHaunted } from './domain';
import { GameButton, PanelSkin, ResourceIcon } from './PackUI';
import { unitSelection } from './selection';
import {
  army,
  capacity,
  population,
  goblinWorkforce,
  GOBLIN_CAP,
  humanLevel,
  PRESSURE,
  sourceBuilding,
  territory,
  type State,
  type Selection,
} from './engine';

const clock = (seconds: number) => {
  const total = Math.ceil(Math.max(0, seconds));
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};
type MenuEntry = {
  id: string;
  label: string;
  icon: AssetKey;
  summary: string;
  badge?: string;
  alert?: 'warning' | 'danger';
  content: ReactNode;
};

export function ThreatPanel({
  state: s,
  compact,
  onSelect,
  onDefend,
}: {
  state: State;
  compact: boolean;
  onSelect: (selection: Selection) => void;
  onDefend: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [camp, setCamp] = useState<'human' | 'evil'>('evil');
  const workers = goblinWorkforce(s);
  const fighters = army(s);
  const goblins = s.units.filter((u) => u.kind === 'goblin' && u.hp > 0);
  const home = s.lots[6];
  const percent = Math.round(territory(s) * 100);
  const select = (selection: Selection) => {
    setActive(null);
    onSelect(selection);
  };
  const factions: MenuEntry[] = (['guard', 'hero'] as const).map((kind) => {
    const m = s.mobilization[kind],
      source = sourceBuilding(s, kind);
    const stopped = !source || source.owned;
    const alive = s.enemies.filter((e) => e.kind === kind).length;
    const status = stopped
      ? 'Renforts coupés'
      : source && isHaunted(s, source)
        ? `Bâtiment hanté · ${clock((source.hauntedUntil ?? 0) - s.elapsed)}`
        : kind === 'guard' && s.domain.bribedUntil > s.elapsed
          ? `Mairie achetée · ${clock(s.domain.bribedUntil - s.elapsed)}`
          : m.starved
            ? 'Attend du ravitaillement'
            : m.active && m.nextRaidAt !== null
              ? `Départ dans ${clock(m.nextRaidAt - s.elapsed)}`
              : `${Math.round(PRESSURE[kind].territory * 100)} % d’emprise ou ${clock(PRESSURE[kind].time)}`;
    return {
      id: kind,
      label: kind === 'guard' ? 'Garde' : 'Guilde des héros',
      icon: kind === 'guard' ? 'ui-shield' : 'ui-sword',
      summary: `${status}. ${alive} ennemi${alive > 1 ? 's' : ''} dans les rues.`,
      badge: alive ? String(alive) : !stopped && m.active ? '!' : undefined,
      alert: alive ? 'danger' : !stopped && m.active ? 'warning' : undefined,
      content: (
        <>
          <div className="district-stat">
            <span>Niveau humain</span>
            <strong>{humanLevel(s)}</strong>
          </div>
          <p className="district-highlight">{status}</p>
          {kind === 'guard' && (
            <>
              <div className="district-stat">
                <span>Suspicion</span>
                <strong>{Math.ceil(s.domain.suspicion)} / 100</strong>
              </div>
              <progress
                className="district-meter"
                aria-label="Suspicion de la garde"
                max={100}
                value={s.domain.suspicion}
              />
              <p className="district-note">
                À 60, vos méfaits mobilisent la garde, même sans expansion. Les
                hantises, conquêtes, sabotages et morts l’augmentent ; le calme
                et les pots-de-vin la réduisent.
              </p>
              {s.domain.bribe && (
                <p>Un gobelin transporte une bourse vers la mairie.</p>
              )}
            </>
          )}
          <p>
            {alive
              ? `${alive} ${kind === 'guard' ? 'garde' : 'héros'}${kind === 'guard' && alive > 1 ? 's' : ''} dans les rues.`
              : 'Aucune troupe dans les rues.'}
          </p>
          <p className="district-note">
            {stopped
              ? 'La conquête du bâtiment a coupé les prochains renforts.'
              : m.active
                ? `${m.reason}. Les livraisons financent leurs renforts.`
                : 'Le premier seuil atteint déclenche la mobilisation. Sabotez les livraisons pour freiner les renforts.'}
          </p>
          {source && (
            <button
              className="district-action"
              onClick={() => select({ type: 'lot', id: source.id })}
            >
              {kind === 'guard' ? 'Voir la mairie' : 'Voir la guilde'} →
            </button>
          )}
        </>
      ),
    };
  });
  const entries: MenuEntry[] = [
    {
      id: 'territory',
      label: 'Emprise',
      icon: 'specter-avatar',
      summary: `${percent} % du quartier sous votre contrôle.`,
      badge: `${percent}%`,
      content: (
        <>
          <div className="district-stat">
            <span>Quartier conquis</span>
            <strong>{percent} %</strong>
          </div>
          <progress
            className="district-meter"
            aria-label="Emprise sur le quartier"
            max={100}
            value={percent}
          />
          <p>
            {s.lots.filter((l) => l.owned).length} parcelles sur 9 sous votre
            contrôle.
          </p>
          <p className="district-note">
            L’expansion attire la garde à 56 % et la guilde à 67 %. Le temps et
            leurs livraisons les renforcent aussi.
          </p>
        </>
      ),
    },
    ...factions,
    {
      id: 'home',
      label: 'Manoir',
      icon: 'hq-purple',
      summary: `${Math.ceil(home.hp)} sur ${home.maxHp} points de vie.`,
      badge:
        home.hp < home.maxHp
          ? `${Math.ceil((home.hp / home.maxHp) * 100)}%`
          : undefined,
      alert:
        home.hp / home.maxHp < 0.4
          ? 'danger'
          : home.hp < home.maxHp
            ? 'warning'
            : undefined,
      content: (
        <>
          <div className="district-stat">
            <span>Résistance</span>
            <strong>
              {Math.ceil(home.hp)} / {home.maxHp}
            </strong>
          </div>
          <progress
            className="district-meter home-meter"
            aria-label="Résistance du manoir"
            max={home.maxHp}
            value={Math.ceil(home.hp)}
          />
          <p className="district-note">
            Protégez le cœur de votre domaine. Sa chute met fin à la conquête.
          </p>
          <button
            className="district-action"
            onClick={() => select({ type: 'lot', id: home.id })}
          >
            Voir le manoir →
          </button>
          <button
            className="district-action district-defend"
            disabled={s.won || s.lost}
            onClick={() => {
              onDefend();
              setActive(null);
            }}
          >
            <img src={ASSETS['ui-shield'].src} alt="" /> Défendre le manoir
          </button>
        </>
      ),
    },
    {
      id: 'supply',
      label: 'Ravitaillement humain',
      icon: 'ui-wood-icon',
      summary: `${s.workers.length} paysans. Niveau humain ${humanLevel(s)}.`,
      badge: String(s.workers.length),
      content: <SupplyPanel state={s} onSelect={select} />,
    },
  ];
  const playerEntries: MenuEntry[] = [
    entries.find((e) => e.id === 'home')!,
    {
      id: 'army',
      label: 'Votre horde',
      icon: 'minotaur-avatar',
      badge: String(fighters.length),
      summary: `${fighters.length} combattants. Population ${population(s)} sur ${capacity(s)}.`,
      content: (
        <>
          <div className="district-stat">
            <span>Combattants</span>
            <strong>{fighters.length}</strong>
          </div>
          <div className="district-stat">
            <span>Population</span>
            <strong>
              {population(s)} / {capacity(s)}
            </strong>
          </div>
          <p className="district-note">
            {s.recruits.length} recrutement{s.recruits.length > 1 ? 's' : ''} en
            cours. Les gobelins occupent aussi des places dans votre domaine.
          </p>
          <GameButton
            className="primary-btn"
            tone="red"
            disabled={!fighters.length}
            onClick={() => select(unitSelection(fighters.map((u) => u.id)))}
          >
            Sélectionner les combattants
          </GameButton>
        </>
      ),
    },
    {
      id: 'goblins',
      label: 'Vos gobelins',
      icon: 'goblin-avatar',
      badge: `${workers.total}/${GOBLIN_CAP}`,
      summary: `${workers.total} gobelins, ${workers.queued} en recrutement.`,
      content: (
        <>
          <div className="district-stat">
            <span>Gobelins vivants</span>
            <strong>
              {workers.total} / {GOBLIN_CAP}
            </strong>
          </div>
          <p>
            {workers.queued} en recrutement · {workers.building} au chantier ·{' '}
            {workers.other} en mission ou au repos.
          </p>
          <div className="evil-harvest-list">
            {(['gold', 'wood', 'food'] as const).map((kind) => (
              <button
                key={kind}
                className="district-action"
                onClick={() => {
                  const site = s.sites.find((site) => site.kind === kind);
                  if (site) select({ type: 'resource', id: site.id });
                }}
              >
                <ResourceIcon kind={kind} />
                <span>
                  {kind === 'gold' ? 'Or' : kind === 'wood' ? 'Bois' : 'Vivres'}
                </span>
                <strong>{workers[kind]}</strong>
              </button>
            ))}
          </div>
          <p className="district-note">
            Les stocks augmentent à la livraison au manoir. Choisissez une
            ressource pour ouvrir son site de récolte.
          </p>
          <GameButton
            className="primary-btn"
            tone="red"
            disabled={!goblins.length}
            onClick={() => select(unitSelection(goblins.map((u) => u.id)))}
          >
            Sélectionner les gobelins
          </GameButton>
        </>
      ),
    },
    entries.find((e) => e.id === 'territory')!,
  ];
  const groups = [
    {
      id: 'human' as const,
      label: 'Humains',
      entries: entries.filter((e) =>
        ['guard', 'hero', 'supply'].includes(e.id),
      ),
    },
    { id: 'evil' as const, label: 'Mon domaine', entries: playerEntries },
  ];
  return (
    <aside className="district-menu" aria-label="Menu du quartier">
      {compact && (
        <div className="district-camp-tabs" aria-label="Choisir un camp">
          {groups.map((group) => (
            <GameButton
              key={group.id}
              className="primary-btn"
              tone={group.id === 'evil' ? 'red' : 'blue'}
              aria-pressed={camp === group.id}
              onClick={() => {
                setCamp(group.id);
                setActive(null);
              }}
            >
              {group.label}
            </GameButton>
          ))}
        </div>
      )}
      {groups
        .filter((group) => !compact || camp === group.id)
        .map((group) => (
          <section
            className="district-group"
            data-camp={group.id}
            aria-label={group.label}
            key={group.id}
          >
            <h3>{group.label}</h3>
            {group.entries.map((entry) => (
              <Popover
                key={entry.id}
                open={active === entry.id}
                onOpenChange={(open) =>
                  setActive((current) =>
                    open ? entry.id : current === entry.id ? null : current,
                  )
                }
              >
                <PopoverTrigger
                  className={`district-shortcut ${entry.alert || ''}`}
                  aria-label={`${entry.label}. ${entry.summary} Ouvrir les détails.`}
                  title={`${entry.label} · ${entry.summary}`}
                >
                  {group.id === 'evil' ? (
                    <PanelSkin
                      kind="button"
                      asset={
                        active === entry.id
                          ? 'ui-button-red-pressed'
                          : 'ui-button-red'
                      }
                    />
                  ) : (
                    <img
                      className="district-button-skin"
                      src={ASSETS['ui-menu-button'].src}
                      alt=""
                    />
                  )}
                  <img
                    className="district-icon"
                    src={ASSETS[entry.icon].src}
                    alt=""
                  />
                  {entry.badge && (
                    <span className="district-badge" aria-hidden="true">
                      {entry.badge}
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent
                  className="district-popover"
                  data-camp={group.id}
                  side={compact ? 'bottom' : 'left'}
                  align="start"
                  sideOffset={10}
                >
                  <div className="district-heading">
                    <img src={ASSETS[entry.icon].src} alt="" />
                    <PopoverTitle>{entry.label}</PopoverTitle>
                    <button
                      className="district-close"
                      aria-label="Fermer les détails du quartier"
                      onClick={() => setActive(null)}
                    >
                      <img src={ASSETS['ui-close'].src} alt="" />
                    </button>
                  </div>
                  {entry.content}
                </PopoverContent>
              </Popover>
            ))}
          </section>
        ))}
    </aside>
  );
}
