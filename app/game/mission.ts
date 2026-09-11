import {
  adjacent,
  army,
  atEntrance,
  hasBuilding,
  recruitReason,
  type BuildingKind,
  type CreatureKind,
  type Lot,
  type State,
} from './engine.ts';

export type MissionAction =
  | { type: 'recruit'; kind: CreatureKind }
  | { type: 'inspect'; lotId: number; buildKind?: BuildingKind };
export type MissionHint = {
  detail: string;
  button?: string;
  action?: MissionAction;
  reason?: string;
  progress?: number;
  status?: string;
  marker?: {
    lotId: number;
    kind: 'recruit' | 'claim' | 'build' | 'attack';
    label: string;
  };
};

const buildable = (lot: Lot) =>
  ['empty', 'house', 'tavern'].includes(lot.kind) && !lot.construction;
// The starting den also has humanKind=house for enemy recaptures; it is not a conquest.
const property = (lot: Lot) =>
  lot.id !== 3 && ['house', 'tavern'].includes(lot.humanKind);

/** Shared by the objective card and the map so they always point to the same action. */
export function mission(s: State) {
  const forge = hasBuilding(s, 'forge');
  const conquered = s.lots.some((l) => l.owned && property(l));
  const crypt = hasBuilding(s, 'crypt');
  const fighters = army(s);
  const objectives = [
    {
      id: 'goblin',
      label: 'Recruter un premier gobelin',
      done: s.recruited > 0 || s.units.length > 0,
    },
    {
      id: 'canteen',
      label: 'Ouvrir une cantine',
      done: hasBuilding(s, 'canteen') || crypt || forge,
    },
    {
      id: 'claim',
      label: 'Revendiquer la friche centrale',
      done: s.lots[4].owned || crypt || forge,
    },
    { id: 'crypt', label: 'Construire une crypte', done: crypt || forge },
    {
      id: 'army',
      label: 'Rassembler 2 combattants',
      done:
        fighters.length >= 2 ||
        conquered ||
        forge ||
        fighters.some((u) => u.task === 'attack'),
    },
    {
      id: 'capture',
      label: 'Conquérir une propriété avec l’armée',
      done: conquered || forge,
    },
    {
      id: 'forge',
      label: 'Construire une hutte des trolls sur le terrain gagné',
      done: forge,
    },
    {
      id: 'guild',
      label: 'Neutraliser la guilde',
      done: hasBuilding(s, 'guild'),
    },
    {
      id: 'victory',
      label: 'Prendre la mairie et sécuriser les rues',
      done: s.won,
    },
  ];
  if (s.won)
    objectives.forEach((o) => {
      o.done = true;
    });
  const current = s.lost ? undefined : objectives.find((o) => !o.done);
  let hint: MissionHint = {
    detail: s.lost ? 'Votre manoir est tombé.' : 'Le quartier est à vous.',
  };

  const recruitHint = (kind: 'goblin' | 'skeleton'): MissionHint => {
    const queued = s.recruits.filter((r) => r.kind === kind);
    const next = queued.reduce<State['recruits'][number] | undefined>(
      (a, b) => (!a || b.remaining < a.remaining ? b : a),
      undefined,
    );
    const enoughQueued =
      kind === 'goblin'
        ? queued.length > 0
        : fighters.length + queued.length >= 2;
    return {
      detail:
        kind === 'goblin'
          ? 'Les gobelins récoltent et construisent. Recrutez le premier au manoir.'
          : 'La crypte débloque les squelettes. Deux combattants suffisent pour votre première maison.',
      button: enoughQueued
        ? kind === 'goblin'
          ? 'Premier gobelin en préparation…'
          : 'Recrutement en cours…'
        : kind === 'goblin'
          ? 'Recruter mon premier gobelin'
          : 'Recruter un squelette',
      action: { type: 'recruit', kind },
      reason: enoughQueued
        ? 'Vos créatures rejoignent le domaine.'
        : recruitReason(s, kind),
      progress: next
        ? 1 -
          next.remaining /
            (next.duration ?? (next.source !== undefined ? 12 : 6))
        : undefined,
      status: next ? `Arrivée dans ${Math.ceil(next.remaining)} s` : undefined,
      marker: enoughQueued
        ? undefined
        : { lotId: 6, kind: 'recruit', label: 'Recruter' },
    };
  };
  const constructionHint = (
    kind: 'canteen' | 'crypt' | 'forge',
  ): MissionHint => {
    const work = s.lots.find((l) => l.owned && l.construction?.kind === kind);
    const lot =
      work ??
      s.lots.find(
        (l) => l.owned && buildable(l) && (kind !== 'forge' || property(l)),
      ) ??
      s.lots.find((l) => l.owned && buildable(l));
    if (!lot)
      return {
        detail:
          'Conquérez une maison voisine avec votre armée pour libérer un emplacement.',
      };
    const name =
      kind === 'canteen'
        ? 'la cantine'
        : kind === 'crypt'
          ? 'la crypte'
          : 'la hutte des trolls';
    return {
      detail: work
        ? 'Vos gobelins construisent sur place. Le bâtiment sera disponible à la fin des travaux.'
        : kind === 'forge'
          ? 'Le terrain gagné peut maintenant accueillir la hutte des trolls. Préparez-la, puis lancez le chantier ici.'
          : kind === 'crypt'
            ? 'Sur la friche revendiquée, la crypte permettra de recruter vos premiers combattants.'
            : 'Installez la cantine sur votre terrain libre, près du manoir.',
      button: work ? 'Voir le chantier' : `Préparer ${name}`,
      action: {
        type: 'inspect',
        lotId: lot.id,
        buildKind: work ? undefined : kind,
      },
      progress: work?.construction?.progress,
      status: work
        ? `Construction · ${Math.floor(work.construction!.progress * 100)} %`
        : undefined,
      marker: work
        ? undefined
        : { lotId: lot.id, kind: 'build', label: 'Construire ici' },
    };
  };
  if (current?.id === 'goblin') hint = recruitHint('goblin');
  else if (current?.id === 'army') hint = recruitHint('skeleton');
  else if (
    current?.id === 'canteen' ||
    current?.id === 'crypt' ||
    current?.id === 'forge'
  )
    hint = constructionHint(current.id);
  else if (current?.id === 'claim')
    hint = {
      detail:
        'La friche au centre se revendique avec de l’or et de l’essence. Vous pourrez y bâtir la crypte.',
      button: 'Voir la friche',
      action: { type: 'inspect', lotId: 4 },
      marker: { lotId: 4, kind: 'claim', label: 'Revendiquer' },
    };
  else if (
    current?.id === 'capture' ||
    current?.id === 'guild' ||
    current?.id === 'victory'
  ) {
    // Prefer an assault already ordered, then the least defended adjacent property.
    const targets = s.lots.filter(
      (l) => !l.owned && l.kind !== 'empty' && adjacent(s, l),
    );
    const ordered = targets.find((l) =>
      fighters.some((u) => u.task === 'attack' && u.target === l.id),
    );
    const target =
      ordered ??
      (current.id === 'capture'
        ? targets.filter(property).sort((a, b) => a.hp - b.hp || a.id - b.id)[0]
        : targets.find(
            (l) => l.kind === (current.id === 'guild' ? 'guild' : 'hall'),
          )) ??
      targets.sort((a, b) => a.hp - b.hp || a.id - b.id)[0];
    if (target) {
      const marching = fighters.some(
        (u) => u.task === 'attack' && u.target === target.id,
      );
      const besieging = fighters.some(
        (u) =>
          u.task === 'attack' &&
          u.target === target.id &&
          atEntrance(u, target),
      );
      hint = {
        detail: marching
          ? `Votre armée ${besieging ? 'réduit les défenses' : 'rejoint la cible'}. Le bâtiment sera à vous quand sa résistance atteindra zéro.`
          : current.id === 'capture'
            ? 'Envoyez vos combattants conquérir la propriété indiquée. Une fois à vous, elle pourra accueillir la hutte des trolls.'
            : 'Conquérez ce bâtiment avec votre armée pour couper les renforts humains.',
        button: marching ? 'Voir l’assaut' : 'Voir la cible',
        action: { type: 'inspect', lotId: target.id },
        progress: marching
          ? Math.max(0, 1 - target.hp / target.maxHp)
          : undefined,
        status: marching
          ? besieging
            ? `Conquête · ${Math.floor((1 - target.hp / target.maxHp) * 100)} %`
            : 'Armée en route'
          : undefined,
        marker: {
          lotId: target.id,
          kind: 'attack',
          label: marching
            ? besieging
              ? 'Conquête en cours'
              : 'Armée en route'
            : 'Conquérir',
        },
      };
    } else
      hint = {
        detail:
          'Éliminez les derniers ennemis dans les rues et protégez votre manoir.',
      };
  }
  return { objectives, current, hint };
}
