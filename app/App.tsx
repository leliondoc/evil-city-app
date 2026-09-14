import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { requestLandscape } from './game/orientation';
import { StartMenu } from './game/StartMenu';
import type { CampaignMapId } from './game/campaign';
import { LandscapeGate, useLandscapeRequired } from './game/LandscapeGate';

const Game = lazy(() => import('./game/Game'));

class GameBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed)
      return (
        <main className="start-load-error" role="alert">
          <h1>Le quartier n’a pas pu s’ouvrir</h1>
          <p>Rechargez la page pour relancer le jeu.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Recharger le jeu
          </button>
        </main>
      );
    return this.props.children;
  }
}

export default function App() {
  const [hasGame, setHasGame] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const [initialMap, setInitialMap] = useState<CampaignMapId>('refuge');
  const [gameSession, setGameSession] = useState(0);
  const portrait = useLandscapeRequired();

  return (
    <>
      {hasGame && (
        <LandscapeGate blocked={!menuOpen && portrait} onBack={() => setMenuOpen(true)}>
        <div hidden={menuOpen}>
          <GameBoundary key={gameSession}>
            <Suspense
              fallback={
                <output className="start-loading">
                  Le quartier se réveille…
                </output>
              }
            >
              <Game
                initialMap={initialMap}
                active={!menuOpen && !portrait}
                onReturnToMenu={() => setMenuOpen(true)}
              />
            </Suspense>
          </GameBoundary>
        </div>
        </LandscapeGate>
      )}
      {menuOpen && (
        <StartMenu
          hasGame={hasGame}
          portrait={portrait}
          onPlay={(mapId) => {
            void requestLandscape();
            setInitialMap(mapId);
            setGameSession((value) => value + 1);
            setHasGame(true);
            setMenuOpen(false);
          }}
          onResume={() => { void requestLandscape(); setMenuOpen(false); }}
        />
      )}
    </>
  );
}
