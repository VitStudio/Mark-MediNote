/**
 * App — entry point · imports all modules
 */

const user = typeof window.__user === 'string' ? window.__user : '';
const userEl = document.getElementById('user-display');
if (userEl && user) {
    userEl.textContent = user;
}

import { initMarkdown, updatePreview } from './markdown-engine.js';
import { initEditorCore }  from './editor-core.js';
import { initPanels }      from './panels.js';
import { initFindReplace } from './find-replace.js';
import { initPdfExport }   from './pdf-export.js';
import { initFileManager } from './file-manager.js';
import { initPomodoro }    from './pomodoro.js';
import { initBiometric }   from './biometric.js';

// Initialize in dependency order
initMarkdown();      // preview engine (must be first)
initEditorCore();    // toolbar, tooltip, keyboard shortcuts
initPanels();        // resize handle + panel toggle
initFindReplace();   // find & replace
initPdfExport();     // PDF export
initFileManager();   // CRUD file manager + save
initPomodoro();      // timer, YouTube, zoom effect
initBiometric();     // user menu, biometric registration

// Help modal
document.getElementById('btn-help')?.addEventListener('click', () => {
    document.getElementById('helpModal')?.showModal();
});

/* ===== DRAFT PERSISTENCE (per-user, private) =====
 * Auto-save editor content & filename to localStorage per username.
 */
(function initDraftPersistence() {
    const editor     = document.getElementById('editor');
    const fnameInput = document.getElementById('filename-input');
    const btnSave    = document.getElementById('btn-save');
    if (!editor || !fnameInput) return;

    const LS_DRAFT   = 'editor_draft_' + (user || 'guest');
    const LS_FNAME   = 'editor_draft_filename_' + (user || 'guest');
    let _draftTimer = null;

    function saveDraft() {
        try {
            localStorage.setItem(LS_DRAFT, editor.value);
            localStorage.setItem(LS_FNAME, fnameInput.value);
        } catch (_) {}
    }

    function debouncedSaveDraft() {
        if (_draftTimer) clearTimeout(_draftTimer);
        _draftTimer = setTimeout(saveDraft, 300);
    }

    try {
        const draft = localStorage.getItem(LS_DRAFT);
        const fname = localStorage.getItem(LS_FNAME);
        if (draft !== null && draft.length > 0) {
            editor.value = draft;
            if (fname) fnameInput.value = fname;
            updatePreview();
        }
    } catch (_) {}

    // Auto-save on every edit
    editor.addEventListener('input', debouncedSaveDraft);
    fnameInput.addEventListener('input', debouncedSaveDraft);

    // Also save when toolbar actions change content (MutationObserver on value won't work,
    // but we can listen for the custom events or just periodically check)
    // The simplest: also save after any click on toolbar buttons
    document.getElementById('editor-toolbar')?.addEventListener('click', () => {
        setTimeout(saveDraft, 50);
    });

    // Clear draft marker after successful save (the user explicitly saved)
    btnSave?.addEventListener('click', () => {
        // We keep the draft but update the filename after save completes
        setTimeout(saveDraft, 2000);
    });
})();
