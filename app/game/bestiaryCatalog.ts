import {
  CREATURES,
  RECRUIT_OPTIONS,
  HEROES,
  GUILD_ROLES,
  ENEMIES,
  SUPPLIES,
} from './engine.ts';

export const BESTIARY_CREATURES = RECRUIT_OPTIONS.map((kind) => ({
  id: kind,
  ...CREATURES[kind],
}));

/** Every entry is backed by an actor in the simulation. */
export const BESTIARY_HUMANS = [
  {
    id: 'guard',
    name: ENEMIES.guard.name,
    description: ENEMIES.guard.description,
    terrain: 'terrain-1',
    actions: {
      idle: ['guard-idle'],
      walk: ['guard-walk'],
      attack: ['guard-attack'],
    },
  },
  ...GUILD_ROLES.map((role) => ({
    id: `hero-${role}`,
    name: HEROES[role].name,
    description: HEROES[role].description,
    terrain: 'terrain-2',
    actions: {
      idle: [`hero-${role}-idle`],
      walk: [`hero-${role}-walk`],
      attack: [`hero-${role}-attack`],
    },
  })),
  ...(['wood', 'gold', 'food'] as const).map((kind) => ({
    id: `pawn-${kind}`,
    name: SUPPLIES[kind].worker,
    description: `Récolte ${kind === 'wood' ? 'du bois' : kind === 'gold' ? 'de l’or' : 'la viande des moutons'} et livre les stocks qui financent les troupes humaines. Participe aussi au secours des blessés.`,
    terrain: 'terrain-1',
    actions: {
      idle: [`pawn-${kind}-idle`],
      walk: [`pawn-${kind}-walk`],
      attack: [`pawn-${kind}-work`],
    },
  })),
];
