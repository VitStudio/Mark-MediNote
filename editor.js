/**
 * Markdown Editor - ES6+
 * Theme, resizable split, extended toolbar, Pomodoro, PDF export
 */
(() => {
    'use strict';

    // ===== DOM REFS =====
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview-content');
    const tooltip = document.getElementById('selection-tooltip');
    const filenameInput = document.getElementById('filename-input');
    const btnSave = document.getElementById('btn-save');
    const findModal = document.getElementById('findReplaceModal');
    const findInput = document.getElementById('find-input');
    const replaceInput = document.getElementById('replace-input');
    const findStatus = document.getElementById('find-status');

    // ===== POMODORO CLOCK (full-featured) =====
    const pomoDisplay = document.getElementById('pomodoro-display');
    const pomoStart = document.getElementById('pomo-start');
    const pomoPause = document.getElementById('pomo-pause');
    const pomoSettingsBtn = document.getElementById('pomo-settings');
    const pomoModal = document.getElementById('pomoModal');
    const pomoStatusLabel = document.getElementById('pomo-status-label');

    // Pomodoro state
    let pomoConfig = { work: 25, shortBreak: 5, longBreak: 15, sessions: 4, autoBreak: true };
    let pomoPhase = 'idle'; // idle | work | shortBreak | longBreak
    let pomoSessionCount = 0;
    let pomoRemaining = 0; // seconds left in current phase
    let pomoInterval = null;
    let pomoRunning = false;

    const formatTime = (t) => {
        const h = String(Math.floor(t / 3600)).padStart(2, '0');
        const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const s = String(t % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const updatePomoDisplay = () => {
        pomoDisplay.textContent = formatTime(pomoRemaining);
        // Color code: green=work, orange=short break, blue=long break
        if (pomoPhase === 'work') {
            pomoDisplay.style.color = '#3fb950';
        } else if (pomoPhase === 'shortBreak') {
            pomoDisplay.style.color = '#d29922';
        } else if (pomoPhase === 'longBreak') {
            pomoDisplay.style.color = '#58a6ff';
        } else {
            pomoDisplay.style.color = '';
        }
    };

    const pomoStartPhase = (phase) => {
        pomoPhase = phase;
        switch (phase) {
            case 'work':
                pomoRemaining = pomoConfig.work * 60;
                break;
            case 'shortBreak':
                pomoRemaining = pomoConfig.shortBreak * 60;
                break;
            case 'longBreak':
                pomoRemaining = pomoConfig.longBreak * 60;
                break;
        }
        updatePomoDisplay();
        updatePomoStatus();
    };

    const updatePomoStatus = () => {
        const labels = { idle: 'Ready', work: `Work (${pomoSessionCount + 1}/${pomoConfig.sessions})`, shortBreak: 'Short Break', longBreak: 'Long Break' };
        if (pomoStatusLabel) pomoStatusLabel.textContent = labels[pomoPhase] || '';
    };

    const pomoTick = () => {
        if (pomoRemaining <= 0) {
            clearInterval(pomoInterval);
            pomoRunning = false;
            pomoPause.classList.add('hidden');
            pomoStart.classList.remove('hidden');

            // Phase transition
            if (pomoPhase === 'work') {
                pomoSessionCount++;
                if (pomoSessionCount >= pomoConfig.sessions) {
                    pomoStartPhase('longBreak');
                    pomoSessionCount = 0;
                } else {
                    pomoStartPhase('shortBreak');
                }
                // Alert
                try { new Audio('data:audio/wav;base64,UklGRl9vT19teleVlfT0==').play().catch(() => {}); } catch(_) {}
                if (pomoConfig.autoBreak) { pomoStart.click(); }
            } else {
                // break ended
                pomoStartPhase('work');
                if (pomoConfig.autoBreak) { pomoStart.click(); }
            }
            return;
        }
        pomoRemaining--;
        updatePomoDisplay();
    };

    pomoStart.addEventListener('click', () => {
        if (pomoRunning) return;
        // If idle, start work
        if (pomoPhase === 'idle') {
            pomoStartPhase('work');
        }
        pomoRunning = true;
        pomoInterval = setInterval(pomoTick, 1000);
        pomoStart.classList.add('hidden');
        pomoPause.classList.remove('hidden');
        updatePomoStatus();
    });

    pomoPause.addEventListener('click', () => {
        if (!pomoRunning) return;
        pomoRunning = false;
        clearInterval(pomoInterval);
        pomoPause.classList.add('hidden');
        pomoStart.classList.remove('hidden');
    });

    // Settings modal
    pomoSettingsBtn.addEventListener('click', () => {
        document.getElementById('pomo-work-min').value = pomoConfig.work;
        document.getElementById('pomo-break-min').value = pomoConfig.shortBreak;
        document.getElementById('pomo-longbreak-min').value = pomoConfig.longBreak;
        document.getElementById('pomo-sessions').value = pomoConfig.sessions;
        document.getElementById('pomo-auto-break').checked = pomoConfig.autoBreak;
        updatePomoStatus();
        pomoModal.showModal();
    });

    document.getElementById('pomo-save-settings').addEventListener('click', () => {
        pomoConfig.work = Math.max(1, parseInt(document.getElementById('pomo-work-min').value) || 25);
        pomoConfig.shortBreak = Math.max(1, parseInt(document.getElementById('pomo-break-min').value) || 5);
        pomoConfig.longBreak = Math.max(1, parseInt(document.getElementById('pomo-longbreak-min').value) || 15);
        pomoConfig.sessions = Math.max(1, parseInt(document.getElementById('pomo-sessions').value) || 4);
        pomoConfig.autoBreak = document.getElementById('pomo-auto-break').checked;
        // If idle, update display for new work time
        if (pomoPhase === 'idle') {
            pomoRemaining = pomoConfig.work * 60;
            updatePomoDisplay();
        }
        pomoModal.close();
    });

    document.getElementById('pomo-reset-btn').addEventListener('click', () => {
        clearInterval(pomoInterval);
        pomoRunning = false;
        pomoPhase = 'idle';
        pomoSessionCount = 0;
        pomoRemaining = 0;
        pomoDisplay.textContent = '00:00:00';
        pomoDisplay.style.color = '';
        pomoPause.classList.add('hidden');
        pomoStart.classList.remove('hidden');
        updatePomoStatus();
        pomoModal.close();
    });

    // Init display
    updatePomoStatus();

    // ===== MARKDOWN FORMATTING =====
    const WRAPPERS = {
        bold: ['**', '**'],
        italic: ['*', '*'],
        strikethrough: ['~~', '~~'],
        code: ['`', '`'],
        highlight: ['==', '=='],
        link: ['[', '](url)'],
        h1: ['# ', ''], h2: ['## ', ''], h3: ['### ', ''],
        h4: ['#### ', ''], h5: ['##### ', ''], h6: ['###### ', ''],
        quote: ['> ', ''],
        ul: ['- ', ''],
        ol: ['1. ', ''],
        subscript: ['~', '~'],
        superscript: ['^', '^'],
    };

    const BLOCK_INSERT = {
        h1: '\n# ', h2: '\n## ', h3: '\n### ',
        h4: '\n#### ', h5: '\n##### ', h6: '\n###### ',
        quote: '\n> ',
        ul: '\n- ', ol: '\n1. ',
        tasklist: '\n- [ ] ',
        codeblock: '\n```\n\n```\n',
        hr: '\n---\n',
        table: '\n| Col1 | Col2 | Col3 |\n|------|------|------|\n|      |      |      |\n',
        image: '![alt](url)',
        link: '[text](url)',
        footnote: '[^1]\n\n[^1]: ',
        subscript: '~text~',
        superscript: '^text^',
        highlight: '==text==',
    };

    // ===== LIVE PREVIEW =====
    const updatePreview = () => {
        const text = editor.value;
        if (!text) {
            preview.innerHTML = '<p style="color:var(--gh-text-muted); font-style:italic;">Preview will appear here...</p>';
            return;
        }
        let html = marked.parse(text);
        // Post-process: ==highlight==, ~sub~, ^sup^ (simple patterns)
        html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');
        html = html.replace(/(?<!\w)~([^~]+)~(?!\w)/g, '<sub>$1</sub>');
        html = html.replace(/(?<!\w)\^([^^]+)\^(?!\w)/g, '<sup>$1</sup>');
        // Task list checkboxes
        html = html.replace(/<li>\s*\[ \]/g, '<li><input type="checkbox" disabled>');
        html = html.replace(/<li>\s*\[x\]/gi, '<li><input type="checkbox" checked disabled>');
        preview.innerHTML = html;
    };

    editor.addEventListener('input', updatePreview);
    editor.addEventListener('paste', () => setTimeout(updatePreview, 0));
    updatePreview();

    // ===== SELECTION HELPERS =====
    const getSelection = () => ({
        start: editor.selectionStart,
        end: editor.selectionEnd,
        text: editor.value.substring(editor.selectionStart, editor.selectionEnd),
    });
    const setSelection = (start, end) => {
        const st = editor.scrollTop;
        editor.focus({ preventScroll: true });
        editor.setSelectionRange(start, end);
        editor.scrollTop = st;
    };

    const wrapSelection = (type) => {
        const scrollTop = editor.scrollTop;
        const { start, end, text } = getSelection();
        const [open, close] = WRAPPERS[type];
        const replacement = open + (text || 'text') + close;
        const before = editor.value.substring(0, start);
        const after = editor.value.substring(end);
        editor.value = before + replacement + after;
        setSelection(start + open.length, start + open.length + (text || 'text').length);
        editor.scrollTop = scrollTop;
        updatePreview();
    };

    const insertAtCursor = (type) => {
        const scrollTop = editor.scrollTop;
        const { start, end } = getSelection();
        const insert = BLOCK_INSERT[type] || '';
        const before = editor.value.substring(0, start);
        const after = editor.value.substring(end);
        editor.value = before + insert + after;
        setSelection(start + insert.length, start + insert.length);
        editor.scrollTop = scrollTop;
        updatePreview();
    };

    // ===== TOOLBAR BUTTONS =====
    document.querySelectorAll('[data-insert]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // prevent focus steal
        btn.addEventListener('click', () => {
            const action = btn.dataset.insert;
            WRAPPERS[action] ? wrapSelection(action) : insertAtCursor(action);
        });
    });

    // ===== SELECTION TOOLTIP =====
    const showTooltip = (x, y) => {
        tooltip.classList.add('visible');
        tooltip.style.left = `${Math.max(8, Math.min(x - 80, window.innerWidth - 360))}px`;
        tooltip.style.top = `${Math.max(8, y - 48)}px`;
    };
    const hideTooltip = () => tooltip.classList.remove('visible');

    editor.addEventListener('mouseup', (e) => {
        getSelection().text ? showTooltip(e.clientX, e.clientY) : hideTooltip();
    });
    editor.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') return;
        const { text } = getSelection();
        if (text) {
            const r = editor.getBoundingClientRect();
            showTooltip(r.left + r.width / 2, r.top + r.height / 2);
        } else hideTooltip();
    });
    editor.addEventListener('blur', () => setTimeout(hideTooltip, 150));

    tooltip.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapSelection(btn.dataset.action);
            hideTooltip();
        });
    });

    // ===== FUZZY FIND / REPLACE =====
    let findMatches = [], currentMatchIndex = -1;

    const fuzzyFind = (query) => {
        if (!query.trim()) return [];
        const text = editor.value;
        const results = [];
        let pos = 0;
        while ((pos = text.indexOf(query, pos)) !== -1) {
            results.push({ start: pos, end: pos + query.length, text: text.substring(pos, pos + query.length) });
            pos += query.length;
        }
        if (results.length === 0 && query.length >= 2) {
            const lines = text.split('\n');
            const fuse = new Fuse(lines, { threshold: 0.5, includeMatches: true });
            fuse.search(query).forEach(({ item, refIndex, matches }) => {
                const lineStart = lines.slice(0, refIndex).join('\n').length;
                matches?.forEach(({ indices }) => {
                    indices.forEach(([a, b]) => {
                        results.push({ start: lineStart + a, end: lineStart + Math.min(b + 1, item.length), text: text.substring(lineStart + a, lineStart + Math.min(b + 1, item.length)) });
                    });
                });
            });
        }
        return results;
    };

    const highlightMatch = (idx) => {
        if (!findMatches.length) return;
        currentMatchIndex = ((idx % findMatches.length) + findMatches.length) % findMatches.length;
        const m = findMatches[currentMatchIndex];
        setSelection(m.start, m.end);
        findStatus.textContent = `${currentMatchIndex + 1} / ${findMatches.length}`;
    };

    const doReplace = (match, replacement) => {
        const before = editor.value.substring(0, match.start);
        const after = editor.value.substring(match.end);
        editor.value = before + replacement + after;
        const diff = replacement.length - (match.end - match.start);
        findMatches = findMatches.map(m => {
            if (m.start > match.end) return { ...m, start: m.start + diff, end: m.end + diff };
            if (m.start >= match.start && m.end <= match.end) return null;
            return m;
        }).filter(Boolean);
        updatePreview();
    };

    document.getElementById('btn-find').addEventListener('click', () => { findModal.showModal(); findInput.focus(); findInput.value = getSelection().text || findInput.value; });
    document.getElementById('btn-replace').addEventListener('click', () => { findModal.showModal(); findInput.focus(); });
    document.getElementById('btn-close-modal').addEventListener('click', () => findModal.close());
    findInput.addEventListener('input', () => { findMatches = fuzzyFind(findInput.value); currentMatchIndex = -1; findStatus.textContent = findMatches.length ? `${findMatches.length} match(es)` : 'No matches'; });
    document.getElementById('btn-find-next').addEventListener('click', () => { findMatches = fuzzyFind(findInput.value); if (findMatches.length) highlightMatch(currentMatchIndex + 1); });
    document.getElementById('btn-find-prev').addEventListener('click', () => { findMatches = fuzzyFind(findInput.value); if (findMatches.length) highlightMatch(currentMatchIndex - 1); });
    document.getElementById('btn-replace-one').addEventListener('click', () => { findMatches = fuzzyFind(findInput.value); if (findMatches.length && currentMatchIndex >= 0) { doReplace(findMatches[currentMatchIndex], replaceInput.value); findMatches = fuzzyFind(findInput.value); highlightMatch(currentMatchIndex); } });
    document.getElementById('btn-replace-all').addEventListener('click', () => { findMatches = fuzzyFind(findInput.value); let c = 0; findMatches.slice().reverse().forEach(m => { doReplace(m, replaceInput.value); c++; }); findStatus.textContent = `Replaced ${c}`; findMatches = []; });

    // ===== KEYBOARD SHORTCUTS =====
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's': e.preventDefault(); btnSave.click(); break;
                case 'f': e.preventDefault(); document.getElementById('btn-find').click(); break;
                case 'h': e.preventDefault(); document.getElementById('btn-replace').click(); break;
                case 'o': e.preventDefault(); document.getElementById('btn-open')?.click(); break;
                case 'b': e.preventDefault(); wrapSelection('bold'); break;
                case 'i': e.preventDefault(); wrapSelection('italic'); break;
            }
        }
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && document.activeElement?.id !== 'editor') {
            document.getElementById('helpModal')?.showModal();
        }
    });

    // ===== SAVE .MD =====
    const SAVE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>`;

    btnSave.addEventListener('click', async () => {
        const filename = filenameInput.value.trim() || 'document';
        try {
            const res = await fetch('save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editor.value, filename }),
            });
            const data = await res.json();
            if (data.success) {
                filenameInput.value = data.filename;
                btnSave.style.background = '#238636';
                btnSave.innerHTML = `${SAVE_ICON} <span class="text-xs">Saved!</span>`;
                setTimeout(() => {
                    btnSave.style.background = '';
                    btnSave.innerHTML = `${SAVE_ICON} <span class="hidden sm:inline">.md</span>`;
                }, 1800);
            } else alert('Error: ' + (data.error || 'Failed'));
        } catch (err) { alert('Error: ' + err.message); }
    });

    filenameInput.value = 'document.md';

    // ===== OPEN SAVED FILES (fixed) =====
    const openDropdown = document.getElementById('open-dropdown');
    const openList = document.getElementById('open-list');
    let dropdownOpen = false;

    const closeDropdown = () => { openDropdown.classList.remove('open'); dropdownOpen = false; };
    const toggleDropdown = () => {
        if (dropdownOpen) { closeDropdown(); return; }
        openDropdown.classList.add('open');
        dropdownOpen = true;
        refreshOpenList();
    };

    document.getElementById('btn-open').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (dropdownOpen && !document.getElementById('open-wrapper').contains(e.target)) {
            closeDropdown();
        }
    });

    const refreshOpenList = async () => {
        openList.innerHTML = '<div class="gh-dropdown-empty">Loading...</div>';
        try {
            const res = await fetch('list.php');
            const { files } = await res.json();
            openList.innerHTML = '';
            if (!files || files.length === 0) {
                openList.innerHTML = '<div class="gh-dropdown-empty">No saved files in data/</div>';
                return;
            }
            files.forEach(f => {
                const btn = document.createElement('button');
                btn.className = 'gh-dropdown-item';
                btn.textContent = f;
                btn.addEventListener('click', async () => {
                    try {
                        const r = await fetch(`load.php?file=${encodeURIComponent(f)}`);
                        const d = await r.json();
                        if (d.success) {
                            editor.value = d.content;
                            filenameInput.value = d.filename;
                            updatePreview();
                        }
                    } catch (_) {}
                    closeDropdown();
                });
                openList.appendChild(btn);
            });
        } catch (_) {
            openList.innerHTML = '<div class="gh-dropdown-empty">Error loading files</div>';
        }
    };

    // Also refresh after save
    btnSave.addEventListener('click', () => { if (dropdownOpen) setTimeout(refreshOpenList, 600); });

    // ===== HELP =====
    document.getElementById('btn-help')?.addEventListener('click', () => document.getElementById('helpModal').showModal());

    // ===== PDF EXPORT =====
    // Standalone CSS for PDF rendering (hex/rgb ONLY — zero oklch, zero CSS vars)
    const PDF_CSS = `
        *, *::before, *::after {
            box-sizing: border-box !important;
            border-color: #d1d9e0 !important;
        }
        html, body {
            margin: 0 !important; padding: 0 !important;
            background: #ffffff !important; color: #1f2328 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
            font-size: 12pt !important; line-height: 1.6 !important;
            border: none !important;
        }
        #pdf-root { padding: 12mm 16mm; color: #1f2328 !important; background: #fff !important; }
        h1, h2, h3, h4, h5, h6, p, li, td, th, span, div, blockquote, figcaption, label, summary, dt, dd, strong, em, a, code, pre
            { color: #1f2328 !important; border-color: #d1d9e0 !important; }
        h1 { font-size: 2em !important; font-weight: 700 !important; border-bottom: 1px solid #d1d9e0 !important; padding-bottom: .3em !important; margin: 24px 0 16px !important; }
        h2 { font-size: 1.5em !important; font-weight: 600 !important; border-bottom: 1px solid #d1d9e0 !important; padding-bottom: .3em !important; margin: 24px 0 16px !important; }
        h3 { font-size: 1.25em !important; font-weight: 600 !important; margin: 24px 0 16px !important; }
        h4 { font-size: 1em !important; font-weight: 600 !important; margin: 24px 0 16px !important; }
        h5 { font-size: .875em !important; font-weight: 600 !important; margin: 24px 0 16px !important; }
        h6 { font-size: .85em !important; font-weight: 600 !important; margin: 24px 0 16px !important; color: #656d76 !important; }
        p  { margin: 0 0 16px !important; }
        a  { color: #0969da !important; text-decoration: none !important; }
        pre { padding: 16px !important; border-radius: 6px !important; overflow-x: auto !important; background: #f6f8fa !important;
              font-size: 13px !important; line-height: 1.45 !important; border: 1px solid #d1d9e0 !important; }
        code { background: #eff2f5 !important; padding: .2em .4em !important; border-radius: 4px !important;
               font-size: .85em !important; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace !important; }
        pre code { background: none !important; padding: 0 !important; border: none !important; font-size: inherit !important; }
        blockquote { border-left: 3px solid #d1d9e0 !important; padding: 0 1em !important; margin: 0 0 16px !important; color: #656d76 !important; }
        table { border-collapse: collapse !important; width: 100% !important; margin: 0 0 16px !important; }
        th, td { border: 1px solid #d1d9e0 !important; padding: 6px 13px !important; text-align: left !important; }
        th { font-weight: 600 !important; background: #f6f8fa !important; }
        tr:nth-child(2n) { background: #f6f8fa !important; }
        ul, ol { padding-left: 2em !important; margin: 0 0 16px !important; }
        li { margin: 4px 0 !important; }
        img { max-width: 100% !important; border-radius: 6px !important; }
        hr { border: none !important; border-top: 2px solid #d1d9e0 !important; margin: 24px 0 !important; }
        mark { background: #fff8c5 !important; color: #1f2328 !important; padding: .1em .2em !important; border-radius: 2px !important; }
        sub, sup { font-size: .75em !important; }
        input[type="checkbox"] { margin-right: 6px !important; }
    `;

    document.getElementById('btn-pdf')?.addEventListener('click', async () => {
        if (typeof html2pdf === 'undefined') { alert('PDF library not loaded.'); return; }
        let rawHtml = editor.value ? marked.parse(editor.value) : '<p>No content.</p>';
        // Post-process same as preview
        rawHtml = rawHtml.replace(/==([^=]+)==/g, '<mark>$1</mark>');
        rawHtml = rawHtml.replace(/(?<!\w)~([^~]+)~(?!\w)/g, '<sub>$1</sub>');
        rawHtml = rawHtml.replace(/(?<!\w)\^([^^]+)\^(?!\w)/g, '<sup>$1</sup>');
        rawHtml = rawHtml.replace(/<li>\s*\[ \]/g, '<li>&#9744; ');
        rawHtml = rawHtml.replace(/<li>\s*\[x\]/gi, '<li>&#9745; ');

        // Show loading overlay (hides visual flash when stylesheets are disabled)
        const overlay = document.createElement('div');
        overlay.id = 'pdf-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0d1117;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div style="text-align:center;color:#e6edf3;font-family:system-ui,sans-serif;"><div style="font-size:18px;font-weight:600;margin-bottom:8px;">Generating PDF...</div><div style="font-size:13px;color:#8b949e;">Please wait</div></div>';
        document.body.appendChild(overlay);

        // Wait so overlay is painted before disabling stylesheets
        await new Promise(r => setTimeout(r, 100));

        // ---- REMOVE all stylesheets that contain oklch() ----
        const disabledLinks = [];
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (!link.disabled) { link.disabled = true; disabledLinks.push(link); }
        });
        // Remove <style> elements from DOM entirely (disabled prop unreliable on <style>)
        const removedStyles = [];
        document.querySelectorAll('style').forEach(st => {
            if (st.id === 'pdf-temp-style') return;
            removedStyles.push({ el: st, parent: st.parentNode, next: st.nextSibling });
            st.remove();
        });

        // Inject our clean hex-only PDF stylesheet
        const tempStyle = document.createElement('style');
        tempStyle.id = 'pdf-temp-style';
        tempStyle.textContent = PDF_CSS;
        document.head.appendChild(tempStyle);

        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.id = 'pdf-root';
        wrapper.innerHTML = rawHtml;
        wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:#fff;';
        document.body.appendChild(wrapper);

        // Force reflow so computed styles recalculate with only our hex CSS
        void wrapper.offsetHeight;

        const fname = (filenameInput.value.trim() || 'document').replace(/\.md$/i, '') + '.pdf';
        try {
            await html2pdf().set({
                margin: [10, 10, 10, 10],
                filename: fname,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            }).from(wrapper).save();
        } catch (err) { alert('PDF failed: ' + err.message); }

        // ---- RESTORE all stylesheets ----
        document.body.removeChild(wrapper);
        document.head.removeChild(tempStyle);
        disabledLinks.forEach(link => { link.disabled = false; });
        removedStyles.forEach(({ el, parent, next }) => {
            if (next && next.parentNode === parent) parent.insertBefore(el, next);
            else parent.appendChild(el);
        });

        // Remove overlay
        document.body.removeChild(overlay);
    });

    // ===== RESIZE HANDLE =====
    const handle = document.getElementById('resize-handle');
    const panelPreview = document.getElementById('panel-preview');
    const panelEditor = document.getElementById('panel-editor');
    const mainSplit = document.getElementById('main-split');
    let resizing = false;

    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });

    function startResize(e) {
        e.preventDefault();
        resizing = true;
        handle.classList.add('active');
        document.body.style.cursor = isHorizontal() ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', doResize);
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
    }

    function isHorizontal() { return window.innerWidth >= 768; }

    function doResize(e) {
        if (!resizing) return;
        e.preventDefault();
        const rect = mainSplit.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (isHorizontal()) {
            const offset = clientX - rect.left;
            const total = rect.width;
            const pct = Math.max(15, Math.min(85, (offset / total) * 100));
            panelPreview.style.flex = 'none';
            panelPreview.style.width = pct + '%';
            panelEditor.style.flex = 'none';
            panelEditor.style.width = (100 - pct) + '%';
        } else {
            const offset = clientY - rect.top;
            const total = rect.height;
            const pct = Math.max(15, Math.min(85, (offset / total) * 100));
            panelPreview.style.flex = 'none';
            panelPreview.style.height = pct + '%';
            panelEditor.style.flex = 'none';
            panelEditor.style.height = (100 - pct) + '%';
        }
    }

    function stopResize() {
        resizing = false;
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);
    }

    // Reset sizing on orientation change
    window.addEventListener('resize', () => {
        panelPreview.style.flex = '';
        panelPreview.style.width = '';
        panelPreview.style.height = '';
        panelEditor.style.flex = '';
        panelEditor.style.width = '';
        panelEditor.style.height = '';
    });

    // ===== TOPBAR SPACER AUTO-HEIGHT =====
    const syncSpacer = () => {
        const bar = document.getElementById('topbar');
        const spacer = document.getElementById('topbar-spacer');
        if (bar && spacer) spacer.style.height = bar.offsetHeight + 'px';
    };
    window.addEventListener('resize', syncSpacer);
    syncSpacer();
    setTimeout(syncSpacer, 300);
})();
