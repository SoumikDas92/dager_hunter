import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.dagerHunter = game;

  if ('serviceWorker' in navigator && !window.__DAGER_HUNTER_SINGLE_FILE__) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.info('Service worker registration skipped:', error);
      });
    });
  }
});
