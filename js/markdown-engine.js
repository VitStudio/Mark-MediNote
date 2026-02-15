/**
 * Markdown Engine — parsing + extensions
 * KaTeX math, Mermaid diagrams, SmartyPants typography
 * Live rendering with scroll-position preservation + debounce
 */

let editor, preview, previewBody;
let _updateTimer = null;

/** SmartyPants: light typography post-processing (skips code/pre blocks) */
function smartypants(html) {
    const parts = html.split(/(<(?:code|pre)[^>]*>[\s\S]*?<\/(?:code|pre)>)/gi);
    return parts.map((part, i) => {
        if (i % 2 === 1) return part; // inside code/pre — leave as-is
        return part
            .replace(/---/g, '\u2014')   // em dash
            .replace(/--/g, '\u2013')    // en dash
            .replace(/\.\.\./g, '\u2026'); // ellipsis
    }).join('');
}

/**
 * Render markdown text to HTML string (pure, no DOM side effects).
 * Used by preview and PDF export.
 */
export function renderMarkdown(text) {
    if (!text) return '';
    let html = marked.parse(text);

    // SmartyPants typography
    html = smartypants(html);

    // Custom inline extensions — order matters
    // Highlight ==text==
    html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');

    // Subscript: ~text~ (but NOT ~~strikethrough~~)
    // Use negative lookbehind/ahead for ~
    html = html.replace(/(?<!~)~(?!~)([^~\n]+?)~(?!~)/g, '<sub>$1</sub>');

    // Superscript: ^text^ (but not inside code/pre, avoid ^^)
    html = html.replace(/(?<!\^)\^(?!\^)([^^\n]+?)\^(?!\^)/g, '<sup>$1</sup>');

    // Task-list checkboxes
    html = html.replace(/<li>\s*\[ \]/g, '<li><input type="checkbox" disabled>');
    html = html.replace(/<li>\s*\[x\]/gi, '<li><input type="checkbox" checked disabled>');

    // Mermaid: swap fenced code blocks for <div class="mermaid">
    html = html.replace(
        /<pre><code\s+class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
        (_, code) =>
            `<div class="mermaid">${code
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')}</div>`
    );

    return html;
}

/**
 * Render markdown, set preview innerHTML, then run KaTeX + Mermaid.
 * Preserves the preview panel scroll position for flicker-free live updates.
 */
export function updatePreview() {
    const text = editor.value;
    if (!text) {
        preview.innerHTML =
            '<p style="color:var(--gh-text-muted); font-style:italic;">Preview will appear here\u2026</p>';
        return;
    }

    // Save scroll position of the preview panel body
    const scrollTop = previewBody ? previewBody.scrollTop : 0;

    preview.innerHTML = renderMarkdown(text);

    // Restore scroll position
    if (previewBody) previewBody.scrollTop = scrollTop;

    // KaTeX math rendering
    if (typeof renderMathInElement !== 'undefined') {
        try {
            renderMathInElement(preview, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                ],
                throwOnError: false,
            });
        } catch (_) {}
    }

    // Mermaid diagram rendering
    if (typeof mermaid !== 'undefined') {
        const nodes = preview.querySelectorAll('.mermaid');
        if (nodes.length) {
            try { mermaid.run({ nodes }); } catch (_) {}
        }
    }
}

/**
 * Debounced live update — reduces flicker during fast typing.
 */
function requestUpdate() {
    if (_updateTimer) clearTimeout(_updateTimer);
    _updateTimer = setTimeout(updatePreview, 40);
}

/**
 * Initialize the markdown engine — call once on page load.
 */
export function initMarkdown() {
    editor     = document.getElementById('editor');
    preview    = document.getElementById('preview-content');
    previewBody = preview?.closest('.panel-body') || preview?.parentElement;

    // Configure marked: GFM + breaks (single newline → <br>)
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            gfm: true,
            breaks: true,       // ← FIX: single newlines become <br>
        });
    }

    // Configure Mermaid for dark theme
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                darkMode: true,
                background: '#0d1117',
                primaryColor: '#1f6feb',
                primaryTextColor: '#e6edf3',
                primaryBorderColor: '#30363d',
                lineColor: '#8b949e',
                secondaryColor: '#161b22',
                tertiaryColor: '#21262d',
            },
        });
    }

    // Live preview on input — debounced for smooth rendering
    editor.addEventListener('input', requestUpdate);
    editor.addEventListener('paste', () => setTimeout(updatePreview, 0));
    updatePreview();
}
