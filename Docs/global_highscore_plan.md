# Plan: Global High Score System Implementation

This document outlines the steps required to implement a global high score system for the Powerup Tron game, replacing the current local browser storage (`localStorage`).

## 1. Core Requirements

*   **Backend Storage:** A centralized database to store player names and scores.
*   **API/SDK:** A way for the game client (JavaScript in the browser) to communicate with the backend (send scores, retrieve leaderboard).
*   **Client-Side Logic:** Integrate backend communication into the game flow.
*   **UI Updates:** Display the global leaderboard and handle score submission (including player name input).
*   **Basic Security:** Implement reasonable measures to validate submitted scores.

## 2. Technology Choice (Suggestion)

Using a **Backend-as-a-Service (BaaS)** platform is recommended for simplicity and speed of development for this type of feature. Good options include:

*   **Firebase (Google):** Offers Firestore (NoSQL) or Realtime Database, Cloud Functions (for potential server-side validation), Authentication, and a well-documented JavaScript SDK.
*   **Supabase (Open Source):** Offers a Postgres database, Edge Functions, Authentication, and a JavaScript SDK.

*Decision:* The plan will assume a BaaS approach using its JavaScript SDK directly from the client, simplifying the need for a separate custom API server. Steps should be adaptable to either Firebase or Supabase.

## 3. Implementation Steps

### Step 3.1: Backend Setup (Firebase/Supabase)

1.  **Create Project:** Sign up and create a new project on the chosen BaaS platform.
2.  **Database Setup:**
    *   Create a database instance (e.g., Firestore, Supabase Postgres).
    *   Define a collection/table (e.g., `highscores`).
    *   Define the structure for score entries:
        *   `name`: String (Player name)
        *   `score`: Number (Player score)
        *   `timestamp`: Timestamp (Server timestamp when score was submitted)
3.  **Security Rules/Policies:**
    *   Configure database rules (e.g., Firestore Security Rules, Supabase Row Level Security).
    *   **Reads:** Allow public read access to the `highscores` collection/table (to display the leaderboard).
    *   **Writes:** Allow writes to the `highscores` collection/table. Consider basic validation rules:
        *   Ensure `name` is a non-empty string (maybe with length limits).
        *   Ensure `score` is a positive number (maybe with a reasonable upper limit to deter obvious cheating).
        *   Consider basic rate limiting if possible via platform features or simple Cloud/Edge Functions.
        *   *Note:* Authentication could be added later for more robust user association, but adds complexity. Start with simple name input.
4.  **Get API Keys/Configuration:** Obtain the necessary configuration details (API keys, project ID, etc.) to initialize the SDK in the frontend.

### Step 3.2: Frontend SDK Integration

1.  **Add SDK:** Include the chosen BaaS provider's JavaScript SDK in the project (e.g., via CDN link in `index.html` or installing via npm if a build step were added).
2.  **Initialize SDK:** In a suitable place (e.g., `init.js` or a new `backend.js` module), initialize the SDK using the configuration details obtained in Step 3.1. Keep credentials secure (use environment variables if deploying publicly later, though for simple BaaS web SDKs, keys are often public).

### Step 3.3: Score Submission Logic

1.  **Name Input UI:**
    *   In `ui.js`, modify `showGameOverMessage` (or the logic that handles the game over state *after* the delay).
    *   If the player's `scoreP1` qualifies for the leaderboard (e.g., is higher than the lowest score on the current top 10, or simply always allow submission for simplicity initially), display an input field and submit button within the game over dialog.
2.  **Submission Handler:**
    *   Add an event listener to the submit button.
    *   On submit:
        *   Get the player's name from the input field.
        *   Get the final `scoreP1` from the game state.
        *   Perform basic client-side validation (e.g., name not empty).
        *   Use the BaaS SDK to create a new document/row in the `highscores` collection/table with the `name`, `score`, and a server `timestamp`.
        *   Provide user feedback (e.g., "Score submitted!", hide input field).
        *   Handle potential errors during submission.

### Step 3.4: Leaderboard Fetching Logic

1.  **Create Fetch Function:** In a suitable place (e.g., `init.js` or `backend.js`), create an asynchronous function `fetchHighScores(limit = 10)`:
    *   Use the BaaS SDK to query the `highscores` collection/table.
    *   Order the results by `score` descending (`orderBy('score', 'desc')`).
    *   Limit the results (e.g., `limit(limit)`).
    *   Return the array of score objects (or an empty array on error).
2.  **Call Fetch Function:**
    *   Call `fetchHighScores()` when the game initializes (`init.js`) to potentially display scores on the opening screen.
    *   Call `fetchHighScores()` again when the game over screen is displayed (`showGameOverMessage`) to show the latest leaderboard context.

### Step 3.5: Leaderboard Display UI

1.  **Modify UI:** In `ui.js`:
    *   Add an HTML element (e.g., a `div` with an ID like `global-leaderboard`) within the opening dialog and/or the game over dialog where the scores will be displayed.
    *   Style this leaderboard element (e.g., using an ordered list `ol`).
2.  **Create Display Function:** Create a function `displayHighScores(scoresArray)`:
    *   Takes the array fetched in Step 3.4.
    *   Clears the previous content of the leaderboard UI element.
    *   Iterates through the `scoresArray`.
    *   For each score, creates list items (`li`) displaying rank, name, and score.
    *   Appends the items to the leaderboard element.
3.  **Integrate Display:** Call `displayHighScores()` after successfully fetching scores in Step 3.4.

### Step 3.6: Documentation Update

1.  Update `README.md` to mention the new global high score feature.
2.  Update `Docs/software_design.md` to detail the backend integration, new UI components, and state changes.

## 4. Considerations & Future Enhancements

*   **Authentication:** Add user login (e.g., simple email/password or social login via BaaS providers) to tie scores to specific users and prevent name impersonation.
*   **Advanced Anti-Cheat:** Implement more sophisticated server-side validation. Relying *only* on client-side code for score submission is inherently insecure, as the client code can be reverse-engineered and API calls can be spoofed.
    *   **Client-Side Obfuscation/Hashing (Weak):** While techniques like code obfuscation or including simple checksums/hashes with submissions can deter casual cheating, they are ultimately bypassable by determined attackers who analyze the client code.
    *   **Plausibility Checks (Server-Side):** Send additional gameplay metadata along with the score (e.g., game duration, powerups collected, final level reached). The backend (security rules or a Cloud/Edge Function) can perform basic plausibility checks (e.g., is the score reasonably achievable within the reported duration?).
    *   **Server-Side Validation via Functions (Stronger):** The most robust approach using BaaS is to restrict direct database writes and force score submissions through a secure Cloud Function (Firebase) or Edge Function (Supabase).
        *   The game client calls this function with the score and potentially other relevant gameplay data.
        *   The function executes server-side code to perform validation checks (plausibility, rate limiting, potentially comparing against expected scoring patterns or even basic session validation if using authentication).
        *   Only if the validation passes does the function write the score to the database.
        *   This prevents users from writing arbitrary scores directly to the database by simply calling the SDK's write method.
*   **Error Handling:** Robustly handle network errors or backend issues during score submission/fetching.
*   **Scalability:** BaaS platforms generally handle scaling well, but monitor usage costs.
*   **UI Polish:** Improve the visual design of the leaderboard and name input.
*   **Score Qualification:** Decide if *all* scores should be submitted or only those potentially making the top N list (requires fetching leaderboard before submission). Submitting all is simpler initially. 