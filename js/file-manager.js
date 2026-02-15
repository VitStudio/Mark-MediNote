/**
 * File Manager — CRUD modal + save button
 */

import { updatePreview } from './markdown-engine.js';

export function initFileManager() {
    const editor        = document.getElementById('editor');
    const filenameInput = document.getElementById('filename-input');
    const btnSave       = document.getElementById('btn-save');
    const btnOpen       = document.getElementById('btn-open');
    const fileModal     = document.getElementById('fileManagerModal');
    const fileList      = document.getElementById('fm-file-list');
    const fileSearch    = document.getElementById('fm-search');
    const fileStatus    = document.getElementById('fm-status');

    const SAVE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" ' +
        'viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" ' +
        'stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 ' +
        '00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>';

    let allFiles = [];

    function checkAuth(res) {
        if (res.status === 401) {
            window.location.href = 'login.html';
            return true;
        }
        return false;
    }

    /* ===== SAVE ===== */
    btnSave.addEventListener('click', async () => {
        const filename = filenameInput.value.trim() || 'document';
        try {
            const res  = await fetch('save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ content: editor.value, filename }),
            });
            if (checkAuth(res)) return;
            const data = await res.json();
            if (data.success) {
                filenameInput.value   = data.filename;
                btnSave.style.background = '#238636';
                btnSave.innerHTML = `${SAVE_ICON} <span class="text-xs">Saved!</span>`;
                setTimeout(() => {
                    btnSave.style.background = '';
                    btnSave.innerHTML = `${SAVE_ICON} <span class="hidden sm:inline">.md</span>`;
                }, 1800);
                if (fileModal.open) refreshFileList();
            } else {
                alert('Error: ' + (data.error || 'Failed'));
            }
        } catch (err) { alert('Error: ' + err.message); }
    });

    filenameInput.value = 'document.md';

    /* ===== FILE MANAGER MODAL ===== */
    btnOpen.addEventListener('click', () => {
        fileModal.showModal();
        refreshFileList();
    });

    document.getElementById('fm-close')?.addEventListener('click', () => fileModal.close());

    fileSearch?.addEventListener('input', () => {
        renderFileList(fileSearch.value.trim().toLowerCase());
    });

    document.getElementById('fm-new-file')?.addEventListener('click', () => {
        editor.value = '';
        filenameInput.value = 'document.md';
        updatePreview();
        fileModal.close();
    });

    /* ---------- data ---------- */
    async function refreshFileList() {
        fileList.innerHTML =
            '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--gh-text-muted);">Loading\u2026</td></tr>';
        try {
            const res  = await fetch('list.php', { credentials: 'same-origin' });
            if (checkAuth(res)) return;
            const data = await res.json();
            allFiles   = data.files || [];
            renderFileList('');
        } catch (_) {
            fileList.innerHTML =
                '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--gh-red);">Error loading files</td></tr>';
        }
    }

    function renderFileList(filter) {
        const items = filter
            ? allFiles.filter(f => f.name.toLowerCase().includes(filter))
            : allFiles;

        if (!items.length) {
            fileList.innerHTML =
                '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--gh-text-muted);">No files found</td></tr>';
            if (fileStatus) fileStatus.textContent = `${allFiles.length} file(s) in data/`;
            return;
        }

        fileList.innerHTML = items.map(f => `
            <tr style="border-bottom:1px solid var(--gh-border-sub);">
                <td style="padding:6px 10px;font-size:13px;">${esc(f.name)}</td>
                <td style="padding:6px 10px;color:var(--gh-text-sub);font-size:12px;">${f.size || '-'}</td>
                <td style="padding:6px 10px;color:var(--gh-text-sub);font-size:12px;">${f.modified || '-'}</td>
                <td style="padding:6px 10px;white-space:nowrap;">
                    <button class="fm-action fm-open"   data-name="${attr(f.name)}" title="Open">\uD83D\uDCC2</button>
                    <button class="fm-action fm-rename" data-name="${attr(f.name)}" title="Rename">\u270F\uFE0F</button>
                    <button class="fm-action fm-delete" data-name="${attr(f.name)}" title="Delete">\uD83D\uDDD1\uFE0F</button>
                </td>
            </tr>
        `).join('');

        if (fileStatus) fileStatus.textContent = `${items.length} of ${allFiles.length} file(s)`;

        // Bind actions
        fileList.querySelectorAll('.fm-open').forEach(b =>
            b.addEventListener('click', () => openFile(b.dataset.name)));
        fileList.querySelectorAll('.fm-rename').forEach(b =>
            b.addEventListener('click', () => renameFile(b.dataset.name)));
        fileList.querySelectorAll('.fm-delete').forEach(b =>
            b.addEventListener('click', () => deleteFile(b.dataset.name)));
    }

    /* ---------- CRUD ---------- */
    async function openFile(name) {
        try {
            const res  = await fetch(`load.php?file=${encodeURIComponent(name)}`, { credentials: 'same-origin' });
            if (checkAuth(res)) return;
            const data = await res.json();
            if (data.success) {
                editor.value        = data.content;
                filenameInput.value = data.filename;
                updatePreview();
                fileModal.close();
            }
        } catch (_) {}
    }

    async function renameFile(oldName) {
        const newName = prompt('New filename:', oldName);
        if (!newName || newName === oldName) return;
        try {
            const res  = await fetch('rename.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ oldName, newName }),
            });
            if (checkAuth(res)) return;
            const data = await res.json();
            if (data.success) {
                if (filenameInput.value === oldName) filenameInput.value = data.newName;
                refreshFileList();
            } else {
                alert('Rename failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) { alert('Error: ' + err.message); }
    }

    async function deleteFile(name) {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        try {
            const res  = await fetch('delete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ filename: name }),
            });
            if (checkAuth(res)) return;
            const data = await res.json();
            if (data.success) refreshFileList();
            else alert('Delete failed: ' + (data.error || 'Unknown error'));
        } catch (err) { alert('Error: ' + err.message); }
    }

    /* ---------- helpers ---------- */
    function esc(s)  { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function attr(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
}
