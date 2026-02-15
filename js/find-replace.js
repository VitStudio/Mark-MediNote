/**
 * Find & Replace — exact-match with optional case-sensitive / regex modes
 */

import { updatePreview } from './markdown-engine.js';

export function initFindReplace() {
    const editor        = document.getElementById('editor');
    const findModal     = document.getElementById('findReplaceModal');
    const findInput     = document.getElementById('find-input');
    const replaceInput  = document.getElementById('replace-input');
    const findStatus    = document.getElementById('find-status');
    const chkCase       = document.getElementById('find-case-sensitive');
    const chkRegex      = document.getElementById('find-regex');

    let matches = [];
    let curIdx  = -1;

    /* ===== CORE FIND ===== */
    function doFind(query) {
        matches = [];
        curIdx  = -1;
        if (!query) { findStatus.textContent = ''; return; }

        const text      = editor.value;
        const useRegex  = chkRegex?.checked;
        const caseSens  = chkCase?.checked;

        if (useRegex) {
            try {
                const re = new RegExp(query, caseSens ? 'g' : 'gi');
                let m;
                while ((m = re.exec(text)) !== null) {
                    matches.push({ start: m.index, end: m.index + m[0].length });
                    if (m[0].length === 0) re.lastIndex++; // avoid infinite loop
                }
            } catch (e) {
                findStatus.textContent = 'Invalid regex';
                return;
            }
        } else {
            const hay    = caseSens ? text  : text.toLowerCase();
            const needle = caseSens ? query : query.toLowerCase();
            let pos = 0;
            while ((pos = hay.indexOf(needle, pos)) !== -1) {
                matches.push({ start: pos, end: pos + query.length });
                pos += query.length;
            }
        }

        findStatus.textContent = matches.length
            ? `${matches.length} match${matches.length > 1 ? 'es' : ''}`
            : 'No matches';
    }

    /* ===== HIGHLIGHT ===== */
    function highlightMatch(idx) {
        if (!matches.length) return;
        curIdx = ((idx % matches.length) + matches.length) % matches.length;
        const m = matches[curIdx];

        editor.focus({ preventScroll: true });
        editor.setSelectionRange(m.start, m.end);

        // Scroll to centre the match in the textarea
        const lineH     = parseInt(getComputedStyle(editor).lineHeight) || 22;
        const lineNum   = editor.value.substring(0, m.start).split('\n').length;
        const target    = Math.max(0, lineNum * lineH - editor.clientHeight / 2);
        editor.scrollTop = target;

        findStatus.textContent = `${curIdx + 1} of ${matches.length}`;
    }

    /* ===== REPLACE ===== */
    function doReplace(idx, replacement) {
        if (idx < 0 || idx >= matches.length) return;
        const m      = matches[idx];
        const before = editor.value.substring(0, m.start);
        const after  = editor.value.substring(m.end);
        const diff   = replacement.length - (m.end - m.start);
        editor.value = before + replacement + after;

        // Shift later match positions
        for (let i = idx + 1; i < matches.length; i++) {
            matches[i].start += diff;
            matches[i].end   += diff;
        }
        matches.splice(idx, 1);
        if (curIdx >= matches.length) curIdx = 0;

        updatePreview();
        findStatus.textContent = matches.length
            ? `${matches.length} match${matches.length > 1 ? 'es' : ''}`
            : 'All replaced';
    }

    /* ===== EVENT LISTENERS ===== */
    function openFindReplace() {
        findModal.showModal();
        findInput.focus();
        const sel = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        if (sel) findInput.value = sel;
        doFind(findInput.value);
    }

    document.getElementById('btn-find')?.addEventListener('click', openFindReplace);
    // Keep btn-replace listener in case the element still exists (backwards compat)
    document.getElementById('btn-replace')?.addEventListener('click', openFindReplace);

    document.getElementById('btn-close-modal').addEventListener('click', () => findModal.close());

    findInput.addEventListener('input', () => doFind(findInput.value));
    chkCase?.addEventListener('change',  () => doFind(findInput.value));
    chkRegex?.addEventListener('change', () => doFind(findInput.value));

    document.getElementById('btn-find-next').addEventListener('click', () => {
        doFind(findInput.value);
        if (matches.length) highlightMatch(curIdx + 1);
    });
    document.getElementById('btn-find-prev').addEventListener('click', () => {
        doFind(findInput.value);
        if (matches.length) highlightMatch(curIdx - 1);
    });

    document.getElementById('btn-replace-one').addEventListener('click', () => {
        if (matches.length && curIdx >= 0) {
            doReplace(curIdx, replaceInput.value);
            if (matches.length) highlightMatch(curIdx);
        }
    });

    document.getElementById('btn-replace-all').addEventListener('click', () => {
        doFind(findInput.value);
        if (!matches.length) return;
        const rep = replaceInput.value;
        let count = 0;
        // Replace from end to start so positions stay valid
        for (let i = matches.length - 1; i >= 0; i--) {
            const m      = matches[i];
            const before = editor.value.substring(0, m.start);
            const after  = editor.value.substring(m.end);
            editor.value = before + rep + after;
            count++;
        }
        matches = [];
        curIdx  = -1;
        updatePreview();
        findStatus.textContent = `Replaced ${count} match${count > 1 ? 'es' : ''}`;
    });
}
