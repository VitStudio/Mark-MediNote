/**
 * Editor Core — toolbar actions, selection helpers, keyboard shortcuts,
 *               tooltip, auto-continue lists on Enter
 */

import { updatePreview } from './markdown-engine.js';

/* ===== FORMATTING MAPS ===== */
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
    subscript_insert: '~subscript~',
    superscript_insert: '^superscript^',
    highlight_insert: '==highlighted==',
    math_inline: '$E = mc^2$',
    math_display: '\n$$\n\\sum_{i=1}^{n} x_i\n$$\n',
    mermaid: '\n```mermaid\ngraph TD\n    A[Start] --> B[Process] --> C[End]\n```\n',
};

let editor;

/* ===== SELECTION HELPERS ===== */

export function getSelection() {
    return {
        start: editor.selectionStart,
        end: editor.selectionEnd,
        text: editor.value.substring(editor.selectionStart, editor.selectionEnd),
    };
}

export function setSelection(start, end) {
    const st = editor.scrollTop;
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(start, end);
    editor.scrollTop = st;
}

export function wrapSelection(type) {
    const scrollTop = editor.scrollTop;
    const { start, end, text } = getSelection();
    const [open, close] = WRAPPERS[type];
    const replacement = open + (text || 'text') + close;
    const before = editor.value.substring(0, start);
    const after  = editor.value.substring(end);
    editor.value = before + replacement + after;
    setSelection(start + open.length, start + open.length + (text || 'text').length);
    editor.scrollTop = scrollTop;
    updatePreview();
}

export function insertAtCursor(type) {
    const scrollTop = editor.scrollTop;
    const { start, end } = getSelection();
    const insert = BLOCK_INSERT[type] || '';
    const before = editor.value.substring(0, start);
    const after  = editor.value.substring(end);
    editor.value = before + insert + after;
    setSelection(start + insert.length, start + insert.length);
    editor.scrollTop = scrollTop;
    updatePreview();
}

/* ===== AUTO-CONTINUE LISTS ===== */
/**
 * When the user presses Enter at the end of a list line,
 * automatically insert the next bullet/number prefix.
 * If the current bullet is empty (just the prefix), remove it instead.
 */
function handleListContinuation(e) {
    if (e.key !== 'Enter') return;

    const pos = editor.selectionStart;
    const val = editor.value;

    // Find the current line
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const line = val.substring(lineStart, pos);

    // Patterns to match list prefixes
    const patterns = [
        { regex: /^(\s*)- \[[ x]\] (.+)$/i, gen: (m) => `${m[1]}- [ ] ` },   // task list with content
        { regex: /^(\s*)- \[[ x]\] $/i,      gen: null },                        // empty task → remove
        { regex: /^(\s*)[-*+] (.+)$/,        gen: (m) => `${m[1]}- ` },         // unordered with content
        { regex: /^(\s*)[-*+] $/,            gen: null },                         // empty unordered → remove
        { regex: /^(\s*)(\d+)\. (.+)$/,      gen: (m) => `${m[1]}${+m[2]+1}. ` }, // ordered with content
        { regex: /^(\s*)(\d+)\. $/,          gen: null },                         // empty ordered → remove
        { regex: /^(\s*)> (.+)$/,            gen: (m) => `${m[1]}> ` },           // blockquote continuation
        { regex: /^(\s*)> $/,                gen: null },                          // empty quote → remove
    ];

    for (const { regex, gen } of patterns) {
        const match = line.match(regex);
        if (!match) continue;

        e.preventDefault();
        const scrollTop = editor.scrollTop;

        if (gen === null) {
            // Empty list item → remove the prefix (go back to plain line)
            editor.value = val.substring(0, lineStart) + val.substring(pos);
            setSelection(lineStart, lineStart);
        } else {
            // Insert newline + continuation prefix
            const prefix = gen(match);
            const insert = '\n' + prefix;
            editor.value = val.substring(0, pos) + insert + val.substring(pos);
            const newPos = pos + insert.length;
            setSelection(newPos, newPos);
        }

        editor.scrollTop = scrollTop;
        updatePreview();
        return;
    }
}

/* ===== TAB INDENT / UNINDENT for lists ===== */
function handleTabInList(e) {
    if (e.key !== 'Tab') return;

    const pos = editor.selectionStart;
    const val = editor.value;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const line = val.substring(lineStart, val.indexOf('\n', pos) === -1 ? val.length : val.indexOf('\n', pos));

    // Only handle Tab inside list lines
    if (!/^\s*[-*+\d]/.test(line)) return;

    e.preventDefault();
    const scrollTop = editor.scrollTop;

    if (e.shiftKey) {
        // Unindent: remove up to 4 spaces or 1 tab
        const stripped = line.replace(/^(\t| {1,4})/, '');
        const diff = line.length - stripped.length;
        editor.value = val.substring(0, lineStart) + stripped + val.substring(lineStart + line.length);
        setSelection(Math.max(lineStart, pos - diff), Math.max(lineStart, pos - diff));
    } else {
        // Indent: add 4 spaces
        editor.value = val.substring(0, lineStart) + '    ' + val.substring(lineStart);
        setSelection(pos + 4, pos + 4);
    }

    editor.scrollTop = scrollTop;
    updatePreview();
}

/* ===== INIT ===== */

export function initEditorCore() {
    editor = document.getElementById('editor');
    const tooltip = document.getElementById('selection-tooltip');

    // --- Toolbar buttons ---
    document.querySelectorAll('[data-insert]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            const action = btn.dataset.insert;
            WRAPPERS[action] ? wrapSelection(action) : insertAtCursor(action);
        });
    });

    // --- Auto-continue lists & Tab indent ---
    editor.addEventListener('keydown', handleListContinuation);
    editor.addEventListener('keydown', handleTabInList);

    // --- Selection tooltip ---
    const showTooltip = (x, y) => {
        tooltip.classList.add('visible');
        tooltip.style.left = `${Math.max(8, Math.min(x - 80, window.innerWidth - 360))}px`;
        tooltip.style.top  = `${Math.max(8, y - 48)}px`;
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

    // --- Keyboard shortcuts ---
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 's': e.preventDefault(); document.getElementById('btn-save')?.click(); break;
                case 'f': e.preventDefault(); document.getElementById('btn-find')?.click(); break;
                case 'h': e.preventDefault(); document.getElementById('btn-find')?.click(); break;
                case 'o': e.preventDefault(); document.getElementById('btn-open')?.click(); break;
                case 'b': e.preventDefault(); wrapSelection('bold'); break;
                case 'i': e.preventDefault(); wrapSelection('italic'); break;
            }
            if (e.shiftKey) {
                if (e.key === 'P' || e.key === 'p') {
                    e.preventDefault();
                    document.getElementById('toggle-preview')?.click();
                }
                if (e.key === 'E' || e.key === 'e') {
                    e.preventDefault();
                    document.getElementById('toggle-editor')?.click();
                }
            }
        }
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && document.activeElement?.id !== 'editor') {
            document.getElementById('helpModal')?.showModal();
        }
    });
}
