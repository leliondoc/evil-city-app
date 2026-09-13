import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Flag, Swords } from 'lucide-react';
import { ASSETS, type AssetKey } from './art';
import { CAMPAIGN_MAPS, type CampaignMapId } from './campaign';

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
  tilleuls: 'Règles d’origine',
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
        <svg
          className="atlas-land"
          viewBox="0 0 1000 420"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="atlas-grain"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="5" cy="9" r="1" fill="#efdc9b" opacity=".2" />
              <circle cx="22" cy="25" r="1" fill="#304e38" opacity=".18" />
            </pattern>
            <g id="atlas-tree">
              <path d="M0 27v10" stroke="#665334" strokeWidth="5" />
              <path
                d="M0 0 -15 28Q0 34 15 28Z"
                fill="#315943"
                stroke="#253f36"
                strokeWidth="2"
              />
              <path d="M-7 15 0 1 8 19" fill="#507856" />
            </g>
          </defs>
          <rect width="1000" height="420" fill="#9da264" />
          <path
            d="M0 50Q120 130 260 50T520 40T800 30L1000 0V175Q850 130 750 190T490 190T230 180T0 220Z"
            fill="#79935e"
          />
          <path
            d="M0 390Q170 310 330 340T640 290T1000 260V420H0Z"
            fill="#728458"
          />
          <path
            d="M-20 245Q130 285 265 210T440 220T590 365T760 415"
            fill="none"
            stroke="#526f67"
            strokeWidth="52"
          />
          <path
            d="M-20 245Q130 285 265 210T440 220T590 365T760 415"
            fill="none"
            stroke="#78a89d"
            strokeWidth="37"
          />
          <path
            d="M-20 241Q130 281 265 206T440 216T590 361T760 411"
            fill="none"
            stroke="#b4d1b3"
            strokeWidth="3"
            opacity=".65"
          />
          <g fill="#747b61" stroke="#59634e" strokeWidth="3">
            <path d="m30 84 45-66 49 70-26-8-22 8-18-9Z" />
            <path d="m102 81 37-53 44 59-20-5-20 5-20-8Z" />
            <path d="m879 372 37-64 48 67-25-9-20 11Z" />
          </g>
          <g>
            {[
              [45, 125],
              [75, 155],
              [102, 110],
              [125, 148],
              [310, 55],
              [344, 38],
              [376, 59],
              [415, 45],
              [625, 50],
              [651, 73],
              [675, 42],
              [910, 190],
              [948, 165],
              [975, 206],
              [815, 315],
              [845, 335],
              [795, 350],
              [72, 343],
              [109, 365],
            ].map(([x, y]) => (
              <use key={`${x}-${y}`} href="#atlas-tree" x={x} y={y} />
            ))}
          </g>
          <rect width="1000" height="420" fill="url(#atlas-grain)" />
        </svg>
        <svg
          className="atlas-route atlas-route-wide"
          viewBox="0 0 1000 420"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M160 275C220 320 305 145 390 170S515 320 620 275S735 80 840 130" />
        </svg>
        <svg
          className="atlas-route atlas-route-tall"
          viewBox="0 0 400 500"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M100 374C155 410 310 310 260 275S65 235 112 176S285 125 260 88" />
        </svg>
        <span className="atlas-caption" aria-hidden="true">
          Les terres du mauvais voisin
        </span>
        {Object.values(CAMPAIGN_MAPS).map((chapter) => (
          <button
            key={chapter.id}
            className={`atlas-node atlas-node-${chapter.id}`}
            aria-label={`${chapter.name} · ${descriptions[chapter.id]}${chapter.id === 'tilleuls' ? '' : ` · ${chapter.objectives.length} objectifs`}`}
            aria-pressed={selected === chapter.id}
            onClick={() => setSelected(chapter.id)}
          >
            <span className="atlas-landmark">
              <img
                src={ASSETS[landmarks[chapter.id]].src}
                alt=""
                draggable={false}
              />
              <span className="atlas-number">{chapter.chapter}</span>
            </span>
            <strong>{chapter.name}</strong>
            <small>{descriptions[chapter.id]}</small>
          </button>
        ))}
        <div className="atlas-compass" aria-hidden="true">
          N<span>✧</span>S
        </div>
      </div>
      <div className="campaign-departure">
        <div className="campaign-brief" aria-live="polite">
          <p>
            <Flag size={14} />{' '}
            {map.id === 'tilleuls'
              ? 'Règles et difficulté d’origine'
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
