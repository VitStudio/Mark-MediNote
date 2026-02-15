<?php
require_once __DIR__ . '/auth.php';
setSecurityHeaders();
if (!isLoggedIn()) {
    header('Location: login.html');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>My MediNote</title>
    <link rel="icon" type="image/x-icon" href="/david_self.ico">
    <!-- CSS / Frameworks -->
    <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css"/>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!-- KaTeX -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/contrib/auto-render.min.js"></script>
    <!-- Markdown / PDF -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.3.1/dist/purify.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.12.1/html2pdf.bundle.min.js"></script>
    <!-- Mermaid -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.min.js"></script>
    <style>
        /* ===== DARK PALETTE ===== */
        :root {
            --gh-bg:         #0d1117;
            --gh-bg-subtle:  #161b22;
            --gh-bg-inset:   #21262d;
            --gh-border:     #30363d;
            --gh-border-sub: #21262d;
            --gh-text:       #e6edf3;
            --gh-text-sub:   #8b949e;
            --gh-text-muted: #6e7681;
            --gh-blue:       #58a6ff;
            --gh-blue-bg:    rgba(56,139,253,0.15);
            --gh-green:      #3fb950;
            --gh-green-bg:   rgba(63,185,80,0.15);
            --gh-purple:     #bc8cff;
            --gh-purple-bg:  rgba(188,140,255,0.15);
            --gh-orange:     #d29922;
            --gh-red:        #f85149;
            --gh-red-bg:     rgba(248,81,73,0.15);
            --gh-code-bg:    rgba(110,118,129,0.25);
            --gh-pre-bg:     #161b22;
            --gh-shadow:     0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
            --gh-topbar-bg:  #161b22;
            --gh-editor-bg:  #0d1117;
            --gh-preview-bg: #0d1117;
            --gh-highlight:  rgba(210,153,34,0.35);
        }

        /* ===== UTILITY OVERRIDES ===== */
        .hidden { display: none !important; }

        /* ===== BASE ===== */
        * { box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0; overflow: hidden;
            background: var(--gh-bg-subtle);
            color: var(--gh-text);
        }
        .mono { font-family: 'JetBrains Mono', 'Consolas', monospace; }

        /* ===== FIXED TOPBAR ===== */
        #topbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: var(--gh-topbar-bg);
            border-bottom: 1px solid var(--gh-border);
            box-shadow: var(--gh-shadow);
        }
        #topbar-spacer { height: 48px; flex-shrink: 0; }
        /* Center bar: stay fixed center on desktop */
        #topbar-center { pointer-events: auto; }
        @media (max-width: 639px) {
            #topbar-spacer { height: 88px; }
            #topbar-center { position: static !important; transform: none !important; width: 100%; justify-content: center; }
        }

        /* ===== APP SHELL ===== */
        #app-shell { display: flex; flex-direction: column; height: 100vh; width: 100%; }
        #main-split {
            display: flex; flex-direction: column;
            flex: 1; min-height: 0; overflow: hidden;
        }
        @media (min-width: 768px) { #main-split { flex-direction: row; } }

        /* ===== PANELS ===== */
        .panel {
            display: flex; flex-direction: column;
            min-height: 0; min-width: 0; overflow: hidden;
        }
        #panel-preview { flex: 1; }
        #panel-editor  { flex: 1; }
        .panel-header {
            flex-shrink: 0; padding: 6px 12px;
            display: flex; align-items: center; gap: 8px;
            background: var(--gh-bg-subtle);
            border-bottom: 1px solid var(--gh-border-sub);
            font-size: 12px; font-weight: 600; color: var(--gh-text-sub);
        }
        .panel-body {
            flex: 1; min-height: 0; overflow-y: auto;
            padding: 16px 20px;
            background: var(--gh-preview-bg);
        }

        /* ===== RESIZE HANDLE ===== */
        #resize-handle {
            flex-shrink: 0; z-index: 10;
            background: var(--gh-border-sub);
            transition: background 0.15s;
            position: relative;
        }
        #resize-handle:hover, #resize-handle.active {
            background: var(--gh-blue);
        }
        @media (min-width: 768px) {
            #resize-handle { width: 5px; cursor: col-resize; }
            #resize-handle::after {
                content: ''; position: absolute;
                top: 0; bottom: 0; left: -4px; right: -4px;
            }
        }
        @media (max-width: 767px) {
            #resize-handle { height: 5px; cursor: row-resize; }
            #resize-handle::after {
                content: ''; position: absolute;
                left: 0; right: 0; top: -4px; bottom: -4px;
            }
        }

        /* ===== STICKY TOOLBAR ===== */
        #editor-toolbar {
            position: sticky; top: 0; z-index: 20;
            background: var(--gh-bg-subtle);
            border-bottom: 1px solid var(--gh-border-sub);
            padding: 4px 8px;
            display: flex; align-items: center; gap: 2px;
        }
        .tb-sep { width: 1px; height: 18px; background: var(--gh-border); margin: 0 3px; flex-shrink: 0; }

        /* ===== TOOLBAR BUTTONS ===== */
        .toolbar-btn {
            display: inline-flex; align-items: center; justify-content: center;
            min-width: 28px; height: 28px; padding: 0 5px;
            border: none; border-radius: 6px; cursor: pointer;
            font-size: 12px; font-weight: 600; color: var(--gh-text-sub);
            background: transparent; transition: all 0.12s;
            white-space: nowrap;
        }
        .toolbar-btn:hover { background: var(--gh-bg-inset); color: var(--gh-text); }
        .toolbar-btn:active { transform: scale(0.94); }

        /* ===== EDITOR ===== */
        #editor {
            width: 100%; flex: 1; min-height: 0;
            resize: none; border: none; outline: none;
            font-size: 14px; line-height: 1.7; padding: 16px 20px;
            background: var(--gh-editor-bg); color: var(--gh-text);
        }
        #editor::placeholder { color: var(--gh-text-muted); }

        /* ===== PREVIEW PROSE ===== */
        #preview-content { font-size: 14px; line-height: 1.65; color: var(--gh-text); }
        #preview-content h1 { font-size: 2em; font-weight: 700; border-bottom: 1px solid var(--gh-border-sub); padding-bottom: 0.3em; margin: 24px 0 16px; }
        #preview-content h2 { font-size: 1.5em; font-weight: 600; border-bottom: 1px solid var(--gh-border-sub); padding-bottom: 0.3em; margin: 24px 0 16px; }
        #preview-content h3 { font-size: 1.25em; font-weight: 600; margin: 24px 0 16px; }
        #preview-content h4 { font-size: 1em; font-weight: 600; margin: 24px 0 16px; }
        #preview-content h5 { font-size: 0.875em; font-weight: 600; margin: 24px 0 16px; }
        #preview-content h6 { font-size: 0.85em; font-weight: 600; margin: 24px 0 16px; color: var(--gh-text-sub); }
        #preview-content p { margin: 0 0 16px; }
        #preview-content pre {
            padding: 16px; border-radius: 6px; overflow-x: auto;
            background: var(--gh-pre-bg); font-size: 13px; line-height: 1.5;
            border: 1px solid var(--gh-border-sub);
        }
        #preview-content code {
            background: var(--gh-code-bg); padding: 0.2em 0.4em;
            border-radius: 4px; font-size: 0.88em;
        }
        #preview-content pre code { background: none; padding: 0; border: none; }
        #preview-content blockquote {
            border-left: 3px solid var(--gh-border);
            padding: 0 1em; margin: 0 0 16px; color: var(--gh-text-sub);
        }
        #preview-content table { border-collapse: collapse; width: 100%; margin: 0 0 16px; }
        #preview-content th, #preview-content td {
            border: 1px solid var(--gh-border); padding: 6px 13px; text-align: left;
        }
        #preview-content th { font-weight: 600; background: var(--gh-bg-subtle); }
        #preview-content tr:nth-child(2n) { background: var(--gh-bg-subtle); }
        #preview-content ul, #preview-content ol { padding-left: 2em; margin: 0 0 16px; }
        #preview-content li { margin: 4px 0; }
        #preview-content li input[type="checkbox"] { margin-right: 6px; }
        #preview-content a { color: var(--gh-blue); text-decoration: none; }
        #preview-content a:hover { text-decoration: underline; }
        #preview-content img { max-width: 100%; border-radius: 6px; border: 1px solid var(--gh-border-sub); }
        #preview-content hr { border: none; border-top: 2px solid var(--gh-border-sub); margin: 24px 0; }
        #preview-content mark { background: var(--gh-highlight); color: var(--gh-text); padding: 0.1em 0.2em; border-radius: 2px; }
        #preview-content sub, #preview-content sup { font-size: 0.75em; }

        /* ===== SELECTION TOOLTIP ===== */
        .selection-tooltip {
            position: fixed; z-index: 200;
            opacity: 0; transform: translateY(4px);
            transition: opacity 0.12s, transform 0.12s;
            pointer-events: none;
        }
        .selection-tooltip.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }

        /* ===== POMODORO ===== */
        #pomodoro-display { font-variant-numeric: tabular-nums; letter-spacing: 0.03em; }

        /* ===== LABELS ===== */
        .label-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 20px;
            font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
        }
        .label-preview  { background: var(--gh-blue-bg);   color: var(--gh-blue); }
        .label-editor   { background: var(--gh-green-bg);  color: var(--gh-green); }

        /* ===== CHEATSHEET ===== */
        .cheatsheet-code {
            background: var(--gh-code-bg); padding: 0.2em 0.5em;
            border-radius: 4px; font-size: 0.88em;
        }

        /* ===== BUTTONS ===== */
        .gh-btn {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px; border-radius: 6px; border: 1px solid var(--gh-border);
            font-size: 12px; font-weight: 600; cursor: pointer;
            background: var(--gh-bg); color: var(--gh-text); transition: all 0.12s;
        }
        .gh-btn:hover { background: var(--gh-bg-subtle); }
        .gh-btn-primary { background: #238636; color: #fff; border-color: rgba(63,185,80,0.4); }
        .gh-btn-primary:hover { background: #2ea043; }
        .gh-btn-blue { background: #1f6feb; color: #fff; border-color: rgba(56,139,253,0.4); }
        .gh-btn-blue:hover { background: #388bfd; }
        .gh-btn-purple { background: #8957e5; color: #fff; border-color: rgba(137,87,229,0.4); }
        .gh-btn-purple:hover { background: #a371f7; }
        .gh-btn-icon {
            display: inline-flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border-radius: 6px; border: none;
            background: transparent; color: var(--gh-text-sub); cursor: pointer;
            transition: all 0.12s;
        }
        .gh-btn-icon:hover { background: var(--gh-bg-inset); color: var(--gh-text); }
        .gh-input {
            padding: 3px 10px; border-radius: 6px; border: 1px solid var(--gh-border);
            font-size: 12px; background: var(--gh-bg); color: var(--gh-text);
            outline: none; transition: border-color 0.15s;
        }
        .gh-input:focus { border-color: var(--gh-blue); box-shadow: 0 0 0 3px rgba(56,139,253,0.2); }

        /* ===== DROPDOWN ===== */
        .gh-dropdown {
            position: absolute; top: 100%; left: 0; z-index: 110;
            min-width: 200px; max-height: 320px; overflow-y: auto;
            background: var(--gh-bg); border: 1px solid var(--gh-border);
            border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            padding: 4px 0; display: none;
        }
        .gh-dropdown.open { display: block; }
        .gh-dropdown-title {
            padding: 6px 12px; font-size: 11px; font-weight: 600;
            color: var(--gh-text-sub); text-transform: uppercase; letter-spacing: 0.04em;
        }
        .gh-dropdown-item {
            display: block; padding: 6px 12px; font-size: 13px;
            color: var(--gh-text); cursor: pointer; border: none;
            background: none; width: 100%; text-align: left;
        }
        .gh-dropdown-item:hover { background: #1f6feb; color: #fff; }
        .gh-dropdown-empty { padding: 8px 12px; font-size: 12px; color: var(--gh-text-muted); }

        /* ===== USER MENU ===== */
        #user-menu-wrap { position: relative; }
        #user-menu-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 6px 10px; border-radius: 6px; border: none;
            background: transparent; color: var(--gh-text-sub);
            font-size: 13px; cursor: pointer; transition: background 0.12s;
        }
        #user-menu-btn:hover { background: var(--gh-bg-inset); color: var(--gh-text); }
        #user-menu-dropdown {
            position: absolute; top: calc(100% + 4px); right: 0; left: auto;
            min-width: 220px; margin-top: 0;
            border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        #user-menu-dropdown .gh-dropdown-item {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 14px; font-size: 13px; border: none;
            background: none; width: 100%; cursor: pointer;
            color: var(--gh-text); text-align: left;
        }
        #user-menu-dropdown .gh-dropdown-item:hover { background: #1f6feb; color: #fff; }
        #user-menu-dropdown a.gh-dropdown-item { text-decoration: none; }

        /* ===== SCROLLBAR ===== */
        .panel-body::-webkit-scrollbar, #editor::-webkit-scrollbar { width: 8px; }
        .panel-body::-webkit-scrollbar-thumb, #editor::-webkit-scrollbar-thumb {
            background: #30363d; border-radius: 4px;
        }
        .panel-body::-webkit-scrollbar-thumb:hover, #editor::-webkit-scrollbar-thumb:hover {
            background: #484f58;
        }
        .panel-body::-webkit-scrollbar-track, #editor::-webkit-scrollbar-track {
            background: #0d1117;
        }

        /* ===== MODAL OVERRIDE ===== */
        .modal-box {
            background: var(--gh-bg) !important;
            color: var(--gh-text) !important;
            border: 1px solid var(--gh-border) !important;
        }

        /* ===== ZOOM EFFECT (Pomodoro phase switch) ===== */
        .pomo-zoom-overlay {
            position: fixed; inset: 0; z-index: 300;
            display: flex; align-items: center; justify-content: center;
            background: rgba(13, 17, 23, 0.85);
            animation: zoomFade 2.2s ease forwards;
            pointer-events: none;
        }
        .pomo-zoom-text {
            font-size: 48px; font-weight: 800;
            color: #e6edf3; text-align: center;
            animation: zoomScale 2.2s ease forwards;
        }
        @keyframes zoomFade {
            0%   { opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 1; }
            100% { opacity: 0; }
        }
        @keyframes zoomScale {
            0%   { transform: scale(0.5); }
            30%  { transform: scale(1); }
            70%  { transform: scale(1); }
            100% { transform: scale(1.15); }
        }

        /* ===== FILE MANAGER ===== */
        .fm-action {
            background: none; border: none; cursor: pointer;
            font-size: 14px; padding: 2px 4px; border-radius: 4px;
            transition: background 0.12s;
        }
        .fm-action:hover { background: var(--gh-bg-inset); }

        /* ===== PANEL TOGGLE ===== */
        .active-toggle { color: var(--gh-blue) !important; }

        /* ===== MERMAID ===== */
        .mermaid { margin: 16px 0; text-align: center; }

        /* ===== KATEX DARK OVERRIDES ===== */
        .katex { color: var(--gh-text); }
        .katex-display { margin: 16px 0; overflow-x: auto; }

        /* ===== IMPROVED LIST STYLES ===== */
        #preview-content ul { list-style-type: disc; }
        #preview-content ul ul { list-style-type: circle; }
        #preview-content ul ul ul { list-style-type: square; }
        #preview-content ol { list-style-type: decimal; }
        #preview-content ol ol { list-style-type: lower-alpha; }
        #preview-content ol ol ol { list-style-type: lower-roman; }
        #preview-content li > ul, #preview-content li > ol { margin: 4px 0 4px 0; }
        #preview-content li p { margin: 0 0 4px; }

        /* ===== SUB / SUP ===== */
        #preview-content sub { vertical-align: sub; font-size: 0.75em; }
        #preview-content sup { vertical-align: super; font-size: 0.75em; }

        /* ===== YOUTUBE QUEUE ===== */
        .yt-queue-item {
            display: flex; align-items: center; gap: 6px;
            padding: 3px 6px; border-radius: 4px; cursor: pointer;
            font-size: 11px; color: var(--gh-text-sub);
            transition: background 0.1s;
        }
        .yt-queue-item:hover { background: var(--gh-bg-inset); }
        .yt-queue-item.active { color: var(--gh-green); font-weight: 600; }
        .yt-q-num { min-width: 16px; text-align: right; color: var(--gh-text-muted); font-size: 10px; }
        .yt-q-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .yt-q-remove { font-size: 14px; color: var(--gh-text-muted); opacity: 0; transition: opacity 0.1s; }
        .yt-queue-item:hover .yt-q-remove { opacity: 1; }

        /* ===== SWAP BTN ===== */
        .swap-icon { transition: transform 0.3s ease; }
        .swap-icon.active-toggle { transform: rotate(180deg); }
    </style>
</head>
<body>
    <!-- ===== FIXED TOPBAR ===== -->
    <header id="topbar">
        <div class="flex items-center justify-between px-3 sm:px-4 py-1.5 gap-2 flex-wrap" style="position:relative;">
            <!-- LEFT: Pomodoro + YouTube music -->
            <div class="flex items-center gap-1.5 shrink-0 order-1">
                <button id="pomo-settings" class="gh-btn-icon" title="Pomodoro settings" style="color:var(--gh-text-sub)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </button>
                <button id="pomo-start" class="gh-btn-icon" title="Start Pomodoro" style="color:var(--gh-green)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.12v11.76a1.5 1.5 0 002.3 1.28l9.344-5.88a1.5 1.5 0 000-2.56L6.3 2.84z"/></svg>
                </button>
                <button id="pomo-pause" class="gh-btn-icon hidden" title="Pause" style="color:var(--gh-orange)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/></svg>
                </button>
                <span id="pomodoro-display" class="mono text-xs font-semibold" style="color:var(--gh-text-sub); min-width:5.5ch;">00:00:00</span>

                <!-- Music: inline transport controls -->
                <span style="width:1px;height:18px;background:var(--gh-border);margin:0 2px;flex-shrink:0;"></span>
                <button id="yt-prev" class="gh-btn-icon" title="Previous track" style="width:24px;height:24px;font-size:11px;color:var(--gh-text-sub);">&#9198;</button>
                <button id="yt-play" class="gh-btn-icon" title="Play" style="width:24px;height:24px;color:var(--gh-green);font-size:14px;">&#9654;</button>
                <button id="yt-pause" class="gh-btn-icon" title="Pause" style="width:24px;height:24px;color:var(--gh-orange);font-size:14px;">&#9208;</button>
                <button id="yt-next" class="gh-btn-icon" title="Next track" style="width:24px;height:24px;font-size:11px;color:var(--gh-text-sub);">&#9197;</button>
                <span id="yt-timestamp" class="mono" style="font-size:10px;color:var(--gh-text-muted);min-width:6.5ch;white-space:nowrap;">0:00/0:00</span>

                <!-- Music settings dropdown (queue, URL, volume) -->
                <div class="relative">
                    <button id="yt-music-btn" class="gh-btn-icon" title="Music queue & settings" style="color:var(--gh-text-sub)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
                    </button>
                    <div class="gh-dropdown" id="yt-dropdown" style="min-width:280px;">
                        <div class="gh-dropdown-title">Music Queue</div>
                        <div style="padding:6px 12px;">
                            <!-- Add to queue -->
                            <div class="flex items-center gap-1" style="margin-bottom:8px;">
                                <input type="text" id="yt-url-input" placeholder="Paste YouTube URL…" class="gh-input flex-1" style="font-size:11px;">
                                <button id="yt-add-queue" class="gh-btn gh-btn-primary" style="padding:2px 8px;font-size:11px;white-space:nowrap;">+ Add</button>
                            </div>
                            <!-- Queue list -->
                            <div id="yt-queue-list" style="max-height:140px;overflow-y:auto;margin-bottom:8px;border:1px solid var(--gh-border-sub);border-radius:4px;padding:4px;"></div>
                            <!-- Volume + Stop -->
                            <div class="flex items-center gap-2" style="margin-bottom:4px;">
                                <span class="text-xs" style="color:var(--gh-text-sub);">Vol</span>
                                <input type="range" id="yt-volume" min="0" max="100" value="50" style="flex:1;accent-color:var(--gh-blue);">
                                <button id="yt-stop" class="gh-btn" style="padding:2px 8px;font-size:11px;" title="Stop">&#9209; Stop</button>
                            </div>
                            <p id="yt-status" class="text-xs" style="color:var(--gh-text-muted);margin-top:2px;"></p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CENTER: file actions — absolutely centered, never shifts -->
            <div id="topbar-center" class="flex items-center gap-1.5" style="position:absolute;left:50%;transform:translateX(-50%);z-index:1;">
                <button class="gh-btn" id="btn-open" title="File Manager (Ctrl+O)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="hidden sm:inline">Files</span>
                </button>
                <input type="text" id="filename-input" placeholder="document.md"
                       class="gh-input mono w-28 sm:w-36" style="font-size:12px;">
                <button id="btn-save" class="gh-btn gh-btn-primary" title="Save (Ctrl+S)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    <span class="hidden sm:inline">.md</span>
                </button>
                <button id="btn-pdf" class="gh-btn gh-btn-purple" title="Export PDF">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                    <span class="hidden sm:inline">PDF</span>
                </button>
            </div>

            <!-- RIGHT: user + tools -->
            <div class="flex items-center gap-1 shrink-0 order-2 sm:order-3">
                <div id="user-menu-wrap">
                    <button id="user-menu-btn" title="Account">
                        <span id="user-display"></span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div id="user-menu-dropdown" class="gh-dropdown">
                        <button id="btn-biometric" class="gh-dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span id="biometric-label">Enable Face ID login</span>
                        </button>
                        <a href="logout.php" class="gh-dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                            Logout
                        </a>
                    </div>
                </div>
                <button id="btn-swap-panels" class="gh-btn-icon swap-icon" title="Swap Editor/Preview sides">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                </button>
                <button id="btn-find" class="gh-btn-icon" title="Find & Replace (Ctrl+F)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </button>
                <button id="btn-help" class="gh-btn-icon" title="Cheatsheet (?)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </button>
            </div>
        </div>
    </header>

    <!-- ===== MODALS ===== -->

    <!-- Find & Replace -->
    <dialog id="findReplaceModal" class="modal">
        <div class="modal-box">
            <h3 class="font-bold text-base mb-3" style="color:var(--gh-text)">Find &amp; Replace</h3>
            <div class="mb-2">
                <label class="text-xs font-semibold block mb-1" style="color:var(--gh-text-sub)">Find</label>
                <input type="text" id="find-input" placeholder="Search…" class="gh-input mono w-full">
            </div>
            <div class="mb-2">
                <label class="text-xs font-semibold block mb-1" style="color:var(--gh-text-sub)">Replace with</label>
                <input type="text" id="replace-input" placeholder="Replacement…" class="gh-input mono w-full">
            </div>
            <div class="flex items-center gap-4 mb-3">
                <label class="flex items-center gap-1 text-xs cursor-pointer" style="color:var(--gh-text-sub)">
                    <input type="checkbox" id="find-case-sensitive" style="accent-color:var(--gh-blue);"> Case sensitive
                </label>
                <label class="flex items-center gap-1 text-xs cursor-pointer" style="color:var(--gh-text-sub)">
                    <input type="checkbox" id="find-regex" style="accent-color:var(--gh-blue);"> Regex
                </label>
            </div>
            <div class="flex gap-2 flex-wrap">
                <button id="btn-find-next" class="gh-btn gh-btn-blue">Next</button>
                <button id="btn-find-prev" class="gh-btn">Prev</button>
                <button id="btn-replace-one" class="gh-btn gh-btn-primary">Replace</button>
                <button id="btn-replace-all" class="gh-btn">All</button>
                <button id="btn-close-modal" class="gh-btn" style="margin-left:auto">Close</button>
            </div>
            <p class="text-xs mt-2" id="find-status" style="color:var(--gh-text-muted)"></p>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Help / Cheatsheet -->
    <dialog id="helpModal" class="modal">
        <div class="modal-box" style="max-width:680px; max-height:85vh; overflow-y:auto;">
            <h3 class="font-bold text-base mb-3 flex items-center gap-2" style="color:var(--gh-text)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="var(--gh-blue)" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Markdown Cheatsheet
            </h3>
            <div class="grid gap-3 sm:grid-cols-2 text-sm" style="color:var(--gh-text)">
                <div><h4 class="font-semibold text-xs uppercase mb-1" style="color:var(--gh-blue)">Headings</h4><p><code class="cheatsheet-code"># H1</code> <code class="cheatsheet-code">## H2</code> <code class="cheatsheet-code">### H3</code></p></div>
                <div><h4 class="font-semibold text-xs uppercase mb-1" style="color:var(--gh-purple)">Emphasis</h4><p><code class="cheatsheet-code">**bold**</code> <code class="cheatsheet-code">*italic*</code> <code class="cheatsheet-code">~~strike~~</code></p></div>
                <div><h4 class="font-semibold text-xs uppercase mb-1" style="color:var(--gh-green)">Links &amp; Images</h4><p><code class="cheatsheet-code">[text](url)</code><br><code class="cheatsheet-code">![alt](url)</code></p></div>
                <div><h4 class="font-semibold text-xs uppercase mb-1">Lists</h4><p><code class="cheatsheet-code">- item</code> <code class="cheatsheet-code">1. item</code><br><code class="cheatsheet-code">- [x] task</code></p></div>
                <div><h4 class="font-semibold text-xs uppercase mb-1">Code</h4><p><code class="cheatsheet-code">`inline`</code> &nbsp; <code class="cheatsheet-code">```block```</code></p></div>
                <div><h4 class="font-semibold text-xs uppercase mb-1">Blockquote</h4><p><code class="cheatsheet-code">&gt; quote text</code></p></div>
                <div class="sm:col-span-2"><h4 class="font-semibold text-xs uppercase mb-1">Table</h4><pre class="cheatsheet-code block overflow-x-auto text-xs leading-relaxed">| Col A | Col B |
|-------|-------|
| val 1 | val 2 |</pre></div>
                <div><h4 class="font-semibold text-xs uppercase mb-1">Extras</h4><p><code class="cheatsheet-code">==highlight==</code> <code class="cheatsheet-code">~sub~</code> <code class="cheatsheet-code">^sup^</code></p></div>
                <div><h4 class="font-semibold text-xs uppercase mb-1">Rule</h4><p><code class="cheatsheet-code">---</code> or <code class="cheatsheet-code">***</code></p></div>

                <!-- KaTeX Math -->
                <div class="sm:col-span-2" style="border-top:1px solid var(--gh-border-sub);padding-top:8px;margin-top:4px;">
                    <h4 class="font-semibold text-xs uppercase mb-1" style="color:var(--gh-orange)">Math (KaTeX)</h4>
                    <p>Inline: <code class="cheatsheet-code">$E = mc^2$</code></p>
                    <p>Display block:</p>
                    <pre class="cheatsheet-code block overflow-x-auto text-xs leading-relaxed">$$
\sum_{i=1}^{n} x_i
$$</pre>
                </div>

                <!-- Mermaid -->
                <div class="sm:col-span-2" style="border-top:1px solid var(--gh-border-sub);padding-top:8px;margin-top:4px;">
                    <h4 class="font-semibold text-xs uppercase mb-1" style="color:var(--gh-purple)">Mermaid Diagrams</h4>
                    <pre class="cheatsheet-code block overflow-x-auto text-xs leading-relaxed">```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```</pre>
                </div>

                <!-- SmartyPants -->
                <div class="sm:col-span-2" style="border-top:1px solid var(--gh-border-sub);padding-top:8px;margin-top:4px;">
                    <h4 class="font-semibold text-xs uppercase mb-1" style="color:var(--gh-green)">Typography (auto)</h4>
                    <p><code class="cheatsheet-code">---</code> &rarr; em dash &mdash; &nbsp; <code class="cheatsheet-code">--</code> &rarr; en dash &ndash; &nbsp; <code class="cheatsheet-code">...</code> &rarr; ellipsis &hellip;</p>
                </div>
            </div>
            <div class="mt-4 text-right"><button class="gh-btn gh-btn-blue" onclick="this.closest('dialog').close()">Close</button></div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Pomodoro Settings -->
    <dialog id="pomoModal" class="modal">
        <div class="modal-box" style="max-width:400px;">
            <h3 class="font-bold text-base mb-4 flex items-center gap-2" style="color:var(--gh-text)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="var(--gh-orange)" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Pomodoro Settings
            </h3>
            <div class="grid gap-3">
                <div>
                    <label class="text-xs font-semibold block mb-1" style="color:var(--gh-text-sub)">Work duration (minutes)</label>
                    <input type="number" id="pomo-work-min" min="1" max="120" value="25" class="gh-input mono w-full">
                </div>
                <div>
                    <label class="text-xs font-semibold block mb-1" style="color:var(--gh-text-sub)">Short break (minutes)</label>
                    <input type="number" id="pomo-break-min" min="1" max="60" value="5" class="gh-input mono w-full">
                </div>
                <div>
                    <label class="text-xs font-semibold block mb-1" style="color:var(--gh-text-sub)">Long break (minutes)</label>
                    <input type="number" id="pomo-longbreak-min" min="1" max="60" value="15" class="gh-input mono w-full">
                </div>
                <div>
                    <label class="text-xs font-semibold block mb-1" style="color:var(--gh-text-sub)">Sessions before long break</label>
                    <input type="number" id="pomo-sessions" min="1" max="10" value="4" class="gh-input mono w-full">
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <input type="checkbox" id="pomo-auto-break" checked style="accent-color:var(--gh-green);">
                    <label for="pomo-auto-break" class="text-xs font-semibold" style="color:var(--gh-text-sub)">Auto-start breaks</label>
                </div>
            </div>
            <div class="flex gap-2 mt-4 justify-between">
                <button id="pomo-reset-btn" class="gh-btn" style="color:var(--gh-red); border-color:var(--gh-red);">Reset Timer</button>
                <div class="flex gap-2">
                    <button class="gh-btn" onclick="this.closest('dialog').close()">Cancel</button>
                    <button id="pomo-save-settings" class="gh-btn gh-btn-primary">Save</button>
                </div>
            </div>
            <p class="text-xs mt-3" id="pomo-status-label" style="color:var(--gh-text-muted);"></p>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Face ID Setup Modal -->
    <dialog id="biometricModal" class="modal">
        <div class="modal-box" style="max-width:400px;">
            <h3 class="font-bold text-base mb-3 flex items-center gap-2" style="color:var(--gh-text)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="var(--gh-blue)" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Face ID Login
            </h3>
            <p class="text-sm mb-4" style="color:var(--gh-text-sub);">Use Face ID or fingerprint to sign in faster. Enable below to use next time.</p>
            <div id="biometric-status" class="text-xs mb-3" style="color:var(--gh-text-muted);"></div>
            <div class="flex gap-2 justify-end">
                <button class="gh-btn" onclick="document.getElementById('biometricModal').close()">Cancel</button>
                <button id="btn-register-biometric" class="gh-btn gh-btn-primary">Enable</button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- File Manager -->
    <dialog id="fileManagerModal" class="modal">
        <div class="modal-box" style="max-width:640px; max-height:85vh; overflow-y:auto;">
            <h3 class="font-bold text-base mb-3 flex items-center gap-2" style="color:var(--gh-text)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="var(--gh-green)" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                File Manager
            </h3>
            <div class="flex gap-2 mb-3">
                <input type="text" id="fm-search" placeholder="Filter files…" class="gh-input flex-1">
                <button id="fm-new-file" class="gh-btn gh-btn-primary">+ New</button>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid var(--gh-border);">
                            <th style="text-align:left;padding:6px 10px;font-size:12px;font-weight:600;color:var(--gh-text-sub);">Name</th>
                            <th style="text-align:left;padding:6px 10px;font-size:12px;font-weight:600;color:var(--gh-text-sub);">Size</th>
                            <th style="text-align:left;padding:6px 10px;font-size:12px;font-weight:600;color:var(--gh-text-sub);">Modified</th>
                            <th style="text-align:center;padding:6px 10px;font-size:12px;font-weight:600;color:var(--gh-text-sub);">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="fm-file-list"></tbody>
                </table>
            </div>
            <div class="flex items-center justify-between mt-3">
                <p class="text-xs" id="fm-status" style="color:var(--gh-text-muted);"></p>
                <button id="fm-close" class="gh-btn">Close</button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ===== SELECTION TOOLTIP ===== -->
    <div id="selection-tooltip" class="selection-tooltip">
        <div class="flex gap-0.5 p-1 rounded-lg" style="background:var(--gh-bg-subtle); border:1px solid var(--gh-border); box-shadow:0 4px 12px rgba(0,0,0,0.4);">
            <button class="toolbar-btn" data-action="bold" title="Bold"><b>B</b></button>
            <button class="toolbar-btn" data-action="italic" title="Italic"><em>I</em></button>
            <button class="toolbar-btn" data-action="strikethrough" title="Strike"><s>S</s></button>
            <button class="toolbar-btn" data-action="code" title="Code">&lt;/&gt;</button>
            <button class="toolbar-btn" data-action="link" title="Link">&#128279;</button>
            <button class="toolbar-btn" data-action="h1" title="H1">H1</button>
            <button class="toolbar-btn" data-action="h2" title="H2">H2</button>
            <button class="toolbar-btn" data-action="h3" title="H3">H3</button>
            <button class="toolbar-btn" data-action="quote" title="Quote">&ldquo;</button>
            <button class="toolbar-btn" data-action="ul" title="Bullet">&bull;</button>
            <button class="toolbar-btn" data-action="ol" title="Number">1.</button>
        </div>
    </div>

    <!-- ===== APP SHELL ===== -->
    <div id="app-shell">
        <div id="topbar-spacer"></div>
        <div id="main-split">
            <!-- PREVIEW -->
            <section class="panel" id="panel-preview">
                <div class="panel-header">
                    <span class="label-badge label-preview">Preview</span>
                    <span style="flex:1"></span>
                    <button id="toggle-preview" class="toolbar-btn" title="Hide preview (Ctrl+Shift+P)" style="height:22px;min-width:22px;padding:0 3px;">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                </div>
                <div id="preview-content" class="panel-body mono"></div>
            </section>

            <!-- RESIZE HANDLE -->
            <div id="resize-handle" title="Drag to resize"></div>

            <!-- EDITOR -->
            <section class="panel" id="panel-editor">
                <div id="editor-toolbar">
                    <span class="label-badge label-editor" style="margin-right:4px;">Editor</span>
                    <div class="flex flex-nowrap gap-0 overflow-x-auto" style="scrollbar-width:thin;flex:1;">
                        <!-- Headings -->
                        <button class="toolbar-btn" data-insert="h1" title="Heading 1">H1</button>
                        <button class="toolbar-btn" data-insert="h2" title="Heading 2">H2</button>
                        <button class="toolbar-btn" data-insert="h3" title="Heading 3">H3</button>
                        <button class="toolbar-btn" data-insert="h4" title="Heading 4">H4</button>
                        <button class="toolbar-btn" data-insert="h5" title="Heading 5">H5</button>
                        <button class="toolbar-btn" data-insert="h6" title="Heading 6">H6</button>
                        <span class="tb-sep"></span>
                        <!-- Text styling -->
                        <button class="toolbar-btn" data-insert="bold" title="Bold (Ctrl+B)" style="font-weight:700;">B</button>
                        <button class="toolbar-btn" data-insert="italic" title="Italic (Ctrl+I)" style="font-style:italic;">I</button>
                        <button class="toolbar-btn" data-insert="strikethrough" title="Strikethrough" style="text-decoration:line-through;">S</button>
                        <button class="toolbar-btn" data-insert="highlight" title="Highlight">H</button>
                        <button class="toolbar-btn" data-insert="code" title="Inline code">&lt;/&gt;</button>
                        <span class="tb-sep"></span>
                        <!-- Links & media -->
                        <button class="toolbar-btn" data-insert="link" title="Link">&#128279;</button>
                        <button class="toolbar-btn" data-insert="image" title="Image">&#128444;</button>
                        <span class="tb-sep"></span>
                        <!-- Blocks -->
                        <button class="toolbar-btn" data-insert="quote" title="Blockquote">&ldquo;</button>
                        <button class="toolbar-btn" data-insert="ul" title="Bullet list">&bull;</button>
                        <button class="toolbar-btn" data-insert="ol" title="Numbered list">1.</button>
                        <button class="toolbar-btn" data-insert="tasklist" title="Task list">&#9745;</button>
                        <button class="toolbar-btn" data-insert="codeblock" title="Code block">```</button>
                        <span class="tb-sep"></span>
                        <!-- Extras -->
                        <button class="toolbar-btn" data-insert="hr" title="Horizontal rule">&mdash;</button>
                        <button class="toolbar-btn" data-insert="table" title="Table">&#8862;</button>
                        <button class="toolbar-btn" data-insert="subscript" title="Subscript (wrap ~text~)">x&#8322;</button>
                        <button class="toolbar-btn" data-insert="superscript" title="Superscript (wrap ^text^)">x&sup2;</button>
                        <button class="toolbar-btn" data-insert="footnote" title="Footnote">[^]</button>
                        <span class="tb-sep"></span>
                        <!-- Extensions -->
                        <button class="toolbar-btn" data-insert="math_inline" title="Inline Math ($)">&sum;</button>
                        <button class="toolbar-btn" data-insert="math_display" title="Display Math ($$)">&int;</button>
                        <button class="toolbar-btn" data-insert="mermaid" title="Mermaid Diagram">&loz;</button>
                    </div>
                    <button id="toggle-editor" class="toolbar-btn" title="Hide editor (Ctrl+Shift+E)" style="height:22px;min-width:22px;padding:0 3px;margin-left:4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                </div>
                <textarea id="editor" class="mono"
                    placeholder="# Welcome to Markdown Editor&#10;&#10;Type your markdown here...&#10;Preview updates in real-time on the left.&#10;&#10;## Features&#10;- **Bold** and *italic* text&#10;- [Links](https://example.com)&#10;- `inline code` and code blocks&#10;- Lists, tables, and more!&#10;- $E = mc^2$ (KaTeX math)&#10;- Mermaid diagrams"></textarea>
            </section>
        </div>
    </div>

    <!-- YouTube player container (hidden) -->
    <div id="yt-player-container" style="position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;"></div>

    <script>
        window.__user = <?php echo json_encode(getCurrentUser()); ?>;
    </script>
    <script type="module" src="js/app.js"></script>
</body>
</html>
