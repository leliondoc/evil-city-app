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
  const [closedSelection, setClosedSelection] = useState<Selection | null>(
    null,
  );
  const dismissed = closedSelection === selection;
  const available = !!(
    (lot &&
      ((!lot.owned && lot.kind !== 'empty') ||
        (lot.owned && lot.kind === 'crypt'))) ||
    unit?.kind === 'specter' || unit?.kind === 'alchemist'
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
          el.style.maxHeight = `${Math.max(100, ceiling - floor - 20)}px`;
          const box = el.getBoundingClientRect();
          const left = Math.max(
            edge,
            Math.min(
              anchor.x - box.width / 2,
              window.innerWidth - box.width - edge,
            ),
          );
          const above = anchor.top - box.height - 14 >= floor;
          const top = Math.max(
            floor,
            Math.min(
              above ? anchor.top - box.height - 14 : anchor.bottom + 14,
              ceiling - box.height,
            ),
          );
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          el.style.setProperty(
            '--bubble-tip',
            `${Math.max(22, Math.min(box.width - 22, anchor.x - left))}px`,
          );
          el.dataset.side = above ? 'above' : 'below';
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
      <button
        type="button"
        className="ability-bubble-close"
        aria-label="Fermer les capacités"
        onClick={() => setClosedSelection(selection)}
      >
        <PackIcon asset="ui-close" />
      </button>
      <div
        className="ability-bubble-content"
        data-multiple={lot?.kind === 'hall' && !lot.owned}
      >
        <DomainPanel
          state={state}
          lot={lot}
          unit={unit}
          onAction={onAction}
          mode="bubble"
        />
      </div>
    </section>,
    document.body,
  );
}
