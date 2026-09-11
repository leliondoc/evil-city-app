import { useState } from 'react';
import { ArrowLeft, Shield, Swords } from 'lucide-react';
import { enemyAnimationSequence, type Animation } from './art';
import {
  GUILD_ROLES,
  GUILD_RECOVERY_SECONDS,
  HEROES,
  heroParty,
  humanLevel,
  sourceBuilding,
  type Selection,
  type State,
} from './engine';
import { GameButton as Button } from './PackUI';
import { Sprite } from './Sprite';
import { AbilityCard } from './AbilityCard';
import { isHaunted } from './domain';
import { CombatDetails } from './CombatDetails';
import { HUMAN_COMBAT } from './combat';

type Props = { state: State; onSelect: (selection: Selection) => void };

export function GuildRoster({ state, onSelect }: Props) {
  const guild = sourceBuilding(state, 'hero');
  const level = humanLevel(state);
  const returning = guild?.garrisonReturnsAt;
  const defenders = state.enemies.filter(
    (e) => e.hp > 0 && e.garrisonLotId === guild?.id,
  ).length;
  return (
    <div className="guild-roster">
      <h4>Les Lames de l’Aube</h4>
      {guild && !guild.owned && guild.hp > 0 && (
        <AbilityCard
          title="Garnison de la guilde"
          icon="ui-shield"
          badge={
            returning !== undefined
              ? `${Math.max(0, Math.ceil(returning - state.elapsed))} s`
              : guild.garrisonReleased
                ? `${defenders}/4`
                : '4/4'
          }
        >
          <p>
            {returning !== undefined
              ? isHaunted(state, guild)
                ? 'Le retour des héros est bloqué tant que la guilde est hantée.'
                : 'De nouveaux héros arrivent. Conquérez la guilde avant leur retour.'
              : guild.garrisonReleased
                ? 'Les défenseurs sont sortis combattre. Leur remplacement commence après la mort du dernier.'
                : `Quatre défenseurs prêts. La garnison se reforme ${GUILD_RECOVERY_SECONDS} s après sa défaite.`}
          </p>
        </AbilityCard>
      )}
      <div className="guild-members">
        {GUILD_ROLES.map((role, id) => (
          <button
            key={role}
            onClick={() => onSelect({ type: 'guildHero', id })}
            aria-label={`Voir la fiche : ${HEROES[role].name}`}
          >
            <Sprite
              asset={enemyAnimationSequence({ kind: 'hero', role }, 'idle')[0]}
              figure
            />
            <span>{HEROES[role].short}</span>
          </button>
        ))}
      </div>
      <p className="reason">
        {guild?.owned
          ? 'Guilde conquise : la garnison ne revient plus et les nouvelles expéditions sont interrompues.'
          : `Expédition au niveau ${level} : ${heroParty(level)
              .map((role) => HEROES[role].short)
              .join(', ')}.`}
      </p>
      {!guild?.owned && (
        <p className="reason">
          Les livraisons permettent aux humains de monter en niveau et d’envoyer
          davantage de classes.
        </p>
      )}
    </div>
  );
}

export function GuildHeroSelection({
  state,
  id,
  onSelect,
}: Props & { id: number }) {
  const [action, setAction] = useState<Animation>('idle');
  const role = GUILD_ROLES[id] ?? 'warrior';
  const hero = HEROES[role];
  const guild = sourceBuilding(state, 'hero');
  return (
    <section
      className="selection-panel"
      aria-label="Fiche de classe de la guilde"
    >
      <p className="eyebrow">Les Lames de l’Aube · Classe de héros</p>
      <h3 className="selection-name">{hero.name}</h3>
      <div className="selection-art">
        <Sprite
          asset={enemyAnimationSequence({ kind: 'hero', role }, action)[0]}
          figure
          label={hero.name}
        />
      </div>
      <div className="guild-actions" aria-label="Animations du héros">
        {(['idle', 'walk', 'attack'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={action === value}
            onClick={() => setAction(value)}
          >
            {value === 'idle'
              ? 'Repos'
              : value === 'walk'
                ? 'Marche'
                : role === 'monk'
                  ? 'Soin'
                  : 'Attaque'}
          </button>
        ))}
      </div>
      <p className="selection-text">{hero.description}</p>
      <CombatDetails profile={HUMAN_COMBAT[role]} />
      <p className="reason">Caractéristiques en expédition · Niveau 1</p>
      <div className="selection-stats">
        <span>
          <Shield size={14} /> {hero.hp} PV
        </span>
        <span>
          <Swords size={14} />{' '}
          {role === 'monk' ? '7 soins/s' : `${hero.damage} dégâts/s`}
        </span>
      </div>
      <p className="reason">
        Portée : {hero.range} cases. La puissance augmente avec le niveau
        humain.
      </p>
      <p className="reason">
        {guild?.owned
          ? 'La guilde est sous votre contrôle. Les héros déjà partis restent une menace.'
          : 'Pour neutraliser la garnison et couper les prochains raids, conquérez la guilde.'}
      </p>
      <Button
        className="subtle-btn"
        onClick={() => guild && onSelect({ type: 'lot', id: guild.id })}
      >
        <ArrowLeft size={14} /> Revenir à la guilde
      </Button>
    </section>
  );
}
