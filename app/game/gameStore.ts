import { createGame, type State } from './engine.ts';

/** The renderer uses the live simulation; React subscribes to stable, isolated snapshots. */
export function createGameStore(initialState = createGame()) {
  let state = initialState;
  let snapshot = structuredClone(state);
  const listeners = new Set<() => void>();
  const publish = () => {
    snapshot = structuredClone(state);
    for (const listener of listeners) listener();
  };
  return {
    getState: () => state,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish,
    reset: (nextState: State = createGame()) => {
      state = nextState;
      publish();
    },
  };
}
