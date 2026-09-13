import { useState } from 'react';
import {
  BUILDINGS,
  capacity,
  goblinCapacity,
  demolishReason,
  type State,
  type Lot,
} from './engine';
import { GameButton } from './PackUI';

export function DemolishBuilding({
  state,
  lot,
  onDemolish,
}: {
  state: State;
  lot: Lot;
  onDemolish: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  if (
    !lot.owned ||
    lot.kind === 'hq' ||
    lot.kind === 'empty' ||
    lot.construction
  )
    return null;
  const reason = demolishReason(state, lot.id);
  const after = { ...state, lots: state.lots.filter((l) => l.id !== lot.id) };
  return (
    <div className="demolish-building">
      {!confirming ? (
        <GameButton className="subtle-btn" onClick={() => setConfirming(true)}>
          Démolir ce bâtiment…
        </GameButton>
      ) : (
        <>
          <p>
            <strong>Démolir : {BUILDINGS[lot.kind].name} ?</strong>
          </p>
          <p className="reason">
            La parcelle reste à vous. Le bâtiment et ses améliorations sont
            perdus, sans remboursement. Vos unités sont conservées.
          </p>
          {lot.kind === 'den' && (
            <p className="reason">
              Population maximale de l’armée : {capacity(state)} →{' '}
              {capacity(state) - 6 * lot.level} places. Si vous dépassez la
              limite, les recrutements militaires seront bloqués.
            </p>
          )}
          {lot.kind === 'den' && (
            <p className="reason">
              Bâtisseurs maximum : {goblinCapacity(state)} →{' '}
              {goblinCapacity(after)}. Ceux déjà recrutés restent ; les
              prochains attendront une place libre.
            </p>
          )}
          {(lot.kind === 'canteen' ||
            lot.kind === 'forge' ||
            lot.kind === 'crypt' ||
            lot.kind === 'guild') && (
            <p className="reason">
              Sa production et ses bonus disparaissent. Les recherches qui n’ont
              plus de bâtiment adapté attendront sa reconstruction.
            </p>
          )}
          {reason && <p className="reason">{reason}</p>}
          <div className="demolish-actions">
            <GameButton
              className="subtle-btn"
              onClick={() => setConfirming(false)}
            >
              Conserver
            </GameButton>
            <GameButton
              className="subtle-btn demolish-confirm"
              disabled={!!reason}
              onClick={() => {
                onDemolish();
                setConfirming(false);
              }}
            >
              Confirmer la démolition
            </GameButton>
          </div>
        </>
      )}
    </div>
  );
}
