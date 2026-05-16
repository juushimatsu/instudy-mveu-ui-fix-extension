(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    //  КЛИЕНТ API — InStudy Clicker
    // ═══════════════════════════════════════════════════════════
    var API_BASE = 'https://instudy-clicker-api.b8517280.workers.dev';
    var TOKEN_KEY = 'instudy_api_token';
    var USER_KEY = 'instudy_user_info';

    function getToken(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([TOKEN_KEY], function (res) {
                callback(res[TOKEN_KEY] || null);
            });
        } else {
            callback(localStorage.getItem(TOKEN_KEY));
        }
    }

    function setToken(token, callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            var obj = {}; obj[TOKEN_KEY] = token;
            chrome.storage.local.set(obj, callback);
        } else {
            localStorage.setItem(TOKEN_KEY, token);
            if (callback) callback();
        }
    }

    function setUserInfo(info, callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            var obj = {}; obj[USER_KEY] = info;
            chrome.storage.local.set(obj, callback);
        } else {
            localStorage.setItem(USER_KEY, JSON.stringify(info));
            if (callback) callback();
        }
    }

    function getUserInfo(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([USER_KEY], function (res) {
                callback(res[USER_KEY] || null);
            });
        } else {
            var raw = localStorage.getItem(USER_KEY);
            callback(raw ? JSON.parse(raw) : null);
        }
    }

    function apiRequest(method, path, body, callback) {
        getToken(function (token) {
            var opts = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (token) opts.headers['Authorization'] = 'Bearer ' + token;
            if (body) opts.body = JSON.stringify(body);

            fetch(API_BASE + path, opts)
                .then(function (res) { return res.json().catch(function () { return {}; }); })
                .then(function (data) { callback(null, data); })
                .catch(function (err) { callback(err); });
        });
    }

    /* ── Публичное API ── */
    window.ClickerAPI = {
        setApiBase: function (url) { API_BASE = url; },

        auth: function (instudyUserId, username, callback) {
            apiRequest('POST', '/api/auth', {
                instudy_user_id: instudyUserId,
                username: username
            }, function (err, data) {
                if (err || !data || !data.success) {
                    callback(err || new Error('Auth failed'));
                    return;
                }
                setToken(data.token, function () {
                    setUserInfo({ id: instudyUserId, name: username }, function () {
                        callback(null, data);
                    });
                });
            });
        },

        sync: function (state, offlineIncome, callback) {
            apiRequest('POST', '/api/sync', {
                knowledge: state.knowledge,
                totalKnowledge: state.totalKnowledge,
                clickCount: state.clickCount,
                upgrades: state.upgrades,
                cards: state.cards || {},
                offlineIncome: offlineIncome || 0,
                timestamp: Date.now()
            }, function (err, data) {
                callback(err, data);
            });
        },

        getLeaderboard: function (period, limit, callback) {
            var qs = '?period=' + (period || 'all') + '&limit=' + (limit || 50);
            apiRequest('GET', '/api/leaderboard' + qs, null, callback);
        },

        heartbeat: function (callback) {
            apiRequest('POST', '/api/heartbeat', null, callback);
        },

        getOnline: function (callback) {
            apiRequest('GET', '/api/online', null, callback);
        },

        getMe: function (callback) {
            apiRequest('GET', '/api/me', null, callback);
        },

        getToken: getToken,
        getUserInfo: getUserInfo
    };
})();
