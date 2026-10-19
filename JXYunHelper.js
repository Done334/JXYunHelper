// ==UserScript==
// @name         JXYunHelper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       @Done334
// @match        https://jx-yun.cn/*
// @match        https://*.jx-yun.cn/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const PANEL_ID = 'jxyun-helper';
    const IS_TOP = (() => { try { return window.top === window; } catch (e) { return false; } })();
    const RATES = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10];
    const TAIL_SECONDS = 3;
    const TICK_MS = 300;
    const CHECK_PATH = 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z';
    const ARROW_PATH = 'M7 10l5 5 5-5z';
    const MIN_PATH = 'M5 11h14v2H5z';
    const RESTORE_PATH = 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z';
    const DEFAULTS = { mute: true, skip: true, rate: 1 };

    let CFG = loadCfg();

    function loadCfg() {
        let saved = null;
        try { saved = GM_getValue('cfg', null); } catch (e) { saved = null; }
        const cfg = (saved && typeof saved === 'object') ? Object.assign({}, DEFAULTS, saved) : Object.assign({}, DEFAULTS);
        if (RATES.indexOf(cfg.rate) < 0) cfg.rate = 1;
        return cfg;
    }

    function saveCfg() {
        try { GM_setValue('cfg', CFG); } catch (e) { }
    }

    function fmtRate(r) { return r + 'x'; }

    function currentVideo() {
        let v = null;
        try { v = document.querySelector('#videoPlayer video'); } catch (e) { v = null; }
        if (!v) v = document.querySelector('video');
        return v;
    }

    function setPlaybackRate(v) {
        if (!v) return;
        try { if (Math.abs(v.playbackRate - CFG.rate) > 0.001) v.playbackRate = CFG.rate; } catch (e) { }
    }

    function skipToTail(v) {
        if (!v || v.ended) return;
        if (!isFinite(v.duration) || v.duration <= 0) return;
        const target = v.duration - TAIL_SECONDS;
        if (target > 0 && v.currentTime < target - 0.5) {
            try { v.currentTime = target; } catch (e) { }
        }
    }

    function tick() {
        const v = currentVideo();
        if (!v) return;
        if (CFG.mute) {
            try {
                if (!v.muted) v.muted = true;
                if (v.volume !== 0) v.volume = 0;
            } catch (e) { }
        }
        if (CFG.rate !== 1) setPlaybackRate(v);
        if (CFG.skip) skipToTail(v);
    }

    function buildPanel() {
        if (!IS_TOP || document.getElementById(PANEL_ID)) return;

        const style = document.createElement('style');
        style.textContent = [
            '#jxyun-helper{position:fixed;right:20px;bottom:20px;z-index:2147483647;box-sizing:border-box;width:272px;padding:12px 16px 16px;',
            'background:#F3EDF7;color:#1D1B20;border-radius:28px;',
            'font-family:Roboto,"Google Sans","Segoe UI","Microsoft YaHei",system-ui,sans-serif;',
            'box-shadow:0 1px 3px rgba(0,0,0,.3),0 4px 8px 3px rgba(0,0,0,.15);',
            'animation:jx-in .45s cubic-bezier(.2,0,0,1);user-select:none}',
            '#jxyun-helper[data-min="true"]{width:auto;padding:10px 12px 10px 18px}',
            '@keyframes jx-in{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:none}}',
            '#jxyun-helper .jx-head{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:grab;touch-action:none}',
            '#jxyun-helper .jx-head:active{cursor:grabbing}',
            '#jxyun-helper .jx-title{font-size:16px;font-weight:600;letter-spacing:.1px;line-height:22px;margin:0 4px}',
            '#jxyun-helper .jx-iconbtn{display:grid;place-items:center;width:36px;height:36px;padding:0;border:0;border-radius:50%;',
            'background:transparent;color:#49454F;cursor:pointer;transition:background .15s linear}',
            '#jxyun-helper .jx-iconbtn:hover{background:rgba(29,27,32,.08)}',
            '#jxyun-helper .jx-iconbtn svg{width:20px;height:20px}',
            '#jxyun-helper[data-min="true"] .jx-body{display:none}',
            '#jxyun-helper .jx-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px;padding:0 4px}',
            '#jxyun-helper .jx-label{font-size:14px;font-weight:500;letter-spacing:.1px;color:#1D1B20}',
            '#jxyun-helper .jx-input{position:absolute;opacity:0;width:0;height:0;margin:0}',
            '#jxyun-helper .jx-switch{position:relative;flex:0 0 auto;display:block;width:52px;height:32px;border-radius:16px;cursor:pointer;',
            'background:#E6E0E9;box-shadow:inset 0 0 0 2px #79747E;',
            'transition:background .2s cubic-bezier(.2,0,0,1),box-shadow .2s cubic-bezier(.2,0,0,1)}',
            '#jxyun-helper .jx-thumb{position:absolute;left:4px;top:4px;width:24px;height:24px;border-radius:50%;background:#79747E;',
            'display:grid;place-items:center;transform:scale(.6667);transform-origin:center;',
            'transition:transform .25s cubic-bezier(.2,0,0,1),background .2s cubic-bezier(.2,0,0,1)}',
            '#jxyun-helper .jx-thumb svg{width:14px;height:14px;color:#21005D;opacity:0;transition:opacity .15s linear}',
            '#jxyun-helper .jx-input:checked + .jx-switch{background:#6750A4;box-shadow:inset 0 0 0 2px #6750A4}',
            '#jxyun-helper .jx-input:checked + .jx-switch .jx-thumb{background:#FFFFFF;transform:translateX(20px) scale(1)}',
            '#jxyun-helper .jx-input:checked + .jx-switch .jx-thumb svg{opacity:1}',
            '#jxyun-helper .jx-input:focus-visible + .jx-switch{outline:3px solid #EADDFF;outline-offset:2px}',
            '#jxyun-helper .jx-select{position:relative}',
            '#jxyun-helper .jx-field{display:inline-flex;align-items:center;gap:4px;height:40px;padding:0 8px 0 16px;border:1px solid #79747E;',
            'border-radius:999px;background:transparent;color:#1D1B20;font:500 14px/1 inherit;letter-spacing:.1px;cursor:pointer;',
            'transition:background .15s linear,border-color .15s linear}',
            '#jxyun-helper .jx-field:hover{background:rgba(103,80,164,.08)}',
            '#jxyun-helper .jx-field:focus-visible{outline:3px solid #EADDFF;outline-offset:1px}',
            '#jxyun-helper .jx-field svg{width:20px;height:20px;color:#49454F;transition:transform .25s cubic-bezier(.2,0,0,1)}',
            '#jxyun-helper .jx-field[aria-expanded="true"] svg{transform:rotate(180deg)}',
            '#jxyun-helper .jx-menu{position:absolute;right:0;bottom:calc(100% + 8px);min-width:132px;max-height:min(320px,50vh);overflow:auto;',
            'padding:8px;display:none;z-index:2;background:#ECE6F0;border-radius:16px;',
            'box-shadow:0 1px 3px rgba(0,0,0,.3),0 4px 8px 3px rgba(0,0,0,.15)}',
            '#jxyun-helper .jx-menu[data-open="true"]{display:block;animation:jx-menu .2s cubic-bezier(.2,0,0,1)}',
            '@keyframes jx-menu{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}',
            '#jxyun-helper .jx-item{display:flex;align-items:center;justify-content:space-between;gap:12px;height:40px;padding:0 12px 0 16px;',
            'border-radius:999px;font:500 14px/1 inherit;color:#49454F;cursor:pointer;transition:background .15s linear}',
            '#jxyun-helper .jx-item:hover{background:rgba(29,27,32,.08)}',
            '#jxyun-helper .jx-item[aria-selected="true"]{background:#E8DEF8;color:#1D1B20}',
            '#jxyun-helper .jx-item svg{width:18px;height:18px;color:#6750A4;opacity:0}',
            '#jxyun-helper .jx-item[aria-selected="true"] svg{opacity:1}'
        ].join('');
        document.head.appendChild(style);

        const check = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CHECK_PATH}" fill="currentColor"/></svg>`;
        const items = RATES.map((r) => `<div class="jx-item" role="option" data-rate="${r}" aria-selected="${r === CFG.rate}"><span>${fmtRate(r)}</span>${check}</div>`).join('');

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.dataset.min = 'false';
        panel.innerHTML = [
            '<div class="jx-head">',
            '  <div class="jx-title">JXYunHelper</div>',
            `  <button type="button" class="jx-iconbtn" aria-label="最小化"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MIN_PATH}" fill="currentColor"/></svg></button>`,
            '</div>',
            '<div class="jx-body">',
            '  <label class="jx-row">',
            '    <span class="jx-label">播放时静音</span>',
            `    <input class="jx-input" type="checkbox" id="${PANEL_ID}-mute"${CFG.mute ? ' checked' : ''}>`,
            `    <span class="jx-switch"><span class="jx-thumb">${check}</span></span>`,
            '  </label>',
            '  <label class="jx-row">',
            '    <span class="jx-label">跳到视频末尾前3秒</span>',
            `    <input class="jx-input" type="checkbox" id="${PANEL_ID}-skip"${CFG.skip ? ' checked' : ''}>`,
            `    <span class="jx-switch"><span class="jx-thumb">${check}</span></span>`,
            '  </label>',
            '  <div class="jx-row">',
            '    <span class="jx-label">倍数</span>',
            '    <div class="jx-select">',
            '      <button type="button" class="jx-field" aria-haspopup="listbox" aria-expanded="false">',
            `        <span class="jx-value">${fmtRate(CFG.rate)}</span>`,
            `        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ARROW_PATH}" fill="currentColor"/></svg>`,
            '      </button>',
            `      <div class="jx-menu" role="listbox">${items}</div>`,
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(panel);

        const head = panel.querySelector('.jx-head');
        const iconBtn = panel.querySelector('.jx-iconbtn');
        const iconPath = iconBtn.querySelector('path');
        const muteBox = document.getElementById(PANEL_ID + '-mute');
        const skipBox = document.getElementById(PANEL_ID + '-skip');
        const field = panel.querySelector('.jx-field');
        const valueEl = panel.querySelector('.jx-value');
        const menu = panel.querySelector('.jx-menu');

        muteBox.addEventListener('change', () => {
            CFG.mute = muteBox.checked;
            saveCfg();
            const v = currentVideo();
            if (v && !CFG.mute) {
                try {
                    v.muted = false;
                    if (v.volume === 0) v.volume = 1;
                } catch (e) { }
            }
        });

        skipBox.addEventListener('change', () => {
            CFG.skip = skipBox.checked;
            saveCfg();
        });

        const closeMenu = () => {
            menu.dataset.open = 'false';
            field.setAttribute('aria-expanded', 'false');
        };

        field.addEventListener('click', () => {
            const open = menu.dataset.open === 'true';
            menu.dataset.open = String(!open);
            field.setAttribute('aria-expanded', String(!open));
        });

        menu.querySelectorAll('.jx-item').forEach((item) => {
            item.addEventListener('click', () => {
                const rate = parseFloat(item.getAttribute('data-rate'));
                if (!isFinite(rate)) return;
                CFG.rate = rate;
                saveCfg();
                valueEl.textContent = fmtRate(rate);
                menu.querySelectorAll('.jx-item').forEach((o) => o.setAttribute('aria-selected', String(o === item)));
                const v = currentVideo();
                if (v) { try { v.playbackRate = rate; } catch (e) { } }
                closeMenu();
            });
        });

        iconBtn.addEventListener('click', () => {
            const min = panel.dataset.min !== 'true';
            panel.dataset.min = String(min);
            iconPath.setAttribute('d', min ? RESTORE_PATH : MIN_PATH);
            iconBtn.setAttribute('aria-label', min ? '展开' : '最小化');
            closeMenu();
        });

        let drag = null;

        head.addEventListener('pointerdown', (e) => {
            if (e.target && e.target.closest && e.target.closest('.jx-iconbtn')) return;
            const r = panel.getBoundingClientRect();
            drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.left = r.left + 'px';
            panel.style.top = r.top + 'px';
            try { head.setPointerCapture(e.pointerId); } catch (err) { }
            e.preventDefault();
        });

        window.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - drag.dx));
            const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - drag.dy));
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
        });

        window.addEventListener('pointerup', () => { drag = null; });

        document.addEventListener('mousedown', (e) => {
            if (menu.dataset.open !== 'true') return;
            if (e.target && e.target.closest && e.target.closest('.jx-select')) return;
            closeMenu();
        }, true);
    }

    function init() {
        setInterval(tick, TICK_MS);
        tick();
        if (IS_TOP) buildPanel();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
