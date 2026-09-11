import type { CreatureKind, Enemy, HeroRole } from './engine.ts';

/** Matchup bonuses affect direct attacks; fire keeps its own solvent multiplier. */
export const COMBAT = {
  spearVsGuard: 1.35,
  riderVsSupport: 1.5,
  trollVsKnight: 1.6,
  knightVsLight: 1.35,
  lancerVsMounted: 1.5,
  lancerVsLarge: 1.4,
  archerVsAlchemist: 1.3,
  minotaurVsBuilding: 1.75,
  sweepFraction: 0.4,
  sweepTargets: 2,
  sweepRadius: 1.8,
  sweepReach: 2.6,
  solvent: 2,
  solventVsFrontline: 2.5,
} as const;

type Opponent = Pick<Enemy, 'kind' | 'role'>;
export function creatureMultiplier(
  kind: CreatureKind,
  mounted: boolean,
  enemy: Opponent,
) {
  if (kind === 'spear-goblin') {
    if (enemy.kind === 'guard') return COMBAT.spearVsGuard;
    if (mounted && (enemy.role === 'archer' || enemy.role === 'monk'))
      return COMBAT.riderVsSupport;
  }
  if (kind === 'troll' && enemy.kind === 'hero' && enemy.role === 'warrior')
    return COMBAT.trollVsKnight;
  return 1;
}

export function humanMultiplier(
  enemy: Opponent,
  kind: CreatureKind,
  mounted: boolean,
) {
  if (enemy.kind !== 'hero') return 1;
  if (
    enemy.role === 'warrior' &&
    (kind === 'skeleton' || (kind === 'spear-goblin' && !mounted))
  )
    return COMBAT.knightVsLight;
  if (enemy.role === 'lancer') {
    if (mounted) return COMBAT.lancerVsMounted;
    if (kind === 'troll' || kind === 'minotaur') return COMBAT.lancerVsLarge;
  }
  if (enemy.role === 'archer' && kind === 'alchemist')
    return COMBAT.archerVsAlchemist;
  return 1;
}

export function fireMultiplier(
  enemy: Opponent & Pick<Enemy, 'solventUntil'>,
  elapsed: number,
) {
  if ((enemy.solventUntil ?? 0) <= elapsed) return 1;
  return enemy.kind === 'hero' &&
    (enemy.role === 'warrior' || enemy.role === 'lancer')
    ? COMBAT.solventVsFrontline
    : COMBAT.solvent;
}

export type CombatProfile = {
  strength: string;
  weakness: string;
  effect: string;
};
const bonus = (n: number) => `+${Math.round((n - 1) * 100)} %`;
export function creatureCombatProfile(
  kind: CreatureKind,
  mounted = false,
): CombatProfile {
  switch (kind) {
    case 'goblin':
      return {
        strength: 'Construction et récolte',
        weakness: 'Tous les soldats',
        effect:
          'Ne combat qu’après la recherche Armes enflammées. À protéger derrière les combattants.',
      };
    case 'spear-goblin':
      return {
        strength: mounted
          ? 'Gardes, Archères et Moines isolés'
          : 'Gardes du quartier',
        weakness: mounted ? 'Lanciers de l’Aube' : 'Chevaliers de l’Aube',
        effect: `${bonus(COMBAT.spearVsGuard)} de dégâts contre les gardes. ${
          mounted
            ? `Vitesse +50 % ; ${bonus(COMBAT.riderVsSupport)} de dégâts contre les archères et moines.`
            : 'La recherche Chevaucheurs de cochons lui donne vitesse et bonus contre les soutiens.'
        }`,
      };
    case 'skeleton':
      return {
        strength: 'Gardes, grâce au nombre',
        weakness: 'Moines et Chevaliers de l’Aube',
        effect:
          'Aucune consommation de nourriture. Soldat économique, sans bonus de dégâts contre les gardes.',
      };
    case 'troll':
      return {
        strength: 'Chevaliers de l’Aube',
        weakness: 'Lanciers soutenus par des Archères',
        effect: `${bonus(COMBAT.trollVsKnight)} de dégâts contre les chevaliers. Sa lenteur l’expose aux tirs.`,
      };
    case 'minotaur':
      return {
        strength: 'Bâtiments et Gardes regroupés',
        weakness: 'Lanciers soutenus par des Archères',
        effect: `${bonus(COMBAT.minotaurVsBuilding)} de dégâts aux bâtiments. Chaque attaque balaie jusqu’à ${COMBAT.sweepTargets} gardes supplémentaires proches à ${COMBAT.sweepFraction * 100} % des dégâts directs. Occupe 3 places.`,
      };
    case 'alchemist':
      return {
        strength: 'Chevaliers et Lanciers, avec le feu allié',
        weakness: 'Archères de l’Aube',
        effect: `Après recherche, le solvant dure 8 s : feu ×${COMBAT.solventVsFrontline.toLocaleString('fr')} sur chevaliers et lanciers, ×${COMBAT.solvent} sur les autres. Portée 4 cases.`,
      };
    case 'specter':
      return {
        strength: 'Livraisons et renforts humains',
        weakness: 'Moines de l’Aube',
        effect:
          'Hante un bâtiment pendant 30 s. Saboteur sans attaque ordinaire ; ne conquiert pas les bâtiments.',
      };
  }
}

export const HUMAN_COMBAT: Record<HeroRole | 'guard', CombatProfile> = {
  guard: {
    strength: 'Ouvriers isolés et reprise des propriétés',
    weakness: 'Gobelins lanciers, Squelettes en nombre et Minotaures',
    effect:
      'À 20 % de PV : bouclier pendant 6 s, −25 % de dégâts reçus, sans attaquer ni se déplacer. Aucune provocation. Réactivation après 30 s.',
  },
  warrior: {
    strength: 'Squelettes et Gobelins lanciers à pied',
    weakness: 'Trolls ; Alchimistes soutenus par le feu',
    effect: `${bonus(COMBAT.knightVsLight)} contre les squelettes et lanciers à pied. Bouclier 10 s à 30 % de PV : −40 % de dégâts reçus, immobile, sans attaquer. Protège aussi un soldat proche à 30 % de PV : attire ses assaillants pendant 10 s. Portée 4 cases ; réactivation après 30 s.`,
  },
  lancer: {
    strength: 'Gobelins sur cochon, Trolls et Minotaures',
    weakness: 'Squelettes en nombre ; Alchimistes soutenus par le feu',
    effect: `${bonus(COMBAT.lancerVsMounted)} de dégâts contre les montures ; ${bonus(COMBAT.lancerVsLarge)} contre les trolls et minotaures. Portée 2,3 cases, moins de PV que le chevalier.`,
  },
  archer: {
    strength: 'Alchimistes et combattants lents à distance',
    weakness: 'Gobelins sur cochon',
    effect: `${bonus(COMBAT.archerVsAlchemist)} de dégâts contre les alchimistes. Portée 5,5 cases ; les bâtiments bloquent les tirs.`,
  },
  monk: {
    strength: 'Squelettes et Spectres',
    weakness: 'Gobelins sur cochon',
    effect:
      'Dégâts sacrés ×2 contre les morts-vivants. Soigne ses alliés quand il ne combat pas ; ne blesse pas les bâtiments.',
  },
};
