window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'theme' && e.data.theme) {
        document.documentElement.setAttribute('data-theme', e.data.theme);
    }
    if (e.data.accent) {
        var colors = {
            mono:    { accent: '#f4f4f7', soft: '#c8c8d0', dim: '#80808a' },
            ocean:   { accent: '#4a9eff', soft: '#7ab8ff', dim: '#2a6abf' },
            crimson: { accent: '#c25f5f', soft: '#d98080', dim: '#8a3a3a' },
            amber:   { accent: '#c8903a', soft: '#dba85a', dim: '#8a6020' },
            forest:  { accent: '#5a9e6f', soft: '#7aba8f', dim: '#3a7050' }
        };
        var c = colors[e.data.accent] || colors.mono;
        var r = document.documentElement;
        r.style.setProperty('--accent', c.accent);
        r.style.setProperty('--accent-soft', c.soft);
        r.style.setProperty('--accent-dim', c.dim);
    }
});
