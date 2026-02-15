/**
 * Panels — resize handle, panel show/hide toggle, swap layout,
 *           synchronized scrolling between editor & preview.
 */

import { updatePreview } from './markdown-engine.js';

export function initPanels() {
    const handle       = document.getElementById('resize-handle');
    const panelPreview = document.getElementById('panel-preview');
    const panelEditor  = document.getElementById('panel-editor');
    const mainSplit    = document.getElementById('main-split');
    const togglePrev   = document.getElementById('toggle-preview');
    const toggleEdit   = document.getElementById('toggle-editor');
    const swapBtn      = document.getElementById('btn-swap-panels');
    const editorEl     = document.getElementById('editor');
    const previewBody  = document.getElementById('preview-content')?.closest('.panel-body')
                       || document.getElementById('preview-content')?.parentElement;

    let resizing = false;

    /* ======================================================
     *  RESIZE HANDLE
     * ====================================================== */
    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });

    function startResize(e) {
        e.preventDefault();
        resizing = true;
        handle.classList.add('active');
        document.body.style.cursor     = isHz() ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', doResize);
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
    }

    function isHz() { return window.innerWidth >= 768; }

    function doResize(e) {
        if (!resizing) return;
        e.preventDefault();
        const rect = mainSplit.getBoundingClientRect();
        const cx   = e.touches ? e.touches[0].clientX : e.clientX;
        const cy   = e.touches ? e.touches[0].clientY : e.clientY;

        if (isHz()) {
            const pct = Math.max(15, Math.min(85, ((cx - rect.left) / rect.width) * 100));
            // Respect current flex order (swapped or not)
            const first  = mainSplit.firstElementChild;
            const second = mainSplit.children[2]; // skip handle
            first.style.flex  = 'none';
            first.style.width = pct + '%';
            second.style.flex  = 'none';
            second.style.width = (100 - pct) + '%';
        } else {
            const pct = Math.max(15, Math.min(85, ((cy - rect.top) / rect.height) * 100));
            const first  = mainSplit.firstElementChild;
            const second = mainSplit.children[2];
            first.style.flex   = 'none';
            first.style.height = pct + '%';
            second.style.flex    = 'none';
            second.style.height  = (100 - pct) + '%';
        }
    }

    function stopResize() {
        resizing = false;
        handle.classList.remove('active');
        document.body.style.cursor     = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);
    }

    // Reset sizing on orientation / viewport change
    window.addEventListener('resize', resetSizing);
    function resetSizing() {
        [panelPreview, panelEditor].forEach(p => {
            p.style.flex = ''; p.style.width = ''; p.style.height = '';
        });
    }

    /* ======================================================
     *  PANEL TOGGLE  (both | editor | preview)
     * ====================================================== */
    let state = localStorage.getItem('panelState') || 'both';
    apply(state);

    if (togglePrev) togglePrev.addEventListener('click', () => {
        state = state === 'editor' ? 'both' : (state === 'both' ? 'editor' : 'both');
        apply(state);
    });
    if (toggleEdit) toggleEdit.addEventListener('click', () => {
        state = state === 'preview' ? 'both' : (state === 'both' ? 'preview' : 'both');
        apply(state);
    });

    function apply(s) {
        state = s;
        localStorage.setItem('panelState', s);
        resetSizing();

        panelPreview.style.display = (s === 'editor')  ? 'none' : '';
        panelEditor.style.display  = (s === 'preview') ? 'none' : '';
        handle.style.display       = (s === 'both')    ? ''     : 'none';

        togglePrev?.classList.toggle('active-toggle', s === 'editor');
        toggleEdit?.classList.toggle('active-toggle', s === 'preview');

        togglePrev && (togglePrev.title = s === 'editor'
            ? 'Show preview (Ctrl+Shift+P)'
            : 'Hide preview (Ctrl+Shift+P)');
        toggleEdit && (toggleEdit.title = s === 'preview'
            ? 'Show editor (Ctrl+Shift+E)'
            : 'Hide editor (Ctrl+Shift+E)');

        // Re-render preview when it becomes visible
        if (s !== 'editor') updatePreview();
    }

    /* ======================================================
     *  SWAP PANELS  (Editor ↔ Preview left/right)
     * ====================================================== */
    let swapped = localStorage.getItem('panelsSwapped') === 'true';
    applySwap();

    if (swapBtn) swapBtn.addEventListener('click', () => {
        swapped = !swapped;
        localStorage.setItem('panelsSwapped', String(swapped));
        applySwap();
    });

    function applySwap() {
        if (swapped) {
            // Move editor before handle (first), preview after handle (last)
            mainSplit.insertBefore(panelEditor, mainSplit.firstChild);
            mainSplit.appendChild(panelPreview);
        } else {
            // Default: preview first, editor last
            mainSplit.insertBefore(panelPreview, mainSplit.firstChild);
            mainSplit.appendChild(panelEditor);
        }
        // Update swap button visual
        if (swapBtn) {
            swapBtn.classList.toggle('active-toggle', swapped);
            swapBtn.title = swapped ? 'Editor on right (swap)' : 'Editor on left (swap)';
        }
        resetSizing();
    }

    /* ======================================================
     *  SYNCHRONIZED SCROLLING
     * ====================================================== */
    let _syncingScroll = false;

    function syncEditorToPreview() {
        if (_syncingScroll || !previewBody || !editorEl) return;
        _syncingScroll = true;
        const pct = editorEl.scrollTop / (editorEl.scrollHeight - editorEl.clientHeight || 1);
        previewBody.scrollTop = pct * (previewBody.scrollHeight - previewBody.clientHeight);
        requestAnimationFrame(() => { _syncingScroll = false; });
    }

    function syncPreviewToEditor() {
        if (_syncingScroll || !previewBody || !editorEl) return;
        _syncingScroll = true;
        const pct = previewBody.scrollTop / (previewBody.scrollHeight - previewBody.clientHeight || 1);
        editorEl.scrollTop = pct * (editorEl.scrollHeight - editorEl.clientHeight);
        requestAnimationFrame(() => { _syncingScroll = false; });
    }

    editorEl?.addEventListener('scroll', syncEditorToPreview, { passive: true });
    previewBody?.addEventListener('scroll', syncPreviewToEditor, { passive: true });

    /* ======================================================
     *  TOPBAR SPACER
     * ====================================================== */
    const syncSpacer = () => {
        const bar    = document.getElementById('topbar');
        const spacer = document.getElementById('topbar-spacer');
        if (bar && spacer) spacer.style.height = bar.offsetHeight + 'px';
    };
    window.addEventListener('resize', syncSpacer);
    syncSpacer();
    setTimeout(syncSpacer, 300);
}
