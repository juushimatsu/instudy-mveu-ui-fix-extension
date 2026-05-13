(function () {
    'use strict';

    /* ──────────────────────────────────────────────────────────
     *  КОНФИГУРАЦИЯ
     * ────────────────────────────────────────────────────────── */
    var UPGRADES = [
        { id: 'coffee',     name: 'Кофе',            icon: '☕', baseCost: 15,     kps: 1,    clickBonus: 0,  desc: '+1 знание/сек' },
        { id: 'energy',     name: 'Энергетик',       icon: '⚡', baseCost: 100,    kps: 5,    clickBonus: 0,  desc: '+5 знаний/сек' },
        { id: 'cheat',      name: 'Шпаргалка',       icon: '📝', baseCost: 50,     kps: 0,    clickBonus: 1,  desc: '+1/клик' },
        { id: 'classmate',  name: 'Одногруппник',    icon: '👤', baseCost: 500,    kps: 10,   clickBonus: 0,  desc: '+10 знаний/сек' },
        { id: 'teacher',    name: 'Преподаватель',   icon: '👨\u200D🏫', baseCost: 2500,   kps: 50,   clickBonus: 0,  desc: '+50 знаний/сек' },
        { id: 'chatgpt',    name: 'ChatGPT',         icon: '🤖', baseCost: 10000,  kps: 200,  clickBonus: 0,  desc: '+200 знаний/сек' },
        { id: 'diploma',    name: 'Дипломная работа', icon: '🎓', baseCost: 50000,  kps: 1000, clickBonus: 0,  desc: '+1000 знаний/сек' }
    ];

    var LEVELS = [
        { name: 'Первокурсник', threshold: 0 },
        { name: 'Второкурсник', threshold: 1000 },
        { name: 'Третьекурсник', threshold: 10000 },
        { name: 'Четвертокурсник', threshold: 50000 },
        { name: 'Бакалавр', threshold: 200000 },
        { name: 'Магистр', threshold: 1000000 },
        { name: 'Аспирант', threshold: 5000000 },
        { name: 'Кандидат наук', threshold: 25000000 },
        { name: 'Доктор наук', threshold: 100000000 },
        { name: 'Ректор', threshold: 500000000 }
    ];

    var STORAGE_KEY = 'clicker_save_v1';

    /* ──────────────────────────────────────────────────────────
     *  СОСТОЯНИЕ
     * ────────────────────────────────────────────────────────── */
    var state = {
        knowledge: 0,
        totalKnowledge: 0,
        clickCount: 0,
        upgrades: {}
    };
    UPGRADES.forEach(function (u) { state.upgrades[u.id] = 0; });

    var lastSave = Date.now();
    var tickInterval = null;

    /* ── События ── */
    var gameState = 'idle'; // idle | exam | lab | virus
    var eventTimer = null;
    var eventCountdown = null;
    var examClicks = 0;
    var labClicks = 0;
    var examBuffEnd = 0;      // +1 к клику на 60с
    var virusPenaltyEnd = 0;  // КПС ×0.5 на 20с
    var labSpinEnd = 0;       // кнопка крутится 10с

    /* ── Онлайн / API ── */
    var apiEnabled = false;
    var apiToken = null;
    var syncTimer = null;
    var heartbeatTimer = null;
    var leaderboardTimer = null;
    var onlineTimer = null;
    var lastServerSync = 0;
    var currentLeaderboard = [];
    var currentOnline = [];
    var pendingOfflineIncome = 0;

    /* ──────────────────────────────────────────────────────────
     *  DOM
     * ────────────────────────────────────────────────────────── */
    var btnEl = document.getElementById('clicker-btn');
    var knowledgeEl = document.getElementById('knowledge');
    var kpsEl = document.getElementById('kps');
    var clickValEl = document.getElementById('click-val');
    var listEl = document.getElementById('upgrade-list');
    var statClicksEl = document.getElementById('stat-clicks');
    var statTotalEl = document.getElementById('stat-total');
    var levelNameEl = document.getElementById('level-name');
    var levelProgressEl = document.getElementById('level-progress');
    var levelFillEl = document.getElementById('level-fill');

    /* Оверлеи */
    var examOverlay = document.getElementById('exam-overlay');
    var examBtn = document.getElementById('exam-btn');
    var examTimer = document.getElementById('exam-timer');
    var examScore = document.getElementById('exam-score');
    var labOverlay = document.getElementById('lab-overlay');
    var labTarget = document.getElementById('lab-target');
    var labTimer = document.getElementById('lab-timer');
    var labScore = document.getElementById('lab-score');
    var virusOverlay = document.getElementById('virus-overlay');
    var virusBanner = document.getElementById('virus-banner');
    var virusClose = document.getElementById('virus-close');

    /* ──────────────────────────────────────────────────────────
     *  УТИЛИТЫ
     * ────────────────────────────────────────────────────────── */
    function formatNumber(n) {
        if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
        if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
        return Math.floor(n).toString();
    }

    function getUpgradeCost(upg) {
        var count = state.upgrades[upg.id] || 0;
        return Math.floor(upg.baseCost * Math.pow(1.15, count));
    }

    function getClickValue() {
        var base = 1;
        UPGRADES.forEach(function (u) {
            if (u.clickBonus) base += u.clickBonus * (state.upgrades[u.id] || 0);
        });
        if (Date.now() < examBuffEnd) base += 1;
        return base;
    }

    function getKPS() {
        var kps = 0;
        UPGRADES.forEach(function (u) {
            if (u.kps) kps += u.kps * (state.upgrades[u.id] || 0);
        });
        if (Date.now() < virusPenaltyEnd) kps *= 0.5;
        return kps;
    }

    function getCurrentLevel() {
        var lvl = LEVELS[0];
        for (var i = 0; i < LEVELS.length; i++) {
            if (state.totalKnowledge >= LEVELS[i].threshold) lvl = LEVELS[i];
        }
        return lvl;
    }

    function getNextLevel() {
        var idx = LEVELS.indexOf(getCurrentLevel());
        return LEVELS[idx + 1] || null;
    }

    function getLevelProgress() {
        var cur = getCurrentLevel();
        var next = getNextLevel();
        if (!next) return 100;
        var range = next.threshold - cur.threshold;
        var prog = state.totalKnowledge - cur.threshold;
        return Math.min(100, Math.max(0, (prog / range) * 100));
    }

    /* ──────────────────────────────────────────────────────────
     *  СОХРАНЕНИЕ / ЗАГРУЗКА
     * ────────────────────────────────────────────────────────── */
    function saveGame() {
        try {
            var data = {
                knowledge: state.knowledge,
                totalKnowledge: state.totalKnowledge,
                clickCount: state.clickCount,
                upgrades: state.upgrades,
                savedAt: Date.now()
            };
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [STORAGE_KEY]: data });
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
            lastSave = Date.now();
        } catch (_) { /* noop */ }
    }

    function loadGame(callback) {
        var onData = function (data) {
            if (data) {
                var offlineSeconds = 0;
                if (data.savedAt) {
                    offlineSeconds = Math.min((Date.now() - data.savedAt) / 1000, 14400);
                }
                var offlineKPS = 0;
                UPGRADES.forEach(function (u) {
                    if (u.kps && data.upgrades && data.upgrades[u.id]) {
                        offlineKPS += u.kps * data.upgrades[u.id];
                    }
                });
                var offlineGain = offlineKPS * offlineSeconds;

                state.knowledge = (data.knowledge || 0) + offlineGain;
                state.totalKnowledge = (data.totalKnowledge || 0) + offlineGain;
                state.clickCount = data.clickCount || 0;
                if (data.upgrades) {
                    Object.keys(data.upgrades).forEach(function (key) {
                        state.upgrades[key] = data.upgrades[key];
                    });
                }
                if (offlineGain > 0) {
                    pendingOfflineIncome = offlineGain;
                    showToast('Оффлайн доход: +' + formatNumber(offlineGain));
                }
            }
            if (callback) callback();
        };

        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([STORAGE_KEY], function (result) {
                    onData(result[STORAGE_KEY]);
                });
            } else {
                var raw = localStorage.getItem(STORAGE_KEY);
                onData(raw ? JSON.parse(raw) : null);
            }
        } catch (_) {
            if (callback) callback();
        }
    }

    /* ──────────────────────────────────────────────────────────
     *  РЕНДЕР
     * ────────────────────────────────────────────────────────── */
    function renderStats() {
        knowledgeEl.textContent = formatNumber(state.knowledge);
        kpsEl.textContent = '+' + formatNumber(getKPS());
        clickValEl.textContent = '+' + getClickValue();
        statClicksEl.textContent = formatNumber(state.clickCount);
        statTotalEl.textContent = formatNumber(state.totalKnowledge);

        var lvl = getCurrentLevel();
        var next = getNextLevel();
        levelNameEl.textContent = lvl.name;
        var prog = getLevelProgress();
        levelProgressEl.textContent = Math.floor(prog) + '%';
        levelFillEl.style.width = prog + '%';

        if (!next) {
            levelProgressEl.textContent = 'MAX';
            levelFillEl.style.background = 'var(--accent-dim)';
        }
    }

    function renderUpgrades() {
        listEl.innerHTML = '';
        UPGRADES.forEach(function (u) {
            var count = state.upgrades[u.id] || 0;
            var cost = getUpgradeCost(u);
            var affordable = state.knowledge >= cost;

            var item = document.createElement('div');
            item.className = 'upgrade-item';
            item.innerHTML =
                '<div class="upgrade-icon">' + u.icon + '</div>' +
                '<div class="upgrade-info">' +
                    '<div class="upgrade-name">' + escapeHtml(u.name) + '</div>' +
                    '<div class="upgrade-desc">' + escapeHtml(u.desc) + ' | Цена: ' + formatNumber(cost) + '</div>' +
                '</div>' +
                '<div class="upgrade-count">' + count + '</div>' +
                '<button class="upgrade-buy ' + (affordable ? 'affordable' : '') + '" data-id="' + u.id + '" ' + (affordable ? '' : 'disabled') + '>' +
                    'Купить' +
                '</button>';
            listEl.appendChild(item);
        });

        listEl.querySelectorAll('.upgrade-buy').forEach(function (b) {
            b.addEventListener('click', function () {
                buyUpgrade(b.dataset.id);
            });
        });
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ──────────────────────────────────────────────────────────
     *  ПОКУПКА
     * ────────────────────────────────────────────────────────── */
    function buyUpgrade(id) {
        var upg = UPGRADES.find(function (u) { return u.id === id; });
        if (!upg) return;
        var cost = getUpgradeCost(upg);
        if (state.knowledge < cost) return;

        state.knowledge -= cost;
        state.upgrades[id] = (state.upgrades[id] || 0) + 1;

        renderStats();
        renderUpgrades();
        saveGame();
    }

    /* ──────────────────────────────────────────────────────────
     *  КЛИК
     * ────────────────────────────────────────────────────────── */
    function onClick(e) {
        if (gameState !== 'idle') return; // нельзя кликать во время событий
        var val = getClickValue();
        state.knowledge += val;
        state.totalKnowledge += val;
        state.clickCount += 1;

        renderStats();
        renderUpgrades();

        var rect = btnEl.getBoundingClientRect();
        var x = rect.left + rect.width / 2 + (Math.random() * 60 - 30);
        var y = rect.top + rect.height / 2 - 20;
        spawnFloatText(x, y, '+' + val);

        if (state.clickCount % 10 === 0) saveGame();
    }

    function spawnFloatText(x, y, text) {
        var el = document.createElement('div');
        el.className = 'float-text';
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 900);
    }

    function showToast(msg) {
        var el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 3000);
    }

    /* ──────────────────────────────────────────────────────────
     *  ПАССИВНЫЙ ДОХОД
     * ────────────────────────────────────────────────────────── */
    function tick() {
        if (gameState !== 'idle') {
            // Во время событий пассивный доход приостанавливается
            if (Date.now() - lastSave > 5000) saveGame();
            return;
        }
        var kps = getKPS();
        if (kps > 0) {
            var gain = kps * 0.1;
            state.knowledge += gain;
            state.totalKnowledge += gain;
            renderStats();
            renderUpgrades();
        }
        if (Date.now() - lastSave > 5000) saveGame();
    }

    /* ══════════════════════════════════════════════════════════
     *  СОБЫТИЯ
     * ══════════════════════════════════════════════════════════ */
    function scheduleEvent() {
        if (gameState !== 'idle') return;
        var delay = 15000 + Math.random() * 30000; // 15–45 сек
        eventTimer = setTimeout(function () {
            if (gameState !== 'idle') return;
            var roll = Math.random();
            if (roll < 0.33) startExam();
            else if (roll < 0.66) startLab();
            else startVirus();
        }, delay);
    }

    function clearEventTimer() {
        if (eventTimer) { clearTimeout(eventTimer); eventTimer = null; }
        if (eventCountdown) { clearInterval(eventCountdown); eventCountdown = null; }
    }

    /* ── Экзамен ── */
    function startExam() {
        gameState = 'exam';
        examClicks = 0;
        examTimer.textContent = '5.0';
        examScore.textContent = '0 кликов';
        examBtn.classList.remove('shake');
        examOverlay.style.display = 'flex';

        var timeLeft = 5.0;
        eventCountdown = setInterval(function () {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(eventCountdown);
                endExam();
            }
            examTimer.textContent = timeLeft.toFixed(1);
        }, 100);
    }

    function endExam() {
        examOverlay.style.display = 'none';
        if (examClicks >= 15) {
            examBuffEnd = Date.now() + 60000;
            state.knowledge += 50;
            state.totalKnowledge += 50;
            showToast('Экзамен сдан! +50 знаний, +1/клик на 60с');
        } else {
            var loss = state.knowledge * 0.20;
            state.knowledge = Math.max(0, state.knowledge - loss);
            examBtn.classList.add('shake');
            showToast('Экзамен провален! −20% знаний');
        }
        gameState = 'idle';
        renderStats();
        scheduleEvent();
    }

    examBtn.addEventListener('click', function (e) {
        if (gameState !== 'exam') return;
        e.stopPropagation();
        examClicks += 1;
        examScore.textContent = examClicks + ' кликов';
        // Визуальный отклик
        examBtn.style.transform = 'scale(0.88)';
        setTimeout(function () { examBtn.style.transform = ''; }, 80);
    });

    /* ── Лабораторная ── */
    function moveLabTarget() {
        if (gameState !== 'lab') return;
        var panel = labTarget.parentElement;
        var pw = panel.clientWidth;
        var ph = panel.clientHeight;
        var tw = labTarget.offsetWidth;
        var th = labTarget.offsetHeight;
        var maxX = pw - tw - 20;
        var maxY = ph - th - 20;
        labTarget.style.left = (10 + Math.random() * maxX) + 'px';
        labTarget.style.top = (10 + Math.random() * maxY) + 'px';
    }

    function startLab() {
        gameState = 'lab';
        labClicks = 0;
        labTimer.textContent = '7.0';
        labScore.textContent = '0/8';
        labTarget.classList.remove('spin');
        labTarget.style.left = '50%';
        labTarget.style.top = '50%';
        labTarget.style.transform = 'translate(-50%,-50%)';
        labOverlay.style.display = 'flex';

        moveLabTarget();
        var moveTimer = setInterval(function () {
            if (gameState !== 'lab') { clearInterval(moveTimer); return; }
            moveLabTarget();
        }, 600);

        var timeLeft = 7.0;
        eventCountdown = setInterval(function () {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(eventCountdown);
                clearInterval(moveTimer);
                endLab();
            }
            labTimer.textContent = timeLeft.toFixed(1);
        }, 100);
    }

    function endLab() {
        labOverlay.style.display = 'none';
        if (labClicks >= 8) {
            state.knowledge += 50;
            state.totalKnowledge += 50;
            showToast('Лаба сдана! +50 знаний, +0.5 КПС на 60с');
        } else {
            var loss = state.knowledge * 0.15;
            state.knowledge = Math.max(0, state.knowledge - loss);
            labSpinEnd = Date.now() + 10000;
            showToast('Лаба провалена! −15% знаний, кнопка крутится');
        }
        gameState = 'idle';
        renderStats();
        scheduleEvent();
    }

    labTarget.addEventListener('click', function (e) {
        if (gameState !== 'lab') return;
        e.stopPropagation();
        labClicks += 1;
        labScore.textContent = labClicks + '/8';
        moveLabTarget();
    });

    /* ── Вирусный баннер ── */
    function startVirus() {
        gameState = 'virus';
        var gx = 10 + Math.random() * 50;
        var gy = 10 + Math.random() * 40;
        virusBanner.style.left = gx + '%';
        virusBanner.style.top = gy + '%';
        virusBanner.style.transform = 'translate(-50%, -50%)';
        virusOverlay.style.display = 'flex';

        var timeLeft = 2.0;
        eventCountdown = setInterval(function () {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(eventCountdown);
                endVirus(false);
            }
        }, 100);
    }

    function endVirus(success) {
        virusOverlay.style.display = 'none';
        if (success) {
            state.knowledge += 30;
            state.totalKnowledge += 30;
            showToast('Баннер закрыт! +30 знаний');
        } else {
            virusPenaltyEnd = Date.now() + 20000;
            showToast('Вирус! КПС −50% на 20 секунд');
        }
        gameState = 'idle';
        renderStats();
        scheduleEvent();
    }

    virusClose.addEventListener('click', function (e) {
        if (gameState !== 'virus') return;
        e.stopPropagation();
        clearInterval(eventCountdown);
        endVirus(true);
    });

    /* ──────────────────────────────────────────────────────────
     *  ОНЛАЙН ФУНКЦИИ (API)
     * ────────────────────────────────────────────────────────── */
    function tryAuth() {
        // Пытаемся получить токен из storage
        function checkStorage(done) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['instudy_api_token', 'instudy_auth_data'], function (res) {
                    done(res.instudy_api_token, res.instudy_auth_data);
                });
            } else {
                done(localStorage.getItem('instudy_api_token'), null);
            }
        }
        checkStorage(function (token, auth) {
            if (token) {
                apiToken = token;
                apiEnabled = true;
                // Загружаем состояние с сервера, чтобы избежать 403 при сбросе локальных данных
                if (window.ClickerAPI) {
                    window.ClickerAPI.getMe(function (err2, me) {
                        if (!err2 && me && me.success && me.user && me.user.score) {
                            var s = me.user.score;
                            state.knowledge = s.knowledge || 0;
                            state.totalKnowledge = s.total_knowledge || 0;
                            state.clickCount = s.click_count || 0;
                            state.upgrades = s.upgrades || {};
                            renderStats();
                            renderUpgrades();
                        }
                        startOnlineFeatures();
                    });
                } else {
                    startOnlineFeatures();
                }
                return;
            }
            // Если токена нет, но есть auth данные — авторизуемся
            if (!auth) {
                // Запрашиваем у content.js
                window.parent.postMessage({ type: 'request-instudy-auth' }, '*');
                // Повторная попытка через 2 сек
                setTimeout(tryAuth, 2000);
                return;
            }
            if (window.ClickerAPI) {
                window.ClickerAPI.auth(auth.instudy_user_id, auth.username, function (err, data) {
                    if (!err && data && data.success) {
                        apiToken = data.token;
                        apiEnabled = true;
                        // Загружаем состояние с сервера (если есть) чтобы избежать 403
                        window.ClickerAPI.getMe(function (err2, me) {
                            if (!err2 && me && me.success && me.user && me.user.score) {
                                var s = me.user.score;
                                state.knowledge = s.knowledge || 0;
                                state.totalKnowledge = s.total_knowledge || 0;
                                state.clickCount = s.click_count || 0;
                                state.upgrades = s.upgrades || {};
                                renderStats();
                                renderUpgrades();
                            }
                            startOnlineFeatures();
                        });
                    }
                });
            }
        });
    }

    function startOnlineFeatures() {
        if (!apiEnabled) return;
        createOnlineUI();
        syncToServer();
        sendHeartbeat();
        loadLeaderboard();
        loadOnline();
        // Синхронизация каждые 30 сек
        syncTimer = setInterval(syncToServer, 30000);
        // Heartbeat каждые 30 сек
        heartbeatTimer = setInterval(sendHeartbeat, 30000);
        // Обновление рейтинга каждые 60 сек
        leaderboardTimer = setInterval(loadLeaderboard, 60000);
        // Обновление онлайна каждые 30 сек
        onlineTimer = setInterval(loadOnline, 30000);
    }

    function syncToServer() {
        if (!apiEnabled || !window.ClickerAPI) return;
        window.ClickerAPI.sync(state, pendingOfflineIncome, function (err, data) {
            if (!err && data && data.success) {
                lastServerSync = Date.now();
                pendingOfflineIncome = 0; // сбрасываем после успешной синхронизации
                updateSyncStatus('Синхронизировано');
            } else if (data && data.anticheat) {
                updateSyncStatus('Подозрительная активность', true);
            } else {
                updateSyncStatus('Ошибка синхронизации', true);
            }
        });
    }

    function sendHeartbeat() {
        if (!apiEnabled || !window.ClickerAPI) return;
        window.ClickerAPI.heartbeat(function () { /* noop */ });
    }

    function loadLeaderboard() {
        if (!apiEnabled || !window.ClickerAPI) return;
        window.ClickerAPI.getLeaderboard('all', 20, function (err, data) {
            if (!err && data && data.success && data.leaderboard) {
                currentLeaderboard = data.leaderboard;
                renderLeaderboard();
            }
        });
    }

    function loadOnline() {
        if (!apiEnabled || !window.ClickerAPI) return;
        window.ClickerAPI.getOnline(function (err, data) {
            if (!err && data && data.success && data.users) {
                currentOnline = data.users;
                renderOnline();
            }
        });
    }

    function updateSyncStatus(text, isError) {
        var el = document.getElementById('sync-status');
        if (!el) return;
        el.textContent = text;
        el.style.color = isError ? '#c25f5f' : 'var(--text-muted)';
    }

    function createOnlineUI() {
        var header = document.querySelector('.game-header');
        if (!header || document.getElementById('lb-btn')) return;

        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:6px;margin-left:auto;align-items:center;';

        var lbBtn = document.createElement('button');
        lbBtn.id = 'lb-btn';
        lbBtn.textContent = '🏆';
        lbBtn.title = 'Рейтинг';
        lbBtn.className = 'tm-game-tab-btn';
        lbBtn.onclick = function () { showPanel('leaderboard'); };

        var onBtn = document.createElement('button');
        onBtn.id = 'on-btn';
        onBtn.textContent = '🌐';
        onBtn.title = 'Онлайн';
        onBtn.className = 'tm-game-tab-btn';
        onBtn.onclick = function () { showPanel('online'); };

        var syncStatus = document.createElement('span');
        syncStatus.id = 'sync-status';
        syncStatus.style.cssText = 'font-family:var(--font-mono);font-size:9px;color:var(--text-muted);margin-left:4px;white-space:nowrap;';
        syncStatus.textContent = 'Синхронизация...';

        wrap.appendChild(lbBtn);
        wrap.appendChild(onBtn);
        wrap.appendChild(syncStatus);
        header.appendChild(wrap);

        // Стили кнопок вкладок
        var style = document.createElement('style');
        style.textContent = '.tm-game-tab-btn{background:var(--bg-3);border:1px solid var(--border);border-radius:6px;width:28px;height:28px;font-size:14px;cursor:pointer;color:var(--text-dim);display:inline-flex;align-items:center;justify-content:center;transition:all .15s ease;}' +
            '.tm-game-tab-btn:hover{border-color:var(--accent-dim);color:var(--accent);}' +
            '.tm-game-tab-btn.active{background:var(--bg-4);border-color:var(--accent-dim);color:var(--accent);}' +
            '.tm-online-panel{position:absolute;top:0;left:0;width:100%;height:100%;background:var(--bg-1);z-index:100;display:none;flex-direction:column;padding:14px 16px;overflow:hidden;}' +
            '.tm-online-panel.show{display:flex;}' +
            '.tm-panel-title{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}' +
            '.tm-panel-close{position:absolute;top:10px;right:12px;background:transparent;border:none;color:var(--text-dim);font-size:18px;cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;}' +
            '.tm-panel-close:hover{background:var(--bg-3);color:var(--accent);}' +
            '.tm-lb-row{display:flex;align-items:center;gap:10px;padding:6px 4px;border-radius:6px;font-family:var(--font-mono);font-size:12px;}' +
            '.tm-lb-row:hover{background:var(--bg-2);}' +
            '.tm-lb-rank{width:24px;text-align:center;color:var(--accent-soft);font-weight:600;}' +
            '.tm-lb-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text);}' +
            '.tm-lb-score{color:var(--accent-soft);font-weight:600;}' +
            '.tm-on-row{display:flex;align-items:center;gap:8px;padding:5px 4px;font-family:var(--font-mono);font-size:12px;color:var(--text-dim);}' +
            '.tm-on-dot{width:8px;height:8px;border-radius:50%;background:#5a9e6f;flex-shrink:0;}' +
            '.tm-on-name{color:var(--text);}';
        document.head.appendChild(style);

        // Панель рейтинга
        var lbPanel = document.createElement('div');
        lbPanel.id = 'panel-leaderboard';
        lbPanel.className = 'tm-online-panel';
        lbPanel.innerHTML = '<div class="tm-panel-title">🏆 Рейтинг</div><button class="tm-panel-close">×</button><div id="lb-list" style="overflow-y:auto;flex:1;"></div>';
        lbPanel.querySelector('.tm-panel-close').onclick = function () { hidePanels(); };
        document.querySelector('.game-wrapper').appendChild(lbPanel);

        // Панель онлайн
        var onPanel = document.createElement('div');
        onPanel.id = 'panel-online';
        onPanel.className = 'tm-online-panel';
        onPanel.innerHTML = '<div class="tm-panel-title">🌐 В сети (<span id="online-count">0</span>)</div><button class="tm-panel-close">×</button><div id="on-list" style="overflow-y:auto;flex:1;"></div>';
        onPanel.querySelector('.tm-panel-close').onclick = function () { hidePanels(); };
        document.querySelector('.game-wrapper').appendChild(onPanel);
    }

    function showPanel(name) {
        hidePanels();
        var p = document.getElementById('panel-' + name);
        if (p) p.classList.add('show');
        document.getElementById('lb-btn').classList.toggle('active', name === 'leaderboard');
        document.getElementById('on-btn').classList.toggle('active', name === 'online');
        if (name === 'leaderboard') renderLeaderboard();
        if (name === 'online') renderOnline();
    }

    function hidePanels() {
        document.querySelectorAll('.tm-online-panel').forEach(function (p) { p.classList.remove('show'); });
        document.getElementById('lb-btn').classList.remove('active');
        document.getElementById('on-btn').classList.remove('active');
    }

    function renderLeaderboard() {
        var list = document.getElementById('lb-list');
        if (!list) return;
        if (!currentLeaderboard.length) {
            list.innerHTML = '<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px;text-align:center;padding-top:20px;">Загрузка...</div>';
            return;
        }
        list.innerHTML = currentLeaderboard.map(function (r) {
            return '<div class="tm-lb-row">' +
                '<div class="tm-lb-rank">#' + r.rank + '</div>' +
                '<div class="tm-lb-name">' + escapeHtml(r.username) + '</div>' +
                '<div class="tm-lb-score">' + formatNumber(r.total_knowledge) + '</div>' +
                '</div>';
        }).join('');
    }

    function renderOnline() {
        var list = document.getElementById('on-list');
        var countEl = document.getElementById('online-count');
        if (!list) return;
        if (countEl) countEl.textContent = currentOnline.length;
        if (!currentOnline.length) {
            list.innerHTML = '<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px;text-align:center;padding-top:20px;">Никого нет в сети</div>';
            return;
        }
        list.innerHTML = currentOnline.map(function (u) {
            return '<div class="tm-on-row"><div class="tm-on-dot"></div><div class="tm-on-name">' + escapeHtml(u.username) + '</div></div>';
        }).join('');
    }

    /* ──────────────────────────────────────────────────────────
     *  ИНИЦИАЛИЗАЦИЯ
     * ────────────────────────────────────────────────────────── */
    function init() {
        loadGame(function () {
            renderStats();
            renderUpgrades();
            btnEl.addEventListener('click', onClick);
            tickInterval = setInterval(tick, 100);
            window.addEventListener('beforeunload', saveGame);
            scheduleEvent();
            tryAuth(); // <-- онлайн-функции
        });
    }

    init();
})();
