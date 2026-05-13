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
    var saveInterval = null;
    var tickInterval = null;

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
        return base;
    }

    function getKPS() {
        var kps = 0;
        UPGRADES.forEach(function (u) {
            if (u.kps) kps += u.kps * (state.upgrades[u.id] || 0);
        });
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
                if (offlineGain > 0) showToast('Оффлайн доход: +' + formatNumber(offlineGain));
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
        var val = getClickValue();
        state.knowledge += val;
        state.totalKnowledge += val;
        state.clickCount += 1;

        renderStats();
        renderUpgrades();

        // Визуальный эффект
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
        });
    }

    init();
})();
