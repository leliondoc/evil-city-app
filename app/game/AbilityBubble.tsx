import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DomainPanel } from './DomainPanel';
import { PackIcon } from './PackUI';
import type { Lot, Selection, State, Unit } from './engine';
import type { Renderer } from './renderer';
import './ability-bubble.css';

export function AbilityBubble({
  state,
  lot,
  unit,
  selection,
  renderer,
  onAction,
}: {
  state: State;
  lot?: Lot;
  unit?: Unit;
  selection: Selection;
  renderer: { current: Renderer | null };
  onAction: (action: (s: State) => string | void) => unknown;
}) {
  const ref = useRef<HTMLElement>(null);
  const [choice, setChoice] = useState<{
    selection: Selection;
    ability: 'haunt' | 'bribe';
  } | null>(null);
  const multiple = lot?.kind === 'hall' && !lot.owned;
  const ability = choice?.selection === selection ? choice.ability : 'haunt';
  const [closedSelection, setClosedSelection] = useState<Selection | null>(
    null,
  );
  const dismissed = closedSelection === selection;
  const available = !!(
    (lot &&
      ((!lot.owned && lot.kind !== 'empty') ||
        (lot.owned && lot.kind === 'crypt'))) ||
    unit?.kind === 'specter' ||
    unit?.kind === 'alchemist'
  );
  useEffect(() => {
    if (!available || dismissed) return;
    let frame = 0;
    const position = () => {
      const el = ref.current,
        anchor = renderer.current?.abilityAnchor(selection);
      if (el) {
        el.style.visibility = anchor ? 'visible' : 'hidden';
        if (anchor) {
          const edge = 12;
          const header = document
            .querySelector('.topbar')
            ?.getBoundingClientRect();
          const floor = Math.max(edge, (header?.bottom ?? 0) + 8);
          const navigation = document
            .querySelector('.mobile-nav')
            ?.getBoundingClientRect();
          const ceiling = Math.min(
            window.innerHeight - edge,
            navigation?.height ? navigation.top - 8 : Infinity,
          );
          el.style.maxHeight = `${Math.max(100, Math.min(360, ceiling - floor))}px`;
          el.style.setProperty('--bubble-max-height', el.style.maxHeight);
          const box = el.getBoundingClientRect();
          const rightFits =
            anchor.right + 12 + box.width <= window.innerWidth - edge;
          const leftFits = anchor.left - 12 - box.width >= edge;
          const side = rightFits || !leftFits ? 'right' : 'left';
          const left = Math.max(
            edge,
            Math.min(
              side === 'right'
                ? anchor.right + 12
                : anchor.left - box.width - 12,
              window.innerWidth - box.width - edge,
            ),
          );
          const top = Math.max(
            floor,
            Math.min(anchor.top, ceiling - box.height),
          );
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          el.style.setProperty(
            '--bubble-tip',
            `${Math.max(22, Math.min(box.height - 22, (anchor.top + anchor.bottom) / 2 - top))}px`,
          );
          el.dataset.side = side;
        }
      }
      frame = requestAnimationFrame(position);
    };
    frame = requestAnimationFrame(position);
    return () => cancelAnimationFrame(frame);
  }, [available, dismissed, selection, renderer]);
  if (!available || dismissed) return null;
  return createPortal(
    <section
      ref={ref}
      className="ability-bubble"
      aria-label="Capacités de la sélection"
    >
      <div className="ability-bubble-bar">
        {multiple ? (
          <div
            className="ability-bubble-choices"
            aria-label="Choisir une capacité"
          >
            <button
              type="button"
              aria-pressed={ability === 'haunt'}
              onClick={() => setChoice({ selection, ability: 'haunt' })}
            >
              Hantise
            </button>
            <button
              type="button"
              aria-pressed={ability === 'bribe'}
              onClick={() => setChoice({ selection, ability: 'bribe' })}
            >
              Pot-de-vin
            </button>
          </div>
        ) : (
          <span>Capacité</span>
        )}
      </div>
      <button
        type="button"
        className="ability-bubble-close"
        aria-label="Fermer les capacités"
        onClick={() => setClosedSelection(selection)}
      >
        <PackIcon asset="ui-close" />
      </button>
      <div className="ability-bubble-content">
        <DomainPanel
          state={state}
          lot={lot}
          unit={unit}
          onAction={onAction}
          mode="bubble"
          ability={multiple ? ability : undefined}
        />
      </div>
    </section>,
    document.body,
  );
}
