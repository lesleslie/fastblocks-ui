/**
 * FastBlocks UI public JavaScript entrypoint.
 *
 * This module re-exports the lightweight enhancement helpers and executes the
 * same side-effectful module as the public browser entrypoint.
 */
export {
  defineFastBlocksCustomElements,
  enhanceDialogs,
  enhanceMenus,
  enhanceTabs,
  initFastBlocksUI,
} from './enhance.js';
