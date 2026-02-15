/**
 * Pomodoro — timer, settings, tick sound, zoom effect
 * YouTube Music Player — queue, next/prev, play/pause, timestamp
 */

export function initPomodoro() {
    const pomoDisplay     = document.getElementById('pomodoro-display');
    const pomoStart       = document.getElementById('pomo-start');
    const pomoPause       = document.getElementById('pomo-pause');
    const pomoSettingsBtn = document.getElementById('pomo-settings');
    const pomoModal       = document.getElementById('pomoModal');
    const pomoStatusLabel = document.getElementById('pomo-status-label');

    /* ---------- state ---------- */
    let pomoConfig = {
        work: 25, shortBreak: 5, longBreak: 15, sessions: 4, autoBreak: true,
    };
    let pomoPhase        = 'idle';
    let pomoSessionCount = 0;
    let pomoRemaining    = 0;
    let pomoInterval     = null;
    let pomoRunning      = false;

    /* ---------- helpers ---------- */
    const fmt = (t) => {
        const h = String(Math.floor(t / 3600)).padStart(2, '0');
        const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const s = String(t % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const updateDisplay = () => {
        pomoDisplay.textContent = fmt(pomoRemaining);
        const colors = { work: '#3fb950', shortBreak: '#d29922', longBreak: '#58a6ff' };
        pomoDisplay.style.color = colors[pomoPhase] || '';
    };

    const updateStatus = () => {
        const labels = {
            idle: 'Ready',
            work: `Work (${pomoSessionCount + 1}/${pomoConfig.sessions})`,
            shortBreak: 'Short Break',
            longBreak: 'Long Break',
        };
        if (pomoStatusLabel) pomoStatusLabel.textContent = labels[pomoPhase] || '';
    };

    const startPhase = (phase) => {
        pomoPhase = phase;
        const durations = { work: pomoConfig.work, shortBreak: pomoConfig.shortBreak, longBreak: pomoConfig.longBreak };
        pomoRemaining = (durations[phase] || 0) * 60;
        updateDisplay();
        updateStatus();
    };

    /* ===== AUDIO ===== */
    function playBeep(freq = 800, duration = 150, vol = 0.3) {
        try {
            const ctx  = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration / 1000);
        } catch (_) {}
    }

    function playTickAlert() {
        playBeep(600, 120, 0.2);
        setTimeout(() => playBeep(600, 120, 0.2), 200);
        setTimeout(() => playBeep(600, 120, 0.2), 400);
    }

    function playPhaseEnd() {
        playBeep(1000, 300, 0.4);
        setTimeout(() => playBeep(1200, 300, 0.4), 350);
    }

    /* ===== ZOOM EFFECT ===== */
    function showZoomEffect(text) {
        const el = document.createElement('div');
        el.className = 'pomo-zoom-overlay';
        el.innerHTML = `<div class="pomo-zoom-text">${text}</div>`;
        document.body.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2400);
    }

    /* ===== TICK ===== */
    const tick = () => {
        if (pomoRemaining <= 0) {
            clearInterval(pomoInterval);
            pomoRunning = false;
            pomoPause.classList.add('hidden');
            pomoStart.classList.remove('hidden');
            playPhaseEnd();

            if (pomoPhase === 'work') {
                pomoSessionCount++;
                if (pomoSessionCount >= pomoConfig.sessions) {
                    startPhase('longBreak'); pomoSessionCount = 0;
                    showZoomEffect('\u2615 Long Break!');
                } else {
                    startPhase('shortBreak');
                    showZoomEffect('\u2615 Short Break!');
                }
                if (pomoConfig.autoBreak) pomoStart.click();
            } else {
                startPhase('work');
                showZoomEffect('\uD83D\uDD25 Focus Time!');
                if (pomoConfig.autoBreak) pomoStart.click();
            }
            return;
        }
        if (pomoRemaining === 5) playTickAlert();
        pomoRemaining--;
        updateDisplay();
    };

    /* ---------- buttons ---------- */
    pomoStart.addEventListener('click', () => {
        if (pomoRunning) return;
        if (pomoPhase === 'idle') startPhase('work');
        pomoRunning = true;
        pomoInterval = setInterval(tick, 1000);
        pomoStart.classList.add('hidden');
        pomoPause.classList.remove('hidden');
        updateStatus();
    });

    pomoPause.addEventListener('click', () => {
        if (!pomoRunning) return;
        pomoRunning = false;
        clearInterval(pomoInterval);
        pomoPause.classList.add('hidden');
        pomoStart.classList.remove('hidden');
    });

    /* ---------- settings modal ---------- */
    pomoSettingsBtn.addEventListener('click', () => {
        document.getElementById('pomo-work-min').value      = pomoConfig.work;
        document.getElementById('pomo-break-min').value     = pomoConfig.shortBreak;
        document.getElementById('pomo-longbreak-min').value = pomoConfig.longBreak;
        document.getElementById('pomo-sessions').value      = pomoConfig.sessions;
        document.getElementById('pomo-auto-break').checked  = pomoConfig.autoBreak;
        updateStatus();
        pomoModal.showModal();
    });

    document.getElementById('pomo-save-settings').addEventListener('click', () => {
        pomoConfig.work       = Math.max(1, parseInt(document.getElementById('pomo-work-min').value) || 25);
        pomoConfig.shortBreak = Math.max(1, parseInt(document.getElementById('pomo-break-min').value) || 5);
        pomoConfig.longBreak  = Math.max(1, parseInt(document.getElementById('pomo-longbreak-min').value) || 15);
        pomoConfig.sessions   = Math.max(1, parseInt(document.getElementById('pomo-sessions').value) || 4);
        pomoConfig.autoBreak  = document.getElementById('pomo-auto-break').checked;
        if (pomoPhase === 'idle') { pomoRemaining = pomoConfig.work * 60; updateDisplay(); }
        pomoModal.close();
    });

    document.getElementById('pomo-reset-btn').addEventListener('click', () => {
        clearInterval(pomoInterval);
        pomoRunning = false; pomoPhase = 'idle'; pomoSessionCount = 0; pomoRemaining = 0;
        pomoDisplay.textContent = '00:00:00'; pomoDisplay.style.color = '';
        pomoPause.classList.add('hidden'); pomoStart.classList.remove('hidden');
        updateStatus(); pomoModal.close();
    });

    updateStatus();

    /* ===== YOUTUBE MUSIC PLAYER with Queue ===== */
    initMusicPlayer();
}


/* =================================================================
 *  YouTube Music Player — Queue · Next/Prev · Timestamp · Vol
 * ================================================================= */
function initMusicPlayer() {
    const musicBtn   = document.getElementById('yt-music-btn');
    const dropdown   = document.getElementById('yt-dropdown');
    if (!musicBtn || !dropdown) return;

    const urlInput   = document.getElementById('yt-url-input');
    const addBtn     = document.getElementById('yt-add-queue');
    const queueEl    = document.getElementById('yt-queue-list');
    const prevBtn    = document.getElementById('yt-prev');
    const playBtn    = document.getElementById('yt-play');
    const pauseBtn   = document.getElementById('yt-pause');
    const nextBtn    = document.getElementById('yt-next');
    const stopBtn    = document.getElementById('yt-stop');
    const volumeEl   = document.getElementById('yt-volume');
    const statusEl   = document.getElementById('yt-status');
    const timeEl     = document.getElementById('yt-timestamp');

    let player       = null;
    let ytApiReady   = false;
    let ddOpen       = false;
    let queue        = [];     // [{id, title}]
    let currentIdx   = -1;
    let timeInterval = null;

    const LS_KEY_VOL = 'yt_music_volume';

    function saveState() {
        try {
            if (volumeEl) localStorage.setItem(LS_KEY_VOL, volumeEl.value);
            fetch('playlist-save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ queue, currentIdx }),
            }).catch(() => {});
        } catch (_) {}
    }

    async function loadState() {
        try {
            const vol = localStorage.getItem(LS_KEY_VOL);
            if (vol !== null && volumeEl) volumeEl.value = vol;
            const res = await fetch('playlist-load.php', { credentials: 'same-origin' });
            const data = await res.json();
            if (data.success && Array.isArray(data.queue)) {
                queue = data.queue;
                currentIdx = typeof data.currentIdx === 'number' ? data.currentIdx : -1;
            }
        } catch (_) {}
    }

    /* ---------- toggle dropdown ---------- */
    musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ddOpen = !ddOpen;
        dropdown.classList.toggle('open', ddOpen);
    });
    document.addEventListener('click', (e) => {
        if (ddOpen && !dropdown.contains(e.target) && e.target !== musicBtn) {
            ddOpen = false;
            dropdown.classList.remove('open');
        }
    });

    /* ---------- YouTube API ---------- */
    function loadApi() {
        return new Promise((resolve) => {
            if (ytApiReady || (typeof YT !== 'undefined' && YT.Player)) {
                ytApiReady = true; resolve(); return;
            }
            window.onYouTubeIframeAPIReady = () => { ytApiReady = true; resolve(); };
            const s = document.createElement('script');
            s.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(s);
        });
    }

    function videoId(url) {
        const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
        return m ? m[1] : null;
    }

    /* ---------- time formatting ---------- */
    function fmtTime(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function startTimeTracker() {
        clearInterval(timeInterval);
        timeInterval = setInterval(() => {
            if (!player || typeof player.getCurrentTime !== 'function') return;
            try {
                const cur = player.getCurrentTime();
                const dur = player.getDuration();
                timeEl.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
            } catch (_) {}
        }, 500);
    }

    function stopTimeTracker() {
        clearInterval(timeInterval);
        timeEl.textContent = '0:00 / 0:00';
    }

    /* ---------- render queue list ---------- */
    function renderQueue() {
        if (!queueEl) return;
        if (queue.length === 0) {
            queueEl.innerHTML = '<div style="color:var(--gh-text-muted);font-size:11px;padding:4px 0;">Queue is empty</div>';
            return;
        }
        queueEl.innerHTML = queue.map((item, i) => {
            const active = i === currentIdx;
            return `<div class="yt-queue-item ${active ? 'active' : ''}" data-idx="${i}">
                <span class="yt-q-num">${i + 1}</span>
                <span class="yt-q-title">${active ? '\u25B6 ' : ''}${esc(item.title)}</span>
                <button class="yt-q-remove fm-action" data-rm="${i}" title="Remove">&times;</button>
            </div>`;
        }).join('');

        // Click to play specific track
        queueEl.querySelectorAll('.yt-queue-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('yt-q-remove')) return;
                playTrack(parseInt(el.dataset.idx));
            });
        });
        // Remove buttons
        queueEl.querySelectorAll('.yt-q-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.rm);
                queue.splice(idx, 1);
                if (idx < currentIdx) currentIdx--;
                else if (idx === currentIdx) { currentIdx = Math.min(currentIdx, queue.length - 1); }
                renderQueue();
                saveState();
            });
        });
    }

    function esc(s) {
        const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    }

    /* ---------- player management ---------- */
    function createPlayer(videoIdStr, autoplay = true) {
        const container = document.getElementById('yt-player-container');
        container.innerHTML = '<div id="yt-player-el"></div>';
        player = new YT.Player('yt-player-el', {
            height: '1', width: '1',
            videoId: videoIdStr,
            playerVars: { autoplay: autoplay ? 1 : 0 },
            events: {
                onReady(e) {
                    e.target.setVolume(parseInt(volumeEl.value));
                    statusEl.textContent = 'Playing\u2026';
                    startTimeTracker();
                },
                onError() { statusEl.textContent = 'Error loading video'; },
                onStateChange(e) {
                    const labels = { 1: 'Playing\u2026', 2: 'Paused', 0: 'Ended' };
                    if (labels[e.data]) statusEl.textContent = labels[e.data];
                    // Auto-next when track ends
                    if (e.data === 0 && currentIdx < queue.length - 1) {
                        playTrack(currentIdx + 1);
                    } else if (e.data === 0) {
                        stopTimeTracker();
                        statusEl.textContent = 'Queue ended';
                    }
                    if (e.data === 1) startTimeTracker();
                    if (e.data === 2 || e.data === 0) clearInterval(timeInterval);
                },
            },
        });
    }

    async function playTrack(idx) {
        if (idx < 0 || idx >= queue.length) return;
        currentIdx = idx;
        renderQueue();
        saveState();
        statusEl.textContent = 'Loading\u2026';
        await loadApi();

        const vid = queue[idx].id;
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(vid);
            startTimeTracker();
        } else {
            createPlayer(vid);
        }
    }

    /* ---------- Add to queue ---------- */
    function addToQueue() {
        const url = urlInput.value.trim();
        if (!url) { statusEl.textContent = 'Paste a YouTube URL'; return; }
        const id = videoId(url);
        if (!id) { statusEl.textContent = 'Invalid YouTube URL'; return; }
        const title = url.length > 40 ? url.substring(0, 37) + '\u2026' : url;
        queue.push({ id, title });
        urlInput.value = '';
        renderQueue();
        saveState();
        statusEl.textContent = `Added to queue (#${queue.length})`;
        // Auto-play if this is the first track and nothing is playing
        if (queue.length === 1 && currentIdx === -1) {
            playTrack(0);
        }
    }

    addBtn?.addEventListener('click', addToQueue);
    urlInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addToQueue(); });

    /* ---------- Transport controls ---------- */
    playBtn?.addEventListener('click', async () => {
        if (player && typeof player.playVideo === 'function') {
            player.playVideo();
            startTimeTracker();
            return;
        }
        // If no player, play first in queue or prompt
        if (queue.length > 0) {
            playTrack(currentIdx >= 0 ? currentIdx : 0);
        } else {
            // Try single URL from input
            addToQueue();
        }
    });

    pauseBtn?.addEventListener('click', () => {
        if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
            clearInterval(timeInterval);
        }
    });

    stopBtn?.addEventListener('click', () => {
        if (player && typeof player.stopVideo === 'function') {
            player.stopVideo();
            stopTimeTracker();
            statusEl.textContent = 'Stopped';
        }
    });

    prevBtn?.addEventListener('click', () => {
        if (currentIdx > 0) playTrack(currentIdx - 1);
    });

    nextBtn?.addEventListener('click', () => {
        if (currentIdx < queue.length - 1) playTrack(currentIdx + 1);
    });

    volumeEl?.addEventListener('input', () => {
        if (player && typeof player.setVolume === 'function') player.setVolume(parseInt(volumeEl.value));
        saveState();
    });

    (async function init() {
        await loadState();
        renderQueue();
        if (queue.length > 0 && currentIdx >= 0) {
            statusEl.textContent = `Queue: ${queue.length} track(s) — press ▶ to resume`;
        }
    })();
}
