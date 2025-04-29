# Setup BrowserTools MCP for Cursor AI

This document outlines the steps to integrate your browser's console logs with the Cursor AI assistant using the BrowserTools plugin via MCP (Model Context Protocol). This allows the AI to potentially see runtime errors directly, reducing the need for manual copy-pasting.

**Disclaimer:** This relies on third-party tools and involves running a local server. Ensure you understand the implications before proceeding. The setup process might change as tools evolve.

## Components

The setup involves three main parts:

1.  **Chrome Extension:** Captures console logs from your browser.
2.  **Node.js Server:** Acts as a bridge between the extension and the MCP command.
3.  **Cursor MCP Configuration:** Tells Cursor how to execute a command to query the Node.js server.

## Setup Steps

Follow these steps carefully:

### 1. Install the Chrome Extension

*   **Download:** Obtain the BrowserTools Chrome extension. The articles found previously didn't provide a direct download link, but searching for "AgentDesk AI BrowserTools Chrome Extension" or checking the AgentDesk AI resources might lead you to it. It might be provided as a `.zip` file.
*   **Install:**
    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable "Developer mode" (usually a toggle in the top-right corner).
    *   Click "Load unpacked".
    *   Select the directory where you extracted the downloaded extension files (or the `.zip` file itself if prompted, though usually it's the extracted folder).
    *   Ensure the extension is enabled in your extensions list.

### 2. Run the Node.js Server

*   **Open Terminal:** Open a terminal or command prompt in your **project workspace** (or any location, but be aware of where it's running).
*   **Run Command:** Execute the following command. This will download and run the server using `npx`:
    ```bash
    npx @agentdeskai/browser-tools-server@latest
    ```
*   **Keep it Running:** Leave this terminal window open and the server running while you want the integration to be active.

    **Important:** According to the search results, it's crucial to **start this server *before* configuring the MCP in Cursor** in the next step.

### 3. Configure Cursor MCP

*   **Open Cursor Settings:** Go to Cursor > Settings (or File > Preferences > Settings).
*   **Navigate to MCP:** Find the Features section and click on "MCP".
*   **Add New MCP Server:** Click the "+ Add New MCP Server" button.
*   **Configure:** Fill in the details. One of the articles suggested the following configuration for an MCP **Function** (which runs a local command):
    *   **Name:** `browser-tools` (or any name you prefer)
    *   **Type:** `stdio` (Standard Input/Output)
    *   **Command:** `npx`
    *   **Args:** (Enter these exactly, likely in separate fields if the UI provides them, or as a JSON array if pasting directly):
        ```json
        ["-y", "@agentdeskai/browser-tools-mcp@1.2.0"]
        ```
        *(Note: `@1.2.0` was mentioned in one article; you might use `@latest` or check AgentDesk AI for the recommended version.)*

    *Alternatively, if pasting the full configuration, use this structure:* 
    ```json
    {
      "mcpServers": {
        "browser-tools": { 
          "name": "browser-tools", // Added name here for clarity
          "type": "stdio",         // Specify type if needed by UI
          "command": "npx",
          "args": ["-y", "@agentdeskai/browser-tools-mcp@1.2.0"]
        }
      }
    }
    ```
    *Adjust the JSON based on how Cursor's settings UI expects the input.* 

*   **Save:** Save the configuration.

### 4. Verify the Setup

*   **Check Cursor Settings:** In the MCP settings, you should see the `browser-tools` server listed. You might need to click a refresh button to see associated tools (though in this function-based setup, there might not be specific tools listed, the *capability* is just added).
*   **Test with AI:** Open a web page that generates console errors. Ask the Cursor AI (in a chat or via Composer) if it can see any errors in the browser console. It should indicate it's using the `browser-tools` MCP and report the errors if the setup is correct.

## Troubleshooting

*   **Order:** Ensure the Node.js server was running *before* you configured the MCP in Cursor.
*   **Server Running:** Double-check that the `browser-tools-server` is still running in its terminal window.
*   **Extension Enabled:** Make sure the Chrome extension is installed and enabled.
*   **Versions:** Version mismatches between the server (`browser-tools-server`) and the MCP command runner (`browser-tools-mcp`) could potentially cause issues. Try using `@latest` for both or ensure they are compatible versions.
*   **Permissions:** Ensure `npx` can execute correctly in your environment.

## References

*   [How to Use MCP to Let Your AI IDE See and Fix Browser Console Errors (with Cursor)](https://www.billprin.com/articles/mcp-cursor-browser-errors)
*   [Add Browser Superpowers To Your Cursor AI workflow Using BrowserTools](https://eekayonline.medium.com/setting-up-model-context-protocol-mcp-with-browsertools-in-cursor-a-complete-guide-2c76929589de)
*   [BrowserTools MCP on Cursor Directory](https://cursor.directory/mcp/browsertools-mcp) 