import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PackIcon } from './PackUI';

export function CreationCards({ children }: { children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () => setEdges({
      left: row.scrollLeft > 1,
      right: row.scrollLeft + row.clientWidth < row.scrollWidth - 1,
    });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    for (const child of row.children) observer.observe(child);
    row.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      row.removeEventListener('scroll', update);
    };
  }, []);
  const scroll = (direction: number) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * Math.max(180, row.clientWidth * 0.75),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  return (
    <div className="creation-cards">
      {(edges.left || edges.right) && (
        <div className="creation-scroll-controls" aria-label="Faire défiler les cartes">
          <button type="button" disabled={!edges.left} onClick={() => scroll(-1)} aria-label="Voir les cartes à gauche" title="Cartes précédentes">
            <PackIcon asset="ui-back" />
          </button>
          <button type="button" disabled={!edges.right} onClick={() => scroll(1)} aria-label="Voir les cartes à droite" title="Cartes suivantes">
            <PackIcon asset="ui-back" className="creation-arrow-right" />
          </button>
        </div>
      )}
      <div ref={rowRef} className="card-row" aria-label="Options disponibles, défilement horizontal">
        {children}
      </div>
    </div>
  );
}
