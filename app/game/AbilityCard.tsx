import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { ASSETS, type AssetKey } from './art';
import { RESOURCE_LABELS, type Cost } from './engine';
import { PanelSkin, ResourceIcon } from './PackUI';

export function AbilityCard({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: AssetKey;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="domain-card ability-card" aria-label={title}>
      <PanelSkin kind="notice" />
      <header className="ability-heading">
        <img src={ASSETS[icon].src} alt="" />
        <h4>{title}</h4>
        {badge !== undefined && <span className="ability-badge">{badge}</span>}
      </header>
      {children}
    </section>
  );
}

export function AbilityCosts({
  cost,
  available,
  remains,
  label = 'Coût de la capacité',
}: {
  cost: Cost;
  available?: Cost;
  remains?: { needed: number; available: number };
  label?: string;
}) {
  return (
    <ul className="ability-costs" aria-label={label}>
      {remains && (
        <li data-missing={remains.available < remains.needed}>
          <img src={ASSETS['skeleton-avatar'].src} alt="" />
          <span>
            <b>{remains.needed}</b> dépouilles
          </span>
        </li>
      )}
      {Object.entries(cost)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => {
          const resource = key as keyof Cost;
          return (
            <li
              key={resource}
              data-missing={
                available !== undefined && (available[resource] ?? 0) < value
              }
            >
              {resource === 'mana' ? (
                <Sparkles aria-hidden="true" size={18} />
              ) : (
                <ResourceIcon kind={resource} />
              )}
              <span>
                <b>{value}</b> {RESOURCE_LABELS[resource]}
              </span>
            </li>
          );
        })}
    </ul>
  );
}
