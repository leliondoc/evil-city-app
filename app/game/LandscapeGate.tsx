import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCw, Smartphone } from 'lucide-react';
import './landscape.css';
import { requestLandscape } from './orientation';

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
    window.addEventListener('orientationchange', update);
    screen.orientation?.addEventListener?.('change', update);
    window.visualViewport?.addEventListener('resize', update);
    update();
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      screen.orientation?.removeEventListener?.('change', update);
      window.visualViewport?.removeEventListener('resize', update);
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
  const canLock = !!orientation?.lock;
  const [attempting, setAttempting] = useState(false);
  const [failed, setFailed] = useState(false);
  const lockLandscape = async () => {
    setAttempting(true);
    setFailed(!(await requestLandscape()));
    setAttempting(false);
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
        <p>Si l’écran ne tourne pas, désactivez le verrouillage de rotation dans les réglages rapides de votre appareil, puis tenez-le à l’horizontale.</p>
      </div>
      {canLock && (
        <button disabled={attempting} onClick={() => void lockLandscape()}>
          {attempting ? 'Passage en paysage…' : 'Réessayer le paysage automatique'}
        </button>
      )}
      {failed && <output className="rotate-status">Le navigateur ne permet pas la rotation automatique. Tournez l’appareil après avoir déverrouillé son orientation.</output>}
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
