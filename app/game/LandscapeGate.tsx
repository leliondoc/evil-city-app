import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCw, Smartphone } from 'lucide-react';
import './landscape.css';

export function useLandscapeRequired() {
  const query = '(orientation: portrait)';
  // Remember touch capability: a mouse gesture or Chromium's viewport resize
  // can change the reported primary pointer while this is still a tablet.
  const [touch] = useState(() => navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches);
  const [required, setRequired] = useState(
    () => touch && matchMedia(query).matches,
  );
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setRequired(touch && media.matches);
    media.addEventListener('change', update);
    window.addEventListener('resize', update);
    update();
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, [touch]);
  return required;
}

function RotatePrompt({ onBack }: { onBack: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (mode: string) => Promise<void>;
  };
  const canLock =
    !!orientation?.lock && !!document.documentElement.requestFullscreen;
  const lockLandscape = async () => {
    try {
      await document.documentElement.requestFullscreen();
      await orientation.lock?.('landscape');
    } catch {
      // Physical rotation remains available when the browser refuses a lock.
    }
  };
  return (
    <dialog
      open
      className="landscape-prompt"
      aria-modal="true"
      aria-labelledby="rotate-title"
    >
      <div className="rotate-device" aria-hidden="true">
        <Smartphone size={68} />
        <RotateCw size={34} />
      </div>
      <p>EVIL CITY</p>
      <h1 id="rotate-title" ref={title} tabIndex={-1}>
        Tournez votre appareil
      </h1>
      <div>
        La carte et les batailles se jouent en paysage.
        <br />
        La partie reste en pause pendant la rotation.
      </div>
      {canLock && (
        <button onClick={() => void lockLandscape()}>
          Activer le paysage plein écran
        </button>
      )}
      <button className="rotate-back" onClick={onBack}>
        Retour au menu
      </button>
    </dialog>
  );
}

export function LandscapeGate({
  blocked,
  onBack,
  children,
}: {
  blocked: boolean;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="landscape-content" hidden={blocked} inert={blocked}>
        {children}
      </div>
      {blocked && <RotatePrompt onBack={onBack} />}
    </>
  );
}
