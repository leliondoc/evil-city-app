import { useState, type ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ASSETS, type AssetKey } from './art';
import { SupplyPanel } from './SupplyPanel';
import {
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
  onSelect,
  onDefend,
}: {
  state: State;
  onSelect: (selection: Selection) => void;
  onDefend: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
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
      icon: 'ui-banner',
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
  return (
    <aside className="district-menu" aria-label="Menu du quartier">
      {entries.map((entry) => (
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
            <img
              className="district-button-skin"
              src={ASSETS['ui-menu-button'].src}
              alt=""
            />
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
            side="left"
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
    </aside>
  );
}
