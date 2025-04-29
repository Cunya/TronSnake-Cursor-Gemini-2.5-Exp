# Project TODO List

This file tracks potential tasks, improvements, and features for the Powerup Tron game.

## Major Features

*   **Main Menu:** Implement a main menu scene instead of the current opening dialog.
    *   [ ] Include options like "Start Game", "View High Scores", "Options", "Instruction", "About".
    *   [ ] Options Menu: Add ability to reset local top score (and later, global name if implemented).
    *   [ ] End Dialog Update: Add options to the Game Over dialog to either restart immediately or return to the main menu.

*   **Logging Improvement:** Enhance logging for easier debugging (especially for LLM interaction).
    *   [ ] Explore options for logging directly to a file accessible by development tools or a simple local logging server, reducing the need for copy-pasting from the browser console.

*   **Implement Global High Score System:** (See `Docs/global_highscore_plan.md`)
    *   [ ] Choose and set up BaaS (Firebase/Supabase).
    *   [ ] Integrate BaaS SDK.
    *   [ ] Implement leaderboard fetching & display UI.
    *   [ ] Implement score submission UI & logic (with name input).
    *   [ ] Configure basic security rules/policies.
    *   [ ] (Optional) Implement server-side validation via Cloud/Edge Functions for anti-cheat.
    *   [ ] (Optional) Add user authentication.
*   **Implement New Powerups:** (See `Docs/powerup_ideas.md`)
    *   [ ] Select 1-2 powerups from the ideas list to implement first (e.g., Shield, Magnet).
    *   [ ] Design/create necessary visual assets/effects.
    *   [ ] Integrate into pickup spawning logic (`pickups.js`).
    *   [ ] Implement effect logic (potentially modifying `gameLoop.js`, `state.js`, `playerControls.js`).
    *   [ ] Update AI to potentially react to or use the new powerup (`ai.js`).
    *   [ ] Update documentation (`README.md`, `software_design.md`).

## Gameplay & Balancing

*   [ ] **AI Enhancements:**
    *   [ ] Improve pathfinding (consider A* or other algorithms).
    *   [ ] Add strategic shooting logic (predict player movement, prioritize targets).
    *   [ ] Implement AI usage of specific powerups (e.g., speed boost, shooting ammo).
    *   [ ] Add different AI personalities or difficulty levels.
*   [ ] **Powerup Balancing:**
    *   [ ] Playtest and adjust durations, effects, score values, spawn rates/thresholds for existing powerups (e.g., Zoom duration, Sparse Trail gaps).
    *   [ ] Balance any newly implemented powerups.
*   [ ] **Difficulty Curve:** Evaluate how difficulty scales with more AIs and arena expansion.

## UI/UX

*   [ ] **Sound Effects:** Add sounds for key actions (pickup collection, shooting, collision, UI interactions, game start/over).
*   [ ] **Background Music:** Add optional background music.
*   [ ] **Visual Polish:** Improve styling of dialogs, buttons, score displays.
*   [ ] **Mobile Controls:** Further testing and refinement of touch zones.

## Code Quality & Refactoring

*   [ ] **Review `state.js`:** Consider grouping related state variables into objects if complexity increases.
*   [ ] **Error Handling:** Add more robust error handling, especially around potential async operations (font loading, future backend calls).
*   [ ] **Performance:** Profile the game under heavy load (many AIs/trails) and optimize if necessary.
*   [ ] **Code Review:** Address any remaining TODO comments in the code.
*   [ ] **Testing:** Implement unit tests for utility functions and core logic modules.

## Build & Deployment

*   [ ] **Build Process:** Implement a build tool (e.g., Vite, Webpack) for bundling, minification, and easier dependency management.
*   [ ] **Deployment Automation:** Set up GitHub Actions (or similar) to automatically build and deploy updates to GitHub Pages.

## Bugs & Known Issues

*   [ ] Review `ISSUES_AND_FIXES.md` for any outstanding items.
*   [ ] Thoroughly test recent game over sequence and camera control changes.

*Items should be prioritized based on impact and effort.* 