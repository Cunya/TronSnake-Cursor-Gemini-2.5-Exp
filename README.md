# Tron Snake 3D (v1.0.0)

A simple 3D snake game inspired by the light cycles from Tron, built with Three.js.

## Features

*   Classic snake gameplay in 3D.
*   Two players: Player 1 (Cyan, keyboard controlled) vs AI (Orange).
*   Dynamic play area that expands when collecting green cubes.
*   Multiple power-ups:
    *   **Pink Cube:** Temporary speed boost for the collecting snake.
    *   **Green Cube:** Expands the play area boundaries in the direction the snake was heading.
    *   **White Cube:** Clears all existing snake trails (walls).
    *   **Blue Cube:** Temporarily zooms the player's camera out.
    *   **Yellow Rings:** Temporarily makes the collecting snake's trail sparse (leaves gaps).
*   Visual effects for pickup collection (particle explosion, floating text).
*   Basic AI opponent.
*   Smooth camera follow, with look-back capability.
*   Persistent Top Score tracking using `localStorage`.

## Controls

*   **Start Game:** Click or Press Any Key on the opening screen.
*   **Player 1 Turn:** Left / Right Arrow Keys
*   **Look Backwards:** Hold Down Arrow Key
*   **Restart Game (after Game Over):** Press Any Key

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