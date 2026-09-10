'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Castle,
  Coins,
  Trees,
  Wheat,
  Sparkles,
  Users,
  Pause,
  Play,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Plus,
  Minus,
  Crosshair,
  MousePointer2,
  Move,
  Flag,
  Hammer,
  Swords,
  Shield,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Crown,
  ArrowUp,
  Hourglass,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Renderer } from './renderer';
import { Sprite } from './Sprite';
import { buildingArt, portrait, type Animation } from './art';
import {
  BUILDINGS,
  CREATURES,
  BUILD_OPTIONS,
  RECRUIT_OPTIONS,
  createGame,
  tick,
  population,
  capacity,
  rates,
  hasBuilding,
  army,
  build,
  buildReason,
  recruit,
  recruitReason,
  claim,
  claimReason,
  attack,
  attackReason,
  retreat,
  upgrade,
  upgradeReason,
  upgradeCost,
  moveUnit,
  entrance,
  type State,
  type Selection,
  type BuildingKind,
  type CreatureKind,
  type Cost,
  type Point,
} from './engine';

const icons = { gold: Coins, wood: Trees, food: Wheat, mana: Sparkles };
const unitsText = {
  idle: 'Disponible',
  forage: 'Récupère du bois',
  build: 'Au chantier',
  attack: 'En expédition',
  move: 'En déplacement',
};
function Costs({ cost }: { cost: Cost }) {
  return (
    <div className="card-cost">
      {Object.entries(cost).map(([key, value]) => {
        const Icon = icons[key as keyof Cost];
        return (
          <span key={key}>
            <Icon size={12} />
            {value}
          </span>
        );
      })}
    </div>
  );
}
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
}

export default function Game() {
  const stateRef = useRef<State>(createGame());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [, refresh] = useState(0);
  const [selection, setSelection] = useState<Selection>({ type: 'lot', id: 7 });
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const [pendingBuild, setPendingBuild] = useState<BuildingKind | null>(null);
  const pendingRef = useRef(pendingBuild);
  pendingRef.current = pendingBuild;
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState('build');
  const [bestiaryAction, setBestiaryAction] = useState<Animation>('idle');
  const [modal, setModal] = useState<
    'guide' | 'bestiary' | 'restart' | 'victory' | null
  >(null);
  const [ready, setReady] = useState(false);
  const [artError, setArtError] = useState('');
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryShown = useRef(false);
  const controls = useRef({ paused: false, speed: 1, ready: false });
  controls.current = { paused: paused || modal !== null, speed, ready };

  const notify = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 5000);
  }, []);
  const run = useCallback(
    (action: (s: State) => string | void) => {
      const error = action(stateRef.current);
      if (error) notify(error);
      else {
        refresh((n) => n + 1);
      }
      return !error;
    },
    [notify],
  );
  const select = useCallback(
    (next: Selection) => {
      setSelection(next);
      if (pendingRef.current && next.type === 'lot') {
        const error = build(stateRef.current, next.id, pendingRef.current);
        if (error) notify(error);
        else {
          setPendingBuild(null);
          setFeedback('');
        }
      }
      refresh((n) => n + 1);
    },
    [notify],
  );
  const move = useCallback(
    (point: Point) => {
      const selected = selectionRef.current;
      if (selected.type === 'unit') {
        moveUnit(stateRef.current, selected.id, point);
        refresh((n) => n + 1);
      } else
        notify(
          'Sélectionnez une créature pour lui donner un ordre de déplacement.',
        );
    },
    [notify],
  );

  useEffect(() => {
    const renderer = new Renderer(
      canvasRef.current!,
      () => stateRef.current,
      select,
      move,
      (error) => {
        if (error) setArtError(error);
        else setReady(true);
      },
    );
    rendererRef.current = renderer;
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now(),
        dt = Math.min((now - last) / 1000, 0.3);
      last = now;
      const c = controls.current;
      if (c.ready && !c.paused && !document.hidden) {
        tick(stateRef.current, dt * c.speed);
        refresh((n) => n + 1);
        if (stateRef.current.won && !victoryShown.current) {
          victoryShown.current = true;
          setModal('victory');
        }
      }
    }, 100);
    return () => {
      renderer.destroy();
      clearInterval(interval);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [select, move]);
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.selection = selection;
      rendererRef.current.buildMode = !!pendingBuild;
    }
  }, [selection, pendingBuild]);

  const chooseBuild = useCallback(
    (kind: BuildingKind) => {
      setPendingBuild(kind);
      setTab('build');
      notify('Choisissez une parcelle à vous pour lancer le chantier.');
    },
    [notify],
  );
  const chooseRecruit = useCallback(
    (kind: CreatureKind) => {
      run((s) => recruit(s, kind));
    },
    [run],
  );
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (modal || target.closest('input,textarea,[role=dialog]')) return;
      if (event.code === 'Space' && !target.closest('button')) {
        event.preventDefault();
        setPaused((p) => !p);
      }
      if (event.key === 'Escape') {
        setPendingBuild(null);
        setFeedback('');
      }
      if (event.key.toLowerCase() === 'h') setModal('guide');
      if (event.key.toLowerCase() === 'r') run((s) => retreat(s));
      if (['1', '2', '3', '4'].includes(event.key)) {
        const i = Number(event.key) - 1;
        tab === 'build'
          ? chooseBuild(BUILD_OPTIONS[i])
          : chooseRecruit(RECRUIT_OPTIONS[i]);
      }
      if (target === canvasRef.current) {
        const movement: Record<string, [number, number]> = {
          ArrowLeft: [40, 0],
          ArrowRight: [-40, 0],
          ArrowUp: [0, 40],
          ArrowDown: [0, -40],
        };
        if (movement[event.key]) {
          event.preventDefault();
          rendererRef.current?.pan(...movement[event.key]);
        }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [modal, tab, chooseBuild, chooseRecruit, run]);

  const s = stateRef.current;
  const selectedLot =
    selection.type === 'lot' ? s.lots[selection.id] : undefined;
  const selectedUnit =
    selection.type === 'unit'
      ? s.units.find((u) => u.id === selection.id)
      : undefined;
  const chosenKind =
    selectedLot &&
    (selectedLot.kind === 'empty' ||
      selectedLot.kind === 'house' ||
      selectedLot.kind === 'tavern') &&
    selectedLot.owned &&
    pendingBuild
      ? pendingBuild
      : selectedLot?.construction?.kind || selectedLot?.kind;
  const def = chosenKind ? BUILDINGS[chosenKind] : undefined;
  const creature = selectedUnit ? CREATURES[selectedUnit.kind] : undefined;
  const income = rates(s);
  const owned = s.lots.filter((l) => l.owned).length;
  const milestones = [
    hasBuilding(s, 'canteen'),
    hasBuilding(s, 'forge'),
    army(s).length >= 2,
    s.won,
  ];
  const milestoneLabels = [
    'Ouvrir une cantine',
    'Construire une forge',
    'Rassembler 2 combattants',
    'Prendre la mairie',
  ];
  const currentMilestone = milestones.findIndex((done) => !done);
  const message = feedback || (s.noticeUntil > s.elapsed ? s.notice : '');
  const count = (kind: CreatureKind) =>
    s.units.filter((u) => u.kind === kind).length;
  const cycleLot = (direction: number) => {
    setPendingBuild(null);
    setSelection({
      type: 'lot',
      id: ((selection.type === 'lot' ? selection.id : 6) + direction + 9) % 9,
    });
  };
  const reset = () => {
    stateRef.current = createGame();
    setSelection({ type: 'lot', id: 7 });
    setPendingBuild(null);
    setPaused(false);
    setSpeed(1);
    setFeedback('');
    setModal(null);
    victoryShown.current = false;
    rendererRef.current?.resetView();
    refresh((n) => n + 1);
  };
  const buildSelected = () => {
    if (
      selectedLot &&
      pendingBuild &&
      run((state) => build(state, selectedLot.id, pendingBuild))
    ) {
      setPendingBuild(null);
      setFeedback('');
    }
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={portrait('minotaur')} alt="" />
          <div>
            <h1>EVIL CITY</h1>
            <small>LE PREMIER QUARTIER</small>
          </div>
        </div>
        <div className="resources" aria-label="Vos ressources">
          {(
            [
              { key: 'gold', label: 'Or', className: '' },
              { key: 'wood', label: 'Bois', className: 'wood' },
              { key: 'food', label: 'Vivres', className: 'food' },
              { key: 'mana', label: 'Essence', className: 'mana' },
            ] as const
          ).map(({ key, label, className }) => {
            const Icon = icons[key];
            const rate = Math.round(income[key] * 60);
            return (
              <div
                className={`resource ${className}`}
                key={key}
                title={`${label} : ${rate >= 0 ? '+' : ''}${rate} par minute`}
              >
                <Icon strokeWidth={1.6} />
                <div>
                  <strong>
                    {Math.floor(s.resources[key]).toLocaleString('fr-FR')}
                  </strong>
                  <span>
                    {label}{' '}
                    <span
                      style={{
                        display: 'inline',
                        color: rate < 0 ? '#d5a887' : undefined,
                      }}
                    >
                      · {rate >= 0 ? '+' : ''}
                      {rate}/min
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="top-actions">
          <Button
            className="speed-btn"
            title="Changer la vitesse"
            aria-label={`Vitesse ${speed}. Changer la vitesse`}
            onClick={() => setSpeed((v) => (v === 3 ? 1 : v + 1))}
          >
            ×{speed}
          </Button>
          <Button
            className="icon-btn"
            title={paused ? 'Reprendre (Espace)' : 'Pause (Espace)'}
            aria-label={paused ? 'Reprendre' : 'Mettre en pause'}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}
          </Button>
          <Button
            className="icon-btn optional-action"
            title="Bestiaire"
            aria-label="Ouvrir le bestiaire"
            onClick={() => setModal('bestiary')}
          >
            <BookOpen size={17} />
          </Button>
          <Button
            className="icon-btn"
            title="Comment jouer (H)"
            aria-label="Comment jouer"
            onClick={() => setModal('guide')}
          >
            <HelpCircle size={17} />
          </Button>
          <Button
            className="icon-btn optional-action"
            title="Nouvelle partie"
            aria-label="Recommencer la partie"
            onClick={() => setModal('restart')}
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </header>

      <div className="game-body">
        <aside className="sidebar" aria-label="Objectifs et sélection">
          <section>
            <p className="eyebrow">Chapitre I · Premiers méfaits</p>
            <div className="chapter">
              <Flag size={25} strokeWidth={1.4} />
              <h2>Un si joli quartier.</h2>
            </div>
            <p className="intro-copy">
              Installez vos créatures.
              <br />
              Faites-vous une petite place…
              <br />
              Puis prenez celle des autres.
            </p>
            <div className="quest-list">
              {milestoneLabels.map((label, i) => (
                <div
                  className={`quest ${milestones[i] ? 'done' : i === currentMilestone ? 'active' : ''}`}
                  key={label}
                >
                  {milestones[i] ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <Circle size={17} />
                  )}
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
          <div className="side-rule" />
          <section aria-label="Détails de la sélection">
            <div className="selection-heading">
              <p className="eyebrow">
                <span
                  className={`owner-dot ${selectedLot && !selectedLot.owned ? 'neutral' : ''}`}
                />
                {selectedUnit
                  ? 'Votre créature'
                  : selectedLot?.owned
                    ? 'Votre domaine'
                    : 'Quartier libre'}
              </p>
              <div style={{ display: 'flex' }}>
                <button
                  aria-label="Parcelle précédente"
                  title="Parcelle précédente"
                  onClick={() => cycleLot(-1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Parcelle suivante"
                  title="Parcelle suivante"
                  onClick={() => cycleLot(1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <h3 className="selection-name">
              {creature?.name || def?.name || 'Créature disparue'}
            </h3>
            <div className="selection-art">
              {selectedUnit ? (
                <Sprite
                  creature={selectedUnit.kind}
                  action={
                    selectedUnit.path.length
                      ? 'walk'
                      : selectedUnit.task === 'attack'
                        ? 'attack'
                        : 'idle'
                  }
                />
              ) : chosenKind ? (
                <Sprite asset={buildingArt(chosenKind, selectedLot?.owned)} />
              ) : null}
            </div>
            <p className="selection-text">
              {creature?.description ||
                def?.description ||
                'Sélectionnez une autre créature ou une parcelle.'}
            </p>
            {selectedUnit && creature && (
              <>
                <div className="selection-stats">
                  <span>
                    <Shield size={14} />
                    {Math.ceil(selectedUnit.hp)} / {creature.hp}
                  </span>
                  <span>{unitsText[selectedUnit.task]}</span>
                </div>
                <Progress
                  className="healthbar"
                  value={(selectedUnit.hp / creature.hp) * 100}
                  aria-label="Santé de la créature"
                />
                <Button
                  className="primary-btn"
                  onClick={() =>
                    run((state) => {
                      moveUnit(state, selectedUnit.id, entrance(state.lots[6]));
                    })
                  }
                >
                  Rentrer au manoir
                </Button>
                <p className="reason">
                  Clic droit dans la rue pour déplacer cette créature.
                </p>
              </>
            )}
            {selectedLot && (
              <>
                <div className="selection-stats">
                  <span>
                    {selectedLot.owned ? (
                      <>
                        <Flag size={14} />
                        Niveau {selectedLot.level}
                      </>
                    ) : (
                      <>
                        <Shield size={14} />
                        Défense {Math.ceil(selectedLot.hp)}
                      </>
                    )}
                  </span>
                  <span>
                    {selectedLot.construction ? (
                      <>
                        <Hammer size={14} />
                        Chantier
                      </>
                    ) : selectedLot.kind === 'empty' ? (
                      'Parcelle libre'
                    ) : selectedLot.owned ? (
                      'Sous influence'
                    ) : (
                      'À conquérir'
                    )}
                  </span>
                </div>
                {selectedLot.construction ? (
                  <>
                    <Progress
                      className="healthbar"
                      value={selectedLot.construction.progress * 100}
                      aria-label="Avancement du chantier"
                    />
                    <p className="reason">
                      {Math.floor(selectedLot.construction.progress * 100)} % ·
                      Les gobelins se chargent des travaux.
                    </p>
                  </>
                ) : selectedLot.owned ? (
                  <>
                    {pendingBuild &&
                    (selectedLot.kind === 'empty' ||
                      selectedLot.kind === 'house' ||
                      selectedLot.kind === 'tavern') ? (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <Costs cost={BUILDINGS[pendingBuild].cost} />
                        </div>
                        <Button
                          className="primary-btn"
                          disabled={
                            !!buildReason(s, selectedLot.id, pendingBuild)
                          }
                          onClick={buildSelected}
                        >
                          <Hammer size={15} />
                          Construire ici
                        </Button>
                        {buildReason(s, selectedLot.id, pendingBuild) && (
                          <p className="reason">
                            {buildReason(s, selectedLot.id, pendingBuild)}
                          </p>
                        )}
                        <Button
                          className="subtle-btn"
                          onClick={() => {
                            setPendingBuild(null);
                            setFeedback('');
                          }}
                        >
                          <X size={13} />
                          Annuler
                        </Button>
                      </>
                    ) : selectedLot.kind === 'empty' ? (
                      <Button
                        className="primary-btn"
                        onClick={() => chooseBuild('canteen')}
                      >
                        <Hammer size={15} />
                        Installer une cantine
                      </Button>
                    ) : (
                      <>
                        <Button
                          className="primary-btn"
                          disabled={!!upgradeReason(s, selectedLot.id)}
                          onClick={() =>
                            run((state) => upgrade(state, selectedLot.id))
                          }
                        >
                          <ArrowUp size={15} />
                          {selectedLot.level >= 3
                            ? 'Niveau maximal'
                            : `Améliorer · ${80 * selectedLot.level} or`}
                        </Button>
                        {selectedLot.level < 3 && (
                          <div style={{ marginTop: 8 }}>
                            <Costs cost={upgradeCost(selectedLot)} />
                          </div>
                        )}
                        {(selectedLot.kind === 'house' ||
                          selectedLot.kind === 'tavern') && (
                          <p className="reason">
                            Choisissez un bâtiment en bas pour transformer cette
                            propriété.
                          </p>
                        )}
                        {upgradeReason(s, selectedLot.id) &&
                          selectedLot.level < 3 && (
                            <p className="reason">
                              {upgradeReason(s, selectedLot.id)}
                            </p>
                          )}
                      </>
                    )}
                  </>
                ) : selectedLot.kind === 'empty' ? (
                  <>
                    <Button
                      className="primary-btn"
                      disabled={!!claimReason(s, selectedLot.id)}
                      onClick={() =>
                        run((state) => claim(state, selectedLot.id))
                      }
                    >
                      <Sparkles size={15} />
                      Revendiquer le terrain
                    </Button>
                    <div style={{ marginTop: 8 }}>
                      <Costs cost={{ gold: 40, mana: 18 }} />
                    </div>
                    {claimReason(s, selectedLot.id) && (
                      <p className="reason">{claimReason(s, selectedLot.id)}</p>
                    )}
                  </>
                ) : (
                  <>
                    <Progress
                      className="healthbar"
                      value={(selectedLot.hp / selectedLot.maxHp) * 100}
                      aria-label="Résistance des défenseurs"
                    />
                    <Button
                      className="primary-btn"
                      disabled={!!attackReason(s, selectedLot.id)}
                      onClick={() =>
                        run((state) => attack(state, selectedLot.id))
                      }
                    >
                      <Swords size={16} />
                      Envoyer l’armée
                    </Button>
                    <p className="reason">
                      {attackReason(s, selectedLot.id) ||
                        (selectedLot.kind === 'hall'
                          ? '3 trolls en bonne santé sont conseillés.'
                          : `${army(s).length} combattant${army(s).length > 1 ? 's' : ''} prêt${army(s).length > 1 ? 's' : ''} à marcher.`)}
                    </p>
                    {army(s).some((u) => u.task === 'attack') && (
                      <Button
                        className="subtle-btn"
                        onClick={() => run((state) => retreat(state))}
                      >
                        Sonner le repli
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </section>
          <div className="chronicle">
            <p className="eyebrow">Échos du quartier</p>
            {s.journal.slice(0, 2).map((entry, i) => (
              <p key={`${i}-${entry}`}>{entry}</p>
            ))}
          </div>
        </aside>

        <section className="world-wrap" aria-label="Carte du quartier">
          <canvas
            className="world-canvas"
            ref={canvasRef}
            tabIndex={0}
            aria-label="Carte interactive en vue du dessus. Cliquez sur une parcelle ou une créature. Utilisez les flèches pour déplacer la carte. Les boutons du panneau permettent aussi de parcourir les parcelles."
          />
          <div className="map-caption">
            <h2>Les Tilleuls</h2>
            <p>QUARTIER FICTIF · PROTOTYPE 0.2</p>
          </div>
          <div className="map-status">
            <Flag size={15} />
            {owned}/9 parcelles <span style={{ opacity: 0.5 }}>│</span>
            <Hourglass size={13} />
            {clock(s.elapsed)}
          </div>
          <div className="canvas-help">
            <span>
              <MousePointer2 size={13} />
              Sélectionner
            </span>
            <span>
              <Move size={13} />
              Glisser pour explorer
            </span>
            <span>Molette : zoom</span>
          </div>
          <div className="map-controls">
            <Button
              className="icon-btn"
              aria-label="Zoom avant"
              title="Zoom avant"
              onClick={() => rendererRef.current?.zoomBy(1.18)}
            >
              <Plus size={17} />
            </Button>
            <Button
              className="icon-btn"
              aria-label="Zoom arrière"
              title="Zoom arrière"
              onClick={() => rendererRef.current?.zoomBy(0.85)}
            >
              <Minus size={17} />
            </Button>
            <Button
              className="icon-btn"
              aria-label="Recentrer le quartier"
              title="Recentrer"
              onClick={() => rendererRef.current?.resetView()}
            >
              <Crosshair size={17} />
            </Button>
          </div>
          {message && (
            <div className="toast-message" role="status" aria-live="polite">
              {message}
            </div>
          )}
          {paused && (
            <div className="paused-label">Le mal prend une pause.</div>
          )}
          {!ready && (
            <div className="loading-art">
              {artError
                ? 'Le quartier attend ses couleurs…'
                : 'Les gobelins ouvrent les volets…'}
              <span>{artError || 'Préparation du quartier'}</span>
            </div>
          )}
        </section>
      </div>

      <footer className="bottom-bar">
        <section className="army-overview" aria-label="Votre population">
          <div className="army-title">
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                color: '#e3ddc7',
              }}
            >
              <Users size={17} />
              Vos créatures
            </span>
            <span>
              {population(s)} / {capacity(s)}
            </span>
          </div>
          <div className="army-faces">
            {RECRUIT_OPTIONS.map((kind) => (
              <button
                className="army-face"
                key={kind}
                aria-label={`${count(kind)} ${CREATURES[kind].name}. Voir le bestiaire`}
                title={`${CREATURES[kind].name} : ${count(kind)}`}
                onClick={() => setModal('bestiary')}
              >
                <img src={portrait(kind)} alt="" />
                <b>{count(kind)}</b>
              </button>
            ))}
          </div>
          <p className="army-note">
            {s.recruits.length
              ? `${s.recruits.length} créature${s.recruits.length > 1 ? 's' : ''} en route…`
              : s.resources.food === 0
                ? 'Les ventres vides affaiblissent vos troupes.'
                : 'Une armée commence par un bon repas.'}
          </p>
        </section>
        <Tabs
          className="build-tabs"
          value={tab}
          onValueChange={(value) => {
            setTab(String(value));
            setPendingBuild(null);
          }}
        >
          <TabsList variant="line">
            <TabsTrigger value="build">
              <Hammer size={14} />
              Bâtiments
            </TabsTrigger>
            <TabsTrigger value="recruit">
              <Swords size={14} />
              Créatures
            </TabsTrigger>
          </TabsList>
          <TabsContent value="build">
            <div className="card-row">
              {BUILD_OPTIONS.map((kind, i) => {
                const b = BUILDINGS[kind];
                return (
                  <button
                    className={`build-card ${pendingBuild === kind ? 'chosen' : ''}`}
                    key={kind}
                    onClick={() => chooseBuild(kind)}
                    aria-pressed={pendingBuild === kind}
                  >
                    <Sprite asset={buildingArt(kind)} />
                    <div>
                      <strong>{b.name}</strong>
                      <small>{b.short}</small>
                      <Costs cost={b.cost} />
                    </div>
                    <span className="keyhint">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="recruit">
            <div className="card-row">
              {RECRUIT_OPTIONS.map((kind, i) => {
                const c = CREATURES[kind],
                  reason = recruitReason(s, kind);
                return (
                  <button
                    className={`build-card ${reason ? 'locked' : ''}`}
                    key={kind}
                    onClick={() => chooseRecruit(kind)}
                    title={reason || `Recruter : ${c.name}`}
                    aria-label={`Recruter ${c.name}${reason ? `. ${reason}` : ''}`}
                  >
                    <img src={portrait(kind)} alt="" />
                    <div>
                      <strong>{c.name}</strong>
                      <small>{c.job}</small>
                      <Costs cost={c.cost} />
                    </div>
                    <span className="keyhint">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </footer>

      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="ui-modal">
          {modal === 'guide' && (
            <>
              <DialogTitle>Le guide du mauvais voisin</DialogTitle>
              <DialogDescription>
                Votre objectif : prendre la mairie. Commencez petit, nourrissez
                vos troupes et avancez de parcelle en parcelle.
              </DialogDescription>
              <div className="guide-steps">
                <div className="guide-step">
                  <b>01</b>
                  <div>
                    <strong>Installez la cantine</strong>
                    <p>
                      Choisissez « Cantine des hordes » en bas, puis cliquez sur
                      votre terrain libre, à côté du manoir. Les gobelins
                      construisent automatiquement.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>02</b>
                  <div>
                    <strong>Ouvrez votre forge</strong>
                    <p>
                      Sélectionnez la friche au centre et revendiquez-la pour 40
                      or et 18 essence. Construisez-y une forge. Les gobelins
                      libres récupèrent du bois.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>03</b>
                  <div>
                    <strong>Faites connaissance avec les voisins</strong>
                    <p>
                      Dans « Créatures », recrutez 3 trolls. Sélectionnez
                      l’auberge voisine, puis « Envoyer l’armée ». Après la
                      conquête, avancez vers la mairie.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>04</b>
                  <div>
                    <strong>Prenez soin de votre horde</strong>
                    <p>
                      Les blessés se soignent près du manoir. Une crypte
                      débloque les squelettes ; avec une forge, elle permet
                      d’invoquer le Minotaure.
                    </p>
                  </div>
                </div>
              </div>
              <p className="controls-guide">
                Glisser : déplacer la carte · Molette : zoom · Espace : pause ·
                1-4 : bâtiment ou créature · R : repli · Échap : annuler un
                chantier avant sa pose.
                <br />
                Les parties ne sont pas conservées après fermeture. Le quartier
                est fictif.
              </p>
              <p className="art-credit">
                Graphismes et animations :{' '}
                <a
                  href="https://pixelfrog-assets.itch.io/tiny-swords"
                  target="_blank"
                  rel="noreferrer"
                >
                  Tiny Swords, Pixel Frog
                </a>
                .
              </p>
              <Button className="primary-btn" onClick={() => setModal(null)}>
                À nous le quartier
              </Button>
            </>
          )}
          {modal === 'bestiary' && (
            <>
              <DialogTitle>Des voisins peu fréquentables</DialogTitle>
              <DialogDescription>
                Les quatre premières créatures de votre domaine.
              </DialogDescription>
              <Tabs
                className="animation-tabs"
                value={bestiaryAction}
                onValueChange={(v) => setBestiaryAction(v as Animation)}
              >
                <TabsList>
                  <TabsTrigger value="idle">Au repos</TabsTrigger>
                  <TabsTrigger value="walk">En marche</TabsTrigger>
                  <TabsTrigger value="attack">À l’attaque</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="bestiary-grid">
                {RECRUIT_OPTIONS.map((kind) => {
                  const c = CREATURES[kind];
                  return (
                    <div className="bestiary-creature" key={kind}>
                      <Sprite
                        creature={kind}
                        action={bestiaryAction}
                        label={c.name}
                      />
                      <strong>{c.name}</strong>
                      <p>{c.description}</p>
                      <p>
                        {c.hp} santé ·{' '}
                        {c.damage
                          ? `${c.damage} dégâts/s`
                          : 'Construction et bois'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {modal === 'restart' && (
            <>
              <DialogTitle>On recommence les méfaits ?</DialogTitle>
              <DialogDescription>
                Vous retrouverez le quartier intact, vos trois gobelins et vos
                ressources de départ. La partie en cours sera remplacée.
              </DialogDescription>
              <Button className="primary-btn" onClick={reset}>
                Recommencer la partie
              </Button>
              <Button className="subtle-btn" onClick={() => setModal(null)}>
                Garder mon domaine
              </Button>
            </>
          )}
          {modal === 'victory' && (
            <>
              <Crown className="victory-seal" strokeWidth={1.2} />
              <DialogTitle style={{ textAlign: 'center' }}>
                Le quartier est à vous.
              </DialogTitle>
              <DialogDescription style={{ textAlign: 'center' }}>
                La mairie a changé de drapeau. Bienvenue à Evil City.
              </DialogDescription>
              <div className="victory-stats">
                <div>
                  <strong>{clock(s.elapsed)}</strong>
                  <span>Temps de conquête</span>
                </div>
                <div>
                  <strong>{owned}/9</strong>
                  <span>Parcelles acquises</span>
                </div>
                <div>
                  <strong>{s.units.length}</strong>
                  <span>Créatures présentes</span>
                </div>
              </div>
              <Button className="primary-btn" onClick={() => setModal(null)}>
                Continuer à régner
              </Button>
              <Button className="subtle-btn" onClick={reset}>
                Une nouvelle conquête
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
