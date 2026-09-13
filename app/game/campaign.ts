import type { BuildingKind, CreatureKind, Resources, State } from './engine.ts';

export type CampaignMapId = 'refuge' | 'faubourg' | 'remparts' | 'tilleuls';
type ObjectiveId =
  | 'goblin'
  | 'canteen'
  | 'rally'
  | 'capture'
  | 'manor2'
  | 'crypt-army'
  | 'manor3'
  | 'forge'
  | 'troll'
  | 'guild'
  | 'victory';
export type CampaignProgress = {
  mapId: CampaignMapId;
  completed: ObjectiveId[];
  creatures: CreatureKind[];
  buildings: BuildingKind[];
};
type CampaignMap = {
  id: CampaignMapId;
  chapter: number;
  name: string;
  subtitle: string;
  briefing: string;
  success: string;
  next?: CampaignMapId;
  lots: BuildingKind[];
  owned: number[];
  manor: number;
  fortification: number;
  resources: Resources;
  units: CreatureKind[];
  objectives: { id: ObjectiveId; label: string }[];
  ground?: 'terrain-1' | 'terrain-3' | 'terrain-4';
};

/** Each scenario owns its settlement layout, starting army, economy and victory rules.
 * The street grid is shared so every gate and supply path remains navigable. */
export const CAMPAIGN_MAPS: Record<CampaignMapId, CampaignMap> = {
  refuge: {
    id: 'refuge',
    chapter: 1,
    name: 'Le Refuge',
    subtitle: 'Prendre ses marques',
    briefing:
      'Ce domaine abandonné est à l’écart des humains. Installez-vous tranquillement : aucune attaque ici. Vos gobelins récoltent seuls entre deux chantiers.',
    success:
      'Votre domaine nourrit ses premières troupes. Vous savez construire et rassembler votre armée ; le faubourg vous attend.',
    next: 'faubourg',
    lots: [
      'empty',
      'empty',
      'empty',
      'den',
      'empty',
      'empty',
      'hq',
      'empty',
      'empty',
    ],
    owned: [3, 6, 7],
    manor: 1,
    fortification: 1,
    resources: { gold: 280, wood: 45, food: 100, mana: 0 },
    units: [],
    ground: 'terrain-4',
    objectives: [
      { id: 'goblin', label: 'Recruter un gobelin bâtisseur' },
      { id: 'canteen', label: 'Construire une cantine' },
      { id: 'rally', label: 'Rassembler deux lanciers au drapeau' },
    ],
  },
  faubourg: {
    id: 'faubourg',
    chapter: 2,
    name: 'Le Faubourg',
    subtitle: 'Gagner du terrain',
    briefing:
      'Votre camp est établi aux portes d’un bourg humain. Ses habitants défendent leurs maisons, mais la garde reste sur place pendant cet entraînement. Prenez la maison au sud-est, puis la mairie à l’est.',
    success:
      'Le faubourg est conquis. Les squelettes renforcent votre armée sans consommer de vivres. Aux Remparts, la garde et la guilde réagiront à votre expansion.',
    next: 'remparts',
    lots: [
      'empty',
      'tavern',
      'house',
      'den',
      'empty',
      'hall',
      'hq',
      'canteen',
      'house',
    ],
    owned: [3, 6, 7],
    manor: 1,
    fortification: 0.5,
    resources: { gold: 240, wood: 100, food: 100, mana: 35 },
    units: ['goblin', 'goblin', 'spear-goblin', 'spear-goblin', 'spear-goblin'],
    ground: 'terrain-1',
    objectives: [
      { id: 'capture', label: 'Conquérir une première maison' },
      { id: 'manor2', label: 'Améliorer le manoir au niveau 2' },
      { id: 'crypt-army', label: 'Bâtir une crypte et recruter un squelette' },
      { id: 'victory', label: 'Conquérir la mairie du faubourg' },
    ],
  },
  remparts: {
    id: 'remparts',
    chapter: 3,
    name: 'Les Remparts',
    subtitle: 'Choisir sa stratégie',
    briefing:
      'Votre camp dispose déjà d’une cantine, d’une crypte et d’une petite armée. Apprenez à choisir vos spécialistes et vos recherches, puis affrontez la garde et la guilde avant de prendre la mairie.',
    success:
      'Les Remparts sont conquis. Vous connaissez les principales mécaniques. Les Tilleuls vous attendent avec les règles et la difficulté de la partie classique.',
    next: 'tilleuls',
    lots: [
      'guild',
      'tavern',
      'hall',
      'den',
      'crypt',
      'house',
      'hq',
      'canteen',
      'house',
    ],
    owned: [3, 4, 6, 7],
    manor: 2,
    fortification: 1,
    resources: { gold: 420, wood: 180, food: 160, mana: 70 },
    units: [
      'goblin',
      'goblin',
      'goblin',
      'spear-goblin',
      'spear-goblin',
      'skeleton',
      'skeleton',
    ],
    ground: 'terrain-3',
    objectives: [
      { id: 'manor3', label: 'Améliorer le manoir au niveau 3' },
      {
        id: 'forge',
        label: 'Conquérir un terrain et bâtir la hutte des trolls',
      },
      { id: 'troll', label: 'Recruter un troll pour renforcer l’armée' },
      { id: 'guild', label: 'Neutraliser la guilde des héros' },
      { id: 'victory', label: 'Prendre la mairie et sécuriser les rues' },
    ],
  },
  tilleuls: {
    id: 'tilleuls',
    chapter: 4,
    name: 'Les Tilleuls',
    subtitle: 'La partie classique',
    briefing:
      'Le quartier d’origine, avec ses règles et sa difficulté : un manoir niveau 1, 35 or, 24 vivres et aucune troupe. Développez votre domaine, affrontez la garde et la guilde, puis conquérez le quartier à votre façon.',
    success:
      'La mairie et la guilde sont neutralisées, et les rues sont à vous.',
    lots: [
      'guild',
      'tavern',
      'hall',
      'den',
      'empty',
      'house',
      'hq',
      'empty',
      'house',
    ],
    owned: [3, 6, 7],
    manor: 1,
    fortification: 1,
    resources: { gold: 35, wood: 0, food: 24, mana: 0 },
    units: [],
    objectives: [
      {
        id: 'victory',
        label: 'Conquérir la mairie et la guilde, puis sécuriser les rues',
      },
    ],
  },
};

export const RALLY_POINT = { x: 16, y: 30.5 };
export const campaignMap = (s: State) =>
  s.campaign ? CAMPAIGN_MAPS[s.campaign.mapId] : undefined;
export const classicCampaign = (s: State) =>
  !s.campaign || s.campaign.mapId === 'tilleuls';
export const advancedCampaign = (s: State) =>
  classicCampaign(s) || s.campaign?.mapId === 'remparts';
const built = (s: State, kind: BuildingKind) =>
  s.lots.some((l) => l.owned && l.hp > 0 && !l.construction && l.kind === kind);
const manor = (s: State) =>
  s.lots.find((l) => l.owned && l.kind === 'hq')?.level ?? 0;

export function campaignObjectives(s: State) {
  const map = campaignMap(s);
  if (!map || classicCampaign(s)) return [];
  const checks: Record<ObjectiveId, boolean> = {
    goblin: s.units.some((u) => u.kind === 'goblin' && u.hp > 0),
    canteen: built(s, 'canteen'),
    rally:
      s.units.filter(
        (u) =>
          u.kind === 'spear-goblin' &&
          u.hp > 0 &&
          u.holdPosition &&
          !u.path.length &&
          Math.hypot(u.x - RALLY_POINT.x, u.y - RALLY_POINT.y) < 3,
      ).length >= 2,
    capture: s.lots.some(
      (l) =>
        l.owned &&
        !map.owned.includes(l.id) &&
        ['house', 'tavern'].includes(l.humanKind),
    ),
    manor2: manor(s) >= 2,
    'crypt-army':
      built(s, 'crypt') &&
      s.units.some((u) => u.kind === 'skeleton' && u.hp > 0),
    manor3: manor(s) >= 3,
    forge: built(s, 'forge'),
    troll: s.units.some((u) => u.kind === 'troll' && u.hp > 0),
    guild: built(s, 'guild'),
    victory:
      built(s, 'hall') &&
      (map.id !== 'remparts' || built(s, 'guild')) &&
      !s.enemies.length &&
      !s.projectiles.length,
  };
  return map.objectives.map((o) => ({
    ...o,
    done:
      checks[o.id] ||
      (o.id !== 'victory' && !!s.campaign?.completed.includes(o.id)),
  }));
}

/** Milestones and discoveries survive casualties, rebuilding and temporary loss of a building. */
export function advanceCampaign(s: State) {
  const c = s.campaign;
  if (!c || s.lost || classicCampaign(s)) return;
  for (const o of campaignObjectives(s))
    if (o.done && !c.completed.includes(o.id)) c.completed.push(o.id);
  const creature = (kind: CreatureKind, condition = true) => {
    if (condition && !c.creatures.includes(kind)) c.creatures.push(kind);
  };
  const building = (kind: BuildingKind, condition = true) => {
    if (condition && !c.buildings.includes(kind)) c.buildings.push(kind);
  };
  creature('goblin');
  building('canteen', c.completed.includes('goblin') || c.mapId !== 'refuge');
  building('den', built(s, 'canteen'));
  creature('spear-goblin', built(s, 'canteen'));
  if (c.mapId !== 'refuge') {
    building('crypt', manor(s) >= 2);
    creature('skeleton', built(s, 'crypt'));
  }
  if (c.mapId === 'remparts') {
    creature('specter', manor(s) >= 3);
    building('forge', manor(s) >= 3);
    creature('troll', built(s, 'forge'));
    creature('alchemist', built(s, 'forge'));
    building('sanctum', c.completed.includes('troll'));
    creature('imp', built(s, 'sanctum'));
  }
}

export const campaignCreatureReason = (s: State, kind: CreatureKind) =>
  classicCampaign(s) || s.campaign?.creatures.includes(kind)
    ? ''
    : 'Cette créature se découvre à une prochaine étape de la campagne.';
export const campaignBuildingReason = (s: State, kind: BuildingKind) =>
  classicCampaign(s) || s.campaign?.buildings.includes(kind)
    ? ''
    : 'Ce bâtiment se découvre à une prochaine étape de la campagne.';

export function campaignUpgradeReason(s: State, level: number) {
  const map = campaignMap(s);
  return map && !classicCampaign(s) && level > map.chapter
    ? `Le niveau ${level} du manoir se découvre dans le chapitre ${level}.`
    : '';
}
