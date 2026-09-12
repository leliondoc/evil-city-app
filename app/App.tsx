import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { StartMenu } from './game/StartMenu';

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

  return (
    <>
      {hasGame && (
        <div hidden={menuOpen}>
          <GameBoundary>
            <Suspense
              fallback={
                <output className="start-loading">
                  Le quartier se réveille…
                </output>
              }
            >
              <Game
                active={!menuOpen}
                onReturnToMenu={() => setMenuOpen(true)}
              />
            </Suspense>
          </GameBoundary>
        </div>
      )}
      {menuOpen && (
        <StartMenu
          hasGame={hasGame}
          onPlay={() => {
            setHasGame(true);
            setMenuOpen(false);
          }}
        />
      )}
    </>
  );
}
