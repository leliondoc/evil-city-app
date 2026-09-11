'use client';

import { restReason, restUnit, restUnits } from './domain';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Sparkles,
  Users,
  Pause,
  BookOpen,
  Plus,
  Minus,
  Crosshair,
  Flag,
  Hammer,
  Shield,
  CheckCircle2,
  Circle,
  Crown,
  ArrowUp,
  Hourglass,
  LockKeyhole,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  GameButton as Button,
  PackIcon,
  PanelSkin,
  HealthBar,
  ResourceIcon,
  RibbonSkin,
} from './PackUI';
import { SupplySelection } from './SupplyPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Renderer } from './renderer';
import { GameAudio, readAudioSettings, type AudioStatus } from './audio';
import { selectedUnitIds, unitSelection } from './selection';
import { Sprite } from './Sprite';
import { CreaturePortrait } from './CreaturePortrait';
import { CreationCards } from './CreationCards';
import { ThreatPanel } from './ThreatPanel';
import { GuildRoster, GuildHeroSelection } from './GuildPanel';
import { Bestiary } from './Bestiary';
import { CombatDetails } from './CombatDetails';
import { CommandWheel } from './CommandWheel';
import { creatureCombatProfile, HUMAN_COMBAT } from './combat';
import { MANOR_TIERS, manorLevel, canUpgradeKind, buildingLevelEffect, upgradeBenefit } from './progression';
import { DomainPanel } from './DomainPanel';
import { TowerPanel } from './StrategyPanel';
import { mission } from './mission';
import { createGameStore } from './gameStore';
import { buildingArt, enemyAnimationSequence, type Animation } from './art';
import {
  BUILDINGS,
  CREATURES,
  armyDamage,
  unitSpeed,
  unitIsMounted,
  RESOURCE_LABELS,
  enemyDefinition,
  BUILD_OPTIONS,
  RECRUIT_OPTIONS,
  tick,
  population,
  capacity,
  rates,
  goblinWorkforce,
  harvestRates,
  gatheringText,
  gather,
  GOBLIN_CAP,
  RESOURCE_CAP,
  foodBalance,
  army,
  build,
  buildReason,
  buildUnlockReason,
  buildMenuReason,
  recruit,
  recruitReason,
  claim,
  claimReason,
  attack,
  attackReason,
  retreat,
  defend,
  intercept,
  raidSupply,
  upgrade,
  upgradeReason,
  upgradeCost,
  moveUnit,
  commandUnits,
  entrance,
  type State,
  type Selection,
  type BuildingKind,
  type CreatureKind,
  type Cost,
  type Point,
} from './engine';

const unitsText = {
  idle: 'Disponible',
  tower: 'En poste à la tour',
  'collect-loot': 'Récupère le butin',
  'deliver-loot': 'Rapporte le butin',
  forage: 'Récolte des ressources',
  build: 'Au chantier',
  attack: 'En expédition',
  move: 'En déplacement',
  defend: 'Intercepte un ennemi',
  sabotage: 'Sabote la production',
  hunt: 'Attaque un paysan',
  haunt: 'Prépare une hantise',
  duel: 'Affronte un moine',
  collect: 'Récupère une dépouille',
  deliver: 'Rapporte une dépouille',
  bribe: 'Livre un pot-de-vin',
  eat: 'Va manger à la cantine',
  rest: 'Se repose à la tanière',
  restore: 'Se reconstitue à la crypte',
};
function Costs({ cost, available }: { cost: Cost; available?: Cost }) {
  return (
    <div className="card-cost">
      {Object.entries(cost).map(([key, value]) => {
        const resource = key as keyof Cost;
        const missing =
          available !== undefined && (available[resource] ?? 0) < value;
        return (
          <span
            key={key}
            className={missing ? 'cost-missing' : undefined}
            title={`${value} ${RESOURCE_LABELS[resource]}${missing ? ` · manque ${Math.ceil(value - (available?.[resource] ?? 0))}` : ''}`}
            aria-label={`${value} ${RESOURCE_LABELS[resource]}`}
          >
            {resource === 'mana' ? (
              <Sparkles size={14} />
            ) : (
              <ResourceIcon kind={resource} />
            )}
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

export default function Game({ initialState }: { initialState?: State } = {}) {
  const [gameStore] = useState(() => createGameStore(initialState));
  const s = useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const [audioSettings, setAudioSettings] = useState(readAudioSettings);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [selection, setSelection] = useState<Selection>({ type: 'lot', id: 7 });
  const selectionRef = useRef(selection);
  useLayoutEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  const [pendingBuild, setPendingBuild] = useState<BuildingKind | null>(null);
  const pendingRef = useRef(pendingBuild);
  useLayoutEffect(() => {
    pendingRef.current = pendingBuild;
  }, [pendingBuild]);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState('build');
  const [compact, setCompact] = useState(
    () => window.matchMedia('(max-width: 800px), (pointer: coarse)').matches,
  );
  const [mobilePanel, setMobilePanel] = useState<
    'details' | 'build' | 'recruit' | null
  >(null);
  const [touchMode, setTouchMode] = useState<'inspect' | 'select' | 'command'>(
    'inspect',
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 800px), (pointer: coarse)');
    const update = () => {
      setCompact(query.matches);
      // Scale the interface to usable CSS pixels, keeping short and touch screens compact.
      const scale = query.matches
        ? 1
        : Math.max(
            1,
            Math.min(2, window.innerWidth / 1600, window.innerHeight / 900),
          );
      document.documentElement.style.setProperty(
        '--game-ui-scale',
        scale.toFixed(3),
      );
    };
    update();
    query.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--game-ui-scale');
    };
  }, []);
  const [bestiaryAction, setBestiaryAction] = useState<Animation>('idle');
  const [modal, setModal] = useState<
    'guide' | 'bestiary' | 'settings' | 'restart' | 'victory' | 'defeat' | null
  >(null);
  const [ready, setReady] = useState(false);
  const [artError, setArtError] = useState('');
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryShown = useRef(false);
  const controls = useRef({ paused: false, speed: 1, ready: false });
  useLayoutEffect(() => {
    controls.current = { paused: paused || modal !== null, speed, ready };
  }, [paused, modal, speed, ready]);

  useEffect(() => {
    const audio = new GameAudio(
      readAudioSettings(),
      (point) => rendererRef.current?.audioPosition(point) ?? null,
      setAudioStatus,
    );
    audioRef.current = audio;
    audio.update(gameStore.getState());
    const unlock = () => audio.unlock();
    const visibility = () =>
      audio.setPaused(document.hidden || controls.current.paused);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      audio.dispose();
      audioRef.current = null;
    };
  }, [gameStore]);
  useEffect(() => {
    audioRef.current?.configure(audioSettings);
  }, [audioSettings]);
  useEffect(() => {
    audioRef.current?.setPaused(paused || modal !== null || document.hidden);
  }, [paused, modal]);

  const notify = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 5000);
  }, []);
  const run = useCallback(
    (action: (s: State) => string | void) => {
      const error = action(gameStore.getState());
      if (error) notify(error);
      else {
        gameStore.publish();
      }
      return !error;
    },
    [notify, gameStore],
  );
  const select = useCallback(
    (next: Selection) => {
      setSelection(next);
      selectionRef.current = next;
      if (next.type === 'unit' || next.type === 'units') setPendingBuild(null);
      if (next.type === 'none') {
        setPendingBuild(null);
        setFeedback('');
      }
      if (pendingRef.current && next.type === 'lot') {
        const error = build(gameStore.getState(), next.id, pendingRef.current);
        if (error) notify(error);
        else {
          setPendingBuild(null);
          setFeedback('');
          gameStore.publish();
        }
      }
    },
    [notify, gameStore],
  );
  const command = useCallback(
    (point: Point, target: Selection | null) => {
      const selected = selectionRef.current;
      if (selected.type === 'unit' || selected.type === 'units') {
        setPendingBuild(null);
        if (
          run((state) =>
            commandUnits(state, selectedUnitIds(selected), target, point),
          )
        ) {
          setFeedback('');
          setTouchMode('inspect');
        }
      } else
        notify(
          'Sélectionnez une créature pour donner un ordre.',
        );
    },
    [notify, run],
  );

  useEffect(() => {
    const renderer = new Renderer(
      canvasRef.current!,
      () => gameStore.getState(),
      select,
      command,
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
        tick(gameStore.getState(), dt * c.speed);
        audioRef.current?.update(gameStore.getState());
        gameStore.publish();
        if (
          (gameStore.getState().won || gameStore.getState().lost) &&
          !victoryShown.current
        ) {
          victoryShown.current = true;
          setModal(gameStore.getState().lost ? 'defeat' : 'victory');
        }
      }
    }, 100);
    return () => {
      renderer.destroy();
      clearInterval(interval);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [select, command, gameStore]);
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.selection = selection;
      rendererRef.current.buildKind = pendingBuild;
    }
  }, [selection, pendingBuild]);
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.cancelGesture();
      rendererRef.current.interactionMode = compact ? touchMode : 'inspect';
    }
  }, [compact, touchMode]);
  useEffect(() => {
    if (!compact) {
      sidebarRef.current?.scrollTo({ top: 0 });
    } else if (
      selection.type === 'guildHero' ||
      (selection.type === 'lot' && selection.id === 0)
    ) {
      sidebarRef.current
        ?.querySelector('.selection-panel')
        ?.scrollIntoView({ block: 'start' });
    }
  }, [selection, compact]);

  const chooseBuild = useCallback(
    (kind: BuildingKind) => {
      const locked = buildUnlockReason(gameStore.getState(), kind);
      if (locked) {
        notify(locked);
        return;
      }
      setPendingBuild(kind);
      setTouchMode('inspect');
      setMobilePanel(null);
      setTab('build');
      notify('Choisissez une parcelle à vous pour lancer le chantier.');
    },
    [notify, gameStore],
  );
  const chooseRecruit = useCallback(
    (kind: CreatureKind) => {
      const selected = selectionRef.current;
      run((s) =>
        recruit(s, kind, selected.type === 'lot' ? selected.id : undefined),
      );
    },
    [run],
  );
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        modal ||
        target.isContentEditable ||
        target.closest('input,textarea,select,[role=dialog]')
      )
        return;
      if (event.code === 'Space' && !target.closest('button')) {
        event.preventDefault();
        setPaused((p) => !p);
      }
      if (event.key === 'Escape') {
        rendererRef.current?.cancelGesture();
        setPendingBuild(null);
        setFeedback('');
        setSelection({ type: 'none' });
      }
      if (event.key.toLowerCase() === 'h') setModal('guide');
      if (event.key.toLowerCase() === 'r') run((s) => retreat(s));
      if (['1', '2', '3', '4', '5', '6', '7'].includes(event.key)) {
        const i = Number(event.key) - 1;
        if (tab === 'build' && BUILD_OPTIONS[i]) chooseBuild(BUILD_OPTIONS[i]);
        else if (tab === 'recruit' && RECRUIT_OPTIONS[i])
          chooseRecruit(RECRUIT_OPTIONS[i]);
      }
      const movement: Record<string, [number, number]> = {
        z: [0, 40],
        q: [40, 0],
        s: [0, -40],
        d: [-40, 0],
        ...(target === canvasRef.current
          ? {
              ArrowLeft: [40, 0],
              ArrowRight: [-40, 0],
              ArrowUp: [0, 40],
              ArrowDown: [0, -40],
            }
          : {}),
      };
      const direction =
        movement[event.key] ?? movement[event.key.toLowerCase()];
      if (direction && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        rendererRef.current?.pan(...direction);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [modal, tab, chooseBuild, chooseRecruit, run]);

  const group = s.units.filter(
    (u) => u.hp > 0 && selectedUnitIds(selection).includes(u.id),
  );
  useEffect(
    () =>
      gameStore.subscribe(() => {
        const ids = selectedUnitIds(selectionRef.current);
        const living = ids.filter((id) =>
          gameStore.getState().units.some((u) => u.id === id && u.hp > 0),
        );
        if (living.length !== ids.length) select(unitSelection(living));
      }),
    [gameStore, select],
  );
  const selectedLot =
    selection.type === 'lot' ? s.lots[selection.id] : undefined;
  const selectedUnit =
    selection.type === 'unit'
      ? s.units.find((u) => u.id === selection.id)
      : undefined;
  const selectedEnemy =
    selection.type === 'enemy'
      ? s.enemies.find((e) => e.id === selection.id)
      : undefined;
  const enemyDef = selectedEnemy ? enemyDefinition(selectedEnemy) : undefined;
  const pursuedUnit = selectedEnemy
    ? s.units.find((u) => u.id === selectedEnemy.pursuitTarget && u.hp > 0)
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
  const harvest = harvestRates(s);
  income.wood += harvest.wood;
  income.gold += harvest.gold;
  income.food += harvest.food;
  const workforce = goblinWorkforce(s);
  const food = foodBalance(s);
  const owned = s.lots.filter((l) => l.owned).length;
  const { objectives, current: currentObjective, hint } = mission(s);
  const followObjective = () => {
    const action = hint.action;
    if (!action) return;
    if (action.type === 'recruit') {
      run((state) => recruit(state, action.kind));
      return;
    }
    // Inspect first: choosing the objective never spends construction resources.
    setPendingBuild(action.buildKind ?? null);
    setSelection({ type: 'lot', id: action.lotId });
    setTouchMode('inspect');
    setMobilePanel('details');
    if (action.buildKind) setTab('build');
    rendererRef.current?.focusLot(action.lotId);
    if (compact)
      requestAnimationFrame(() =>
        sidebarRef.current
          ?.querySelector('.selection-panel')
          ?.scrollIntoView({ block: 'start' }),
      );
  };
  const message = feedback || (s.noticeUntil > s.elapsed ? s.notice : '');
  const sheetNotice =
    compact && message ? (
      <output className="touch-sheet-notice" aria-live="polite">
        <PanelSkin kind="paper" />
        <span>{message}</span>
      </output>
    ) : null;
  const chooseTouchMode = (mode: 'inspect' | 'select' | 'command') => {
    setTouchMode(mode);
    setPendingBuild(null);
    if (mode === 'command') setMobilePanel(null);
  };
  const reset = () => {
    gameStore.reset();
    setSelection({ type: 'lot', id: 7 });
    setPendingBuild(null);
    setPaused(false);
    setSpeed(1);
    setFeedback('');
    setModal(null);
    setMobilePanel(null);
    setTouchMode('inspect');
    victoryShown.current = false;
    rendererRef.current?.resetView();
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
  const showResourceProduction = (kind: 'gold' | 'wood' | 'food' | 'mana') => {
    setPendingBuild(null);
    const site = s.sites.find((source) => source.kind === kind);
    setSelection(
      site ? { type: 'resource', id: site.id } : { type: 'lot', id: 6 },
    );
    setMobilePanel('details');
    if (compact)
      requestAnimationFrame(() =>
        sidebarRef.current
          ?.querySelector('.selection-panel')
          ?.scrollIntoView({ block: 'start' }),
      );
  };

  const missionCard = (
    <>
      <div className="map-caption mission-map-caption">
        <RibbonSkin />
        <h2>Les Tilleuls</h2>
      </div>
      <section className="mission-card" aria-label="Mission et objectifs">
        <PanelSkin kind="notice" />
        <p className="eyebrow">Chapitre I · Premiers méfaits</p>
        <div
          className="current-objective"
          data-objective={currentObjective?.id ?? 'ended'}
        >
          <p className="objective-kicker">
            {s.won ? 'Victoire' : s.lost ? 'Défaite' : 'Prochaine étape'}
          </p>
          <h2 aria-live="polite">
            {currentObjective?.label ??
              (s.won ? 'Le quartier est à vous.' : 'Votre manoir est tombé.')}
          </h2>
          <p className="objective-detail">{hint.detail}</p>
          {hint.progress !== undefined && (
            <div className="objective-progress">
              <progress
                max={1}
                value={hint.progress}
                aria-label={hint.status}
              />
              <span>{hint.status}</span>
            </div>
          )}
          {hint.action && (
            <Button
              className="primary-btn objective-action"
              disabled={!!hint.reason}
              onClick={followObjective}
            >
              {hint.button}
            </Button>
          )}
          {hint.reason && hint.progress === undefined && (
            <p className="objective-reason">{hint.reason}</p>
          )}
        </div>
        <details className="objectives-disclosure">
          <summary>
            Objectifs{' '}
            <span>
              {objectives.filter((o) => o.done).length}/{objectives.length}
            </span>
          </summary>
          <div className="quest-list">
            {objectives.map((objective) => (
              <div
                className={`quest ${objective.done ? 'done' : objective.id === currentObjective?.id ? 'active' : ''}`}
                key={objective.id}
                aria-current={
                  objective.id === currentObjective?.id ? 'step' : undefined
                }
              >
                {objective.done ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <Circle size={17} />
                )}
                <span>{objective.label}</span>
              </div>
            ))}
          </div>
        </details>
      </section>
    </>
  );

  return (
    <main
      className="game-shell"
      data-compact={compact}
      data-panel={mobilePanel ?? 'map'}
    >
      <header className="topbar">
        <div className="brand">
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}evil-city-logo.png`}
            width={40}
            height={40}
            alt="Evil City"
          />
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
            const ResourceTag = 'button';
            const rate = Math.round(income[key] * 60);
            return (
              <ResourceTag
                className={`resource ${className} food-action${s.resources[key] >= RESOURCE_CAP ? ' resource-full' : ''}`}
                key={key}
                title={`Stockage : ${RESOURCE_CAP.toLocaleString('fr-FR')} maximum. L’excédent de production et de butin est perdu. ${
                  key === 'food'
                    ? `Récoltes estimées : +${food.production}/min · Créatures : −${food.consumption}/min. Voir la production de vivres.`
                    : `${label} : ${rate >= 0 ? '+' : ''}${rate} par minute`
                }`}
                aria-label={`${label} : ${Math.floor(s.resources[key])}. Voir la source de production.`}
                onClick={() => showResourceProduction(key)}
              >
                {key === 'mana' ? (
                  <Sparkles strokeWidth={1.6} />
                ) : (
                  <ResourceIcon kind={key} />
                )}
                <div>
                  <strong>
                    {Math.floor(s.resources[key]).toLocaleString('fr-FR')}
                    <small className="resource-cap">
                      /{RESOURCE_CAP.toLocaleString('fr-FR')}
                    </small>
                  </strong>
                  <span>
                    {label}{' '}
                    <span
                      style={{
                        display: 'inline',
                        color: rate < 0 ? '#d5a887' : undefined,
                      }}
                    >
                      {s.resources[key] >= RESOURCE_CAP && rate >= 0
                        ? ' · Plein'
                        : ` · ${key !== 'mana' ? '≈ ' : ''}${rate >= 0 ? '+' : ''}${rate}/min`}
                    </span>
                  </span>
                </div>
              </ResourceTag>
            );
          })}
        </div>
        <div
          className="session-status"
          aria-label="Progression et durée de la partie"
        >
          <span>
            <Flag size={15} />
            {owned}/9 <span className="session-status-label">parcelles</span>
          </span>
          <span>
            <Hourglass size={13} />
            <time>{clock(s.elapsed)}</time>
            {s.lost ? ' · Défaite' : s.won ? ' · Victoire' : ''}
          </span>
        </div>
        <button
          className="goblin-counter"
          disabled={workforce.total === 0}
          title={`${workforce.total}/${GOBLIN_CAP} gobelins : ${workforce.wood} au bois, ${workforce.gold} à l’or, ${workforce.food} aux vivres, ${workforce.building} aux chantiers, ${workforce.other} en mission ou au repos. ${workforce.queued} en recrutement. Maximum ${GOBLIN_CAP}, recrutements inclus. Les gobelins libres se répartissent entre or, bois et vivres selon les stocks. Chargements de 30, crédités uniquement au manoir. Les débits affichés sont estimatifs. Cliquer pour sélectionner tous les gobelins.`}
          aria-label={`Gobelins : ${workforce.total} sur ${GOBLIN_CAP}, ${workforce.queued} en recrutement, dont ${workforce.wood} au bois, ${workforce.gold} à l’or, ${workforce.food} aux vivres et ${workforce.building} aux chantiers. Sélectionner tous les gobelins.`}
          onClick={() => {
            select(
              unitSelection(
                s.units
                  .filter((u) => u.kind === 'goblin' && u.hp > 0)
                  .map((u) => u.id),
              ),
            );
            setMobilePanel(null);
            setTouchMode('inspect');
          }}
        >
          <CreaturePortrait kind="goblin" />
          <div>
            <strong>
              {workforce.total}/{GOBLIN_CAP} <span>Gobelins</span>
            </strong>
            <small>
              Bois {workforce.wood} · Or {workforce.gold} · Vivres{' '}
              {workforce.food}
              <span> · Chantiers {workforce.building}</span>
            </small>
          </div>
        </button>
        <div className="top-actions">
          <Button
            className="speed-btn"
            title="Changer la vitesse"
            aria-label={`Vitesse ${speed}. Changer la vitesse`}
            onClick={() => setSpeed((v) => (v === 3 ? 1 : v + 1))}
          >
            ×{speed}
          </Button>
          {compact && <>
          <Button
            className="icon-btn"
            title={paused ? 'Reprendre (Espace)' : 'Pause (Espace)'}
            aria-label={paused ? 'Reprendre' : 'Mettre en pause'}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <PackIcon asset="ui-play" /> : <Pause size={17} />}
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
            <PackIcon asset="ui-info" />
          </Button>
          <Button
            className="icon-btn"
            title="Paramètres de partie"
            aria-label="Ouvrir les paramètres"
            onClick={() => setModal('settings')}
          >
            <PackIcon asset="ui-settings" />
          </Button>
          </>}
        </div>
      </header>

      <div className="game-body">
        {!compact && (
          <aside className="mission-sidebar" aria-label="Mission et objectifs">
            {missionCard}
          </aside>
        )}
        <div className="selection-column">
          <aside
            ref={sidebarRef}
            className="sidebar"
            aria-label={compact ? 'Objectifs et sélection' : 'Sélection'}
          >
            {compact && (
              <Button
                className="mobile-sheet-close touch-pack"
                onClick={() => setMobilePanel(null)}
              >
                Fermer les détails <PackIcon asset="ui-close" />
              </Button>
            )}
            {sheetNotice}
            {compact && missionCard}
            {selection.type === 'units' ? (
              <section
                className="selection-panel"
                aria-label="Groupe sélectionné"
              >
                <p className="eyebrow">Vos créatures</p>
                <h3 className="selection-name">
                  {group.length} unités sélectionnées
                </h3>
                <Button
                  className="primary-btn"
                  disabled={group.every((unit) => !!restReason(s, unit.id))}
                  onClick={() =>
                    run((state) =>
                      restUnits(
                        state,
                        group.map((unit) => unit.id),
                      ),
                    )
                  }
                >
                  Soigner les blessés
                </Button>
                <div className="selected-group">
                  {group.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => select({ type: 'unit', id: unit.id })}
                      aria-label={`Sélectionner ${CREATURES[unit.kind].name}, ${Math.ceil(unit.hp)} PV`}
                    >
                      <CreaturePortrait kind={unit.kind} />
                      <span>{CREATURES[unit.kind].name}</span>
                      <small>
                        {Math.ceil(unit.hp)} / {CREATURES[unit.kind].hp} PV
                      </small>
                    </button>
                  ))}
                </div>
                <p className="reason">
                  {compact
                    ? 'Fermez les détails, puis Ordre et touchez la destination ou la cible.'
                    : 'Clic droit : déplacer le groupe ou attaquer une cible.'}{' '}
                  Les gobelins ne combattent pas.
                </p>
                <p className="reason">
                  {compact
                    ? 'Groupe : touchez les créatures pour les ajouter ou les retirer, ou tracez un rectangle. Explorer revient au déplacement de la carte.'
                    : 'Shift + clic : ajouter ou retirer une unité. Shift + rectangle : compléter la sélection. Échap ou clic dans le vide : désélectionner.'}
                </p>
              </section>
            ) : selection.type === 'none' ? (
              <section
                className="selection-panel"
                aria-label="Aucune sélection"
              >
                <h3 className="selection-name">Aucune sélection</h3>
                <p className="selection-text">
                  {compact
                    ? 'Touchez une créature ou une parcelle, puis ouvrez Détails. Groupe permet de sélectionner plusieurs créatures avec un rectangle.'
                    : 'Cliquez sur une créature ou une parcelle pour afficher ses actions. Maintenez Shift et glissez avec le bouton gauche pour sélectionner plusieurs unités par rectangle.'}
                </p>
                <p className="reason">
                  {compact
                    ? 'Dans Explorer, touchez le vide pour désélectionner. Sélectionnez une créature, puis Ordre pour la déplacer ou attaquer.'
                    : 'Clic dans le vide ou Échap : désélectionner. Clic droit : déplacer la créature sélectionnée ou attaquer une cible ennemie.'}
                </p>
              </section>
            ) : selection.type === 'tower' ? (
              <TowerPanel state={s} id={selection.id} onAction={run} />
            ) : selection.type === 'worker' || selection.type === 'resource' ? (
              <SupplySelection
                state={s}
                selection={selection}
                onSelect={select}
                onRaid={() => run((state) => raidSupply(state, selection))}
                onGather={() =>
                  run((state) => {
                    const goblin = state.units.find(
                      (u) =>
                        u.hp > 0 &&
                        u.kind === 'goblin' &&
                        ['idle', 'forage'].includes(u.task) &&
                        !u.gathering?.cargo &&
                        u.gathering?.site !== selection.id,
                    );
                    return goblin
                      ? gather(state, goblin.id, selection.id)
                      : 'Aucun gobelin libre sans chargement. Sélectionnez un gobelin pour lui donner cet ordre.';
                  })
                }
              />
            ) : selection.type === 'guildHero' ? (
              <GuildHeroSelection
                state={s}
                id={selection.id}
                onSelect={select}
              />
            ) : (
              <section
                className="selection-panel"
                aria-label="Détails de la sélection"
              >
                <h3 className="selection-name">
                  {enemyDef?.name ||
                    creature?.name ||
                    def?.name ||
                    'Unité disparue'}
                </h3>
                <div
                  className={`selection-art${chosenKind === 'empty' ? ' empty-art' : selectedLot && chosenKind ? ' building-art' : ''}`}
                >
                  {selectedLot && chosenKind && chosenKind !== 'empty' && (
                    <PanelSkin kind="paper" asset="ui-building-frame" />
                  )}
                  {selectedEnemy ? (
                    <Sprite
                      asset={
                        enemyAnimationSequence(
                          selectedEnemy,
                          selectedEnemy.fighting ||
                            selectedEnemy.healTarget !== null
                            ? 'attack'
                            : selectedEnemy.path.length &&
                                selectedEnemy.moving !== false
                              ? 'walk'
                              : 'idle',
                        )[0]
                      }
                      figure
                    />
                  ) : selectedUnit ? (
                    <Sprite
                      creature={selectedUnit.kind}
                      mounted={unitIsMounted(s, selectedUnit)}
                      action={
                        selectedUnit.fighting
                          ? 'attack'
                          : selectedUnit.path.length &&
                              selectedUnit.moving !== false
                            ? 'walk'
                            : selectedUnit.task === 'attack'
                              ? 'attack'
                              : 'idle'
                      }
                    />
                  ) : chosenKind ? (
                    <Sprite
                      asset={buildingArt(chosenKind, selectedLot?.owned)}
                    />
                  ) : null}
                </div>
                <p className="selection-text">
                  {enemyDef?.description ||
                    creature?.description ||
                    def?.description ||
                    'Sélectionnez une autre créature ou une parcelle.'}
                </p>
                {selectedLot?.kind === 'hq' && (
                  <details className="manor-progression" aria-label="Paliers du manoir">
                    <summary>Voir les trois paliers du manoir</summary>
                    {MANOR_TIERS.map((tier) => (
                      <p className="reason" key={tier.level}>
                        <strong>Niveau {tier.level}{manorLevel(s) >= tier.level ? ' · Acquis' : ' · À débloquer'} : </strong>
                        {tier.description}
                      </p>
                    ))}
                  </details>
                )}
                {selectedEnemy && (
                  <>
                    <CombatDetails profile={HUMAN_COMBAT[selectedEnemy.kind === 'guard' ? 'guard' : selectedEnemy.role || 'warrior']} />
                    <div className="selection-stats">
                      <Shield size={14} /> {Math.ceil(selectedEnemy.hp)} /{' '}
                      {selectedEnemy.maxHp} · Niv. {selectedEnemy.level}
                    </div>
                    <HealthBar
                      value={(selectedEnemy.hp / selectedEnemy.maxHp) * 100}
                      aria-label="Santé de l’ennemi"
                    />
                    <p className="reason">
                      {pursuedUnit
                        ? `Poursuite à mort : ${CREATURES[pursuedUnit.kind].name}`
                        : `Objectif : ${BUILDINGS[s.lots[selectedEnemy.target].kind].name}`}
                    </p>
                    <p className="reason">
                      {selectedEnemy.role === 'monk'
                        ? pursuedUnit
                          ? 'Exorcisme offensif · bonus contre les morts-vivants'
                          : 'Soins aux alliés proches'
                        : `${Math.round(selectedEnemy.damage)} dégâts/s · portée ${enemyDef?.range} cases`}
                    </p>
                    <Button
                      className="primary-btn"
                      tone="red"
                      disabled={s.won || s.lost || !army(s).length}
                      onClick={() =>
                        run((state) => intercept(state, selectedEnemy.id))
                      }
                    >
                      <PackIcon asset="ui-sword" /> Intercepter
                    </Button>
                  </>
                )}
                {selectedUnit && creature && (
                  <>
                    <CombatDetails profile={creatureCombatProfile(selectedUnit.kind, unitIsMounted(s, selectedUnit))} />
                    <div className="selection-stats">
                      <span>
                        <Shield size={14} />
                        {Math.ceil(selectedUnit.hp)} / {creature.hp}
                      </span>
                      <span>
                        {selectedUnit.path.length &&
                        selectedUnit.moving === false &&
                        !selectedUnit.fighting
                          ? 'Attend le passage'
                          : selectedUnit.task === 'forage'
                            ? gatheringText(selectedUnit)
                            : unitsText[selectedUnit.task]}
                      </span>
                    </div>
                    <HealthBar
                      value={(selectedUnit.hp / creature.hp) * 100}
                      aria-label="Santé de la créature"
                    />
                    <p className="reason">
                      {Number(armyDamage(s, selectedUnit).toFixed(1))} dégâts/s avant bonus · vitesse {Number(unitSpeed(s, selectedUnit).toFixed(1))}
                      {unitIsMounted(s, selectedUnit) ? ' · Monté sur cochon' : ''}
                    </p>
                    <Button
                      className="primary-btn"
                      disabled={!!restReason(s, selectedUnit.id)}
                      title={
                        restReason(s, selectedUnit.id) ||
                        'Récupère 4 PV/s sur place jusqu’à guérison complète. Un nouvel ordre interrompt le repos.'
                      }
                      onClick={() =>
                        run((state) => restUnit(state, selectedUnit.id))
                      }
                    >
                      {selectedUnit.manualRest
                        ? 'Soins en cours'
                        : ['skeleton', 'specter'].includes(selectedUnit.kind)
                          ? 'Régénérer à la crypte'
                          : 'Mettre au lit'}
                    </Button>
                    <p className="reason">
                      {restReason(s, selectedUnit.id) ||
                        '4 PV/s au repos, jusqu’aux PV maximum. Un nouvel ordre interrompt les soins.'}
                    </p>
                    <Button
                      className="primary-btn"
                      onClick={() =>
                        run((state) => {
                          moveUnit(
                            state,
                            selectedUnit.id,
                            entrance(state.lots[6]),
                          );
                        })
                      }
                    >
                      Rentrer au manoir
                    </Button>
                    <p className="reason">
                      {compact
                        ? 'Fermez les détails, puis Ordre : touchez le sol pour déplacer cette créature, ou une cible ennemie pour attaquer.'
                        : 'Clic droit au sol : déplacer cette créature. Sur un ennemi ou un bâtiment ennemi : attaquer avec cette créature.'}
                    </p>
                  </>
                )}
                {selectedLot && (
                  <>
                    {chosenKind === 'canteen' && (
                      <div className="food-production">
                        <p>
                          Les gobelins récoltent les vivres à la bergerie et les
                          livrent au manoir. La cantine améliore les repas, sans
                          créer de ressources.
                        </p>
                      </div>
                    )}
                    {selectedLot.owned && selectedLot.kind !== 'empty' && (
                      <>
                        <HealthBar
                          value={(selectedLot.hp / selectedLot.maxHp) * 100}
                          aria-label="Résistance du bâtiment"
                        />
                        <p className="building-health">
                          {Math.ceil(selectedLot.hp)} / {selectedLot.maxHp}{' '}
                          résistance
                        </p>
                      </>
                    )}
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
                          null
                        ) : (
                          'Camp humain · À conquérir'
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
                          {Math.floor(selectedLot.construction.progress * 100)}{' '}
                          % · Les gobelins se chargent des travaux.
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
                              <PackIcon asset="ui-close" />
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
                            {canUpgradeKind(selectedLot.kind) && <Button
                              className="primary-btn"
                              disabled={!!upgradeReason(s, selectedLot.id)}
                              title={upgradeReason(s, selectedLot.id) || upgradeBenefit(selectedLot)}
                              onClick={() =>
                                run((state) => upgrade(state, selectedLot.id))
                              }
                            >
                              <ArrowUp size={15} />
                              {selectedLot.level >= 3
                                ? 'Niveau maximal'
                                : `Passer au niveau ${selectedLot.level + 1}`}
                            </Button>}
                            {canUpgradeKind(selectedLot.kind) && <p className="reason">Actuellement : {buildingLevelEffect(selectedLot.kind, selectedLot.level)}.</p>}
                            {canUpgradeKind(selectedLot.kind) && selectedLot.level < 3 && (
                              <div style={{ marginTop: 8 }}>
                                <p className="reason">{upgradeBenefit(selectedLot)}</p>
                                <Costs cost={upgradeCost(selectedLot)} />
                              </div>
                            )}
                            {(selectedLot.kind === 'house' ||
                              selectedLot.kind === 'tavern') && (
                              <p className="reason">
                                Choisissez un bâtiment en bas pour transformer
                                cette propriété.
                              </p>
                            )}
                            {canUpgradeKind(selectedLot.kind) && upgradeReason(s, selectedLot.id) &&
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
                          <p className="reason">
                            {claimReason(s, selectedLot.id)}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <HealthBar
                          value={(selectedLot.hp / selectedLot.maxHp) * 100}
                          aria-label="Résistance des défenseurs"
                        />
                        <Button
                          className="primary-btn"
                          tone="red"
                          disabled={!!attackReason(s, selectedLot.id)}
                          onClick={() =>
                            run((state) => attack(state, selectedLot.id))
                          }
                        >
                          <PackIcon asset="ui-sword" />
                          Envoyer l’armée
                        </Button>
                        <p className="reason">
                          {attackReason(s, selectedLot.id) ||
                            (selectedLot.kind === 'hall'
                              ? '4 trolls en bonne santé sont conseillés. Surveillez les raids pendant le siège.'
                              : selectedLot.kind === 'house' ||
                                  selectedLot.kind === 'tavern'
                                ? 'Réduisez sa résistance à zéro pour la conquérir. Vous pourrez ensuite y construire votre hutte des trolls.'
                                : `${army(s).length} combattant${army(s).length > 1 ? 's' : ''} prêt${army(s).length > 1 ? 's' : ''} à marcher.`)}
                        </p>
                        {army(s).some(
                          (u) =>
                            u.task === 'attack' && u.target === selectedLot.id,
                        ) && (
                          <output className="capture-status">
                            <span>
                              {army(s).some(
                                (u) =>
                                  u.task === 'attack' &&
                                  u.target === selectedLot.id &&
                                  u.path.length === 0,
                              )
                                ? 'Conquête en cours'
                                : 'Armée en route'}
                            </span>
                            <progress
                              max={selectedLot.maxHp}
                              value={selectedLot.maxHp - selectedLot.hp}
                              aria-label="Progression de la conquête"
                            />
                            <small>
                              {Math.floor(
                                (1 - selectedLot.hp / selectedLot.maxHp) * 100,
                              )}{' '}
                              % · La propriété rejoindra votre domaine.
                            </small>
                          </output>
                        )}
                        {army(s).some((u) => u.task === 'attack') && (
                          <Button
                            className="subtle-btn"
                            onClick={() => run((state) => retreat(state))}
                          >
                            <PackIcon asset="ui-back" /> Sonner le repli
                          </Button>
                        )}
                      </>
                    )}
                    {selectedLot.kind === 'guild' && (
                      <GuildRoster state={s} onSelect={select} />
                    )}
                  </>
                )}
                <DomainPanel
                  state={s}
                  lot={selectedLot}
                  unit={selectedUnit}
                  onAction={run}
                />
              </section>
            )}
          </aside>
        </div>

        <section className="world-wrap" aria-label="Carte du quartier">
          <canvas
            className="world-canvas"
            data-ready={ready}
            ref={canvasRef}
            tabIndex={0}
            aria-label={
              compact
                ? 'Carte tactile. Touchez pour sélectionner, glissez pour explorer, pincez pour zoomer. Groupe permet une sélection par rectangle ; Ordre permet de toucher une destination ou un ennemi.'
                : 'Carte interactive en vue du dessus. Cliquez sur une parcelle ou une créature. Shift + glisser gauche : sélectionner un groupe ou compléter la sélection. Shift + clic : ajouter ou retirer une unité. Glisser gauche, clic molette, ZQSD ou flèches : déplacer la carte.'
            }
          />
          <ThreatPanel
            state={s}
            compact={compact}
            onSelect={(next) => {
              setPendingBuild(null);
              setSelection(next);
              setMobilePanel('details');
            }}
            onDefend={() => run((state) => defend(state))}
          />
          {compact && (
            <>
              <div className="touch-toolbar" aria-label="Commandes tactiles">
                <Button
                  className="touch-pack"
                  aria-pressed={touchMode === 'inspect'}
                  onPointerDown={(e) => {
                    if (e.pointerType === 'touch') {
                      e.preventDefault();
                      chooseTouchMode('inspect');
                    }
                  }}
                  onClick={() => chooseTouchMode('inspect')}
                >
                  Explorer
                </Button>
                <Button
                  className="touch-pack"
                  aria-pressed={touchMode === 'select'}
                  onPointerDown={(e) => {
                    if (e.pointerType === 'touch') {
                      e.preventDefault();
                      chooseTouchMode('select');
                    }
                  }}
                  onClick={() => chooseTouchMode('select')}
                >
                  Groupe
                </Button>
                <Button
                  className="touch-pack"
                  aria-pressed={touchMode === 'command'}
                  disabled={!group.length || s.won || s.lost}
                  onPointerDown={(e) => {
                    if (
                      e.pointerType === 'touch' &&
                      !e.currentTarget.disabled
                    ) {
                      e.preventDefault();
                      chooseTouchMode('command');
                    }
                  }}
                  onClick={() => chooseTouchMode('command')}
                >
                  Ordre
                </Button>
              </div>
              <Button
                className="touch-selection touch-pack"
                onClick={() => setMobilePanel('details')}
                aria-label="Voir les détails de la sélection"
              >
                {selectedUnit
                  ? CREATURES[selectedUnit.kind].name
                  : group.length
                    ? `${group.length} créatures`
                    : selectedLot
                      ? BUILDINGS[selectedLot.kind].name
                      : selectedEnemy
                        ? enemyDef?.name
                        : 'Sélectionner un élément'}
              </Button>
              {(touchMode !== 'inspect' || pendingBuild) && (
                <output className="touch-hint">
                  {pendingBuild
                    ? 'Touchez une parcelle pour construire'
                    : touchMode === 'command'
                      ? 'Touchez une destination ou une cible'
                      : 'Tracez un rectangle ou touchez les créatures'}
                </output>
              )}
            </>
          )}
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
          {(message || paused) && (
            <div className="game-notifications">
              {paused && (
                <div className="paused-label">
                  <PanelSkin kind="notice-ribbon" />
                  <span>Le mal prend une pause.</span>
                </div>
              )}
              {message && (
                <output className="toast-message" aria-live="polite">
                  <PanelSkin kind="notice-ribbon" />
                  <span>{message}</span>
                </output>
              )}
            </div>
          )}
          {!ready && (
            <div
              className={`loading-art ${artError ? 'loading-error' : 'sr-only'}`}
              role={artError ? 'alert' : 'status'}
            >
              {artError || 'Chargement du quartier…'}
            </div>
          )}
        </section>
      </div>

      <footer className="bottom-bar">
        {compact && (
          <Button
            className="mobile-sheet-close touch-pack"
            onClick={() => setMobilePanel(null)}
          >
            Retour à la carte <PackIcon asset="ui-close" />
          </Button>
        )}
        {sheetNotice}
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
            {RECRUIT_OPTIONS.map((kind) => {
              const ids = s.units
                .filter((u) => u.kind === kind && u.hp > 0)
                .map((u) => u.id);
              const selected = selectedUnitIds(selection);
              return (
                <button
                  className="army-face"
                  key={kind}
                  aria-label={`${CREATURES[kind].name} : sélectionner toutes les unités (${ids.length})`}
                  title={`${CREATURES[kind].name} : sélectionner toutes les unités (${ids.length})`}
                  disabled={ids.length === 0}
                  aria-pressed={
                    ids.length > 0 &&
                    selected.length === ids.length &&
                    ids.every((id) => selected.includes(id))
                  }
                  onClick={() => {
                    select(unitSelection(ids));
                    setMobilePanel(null);
                    setTouchMode('inspect');
                  }}
                >
                  <CreaturePortrait kind={kind} />
                  <b>{ids.length}</b>
                </button>
              );
            })}
          </div>
          <p className="army-note">
            {s.recruits.length ? (
              `${s.recruits.length} créature${s.recruits.length > 1 ? 's' : ''} en route…`
            ) : s.resources.food < 20 ? (
              <button
                className="army-food-shortcut"
                onClick={() => showResourceProduction('food')}
              >
                Vivres insuffisants ? Voir la ferme →
              </button>
            ) : (
              'Une armée commence par un bon repas.'
            )}
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
          <TabsList variant="line" aria-label="Construction et recrutement">
            <TabsTrigger
              value="build"
              className="creation-tab creation-tab-build"
            >
              <PackIcon asset="hq-purple" />
              <span>Construire des bâtiments</span>
            </TabsTrigger>
            <TabsTrigger
              value="recruit"
              className="creation-tab creation-tab-recruit"
            >
              {!compact && hint.marker?.kind === 'recruit' && (
                <span className="recruit-tutorial-marker" aria-hidden="true">
                  Recruter
                </span>
              )}
              <PackIcon asset="goblin-avatar" />
              <span>Recruter des créatures</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="build">
            <CreationCards>
              {BUILD_OPTIONS.map((kind, i) => {
                const b = BUILDINGS[kind];
                const locked = buildUnlockReason(s, kind);
                const reason = buildMenuReason(s, kind);
                return (
                  <button
                    className={`build-card building-card ${pendingBuild === kind ? 'chosen' : ''} ${reason ? 'locked' : ''}`}
                    key={kind}
                    onClick={() => chooseBuild(kind)}
                    aria-pressed={pendingBuild === kind}
                    aria-disabled={!!locked}
                    title={reason || b.short}
                    aria-label={`${b.name}${reason ? `. ${reason}` : ''}`}
                  >
                    {compact && <PanelSkin kind="paper" />}
                    <Sprite asset={buildingArt(kind)} />
                    <div>
                      <strong>{b.name}</strong>
                      <small className={reason ? 'recruit-blocker' : undefined}>
                        {reason || b.short}
                      </small>
                      <Costs cost={b.cost} available={s.resources} />
                    </div>
                    <span className="keyhint">
                      {locked ? <LockKeyhole size={13} /> : i + 1}
                    </span>
                  </button>
                );
              })}
            </CreationCards>
          </TabsContent>
          <TabsContent value="recruit">
            <CreationCards>
              {RECRUIT_OPTIONS.map((kind, i) => {
                const c = CREATURES[kind],
                  reason = recruitReason(s, kind);
                const orders = s.recruits.filter((r) => r.kind === kind);
                const next = orders.reduce<
                  State['recruits'][number] | undefined
                >(
                  (soonest, r) =>
                    !soonest || r.remaining < soonest.remaining ? r : soonest,
                  undefined,
                );
                const duration =
                  next?.duration ??
                  (next?.source !== undefined
                    ? 12
                    : kind === 'minotaur'
                      ? 15
                      : 6);
                const progress = next
                  ? Math.max(
                      0,
                      Math.min(100, (1 - next.remaining / duration) * 100),
                    )
                  : 0;
                return (
                  <div className="recruit-option" key={kind}>
                    <button
                      className={`build-card recruit-card ${reason ? 'locked' : ''}`}
                      onClick={() => chooseRecruit(kind)}
                      title={reason || `Recruter : ${c.name}`}
                      aria-label={`Recruter ${c.name}${reason ? `. ${reason}` : ''}`}
                    >
                      {compact && <PanelSkin kind="paper" />}
                      <CreaturePortrait kind={kind} />
                      <div>
                        <strong>{c.name}</strong>
                        <small
                          className={reason ? 'recruit-blocker' : undefined}
                        >
                          {reason ||
                            (kind === 'goblin'
                              ? `${c.job} · ${workforce.total + workforce.queued}/${GOBLIN_CAP} places réservées`
                              : c.job)}
                        </small>
                        <Costs cost={c.cost} available={s.resources} />
                      </div>
                      <span className="keyhint">{i + 1}</span>
                    </button>
                    {next && (
                      <div className="recruit-progress">
                        <div className="recruit-progress-label">
                          <span>
                            {orders.length > 1
                              ? `${orders.length} en préparation`
                              : next.source !== undefined
                                ? 'Rituel en cours'
                                : 'En préparation'}
                          </span>
                          <span>{Math.ceil(next.remaining)} s</span>
                        </div>
                        <progress
                          max={100}
                          value={progress}
                          aria-label={`Production ${c.name}`}
                          aria-valuetext={`${orders.length} en préparation. ${Math.ceil(next.remaining)} secondes avant la prochaine unité.`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CreationCards>
          </TabsContent>
        </Tabs>
        {!compact && (
          <CommandWheel
            level={manorLevel(s)}
            paused={paused}
            onManor={() => {
              const manor = s.lots.find((lot) => lot.kind === 'hq');
              if (!manor) return;
              setPendingBuild(null);
              select({ type: 'lot', id: manor.id });
              rendererRef.current?.focusLot(manor.id);
            }}
            onArmy={() => {
              const ids = s.units.filter((unit) => unit.hp > 0 && unit.kind !== 'goblin').map((unit) => unit.id);
              if (!ids.length) {
                setFeedback('Recrutez des combattants pour former votre armée.');
                return;
              }
              setPendingBuild(null);
              select(unitSelection(ids));
              setTouchMode('inspect');
            }}
            onBestiary={() => setModal('bestiary')}
            onGuide={() => setModal('guide')}
            onSettings={() => setModal('settings')}
            onPause={() => setPaused((value) => !value)}
          />
        )}
      </footer>

      {compact && (
        <nav className="mobile-nav" aria-label="Navigation du jeu">
          <Button
            className="touch-pack"
            aria-pressed={mobilePanel === null}
            onClick={() => {
              setMobilePanel(null);
              setTouchMode('inspect');
              setPendingBuild(null);
            }}
          >
            <Crosshair size={19} />
            Carte
          </Button>
          <Button
            className="touch-pack"
            aria-pressed={mobilePanel === 'details'}
            onClick={() =>
              setMobilePanel(mobilePanel === 'details' ? null : 'details')
            }
          >
            <Flag size={19} />
            Détails
          </Button>
          <Button
            className="touch-pack"
            aria-pressed={mobilePanel === 'build'}
            onClick={() => {
              setMobilePanel(mobilePanel === 'build' ? null : 'build');
              setTab('build');
            }}
          >
            <Hammer size={19} />
            Bâtir
          </Button>
          <Button
            className="touch-pack"
            aria-pressed={mobilePanel === 'recruit'}
            onClick={() => {
              setMobilePanel(mobilePanel === 'recruit' ? null : 'recruit');
              setTab('recruit');
            }}
          >
            {hint.marker?.kind === 'recruit' && (
              <span className="recruit-tutorial-marker" aria-hidden="true">
                Recruter
              </span>
            )}
            <PackIcon asset="ui-sword" />
            Recruter
          </Button>
        </nav>
      )}

      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="ui-modal" showCloseButton={false}>
          <Button
            className="pack-modal-close"
            aria-label="Fermer"
            onClick={() => setModal(null)}
          >
            <PackIcon asset="ui-close" />
          </Button>
          {modal === 'settings' && (
            <>
              <DialogTitle>Paramètres de partie</DialogTitle>
              <DialogDescription>
                La partie reste en pause pendant que ce menu est ouvert.
              </DialogDescription>
              <div className="game-settings">
                <section
                  className="audio-settings"
                  aria-label="Réglages du son"
                >
                  <div className="audio-heading">
                    <strong>Effets sonores</strong>
                    <Button
                      className="subtle-btn"
                      aria-pressed={!audioSettings.muted}
                      onClick={() => {
                        const next = {
                          ...audioSettings,
                          muted: !audioSettings.muted,
                        };
                        audioRef.current?.configure(next);
                        setAudioSettings(next);
                        if (!next.muted) audioRef.current?.unlock();
                      }}
                    >
                      {audioSettings.muted ? (
                        <VolumeX size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                      {audioSettings.muted ? 'Activer le son' : 'Couper le son'}
                    </Button>
                  </div>
                  <label htmlFor="effects-volume">
                    Volume des effets{' '}
                    <output>{Math.round(audioSettings.volume * 100)} %</output>
                  </label>
                  <input
                    id="effects-volume"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(audioSettings.volume * 100)}
                    onChange={(event) => {
                      const next = {
                        ...audioSettings,
                        volume: Number(event.target.value) / 100,
                      };
                      audioRef.current?.configure(next);
                      setAudioSettings(next);
                      audioRef.current?.unlock();
                    }}
                  />
                  <Button
                    className="subtle-btn"
                    disabled={
                      audioSettings.muted ||
                      audioSettings.volume === 0 ||
                      audioStatus !== 'ready'
                    }
                    onClick={() => audioRef.current?.preview()}
                  >
                    <Volume2 size={16} /> Tester le son
                  </Button>
                  <output className="audio-status">
                    {audioStatus === 'loading'
                      ? 'Chargement des effets…'
                      : audioStatus === 'error'
                        ? 'Les effets sonores ne sont pas disponibles. Le jeu reste jouable sans son.'
                        : 'Récoltes, combats et vie du domaine · TomMusic'}
                  </output>
                </section>
                <p id="game-speed-label">Vitesse de jeu</p>
                <fieldset
                  className="settings-speeds"
                  aria-labelledby="game-speed-label"
                >
                  {[1, 2, 3].map((value) => (
                    <Button
                      key={value}
                      className="subtle-btn"
                      aria-pressed={speed === value}
                      onClick={() => setSpeed(value)}
                    >
                      ×{value}
                    </Button>
                  ))}
                </fieldset>
                <Button
                  className="subtle-btn"
                  aria-pressed={paused}
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? <PackIcon asset="ui-play" /> : <Pause size={16} />}
                  {paused
                    ? 'Reprendre à la fermeture'
                    : 'Garder le jeu en pause'}
                </Button>
                <Button
                  className="subtle-btn"
                  onClick={() => setModal('guide')}
                >
                  <PackIcon asset="ui-info" /> Comment jouer
                </Button>
                <Button
                  className="subtle-btn"
                  onClick={() => setModal('restart')}
                >
                  <PackIcon asset="ui-back" /> Recommencer la partie
                </Button>
              </div>
              <Button className="primary-btn" onClick={() => setModal(null)}>
                <PackIcon asset="ui-back" /> Retour au quartier
              </Button>
            </>
          )}
          {modal === 'guide' && (
            <>
              <DialogTitle>Le guide du mauvais voisin</DialogTitle>
              <DialogDescription>
                Prenez la mairie et la guilde, puis éliminez les ennemis encore
                dans les rues. Protégez votre manoir : sa destruction met fin à
                la partie.
              </DialogDescription>
              <div className="guide-steps">
                <div className="guide-step">
                  <b>01</b>
                  <div>
                    <strong>Installez la cantine</strong>
                    <p>
                      Recrutez votre premier gobelin avec les 35 or de départ.
                      Vos gobelins récoltent l’or, le bois et les vivres, puis
                      les déposent au manoir. Seule l’essence est produite par
                      les bâtiments. Dès que vous avez 80 or et 25 bois,
                      choisissez « Cantine des hordes », puis cliquez sur votre
                      terrain libre, à côté du manoir. Les gobelins construisent
                      automatiquement.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>02</b>
                  <div>
                    <strong>Levez votre première armée</strong>
                    <p>
                      La grotte recrute des gobelins lanciers à pied dès le
                      manoir niveau 1. Rassemblez deux combattants et conquérez
                      une première maison. Améliorez ensuite le manoir au
                      niveau 2 pour débloquer la crypte et la recherche des
                      chevaucheurs de cochons.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>03</b>
                  <div>
                    <strong>Développez les paliers du manoir</strong>
                    <p>
                      Au niveau 2, revendiquez la friche centrale pour 40 or et
                      18 essence. Une cantine terminée permet d’y construire
                      la crypte : squelettes, spectres et alchimistes rejoignent
                      la horde. Au niveau 3 du manoir, une crypte terminée
                      débloque la hutte des trolls : trolls, minotaures et
                      recherches de feu. Les autres bâtiments ne peuvent pas
                      dépasser le niveau du manoir. Leur fiche indique le gain
                      exact de chaque amélioration.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>04</b>
                  <div>
                    <strong>Prenez soin de votre horde</strong>
                    <p>
                      Au calme, les créatures vivantes vont manger à la cantine
                      et se reposent à la tanière. Les morts-vivants se
                      reconstituent à la crypte. Vos ordres et les combats
                      passent avant ces pauses. Les blessés se soignent aussi
                      près du manoir.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>05</b>
                  <div>
                    <strong>Le quartier riposte</strong>
                    <p>
                      La garde se mobilise à 5 parcelles sur 9 (56 %) ou après 7
                      minutes, ou à 60 de suspicion, avec 25 secondes de
                      préavis. La guilde s’éveille à 6 sur 9 (67 %) ou après 6
                      minutes, avec 35 secondes de préavis. Une fois mobilisées,
                      elles continuent jusqu’à la prise de leur bâtiment.
                      Attaquer la guilde fait sortir ses quatre défenseurs : ils
                      traquent les assaillants jusqu’à la mort. Un héros blessé
                      poursuit aussi son agresseur, même s’il fuit. Une garnison
                      vaincue se reforme après 60 secondes si la guilde est
                      encore humaine. Une hantise retarde son retour ; conquérir
                      le bâtiment l’empêche.
                    </p>
                  </div>
                </div>
                <div className="guide-step">
                  <b>06</b>
                  <div>
                    <strong>Défendez et contre-attaquez</strong>
                    <p>
                      Les humains peuvent financer leur premier niveau à 6
                      minutes, puis un niveau toutes les 2 minutes, jusqu’au
                      niveau 6, si leurs paysans livrent assez de ressources.
                      Les gardes reprennent vos parcelles ; les héros visent le
                      manoir. Vos combattants interceptent les ennemis proches.
                      Cliquez sur un ennemi pour l’intercepter, ou rassemblez
                      votre armée devant un bâtiment. Le repli reste
                      prioritaire. Les bâtiments se réparent lentement hors de
                      danger.
                    </p>
                  </div>
                </div>
              </div>
              <div className="guide-step">
                <b>07</b>
                <div>
                  <strong>Coupez leur ravitaillement</strong>
                  <p>
                    Ouvrez « Ravitaillement humain », sélectionnez une mine, une
                    bergerie ou un camp de bûcherons, puis envoyez votre armée
                    saboter le site. Vous pouvez aussi suivre et attaquer le
                    paysan. Les ressources livrées financent les niveaux et les
                    renforts ; un manque de stocks retarde leurs départs.
                  </p>
                </div>
              </div>
              <p className="controls-guide">
                {compact && (
                  <>
                    Sur téléphone : glissez un doigt pour explorer et pincez à
                    deux doigts pour zoomer. Groupe active le rectangle de
                    sélection ; Ordre permet de toucher une destination ou une
                    cible. Carte ferme les volets. Détails, Bâtir et Recruter
                    ouvrent les commandes du bas.
                    <br />
                  </>
                )}
                Spectre : recrutez-le à la crypte, puis clic droit sur un
                bâtiment humain pour le hanter. Le moine le provoque en duel
                dans la rue. Ordonnez un repli pour sauver votre spectre. Crypte
                : les gobelins libres rapportent les dépouilles ; 2 dépouilles
                et 12 essence permettent de relever un squelette. Mairie : une
                bourse de 100 or livrée par un gobelin retarde la garde de 45 s.
                <br />
                Shift + glisser gauche : sélectionner ou compléter un groupe ·
                Shift + clic : ajouter ou retirer une unité · Glisser gauche :
                déplacer la carte · ZQSD ou flèches : déplacer la caméra ·
                Molette : zoom · Espace : pause · 1-5 : bâtiment ou créature · R
                : repli · Échap : désélectionner ou annuler un chantier avant sa
                pose.
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
                <br />
                Effets sonores :{' '}
                <a
                  href="https://tommusic.itch.io/free-fantasy-200-sfx-pack"
                  target="_blank"
                  rel="noreferrer"
                >
                  Free Fantasy SFX Pack, TomMusic
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
                Vos 7 créatures recrutables et les 8 unités humaines : gardes,
                héros et travailleurs.
              </DialogDescription>
              <Tabs
                className="animation-tabs"
                value={bestiaryAction}
                onValueChange={(v) => setBestiaryAction(v as Animation)}
              >
                <TabsList>
                  <TabsTrigger value="idle">Au repos</TabsTrigger>
                  <TabsTrigger value="walk">En marche</TabsTrigger>
                  <TabsTrigger value="attack">Attaque / soin</TabsTrigger>
                </TabsList>
              </Tabs>
              <Bestiary action={bestiaryAction} />
            </>
          )}
          {modal === 'restart' && (
            <>
              <DialogTitle>On recommence les méfaits ?</DialogTitle>
              <DialogDescription>
                Vous retrouverez le quartier intact, sans gobelin ni paysan,
                avec vos ressources de départ. La partie en cours sera
                remplacée.
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
                La mairie et la guilde sont neutralisées. Les rues sont à vous.
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
                Observer le quartier
              </Button>
              <Button className="subtle-btn" onClick={reset}>
                Une nouvelle conquête
              </Button>
            </>
          )}
          {modal === 'defeat' && (
            <>
              <Shield className="victory-seal" strokeWidth={1.2} />
              <DialogTitle>Le quartier vous a résisté.</DialogTitle>
              <DialogDescription>
                Votre manoir a été détruit après {clock(s.elapsed)}. Les humains
                se renforcent avec le temps : coupez leurs renforts en prenant
                la mairie et la guilde, et gardez une armée prête à défendre
                votre domaine.
              </DialogDescription>
              <div className="victory-stats">
                <div>
                  <strong>{s.defeatedEnemies}</strong>
                  <span>Ennemis vaincus</span>
                </div>
                <div>
                  <strong>{owned}/9</strong>
                  <span>Parcelles restantes</span>
                </div>
              </div>
              <Button className="primary-btn" onClick={reset}>
                Retenter la conquête
              </Button>
              <Button className="subtle-btn" onClick={() => setModal(null)}>
                Observer le quartier
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
