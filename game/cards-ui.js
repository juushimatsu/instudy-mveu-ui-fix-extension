/*
 * cards-ui.js — UI магазина, коллекции и анимация открытия пака.
 *
 * Зависит от window.ClickerCards (логика/конфиг) и window.ClickerGame
 * (мост к game.js: state, save, sync, format, тосты).
 *
 * Архитектура «безопасной» покупки: при покупке монеты списываются,
 * карты сразу добавляются в state.cards и сохраняются. Анимация — лишь
 * визуальное представление. Закрытие окна не отменяет покупку, но и не
 * отнимает ничего повторно.
 */
(function () {
    'use strict';
    if (!window.ClickerCards) return;

    var CARDS = window.ClickerCards.CARDS;
    var RARITY_META = window.ClickerCards.RARITY_META;
    var PACKS = window.ClickerCards.PACKS;
    var rollPack = window.ClickerCards.rollPack;
    var cardImageUrl = window.ClickerCards.cardImageUrl;

    /* ── СТИЛИ ── */
    var STYLE = ''
        + '.cc-panel{display:none;flex-direction:column;}'
        + '.cc-panel.show{display:flex;}'
        + '.cc-tabs{display:flex;gap:6px;margin-bottom:10px;}'
        + '.cc-tab{flex:1;padding:6px 10px;background:var(--bg-3);border:1px solid var(--border);'
        +   'border-radius:6px;font-family:var(--font-mono);font-size:11px;color:var(--text-dim);'
        +   'cursor:pointer;text-transform:uppercase;letter-spacing:.06em;transition:all .15s ease;}'
        + '.cc-tab:hover{border-color:var(--accent-dim);color:var(--accent);}'
        + '.cc-tab.active{background:var(--bg-4);color:var(--accent);border-color:var(--accent-dim);}'
        + '.cc-shop{display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1;}'
        + '.cc-pack{background:var(--bg-2);border:1px solid var(--border);border-radius:8px;'
        +   'padding:14px;display:flex;align-items:center;gap:14px;}'
        + '.cc-pack-icon{font-size:36px;width:50px;text-align:center;flex-shrink:0;}'
        + '.cc-pack-info{flex:1;min-width:0;}'
        + '.cc-pack-name{font-family:var(--font-display);font-size:14px;color:var(--text);margin-bottom:2px;}'
        + '.cc-pack-desc{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);}'
        + '.cc-pack-buy{background:var(--bg-4);border:1px solid var(--border-2);border-radius:6px;'
        +   'padding:8px 14px;font-family:var(--font-mono);font-size:12px;color:var(--accent);'
        +   'cursor:pointer;white-space:nowrap;transition:all .15s ease;}'
        + '.cc-pack-buy:hover:not(:disabled){background:var(--bg-5);border-color:var(--accent-dim);}'
        + '.cc-pack-buy:disabled{opacity:.35;cursor:not-allowed;}'
        + '.cc-collection{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;'
        +   'overflow-y:auto;flex:1;align-content:start;padding-bottom:6px;}'
        + '.cc-collection-item{background:var(--bg-2);border:1px solid var(--border);'
        +   'border-radius:8px;padding:8px;text-align:center;position:relative;'
        +   'transition:transform .15s ease,border-color .15s ease;cursor:pointer;}'
        + '.cc-collection-item:hover{transform:translateY(-2px);}'
        + '.cc-collection-item.locked{opacity:.35;filter:grayscale(1);}'
        + '.cc-collection-item img{width:100%;aspect-ratio:3/4;object-fit:cover;'
        +   'border-radius:4px;display:block;background:var(--bg-3);}'
        + '.cc-collection-name{font-family:var(--font-mono);font-size:9px;color:var(--text-dim);'
        +   'margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
        + '.cc-collection-count{position:absolute;top:4px;right:4px;background:rgba(0,0,0,.65);'
        +   'color:var(--accent);font-family:var(--font-mono);font-size:10px;'
        +   'padding:2px 6px;border-radius:10px;}'
        + '.cc-rarity-bar{position:absolute;left:8px;right:8px;bottom:22px;height:2px;border-radius:1px;}'
        + '.cc-collection-foot{padding:8px 0 0;border-top:1px solid var(--border);'
        +   'margin-top:6px;display:flex;justify-content:space-between;align-items:center;'
        +   'font-family:var(--font-mono);font-size:11px;color:var(--text-muted);}'
        + '.cc-dust-btn{background:var(--bg-4);border:1px solid var(--border-2);border-radius:6px;'
        +   'padding:6px 12px;font-family:var(--font-mono);font-size:11px;color:var(--accent);'
        +   'cursor:pointer;transition:all .15s ease;}'
        + '.cc-dust-btn:hover:not(:disabled){background:var(--bg-5);border-color:var(--accent-dim);}'
        + '.cc-dust-btn:disabled{opacity:.35;cursor:not-allowed;}'
        /* ── Оверлей открытия пака ── */
        + '.cc-open-overlay{position:absolute;inset:0;background:rgba(10,10,12,.92);'
        +   'z-index:3000;display:none;align-items:center;justify-content:center;'
        +   'flex-direction:column;gap:18px;padding:20px;user-select:none;overflow:hidden;}'
        + '.cc-open-overlay.show{display:flex;}'
        + '.cc-open-title{font-family:var(--font-display);font-size:14px;color:var(--text-dim);'
        +   'text-transform:uppercase;letter-spacing:.08em;}'
        + '.cc-open-hint{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);'
        +   'text-align:center;}'
        + '.cc-pack-visual{position:relative;width:200px;height:280px;cursor:grab;touch-action:none;}'
        + '.cc-pack-visual:active{cursor:grabbing;}'
        + '.cc-pack-half{position:absolute;left:0;width:100%;background:linear-gradient(135deg,#3a3a45,#22222a);'
        +   'border:1px solid var(--border-2);box-shadow:0 4px 16px rgba(0,0,0,.5);'
        +   'display:flex;align-items:center;justify-content:center;font-size:80px;'
        +   'transition:transform .15s ease;overflow:hidden;}'
        + '.cc-pack-half.top{top:0;height:50%;border-radius:12px 12px 0 0;'
        +   'background:linear-gradient(135deg,#42424d,#2a2a32);}'
        + '.cc-pack-half.bot{top:50%;height:50%;border-radius:0 0 12px 12px;}'
        + '.cc-pack-half.top span{transform:translateY(40px);}'
        + '.cc-pack-half.bot span{transform:translateY(-40px);}'
        + '.cc-pack-tear{position:absolute;left:0;right:0;top:50%;height:2px;'
        +   'background:repeating-linear-gradient(90deg,var(--accent-dim) 0 4px,transparent 4px 8px);'
        +   'transform:translateY(-1px);opacity:.6;}'
        + '.cc-pack-progress{width:200px;height:4px;background:var(--bg-3);border-radius:2px;overflow:hidden;}'
        + '.cc-pack-progress-fill{height:100%;background:var(--accent);width:0%;transition:width .05s linear;}'
        /* Карты в анимации */
        + '.cc-card-stage{position:relative;width:220px;height:300px;perspective:1000px;}'
        + '.cc-card{position:absolute;width:100%;height:100%;transform-style:preserve-3d;'
        +   'transition:transform .55s cubic-bezier(.4,.0,.2,1);cursor:pointer;}'
        + '.cc-card.flipped{transform:rotateY(180deg);}'
        + '.cc-card-side{position:absolute;width:100%;height:100%;backface-visibility:hidden;'
        +   '-webkit-backface-visibility:hidden;border-radius:12px;overflow:hidden;'
        +   'border:2px solid var(--border-2);box-shadow:0 8px 28px rgba(0,0,0,.6);}'
        + '.cc-card-back{background:linear-gradient(135deg,#2a2a32,#15151a);'
        +   'display:flex;align-items:center;justify-content:center;font-size:90px;color:var(--accent-dim);}'
        + '.cc-card-front{transform:rotateY(180deg);background:var(--bg-2);}'
        + '.cc-card-front img{width:100%;height:100%;object-fit:cover;display:block;}'
        + '.cc-card-rarity{position:absolute;left:0;right:0;bottom:0;padding:10px 12px;'
        +   'background:linear-gradient(180deg,transparent,rgba(0,0,0,.85));'
        +   'font-family:var(--font-display);font-size:12px;text-transform:uppercase;'
        +   'letter-spacing:.06em;text-align:center;}'
        + '.cc-card-name-final{font-family:var(--font-mono);font-size:10px;color:var(--text-dim);'
        +   'margin-top:2px;letter-spacing:.04em;}'
        /* Финальный ряд */
        + '.cc-final-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:100%;}'
        + '.cc-final-card{width:74px;height:100px;border-radius:6px;overflow:hidden;'
        +   'border:2px solid var(--border-2);position:relative;background:var(--bg-2);'
        +   'animation:ccFinalIn .35s cubic-bezier(.2,.8,.4,1.1) backwards;}'
        + '.cc-final-card img{width:100%;height:100%;object-fit:cover;display:block;}'
        + '.cc-final-card .cc-rarity-bar{left:2px;right:2px;bottom:2px;}'
        + '@keyframes ccFinalIn{from{opacity:0;transform:scale(.6) translateY(20px);}'
        +   'to{opacity:1;transform:scale(1) translateY(0);}}'
        + '.cc-open-actions{display:flex;gap:8px;}'
        + '.cc-action-btn{background:var(--bg-3);border:1px solid var(--border-2);border-radius:6px;'
        +   'padding:8px 16px;font-family:var(--font-mono);font-size:12px;color:var(--accent);'
        +   'cursor:pointer;transition:all .15s ease;}'
        + '.cc-action-btn:hover{background:var(--bg-4);border-color:var(--accent-dim);}'
        + '@keyframes ccGlow{0%,100%{box-shadow:0 0 0 var(--cc-glow);}50%{box-shadow:0 0 32px var(--cc-glow);}}';

    function injectStyle() {
        if (document.getElementById('cc-style')) return;
        var s = document.createElement('style');
        s.id = 'cc-style';
        s.textContent = STYLE;
        document.head.appendChild(s);
    }

    /* ──────────────────────────────────────────────────────────
     *  Магазин и коллекция (панели)
     * ────────────────────────────────────────────────────────── */
    function escapeText(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function ensurePanel() {
        injectStyle();
        var existing = document.getElementById('panel-cards');
        if (existing) return existing;
        var panel = document.createElement('div');
        panel.id = 'panel-cards';
        panel.className = 'tm-online-panel cc-panel';
        panel.innerHTML =
            '<div class="tm-panel-title">🎴 Карточки</div>' +
            '<button class="tm-panel-close">×</button>' +
            '<div class="cc-tabs">' +
                '<button class="cc-tab active" data-cctab="shop">Магазин</button>' +
                '<button class="cc-tab" data-cctab="collection">Коллекция</button>' +
            '</div>' +
            '<div id="cc-body" style="flex:1;overflow:hidden;display:flex;flex-direction:column;"></div>';
        panel.querySelector('.tm-panel-close').onclick = function () {
            panel.classList.remove('show');
        };
        panel.querySelectorAll('.cc-tab').forEach(function (t) {
            t.onclick = function () {
                panel.querySelectorAll('.cc-tab').forEach(function (x) { x.classList.remove('active'); });
                t.classList.add('active');
                renderBody(t.dataset.cctab);
            };
        });
        document.querySelector('.game-wrapper').appendChild(panel);

        function renderBody(tab) {
            var body = panel.querySelector('#cc-body');
            body.innerHTML = '';
            if (tab === 'shop') body.appendChild(renderShop());
            else body.appendChild(renderCollection());
        }
        panel._refresh = function () {
            var active = panel.querySelector('.cc-tab.active');
            renderBody(active ? active.dataset.cctab : 'shop');
        };
        renderBody('shop');
        return panel;
    }

    function renderShop() {
        var wrap = document.createElement('div');
        wrap.className = 'cc-shop';
        Object.keys(PACKS).forEach(function (key) {
            var pack = PACKS[key];
            var node = document.createElement('div');
            node.className = 'cc-pack';
            var fmt = window.ClickerGame.formatNumber;
            var canBuy = window.ClickerGame.getKnowledge() >= pack.cost;
            node.innerHTML =
                '<div class="cc-pack-icon">' + pack.icon + '</div>' +
                '<div class="cc-pack-info">' +
                    '<div class="cc-pack-name">' + escapeText(pack.name) + '</div>' +
                    '<div class="cc-pack-desc">' + pack.size + ' карт · ' + fmt(pack.cost) + ' знаний</div>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:4px;">' +
                    '<button class="cc-pack-buy" data-mode="anim" ' + (canBuy ? '' : 'disabled') + '>Открыть</button>' +
                    '<button class="cc-pack-buy" data-mode="instant" ' + (canBuy ? '' : 'disabled') + '>Открыть сразу</button>' +
                '</div>';
            node.querySelectorAll('.cc-pack-buy').forEach(function (b) {
                b.onclick = function () { buyAndOpen(key, b.dataset.mode); };
            });
            wrap.appendChild(node);
        });
        return wrap;
    }

    function renderCollection() {
        var container = document.createElement('div');
        container.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

        var grid = document.createElement('div');
        grid.className = 'cc-collection';

        var cardsState = window.ClickerGame.getCards();
        var owned = 0;
        var dustValue = 0;

        CARDS.forEach(function (c) {
            var count = cardsState[c.id] || 0;
            if (count > 0) owned += 1;
            if (count > 1) dustValue += (count - 1) * RARITY_META[c.rarity].dust;

            var meta = RARITY_META[c.rarity];
            var item = document.createElement('div');
            item.className = 'cc-collection-item' + (count ? '' : ' locked');
            item.innerHTML =
                '<img src="' + cardImageUrl(c) + '" alt="" loading="lazy">' +
                '<div class="cc-rarity-bar" style="background:' + meta.color + ';"></div>' +
                (count > 1 ? '<div class="cc-collection-count">×' + count + '</div>' : '') +
                '<div class="cc-collection-name">' + escapeText(c.name) + '</div>';
            item.onclick = function () { showCardDetails(c, count); };
            grid.appendChild(item);
        });

        container.appendChild(grid);

        var foot = document.createElement('div');
        foot.className = 'cc-collection-foot';
        foot.innerHTML =
            '<span>Собрано: ' + owned + ' / ' + CARDS.length + '</span>' +
            '<button class="cc-dust-btn" ' + (dustValue > 0 ? '' : 'disabled') + '>' +
                'Конвертировать дубли (+' + window.ClickerGame.formatNumber(dustValue) + ')' +
            '</button>';
        foot.querySelector('.cc-dust-btn').onclick = function () {
            if (dustValue <= 0) return;
            convertDuplicates();
        };
        container.appendChild(foot);
        return container;
    }

    function showCardDetails(card, count) {
        // Простой тост-описание; полноценный модал избыточен для MVP.
        var meta = RARITY_META[card.rarity];
        var msg = card.name + ' · ' + meta.label + (count ? ' ×' + count : ' (не получена)');
        if (window.ClickerGame.toast) window.ClickerGame.toast(msg);
    }

    function refreshPanel() {
        var p = document.getElementById('panel-cards');
        if (p && p._refresh) p._refresh();
    }

    function convertDuplicates() {
        var cardsState = window.ClickerGame.getCards();
        var totalDust = 0;
        Object.keys(cardsState).forEach(function (id) {
            var card = window.ClickerCards.CARD_BY_ID[id];
            if (!card) return;
            var c = cardsState[id];
            if (c > 1) {
                totalDust += (c - 1) * RARITY_META[card.rarity].dust;
                cardsState[id] = 1;
            }
        });
        if (totalDust > 0) {
            window.ClickerGame.addKnowledge(totalDust, { skipTotal: true });
            window.ClickerGame.toast('Получено ' + window.ClickerGame.formatNumber(totalDust) + ' знаний');
            window.ClickerGame.save();
            window.ClickerGame.sync();
            refreshPanel();
        }
    }

    /* ──────────────────────────────────────────────────────────
     *  Покупка и открытие
     * ────────────────────────────────────────────────────────── */
    function buyAndOpen(packId, mode) {
        var pack = PACKS[packId];
        if (!pack) return;
        if (!window.ClickerGame.spendKnowledge(pack.cost)) {
            window.ClickerGame.toast('Недостаточно знаний');
            return;
        }
        var rolled = rollPack(packId);
        // Сразу зачисляем в коллекцию — анимация лишь визуализация.
        var cardsState = window.ClickerGame.getCards();
        rolled.forEach(function (c) { cardsState[c.id] = (cardsState[c.id] || 0) + 1; });
        window.ClickerGame.save();
        window.ClickerGame.sync();
        refreshPanel();
        runOpenAnimation(rolled, pack, mode === 'instant');
    }

    /* ──────────────────────────────────────────────────────────
     *  Анимация открытия
     * ────────────────────────────────────────────────────────── */
    function runOpenAnimation(rolled, pack, instant) {
        injectStyle();
        var overlay = document.createElement('div');
        overlay.className = 'cc-open-overlay show';
        document.querySelector('.game-wrapper').appendChild(overlay);

        function close() {
            overlay.classList.remove('show');
            setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
            window.ClickerGame.setBlocked(false);
        }

        // Блокируем игровой клик, чтобы случайный mousedown не уходил в кликер.
        window.ClickerGame.setBlocked(true);

        if (instant) {
            showFinalRow(overlay, rolled, close);
            return;
        }

        renderPackStage(overlay, pack, function () {
            // После свайпа — последовательная анимация карт
            renderCardSequence(overlay, rolled, function () {
                showFinalRow(overlay, rolled, close);
            });
        });
    }

    function renderPackStage(overlay, pack, onOpened) {
        overlay.innerHTML = '';
        var title = document.createElement('div');
        title.className = 'cc-open-title';
        title.textContent = pack.name;

        var visual = document.createElement('div');
        visual.className = 'cc-pack-visual';
        visual.innerHTML =
            '<div class="cc-pack-half top"><span>' + pack.icon + '</span></div>' +
            '<div class="cc-pack-half bot"><span>' + pack.icon + '</span></div>' +
            '<div class="cc-pack-tear"></div>';

        var hint = document.createElement('div');
        hint.className = 'cc-open-hint';
        hint.textContent = 'Проведите по паку слева направо, чтобы открыть';

        var progress = document.createElement('div');
        progress.className = 'cc-pack-progress';
        progress.innerHTML = '<div class="cc-pack-progress-fill"></div>';
        var fill = progress.querySelector('.cc-pack-progress-fill');

        overlay.appendChild(title);
        overlay.appendChild(visual);
        overlay.appendChild(progress);
        overlay.appendChild(hint);

        var topHalf = visual.querySelector('.cc-pack-half.top');
        var botHalf = visual.querySelector('.cc-pack-half.bot');

        var startX = null;
        var opened = false;
        var THRESHOLD = 140;

        function setProgress(dx) {
            var pct = Math.max(0, Math.min(1, dx / THRESHOLD));
            fill.style.width = (pct * 100) + '%';
            // Половинки слегка расходятся по мере свайпа
            topHalf.style.transform = 'translateX(' + (-pct * 30) + 'px) rotate(' + (-pct * 4) + 'deg)';
            botHalf.style.transform = 'translateX(' + (pct * 30) + 'px) rotate(' + (pct * 4) + 'deg)';
        }

        function onDown(e) {
            if (opened) return;
            startX = (e.touches ? e.touches[0].clientX : e.clientX);
            try { visual.setPointerCapture && visual.setPointerCapture(e.pointerId); } catch (_) {}
        }
        function onMove(e) {
            if (opened || startX === null) return;
            var x = (e.touches ? e.touches[0].clientX : e.clientX);
            var dx = x - startX;
            if (dx < 0) dx = 0;
            setProgress(dx);
            if (dx >= THRESHOLD) {
                opened = true;
                tear();
            }
        }
        function onUp() {
            if (opened || startX === null) return;
            startX = null;
            // Откат
            fill.style.width = '0%';
            topHalf.style.transform = '';
            botHalf.style.transform = '';
        }

        function tear() {
            hint.textContent = '';
            // Звук разрыва (2.4 сек) — запускаем сразу при разрыве
            if (window.ClickerSounds) window.ClickerSounds.playPaperRip();
            // Эффект разрыва: половинки разлетаются, fade-out.
            topHalf.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1),opacity .55s ease';
            botHalf.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1),opacity .55s ease';
            topHalf.style.transform = 'translate(-260px,-180px) rotate(-35deg)';
            botHalf.style.transform = 'translate(260px,180px) rotate(35deg)';
            topHalf.style.opacity = '0';
            botHalf.style.opacity = '0';
            fill.style.width = '100%';
            setTimeout(onOpened, 600);
        }

        visual.addEventListener('pointerdown', onDown);
        visual.addEventListener('pointermove', onMove);
        visual.addEventListener('pointerup', onUp);
        visual.addEventListener('pointercancel', onUp);
        // Тач-фолбэк для старых браузеров
        visual.addEventListener('touchstart', onDown, { passive: true });
        visual.addEventListener('touchmove', onMove, { passive: true });
        visual.addEventListener('touchend', onUp);
    }

    function renderCardSequence(overlay, rolled, onDone) {
        overlay.innerHTML = '';
        var counter = document.createElement('div');
        counter.className = 'cc-open-title';

        var stage = document.createElement('div');
        stage.className = 'cc-card-stage';

        var hint = document.createElement('div');
        hint.className = 'cc-open-hint';
        hint.textContent = 'Нажмите на карту, чтобы перевернуть';

        overlay.appendChild(counter);
        overlay.appendChild(stage);
        overlay.appendChild(hint);

        var idx = 0;

        function showNext() {
            if (idx >= rolled.length) {
                onDone();
                return;
            }
            counter.textContent = (idx + 1) + ' / ' + rolled.length;
            stage.innerHTML = '';
            var card = rolled[idx];
            var meta = RARITY_META[card.rarity];

            var el = document.createElement('div');
            el.className = 'cc-card';
            el.innerHTML =
                '<div class="cc-card-side cc-card-back">?</div>' +
                '<div class="cc-card-side cc-card-front">' +
                    '<img src="' + cardImageUrl(card) + '" alt="">' +
                    '<div class="cc-card-rarity" style="color:' + meta.color + ';">' +
                        meta.label +
                        '<div class="cc-card-name-final">' + escapeText(card.name) + '</div>' +
                    '</div>' +
                '</div>';
            stage.appendChild(el);

            var flipped = false;
            var advanced = false;
            el.addEventListener('click', function () {
                if (!flipped) {
                    flipped = true;
                    el.classList.add('flipped');
                    el.style.setProperty('--cc-glow', meta.glow);
                    // Звук показа карты (2.583 сек)
                    if (window.ClickerSounds) window.ClickerSounds.playLootReveal();
                    setTimeout(function () {
                        el.style.animation = 'ccGlow 1.6s ease-in-out infinite';
                    }, 550);
                    hint.textContent = 'Нажмите ещё раз, чтобы перейти к следующей';
                } else if (!advanced) {
                    advanced = true;
                    idx += 1;
                    showNext();
                }
            });
        }
        showNext();
    }

    function showFinalRow(overlay, rolled, onClose) {
        overlay.innerHTML = '';
        var title = document.createElement('div');
        title.className = 'cc-open-title';
        title.textContent = 'Получено ' + rolled.length + ' карт';

        var row = document.createElement('div');
        row.className = 'cc-final-row';

        rolled.forEach(function (c, i) {
            var meta = RARITY_META[c.rarity];
            var el = document.createElement('div');
            el.className = 'cc-final-card';
            el.style.animationDelay = (i * 60) + 'ms';
            el.style.borderColor = meta.color;
            el.innerHTML =
                '<img src="' + cardImageUrl(c) + '" alt="">' +
                '<div class="cc-rarity-bar" style="background:' + meta.color + ';"></div>';
            el.title = c.name + ' · ' + meta.label;
            row.appendChild(el);
        });

        var actions = document.createElement('div');
        actions.className = 'cc-open-actions';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'cc-action-btn';
        closeBtn.textContent = 'Забрать';
        closeBtn.onclick = onClose;
        actions.appendChild(closeBtn);

        overlay.appendChild(title);
        overlay.appendChild(row);
        overlay.appendChild(actions);
    }

    /* ──────────────────────────────────────────────────────────
     *  Кнопка вкладки
     * ────────────────────────────────────────────────────────── */
    function attachTabButton() {
        // Ждём появления других кнопок (онлайн), но не дольше 15с —
        // в оффлайне их не будет, тогда вставим только нашу.
        var tries = 0;
        var iv = setInterval(function () {
            tries += 1;
            var lbBtn = document.getElementById('lb-btn');
            var giveUp = tries >= 20;
            if (!lbBtn && !giveUp) return;
            clearInterval(iv);
            if (document.getElementById('cc-btn')) return;

            var wrap = lbBtn ? lbBtn.parentNode : null;
            if (!wrap) {
                // Создаём собственный контейнер в шапке
                var header = document.querySelector('.game-header');
                if (!header) return;
                wrap = document.createElement('div');
                wrap.style.cssText = 'display:flex;gap:6px;margin-left:auto;align-items:center;';
                header.appendChild(wrap);
            }

            var btn = document.createElement('button');
            btn.id = 'cc-btn';
            btn.textContent = '🎴';
            btn.title = 'Карточки';
            btn.className = 'tm-game-tab-btn';
            btn.onclick = function () {
                var p = ensurePanel();
                document.querySelectorAll('.tm-online-panel').forEach(function (x) { x.classList.remove('show'); });
                document.querySelectorAll('.tm-game-tab-btn').forEach(function (x) { x.classList.remove('active'); });
                p.classList.add('show');
                btn.classList.add('active');
                if (p._refresh) p._refresh();
            };
            var syncStatus = document.getElementById('sync-status');
            if (syncStatus && syncStatus.parentNode === wrap) {
                wrap.insertBefore(btn, syncStatus);
            } else {
                wrap.appendChild(btn);
            }
        }, 250);

        // Стили tm-game-tab-btn могут ещё не быть инжектированы (если онлайн не
        // активен), добавим минимальный фолбэк.
        if (!document.getElementById('cc-tab-style')) {
            var s = document.createElement('style');
            s.id = 'cc-tab-style';
            s.textContent =
                '.tm-game-tab-btn{background:var(--bg-3);border:1px solid var(--border);'
                + 'border-radius:6px;width:28px;height:28px;font-size:14px;cursor:pointer;'
                + 'color:var(--text-dim);display:inline-flex;align-items:center;justify-content:center;'
                + 'transition:all .15s ease;padding:0;}'
                + '.tm-game-tab-btn:hover{border-color:var(--accent-dim);color:var(--accent);}'
                + '.tm-game-tab-btn.active{background:var(--bg-4);border-color:var(--accent-dim);color:var(--accent);}'
                + '.tm-online-panel{position:absolute;top:0;left:0;width:100%;height:100%;'
                + 'background:var(--bg-1);z-index:100;display:none;flex-direction:column;'
                + 'padding:14px 16px;overflow:hidden;}'
                + '.tm-online-panel.show{display:flex;}'
                + '.tm-panel-title{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);'
                + 'text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}'
                + '.tm-panel-close{position:absolute;top:10px;right:12px;background:transparent;'
                + 'border:none;color:var(--text-dim);font-size:18px;cursor:pointer;width:28px;'
                + 'height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;}'
                + '.tm-panel-close:hover{background:var(--bg-3);color:var(--accent);}';
            document.head.appendChild(s);
        }
    }

    window.ClickerCardsUI = {
        init: function () {
            injectStyle();
            attachTabButton();
            // Гарантируем, что панель создана (для рефреша из других мест).
            ensurePanel();
            // Скрываем по умолчанию.
            var p = document.getElementById('panel-cards');
            if (p) p.classList.remove('show');
        },
        refresh: refreshPanel
    };
})();
