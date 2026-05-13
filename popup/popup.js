(function () {
    'use strict';

    var statusEl = document.getElementById('status');

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
    }

    function sendToContent(action, value, callback) {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (!tabs || !tabs.length) {
                    setStatus('Нет активной вкладки');
                    return;
                }
                var tab = tabs[0];
                if (!tab.url || !tab.url.includes('disto.mveu.ru')) {
                    setStatus('Откройте disto.mveu.ru');
                    return;
                }
                chrome.tabs.sendMessage(tab.id, { action: action, value: value }, function (response) {
                    if (chrome.runtime.lastError) {
                        setStatus('Ошибка: ' + chrome.runtime.lastError.message);
                        return;
                    }
                    if (callback) callback(response);
                });
            });
        } catch (e) {
            setStatus('Ошибка отправки');
        }
    }

    function updateUI(state) {
        if (!state) return;

        // Theme buttons
        document.querySelectorAll('#theme-row button').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.value === state.theme);
        });

        // Accent dots
        document.querySelectorAll('#accent-row .accent-dot').forEach(function (dot) {
            dot.classList.toggle('active', dot.dataset.value === state.accent);
        });

        // Density buttons
        document.querySelectorAll('#density-row button').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.value === state.density);
        });

        setStatus('disto.mveu.ru — готово');
    }

    function refreshState() {
        sendToContent('getTheme', null, function (r1) {
            sendToContent('getAccent', null, function (r2) {
                sendToContent('getDensity', null, function (r3) {
                    updateUI({
                        theme: r1 && r1.theme ? r1.theme : 'dark',
                        accent: r2 && r2.accent ? r2.accent : 'mono',
                        density: r3 && r3.density ? r3.density : 'normal'
                    });
                });
            });
        });
    }

    // Theme buttons
    document.querySelectorAll('#theme-row button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var value = btn.dataset.value;
            sendToContent('setTheme', value, function (response) {
                if (response && response.theme) {
                    document.querySelectorAll('#theme-row button').forEach(function (b) {
                        b.classList.toggle('active', b.dataset.value === response.theme);
                    });
                }
            });
        });
    });

    // Accent dots
    document.querySelectorAll('#accent-row .accent-dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
            var value = dot.dataset.value;
            sendToContent('setAccent', value, function (response) {
                if (response && response.accent) {
                    document.querySelectorAll('#accent-row .accent-dot').forEach(function (d) {
                        d.classList.toggle('active', d.dataset.value === response.accent);
                    });
                }
            });
        });
    });

    // Density buttons
    document.querySelectorAll('#density-row button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var value = btn.dataset.value;
            sendToContent('setDensity', value, function (response) {
                if (response && response.density) {
                    document.querySelectorAll('#density-row button').forEach(function (b) {
                        b.classList.toggle('active', b.dataset.value === response.density);
                    });
                }
            });
        });
    });

    refreshState();
})();
