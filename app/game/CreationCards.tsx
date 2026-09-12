import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PackIcon } from './PackUI';

export function CreationCards({ children, layout = 'scroll' }: { children: ReactNode; layout?: 'grid' | 'scroll' }) {
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
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const distance = event.deltaY * (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? row.clientWidth : 1);
      const next = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, row.scrollLeft + distance));
      if (Math.abs(next - row.scrollLeft) < 1) return;
      event.preventDefault();
      row.scrollLeft = next;
    };
    row.addEventListener('wheel', wheel, { passive: false });
    update();
    return () => {
      observer.disconnect();
      row.removeEventListener('scroll', update);
      row.removeEventListener('wheel', wheel);
    };
  }, []);
  const scroll = (direction: number) => {
    const row = rowRef.current;
    if (!row) return;
    const step = (row.firstElementChild as HTMLElement | null)?.offsetWidth ?? 180;
    const stride = step + parseFloat(getComputedStyle(row).columnGap || '0');
    row.scrollBy({
      left: direction * stride * Math.max(1, Math.floor(row.clientWidth / stride)),
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
      <div ref={rowRef} className="card-row" aria-label={layout === 'grid' ? 'Options disponibles' : 'Options disponibles, défilement horizontal'}>
        {children}
      </div>
    </div>
  );
}
