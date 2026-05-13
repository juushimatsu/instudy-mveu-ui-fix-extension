(function () {
    'use strict';

    function injectFonts() {
        try {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Unbounded:wght@300;500;600&display=swap';
            (document.head || document.documentElement).appendChild(link);
        } catch (_) { /* noop */ }
    }
    injectFonts();

    /* ----------------------------------------------------------- */
    /*  Инъекция стилей: резервный путь (основной CSS в styles.css)  */
    /* ----------------------------------------------------------- */
    function injectCSS(css) {
        const style = document.createElement('style');
        style.id = 'disto-dark-mono';
        style.type = 'text/css';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    /* ----------------------------------------------------------- */
    /*  После DOM ready: точечные правки JS                        */
    /* ----------------------------------------------------------- */
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    /* addDarkBadge убран — бейдж отключён */

    function getCurrentTheme() {
        return localStorage.getItem('tm-theme') || 'dark';
    }

    function setupMeta() {
        try {
            let meta = document.querySelector('meta[name="theme-color"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'theme-color';
                document.head.appendChild(meta);
            }
            meta.content = getCurrentTheme() === 'light' ? '#f5f5f7' : '#0e0e11';
        } catch (_) { /* noop */ }
    }

    function ensureDarkBaseline() {
        if (getCurrentTheme() === 'light') return;
        try {
            document.documentElement.style.background = '#0e0e11';
            if (document.body) document.body.style.background = '#0e0e11';
        } catch (_) { /* noop */ }
    }

    function disableColorTheme() {
        // Отключаем "цветной" stylesheet темы (blue.css / pink.css), чтобы синие
        // акценты не пробивались поверх нашего монохрома.
        try {
            const ustyle = document.getElementById('ustyle');
            if (ustyle) ustyle.disabled = true;
        } catch (_) { /* noop */ }
    }

    function strikeInlineWhites(root) {
        // Удаляем явные белые фоны / чёрный текст в инлайн-стилях.
        if (getCurrentTheme() === 'light') return;
        try {
            const scope = root && root.querySelectorAll ? root : document;
            scope.querySelectorAll('[style]').forEach((el) => {
                const s = (el.getAttribute('style') || '').toLowerCase();
                if (/background[^;]*(\#fff|\#ffffff|white)/.test(s)) {
                    el.style.removeProperty('background');
                    el.style.removeProperty('background-color');
                }
                if (/(^|;)\s*color\s*:\s*(\#000|\#000000|black)\b/.test(s)) {
                    el.style.removeProperty('color');
                }
            });
        } catch (_) { /* noop */ }
    }

    function fixBrokenAvatars(root) {
        // На сайте встречаются невалидные .jpg аватары (в т.ч. с профиля пользователя).
        // Бывают случаи, когда файл отдаётся как HTTP 200, но содержимое не является
        // картинкой — браузер рисует сломанный placeholder. Подставляем свой.
        try {
            const scope = root && root.querySelectorAll ? root : document;
            const targets = scope.querySelectorAll(
                'img.user_avatar, img#contact_avatar, .top-avatar img, .suser img'
            );
            targets.forEach((img) => {
                if (img.dataset.tmAvatarChecked) return;
                img.dataset.tmAvatarChecked = '1';
                // Если src вообще пустой — это не сломанная картинка, а неинициализированный
                // элемент (напр. #contact_avatar до выбора собеседника). Рисовать
                // фолбек «П» не надо — это выглядит как «висячий» аватар в странном месте.
                const rawSrc = (img.getAttribute('src') || '').trim();
                if (!rawSrc) {
                    img.style.setProperty('display', 'none', 'important');
                    return;
                }
                const handleBroken = () => {
                    if (img.complete && img.naturalWidth === 0) {
                        replaceWithFallback(img);
                    }
                };
                if (img.complete) handleBroken();
                img.addEventListener('load', () => {
                    if (img.naturalWidth === 0) replaceWithFallback(img);
                });
                img.addEventListener('error', () => replaceWithFallback(img));
            });
        } catch (_) { /* noop */ }
    }

    function replaceWithFallback(img) {
        try {
            if (!img || !img.parentElement || img.dataset.tmFallbackApplied) return;
            img.dataset.tmFallbackApplied = '1';
            img.style.setProperty('display', 'none', 'important');
            // Не дублируем фолбек, если уже есть
            const parent = img.parentElement;
            if (parent.querySelector(':scope > .tm-avatar-fallback')) return;
            const span = document.createElement('span');
            span.className = 'tm-avatar-fallback';
            // Первая буква имени, если можем найти рядом
            let letter = '◐';
            const sib = parent.parentElement || parent;
            const nameEl = sib.querySelector('b, #contact_name, .top-user-info b');
            if (nameEl && nameEl.textContent) {
                const m = nameEl.textContent.trim().match(/[А-ЯЁа-яёA-Za-z]/);
                if (m) letter = m[0].toUpperCase();
            }
            span.textContent = letter;
            parent.appendChild(span);
        } catch (_) { /* noop */ }
    }

    function freeMenuFromSlimScroll() {
        // SlimScroll задаёт фиксированную высоту ul#menu_item и обрезает его.
        // Сбрасываем, чтобы меню могло раскрываться при hover и показывать все пункты.
        try {
            const ul = document.getElementById('menu_item');
            if (ul) {
                ul.style.setProperty('height', 'auto', 'important');
                ul.style.setProperty('overflow', 'visible', 'important');
                ul.style.setProperty('width', '100%', 'important');
            }
            const wraps = document.querySelectorAll('#menu .slimScrollDiv');
            wraps.forEach((w) => {
                w.style.setProperty('height', 'auto', 'important');
                w.style.setProperty('overflow', 'visible', 'important');
                w.style.setProperty('width', '100%', 'important');
            });
        } catch (_) { /* noop */ }
    }

    function fixNoMenuLayout() {
        // На странице входа (login) нет #menu — status_bar не должен
        // оставлять место под несуществующую боковую панель.
        // CSS :has() не поддерживается во всех браузерах, поэтому дублируем JS-ом.
        try {
            if (!document.getElementById('menu')) {
                const bar = document.getElementById('status_bar');
                if (bar) {
                    bar.style.setProperty('width', '100%', 'important');
                    bar.style.setProperty('margin-left', '0', 'important');
                }
            }
        } catch (_) { /* noop */ }
    }

    function virtualGulist() {
        // Настоящий virtual scroll для .gulist: рендерим только видимые элементы + буфер.
        // Элементы вне viewport полностью удалены из DOM, что резко снижает нагрузку
        // при тысячах преподавателей/студентов.
        try {
            var ITEM_H = 58;   // ~высота .suser + margin (contain-intrinsic-size: 0 52px)
            var BUFFER = 10;   // элементов сверху/снизу за пределами viewport

            document.querySelectorAll('.gulist').forEach(function (list) {
                if (list.dataset.tmVirtual) return;
                list.dataset.tmVirtual = '1';

                var items = Array.prototype.slice.call(list.children);
                var total = items.length;
                if (total <= 100) return; // мало элементов — обычный lazy-load достаточен

                // Сохраняем HTML каждого элемента
                var htmlCache = items.map(function (el) { return el.outerHTML; });
                list.innerHTML = '';

                var spacerTop = document.createElement('div');
                var content = document.createElement('div');
                var spacerBottom = document.createElement('div');

                list.appendChild(spacerTop);
                list.appendChild(content);
                list.appendChild(spacerBottom);

                var lastRange = '';

                function update() {
                    var scrollTop = list.scrollTop;
                    var clientH = list.clientHeight;
                    var startIdx = Math.max(0, Math.floor(scrollTop / ITEM_H) - BUFFER);
                    var endIdx = Math.min(total, Math.ceil((scrollTop + clientH) / ITEM_H) + BUFFER);

                    spacerTop.style.height = (startIdx * ITEM_H) + 'px';
                    spacerBottom.style.height = ((total - endIdx) * ITEM_H) + 'px';

                    var rangeKey = startIdx + '-' + endIdx;
                    if (rangeKey === lastRange) return; // диапазон не изменился
                    lastRange = rangeKey;

                    content.innerHTML = htmlCache.slice(startIdx, endIdx).join('');
                }

                update();
                list.addEventListener('scroll', update, { passive: true });
            });
        } catch (_) { /* noop */ }
    }

    function forceAuthDark() {
        // auth.css грузится как <link> в body ПОСЛЕ нашего <style> в head.
        // Принудительно убираем любые не-тёмные фоны на форме входа.
        if (getCurrentTheme() === 'light') return;
        try {
            const form = document.getElementById('auth_form');
            if (form) {
                form.style.setProperty('background', '#15151a', 'important');
                form.style.setProperty('border', '1px solid #26262d', 'important');
                form.style.setProperty('border-radius', '10px', 'important');
                form.style.setProperty('color', '#e8e8ec', 'important');
                form.style.setProperty('padding', '24px', 'important');
                form.style.setProperty('max-width', '420px', 'important');
                form.style.setProperty('margin', '40px auto', 'important');
                // Все дочерние элементы — убираем яркие фоны
                form.querySelectorAll('*').forEach((el) => {
                    const bg = getComputedStyle(el).backgroundColor;
                    if (bg && !/rgba?\(\s*0|rgba?\(\s*14|rgba?\(\s*21|rgba?\(\s*28|transparent/.test(bg)) {
                        el.style.setProperty('background', 'transparent', 'important');
                    }
                });
            }
        } catch (_) { /* noop */ }
    }

    function markMyMessages() {
        // Определяем имя текущего пользователя из шапки (.top-user-info b)
        // и помечаем его сообщения в чате классом .tm-my-msg
        try {
            const userInfoEl = document.querySelector('.top-user-info b');
            if (!userInfoEl) return;
            const myName = userInfoEl.textContent.trim().toLowerCase();
            if (!myName) return;

            const msgs = document.querySelectorAll('#chat_msg .msg_text');
            msgs.forEach((msg) => {
                if (msg.classList.contains('tm-my-msg')) return;
                const nameEl = msg.querySelector('b');
                if (nameEl && nameEl.textContent.trim().toLowerCase() === myName) {
                    msg.classList.add('tm-my-msg');
                }
            });
        } catch (_) { /* noop */ }
    }

    function applyTheme(theme) {
        // Плавный переход при смене темы
        try {
            var root = document.documentElement;
            root.classList.add('tm-transitioning');
            setTimeout(function () { root.classList.remove('tm-transitioning'); }, 400);
        } catch (_) { /* noop */ }

        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('tm-theme', theme);
        setupMeta();
        if (theme === 'dark') {
            ensureDarkBaseline();
            strikeInlineWhites(document);
            forceAuthDark();
        } else {
            // Светлая тема: убираем принудительный тёмный фон
            document.documentElement.style.background = '';
            if (document.body) document.body.style.background = '';
        }
        // Обновляем иконку кнопки
        const btn = document.getElementById('tm-theme-toggle');
        if (btn) btn.textContent = theme === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}';
        applyAccent(localStorage.getItem('tm-accent') || 'mono');
        syncGameTheme();
    }

    function injectThemeToggle() {
        try {
            if (document.getElementById('tm-theme-toggle')) return;
            const bar = document.getElementById('status_bar');
            if (!bar) return;
            const avatar = bar.querySelector('.top-avatar');
            const btn = document.createElement('button');
            btn.id = 'tm-theme-toggle';
            btn.type = 'button';
            btn.title = 'Переключить тему';
            const saved = getCurrentTheme();
            btn.textContent = saved === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}';
            btn.addEventListener('click', () => {
                const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
                applyTheme(next);
            });
            if (avatar) {
                avatar.parentNode.insertBefore(btn, avatar);
            } else {
                bar.appendChild(btn);
            }
        } catch (_) { /* noop */ }
    }

    /* -----------------------------------------------------------
     *  Атмосферные частицы (дождь / снег)
     * ----------------------------------------------------------- */
    var animationFrameId = null;
    var tmImageCache = {}; // href -> { blobUrl, mimeType }

    function getCurrentWeather() {
        try {
            return localStorage.getItem('tm-weather') || 'off';
        } catch (_) { /* noop */ }
        return 'off';
    }

    function injectWeatherCanvas() {
        try {
            var existing = document.getElementById('tm-weather-canvas');
            if (existing) return existing;
            var canvas = document.createElement('canvas');
            canvas.id = 'tm-weather-canvas';
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            document.body.appendChild(canvas);

            window.addEventListener('resize', function () {
                try {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                } catch (_) { /* noop */ }
            });

            return canvas;
        } catch (_) { /* noop */ }
        return null;
    }

    function startRain(canvas, ctx) {
        try {
            var COUNT = 170;
            var drops = [];
            for (var i = 0; i < COUNT; i++) {
                drops.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    len: 15 + Math.random() * 10,
                    speed: 12 + Math.random() * 8
                });
            }

            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                var isLight = document.documentElement.getAttribute('data-theme') === 'light';
                ctx.strokeStyle = isLight ? 'rgba(40, 40, 80, 0.5)' : 'rgba(180, 180, 200, 0.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (var i = 0; i < drops.length; i++) {
                    var d = drops[i];
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(d.x + d.len * Math.sin(0.35), d.y + d.len * Math.cos(0.35));
                    d.y += d.speed;
                    d.x += d.speed * Math.sin(0.35);
                    if (d.y > canvas.height) {
                        d.y = -d.len;
                        d.x = Math.random() * canvas.width;
                    }
                }
                ctx.stroke();
                animationFrameId = requestAnimationFrame(draw);
            }

            draw();
        } catch (_) { /* noop */ }
    }

    function startSnow(canvas, ctx) {
        try {
            var COUNT = 140;
            var flakes = [];
            for (var i = 0; i < COUNT; i++) {
                flakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    r: 2 + Math.random() * 3,
                    speed: 0.5 + Math.random() * 1,
                    offset: Math.random() * Math.PI * 2
                });
            }
            var time = 0;

            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                var isLight = document.documentElement.getAttribute('data-theme') === 'light';
                ctx.fillStyle = isLight ? 'rgba(80, 100, 160, 0.55)' : 'rgba(220, 230, 255, 0.7)';
                time += 0.01;
                for (var i = 0; i < flakes.length; i++) {
                    var f = flakes[i];
                    ctx.beginPath();
                    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                    ctx.fill();
                    f.y += f.speed;
                    f.x += Math.sin(time * f.speed + f.offset) * 0.8;
                    if (f.y > canvas.height) {
                        f.y = -f.r;
                        f.x = Math.random() * canvas.width;
                    }
                }
                animationFrameId = requestAnimationFrame(draw);
            }

            draw();
        } catch (_) { /* noop */ }
    }

    function stopWeather() {
        try {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            var canvas = document.getElementById('tm-weather-canvas');
            if (canvas) {
                var ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.style.display = 'none';
            }
        } catch (_) { /* noop */ }
    }

    function applyWeather(mode) {
        try {
            stopWeather();
            if (mode === 'off') return;
            var canvas = injectWeatherCanvas();
            if (!canvas) return;
            canvas.style.display = 'block';
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            var ctx = canvas.getContext('2d');
            if (!ctx) return;
            if (mode === 'rain') {
                startRain(canvas, ctx);
            } else if (mode === 'snow') {
                startSnow(canvas, ctx);
            }
        } catch (_) { /* noop */ }
    }

    function injectWeatherToggle() {
        try {
            if (document.getElementById('tm-weather-toggle')) return;
            var bar = document.getElementById('status_bar');
            if (!bar) return;
            var themeBtn = document.getElementById('tm-theme-toggle');
            var btn = document.createElement('button');
            btn.id = 'tm-weather-toggle';
            btn.type = 'button';

            var icons = { off: '\u{1F324}\u{FE0F}', rain: '\u{1F327}\u{FE0F}', snow: '\u{2744}\u{FE0F}' };
            var titles = { off: '\u042d\u0444\u0444\u0435\u043a\u0442\u044b \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u044b', rain: '\u0414\u043e\u0436\u0434\u044c', snow: '\u0421\u043d\u0435\u0433' };
            var states = ['off', 'rain', 'snow'];

            var current = getCurrentWeather();
            btn.textContent = icons[current] || icons.off;
            btn.title = titles[current] || titles.off;

            btn.addEventListener('click', function () {
                var cur = getCurrentWeather();
                var idx = states.indexOf(cur);
                var next = states[(idx + 1) % states.length];
                localStorage.setItem('tm-weather', next);
                btn.textContent = icons[next];
                btn.title = titles[next];
                applyWeather(next);
            });

            var avatar = bar.querySelector('.top-avatar');
            if (themeBtn && themeBtn.parentNode) {
                themeBtn.parentNode.insertBefore(btn, themeBtn.nextSibling);
            } else if (avatar) {
                avatar.parentNode.insertBefore(btn, avatar);
            } else {
                bar.appendChild(btn);
            }
        } catch (_) { /* noop */ }
    }

    /* -----------------------------------------------------------
     *  Кнопка «Наверх» — появляется при скролле вниз
     * ----------------------------------------------------------- */
    function injectScrollTop() {
        try {
            var btn = document.createElement('button');
            btn.id = 'tm-scroll-top';
            btn.type = 'button';
            btn.title = 'Наверх';
            btn.textContent = '\u2191';
            btn.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            document.body.appendChild(btn);

            var visible = false;
            window.addEventListener('scroll', function () {
                var show = window.scrollY > 300;
                if (show !== visible) {
                    visible = show;
                    if (show) {
                        btn.classList.add('tm-visible');
                    } else {
                        btn.classList.remove('tm-visible');
                    }
                }
            }, { passive: true });
        } catch (_) { /* noop */ }
    }

    /* -----------------------------------------------------------
     *  Уведомление о новых сообщениях при неактивной вкладке
     * ----------------------------------------------------------- */
    function watchNewMessages() {
        try {
            var originalTitle = document.title;
            var isActive = true;
            var blinkInterval = null;

            document.addEventListener('visibilitychange', function () {
                isActive = !document.hidden;
                if (isActive) {
                    // Вкладка активна — сбрасываем мигание
                    document.title = originalTitle;
                    if (blinkInterval) {
                        clearInterval(blinkInterval);
                        blinkInterval = null;
                    }
                }
            });

            // Следим за добавлением новых сообщений в #chat_msg
            var chatObs = new MutationObserver(function (mutations) {
                if (isActive) return;
                var hasNewMsg = false;
                mutations.forEach(function (m) {
                    m.addedNodes.forEach(function (n) {
                        if (n.nodeType === 1 && (n.classList.contains('msg_text') || n.querySelector && n.querySelector('.msg_text'))) {
                            hasNewMsg = true;
                        }
                    });
                });
                if (hasNewMsg && !blinkInterval) {
                    var toggle = false;
                    blinkInterval = setInterval(function () {
                        toggle = !toggle;
                        document.title = toggle ? '\u{1F4E9} \u041d\u043e\u0432\u043e\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435' : originalTitle;
                    }, 1200);
                }
            });

            var chatMsg = document.getElementById('chat_msg');
            if (chatMsg) {
                chatObs.observe(chatMsg, { childList: true, subtree: true });
            } else {
                // Если чат ещё не подгружен — следим за появлением #chat_msg
                var bodyObs = new MutationObserver(function () {
                    var cm = document.getElementById('chat_msg');
                    if (cm) {
                        chatObs.observe(cm, { childList: true, subtree: true });
                        bodyObs.disconnect();
                    }
                });
                bodyObs.observe(document.body, { childList: true, subtree: true });
            }
        } catch (_) { /* noop */ }
    }

    /* -----------------------------------------------------------
     *  Превью изображений в чате
     *  Находит ссылки на zip-архивы с изображениями в .msg_text,
     *  скачивает их, распаковывает через JSZip (fallback: fflate)
     *  и показывает <img>.
     * ----------------------------------------------------------- */
    function inlineChatImages() {
        try {
            var chatMsg = document.getElementById('chat_msg');
            if (!chatMsg) return;

            var links = chatMsg.querySelectorAll('.msg_text a[href]');
            if (!links.length) {
                links = chatMsg.querySelectorAll('a[href*="/uploads/mveo/message/"]');
            }

            if (!links.length) return;

            var imgExts = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;

            for (var i = 0; i < links.length; i++) {
                var a = links[i];
                if (a.getAttribute('data-tm-img') === '1') continue;

                var href = (a.getAttribute('href') || '').trim();
                var cleanHref = href.split('?')[0].split('#')[0];
                var text = (a.textContent || '').trim();

                if (!cleanHref.includes('/uploads/mveo/message/')) continue;
                if (!cleanHref.toLowerCase().endsWith('.zip')) continue;
                if (!imgExts.test(text)) continue;

                a.setAttribute('data-tm-img', '1');

                var placeholder = document.createElement('div');
                placeholder.className = 'tm-chat-img-placeholder';
                a.parentNode.insertBefore(placeholder, a.nextSibling);

                (function (ph, linkA, linkHref, linkText) {
                    var url = linkHref.indexOf('//') !== -1
                        ? linkHref
                        : (location.origin + (linkHref.charAt(0) === '/' ? '' : '/') + linkHref);

                    // MIME по расширению текста ссылки
                    var extMatch = linkText.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
                    var mimeType = 'image/jpeg';
                    if (extMatch) {
                        var ext = extMatch[1].toLowerCase();
                        var mimeMap = {
                            jpg: 'image/jpeg', jpeg: 'image/jpeg',
                            png: 'image/png', gif: 'image/gif',
                            webp: 'image/webp', bmp: 'image/bmp'
                        };
                        mimeType = mimeMap[ext] || 'image/jpeg';
                    }

                    function cleanupAndReset() {
                        ph.remove();
                        if (linkA) linkA.removeAttribute('data-tm-img');
                    }

                    function buildImg(blobUrl) {
                        var img = document.createElement('img');
                        img.className = 'tm-chat-img-preview';
                        img.src = blobUrl;
                        img.alt = linkText;

                        img.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            var overlay = document.createElement('div');
                            overlay.className = 'tm-lightbox';
                            var fullImg = document.createElement('img');
                            fullImg.src = blobUrl;
                            overlay.appendChild(fullImg);
                            overlay.addEventListener('click', function () {
                                overlay.remove();
                            });
                            document.body.appendChild(overlay);
                        });

                        img.addEventListener('error', function () {
                            console.warn('[InStudyMonoUI] image decode failed:', linkText);
                            img.style.display = 'none';
                        });

                        ph.parentNode.replaceChild(img, ph);
                    }

                    function showImage(bytes) {
                        var blob = new Blob([bytes], { type: mimeType });
                        var blobUrl = URL.createObjectURL(blob);
                        tmImageCache[linkHref] = { blobUrl: blobUrl, mimeType: mimeType };
                        buildImg(blobUrl);
                    }

                    function tryFflate(buffer) {
                        if (typeof fflate === 'undefined' || !fflate.unzip) {
                            console.warn('[InStudyMonoUI] fflate not available');
                            cleanupAndReset();
                            return;
                        }
                        try {
                            fflate.unzip(new Uint8Array(buffer), function (err, data) {
                                if (err || !data) {
                                    console.warn('[InStudyMonoUI] fflate unzip failed:', err);
                                    cleanupAndReset();
                                    return;
                                }
                                var names = Object.keys(data).filter(function (n) {
                                    return !n.endsWith('/');
                                });
                                if (names.length === 0) {
                                    console.warn('[InStudyMonoUI] fflate: no files');
                                    cleanupAndReset();
                                    return;
                                }
                                showImage(data[names[0]]);
                            });
                        } catch (e) {
                            console.warn('[InStudyMonoUI] fflate error:', e);
                            cleanupAndReset();
                        }
                    }

                    // Проверяем кэш распакованных изображений
                    var cached = tmImageCache[linkHref];
                    if (cached && cached.blobUrl) {
                        buildImg(cached.blobUrl);
                        return;
                    }

                    fetch(url, {
                        method: 'GET',
                        headers: { 'Accept': '*/*' }
                    })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('status ' + response.status);
                        }
                        return response.arrayBuffer();
                    })
                    .then(function (arrayBuffer) {
                        try {
                            // JSZip с таймаутом — если зависнет, fallback на fflate
                            var zipPromise = JSZip.loadAsync(arrayBuffer);
                            var timeoutPromise = new Promise(function(_, reject) {
                                setTimeout(function() { reject(new Error('JSZip timeout')); }, 5000);
                            });

                            Promise.race([zipPromise, timeoutPromise]).then(function (zip) {
                                var names = Object.keys(zip.files).filter(function (n) {
                                    return !zip.files[n].dir;
                                });
                                if (names.length === 0) {
                                    console.warn('[InStudyMonoUI] JSZip: no files, trying fflate');
                                    tryFflate(arrayBuffer);
                                    return;
                                }

                                var extractPromise = zip.files[names[0]].async('uint8array');
                                var extractTimeout = new Promise(function(_, reject) {
                                    setTimeout(function() { reject(new Error('JSZip extract timeout')); }, 5000);
                                });

                                Promise.race([extractPromise, extractTimeout]).then(function (bytes) {
                                    showImage(bytes);
                                }).catch(function (err) {
                                    console.warn('[InStudyMonoUI] JSZip extract error, trying fflate:', err.message || err);
                                    tryFflate(arrayBuffer);
                                });
                            }).catch(function (err) {
                                console.warn('[InStudyMonoUI] JSZip failed:', err.message || err);
                                tryFflate(arrayBuffer);
                            });
                        } catch (e) {
                            console.warn('[InStudyMonoUI] zip processing error, trying fflate:', e);
                            tryFflate(arrayBuffer);
                        }
                    })
                    .catch(function (err) {
                        console.warn('[InStudyMonoUI] network error:', err);
                        cleanupAndReset();
                    });
                })(placeholder, a, href, text);
            }
        } catch (e) {
            console.warn('[InStudyMonoUI] inlineChatImages error:', e);
        }
    }

    /* -----------------------------------------------------------
     *  Акцентные цветовые схемы
     * ----------------------------------------------------------- */
    function applyAccent(name) {
        try {
            var themeName = document.documentElement.getAttribute('data-theme') || 'dark';
            var isLight = themeName === 'light';
            var selector = isLight ? ':root[data-theme="light"]' : ':root';

            var accentMap = {
                mono: {
                    dark:  { accent: '#f4f4f7', soft: '#c8c8d0', dim: '#80808a', glow: 'rgba(244,244,247,0.08)' },
                    light: { accent: '#0a0a0c', soft: '#2a2a32', dim: '#8a8a94', glow: 'rgba(0,0,0,0.06)' }
                },
                ocean: {
                    dark: {
                        accent: '#4a9eff', soft: '#7ab8ff', dim: '#2a6abf', glow: 'rgba(74,158,255,0.10)',
                        bg0: '#0a0f14', bg1: '#0d131a', bg2: '#111822', bg3: '#151d2a', bg4: '#1a2230', bg5: '#1e2838',
                        border: '#1a2230', border2: '#202a3a', borderSoft: '#131b28'
                    },
                    light: {
                        accent: '#4a9eff', soft: '#7ab8ff', dim: '#2a6abf', glow: 'rgba(74,158,255,0.10)',
                        bg0: '#f0f4f8', bg1: '#e8eef5', bg2: '#e0e8f2', bg3: '#d8e2ee', bg4: '#d0dcea', bg5: '#c8d6e6',
                        border: '#c8d6e6', border2: '#c0d0e2', borderSoft: '#d0dcea'
                    }
                },
                crimson: {
                    dark: {
                        accent: '#c25f5f', soft: '#d98080', dim: '#8a3a3a', glow: 'rgba(194,95,95,0.10)',
                        bg0: '#140a0a', bg1: '#1a0d0d', bg2: '#201111', bg3: '#261515', bg4: '#2a1a1a', bg5: '#301e1e',
                        border: '#2a1a1a', border2: '#362020', borderSoft: '#1f1313'
                    },
                    light: {
                        accent: '#c25f5f', soft: '#d98080', dim: '#8a3a3a', glow: 'rgba(194,95,95,0.10)',
                        bg0: '#f8f0f0', bg1: '#f5e8e8', bg2: '#f2e0e0', bg3: '#eed8d8', bg4: '#ead0d0', bg5: '#e6c8c8',
                        border: '#e6c8c8', border2: '#e2c0c0', borderSoft: '#ead0d0'
                    }
                },
                amber: {
                    dark: {
                        accent: '#c8903a', soft: '#dba85a', dim: '#8a6020', glow: 'rgba(200,144,58,0.10)',
                        bg0: '#14100a', bg1: '#1a130d', bg2: '#201811', bg3: '#261d15', bg4: '#2a2218', bg5: '#30261e',
                        border: '#2a2218', border2: '#362c22', borderSoft: '#1f1813'
                    },
                    light: {
                        accent: '#c8903a', soft: '#dba85a', dim: '#8a6020', glow: 'rgba(200,144,58,0.10)',
                        bg0: '#f8f4f0', bg1: '#f5eee8', bg2: '#f2e8e0', bg3: '#eee2d8', bg4: '#eadcd0', bg5: '#e6d6c8',
                        border: '#e6d6c8', border2: '#e2d0c0', borderSoft: '#eadcd0'
                    }
                },
                forest: {
                    dark: {
                        accent: '#5a9e6f', soft: '#7aba8f', dim: '#3a7050', glow: 'rgba(90,158,111,0.10)',
                        bg0: '#0a140a', bg1: '#0d1a0d', bg2: '#112011', bg3: '#152615', bg4: '#1a2a1a', bg5: '#1e301e',
                        border: '#1a2a1a', border2: '#223622', borderSoft: '#131f13'
                    },
                    light: {
                        accent: '#5a9e6f', soft: '#7aba8f', dim: '#3a7050', glow: 'rgba(90,158,111,0.10)',
                        bg0: '#f0f8f0', bg1: '#e8f5e8', bg2: '#e0f2e0', bg3: '#d8eed8', bg4: '#d0ead0', bg5: '#c8e6c8',
                        border: '#c8e6c8', border2: '#c0e2c0', borderSoft: '#d0ead0'
                    }
                }
            };

            var theme = accentMap[name] || accentMap.mono;
            var vars = theme[themeName] || theme.dark;

            var css = selector + ' {'
                + ' --d-accent: ' + vars.accent + ';'
                + ' --d-accent-soft: ' + vars.soft + ';'
                + ' --d-accent-dim: ' + vars.dim + ';'
                + ' --d-accent-glow: ' + vars.glow + ';';

            if (name !== 'mono') {
                css += ' --d-bg-0: ' + vars.bg0 + ';'
                    + ' --d-bg-1: ' + vars.bg1 + ';'
                    + ' --d-bg-2: ' + vars.bg2 + ';'
                    + ' --d-bg-3: ' + vars.bg3 + ';'
                    + ' --d-bg-4: ' + vars.bg4 + ';'
                    + ' --d-bg-5: ' + vars.bg5 + ';'
                    + ' --d-border: ' + vars.border + ';'
                    + ' --d-border-2: ' + vars.border2 + ';'
                    + ' --d-border-soft: ' + vars.borderSoft + ';';
            }

            css += ' }';

            var style = document.getElementById('tm-accent');
            if (!style) {
                style = document.createElement('style');
                style.id = 'tm-accent';
                (document.head || document.documentElement).appendChild(style);
            }
            style.textContent = css;
            localStorage.setItem('tm-accent', name || 'mono');
            syncGameTheme();
        } catch (_) { /* noop */ }
    }

    function injectAccentPicker() {
        try {
            var bar = document.getElementById('status_bar');
            if (!bar) return;
            if (document.getElementById('tm-accent-toggle')) return;

            var btn = document.createElement('button');
            btn.id = 'tm-accent-toggle';
            btn.type = 'button';
            btn.title = 'Акцентный цвет';
            btn.textContent = '\u{1F3A8}';

            var popup = document.createElement('div');
            popup.id = 'tm-accent-popup';
            var accents = [
                { name: 'mono',    color: '#f4f4f7' },
                { name: 'ocean',   color: '#4a9eff' },
                { name: 'crimson', color: '#c25f5f' },
                { name: 'amber',   color: '#c8903a' },
                { name: 'forest',  color: '#5a9e6f' }
            ];
            accents.forEach(function (a) {
                var dot = document.createElement('span');
                dot.className = 'tm-accent-dot';
                dot.style.background = a.color;
                dot.dataset.accent = a.name;
                if ((localStorage.getItem('tm-accent') || 'mono') === a.name) {
                    dot.classList.add('tm-active');
                }
                dot.addEventListener('click', function (e) {
                    e.stopPropagation();
                    applyAccent(a.name);
                    popup.querySelectorAll('.tm-accent-dot').forEach(function (d) { d.classList.remove('tm-active'); });
                    dot.classList.add('tm-active');
                    popup.classList.remove('tm-open');
                });
                popup.appendChild(dot);
            });

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var rect = btn.getBoundingClientRect();
                popup.style.top = (rect.bottom + 8) + 'px';
                popup.style.left = Math.max(8, rect.left - 10) + 'px';
                popup.classList.toggle('tm-open');
            });
            document.addEventListener('click', function () {
                popup.classList.remove('tm-open');
            });

            var wrapper = document.createElement('div');
            wrapper.id = 'tm-accent-wrapper';
            wrapper.style.display = 'inline-flex';
            wrapper.appendChild(btn);

            var avatar = bar.querySelector('.top-avatar');
            var weatherBtn = document.getElementById('tm-weather-toggle');
            if (weatherBtn && weatherBtn.parentNode) {
                weatherBtn.parentNode.insertBefore(wrapper, weatherBtn.nextSibling);
            } else if (avatar) {
                avatar.parentNode.insertBefore(wrapper, avatar);
            } else {
                bar.appendChild(wrapper);
            }
            document.body.appendChild(popup);
        } catch (_) { /* noop */ }
    }

    /* -----------------------------------------------------------
     *  Режим плотности
     * ----------------------------------------------------------- */
    function applyDensity(mode) {
        try {
            var valid = ['compact', 'normal', 'wide'];
            var m = valid.indexOf(mode) !== -1 ? mode : 'normal';
            document.documentElement.setAttribute('data-density', m);
            var css = '';
            if (m === 'compact') {
                css = '[data-density="compact"] body { font-size: 13px !important; }'
                    + '[data-density="compact"] #status_bar { height: 56px !important; }'
                    + '[data-density="compact"] .btn, [data-density="compact"] button { padding: 4px 10px !important; }';
            } else if (m === 'wide') {
                css = '[data-density="wide"] body { font-size: 16px !important; }'
                    + '[data-density="wide"] #status_bar { height: 84px !important; }'
                    + '[data-density="wide"] .btn, [data-density="wide"] button { padding: 10px 20px !important; }';
            }
            var style = document.getElementById('tm-density');
            if (!style) {
                style = document.createElement('style');
                style.id = 'tm-density';
                (document.head || document.documentElement).appendChild(style);
            }
            style.textContent = css;
            localStorage.setItem('tm-density', m);

            var btn = document.getElementById('tm-density-toggle');
            if (btn) {
                var icons = { compact: '\u229f', normal: '\u229e', wide: '\u229f\u229f' };
                btn.textContent = icons[m] || icons.normal;
                var titles = { compact: 'Компактно', normal: 'Нормально', wide: 'Широко' };
                btn.title = titles[m] || titles.normal;
            }
        } catch (_) { /* noop */ }
    }

    function injectDensityToggle() {
        try {
            var bar = document.getElementById('status_bar');
            if (!bar) return;
            if (document.getElementById('tm-density-toggle')) return;

            var btn = document.createElement('button');
            btn.id = 'tm-density-toggle';
            btn.type = 'button';

            var states = ['compact', 'normal', 'wide'];
            var current = localStorage.getItem('tm-density') || 'normal';
            var idx = states.indexOf(current);
            if (idx < 0) idx = 1;

            var icons = { compact: '\u229f', normal: '\u229e', wide: '\u229f\u229f' };
            var titles = { compact: 'Компактно', normal: 'Нормально', wide: 'Широко' };
            btn.textContent = icons[current] || icons.normal;
            btn.title = titles[current] || titles.normal;

            btn.addEventListener('click', function () {
                var cur = localStorage.getItem('tm-density') || 'normal';
                var i = states.indexOf(cur);
                var next = states[(i + 1) % states.length];
                applyDensity(next);
            });

            var avatar = bar.querySelector('.top-avatar');
            var accentWrap = document.getElementById('tm-accent-wrapper');
            if (accentWrap && accentWrap.parentNode === bar) {
                bar.insertBefore(btn, accentWrap.nextSibling);
            } else if (avatar) {
                avatar.parentNode.insertBefore(btn, avatar);
            } else {
                bar.appendChild(btn);
            }
        } catch (_) { /* noop */ }
    }

    // Применяем сохранённую тему как можно раньше (до DOMContentLoaded)
    (function earlyTheme() {
        const t = getCurrentTheme();
        document.documentElement.setAttribute('data-theme', t);
        if (t === 'dark') {
            document.documentElement.style.background = '#0e0e11';
        }
    })();

    /* -----------------------------------------------------------
     *  Пункт меню «Кликер» + игровой оверлей
     * ----------------------------------------------------------- */
    function injectGameMenuItem() {
        try {
            var menu = document.getElementById('menu_item');
            if (!menu) return;
            if (document.getElementById('tm-game-menu-item')) return;

            var li = document.createElement('li');
            li.id = 'tm-game-menu-item';
            li.className = 'tm-game-item';

            var a = document.createElement('a');
            a.href = '#';
            a.title = 'Кликер «Студент»';
            a.innerHTML = '<span class="menu_icon">🎮</span><b>Кликер</b>';

            a.addEventListener('click', function (e) {
                e.preventDefault();
                openGameOverlay();
            });

            li.appendChild(a);

            // Вставляем в конец меню или после последнего пункта
            menu.appendChild(li);
        } catch (_) { /* noop */ }
    }

    function openGameOverlay() {
        try {
            if (document.getElementById('tm-game-overlay')) return;

            var overlay = document.createElement('div');
            overlay.id = 'tm-game-overlay';

            var frame = document.createElement('iframe');
            frame.id = 'tm-game-frame';
            frame.src = chrome.runtime.getURL('game/game.html');
            frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');

            var closeBtn = document.createElement('button');
            closeBtn.id = 'tm-game-close';
            closeBtn.title = 'Закрыть';
            closeBtn.innerHTML = '\u00D7';
            closeBtn.addEventListener('click', closeGameOverlay);

            overlay.appendChild(frame);
            document.body.appendChild(overlay);
            document.body.appendChild(closeBtn);

            frame.addEventListener('load', syncGameTheme);

            // Закрытие по Escape
            document.addEventListener('keydown', onEscClose);
        } catch (_) { /* noop */ }
    }

    function closeGameOverlay() {
        try {
            var overlay = document.getElementById('tm-game-overlay');
            var closeBtn = document.getElementById('tm-game-close');
            if (overlay) overlay.remove();
            if (closeBtn) closeBtn.remove();
            document.removeEventListener('keydown', onEscClose);
        } catch (_) { /* noop */ }
    }

    function onEscClose(e) {
        if (e.key === 'Escape') closeGameOverlay();
    }

    function syncGameTheme() {
        try {
            var frame = document.getElementById('tm-game-frame');
            if (!frame || !frame.contentWindow) return;
            var theme = document.documentElement.getAttribute('data-theme') || 'dark';
            var accent = localStorage.getItem('tm-accent') || 'mono';
            var msg = { type: 'theme', theme: theme, accent: accent };
            frame.contentWindow.postMessage(msg, '*');
            // Иногда iframe ещё не готов к приёму — повторяем через небольшую задержку
            setTimeout(function () {
                try {
                    if (frame && frame.contentWindow) {
                        frame.contentWindow.postMessage(msg, '*');
                    }
                } catch (_) { /* noop */ }
            }, 50);
        } catch (_) { /* noop */ }
    }

    function ensureToolbarButtons() {
        try {
            injectThemeToggle();
            injectWeatherToggle();
            injectAccentPicker();
            injectDensityToggle();
        } catch (_) { /* noop */ }
    }

    /* -----------------------------------------------------------
     *  Привязка аккаунта InStudy — извлечение user_id и auth
     * ----------------------------------------------------------- */
    function extractUserId() {
        try {
            // 1. Inline scripts (InStudy часто задаёт user_id в <script>)
            var scripts = document.querySelectorAll('script:not([src])');
            for (var s = 0; s < scripts.length; s++) {
                var txt = scripts[s].textContent;
                // Паттерны: user_id = 12345, userId:12345, id: '21965'
                var m = txt.match(/user[_-]?id["']?\s*[:=]\s*["']?(\d+)/i);
                if (m) return m[1];
                // Паттерн: var u = 12345 (если рядом есть упоминание user)
                var m2 = txt.match(/(?:user|пользователь|участник).*?(\d{4,})/i);
                if (m2) return m2[1];
            }

            // 2. Cookies
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var c = cookies[i].trim();
                if (/^(user_id|uid|id|userid)=/.test(c)) {
                    return decodeURIComponent(c.split('=')[1]);
                }
            }

            // 3. localStorage / sessionStorage
            var lsKeys = ['user_id', 'uid', 'id', 'userid', 'userId'];
            for (var j = 0; j < lsKeys.length; j++) {
                var v = localStorage.getItem(lsKeys[j]) || sessionStorage.getItem(lsKeys[j]);
                if (v) return v;
            }

            // 4. data-атрибуты на аватарке или шапке
            var avatar = document.querySelector('.top-avatar img, .suser img');
            if (avatar) {
                var ds = avatar.getAttribute('data-user-id') || avatar.getAttribute('data-id');
                if (ds) return ds;
            }

            // 5. Ссылки на профиль: /user/u21957, /u/21957, /profile/21965
            var links = document.querySelectorAll('a[href*="/user/"], a[href*="/profile/"], a[href*="/u/"]');
            for (var k = 0; k < links.length; k++) {
                var href = links[k].getAttribute('href') || '';
                var m3 = href.match(/\/(?:user|profile|u)\/u?(\d+)/);
                if (m3) return m3[1];
            }

            // 6. Глобальные JS-переменные (популярные на LMS)
            if (typeof window !== 'undefined') {
                if (window.user_id) return String(window.user_id);
                if (window.USER_ID) return String(window.USER_ID);
                if (window.appData && window.appData.user && window.appData.user.id) return String(window.appData.user.id);
            }
        } catch (_) { /* noop */ }
        return null;
    }

    function extractUsername() {
        try {
            var el = document.querySelector('.top-user-info b, .suser b, .user-name');
            if (el) return el.textContent.trim();
        } catch (_) { /* noop */ }
        return 'Игрок';
    }

    function initAuth() {
        try {
            var uid = extractUserId();
            var name = extractUsername();
            if (!uid) {
                // Повторная попытка через 3 сек (страница может догружаться)
                setTimeout(initAuth, 3000);
                return;
            }
            // Сохраняем в storage для игры
            var authData = { instudy_user_id: uid, username: name, timestamp: Date.now() };
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ 'instudy_auth_data': authData });
            } else {
                localStorage.setItem('instudy_auth_data', JSON.stringify(authData));
            }
            // Отправляем в игру если открыта
            sendAuthToGame(authData);
            // Авторизуемся на сервере через api-client внутри content (опционально — игра сама может)
            // Но для надёжности сделаем здесь fetch
                var apiBase = 'https://instudy-clicker-api.b8517280.workers.dev';
            fetch(apiBase + '/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instudy_user_id: uid, username: name })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.success && data.token) {
                    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                        chrome.storage.local.set({ 'instudy_api_token': data.token });
                    } else {
                        localStorage.setItem('instudy_api_token', data.token);
                    }
                }
            })
            .catch(function () { /* noop — игра сама попробует */ });
        } catch (_) { /* noop */ }
    }

    function sendAuthToGame(data) {
        try {
            var frame = document.getElementById('tm-game-frame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({ type: 'instudy-auth', data: data }, '*');
            }
        } catch (_) { /* noop */ }
    }

    // Слушаем запросы авторизации от игры
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'request-instudy-auth') {
            var authData = null;
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get(['instudy_auth_data'], function (res) {
                        if (res.instudy_auth_data) {
                            sendAuthToGame(res.instudy_auth_data);
                        }
                    });
                    return;
                } else {
                    var raw = localStorage.getItem('instudy_auth_data');
                    if (raw) authData = JSON.parse(raw);
                }
            } catch (_) { }
            if (authData) sendAuthToGame(authData);
        }
    });

    /* -----------------------------------------------------------
     *  Онлайн-индикаторы контактов в переписках
     * ----------------------------------------------------------- */
    var onlineContactsCache = [];
    var contactOnlineTimer = null;
    var contactOnlineObs = null;

    function injectContactOnlineStyles() {
        try {
            if (document.getElementById('tm-contact-online-style')) return;
            var style = document.createElement('style');
            style.id = 'tm-contact-online-style';
            style.textContent = '.tm-ext-status-dot { display:inline-block !important; width:8px; height:8px; border-radius:50%; margin-right:6px; vertical-align:middle; flex-shrink:0; }';
            document.head.appendChild(style);
        } catch (_) { /* noop */ }
    }

    function updateContactOnlineStatus() {
        try {
            var contacts = document.querySelectorAll('#contact_cell .contact_block');
            if (!contacts.length) return;
            contacts.forEach(function (block) {
                var uid = block.id && block.id.replace(/^u/, '');
                if (!uid) return;
                var isOnline = onlineContactsCache.some(function (u) {
                    return u.instudy_user_id === uid;
                });

                // Удаляем невидимый нативный индикатор InStudy
                var native = block.querySelector('.online, .offline');
                if (native) native.remove();

                // Ищем или создаём наш индикатор
                var indicator = block.querySelector('.tm-ext-status-dot');
                if (!indicator) {
                    indicator = document.createElement('span');
                    indicator.className = 'tm-ext-status-dot';
                    var first = block.firstChild;
                    if (first) block.insertBefore(indicator, first);
                    else block.appendChild(indicator);
                }

                if (isOnline) {
                    indicator.style.background = '#a78bfa';
                    indicator.style.boxShadow = '0 0 6px rgba(167,139,250,0.6)';
                    indicator.title = 'В сети (InStudy Mono)';
                } else {
                    indicator.style.background = '#6b7280';
                    indicator.style.boxShadow = 'none';
                    indicator.title = 'Не в сети';
                }
            });
        } catch (_) { /* noop */ }
    }

    function fetchOnlineContacts() {
        try {
            var apiBase = 'https://instudy-clicker-api.b8517280.workers.dev';
            fetch(apiBase + '/api/online', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data && data.success && data.users) {
                        onlineContactsCache = data.users;
                        updateContactOnlineStatus();
                    }
                })
                .catch(function () { });
        } catch (_) { }
    }

    function initContactOnlineObserver() {
        try {
            if (contactOnlineObs) return; // уже инициализировано
            injectContactOnlineStyles();
            
            function tryAttach() {
                var cell = document.getElementById('contact_cell');
                if (!cell) return false;
                fetchOnlineContacts();
                if (contactOnlineTimer) clearInterval(contactOnlineTimer);
                contactOnlineTimer = setInterval(fetchOnlineContacts, 30000);
                contactOnlineObs = new MutationObserver(function () {
                    updateContactOnlineStatus();
                });
                contactOnlineObs.observe(cell, { childList: true, subtree: true });
                return true;
            }
            
            // Пробуем сразу
            if (tryAttach()) return;
            
            // Если нет — ждём появления элемента
            var waitId = setInterval(function () {
                if (tryAttach()) {
                    clearInterval(waitId);
                }
            }, 2000);
            
            // Страховка: остановить ожидание через 60 сек
            setTimeout(function () { clearInterval(waitId); }, 60000);
        } catch (_) { }
    }

    onReady(() => {
        applyTheme(getCurrentTheme());
        disableColorTheme();
        freeMenuFromSlimScroll();
        fixNoMenuLayout();
        fixBrokenAvatars(document);
        virtualGulist();
        markMyMessages();
        ensureToolbarButtons();
        injectGameMenuItem();
        applyWeather(getCurrentWeather());
        injectScrollTop();
        watchNewMessages();
        inlineChatImages();
        initAuth(); // <-- привязка аккаунта
        initContactOnlineObserver(); // <-- онлайн-индикаторы контактов

        // MutationObserver для AJAX-вставок (debounce для производительности):
        try {
            var _moPendingNodes = [];
            var _moDebounceId = null;
            function _moFlush() {
                var nodes = _moPendingNodes;
                _moPendingNodes = [];
                _moDebounceId = null;
                for (var i = 0; i < nodes.length; i++) {
                    strikeInlineWhites(nodes[i]);
                    fixBrokenAvatars(nodes[i]);
                }
                freeMenuFromSlimScroll();
                virtualGulist();
                markMyMessages();
                inlineChatImages();
                ensureToolbarButtons();
                if (!contactOnlineObs) initContactOnlineObserver();
            }
            const observer = new MutationObserver((mutations) => {
                var hasNew = false;
                mutations.forEach((m) => {
                    m.addedNodes.forEach((n) => {
                        if (n.nodeType === 1) {
                            _moPendingNodes.push(n);
                            hasNew = true;
                        }
                    });
                });
                if (hasNew && !_moDebounceId) {
                    _moDebounceId = requestAnimationFrame(_moFlush);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (_) { /* noop */ }

        injectAccentPicker();
        applyAccent(localStorage.getItem('tm-accent') || 'mono');
        injectDensityToggle();
        applyDensity(localStorage.getItem('tm-density') || 'normal');
    });

    /* -----------------------------------------------------------
     *  Слушатель сообщений от popup (опционально)
     * ----------------------------------------------------------- */
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                if (!request || !request.action) return;
                switch (request.action) {
                    case 'getTheme':
                        sendResponse({ theme: getCurrentTheme() });
                        break;
                    case 'setTheme':
                        if (request.value) applyTheme(request.value);
                        sendResponse({ theme: getCurrentTheme() });
                        break;
                    case 'getAccent':
                        sendResponse({ accent: localStorage.getItem('tm-accent') || 'mono' });
                        break;
                    case 'setAccent':
                        if (request.value) applyAccent(request.value);
                        sendResponse({ accent: localStorage.getItem('tm-accent') || 'mono' });
                        break;
                    case 'getDensity':
                        sendResponse({ density: localStorage.getItem('tm-density') || 'normal' });
                        break;
                    case 'setDensity':
                        if (request.value) applyDensity(request.value);
                        sendResponse({ density: localStorage.getItem('tm-density') || 'normal' });
                        break;
                }
            });
        }
    } catch (_) { /* noop */ }
})();
