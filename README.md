# Mark-MediNote
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/VitStudio/Mark-MediNote)

Mark-MediNote is a powerful, self-hosted web-based Markdown editor designed for students and professionals, with a special focus on the needs of medical students. It combines a clean, distraction-free writing environment with a rich feature set to enhance productivity and note-taking.

The application features a dual-pane interface with a live-rendering preview, extensive Markdown support, and specialized tools like KaTeX for mathematical notation and Mermaid for diagramming. It includes user authentication, server-side file management, and modern features like biometric login (WebAuthn) and a built-in Pomodoro timer with an integrated YouTube music player.

## Key Features

*   **Advanced Markdown Editor**:
    *   **Live Split-Screen Preview**: See your rendered notes update in real-time as you type.
    *   **Resizable Panes**: Adjust the editor and preview panels to your preference.
    *   **GitHub-Flavored Markdown**: Full support for GFM, including tables, task lists, and code blocks.
    *   **Rich Formatting Toolbar**: A comprehensive toolbar for headings, emphasis, lists, links, and more.
    *   **Contextual Selection Menu**: A floating tooltip appears when you select text for quick formatting.

*   **Specialized Formatting**:
    *   **KaTeX Integration**: Write beautiful LaTeX mathematical and scientific formulas with `$...$` for inline and `$$...$$` for block equations.
    *   **Mermaid.js Support**: Create and embed complex diagrams, flowcharts, and sequence diagrams directly in your notes.
    *   **Syntax Extensions**: Includes support for `==highlighting==`, `~subscript~`, and `^superscript^`.
    *   **Smart Typography**: Automatically converts common markup like `---`, `--`, and `...` into their correct typographic symbols (—, –, …).

*   **Productivity Tools**:
    *   **Pomodoro Timer**: A fully-featured Pomodoro clock with customizable work, short break, and long break intervals to help you stay focused.
    *   **YouTube Music Player**: An integrated music queue. Paste YouTube URLs to create a background music playlist for your study sessions.
    *   **Find & Replace**: A powerful search tool with support for case sensitivity and regular expressions.
    *   **PDF Export**: Generate a clean, printable PDF of your rendered notes.

*   **User and File Management**:
    *   **User Authentication**: Secure user registration and login system. Notes are stored privately for each user.
    *   **Biometric Login (WebAuthn)**: Enable fast and secure sign-in using Face ID, Touch ID, or other platform authenticators.
    *   **Server-Side Storage**: All your notes are saved as `.md` files on the server, neatly organized in per-user directories.
    *   **File Manager**: An in-app modal to open, rename, and delete your saved notes.
    *   **Auto-Drafting**: Your current work is automatically saved to local storage, preventing data loss from accidental page reloads.

## Tech Stack

*   **Backend**: PHP
*   **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5, CSS3
*   **Libraries**:
    *   **marked.js**: Markdown parsing
    *   **KaTeX**: Mathematical typesetting
    *   **Mermaid.js**: Diagram rendering
    *   **html2pdf.js**: PDF generation
    *   **DaisyUI & Tailwind CSS (Browser Build)**: UI components and styling

## Getting Started

Mark-MediNote is a self-hosted application. To set it up, you will need a web server with PHP support (e.g., Apache, Nginx).

1.  **Clone the Repository**
    Clone this repository to a directory accessible by your web server.
    ```bash
    git clone https://github.com/VitStudio/Mark-MediNote.git
    cd Mark-MediNote
    ```

2.  **Set Permissions**
    The application stores user accounts, notes, and other data in the `data/` directory. Ensure your web server has write permissions for this directory.

    ```bash
    # Grant ownership to the web server user (e.g., www-data for Apache/Nginx on Debian/Ubuntu)
    sudo chown -R www-data:www-data data/

    # Or, set write permissions for all users (less secure, good for local dev)
    chmod -R 777 data/
    ```

3.  **Access the Application**
    Navigate to the application's URL in your web browser. You will be directed to the `login.html` page to register a new account or sign in.

## File Structure

The repository is organized into a PHP backend, modular JavaScript frontend, and a data storage directory.

```
.
├── js/
│   ├── app.js               # Main application entry point
│   ├── biometric.js         # WebAuthn (Face ID/fingerprint) logic
│   ├── editor-core.js       # Toolbar, tooltip, and selection helpers
│   ├── file-manager.js      # File open/save/delete/rename UI logic
│   ├── find-replace.js      # Find & Replace modal logic
│   ├── markdown-engine.js   # Markdown, KaTeX, and Mermaid rendering
│   ├── panels.js            # Split-pane management and resizing
│   ├── pdf-export.js        # PDF generation logic
│   └── pomodoro.js          # Pomodoro timer and YouTube player
│
├── auth-check.php           # Verifies if a user is logged in
├── auth.php                 # Core authentication helper functions
├── delete.php               # Handles file deletion
├── index.php                # Main editor application page
├── list.php                 # Lists a user's saved files
├── load.php                 # Loads the content of a file
├── login.html               # Login and registration page
├── login.php                # Handles user login
├── logout.php               # Handles user logout
├── register.php             # Handles new user registration
├── save.php                 # Saves a markdown file
├── webauthn-*.php           # Backend scripts for WebAuthn logic
└── LICENSE                  # AGPL-3.0 License
```

## License

This project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](LICENSE) file for more details.
