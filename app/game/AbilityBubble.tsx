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
          const ceiling = window.innerHeight - edge;
          const obstacles = [
            ...document.querySelectorAll(
              '.sidebar, .bottom-bar, .mobile-nav, .mobile-mission, .mobile-command-dock, .touch-toolbar, .map-controls, .game-notifications',
            ),
          ]
            .map((node) => node.getBoundingClientRect())
            .filter((rect) => rect.width && rect.height);
          const width = el.getBoundingClientRect().width;
          const clampX = (x: number) =>
            Math.max(edge, Math.min(x, window.innerWidth - width - edge));
          const preferred = clampX(anchor.right + 12);
          const candidates = [
            preferred,
            clampX(anchor.left - width - 12),
            ...obstacles.flatMap((rect) => [
              clampX(rect.right + 8),
              clampX(rect.left - width - 8),
            ]),
          ];
          const spaces = candidates.flatMap((left) => {
            let slots = [{ top: floor, bottom: ceiling }];
            for (const rect of obstacles) {
              if (rect.right + 8 <= left || rect.left - 8 >= left + width)
                continue;
              slots = slots
                .flatMap((slot) =>
                  rect.bottom + 8 <= slot.top || rect.top - 8 >= slot.bottom
                    ? [slot]
                    : [
                        {
                          top: slot.top,
                          bottom: Math.min(slot.bottom, rect.top - 8),
                        },
                        {
                          top: Math.max(slot.top, rect.bottom + 8),
                          bottom: slot.bottom,
                        },
                      ],
                )
                .filter((slot) => slot.bottom - slot.top >= 112);
            }
            return slots.map((slot) => ({ ...slot, left }));
          });
          const space = spaces.sort((a, b) => {
            const score = (slot: typeof a) =>
              Math.abs(slot.left - preferred) +
              Math.abs(
                Math.max(slot.top, Math.min(anchor.top, slot.bottom - 240)) -
                  anchor.top,
              ) +
              Math.max(0, 280 - (slot.bottom - slot.top)) * 3;
            return score(a) - score(b);
          })[0];
          if (!space) {
            el.style.visibility = 'hidden';
            frame = requestAnimationFrame(position);
            return;
          }
          el.style.maxHeight = `${Math.min(360, space.bottom - space.top)}px`;
          el.style.setProperty('--bubble-max-height', el.style.maxHeight);
          const box = el.getBoundingClientRect();
          const left = space.left;
          const side = left >= anchor.x ? 'right' : 'left';
          const top = Math.max(
            space.top,
            Math.min(anchor.top, space.bottom - box.height),
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
