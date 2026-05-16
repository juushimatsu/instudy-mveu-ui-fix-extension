/*
 * sounds.js — звуковой модуль для кликера.
 *
 * Длительности (определены через ffprobe):
 *   click.mp3          — 0.315 сек
 *   loot-box-open.wav  — 2.583 сек
 *   paper-ripping.mp3  — 2.400 сек
 *
 * Звуки предзагружаются как Audio-объекты. Для быстрого повторного
 * воспроизведения (click) используется пул из нескольких экземпляров.
 */
(function () {
    'use strict';

    var SOUNDS = {
        click:      { file: 'sounds/click.mp3',         duration: 315 },
        lootReveal: { file: 'sounds/loot-box-open.wav', duration: 2583 },
        paperRip:   { file: 'sounds/paper-ripping.mp3', duration: 2400 }
    };

    var CLICK_POOL_SIZE = 4;
    var clickPool = [];
    var clickPoolIdx = 0;
    var audioCache = {};

    function resolveUrl(rel) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            return chrome.runtime.getURL(rel);
        }
        return '../' + rel;
    }

    function preload() {
        // Пул для click (быстрые повторные нажатия)
        for (var i = 0; i < CLICK_POOL_SIZE; i++) {
            var a = new Audio(resolveUrl(SOUNDS.click.file));
            a.volume = 0.5;
            a.preload = 'auto';
            clickPool.push(a);
        }
        // Остальные — по одному экземпляру
        Object.keys(SOUNDS).forEach(function (key) {
            if (key === 'click') return;
            var audio = new Audio(resolveUrl(SOUNDS[key].file));
            audio.volume = key === 'paperRip' ? 0.8 : 0.35;
            audio.preload = 'auto';
            audioCache[key] = audio;
        });
    }

    function playClick() {
        var a = clickPool[clickPoolIdx];
        clickPoolIdx = (clickPoolIdx + 1) % CLICK_POOL_SIZE;
        a.currentTime = 0;
        a.play().catch(function () {});
    }

    function play(key) {
        var a = audioCache[key];
        if (!a) return;
        a.currentTime = 0;
        a.play().catch(function () {});
    }

    window.ClickerSounds = {
        preload: preload,
        playClick: playClick,
        playLootReveal: function () { play('lootReveal'); },
        playPaperRip: function () { play('paperRip'); },
        DURATIONS: {
            click: SOUNDS.click.duration,
            lootReveal: SOUNDS.lootReveal.duration,
            paperRip: SOUNDS.paperRip.duration
        }
    };
})();
