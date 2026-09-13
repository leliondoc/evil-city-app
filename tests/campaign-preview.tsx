/// <reference types="vite/client" />
import React from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../app/game/Game';
import { createGame, tick, type State } from '../app/game/engine';
import { Renderer } from '../app/game/renderer';
import type { CampaignMapId } from '../app/game/campaign';

declare global {
  interface Window {
    campaignRenderer: Renderer;
    campaignState: () => State;
    campaignTick: (seconds: number) => void;
  }
}
const suspend = Reflect.get(
  Renderer.prototype,
  'setSuspended',
) as Renderer['setSuspended'];
Renderer.prototype.setSuspended = function (...args) {
  window.campaignRenderer = this;
  // The fixture follows resets too, without exposing state in the shipped game.
  window.campaignState = Reflect.get(this, 'getState') as () => State;
  window.campaignTick = (seconds) => tick(window.campaignState(), seconds);
  return suspend.apply(this, args);
};
const id = new URLSearchParams(location.search).get('map');
const map: CampaignMapId =
  id === 'faubourg' || id === 'tilleuls' ? id : 'refuge';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Game initialState={createGame(map)} />
  </React.StrictMode>,
);
