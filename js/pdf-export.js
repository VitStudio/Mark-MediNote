/**
 * PDF Export — renders inside an isolated iframe to avoid oklch() errors.
 *
 * Strategy:
 *   The main page uses TailwindCSS browser plugin which injects oklch() colours.
 *   html2canvas (used by html2pdf.js) can't parse oklch() and throws.
 *   FIX: build a self-contained iframe with ONLY hex/rgb CSS, load html2pdf
 *   inside it, generate the PDF there, then tear the iframe down.
 *   The iframe has zero TailwindCSS / DaisyUI, so html2canvas is happy.
 */

import { renderMarkdown } from './markdown-engine.js';

/* ---------- hex-only stylesheet for the iframe ---------- */
const PDF_CSS = `
*, *::before, *::after {
    box-sizing: border-box;
    border-color: #d1d9e0;
}
html, body {
    margin: 0; padding: 0;
    background: #ffffff; color: #1f2328;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 16px; line-height: 1.6;
}
#pdf-root {
    padding: 40px 50px;
    color: #1f2328;
    background: #fff;
}
h1,h2,h3,h4,h5,h6,p,li,td,th,span,div,blockquote,
figcaption,label,summary,dt,dd,strong,em,a,code,pre,mark,sub,sup {
    color: #1f2328;
    border-color: #d1d9e0;
}
h1 { font-size:2em; font-weight:700;
     border-bottom:1px solid #d1d9e0; padding-bottom:.3em;
     margin:24px 0 16px; }
h2 { font-size:1.5em; font-weight:600;
     border-bottom:1px solid #d1d9e0; padding-bottom:.3em;
     margin:24px 0 16px; }
h3 { font-size:1.25em; font-weight:600; margin:24px 0 16px; }
h4 { font-size:1em; font-weight:600; margin:24px 0 16px; }
h5 { font-size:.875em; font-weight:600; margin:24px 0 16px; }
h6 { font-size:.85em; font-weight:600; margin:24px 0 16px; color:#656d76; }
p  { margin:0 0 16px; }
a  { color:#0969da; text-decoration:none; }
strong { font-weight: 700; }
em { font-style: italic; }
s, del { text-decoration: line-through; }
pre { padding:16px; border-radius:6px; overflow-x:auto;
      background:#f6f8fa; font-size:13px; line-height:1.45;
      border:1px solid #d1d9e0; white-space:pre-wrap; word-break:break-word; }
code { background:#eff2f5; padding:.2em .4em;
       border-radius:4px; font-size:.85em;
       font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace; }
pre code { background:none; padding:0; border:none; font-size:inherit; }
blockquote { border-left:3px solid #d1d9e0; padding:0 1em;
             margin:0 0 16px; color:#656d76; }
table { border-collapse:collapse; width:100%; margin:0 0 16px; }
th,td { border:1px solid #d1d9e0; padding:6px 13px; text-align:left; }
th { font-weight:600; background:#f6f8fa; }
tr:nth-child(2n) { background:#f6f8fa; }
ul,ol { padding-left:2em; margin:0 0 16px; }
li { margin:4px 0; }
img { max-width:100%; border-radius:6px; }
hr { border:none; border-top:2px solid #d1d9e0; margin:24px 0; }
mark { background:#fff8c5; color:#1f2328; padding:.1em .2em; border-radius:2px; }
sub { vertical-align:sub; font-size:.75em; }
sup { vertical-align:super; font-size:.75em; }
input[type="checkbox"] { margin-right:6px; }
.katex { font-size:1.1em; color:#1f2328; }
.katex-display { margin:16px 0; }
.mermaid svg { max-width:100%; }
`;

/* URL for html2pdf (same CDN as the main page) */
const HTML2PDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
/* KaTeX CSS (for math rendering in PDF) */
const KATEX_CSS_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';

export function initPdfExport() {
    const editor        = document.getElementById('editor');
    const filenameInput = document.getElementById('filename-input');

    document.getElementById('btn-pdf')?.addEventListener('click', async () => {
        let rawHtml = editor.value ? renderMarkdown(editor.value) : '<p>No content.</p>';
        // Checkbox → unicode for print
        rawHtml = rawHtml.replace(/<li><input type="checkbox" disabled>/g,         '<li>&#9744; ');
        rawHtml = rawHtml.replace(/<li><input type="checkbox" checked disabled>/g, '<li>&#9745; ');

        const fname = (filenameInput.value.trim() || 'document').replace(/\.md$/i, '') + '.pdf';

        /* ---- overlay ---- */
        const overlay = document.createElement('div');
        overlay.id = 'pdf-overlay';
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:9999;background:#0d1117;' +
            'display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML =
            '<div style="text-align:center;color:#e6edf3;font-family:system-ui,sans-serif;">' +
            '<div style="font-size:18px;font-weight:600;margin-bottom:8px;">Generating PDF\u2026</div>' +
            '<div style="font-size:13px;color:#8b949e;">Please wait</div></div>';
        document.body.appendChild(overlay);

        try {
            await generateInIframe(rawHtml, fname);
        } catch (err) {
            alert('PDF failed: ' + err.message);
        }

        overlay.remove();
    });
}

/**
 * Spin up a hidden same-origin iframe, write the HTML + a clean stylesheet,
 * load html2pdf inside it, generate + trigger download, then tear down.
 */
function generateInIframe(htmlContent, filename) {
    return new Promise((resolve, reject) => {
        /* ---- create iframe ---- */
        const iframe = document.createElement('iframe');
        iframe.style.cssText =
            'position:fixed;left:0;top:0;width:794px;height:100vh;' +
            'border:none;z-index:9998;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);

        const iDoc = iframe.contentDocument || iframe.contentWindow.document;

        /* ---- listen for completion message ---- */
        let settled = false;
        const cleanup = () => {
            window.removeEventListener('message', onMsg);
            clearTimeout(timer);
            if (iframe.parentNode) iframe.remove();
        };
        const onMsg = (e) => {
            if (settled) return;
            if (e.data === 'pdf-done') {
                settled = true; cleanup(); resolve();
            } else if (e.data && e.data.type === 'pdf-error') {
                settled = true; cleanup(); reject(new Error(e.data.message));
            }
        };
        window.addEventListener('message', onMsg);

        /* ---- timeout safety net ---- */
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true; cleanup();
                reject(new Error('PDF generation timed out (30 s)'));
            }
        }, 30000);

        /* ---- write the isolated document ---- */
        iDoc.open();
        iDoc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${KATEX_CSS_CDN}">
<style>${PDF_CSS}</style>
</head>
<body>
<div id="pdf-root">${htmlContent}</div>
<script src="${HTML2PDF_CDN}"><\/script>
<script>
(function(){
    // Wait until html2pdf is available
    function go() {
        if (typeof html2pdf === 'undefined') { setTimeout(go, 100); return; }
        var root = document.getElementById('pdf-root');
        html2pdf().set({
            margin:   [10, 10, 10, 10],
            filename: ${JSON.stringify(filename)},
            image:    { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 794
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(root).save().then(function(){
            parent.postMessage('pdf-done', '*');
        }).catch(function(err){
            parent.postMessage({ type: 'pdf-error', message: err.message }, '*');
        });
    }
    // Allow DOM + fonts to settle first
    if (document.readyState === 'complete') { setTimeout(go, 300); }
    else { window.addEventListener('load', function(){ setTimeout(go, 300); }); }
})();
<\/script>
</body>
</html>`);
        iDoc.close();
    });
}
