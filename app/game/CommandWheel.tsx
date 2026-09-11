import { PackIcon, PanelSkin } from './PackUI';
import type { AssetKey } from './art';

type Props = {
  level: number;
  paused: boolean;
  onManor: () => void;
  onArmy: () => void;
  onBestiary: () => void;
  onGuide: () => void;
  onSettings: () => void;
  onPause: () => void;
};

export function CommandWheel(props: Props) {
  const actions: {
    key: string;
    label: string;
    tooltip: string;
    icon?: AssetKey;
    onClick: () => void;
  }[] = [
    {
      key: 'army',
      label: 'Sélectionner l’armée',
      tooltip: 'Sélectionner l’armée · hors bâtisseurs',
      icon: 'ui-sword',
      onClick: props.onArmy,
    },
    {
      key: 'bestiary',
      label: 'Ouvrir le bestiaire',
      tooltip: 'Bestiaire',
      icon: 'skeleton-avatar',
      onClick: props.onBestiary,
    },
    {
      key: 'guide',
      label: 'Comment jouer',
      tooltip: 'Guide du mauvais voisin · H',
      icon: 'ui-info',
      onClick: props.onGuide,
    },
    {
      key: 'pause',
      label: props.paused ? 'Reprendre' : 'Mettre en pause',
      tooltip: props.paused ? 'Reprendre · Espace' : 'Pause · Espace',
      icon: props.paused ? 'ui-play' : undefined,
      onClick: props.onPause,
    },
    {
      key: 'settings',
      label: 'Ouvrir les paramètres',
      tooltip: 'Paramètres de partie',
      icon: 'ui-settings',
      onClick: props.onSettings,
    },
  ];
  return (
    <nav className="command-wheel" aria-label="Commandes du domaine">
      <button
        type="button"
        className="command-wheel-manor"
        onClick={props.onManor}
        aria-label={`Voir le manoir, niveau ${props.level}`}
        title={`Manoir niveau ${props.level} · progression du domaine`}
      >
        <span className="command-wheel-medallion">
          <PanelSkin kind="paper" />
        </span>
        <PackIcon asset="hq-purple" className="command-wheel-castle" />
        <span className="command-wheel-name">Manoir</span>
        <span className="command-wheel-level">
          <PackIcon asset="ui-shield" />
          {props.level}
        </span>
      </button>
      {actions.map((action) => (
        <button
          type="button"
          key={action.key}
          className={`command-wheel-action wheel-${action.key}`}
          aria-label={action.label}
          aria-pressed={action.key === 'pause' ? props.paused : undefined}
          onClick={action.onClick}
        >
          {action.icon ? (
            <PackIcon asset={action.icon} />
          ) : (
            <span className="command-wheel-pause" aria-hidden="true">
              <i />
              <i />
            </span>
          )}
          <span className="command-wheel-tooltip" aria-hidden="true">
            {action.tooltip}
          </span>
        </button>
      ))}
    </nav>
  );
}
