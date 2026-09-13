import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Flag, Swords } from 'lucide-react';
import { ASSETS, type AssetKey } from './art';
import { CAMPAIGN_MAPS, type CampaignMapId } from './campaign';
import { CampaignAtlas } from './CampaignAtlas';

const landmarks: Record<CampaignMapId, AssetKey> = {
  refuge: 'hq-purple',
  faubourg: 'tavern-blue',
  remparts: 'human-fortress-blue',
  tilleuls: 'human-citadel-yellow',
};
const descriptions: Record<CampaignMapId, string> = {
  refuge: 'Pour débuter',
  faubourg: 'Premières conquêtes',
  remparts: 'Tactiques avancées',
  tilleuls: 'Conquête libre',
};

export function CampaignSelect({
  hasGame,
  onPlay,
  onBack,
}: {
  hasGame: boolean;
  onPlay: (map: CampaignMapId) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<CampaignMapId>('refuge');
  const heading = useRef<HTMLHeadingElement>(null);
  const map = CAMPAIGN_MAPS[selected];
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <section className="campaign-select" aria-label="Choisir un quartier">
      <button className="campaign-back" onClick={onBack}>
        <ArrowLeft size={18} /> Retour au menu
      </button>
      <header className="campaign-heading">
        <h1 ref={heading} tabIndex={-1}>
          Choisissez votre quartier
        </h1>
        <span>
          Commencez au Refuge ou partez directement à la conquête des Tilleuls.
        </span>
      </header>
      <div className="campaign-atlas" aria-label="Carte des quatre quartiers">
        <CampaignAtlas />
        {Object.values(CAMPAIGN_MAPS).map((chapter) => (
          <button
            key={chapter.id}
            className={`atlas-node atlas-node-${chapter.id}`}
            aria-label={`${chapter.name} · ${descriptions[chapter.id]}${chapter.id === 'tilleuls' ? '' : ` · ${chapter.objectives.length} objectifs`}`}
            aria-pressed={selected === chapter.id}
            onClick={() => setSelected(chapter.id)}
          >
            <span className="atlas-landmark">
              <svg className="atlas-selection-ring" viewBox="0 0 132 46" aria-hidden="true">
                <path className="atlas-ring-outline" d="M16 17C34 4 91 4 114 15M120 22C120 37 36 44 12 29" />
                <path className="atlas-ring-gold" d="M16 17C34 4 91 4 114 15M120 22C120 37 36 44 12 29" />
                <path className="atlas-ring-highlight" d="M25 13C45 6 76 6 94 10M112 29C91 37 50 39 29 33" />
              </svg>
              <img
                src={ASSETS[landmarks[chapter.id]].src}
                alt=""
                draggable={false}
              />
              <svg className="atlas-number" viewBox="0 0 32 38" aria-hidden="true">
                <path className="atlas-badge-rim" d="M3 2Q16 0 29 2L28 24Q24 31 16 36Q8 31 4 24Z" />
                <path className="atlas-badge-face" d="M6 5Q16 3 26 5L25 23Q22 28 16 32Q10 28 7 23Z" />
                <path className="atlas-badge-shine" d="M8 7Q16 5 24 7M8 9 9 21" />
                <text x="16" y="24" textAnchor="middle">{chapter.chapter}</text>
              </svg>
            </span>
            <strong>{chapter.name}</strong>
            <small>{descriptions[chapter.id]}</small>
          </button>
        ))}
      </div>
      <div className="campaign-departure">
        <div className="campaign-brief" aria-live="polite">
          <p>
            <Flag size={14} />{' '}
            {map.id === 'tilleuls'
              ? 'Conquête libre'
              : `${map.objectives.length} objectifs`}{' '}
            <span>·</span> {map.subtitle}
          </p>
          <h2>{map.name}</h2>
          <div>{map.briefing}</div>
        </div>
        <div className="campaign-launch">
          <button className="start-play" onClick={() => onPlay(selected)}>
            <Swords size={22} />
            <span>Entrer dans le quartier</span>
            <ChevronRight size={20} />
          </button>
          <p>
            {hasGame
              ? 'Remplace la partie en cours.'
              : 'Les quatre quartiers sont accessibles.'}
          </p>
        </div>
      </div>
    </section>
  );
}
