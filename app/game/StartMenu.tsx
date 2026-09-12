import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  CornerDownLeft,
  Settings2,
  Swords,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bestiary } from './Bestiary';
import {
  readAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from './audio';
import { GameMusic } from './music';
import type { Animation } from './art';

type MenuPanel = 'bestiary' | 'settings' | 'guide' | null;

export function StartMenu({
  hasGame,
  onPlay,
}: {
  hasGame: boolean;
  onPlay: () => void;
}) {
  const [panel, setPanel] = useState<MenuPanel>(null);
  const [action, setAction] = useState<Animation>('idle');
  const [settings, setSettings] = useState(readAudioSettings);
  const playRef = useRef<HTMLButtonElement>(null);
  const panelTrigger = useRef<HTMLButtonElement | null>(null);
  const musicRef = useRef<GameMusic | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const music = new GameMusic(import.meta.env.BASE_URL, 'menu');
    musicRef.current = music;
    playRef.current?.focus({ preventScroll: true });
    return () => {
      music.dispose();
      musicRef.current = null;
      const context = contextRef.current;
      contextRef.current = null;
      if (context) void context.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    musicRef.current?.configure(settings.muted, settings.musicVolume);
  }, [settings]);

  const unlockMusic = (next = settings) => {
    if (next.muted || next.musicVolume === 0) return;
    try {
      contextRef.current ??= new AudioContext();
      void contextRef.current.resume().catch(() => {});
      musicRef.current?.configure(next.muted, next.musicVolume);
      musicRef.current?.unlock(contextRef.current);
    } catch {
      // Music is optional; browsers without Web Audio can still enter the game.
    }
  };

  const configure = (next: AudioSettings) => {
    setSettings(next);
    saveAudioSettings(next);
    window.dispatchEvent(new Event('evil-city-menu-audio'));
    musicRef.current?.configure(next.muted, next.musicVolume);
    unlockMusic(next);
  };

  const openPanel = (next: MenuPanel, trigger: HTMLButtonElement) => {
    panelTrigger.current = trigger;
    setPanel(next);
    unlockMusic();
  };

  return (
    <main
      className="start-menu"
      aria-label="Menu principal d’Evil City"
      onPointerDownCapture={() => unlockMusic()}
      onClickCapture={() => unlockMusic()}
      onKeyDownCapture={() => unlockMusic()}
    >
      <div className="start-motes" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <i
            key={i}
            style={
              {
                '--i': i,
                left: `${(i * 37 + 7) % 100}%`,
                top: `${(i * 23 + 13) % 100}%`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="start-tools" aria-label="Réglages rapides">
        <button
          className="start-icon-button"
          aria-label={settings.muted ? 'Activer le son' : 'Couper le son'}
          title={settings.muted ? 'Activer le son' : 'Couper le son'}
          aria-pressed={!settings.muted}
          onClick={() => configure({ ...settings, muted: !settings.muted })}
        >
          {settings.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          className="start-icon-button"
          aria-label="Réglages"
          title="Réglages"
          onClick={(event) => openPanel('settings', event.currentTarget)}
        >
          <Settings2 size={20} />
        </button>
      </div>

      <div className="start-content">
        <header className="start-brand">
          <h1 className="start-title" aria-label="Evil City">
            <span data-text="Evil">Evil</span>
            <span data-text="City">City</span>
          </h1>
          <p className="start-tagline">
            <span />
            Le mal ne fait pas de quartier.
            <span />
          </p>
        </header>

        <div className="start-actions">
          <button
            ref={playRef}
            className="start-play"
            data-resume={hasGame}
            onClick={onPlay}
          >
            <Swords size={26} aria-hidden="true" />
            <span>{hasGame ? 'Reprendre' : 'Jouer'}</span>
            <ChevronRight size={24} aria-hidden="true" />
          </button>
          <p className="start-key-hint">
            <CornerDownLeft size={12} aria-hidden="true" /> Entrée pour{' '}
            {hasGame ? 'reprendre' : 'jouer'}
          </p>
          <nav className="start-links" aria-label="Découvrir Evil City">
            <button
              onClick={(event) => openPanel('bestiary', event.currentTarget)}
            >
              <BookOpen size={17} /> Bestiaire
            </button>
            <span aria-hidden="true" />
            <button
              onClick={(event) => openPanel('guide', event.currentTarget)}
            >
              <CircleHelp size={17} /> Comment jouer
            </button>
          </nav>
          {hasGame && (
            <p className="start-session-note">
              Votre partie vous attend dans cet onglet.
            </p>
          )}
        </div>
      </div>

      <footer className="start-footer">
        <span>
          EVIL CITY <i /> v0.4
        </span>
      </footer>

      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent
          className={`start-modal${panel === 'bestiary' ? ' start-bestiary' : ''}`}
          showCloseButton={false}
          finalFocus={() => panelTrigger.current ?? playRef.current}
        >
          <button
            className="start-icon-button start-close"
            aria-label="Fermer"
            onClick={() => setPanel(null)}
          >
            <X size={20} />
          </button>
          {panel === 'bestiary' && (
            <>
              <DialogTitle>La horde & ses ennemis</DialogTitle>
              <DialogDescription>
                Faites connaissance avec les habitants du quartier.
              </DialogDescription>
              <div
                className="start-animation-tabs"
                aria-label="Animation des unités"
              >
                {(
                  [
                    ['idle', 'Au repos'],
                    ['walk', 'En marche'],
                    ['attack', 'Au combat'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={action === value}
                    onClick={() => setAction(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Bestiary action={action} />
            </>
          )}
          {panel === 'settings' && (
            <>
              <DialogTitle>À votre convenance</DialogTitle>
              <DialogDescription>
                Ces réglages s’appliquent aussi à votre partie.
              </DialogDescription>
              <div className="start-settings">
                <button
                  className="start-setting-toggle"
                  aria-pressed={!settings.muted}
                  onClick={() =>
                    configure({ ...settings, muted: !settings.muted })
                  }
                >
                  {settings.muted ? (
                    <VolumeX size={20} />
                  ) : (
                    <Volume2 size={20} />
                  )}
                  {settings.muted ? 'Son désactivé' : 'Son activé'}
                  <span>{settings.muted ? 'Activer' : 'Couper'}</span>
                </button>
                <label htmlFor="menu-music">
                  Musique{' '}
                  <output>{Math.round(settings.musicVolume * 100)} %</output>
                </label>
                <input
                  id="menu-music"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(settings.musicVolume * 100)}
                  onChange={(event) =>
                    configure({
                      ...settings,
                      musicVolume: Number(event.target.value) / 100,
                    })
                  }
                />
                <label htmlFor="menu-effects">
                  Effets sonores{' '}
                  <output>{Math.round(settings.volume * 100)} %</output>
                </label>
                <input
                  id="menu-effects"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(settings.volume * 100)}
                  onChange={(event) =>
                    configure({
                      ...settings,
                      volume: Number(event.target.value) / 100,
                    })
                  }
                />
                <p>Musique : AlkaKrab · Effets : TomMusic</p>
              </div>
            </>
          )}
          {panel === 'guide' && (
            <>
              <DialogTitle>Le guide du mauvais voisin</DialogTitle>
              <DialogDescription>
                Un manoir, quelques créatures et de grandes ambitions.
              </DialogDescription>
              <ol className="start-guide">
                <li>
                  <span>01</span>
                  <div>
                    <h3>Installez-vous</h3>
                    <p>
                      Recrutez votre premier gobelin. Il récolte les ressources
                      et construit votre domaine.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>Rassemblez votre horde</h3>
                    <p>
                      Construisez, améliorez le manoir et recrutez les créatures
                      qui feront trembler le quartier.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Prenez la ville</h3>
                    <p>
                      Conquérez la mairie et la guilde, puis éliminez les
                      ennemis dans les rues. Protégez votre manoir.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="start-controls">
                <p>
                  <strong>Ordinateur</strong> Clic pour sélectionner · Clic
                  droit pour annuler un placement ou donner un ordre · Glisser
                  pour explorer · Molette pour zoomer · Espace pour mettre en
                  pause.
                </p>
                <p>
                  <strong>Écran tactile</strong> Touchez pour sélectionner ·
                  Glissez pour explorer · Pincez pour zoomer · Utilisez « Ordre
                  » pour agir.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
