import { lazy, Suspense, useState } from 'react';
import { StartMenu } from './game/StartMenu';

const Game = lazy(() => import('./game/Game'));

export default function App() {
  const [hasGame, setHasGame] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <>
      {hasGame && (
        <div hidden={menuOpen}>
          <Suspense
            fallback={
              <output className="start-loading">
                Le quartier se réveille…
              </output>
            }
          >
            <Game active={!menuOpen} onReturnToMenu={() => setMenuOpen(true)} />
          </Suspense>
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
