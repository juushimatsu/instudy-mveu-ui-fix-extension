/*
 * cards.js — коллекция, магазин и анимация открытия паков
 *
 * Карточки тематизированы вокруг студенческой жизни. У каждой карты есть id
 * (стабильный ключ, не зависит от русского названия файла), редкость, путь к
 * картинке и описание. Картинки лежат в /cards с кириллическими именами,
 * URL-кодируются при выдаче.
 *
 * Состояние коллекции (counts по id) и инвентарь паков хранится в state.cards
 * и state.packs соответственно — синхронизируется на сервер вместе с остальным
 * прогрессом.
 */
(function () {
    'use strict';

    /* ──────────────────────────────────────────────────────────
     *  КАРТЫ
     * ────────────────────────────────────────────────────────── */
    var CARDS = [
        // Common (7)
        { id: 'gradebook',  rarity: 'common', name: 'Зачётная книжка',  file: 'Зачётная книжка.png',
          desc: 'Потрёпанная синяя книжка с золотым тиснением. Печать деканата в углу.' },
        { id: 'pen',        rarity: 'common', name: 'Шариковая ручка',  file: 'Шариковая ручка BIC.png',
          desc: 'Синяя BIC с погрызенным колпачком. Чернила на исходе.' },
        { id: 'notebook',   rarity: 'common', name: 'Общая тетрадь',    file: 'Общая тетрадь.png',
          desc: '96 листов в клетку. Обложка в разводах от кофе.' },
        { id: 'spoon',      rarity: 'common', name: 'Столовская ложка', file: 'Столовская ложка.png',
          desc: 'Алюминиевая, погнутая. На черенке выцарапано «не брать».' },
        { id: 'schedule',   rarity: 'common', name: 'Расписание пар',   file: 'Расписание пар.png',
          desc: 'Распечатано на принтере с бледным картриджем. Одна пара зачёркнута.' },
        { id: 'travelcard', rarity: 'common', name: 'Проездной',        file: 'Проездной.png',
          desc: 'Пластик с фото в 8 утра. Срок до конца семестра.' },
        { id: 'doshirak',   rarity: 'common', name: 'Пакет доширака',   file: 'Пакет доширака.png',
          desc: 'Курица. На обороте написано «ужин».' },

        // Rare (6)
        { id: 'cheatsheet', rarity: 'rare', name: 'Шпаргалка-гармошка', file: 'Шпаргалка-гармошка.png',
          desc: 'Гармошка из бумаги с микроскопическим почерком. Помещается в кулак.' },
        { id: 'mug',        rarity: 'rare', name: 'Кружка с кофе',      file: 'Кружка с кофе.png',
          desc: '«Лучший студен» (буква «т» стёрлась). На дне — гуща в форме знака вопроса.' },
        { id: 'flashdrive', rarity: 'rare', name: 'Флешка 4GB',         file: 'Флешка 4GB.png',
          desc: 'LEGO-кирпичик. Наклейка «КУРСОВАЯ ФИНАЛ ФИНАЛ2 СДАТЬ».' },
        { id: 'mathbook',   rarity: 'rare', name: 'Учебник по математике', file: 'Учебник по высшей математике.png',
          desc: 'Алгебра и анализ. Закладки из обёрток от конфет.' },
        { id: 'studentid',  rarity: 'rare', name: 'Студенческий билет', file: 'Студенческий билет.png',
          desc: 'Красная книжечка. На фото — ещё оптимист.' },
        { id: 'alarm',      rarity: 'rare', name: 'Будильник',          file: 'Будильник.png',
          desc: '6:30 утра. Под ним ещё три на 6:31, 6:32, 6:33.' },

        // Epic (1)
        { id: 'professor',  rarity: 'epic', name: 'Преподаватель Строгов', file: 'Преподаватель Строгов.png',
          desc: 'Твидовый пиджак, кожаные заплатки. Смотрит поверх очков.' },

        // Legendary (1)
        { id: 'session',    rarity: 'legendary', name: 'Зачётная сессия', file: 'Зачётная сессия.png',
          desc: 'Бесконечная очередь. Часы показывают 7. Лампы мигают.' },

        /* ── Пак «Ночь перед сессией» ── */
        // Common (5)
        { id: 'energydrink', rarity: 'common', name: 'Энергетик «Не спи»', file: 'Энергетик «Не спи».png',
          desc: 'Мятая банка кислотно-зелёного цвета. Часы за ней — 3:47 ночи.' },
        { id: 'pillow',      rarity: 'common', name: 'Подушка на парте',    file: 'Подушка на парте.png',
          desc: 'Дорожная подушка-подкова на парте. На учебнике — след от щеки.' },
        { id: 'cartridge',   rarity: 'common', name: 'Пустой картридж принтера', file: 'Пустой картридж принтера.png',
          desc: 'Заправлен 5 раз. Последние страницы курсовой — призраки букв.' },
        { id: 'dormpass',    rarity: 'common', name: 'Просроченный пропуск в общагу', file: 'Просроченный пропуск в общагу.png',
          desc: 'Фото в капюшоне. На обороте: «пускай, я свой».' },
        { id: 'slippers',    rarity: 'common', name: 'Тапки-шлёпки',       file: 'Тапки-шлёпки.png',
          desc: 'Один синий, другой чёрный. На подошве — расписание.' },

        // Rare (3)
        { id: 'laptop3pct',  rarity: 'rare', name: 'Ноутбук с 3% батареи', file: 'Ноутбук с 3% батареи.png',
          desc: 'Курсовая на 47 странице. Зарядка не дотягивается до розетки.' },
        { id: 'corvalol',    rarity: 'rare', name: 'Бутылка корвалола',     file: 'Бутылка корвалола.png',
          desc: 'Стоит на зачётке. Рядом — смятый билет №13.' },
        { id: 'nerdnotes',   rarity: 'rare', name: 'Конспект отличницы',    file: 'Конспект отличницы.png',
          desc: '«НЕ ДАВАТЬ НИКОМУ» — зачёркнуто. Список из 12 имён.' },

        // Epic (1)
        { id: 'deanghost',   rarity: 'epic', name: 'Призрак Деканата',      file: 'Призрак Деканата.png',
          desc: 'Полупрозрачная фигура в мантии. В руке — список отчисленных.' },

        // Legendary (1)
        { id: 'goldauto',    rarity: 'legendary', name: 'Золотой автомат',   file: 'Золотой автомат.png',
          desc: 'Все «отлично» золотыми чернилами. Подпись ректора. Корона.' }
    ];

    var CARD_BY_ID = {};
    CARDS.forEach(function (c) { CARD_BY_ID[c.id] = c; });

    /* Карты по редкости — для быстрой выборки во время дропа */
    var CARDS_BY_RARITY = { common: [], rare: [], epic: [], legendary: [] };
    CARDS.forEach(function (c) { CARDS_BY_RARITY[c.rarity].push(c); });

    /* ID карт, эксклюзивных для premium-пака «Ночь перед сессией» */
    var PREMIUM_EXCLUSIVE_IDS = [
        'energydrink', 'pillow', 'cartridge', 'dormpass', 'slippers',
        'laptop3pct', 'corvalol', 'nerdnotes', 'deanghost', 'goldauto'
    ];
    var PREMIUM_EXCLUSIVE_SET = {};
    PREMIUM_EXCLUSIVE_IDS.forEach(function (id) { PREMIUM_EXCLUSIVE_SET[id] = true; });

    /* Пулы по редкости без premium-эксклюзивов (для small/big паков) */
    var BASE_CARDS_BY_RARITY = { common: [], rare: [], epic: [], legendary: [] };
    CARDS.forEach(function (c) {
        if (!PREMIUM_EXCLUSIVE_SET[c.id]) {
            BASE_CARDS_BY_RARITY[c.rarity].push(c);
        }
    });

    /* ──────────────────────────────────────────────────────────
     *  РЕДКОСТЬ И ПАКИ
     * ────────────────────────────────────────────────────────── */
    var RARITY_META = {
        common:    { label: 'Обычная',    color: '#a0a0aa', glow: 'rgba(160,160,170,.30)', dust: 50 },
        rare:      { label: 'Редкая',     color: '#5a9ed1', glow: 'rgba(90,158,209,.45)',  dust: 250 },
        epic:      { label: 'Эпическая',  color: '#b87dd6', glow: 'rgba(184,125,214,.55)', dust: 1500 },
        legendary: { label: 'Легендарная', color: '#e0a04a', glow: 'rgba(224,160,74,.65)', dust: 10000 }
    };

    /*
     * Дроп-таблицы: small — дешёвый и менее щедрый, big — дороже и шансы выше.
     * Сумма должна быть = 1.0.
     */
    var PACKS = {
        small: {
            id: 'small',
            name: 'Малый пак',
            icon: '📦',
            cost: 100000,
            size: 3,
            drop: { common: 0.75, rare: 0.25, epic: 0, legendary: 0 }
        },
        big: {
            id: 'big',
            name: 'Большой пак',
            icon: '🎁',
            cost: 500000,
            size: 10,
            drop: { common: 0.55, rare: 0.36, epic: 0.080, legendary: 0.010 }
        },
        premium: {
            id: 'premium',
            name: 'Ночь перед сессией',
            icon: '🌙',
            cost: 1000000,
            size: 10,
            drop: { common: 0.82, rare: 0.14, epic: 0.035, legendary: 0.005 }
        }
    };

    /* ──────────────────────────────────────────────────────────
     *  УТИЛИТЫ
     * ────────────────────────────────────────────────────────── */
    function cardImageUrl(card) {
        // chrome.runtime.getURL даёт абсолютный путь с правильным URL-кодированием.
        var rel = 'cards/' + card.file;
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            return chrome.runtime.getURL(rel);
        }
        return '../' + encodeURI(rel);
    }

    function rollRarity(drop) {
        var roll = Math.random();
        var acc = 0;
        var keys = ['legendary', 'epic', 'rare', 'common']; // от редкого к частому, чтобы шанс честный
        for (var i = 0; i < keys.length; i++) {
            acc += drop[keys[i]] || 0;
        }
        // Нормализация на случай погрешности
        roll *= acc || 1;
        var sum = 0;
        for (var j = 0; j < keys.length; j++) {
            sum += drop[keys[j]] || 0;
            if (roll <= sum) return keys[j];
        }
        return 'common';
    }

    function pickCardOfRarity(rarity, pool) {
        var cards = pool[rarity];
        if (!cards || !cards.length) cards = pool.common;
        return cards[Math.floor(Math.random() * cards.length)];
    }

    function rollPack(packId) {
        var pack = PACKS[packId];
        if (!pack) return [];
        // Premium-пак использует полный пул, остальные — только базовые карты
        var pool = (packId === 'premium') ? CARDS_BY_RARITY : BASE_CARDS_BY_RARITY;
        var result = [];
        for (var i = 0; i < pack.size; i++) {
            var rarity = rollRarity(pack.drop);
            result.push(pickCardOfRarity(rarity, pool));
        }
        return result;
    }

    /* ──────────────────────────────────────────────────────────
     *  ПУБЛИЧНЫЙ API
     * ────────────────────────────────────────────────────────── */
    window.ClickerCards = {
        CARDS: CARDS,
        CARD_BY_ID: CARD_BY_ID,
        RARITY_META: RARITY_META,
        PACKS: PACKS,
        cardImageUrl: cardImageUrl,
        rollPack: rollPack
    };
})();
