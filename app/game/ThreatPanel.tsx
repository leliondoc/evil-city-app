import { Castle, Flag, Shield, Swords } from 'lucide-react';
import {
  humanLevel,
  PRESSURE,
  sourceBuilding,
  territory,
  type State,
} from './engine';

const clock = (seconds: number) => {
  const total = Math.ceil(Math.max(0, seconds));
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

export function ThreatPanel({
  state: s,
  onSelect,
  onDefend,
}: {
  state: State;
  onSelect: (id: number) => void;
  onDefend: () => void;
}) {
  const home = s.lots[6];
  return (
    <section className="pressure-strip" aria-label="Menaces du quartier">
      <div className="pressure-territory">
        <span>
          <Flag size={14} /> Emprise
        </span>
        <strong>
          {Math.round(territory(s) * 100)} % <small>du quartier</small>
        </strong>
        <div className="territory-meter">
          <i style={{ width: `${territory(s) * 100}%` }} />
        </div>
      </div>
      {(['guard', 'hero'] as const).map((kind) => {
        const m = s.mobilization[kind],
          source = sourceBuilding(s, kind);
        const stopped = !source || source.owned;
        const alive = s.enemies.filter((e) => e.kind === kind).length;
        const Icon = kind === 'guard' ? Shield : Swords;
        const status = stopped
          ? 'Renforts coupés'
          : m.starved
            ? 'Attend du ravitaillement'
            : m.active && m.nextRaidAt !== null
              ? `Départ dans ${clock(m.nextRaidAt - s.elapsed)}`
              : `${Math.round(PRESSURE[kind].territory * 100)} % d’emprise ou ${clock(PRESSURE[kind].time)}`;
        return (
          <button
            key={kind}
            className={`pressure-faction ${alive ? 'raiding' : m.active ? 'mobilizing' : ''}`}
            onClick={() => source && onSelect(source.id)}
            aria-label={`${kind === 'guard' ? 'Garde' : 'Guilde des héros'}. ${status}. ${alive} ennemi${alive > 1 ? 's' : ''} dans les rues. Voir le bâtiment.`}
            title={
              m.active
                ? m.reason
                : 'Toutes les 2 minutes, les humains peuvent financer un niveau avec leurs livraisons. Sabotez leur ravitaillement.'
            }
          >
            <span>
              <Icon size={14} />{' '}
              {kind === 'guard' ? 'Garde' : 'Guilde des héros'}{' '}
              <small>Niv. {humanLevel(s)}</small>
            </span>
            <strong>{status}</strong>
            <small>
              {alive
                ? `${alive} ${kind === 'guard' ? 'garde' : 'héros'}${kind === 'guard' && alive > 1 ? 's' : ''} dans les rues`
                : stopped
                  ? 'Bâtiment sous votre contrôle'
                  : 'Voir le bâtiment →'}
            </small>
          </button>
        );
      })}
      <div
        className={`pressure-home ${home.hp / home.maxHp < 0.4 ? 'raiding' : ''}`}
      >
        <button
          onClick={() => onSelect(home.id)}
          aria-label={`Manoir : ${Math.ceil(home.hp)} sur ${home.maxHp} points de vie. Voir le manoir.`}
        >
          <span>
            <Castle size={14} /> Manoir{' '}
            <strong>
              {Math.ceil(home.hp)} / {home.maxHp}
            </strong>
          </span>
        </button>
        <button
          className="defend-button"
          onClick={onDefend}
          disabled={s.won || s.lost}
        >
          <Shield size={13} /> Défendre le manoir
        </button>
      </div>
    </section>
  );
}
