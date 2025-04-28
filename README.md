# TronSnake 3D - v1.1.35

**[Play Live!](https://cunya.github.io/TronSnake-Cursor-Gemini-2.5-Exp/)**

**[Issues and Fixes Log](./ISSUES_AND_FIXES.md)**

A simple 3D snake game inspired by the light cycles from Tron, built with Three.js.

This project is part of a series of experiments in LLM-assisted code generation, developed entirely through conversations with Gemini 2.5 pro exp 03-25 using the Cursor editor.
More similar projects can be found at https://cunya.github.io/github-landing-page/.

## Features

*   Classic snake gameplay in 3D.
*   Player 1 (Cyan, keyboard/touch controlled) vs multiple AI opponents.
*   Dynamic play area that expands when collecting green cubes.
*   Multiple power-ups with score thresholds and some with counter-based spawning:
    *   **Blue Cube (Zoom):** Grants 20 pts. Briefly zooms the player's camera out.
    *   **Pink Cube (Speed Up):** Grants 40 pts. Temporary speed boost (Lighter Cyan effect). (Score threshold: 50)
    *   **Yellow Blocks (Sparse Trail):** Grants 60 pts. Leave gaps in your trail. (Score threshold: 200)
    *   **Orange Sphere (Ammo):** Grants 80 pts. Allows player/AI to shoot trails (Spacebar/Touch). (Score threshold: 300, Spawns every 10 pickups)
    *   **White Cube (Clear Walls):** Grants 100 pts. Removes all existing snake trails. (Score threshold: 500, Spawns every 5 pickups)
    *   **Gray Octahedron (Add AI):** Grants 125 pts. Spawns a new AI opponent. (Score threshold: 1000, Spawns every 20 pickups)
    *   **Green Cube (Expand):** Grants 150 pts. Expands play area boundaries. (Score threshold: 1500, Spawns every 15 pickups)
    *   **Purple Gems (More!):** Grants 200 pts. Increases max count of some pickups & spawns 2 others. (Score threshold: 2000, Spawns every 15 pickups)
*   Visual effects for pickup collection (particle explosion, floating text).
*   Player death explosion effect (head remains visible until restart).
*   Multiple AI opponents with basic pathfinding and shooting behavior.
*   Smooth camera follow, with look-back capability.
*   **Delayed Game Over Sequence:**
    *   When the game ends (player loss or last AI defeated), there is a 5-second delay before the Game Over dialog appears.
    *   During the delay, the camera slowly zooms out from the final viewpoint.
    *   Pressing any key during the delay immediately restarts the game.
*   **Interactive Game Over Camera:** After the 5-second delay, the camera switches to an interactive mode where you can:
    *   **Rotate:** Left-click and drag / Touch and drag.
    *   **Pan:** Middle-click and drag.
    *   **Zoom:** Mouse wheel scroll.
*   **Game Over Dialog:**
    *   Displays final score, top score, and unlocked powerups.
    *   Includes a minimize/maximize button (`_`/`+`).
*   Pause functionality (Escape key).
*   Game automatically pauses if the browser tab loses focus.
*   Persistent Top Score tracking using `localStorage`.
*   Links to GitHub repository and itch.io page in the UI.

## Controls

*   **Start Game:** Click / Touch / Press Any Key on the opening screen.
*   **Player 1 Turn:** Left / Right Arrow Keys OR Touch Left / Right side of screen.
*   **Shoot:** Spacebar OR Touch Top area of screen.
*   **Look Backwards:** Hold Down Arrow Key OR Touch Bottom area of screen.
*   **Pause / Unpause:** Escape Key.
*   **Restart Game (after Game Over):** Press Any Key (works immediately during the 5s delay or after dialog appears) or Tap the dialog text.
*   **Game Over Camera:** Left-Drag (Rotate), Middle-Drag (Pan), Scroll (Zoom).
*   **Toggle Game Over Dialog:** Click the `_`/`+` button on the dialog.

## Setup & Running

Because this project uses ES6 modules (`import` statements) for Three.js and potentially for loading assets like fonts, you cannot simply open the `index.html` file directly in your browser from the file system (`file://...`).

You need to serve the files using a local web server.

**Simple Local Server Method:**

1.  Make sure you have Python installed.
2.  Open a terminal or command prompt in the root directory of the project (where `index.html` is located).
3.  Run the command:
    *   Python 3: `python -m http.server`
    *   Python 2: `python -m SimpleHTTPServer`
4.  The server will start, usually indicating the address, typically `http://localhost:8000` or `http://0.0.0.0:8000`.
5.  Open your web browser and navigate to that address.

**Other Options:**

*   Use the Live Server extension in VS Code.
*   Use Node.js-based servers like `http-server` (`npm install -g http-server` then run `http-server .`).

**Font Note:**
The game currently attempts to load the `helvetiker_regular.typeface.json` font file directly from the Three.js GitHub repository URL. Ensure you have an internet connection when running.

## Dependencies

*   [Three.js](https://threejs.org/) (included via ES module imports)

## License

This project is distributed under a custom license. Please see the [LICENSE.txt](./LICENSE.txt) file for details regarding usage restrictions. 