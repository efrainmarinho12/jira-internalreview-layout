// ==UserScript==
// @name         Jira Uhub - Layout pra Internal Review
// @namespace    https://jira.uhub.biz/
// @version      6.27.0
// @description  Layout otimizado e responsivo para issues Internal Review (barra de resumo editavel, painel flutuante de metadados, anexos em largura total e coluna de comentarios), com atualizacao automatica, notificacoes e indicador de status.
// @author       Efra
// @match        https://jira.uhub.biz/browse/*
// @icon         https://jira.uhub.biz/favicon.ico
// @updateURL    https://raw.githubusercontent.com/efrainmarinho12/jira-internalreview-layout/main/jira-internalreview-layout.user.js
// @downloadURL  https://raw.githubusercontent.com/efrainmarinho12/jira-internalreview-layout/main/jira-internalreview-layout.user.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @grant        unsafeWindow
// @grant        GM_getResourceText
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
// @resource     pdfWorker https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js
// @run-at       document-start
// ==/UserScript==
// Copiar titulo (#summary-val) e chave (#key-val / .issue-link) em 1 clique
const ICON_COPY = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v6.5A1.5 1.5 0 0 0 4 11h1" stroke="currentColor" stroke-width="1.4"/></svg>';
const ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const gid = (i) => document.getElementById(i), q1 = (q) => document.querySelector(q), qa = (q) => document.querySelectorAll(q), mk = (t) => document.createElement(t);
(function () {
  'use strict';
  const ID = 'uhub-copy-key';
  function log(err) {
    try {
      let list = JSON.parse(GM_getValue('uhub-diag', '[]')) || [];
      list.push({ t: new Date().toISOString(), where: 'copy-key', error: String(err && (err.stack || err.message) || err).slice(0, 500), url: location.href });
      GM_setValue('uhub-diag', JSON.stringify(list.slice(-60)));
    } catch {}
  }
  function keyLink() {
    return gid('key-val')
      || q1('.aui-nav-breadcrumbs a.issue-link[data-issue-key], .aui-nav-breadcrumbs a[data-issue-key]');
  }
  async function copy(text) {
    try { if (typeof GM_setClipboard === 'function') { GM_setClipboard(text, 'text'); return true; } } catch {}
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    try {
      const ta = mk('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
  function ensure() {
    try {
      const key = keyLink();
      if (!key) return;
      if (key.nextElementSibling && key.nextElementSibling.id === ID) return;
      const old = gid(ID);
      if (old) old.remove();
      const oldLink = gid(ID + '-link');
      if (oldLink) oldLink.remove();

      const btnStyle = 'appearance:none;border:0;background:transparent;cursor:pointer;padding:0;margin:0 0 0 4px;width:20px;height:20px;border-radius:4px;color:#6b778c;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle';

      const b = mk('button');
      b.type = 'button';
      b.id = ID;
      b.className = 'uhub-copy-btn';
      b.title = 'Copiar chave da issue';
      b.setAttribute('aria-label', 'Copiar chave da issue');
      b.style.cssText = btnStyle;
      b.innerHTML = ICON_COPY;
      b.addEventListener('mouseenter', () => { b.style.background = 'rgba(9,30,66,.08)'; });
      b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; });
      b.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const k = keyLink();
        const text = k ? (k.getAttribute('data-issue-key') || k.textContent || '').trim() : '';
        if (!text) return;
        if (await copy(text)) {
          b.innerHTML = ICON_CHECK;
          b.style.color = '#00875a';
          b.title = 'Copiado!';
          setTimeout(() => { b.innerHTML = ICON_COPY; b.style.color = '#6b778c'; b.title = 'Copiar chave da issue'; }, 1400);
        }
      });

      const bLink = mk('button');
      bLink.type = 'button';
      bLink.id = ID + '-link';
      bLink.className = 'uhub-copy-btn';
      bLink.title = 'Copiar link da issue';
      bLink.setAttribute('aria-label', 'Copiar link da issue');
      bLink.style.cssText = btnStyle;
      bLink.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
      bLink.addEventListener('mouseenter', () => { bLink.style.background = 'rgba(9,30,66,.08)'; });
      bLink.addEventListener('mouseleave', () => { bLink.style.background = 'transparent'; });
      bLink.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const k = keyLink();
        const key = k ? (k.getAttribute('data-issue-key') || k.textContent || '').trim() : '';
        if (!key) return;
        const url = `${location.origin}/browse/${key}`;
        if (await copy(url)) {
          bLink.innerHTML = ICON_CHECK;
          bLink.style.color = '#00875a';
          bLink.title = 'Copiado!';
          setTimeout(() => { bLink.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; bLink.style.color = '#6b778c'; bLink.title = 'Copiar link da issue'; }, 1400);
        }
      });

      key.after(bLink);
      key.after(b);
    } catch (e) { log(e); }
  }
  try {
    let scheduled = false;
    const mo = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; ensure(); });
    });
    mo.observe(document, { childList: true, subtree: true });
    ensure();
    document.addEventListener('DOMContentLoaded', ensure);
    window.addEventListener('load', ensure);
    window.__uhubEnsureKeyCopy = ensure;
  } catch (e) { log(e); }
})();
// Horarios em 24h em todas as paginas de issue: "3:11 PM" -> "15:11". Bloco independente (funciona mesmo se o
// resto do script falhar). Converte so o que o Jira gera (datas, dicas de horario/title); o texto escrito pelas
// pessoas (comentarios, descricao) nao e alterado.
const UHUB_AMPM_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AaPp])\.?\s?[Mm]\.?(?![A-Za-z])/g;
// loose: para texto "colado" (textContent junta "AM" com a palavra seguinte)
const UHUB_AMPM_LOOSE_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AaPp])\.?\s?[Mm]\.?/g;
function uhubTo24h(str, loose) {
  if (!str || str.indexOf(':') < 0 || !/[AaPp]\.?\s?[Mm]/.test(str)) return str;
  return str.replace(loose ? UHUB_AMPM_LOOSE_RE : UHUB_AMPM_RE, (m, h, mi, se, ap) => {
    let hh = Number(h) % 12;
    if (ap === 'P' || ap === 'p') hh += 12;
    return `${String(hh).padStart(2, '0')}:${mi}${se ? `:${se}` : ''}`;
  });
}
(function () {
  'use strict';
  const SKIP = 'textarea, input, select, script, style, noscript, [contenteditable=""], [contenteditable="true"], '
    + '.action-body, #description-val, .user-content-block, .wiki-edit, #addcomment .mod-content, pre, code';
  const hasAmPm = (t) => !!t && t.indexOf(':') >= 0 && /\d[\s.]?[AaPp]\.?\s?[Mm]/.test(t);
  function fixText(node) {
    const v = node.nodeValue;
    if (!hasAmPm(v)) return;
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    const n = uhubTo24h(v);
    if (n !== v) node.nodeValue = n;
  }
  const TITLE_ATTRS = ['title', 'original-title', 'data-original-title', 'aria-label'];
  function fixTitle(el) {
    if (!el.getAttribute) return;
    for (const a of TITLE_ATTRS) {
      const t = el.getAttribute(a);
      if (!hasAmPm(t) || el.closest(SKIP)) continue;
      const n = uhubTo24h(t);
      if (n !== t) el.setAttribute(a, n);
    }
  }
  function fixTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1) {
      if (!hasAmPm(root.textContent) && !(root.querySelector && root.querySelector('[title*="M"],[original-title*="M"],[data-original-title*="M"],[aria-label*="M"]')) && !TITLE_ATTRS.some((a) => hasAmPm(root.getAttribute(a)))) return;
      fixTitle(root);
    }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) fixText(n);
    if (root.querySelectorAll) root.querySelectorAll('[title],[original-title],[data-original-title],[aria-label]').forEach(fixTitle);
  }
  try {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') fixText(m.target);
        else if (m.type === 'attributes') fixTitle(m.target);
        else m.addedNodes.forEach(fixTree);
      }
    });
    const start = () => {
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TITLE_ATTRS });
      fixTree(document.documentElement);
    };
    if (document.documentElement) start();
    else document.addEventListener('readystatechange', start, { once: true });
    window.__uhubFix24h = () => fixTree(document.documentElement);
  } catch {}
})();
(function () {
  'use strict';
  // Config
  const TARGET_TYPE = 'internal review';
  const NAV_COLLAPSED_WIDTH = 56;
  // Larguras padrao (usadas na primeira vez, antes do usuario personalizar). Depois da primeira mudanca, os
  // valores salvos via GM_setValue tem prioridade.
  const DEFAULTS = {
    sidebarWidth: 640,
    attSize: 200,
    dockMinWidth: 1880,
  };
  // Limites de seguranca: o usuario pode personalizar livremente entre esses valores, mas nao pode configurar
  // uma coluna a ponto de quebrar a legibilidade por completo.
  const LIMITS = {
    sidebarWidth: { min: 320, max: 1200 },
    attSize: { min: 120, max: 600 },
    dockMinWidth: { min: 1000, max: 3000 },
  };
  function clampToLimits(value, key) {
    const { min, max } = LIMITS[key];
    return Math.max(min, Math.min(max, value));
  }
  function loadSetting(key) {
    const stored = GM_getValue(key, null);
    const value = (stored === null || Number.isNaN(Number(stored))) ? DEFAULTS[key] : Number(stored);
    return clampToLimits(value, key);
  }
  function saveSetting(key, value) {
    const clamped = clampToLimits(value, key);
    GM_setValue(key, clamped);
    return clamped;
  }
  let settings = {
    sidebarWidth: loadSetting('sidebarWidth'),
    attSize: loadSetting('attSize'),
    dockMinWidth: loadSetting('dockMinWidth'),
  };
  let state = {
    applied: false,
    issueKey: null,
    refreshing: false,
    userDisabled: false,
    early: false,
  };
  let bootObserver = null;
  // Estilos
  function injectStyles() {
    GM_addStyle(` :root { --uhub-sidebar-w: ${DEFAULTS.sidebarWidth}px; --uhub-att-w: ${DEFAULTS.attSize}px; --uhub-nav-w: ${NAV_COLLAPSED_WIDTH}px; --uhub-col-gap: 24px; --uhub-header-h: 0px; --uhub-topbar-h: 56px; --uhub-addcomment-h: 60px; --uhub-sidebar-content-top: 0px; --uhub-border: #dfe1e6; --uhub-bg: #ffffff; --uhub-bg-subtle: #f7f8f9; --uhub-accent: #0052cc; --uhub-accent-hover: #0747a6; --uhub-text-muted: #6b778c; --uhub-shadow: 0 4px 16px rgba(9, 30, 66, 0.12) }
/* Evita flash de layout antigo antes do script aplicar */
html.uhub-boot-head header#stalker { visibility: hidden !important }
html.uhub-boot-pending .issue-body-content { visibility: hidden !important }
/* Nav lateral esquerda do Jira: recolhida por padrao O Jira reserva espaco pro nav via padding-left no page-panel, ligado a --aui-sidebar-width. Sobrescrevemos os dois lados dessa equacao juntos: a largura visual da nav E o espaco que o conteudo reserva pra ela. */
html.uhub-wide.uhub-nav-collapsed .aui-page-panel, html.uhub-wide.uhub-nav-collapsed footer#footer { padding-left: var(--uhub-nav-w) !important }
html.uhub-wide.uhub-nav-collapsed .aui-sidebar .aui-sidebar-wrapper { width: var(--uhub-nav-w) !important }
html.uhub-wide.uhub-nav-collapsed .aui-sidebar .aui-nav-item-label, html.uhub-wide.uhub-nav-collapsed .aui-sidebar .aui-page-header-main, html.uhub-wide.uhub-nav-collapsed .aui-sidebar .aui-sidebar-group-label, html.uhub-wide.uhub-nav-collapsed .aui-sidebar .aui-sidebar-footer .aui-nav-item-label { display: none !important }
html.uhub-wide.uhub-nav-collapsed .aui-sidebar .aui-nav > li > .aui-nav-item { justify-content: center; padding: 7px !important }
html.uhub-wide.uhub-nav-collapsed .aui-sidebar .aui-nav > li > .aui-nav-item > .aui-icon { margin-right: 0 !important; float: none !important }
/* Botao para o usuario reexpandir a nav quando quiser (ela nao tem controle nativo aqui) */
#uhub-nav-toggle { position: fixed; left: 4px; z-index: max(var(--uhub-z-floor, -100000), calc(var(--uhub-z, 500) + 200)); background: #fff; border: 1px solid var(--uhub-border); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--uhub-text-muted); font-size: 11px; box-shadow: 0 1px 4px rgba(9,30,66,.15) }
#uhub-nav-toggle:hover { color: var(--uhub-accent) }
/* Layout wide geral da pagina */
html.uhub-wide .issue-container, html.uhub-wide .aui-page-panel, html.uhub-wide .aui-page-panel-inner { max-width: none !important }
/* o painel nativo soma o padding da nav a 100% de largura e passa ~32px da tela (scroll horizontal fantasma); o layout ja cabe na viewport */
html.uhub-wide .aui-page-panel { overflow-x: clip !important }
/* Jira fixa body{min-width:990px}: abaixo disso a pagina inteira rolava de lado. No layout otimizado tudo se ajusta a largura da janela. O cabecalho do Jira e responsivo (itens extras vao para "Mais"); o clip so garante que nada dele empurre a pagina. */
html.uhub-wide body { min-width: 0 !important }
html.uhub-wide #header .aui-header { overflow-x: clip }
/* Topbar: o bloco da direita (busca, icones, avatar) entra no fluxo e o da esquerda encolhe sem nunca passar por
   baixo dele (o Jira manda o excedente para "Mais"). Em janelas estreitas a busca vira so a lupa e abre ao focar. */
html:is(.uhub-att, .uhub-layout-off) #header .aui-header-inner { flex: 1 1 auto; min-width: 0 }
html:is(.uhub-att, .uhub-layout-off) #header .aui-header-primary { flex: 1 1 auto; min-width: 0; overflow: hidden }
html:is(.uhub-att, .uhub-layout-off) #header .aui-header-primary.uhub-hdr-clip { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent) }
html:is(.uhub-att, .uhub-layout-off) #header .aui-header-secondary { position: static !important; flex: 0 0 auto; margin-left: auto; padding-left: 12px }
/* o Jira reserva 180px invisiveis atras da busca (margin -180 / padding 180) que cobriam os botoes vizinhos */
html:is(.uhub-att, .uhub-layout-off) #header .aui-header-secondary > .aui-nav:not(#uhub-settings-header-nav) { margin-left: 0 !important; padding-left: 0 !important }
@media (max-width: 1100px) { html:is(.uhub-att, .uhub-layout-off) #header #quickSearchInput { width: 32px !important; min-width: 0 !important; padding-right: 0 !important; color: transparent; cursor: pointer; transition: width 0.15s ease } html:is(.uhub-att, .uhub-layout-off) #header #quickSearchInput::placeholder { color: transparent } html:is(.uhub-att, .uhub-layout-off) #header #quicksearch:focus-within #quickSearchInput { width: 200px !important; color: inherit; cursor: text } html:is(.uhub-att, .uhub-layout-off) #header #quicksearch:focus-within #quickSearchInput::placeholder { color: inherit } }
#header .aui-header-primary > .aui-nav > li.uhub-hdr-off { display: none !important }
html.uhub-hdr-1 #header .aui-header-secondary .aui-nav > li > a.aui-button-round, html.uhub-hdr-1 #header .aui-header-secondary .aui-nav > li > .aui-button-round { margin-left: 1px !important; margin-right: 1px !important }
html.uhub-hdr-2 #header .aui-header-logo { margin-right: 8px !important }
html.uhub-hdr-2 #header .aui-header-logo a { padding-left: 4px !important; padding-right: 4px !important }
html.uhub-hdr-2 #header .aui-header-logo img { width: 22px !important; height: var(--uhub-logo-h, 30px) !important; max-width: none; object-fit: cover; object-position: left center }
html.uhub-hdr-3 #header #create_link { display: inline-flex !important; align-items: center; justify-content: center; box-sizing: border-box; height: var(--uhub-create-h, 30px) !important; padding-top: 0 !important; padding-bottom: 0 !important; font-size: 0 !important; padding-left: 9px !important; padding-right: 9px !important; margin-left: 4px !important }
html.uhub-hdr-3 #header #create_link::before { content: "+"; font-size: 18px; font-weight: 600; line-height: 1 }
html.uhub-hdr-4 #header .aui-header-before { display: none !important }
html.uhub-wide .aui-page-panel-inner { padding-left: 16px !important; padding-right: 16px !important }
/* O cabecalho da issue (titulo, breadcrumb, aui-toolbar2-primary com os botoes de acao) fica acima das 3 colunas, ocupando a largura inteira disponivel (menos a sidebar de comentarios, que e permanente). A toolbar de botoes em si NAO e alterada por nenhuma regra aqui alem do respiro lateral. */
html.uhub-wide header#stalker { margin-right: calc(var(--uhub-sidebar-w) + var(--uhub-col-gap) * 2 + var(--uhub-stalker-fix, 0px)) !important; box-sizing: border-box }
/* Painel flutuante (telas menores): o conteudo usa a largura toda e fica por baixo do painel; o cabecalho (titulo + toolbar com Email/Exportar) continua reservando o espaco do painel para nunca ficar escondido. */
html.uhub-wide.uhub-narrow .issue-body-content { margin-right: calc(var(--uhub-col-gap) + var(--uhub-body-fix, 0px)) !important }
html.uhub-wide.uhub-float #uhub-sidebar { box-shadow: 0 12px 40px rgba(9, 30, 66, 0.35), 0 0 0 1px rgba(9, 30, 66, 0.08); border-left: 0 }
html.uhub-wide.uhub-comments-collapsed header#stalker { margin-right: calc(var(--uhub-col-gap) + var(--uhub-stalker-fix, 0px)) !important }
/* .issue-body-content reserva, do lado direito, a largura da sidebar de comentarios MAIS um respiro (--uhub-col-gap). Isso tambem cobre a folga anti-arredondamento de subpixel entre este calculo e o da largura real da sidebar fixa. */
html.uhub-wide .issue-body-content { box-sizing: border-box; padding-right: 0 !important; margin-right: calc(var(--uhub-sidebar-w) + var(--uhub-col-gap) * 2 + var(--uhub-body-fix, 0px)) !important }
html.uhub-wide.uhub-comments-collapsed .issue-body-content { margin-right: calc(var(--uhub-col-gap) + var(--uhub-body-fix, 0px)) !important; padding-bottom: calc(var(--uhub-sidebar-header-h, 46px) + 16px) !important }
html.uhub-wide .aui-group.issue-body { display: grid !important; grid-template-columns: minmax(0, 1fr); gap: var(--uhub-col-gap); align-items: start; width: 100% !important }
/* Coluna de metadados e Detalhes ocultos na pagina principal; abrem flutuando pelo botao i na barra de resumo */
html.uhub-wide .issue-main-column > #details-module, html.uhub-wide #tempo-issue-view-panel { display: none !important }
html.uhub-wide:not(.uhub-meta-open) #viewissuesidebar { display: none !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar { display: flex !important; flex-direction: column !important; position: fixed !important; top: var(--uhub-mp-top, 140px) !important; right: var(--uhub-mp-right, 24px) !important; left: auto !important; width: min(450px, calc(100vw - 16px)) !important; min-width: 0 !important; max-width: calc(100vw - 16px) !important; max-height: calc(100vh - var(--uhub-mp-top, 140px) - 12px) !important; overflow-y: auto !important; overflow-x: hidden !important; background: var(--uhub-bg) !important; border: 1px solid var(--uhub-border) !important; border-radius: 6px !important; box-shadow: 0 8px 24px rgba(9, 30, 66, 0.25) !important; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important; z-index: max(var(--uhub-z-floor, -100000), calc(var(--uhub-z, 500) + 150)) !important; container: uhubside / inline-size }
html.uhub-wide.uhub-meta-open #viewissuesidebar::before { content: "Detalhes da issue"; position: sticky; top: 0; z-index: 4; flex: 0 0 auto; display: flex; align-items: center; padding: 12px 18px; border-bottom: 1px solid var(--uhub-border); background: var(--uhub-bg-subtle); font-size: 13px; font-weight: 700; color: #172b4d }
html.uhub-wide.uhub-meta-open #viewissuesidebar > .module { padding: 14px 18px !important; margin: 0 !important; border: 0 !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar > .module + .module { border-top: 1px solid #ebecf0 !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar .mod-header { padding: 0 0 6px 0 !important; margin: 0 0 10px 0 !important; border-bottom: 1px solid #ebecf0 !important; background: transparent !important; cursor: default !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar .mod-header h3.toggle-header { display: block !important; margin: 0 !important; padding: 0 !important; background: transparent !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar .mod-header .toggle-title { position: static !important; width: auto !important; height: auto !important; background: transparent !important; border: 0 !important; padding: 0 !important; margin: 0 !important; cursor: default !important; pointer-events: none !important; text-align: left !important; display: inline-flex !important; align-items: center !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar .mod-header .toggle-title svg,
html.uhub-wide.uhub-meta-open #viewissuesidebar .mod-header .aui-icon { display: none !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar .mod-header .aui-toggle-header-button-label { position: static !important; left: auto !important; top: auto !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; color: var(--uhub-text-muted) !important; line-height: 1.3 !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar .mod-content { display: block !important; padding: 0 !important; margin: 0 !important; opacity: 1 !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar :is(dl.item-details, ul#issuedetails, #customfieldmodule ul.property-list) { display: grid !important; grid-template-columns: 136px minmax(0, 1fr) !important; gap: 8px 12px !important; align-items: baseline !important; list-style: none !important; padding: 0 !important; margin: 0 !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar :is(ul#issuedetails, #customfieldmodule ul.property-list) > li.item,
html.uhub-wide.uhub-meta-open #viewissuesidebar :is(ul#issuedetails, #customfieldmodule ul.property-list) > li.item > .wrap { display: contents !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar :is(dl.item-details > dt, ul#issuedetails .name, #customfieldmodule .name) { grid-column: 1 !important; color: var(--uhub-text-muted) !important; font-size: 12px !important; font-weight: 500 !important; line-height: 1.45 !important; padding: 0 !important; margin: 0 !important; width: auto !important; float: none !important; white-space: normal !important; text-align: left !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar :is(dl.item-details > dd, ul#issuedetails .value, #customfieldmodule .value) { grid-column: 2 !important; font-size: 13px !important; color: #172b4d !important; line-height: 1.45 !important; padding: 0 !important; margin: 0 !important; min-width: 0 !important; display: flex !important; flex-wrap: wrap !important; align-items: center !important; gap: 4px 8px !important; overflow-wrap: anywhere !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar :is(#devstatus-container, .ghx-separated, .tempo) { display: flex !important; flex-direction: column !important; gap: 6px !important; list-style: none !important; padding: 0 !important; margin: 0 !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar #customfieldmodule { margin-top: 10px !important; padding-top: 10px !important; border-top: 1px dashed #ebecf0 !important }
#uhub-meta-close { position: fixed; top: calc(var(--uhub-mp-top, 140px) + 8px); right: calc(var(--uhub-mp-right, 24px) + 12px); z-index: max(var(--uhub-z-floor, -100000), calc(var(--uhub-z, 500) + 155)); width: 26px; height: 26px; background: transparent; border: 0; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: var(--uhub-text-muted); cursor: pointer }
#uhub-meta-close:hover { background: rgba(9, 30, 66, 0.08); color: #172b4d }
html.uhub-wide:not(.uhub-meta-open) #uhub-meta-close { display: none !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar #details-module:not(:has(#issuedetails > li.item:not(.uhub-moved), #customfieldmodule)) { display: none !important }
html.uhub-wide.uhub-meta-open #viewissuesidebar aui-inline-dialog[open] { left: auto !important; right: 16px !important; max-width: calc(100% - 32px) !important }
html.uhub-wide .uhub-moved, html.uhub-wide .uhub-dup { display: none !important }
html.uhub-wide .issue-main-column { grid-column: 1; width: auto !important; min-width: 0 !important; max-width: none !important }
/* Evita que avatar + nome quebrem de forma estranha na coluna de metadados */
html.uhub-wide #viewissuesidebar .user-hover { display: inline-flex; align-items: center; gap: 4px; vertical-align: middle; white-space: nowrap }
html.uhub-wide #viewissuesidebar dd { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px }
html.uhub-wide dl:is(.people-list, .dates-list) { grid-template-columns: 140px minmax(0, 1fr) }
@container uhubside (max-width: 359px) { html.uhub-wide dl:is(.people-list, .dates-list) { grid-template-columns: fit-content(120px) minmax(0, 1fr); column-gap: 10px } }
@container uhubside (max-width: 219px) { html.uhub-wide dl:is(.people-list, .dates-list) { grid-template-columns: minmax(0, 1fr) } }
/* Detalhes do Item: layout compacto (flex-wrap em vez do two-cols nativo) */
html.uhub-wide #issuedetails { display: flex !important; flex-wrap: wrap !important; gap: 6px 24px !important; container-type: inline-size }
html.uhub-wide #issuedetails > li.item { float: none !important; width: auto !important; clear: none !important; flex: 0 0 auto; margin: 0 !important; max-width: 100% }
/* Campos com texto tipicamente longo ocupam a linha inteira, o resto fica lado a lado */
html.uhub-wide #issuedetails > li.item:has(#componentfield-val), html.uhub-wide #issuedetails > li.item:has(#security-val), html.uhub-wide #issuedetails > li.item:has(#labels-val) { flex: 1 1 100% }
html.uhub-wide #issuedetails .wrap { padding: 0 !important; display: flex !important; gap: 6px !important; align-items: baseline; flex-wrap: wrap }
html.uhub-wide #issuedetails .name { float: none !important; margin-left: 0 !important; width: auto !important; white-space: nowrap }
html.uhub-wide #issuedetails .value { display: inline !important; padding-left: 0 !important }
/* O valor da Prioridade (#priority-val) ocupa no minimo 200px nativamente no flex-wrap, mantendo o drop-down confortavel. */
html.uhub-wide #issuedetails #priority-val { display: inline-block !important; min-width: min(200px, calc(100cqw - 100px)); box-sizing: border-box; vertical-align: middle }
/* Edicao inline (Prioridade, Componentes, Rotulos...): enquanto o campo esta em modo de edicao, o item mantem EXATAMENTE a largura que tinha antes do clique (congelada via JS), o campo ocupa esse espaco e a linha nao quebra. Assim o seletor abre no mesmo lugar, sem descer nem empurrar os campos seguintes. */
html.uhub-wide #issuedetails li.uhub-edit-frozen { flex: 0 0 auto !important }
html.uhub-wide #issuedetails li.uhub-edit-frozen > .wrap { align-items: flex-start !important }
html.uhub-wide #issuedetails li.uhub-edit-frozen .editable-field.uhub-edit-frozen-value { flex: 0 0 auto !important; width: var(--uhub-frozen-w) !important; min-width: 0 !important; max-width: var(--uhub-frozen-w) !important; min-height: var(--uhub-frozen-h) !important }
/* Customfield module (abas "Field Tab" / "Demais campos", ex.: Account): mesma logica de compactacao do Details, para nao desperdicar altura vertical em cima de um unico campo por aba. */
html.uhub-wide #customfield-tabs .tabs-menu { margin: 0 0 4px !important }
html.uhub-wide #customfield-tabs .tabs-menu li { margin: 0 !important }
html.uhub-wide #customfield-tabs .tabs-menu a { padding: 2px 8px !important; font-size: 12px !important }
html.uhub-wide #customfield-panel-1, html.uhub-wide #customfield-panel-2 { padding: 0 !important }
html.uhub-wide #customfield-panel-1 .property-list, html.uhub-wide #customfield-panel-2 .property-list { margin: 0 !important }
html.uhub-wide #customfield-panel-1 .property-list .wrap, html.uhub-wide #customfield-panel-2 .property-list .wrap { padding: 0 !important; display: flex !important; gap: 6px !important; align-items: baseline; flex-wrap: wrap }
html.uhub-wide #customfield-panel-1 .property-list .name, html.uhub-wide #customfield-panel-2 .property-list .name { float: none !important; margin-left: 0 !important; width: auto !important; white-space: nowrap }
/* Engrenagem de Ajustes na topbar do Jira Fica num <ul class="aui-nav"> proprio, imediatamente a esquerda de #quicksearch-menu, para herdar exatamente o visual nativo dos itens redondos da topbar (mesmo padrao de #uhub-ai-header-item e #system-help-menu). */
#uhub-settings-header-nav { margin: 0 4px 0 0 !important; padding: 0 !important; list-style: none }
#uhub-settings-header-nav > li { margin: 0 }
#uhub-settings-btn.aui-button-round, #uhub-review-btn.aui-button-round, #uhub-layout-toggle.aui-button-round { display: inline-flex !important; align-items: center; justify-content: center }
#uhub-review-btn.uhub-active, #uhub-settings-btn.uhub-active, #uhub-layout-toggle.uhub-active { background-color: var(--aui-appheader-item-active-bg-color, rgba(255,255,255,.2)) !important }
html.uhub-layout-off #uhub-settings-header-nav > li:not(#uhub-layout-toggle-item) { display: none !important }
/* Fallback (topbar nao encontrada): engrenagem no header da coluna */
html.uhub-comments-collapsed #uhub-sidebar-header #uhub-settings-btn { display: none }
/* Painel de Ajustes: dropdown ancorado abaixo da engrenagem */
#uhub-settings-panel { position: fixed; top: var(--uhub-sp-top, 56px); right: var(--uhub-sp-right, 8px); width: 320px; max-width: calc(100vw - 16px); max-height: calc(100vh - var(--uhub-sp-top, 56px) - 12px); background: var(--uhub-bg); border: 1px solid var(--uhub-border); border-radius: 4px; box-shadow: 0 8px 24px rgba(9,30,66,.25); z-index: max(var(--uhub-z-floor, -100000), calc(var(--uhub-z, 500) + 150)); display: none; flex-direction: column; overflow: hidden; font-family: inherit }
#uhub-settings-panel.uhub-open { display: flex }
#uhub-settings-panel .sp-header { flex: 0 0 auto; padding: 12px 16px; border-bottom: 1px solid var(--uhub-border); background: var(--uhub-bg-subtle); display: flex; align-items: center; gap: 8px }
#uhub-settings-panel .sp-header strong { font-size: 13px; flex: 1 }
#uhub-settings-panel .sp-header button { appearance: none; border: none; background: transparent; cursor: pointer; border-radius: 4px; width: 24px; height: 24px; color: var(--uhub-text-muted) }
#uhub-settings-panel .sp-header button:hover { background: rgba(9, 30, 66, 0.08) }
#uhub-settings-panel .sp-body { flex: 1 1 auto; overflow-y: auto; padding: 16px }
#uhub-settings-panel .sp-field { margin-bottom: 20px }
#uhub-settings-panel .sp-field label { display: flex; justify-content: space-between; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #172b4d; margin-bottom: 6px }
#uhub-settings-panel .sp-field label > span:first-child { flex: 1 1 auto; min-width: 0 }
#uhub-settings-panel .sp-field .sp-val { color: var(--uhub-accent); font-weight: 700; flex: 0 0 auto; font-variant-numeric: tabular-nums }
#uhub-settings-panel .sp-field input[type="range"] { width: 100%; accent-color: var(--uhub-accent) }
#uhub-settings-panel .sp-field .sp-hint { font-size: 11px; color: var(--uhub-text-muted); margin-top: 4px; line-height: 1.4 }
#uhub-settings-panel .sp-warning { display: none; background: #fff0ed; border: 1px solid #ffbdad; color: #bf2600; font-size: 11px; padding: 8px 10px; border-radius: 4px; margin-bottom: 16px; line-height: 1.4 }
#uhub-settings-panel .sp-warning.uhub-show { display: block }
#uhub-settings-panel .sp-reset { width: 100%; padding: 8px; border: 1px solid var(--uhub-border); background: var(--uhub-bg-subtle); border-radius: 4px; font-size: 12px; color: var(--uhub-text-muted); cursor: pointer }
#uhub-settings-panel .sp-reset:hover:not(:disabled) { background: #eef0f2; color: #172b4d }
#uhub-settings-panel .sp-reset:disabled { opacity: 0.45; cursor: default }
#uhub-settings-panel .sp-item-reset { appearance: none; border: 0; background: transparent; width: 20px; height: 20px; padding: 0; margin: -2px 0 -2px 2px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; color: var(--uhub-text-muted); cursor: pointer; flex: 0 0 auto; transition: background 0.1s ease, color 0.1s ease }
#uhub-settings-panel .sp-item-reset:hover:not(:disabled) { background: rgba(9, 30, 66, 0.08); color: #172b4d }
#uhub-settings-panel .sp-item-reset:disabled { opacity: 0.28; cursor: default }
#uhub-settings-panel .sp-item-reset:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
/* Sidebar de comentarios: pertence a mesma hierarquia vertical das colunas de conteudo e metadados — comeca abaixo da topbar do Jira (#header) e do cabecalho da issue (header#stalker), nunca ao lado deles. --uhub-header-h e calculada em JS (measureHeaderHeight) e recalculada sempre que a altura do cabecalho muda (titulo que quebra em 2 linhas, redimensionamento da janela, etc). */
#uhub-sidebar { position: fixed; top: var(--uhub-header-h, 0px); right: var(--uhub-col-gap); width: var(--uhub-sidebar-w); box-sizing: border-box; height: calc(100vh - var(--uhub-header-h, 0px)); background: var(--uhub-bg); border-left: 1px solid var(--uhub-border); box-shadow: var(--uhub-shadow); z-index: max(var(--uhub-z-floor, -100000), var(--uhub-z, 500)); display: flex; flex-direction: column; overflow: hidden; border-radius: 4px; font-family: inherit }
/* Animacao so no instante de minimizar/restaurar (nada mais e animado: ajustes de posicao sao sempre imediatos) */
html.uhub-anim #uhub-sidebar { transition: top 0.2s ease, height 0.2s ease }
/* Minimizado para baixo: mantem a largura, desce ate o rodape da tela e deixa visivel so o header (titulo + botao de restaurar). */
html.uhub-comments-collapsed #uhub-sidebar { top: calc(100vh - var(--uhub-sidebar-header-h, 46px)); height: var(--uhub-sidebar-header-h, 46px); border-radius: 4px 4px 0 0 }
html.uhub-comments-collapsed #uhub-sidebar-header { cursor: pointer; border-bottom: none }
#uhub-sidebar-header { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--uhub-border); background: #044099; min-height: 20px }
#uhub-sidebar-title { font-size: 13px; font-weight: 600; color: #ffffff; flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
/* Fallback (topbar nao encontrada): botoes no header da coluna */
html.uhub-comments-collapsed #uhub-sidebar-header #uhub-refresh-btn { display: none }
#uhub-refresh-btn.aui-button-round { display: inline-flex !important; align-items: center; justify-content: center }
#uhub-sidebar-header button { appearance: none; border: none; background: transparent; cursor: pointer; border-radius: 4px; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; flex: 0 0 auto; transition: background 0.1s ease, color 0.1s ease }
#uhub-sidebar-header button:hover { background: rgba(255, 255, 255, 0.16); color: #ffffff }
#uhub-refresh-btn.uhub-spinning svg { animation: uhub-spin 0.7s linear infinite }
@keyframes uhub-spin { from { transform: rotate(0deg) }
to { transform: rotate(360deg) }
 }
/* Corpo da sidebar: lista de comentarios rola por baixo do #addcomment fixo no topo. padding-top reserva espaco para nao ficar escondida atras dele (--uhub-addcomment-h, calculada em JS). */
#uhub-sidebar-scroll { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: calc(4px + var(--uhub-addcomment-h, 60px)) 14px 12px; position: relative }
html.uhub-comments-collapsed #uhub-sidebar-scroll { display: none }
/* #addcomment "pinado" no lugar original do DOM Continua filho de .issue-main-column (onde o Jira o criou), mas com position:fixed passa a ser DESENHADO logo abaixo do header "Comentários" da sidebar (topo da coluna) — os comentarios mais recentes ja aparecem no topo da lista (ver "Mais recentes primeiro"), entao o campo de novo comentario faz mais sentido ali perto, em vez de no rodape, longe dos comentarios mais antigos. --uhub-sidebar-content-top = --uhub-header-h (onde a sidebar comeca) + altura do header interno da sidebar (titulo "Comentarios" e botoes), medida dinamicamente (ver watchSidebarHeaderHeight). Isso preserva 100% do JS/listeners nativos do Jira (TinyMCE incluso), que nunca percebem o elemento "saindo" do container original. */
#addcomment.uhub-pinned-footer { position: fixed !important; left: auto !important; right: var(--uhub-col-gap) !important; bottom: auto !important; top: var(--uhub-sidebar-content-top, 0px) !important; width: var(--uhub-sidebar-w) !important; max-width: var(--uhub-sidebar-w) !important; background: var(--uhub-bg) !important; border-bottom: 1px solid var(--uhub-border) !important; border-left: 1px solid var(--uhub-border) !important; box-shadow: none !important; padding: 10px 14px !important; margin: 0 !important; z-index: max(var(--uhub-z-floor, -100000), calc(var(--uhub-z, 500) + 1)) !important; box-sizing: border-box !important; max-height: 60vh; overflow-y: auto }
html.uhub-comments-collapsed #addcomment.uhub-pinned-footer { display: none !important }
/* O Jira tambem aplica position:sticky nativo; como ja fixamos o elemento inteiro, neutralizamos o sticky interno para nao conflitar. */
#addcomment.uhub-pinned-footer.sticky { position: fixed !important }
#uhub-sidebar-scroll.uhub-loading { opacity: 0.5; pointer-events: none }
/* Ancorado relativo ao #addcomment fixo no topo (nao ao topo do scroll, que agora comeca com padding reservado pra ele) */
#uhub-refresh-toast { position: fixed; top: calc(var(--uhub-sidebar-content-top, 0px) + var(--uhub-addcomment-h, 60px) + 6px); right: calc(var(--uhub-col-gap) + var(--uhub-sidebar-w) / 2); transform: translateX(50%); background: #172b4d; color: #fff; font-size: 12px; padding: 4px 12px; border-radius: 12px; opacity: 0; pointer-events: none; transition: opacity 0.2s ease; z-index: max(var(--uhub-z-floor, -100000), calc(var(--uhub-z, 500) + 2)); white-space: nowrap; box-shadow: 0 2px 8px rgba(9, 30, 66, 0.22) }
html.uhub-comments-collapsed:not(.uhub-beta-open) #uhub-refresh-toast { top: auto; bottom: 58px; left: 50%; right: auto; transform: translateX(-50%) }
html.uhub-beta-open #uhub-refresh-toast { top: 68px; left: 50%; right: auto; transform: translateX(-50%); z-index: 2147483150; padding: 7px 16px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.16); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.38) }
#uhub-refresh-toast.uhub-show { opacity: 0.96 }
/* Conteudo movido do Jira dentro da sidebar: remove chrome duplicado */
#uhub-sidebar-scroll #activitymodule_heading { display: none !important }
#uhub-sidebar-scroll #activitymodule { border: none !important; box-shadow: none !important; margin: 0 !important; max-width: none !important }
#uhub-sidebar-scroll #issue-tabs { position: sticky; top: 0; background: var(--uhub-bg); z-index: 2; padding-top: 2px; margin-bottom: 4px }
#uhub-sidebar-scroll .twixi-wrap, #uhub-sidebar-scroll .action-body, #uhub-sidebar-scroll .issue-tab-pane, #uhub-sidebar-scroll .activity-navigator { max-width: none !important }
/* Com camadas empatadas em 0 (sobreposicao em camada baixa), a coluna viria por cima do campo de comentario. Abrimos uma "janela" na coluna exatamente sobre o campo, para ele continuar visivel sob o fundo escurecido do visualizador. */
html.uhub-overlay-compress #uhub-sidebar { background: transparent !important }
html.uhub-overlay-compress #uhub-sidebar-scroll { background: var(--uhub-bg); clip-path: inset(var(--uhub-addcomment-h, 60px) 0 0 0) }
/* Painel de ajustes: secao de atualizacao */
#uhub-settings-panel .sp-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--uhub-border) }
#uhub-settings-panel .sp-section-title { font-size: 12px; font-weight: 700; color: #172b4d; margin-bottom: 12px }
#uhub-settings-panel .sp-check { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #172b4d; margin-bottom: 12px; cursor: pointer; line-height: 1.4 }
#uhub-settings-panel .sp-check input { margin: 1px 0 0; accent-color: var(--uhub-accent); flex: 0 0 auto }
#uhub-settings-panel .sp-check > span { flex: 1 1 auto; min-width: 0 }
#uhub-settings-panel .sp-check input:disabled + span, #uhub-settings-panel input[type="range"]:disabled { opacity: 0.45 }
#uhub-settings-panel .sp-status { margin-top: 10px; font-size: 11px; color: var(--uhub-text-muted); line-height: 1.4 }
/* Destaque de comentario recem-chegado */
@keyframes uhub-new-comment-flash { 0% { background-color: #fff4c2; box-shadow: inset 3px 0 0 #044099 }
70% { background-color: #fff9e0; box-shadow: inset 3px 0 0 #044099 }
100% { background-color: transparent; box-shadow: inset 3px 0 0 transparent }
 }
.uhub-new-comment { animation: uhub-new-comment-flash 6s ease-out 1; border-radius: 4px }
/* Botoes de copiar (titulo e chave da issue) */
.uhub-copy-btn { appearance: none; border: 0; background: transparent; cursor: pointer; padding: 0; margin: 0 0 0 6px; width: 26px; height: 26px; border-radius: 4px; color: var(--uhub-text-muted); display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; flex: 0 0 auto }
.uhub-copy-btn:hover { background: rgba(9, 30, 66, 0.08); color: #172b4d }
.uhub-copy-btn.uhub-copied { color: #00875a }
#uhub-copy-key { width: 20px; height: 20px; margin-left: 4px }
/* Copiar link do comentario: ao lado do "Responder" (ou da data) */
.action-details .uhub-cmt-copy { width: 20px; height: 20px; margin: 0 0 0 4px; vertical-align: middle; position: relative; top: -0.1em }
.action-details .uhub-cmt-copy svg { width: 14px; height: 14px }
/* Titulo + botao de copiar na mesma linha, centralizados verticalmente (flex no container do titulo; a trilha de navegacao ocupa a linha de cima) */
html.uhub-wide header#stalker .aui-page-header-main { display: flex !important; flex-wrap: wrap; align-items: center }
html.uhub-wide header#stalker .aui-page-header-main > nav, html.uhub-wide header#stalker .aui-page-header-main > ol { flex: 1 0 100% }
html.uhub-wide header#stalker .aui-page-header-main > #summary-val { flex: 0 1 auto; min-width: 0; max-width: calc(100% - 34px) }
html.uhub-wide header#stalker .aui-page-header-main > #summary-val.active { flex: 1 1 auto }
html.uhub-wide header#stalker #summary-val.active :is(input, textarea) { box-sizing: border-box }
#summary-val + #uhub-copy-summary { margin-left: 2px }
/* "Responder" em cada comentario */
.uhub-reply-btn { appearance: none; border: 0; background: #044099; color: #ffffff; padding: 0 9px; margin: 0 0 0 8px; border-radius: 10px; cursor: pointer; font: inherit; font-size: inherit; font-weight: 400; line-height: 1.5; display: inline-flex; align-items: center; gap: 4px; vertical-align: -0.15em; white-space: nowrap }
.uhub-reply-btn:hover { background: #0052cc }
.uhub-reply-btn svg { flex: 0 0 auto }
.uhub-reply-btn.uhub-reply-done { background: #00875a }
/* Responder e copiar link: so aparecem com o mouse sobre o comentario (sempre visiveis em telas sem mouse) */
@media (hover: hover) { #uhub-sidebar-scroll .activity-comment:not(:hover):not(:focus-within) :is(.uhub-reply-btn, .uhub-cmt-copy) { opacity: 0; pointer-events: none } }
#uhub-sidebar-scroll .activity-comment :is(.uhub-reply-btn, .uhub-cmt-copy) { transition: opacity 0.12s ease }
/* Editor "velado" durante conversoes internas (evita piscar) */
#addcomment.uhub-editor-veil .wiki-edit-content, #addcomment.uhub-editor-veil .rte-container, #addcomment.uhub-editor-veil textarea#comment { opacity: 0 !important }

/* Anexos: largura total (abaixo do conteudo E dos metadados) */
html.uhub-wide .aui-group.issue-body::before, html.uhub-wide .aui-group.issue-body::after { display: none !important; content: none !important }
html.uhub-wide .aui-group.issue-body > #attachmentmodule { grid-column: 1 / -1; min-width: 0; margin-top: 0 }
/* Grade de anexos responsiva com tamanho ajustavel (--uhub-att-w) */
html.uhub-att #attachmentmodule #attachment_thumbnails { display: flex !important; flex-wrap: wrap; gap: 14px; float: none !important; width: 100% !important }
html.uhub-att #attachmentmodule #attachment_thumbnails::after { display: none !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content { float: none !important; flex: 0 0 auto; width: var(--uhub-att-w) !important; max-width: 100%; height: auto !important; margin: 0 !important; position: relative; box-sizing: border-box }
html.uhub-att-prop.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content[data-uhub-aspect] { width: clamp(max(140px, calc(var(--uhub-att-w) * 0.4)), calc(var(--uhub-att-w) * 0.725 * var(--uhub-aspect) + 2px), var(--uhub-att-w)) !important }
html.uhub-att-prop.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content:not([data-attachment-type="image"]) { width: calc(var(--uhub-att-w) * 0.725 + 2px) !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content .attachment-thumb { width: 100% !important; height: calc(var(--uhub-att-w) * 0.725) !important; box-sizing: border-box; overflow: hidden }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content .attachment-thumb a { display: flex; align-items: center; justify-content: center; width: 100%; height: 100% }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content .attachment-thumb img { max-width: 100% !important; max-height: 100% !important; width: auto; height: auto; object-fit: contain }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl { width: auto !important; margin: 5px 8px !important; height: auto !important; min-height: 42px; overflow: hidden }
/* O titulo ocupa no maximo a largura do anexo — assim o botao nativo de excluir (lixeira, no canto direito, ao passar o mouse) fica sempre visivel */
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl dt { float: none !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; position: static !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl { position: static !important; display: flex !important; flex-wrap: wrap; justify-content: space-between; align-items: baseline; column-gap: 8px; row-gap: 0 }
/* titulo em cima (ate 3 linhas); data e tamanho na linha de baixo, quebrando juntos de forma previsivel quando o anexo e estreito */
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl > dt { flex: 1 0 100% !important; order: 0 }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl > dd { float: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; white-space: nowrap; text-align: left !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl > dd.attachment-date { order: 1 }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl > dd.attachment-size { order: 2 }
/* Titulo do anexo: ate 2 linhas (quebra em qualquer ponto do nome) */
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content dl .attachment-title { display: -webkit-box !important; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; width: auto !important; max-width: 100% !important; white-space: normal !important; height: auto !important; max-height: 3lh; overflow: hidden; overflow-wrap: anywhere; word-break: break-word; text-overflow: ellipsis; padding-right: 0 !important }
/* Controle de tamanho no cabecalho de Anexos */
#attachmentmodule_heading .uhub-att-li { display: inline-flex; align-items: center; gap: 6px; margin-right: 2px; height: 24px; font-size: 12px; color: var(--uhub-text-muted); transform: translateY(var(--uhub-att-dy, -3px)) }
#attachmentmodule_heading .uhub-att-reset svg, #attachmentmodule_heading .uhub-att-delall svg { width: 16px; height: 16px }
/* Sua foto ao lado do novo comentario */
#addcomment > .uhub-me-avatar { position: absolute; width: 32px; height: 32px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 1px rgba(9, 30, 66, 0.13); background: #dfe1e6; pointer-events: auto; z-index: 1 }
#addcomment > .uhub-me-avatar[hidden] { display: none }
#attachmentmodule_heading .uhub-att-li input[type="range"] { width: 120px; accent-color: var(--uhub-accent); margin: 0 }
#attachmentmodule_heading .uhub-att-li .uhub-att-val { min-width: 66px; font-variant-numeric: tabular-nums }
#attachmentmodule_heading .uhub-att-reset { appearance: none; border: 0; background: transparent; width: 26px; height: 24px; padding: 0; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; color: var(--ds-icon, #42526e); cursor: pointer }
#attachmentmodule_heading .uhub-att-reset:hover { background: rgba(9, 30, 66, 0.08); color: #172b4d }
#attachmentmodule_heading .uhub-att-reset:disabled { opacity: 0.35; cursor: default; background: transparent }
#attachmentmodule_heading .uhub-att-delall { appearance: none; border: 0; background: transparent; width: 26px; height: 24px; padding: 0; margin-left: -2px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; color: var(--ds-icon, #42526e); cursor: pointer }
#attachmentmodule_heading .uhub-att-delall:hover { background: #ffebe6; color: #bf2600 }
#attachmentmodule_heading .uhub-att-delall[hidden] { display: none }
/* Lixeira e Citar: sempre visiveis, sobre a miniatura (canto superior direito), com o mesmo estilo — nao ocupam espaco do titulo */
html.uhub-att #attachmentmodule #attachment_thumbnails .blender, html.uhub-att #attachmentmodule #attachment_thumbnails .blender-delete { display: none !important }
/* faixa branca do Jira cortava o titulo */
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-delete { position: absolute !important; top: 6px !important; right: 6px !important; left: auto !important; bottom: auto !important; margin: 0 !important; padding: 0 !important; width: auto !important; height: auto !important; background: none !important; z-index: 3 }
html.uhub-att #attachment_thumbnails { isolation: isolate }
html.uhub-wide:not(.uhub-narrow) header#stalker:has(.aui-dropdown2[aria-hidden="false"], .aui-dropdown2[open], .aui-dropdown2-trigger[aria-expanded="true"]), html.uhub-wide.uhub-narrow.uhub-comments-collapsed header#stalker:has(.aui-dropdown2[aria-hidden="false"], .aui-dropdown2[open], .aui-dropdown2-trigger[aria-expanded="true"]) { z-index: calc(var(--uhub-z, 500) + 150) !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-delete a, html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-cite { clip: auto !important; position: static !important; box-sizing: border-box; width: 24px !important; height: 24px !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; display: inline-flex !important; align-items: center; justify-content: center; border: 0; border-radius: 4px; background: rgba(255, 255, 255, 0.92) !important; box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); color: #42526e !important; cursor: pointer; opacity: 1 !important; visibility: visible !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-cite { position: absolute !important; top: 6px; right: 34px; z-index: 3 }
/* Anexo que o Jira nao deixa excluir: lixeira desativada no mesmo lugar */
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-nodel-trash { position: absolute; top: 6px; right: 6px; z-index: 3; box-sizing: border-box; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); color: #a5adba; cursor: not-allowed }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-nodel-trash .aui-icon { color: inherit !important; margin: 0 !important }
html:not(.uhub-att) .uhub-att-nodel-trash { display: none !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-delete a .aui-icon, html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-cite .aui-icon { color: inherit !important; margin: 0 !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-delete a:hover { background: #ffebe6 !important; color: #bf2600 !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-cite:hover { background: #deebff !important; color: #044099 !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-cite.uhub-done { background: #e3fcef !important; color: #00875a !important }
/* Botao de olho (visualizador 1:1 Beta) no canto inferior direito da miniatura, identico aos botoes nativos */
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-inspect { position: absolute; right: 6px; bottom: 6px; z-index: 3; box-sizing: border-box; width: 24px; height: 24px; margin: 0; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 4px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); color: #42526e; cursor: pointer }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-inspect:hover { background: #deebff; color: #044099 }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-att-inspect:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
html:not(.uhub-att) .uhub-att-inspect { display: none !important }
/* Previa de zip: mini miniaturas das imagens de dentro (1 a 4, com +N) no lugar do icone de arquivo */
html.uhub-att #attachmentmodule #attachment_thumbnails li.uhub-zp-on .attachment-thumb a > .attachment-thumbnail-icon { position: absolute !important; left: 6px !important; bottom: 6px !important; top: auto !important; right: auto !important; z-index: 3; box-sizing: border-box !important; width: 24px !important; height: 24px !important; max-width: none !important; max-height: none !important; margin: 0 !important; padding: 3px !important; object-fit: contain; display: block !important; border-radius: 4px; background: rgba(255, 255, 255, 0.92) !important; box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); pointer-events: none }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp { box-sizing: border-box; width: 100%; height: 100%; padding: 0; display: grid; gap: 2px; background: #ffffff }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp-1 { grid-template: 1fr / 1fr }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp-2 { grid-template: 1fr / 1fr 1fr }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp-3, html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp-4 { grid-template: 1fr 1fr / 1fr 1fr }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp-3 .uhub-zp-cell:first-child { grid-row: 1 / 3 }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp-cell { position: relative; min-width: 0; min-height: 0; overflow: hidden; border-radius: 3px; background: #ffffff; box-shadow: 0 0 0 1px rgba(9, 30, 66, 0.13) }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content .attachment-thumb .uhub-zp-cell img { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; object-fit: cover !important; display: block !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .attachment-content .attachment-thumb .uhub-zp-1 .uhub-zp-cell img { object-fit: contain !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-zp-more { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(9, 30, 66, 0.62); color: #ffffff; font-size: 13px; font-weight: 600 }
/* Previa de PDF: 1a pagina como thumb, com o icone original do Jira no canto (igual aos zips) */
html.uhub-att #attachmentmodule #attachment_thumbnails li.uhub-pdf-on .attachment-thumb a > .attachment-thumbnail-icon { position: absolute !important; left: 6px !important; bottom: 6px !important; top: auto !important; right: auto !important; z-index: 3; box-sizing: border-box !important; width: 24px !important; height: 24px !important; max-width: none !important; max-height: none !important; margin: 0 !important; padding: 3px !important; object-fit: contain; display: block !important; border-radius: 4px; background: rgba(255, 255, 255, 0.92) !important; box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); pointer-events: none }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-pdfp { box-sizing: border-box; width: 100%; height: 100%; overflow: hidden; background: #ffffff }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-pdfp canvas { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center }
/* Previa de video: 1o quadro como thumb, icone original no canto e botao de play no centro */
html.uhub-att #attachmentmodule #attachment_thumbnails li.uhub-vid-on .attachment-thumb a > .attachment-thumbnail-icon { position: absolute !important; left: 6px !important; bottom: 6px !important; top: auto !important; right: auto !important; z-index: 3; box-sizing: border-box !important; width: 24px !important; height: 24px !important; max-width: none !important; max-height: none !important; margin: 0 !important; padding: 3px !important; object-fit: contain; display: block !important; border-radius: 4px; background: rgba(255, 255, 255, 0.92) !important; box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); pointer-events: none }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-vidp { position: relative; box-sizing: border-box; width: 100%; height: 100%; overflow: hidden; background: #172b4d }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-vidp video { display: block; width: 100%; height: 100%; object-fit: cover; pointer-events: none }
html.uhub-att #attachmentmodule #attachment_thumbnails li.uhub-vid-on.attachment-content .attachment-thumb a > span.attachment-thumbnail-icon { display: flex !important; align-items: center; justify-content: center; text-indent: 0 !important; line-height: 1 !important; overflow: hidden !important; font-size: 16px !important }
html.uhub-att #attachmentmodule #attachment_thumbnails li.uhub-vid-on.attachment-content .attachment-thumb a > span.attachment-thumbnail-icon::before { position: static !important; margin: 0 !important; width: auto !important; height: auto !important; font-size: 16px !important; line-height: 1 !important; transform: none !important }
html.uhub-att #attachmentmodule #attachment_thumbnails .uhub-vidp::after { content: ""; position: absolute; left: 50%; top: 50%; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%; background: rgba(9, 30, 66, 0.62) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23fff' d='M6 4.5v7l5.5-3.5z'/%3E%3C/svg%3E") center / 22px no-repeat; pointer-events: none }
/* Visualizador Unificado BETA: alinhado ao sistema visual AUI do Jira */
#uhub-beta-viewer { position: fixed; inset: 0; z-index: 2147483100; background: rgba(0, 0, 0, 0.86); color: #172b4d; display: flex; flex-direction: column; font-family: inherit; font-size: 13px; transition: background 0.16s ease }
#uhub-beta-viewer.bv-light-bg { background: rgba(255, 255, 255, 0.88) }
#uhub-beta-viewer[hidden] { display: none !important }
#uhub-beta-viewer .bv-top { flex: 0 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; padding: 8px 16px; background: var(--uhub-bg); border-bottom: 1px solid var(--uhub-border); min-height: 44px; box-sizing: border-box; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08) }
#uhub-beta-viewer .bv-brand { display: inline-flex; align-items: center; gap: 8px; min-width: 0 }
#uhub-beta-viewer .bv-center-controls { display: inline-flex; align-items: center; justify-content: center; gap: 12px }
#uhub-beta-viewer .bv-beta-tag { flex: 0 0 auto; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; background: #deebff; color: #044099 }
#uhub-beta-viewer .bv-side-nav { position: fixed; top: 50%; transform: translateY(-50%); z-index: 20; width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--uhub-border); background: rgba(255, 255, 255, 0.94); color: #172b4d; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); padding: 0; transition: background 0.12s ease, transform 0.12s ease, color 0.12s ease }
#uhub-beta-viewer .bv-side-nav:hover:not(:disabled) { background: #deebff; border-color: #4c9aff; color: #0052cc; transform: translateY(-50%) scale(1.06) }
#uhub-beta-viewer .bv-side-nav:disabled { opacity: 0.35; cursor: default }
#uhub-beta-viewer .bv-side-nav, #uhub-beta-viewer .bv-side-nav:hover:not(:disabled), #uhub-beta-viewer .bv-side-nav:active:not(:disabled), #uhub-beta-viewer .bv-side-nav:focus-visible { background: none !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: none !important; padding: 0 !important; width: 64px !important; height: 140px !important; color: #ffffff !important; transform: translateY(-50%) !important; transition: none !important }
#uhub-beta-viewer.bv-light-bg .bv-side-nav, #uhub-beta-viewer.bv-light-bg .bv-side-nav:hover:not(:disabled), #uhub-beta-viewer.bv-light-bg .bv-side-nav:active:not(:disabled), #uhub-beta-viewer.bv-light-bg .bv-side-nav:focus-visible { color: #172b4d !important }
#uhub-beta-viewer .bv-side-nav svg { width: 40px !important; height: 40px !important; filter: none !important }
#uhub-beta-viewer .bv-side-nav:focus-visible { outline: 2px solid #4c9aff; outline-offset: 2px }
#uhub-beta-viewer .bv-icon-btn { appearance: none; border: 1px solid var(--uhub-border); background: var(--uhub-bg-subtle); color: #42526e; height: 26px; min-width: 26px; padding: 0 10px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap }
#uhub-beta-viewer .bv-icon-btn:hover:not(:disabled) { background: #deebff; border-color: #b3d4ff; color: #044099 }
#uhub-beta-viewer .bv-icon-btn:disabled { opacity: 0.4; cursor: default }
#uhub-beta-viewer .bv-icon-btn:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#uhub-beta-viewer .bv-icon-btn.bv-done { background: #e3fcef; border-color: #abf5d1; color: #006644 }
#uhub-beta-viewer .bv-icon-btn.bv-close:hover { background: #ffebe6; border-color: #ffbdad; color: #bf2600 }
#uhub-beta-viewer .bv-title-wrap { min-width: 0; display: flex; flex-direction: column; gap: 1px }
#uhub-beta-viewer .bv-title { font-weight: 600; font-size: 13px; color: #172b4d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
#uhub-beta-viewer .bv-meta { font-size: 11px; color: var(--uhub-text-muted); white-space: nowrap; font-variant-numeric: tabular-nums }
#uhub-beta-viewer .bv-meta-row { display: flex; align-items: center; gap: 5px; min-width: 0 }
#uhub-beta-viewer .bv-info-btn { appearance: none; border: 0; background: transparent; color: #6b778c; width: 18px; height: 18px; padding: 0; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: 0 0 auto }
#uhub-beta-viewer .bv-info-btn:hover, #uhub-beta-viewer .bv-info-btn[aria-expanded="true"] { background: #deebff; color: #0052cc }
#uhub-beta-viewer .bv-info-btn:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#uhub-beta-viewer .bv-info-pop { position: fixed; z-index: 40; width: 340px; max-width: calc(100vw - 24px); max-height: 70vh; overflow: auto; box-sizing: border-box; padding: 10px 12px; background: var(--uhub-bg); color: #172b4d; border: 1px solid var(--uhub-border); border-radius: 4px; box-shadow: 0 8px 24px rgba(9, 30, 66, 0.3); font-size: 12px }
#uhub-beta-viewer .bv-info-pop dl { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 5px 10px; margin: 0 }
#uhub-beta-viewer .bv-info-pop dt { color: var(--uhub-text-muted); font-weight: 600 }
#uhub-beta-viewer .bv-info-pop dd { margin: 0; overflow-wrap: anywhere }
#uhub-beta-viewer .bv-seg { display: inline-flex; border: 1px solid var(--uhub-border); border-radius: 4px; overflow: hidden; background: var(--uhub-bg); flex: 0 0 auto }
#uhub-beta-viewer .bv-seg button { appearance: none; border: 0; background: transparent; color: #172b4d; height: 26px; padding: 0 12px; font: inherit; font-size: 12.5px; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px }
#uhub-beta-viewer .bv-seg button + button { border-left: 1px solid var(--uhub-border) }
#uhub-beta-viewer .bv-seg button:hover:not(:disabled):not([aria-pressed="true"]) { background: var(--uhub-bg-subtle) }
#uhub-beta-viewer .bv-seg button[aria-pressed="true"] { background: var(--uhub-accent); color: #ffffff; font-weight: 600 }
#uhub-beta-viewer .bv-seg button[aria-pressed="true"]:hover { background: var(--uhub-accent-hover); color: #ffffff }
#uhub-beta-viewer .bv-seg button:disabled { opacity: 0.4; cursor: not-allowed }
#uhub-beta-viewer .bv-zoom { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto }
#uhub-beta-viewer .bv-zoom-val { min-width: 68px; text-align: center; color: #172b4d; font-variant-numeric: tabular-nums }
#uhub-beta-viewer .bv-actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 1 1 auto; min-width: 0 }
#uhub-beta-viewer .bv-subbar { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px 20px; padding: 6px 16px; background: var(--uhub-bg-subtle); border-bottom: 1px solid var(--uhub-border); font-size: 12.5px; color: #172b4d }
#uhub-beta-viewer .bv-subbar[hidden] { display: none !important }
#uhub-beta-viewer .bv-pickers { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px }
#uhub-beta-viewer .bv-picker-lbl { color: var(--uhub-text-muted); font-size: 12px; font-weight: 600 }
#uhub-beta-viewer select.bv-select { background: var(--uhub-bg); color: #172b4d; border: 1px solid var(--uhub-border); border-radius: 3px; height: 24px; padding: 0 6px; font: inherit; font-size: 12px; max-width: 280px }
#uhub-beta-viewer .bv-subhint { color: var(--uhub-text-muted); font-size: 11px }
#uhub-beta-viewer .bv-stage { flex: 1 1 auto; overflow: auto; position: relative; padding: 20px 72px; box-sizing: border-box; background: transparent }
/* Modo 1: Leitor vertical 1:1 (unico) */
#uhub-beta-viewer .bv-single-wrap { margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100% }
#uhub-beta-viewer:not(.bv-light-bg) .bv-single-wrap img { display: block; max-width: none; height: auto; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55); background: repeating-conic-gradient(#262626 0% 25%, #1a1a1a 0% 50%) 50% / 16px 16px }
#uhub-beta-viewer.bv-light-bg .bv-single-wrap img { display: block; max-width: none; height: auto; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16); background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px }
/* Modo 2: Cortina deslizante */
#uhub-beta-viewer:not(.bv-light-bg) .bv-curtain-wrap { margin: 0 auto; position: relative; user-select: none; touch-action: none; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55); background: repeating-conic-gradient(#262626 0% 25%, #1a1a1a 0% 50%) 50% / 16px 16px }
#uhub-beta-viewer.bv-light-bg .bv-curtain-wrap { margin: 0 auto; position: relative; user-select: none; touch-action: none; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16); background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px }
#uhub-beta-viewer .bv-curtain-wrap img.bv-img-a { display: block; width: 100%; height: auto; pointer-events: none }
#uhub-beta-viewer .bv-curtain-wrap img.bv-img-b { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; object-position: top left; clip-path: inset(0 0 0 var(--bv-split, 50%)); pointer-events: none }
#uhub-beta-viewer .bv-curtain-badges { position: sticky; top: 10px; z-index: 5; display: flex; justify-content: space-between; padding: 0 12px; pointer-events: none; height: 0 }
#uhub-beta-viewer .bv-pill { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 8px 0 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background: var(--uhub-bg); color: #172b4d; border: 1px solid var(--uhub-border); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16); pointer-events: auto; max-width: 44% }
#uhub-beta-viewer .bv-pill > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
#uhub-beta-viewer .bv-pill.bv-pill-b { background: #42526e; color: #ffffff; border-color: #344563 }
#uhub-beta-viewer .bv-pill-rm { appearance: none; border: 0; background: transparent; color: inherit; width: 22px; height: 22px; padding: 0; margin-left: 2px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.78; flex: 0 0 auto }
#uhub-beta-viewer .bv-pill-rm:hover { opacity: 1; background: rgba(9, 30, 66, 0.14) }
#uhub-beta-viewer .bv-pill.bv-pill-b .bv-pill-rm:hover { background: rgba(255, 255, 255, 0.22) }
#uhub-beta-viewer .bv-curtain-line { position: absolute; top: 0; bottom: 0; left: var(--bv-split, 50%); width: 2px; background: var(--uhub-accent); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.75); pointer-events: none; z-index: 6 }
#uhub-beta-viewer .bv-curtain-knob { position: sticky; top: 46vh; transform: translate(-50%, -50%); width: 34px; height: 34px; border-radius: 50%; background: var(--uhub-accent); color: #ffffff; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; cursor: ew-resize; pointer-events: auto }
#uhub-beta-viewer .bv-curtain-knob:hover, #uhub-beta-viewer .bv-curtain-knob:focus-visible { background: var(--uhub-accent-hover); outline: 2px solid #4c9aff; outline-offset: 2px }
/* Modo 3: Lado a lado sincronizado */
#uhub-beta-viewer .bv-sbs-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; height: 100%; min-height: 0 }
#uhub-beta-viewer .bv-sbs-pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: transparent; border: 1px solid var(--uhub-border); border-radius: 4px; overflow: hidden }
#uhub-beta-viewer .bv-sbs-head { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; background: var(--uhub-bg-subtle); border-bottom: 1px solid var(--uhub-border); font-size: 12px }
#uhub-beta-viewer .bv-sbs-head strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #172b4d; min-width: 0; flex: 1 1 auto }
#uhub-beta-viewer .bv-sbs-head-r { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto }
#uhub-beta-viewer .bv-sbs-rm { appearance: none; border: 1px solid var(--uhub-border); background: var(--uhub-bg); color: #42526e; width: 20px; height: 20px; padding: 0; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer }
#uhub-beta-viewer .bv-sbs-rm:hover { background: #ffebe6; border-color: #ffbdad; color: #bf2600 }
#uhub-beta-viewer .bv-sbs-scroll { flex: 1 1 auto; overflow: auto; padding: 14px; text-align: center; background: rgba(0, 0, 0, 0.35) }
#uhub-beta-viewer.bv-light-bg .bv-sbs-scroll { background: rgba(255, 255, 255, 0.45) }
#uhub-beta-viewer .bv-sbs-scroll { overscroll-behavior: contain; scroll-behavior: auto !important }
#uhub-beta-viewer .bv-sbs-scroll img { will-change: transform; transform: translateZ(0) }
#uhub-beta-viewer:not(.bv-light-bg) .bv-sbs-scroll img { display: inline-block; max-width: none; height: auto; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55); background: repeating-conic-gradient(#262626 0% 25%, #1a1a1a 0% 50%) 50% / 16px 16px }
#uhub-beta-viewer.bv-light-bg .bv-sbs-scroll img { display: inline-block; max-width: none; height: auto; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16); background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px }
/* Modo 4: Alternar (Blink test) */
#uhub-beta-viewer .bv-flip-wrap { margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100% }
#uhub-beta-viewer:not(.bv-light-bg) .bv-flip-stage { position: relative; cursor: pointer; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55); background: repeating-conic-gradient(#262626 0% 25%, #1a1a1a 0% 50%) 50% / 16px 16px }
#uhub-beta-viewer.bv-light-bg .bv-flip-stage { position: relative; cursor: pointer; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16); background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px }
#uhub-beta-viewer .bv-flip-stage img { display: block; max-width: none; height: auto }
#uhub-beta-viewer .bv-flip-stage img[hidden] { display: none !important }
#uhub-beta-viewer .bv-flip-banner { position: sticky; top: 10px; z-index: 5; margin-bottom: -34px; pointer-events: none; align-self: stretch; box-sizing: border-box; min-width: max-content; display: flex; justify-content: flex-start; padding: 0 12px }
#uhub-beta-viewer .bv-flip-banner .bv-pill { max-width: none; flex: 0 0 auto }
#uhub-beta-viewer .bv-flip-banner .bv-pill > span { overflow: visible; text-overflow: clip }
/* Faixa inferior de thumbnails no visualizador Beta */
#uhub-beta-viewer .bv-strip { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; gap: 14px; padding: 8px 16px; background: var(--uhub-bg); border-top: 1px solid var(--uhub-border); box-sizing: border-box; min-height: 76px; box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.08) }
#uhub-beta-viewer .bv-strip[hidden] { display: none !important }
#uhub-beta-viewer .bv-strip-info { flex: 0 0 auto; display: flex; flex-direction: column; gap: 2px; max-width: 170px }
#uhub-beta-viewer .bv-strip-info strong { font-size: 11.5px; font-weight: 600; color: #172b4d }
#uhub-beta-viewer .bv-strip-info span { font-size: 11px; color: var(--uhub-text-muted); line-height: 1.3 }
#uhub-beta-viewer .bv-strip-list { flex: 0 1 auto; max-width: calc(100% - 190px); display: flex; align-items: stretch; gap: 8px; overflow-x: auto; padding: 2px 0; min-width: 0 }
#uhub-beta-viewer .bv-strip-item { flex: 0 0 auto; width: 76px; position: relative; display: flex; flex-direction: column; border: 1px solid var(--uhub-border); border-radius: 4px; background: var(--uhub-bg-subtle); overflow: hidden; cursor: pointer; transition: border-color 0.12s ease, box-shadow 0.12s ease }
#uhub-beta-viewer .bv-strip-item:hover { border-color: #b3d4ff; background: #f4f5f7 }
#uhub-beta-viewer .bv-strip-item.bv-strip-active { border-color: var(--uhub-accent); box-shadow: 0 0 0 1px var(--uhub-accent); background: #deebff }
#uhub-beta-viewer .bv-strip-thumb { width: 100%; height: 42px; display: flex; align-items: center; justify-content: center; background: #ffffff; overflow: hidden }
#uhub-beta-viewer .bv-strip-thumb img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block }
#uhub-beta-viewer .bv-strip-chk { position: absolute; top: 3px; left: 3px; z-index: 2; width: 18px; height: 18px; border-radius: 3px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 1px 2px rgba(9, 30, 66, 0.25); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin: 0 }
#uhub-beta-viewer .bv-strip-chk input { width: 13px; height: 13px; margin: 0; accent-color: var(--uhub-accent); cursor: pointer }
#uhub-beta-viewer .bv-strip-chk input:disabled { cursor: not-allowed }
#uhub-beta-viewer .bv-strip-slot { position: absolute; top: 3px; right: 3px; z-index: 2; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 3px; background: var(--uhub-accent); color: #ffffff; font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; pointer-events: none }
#uhub-beta-viewer .bv-strip-name { font-size: 10.5px; color: #42526e; padding: 3px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; border-top: 1px solid rgba(9, 30, 66, 0.06) }
#uhub-beta-viewer .bv-strip-zip { border-style: dashed }
#uhub-beta-viewer .bv-strip-zip[aria-expanded="true"] { border-color: var(--uhub-accent) }
#uhub-beta-viewer .bv-strip-zip:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#uhub-beta-viewer .bv-strip-zip .bv-strip-thumb { position: relative }
#uhub-beta-viewer .bv-strip-zipbadge { position: absolute; right: 3px; bottom: 3px; height: 16px; padding: 0 5px; border-radius: 3px; background: #42526e; color: #ffffff; font-size: 10px; font-weight: 700; line-height: 16px; pointer-events: none }
/* Zips na faixa: cada zip ganha uma cor, e as imagens de dentro levam a mesma cor no topo */
#uhub-beta-viewer .bv-strip-zip { border-style: solid; border-color: var(--bv-zc, var(--uhub-accent)); border-top-width: 3px; margin-left: 12px }
#uhub-beta-viewer .bv-strip-zipbadge { background: var(--bv-zc, #42526e) }
#uhub-beta-viewer .bv-strip-child { border-top: 3px solid var(--bv-zc, var(--uhub-accent)) }
#uhub-beta-viewer .bv-strip-child-last { margin-right: 12px }
/* Zip aberto = secao recolhivel: cabecalho colorido a esquerda e as imagens de dentro numa caixa so */
#uhub-beta-viewer .bv-strip-sec { flex: 0 0 auto; display: flex; align-items: stretch; gap: 8px; padding: 4px 8px 4px 4px; margin: 0 4px; border: 1px solid var(--bv-zc, var(--uhub-accent)); border-radius: 6px; background: color-mix(in srgb, var(--bv-zc, #0052cc) 8%, #ffffff) }
#uhub-beta-viewer .bv-strip-sechead { appearance: none; flex: 0 0 auto; width: 96px; display: flex; flex-direction: column; justify-content: center; gap: 3px; text-align: left; padding: 4px 8px; border: 0; border-radius: 4px; background: var(--bv-zc, var(--uhub-accent)); color: #ffffff; cursor: pointer; font: inherit; font-size: 11px; line-height: 1.25 }
#uhub-beta-viewer .bv-strip-sechead:hover { filter: brightness(1.1) }
#uhub-beta-viewer .bv-strip-sechead:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#uhub-beta-viewer .bv-strip-sechead-top { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em }
#uhub-beta-viewer .bv-strip-sechead-name { font-weight: 600; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow-wrap: anywhere }
#uhub-beta-viewer .bv-strip-sechead-count { font-size: 10px; opacity: 0.9 }
#uhub-beta-viewer .bv-meta strong { font-weight: 700 }
#uhub-beta-viewer .bv-strip-sec .bv-strip-child { border-top-width: 1px; margin: 0 }
#uhub-beta-viewer .bv-strip-sec .bv-strip-child-last { margin-right: 0 }
/* Altura FIXA da barra de thumbs: nao muda ao abrir/recolher zips; os cartoes se esticam para preencher */
#uhub-beta-viewer .bv-strip { height: 96px; min-height: 96px; max-height: 96px }
#uhub-beta-viewer .bv-strip-list { height: 80px; max-height: 80px; overflow-y: hidden; align-items: stretch }
#uhub-beta-viewer .bv-strip-list > .bv-strip-item, #uhub-beta-viewer .bv-strip-list > .bv-strip-sec { align-self: stretch; box-sizing: border-box; min-height: 0 }
#uhub-beta-viewer .bv-strip-item .bv-strip-thumb { flex: 1 1 42px; height: auto; min-height: 0 }
#uhub-beta-viewer .bv-strip-sec .bv-strip-item { align-self: stretch; min-height: 0 }
#uhub-beta-viewer .bv-strip-sechead { min-height: 0; overflow: hidden }
/* Versoes agrupadas */
html.uhub-att #attachment_thumbnails > li.uhub-attg { list-style: none; display: flex; flex-direction: column; gap: 6px; flex: 0 1 auto; min-width: 0; max-width: 100%; margin: 0; padding: 0; isolation: isolate }
#attachment_thumbnails .uhub-attg-row { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; min-width: 0 }
#attachment_thumbnails .uhub-attg-row[hidden] { display: none !important }
#attachment_thumbnails .uhub-attg-label { font: 600 11px/1.2 var(--uhub-font, inherit); text-transform: uppercase; letter-spacing: 0.06em; color: var(--uhub-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
#attachment_thumbnails .uhub-attg-label.uhub-attg-cur { color: #044099 }
/* A: pilha */
#attachment_thumbnails .uhub-att-stackfx { background: #fff; outline: 1px solid #dfe1e6; border-radius: 3px }
#attachment_thumbnails .uhub-att-stackfx::before, #attachment_thumbnails .uhub-att-stackfx::after { content: "" !important; display: block !important; position: absolute; inset: 0; width: auto !important; height: auto !important; border: 1px solid #dfe1e6; border-radius: 3px; background: #fff; z-index: -1; pointer-events: none }
#attachment_thumbnails .uhub-att-stackfx::before { transform: translate(4px, 4px) }
#attachment_thumbnails .uhub-att-stackfx::after { transform: translate(8px, 8px); opacity: 0.7 }
#attachment_thumbnails .uhub-attg-current { margin-bottom: 6px }
#attachment_thumbnails .uhub-attg-chip { align-self: flex-start; appearance: none; border: 1px solid #dfe1e6; background: #fff; color: #044099; font: 600 12px/1 inherit; font-size: 12px; padding: 5px 9px; border-radius: 12px; cursor: pointer; margin-top: 4px }
#attachment_thumbnails .uhub-attg-chip:hover { background: #deebff }
#attachment_thumbnails .uhub-attg-chip:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#attachment_thumbnails .uhub-attg-older { padding: 8px; border: 1px dashed #c1c7d0; border-radius: 6px }
#attachment_thumbnails .uhub-att-older { opacity: 0.7; transition: opacity 0.12s }
#attachment_thumbnails .uhub-att-older:hover { opacity: 1 }
/* B: moldura */
#attachment_thumbnails .uhub-attg-frame { border: 1px solid #c1c7d0 !important; border-radius: 8px; padding: 8px 10px 12px !important; gap: 8px !important }
#attachment_thumbnails .uhub-attg-head { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; min-width: 0 }
#attachment_thumbnails .uhub-attg-head strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0 }
#attachment_thumbnails .uhub-attg-head span { color: var(--uhub-text-muted); white-space: nowrap }
#attachment_thumbnails .uhub-attg-vers { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; min-width: 0 }
#attachment_thumbnails .uhub-attg-ver { display: flex; flex-direction: column; gap: 6px; min-width: 0 }
#attachment_thumbnails .uhub-attg-ver + .uhub-attg-ver { padding-left: 14px; border-left: 1px solid #dfe1e6 }
/* Tag de versao e selo "novo" sobre a miniatura */
html.uhub-att #attachment_thumbnails .attachment-thumb { position: relative }
#attachment_thumbnails .uhub-att-vtag { position: absolute; left: 6px; bottom: 6px; font: 600 10.5px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; letter-spacing: 0.02em; padding: 3px 5px; border-radius: 3px; background: rgba(23, 43, 77, 0.78); color: #fff; pointer-events: none; z-index: 2; white-space: nowrap }
#attachment_thumbnails .uhub-att-new { position: absolute; left: 34px; top: 10px; display: inline-flex; align-items: center; gap: 4px; font: 600 9.5px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 6px 3px 5px; border-radius: 9px; background: rgba(255, 255, 255, 0.92); color: #006644; box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); pointer-events: none; z-index: 2 }
#attachment_thumbnails .uhub-att-new::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #00875a }
/* Previa de anexo ao passar o mouse */
#uhub-att-pv { position: fixed; z-index: 2147483000; width: 260px; background: #fff; border: 1px solid #dfe1e6; border-radius: 6px; box-shadow: 0 8px 24px rgba(9, 30, 66, 0.28); padding: 6px; pointer-events: none; font: 12px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #5e6c84 }
#uhub-att-pv.pv-clickable { pointer-events: auto }
#uhub-att-pv.pv-clickable .pv-img { cursor: pointer }
#uhub-att-pv.pv-clickable .pv-img:hover { box-shadow: inset 0 0 0 2px var(--uhub-accent) }
#uhub-att-pv[hidden] { display: none !important }
#uhub-att-pv .pv-img { display: flex; align-items: center; justify-content: center; min-height: 60px; max-height: 220px; background: #f4f5f7; border-radius: 3px; overflow: hidden }
#uhub-att-pv .pv-img img { display: block; max-width: 100%; max-height: 220px; object-fit: contain }
#uhub-att-pv.pv-noimg .pv-img { display: none }
#uhub-att-pv .pv-meta { display: flex; justify-content: space-between; gap: 8px; padding: 5px 2px 0 }
#uhub-att-pv .pv-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; color: #172b4d }
#uhub-att-pv .pv-size { white-space: nowrap; font-variant-numeric: tabular-nums }
/* Prazo no campo Datas */
.uhub-due { display: inline-flex !important; align-items: center; flex: 0 0 auto !important; align-self: center !important; width: max-content !important; max-width: 100%; box-sizing: border-box; margin-left: 0; font: 600 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 3px 7px; border-radius: 10px; white-space: nowrap; vertical-align: 1px }
/* data e etiqueta na mesma linha; a etiqueta so ocupa a largura do texto */
html.uhub-wide dd.uhub-due-dd { flex-direction: row !important; flex-wrap: wrap !important; align-items: center !important; justify-content: flex-start !important; column-gap: 8px; row-gap: 4px }
html.uhub-wide dd.uhub-due-dd > #due-date { width: auto !important; flex: 0 1 auto !important }
.uhub-due-ok { background: #e3fcef; color: #006644 }
.uhub-due-soon { background: #fff7d6; color: #7f5f01 }
.uhub-due-late { background: #ffebe6; color: #bf2600 }
#due-date.active + .uhub-due { display: none }
/* Ajustes: botoes segmentados */
#uhub-settings-panel .sp-seg { display: flex; border: 1px solid var(--uhub-border); border-radius: 4px; overflow: hidden }
#uhub-settings-panel .sp-seg button { flex: 1 1 0; appearance: none; border: 0; background: #fff; color: #172b4d; font: inherit; font-size: 12px; padding: 5px 6px; cursor: pointer }
#uhub-settings-panel .sp-seg button + button { border-left: 1px solid var(--uhub-border) }
#uhub-settings-panel .sp-seg button[aria-pressed="true"] { background: var(--uhub-accent); color: #fff }
#uhub-settings-panel .sp-seg button:disabled { opacity: 0.45; cursor: default }
#uhub-settings-panel .sp-seg button:focus-visible { outline: 2px solid #4c9aff; outline-offset: -2px }
/* Conferencia antes de enviar */
#uhub-sendcheck { margin: 8px 0; padding: 10px 12px; border-radius: 4px; background: #fffae6; border: 1px solid #ffe380; color: #172b4d; font-size: 13px; line-height: 1.4 }
#uhub-sendcheck .sc-head { font-weight: 600; margin-bottom: 6px; color: #974f0c }
#uhub-sendcheck .sc-list { display: flex; flex-direction: column; gap: 8px }
#uhub-sendcheck .sc-item { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px }
#uhub-sendcheck .sc-msg { flex: 1 1 220px; min-width: 0; overflow-wrap: anywhere }
#uhub-sendcheck .sc-acts { display: flex; flex-wrap: wrap; gap: 6px }
#uhub-sendcheck .sc-foot { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(9, 30, 66, 0.1) }
#uhub-sendcheck .sc-btn { appearance: none; border: 0; height: 26px; padding: 0 10px; border-radius: 3px; font: inherit; font-size: 12px; cursor: pointer; background: rgba(9, 30, 66, 0.08); color: #172b4d; white-space: nowrap }
#uhub-sendcheck .sc-btn:hover { background: rgba(9, 30, 66, 0.14) }
#uhub-sendcheck .sc-btn.sc-fix, #uhub-sendcheck .sc-btn.sc-primary { background: #044099; color: #fff }
#uhub-sendcheck .sc-btn.sc-fix:hover, #uhub-sendcheck .sc-btn.sc-primary:hover { background: #0052cc }
#uhub-sendcheck .sc-btn:disabled { opacity: 0.5; cursor: default }
#uhub-sendcheck .sc-btn:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#uhub-sendcheck .sc-back { background: transparent }
/* Modo revisao: so anexos (maiores) + comentarios */
#uhub-review-chip { appearance: none; border: 0; display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px 0 10px; margin-left: 10px; border-radius: 11px; background: #deebff; color: #044099; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; vertical-align: middle }
#uhub-review-chip { transform: translateY(var(--uhub-chip-dy, 0px)); white-space: nowrap }
#uhub-review-chip:hover { background: #cce0ff }
/* Faixa do modo revisao: Prioridade · Responsavel · Solicitante · Ficar pronto */
#uhub-review-meta { display: none }
html.uhub-wide #uhub-review-meta:not([hidden]) { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; grid-column: 1 / -1; min-width: 0; margin: 0 0 16px; padding: 9px 48px 9px 14px; position: relative; background: var(--uhub-bg-subtle); border: 1px solid var(--uhub-border); border-radius: 6px; box-sizing: border-box; font-size: 14px; line-height: 20px; color: #172b4d; container: uhubrm / inline-size }
html.uhub-wide.uhub-cstack #uhub-review-meta { order: -1 }
#uhub-review-meta .rm-item { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; white-space: nowrap }
#uhub-review-meta .rm-label { flex: 0 0 auto; font-size: 12px; color: var(--uhub-text-muted) }
@container uhubrm (max-width: 935px) {
  #uhub-review-meta .rm-item { flex-direction: column; align-items: flex-start; gap: 8px }
  #uhub-review-meta .rm-label { font-size: 11px; font-weight: 600; line-height: 1 }
}
#uhub-review-meta .rm-val { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px; min-width: 0 }
#uhub-review-meta .rm-val > * { flex-shrink: 0; max-width: 100% }
#uhub-review-meta .rm-item[hidden] { display: none }
#uhub-review-meta .rm-val > .editable-field:not(.active) { display: inline-flex; align-items: center; gap: 6px; min-width: 0; white-space: nowrap }
/* Edicao inline na faixa: cada campo tem um "espaco" reservado ja no estado fechado (largura minima abaixo) e, ao abrir, o item mantem EXATAMENTE a medida do valor fechado (--rm-w/--rm-h, medidas por ResizeObserver). O campo aberto preenche esse espaco; os botoes salvar/cancelar ficam no lugar nativo do Jira (abaixo, a direita). Nada se move e nada some. */
#uhub-review-meta .rm-val { position: relative }
#uhub-review-meta .rm-priority .rm-val { min-width: 200px }
#uhub-review-meta .rm-assignee .rm-val, #uhub-review-meta .rm-reporter .rm-val { min-width: 200px }
#uhub-review-meta .rm-val:has(> .active) { flex-wrap: nowrap; width: var(--rm-w, auto); min-height: var(--rm-h, 0); z-index: 50 }
#uhub-review-meta .rm-val > .active { flex: 1 1 100%; width: 100%; min-width: 0; margin: 0 !important; padding: 0 !important; background: transparent !important; border: 0 !important }
#uhub-review-meta .active form.aui { margin: 0 !important } /* o Jira alarga o formulario (-5px/-30px): na faixa ele fica exatamente no espaco do campo */
#uhub-review-meta .rm-due #due-date { min-width: 100px }
#uhub-review-meta .rm-due .rm-val > .active { flex: 0 0 100px; width: 100px; min-width: 0 }
#uhub-review-meta .rm-due .active .text { width: 100% !important; min-width: 0; box-sizing: border-box }
#uhub-review-meta .rm-val img { flex: 0 0 auto; vertical-align: middle }
#uhub-review-meta .user-hover { display: inline-flex; align-items: center; gap: 6px; min-width: 0 }
#uhub-review-meta .aui-avatar { flex: 0 0 auto }
#uhub-meta-info-btn { appearance: none; border: 1px solid transparent; background: transparent; color: var(--uhub-text-muted); width: 26px; height: 26px; padding: 0; margin: 0; position: absolute; top: 9px; right: 14px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: 0 0 auto; transition: background 0.1s ease, color 0.1s ease }
#uhub-meta-info-btn:hover { background: rgba(9, 30, 66, 0.08); color: #172b4d }
#uhub-meta-info-btn.uhub-active { background: #deebff; color: #044099; border-color: rgba(4, 64, 153, 0.25) }
#uhub-meta-info-btn:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#uhub-meta-info-btn[hidden] { display: none !important }
#uhub-review-chip:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
html:not(.uhub-review) #uhub-review-chip { display: none !important }
html.uhub-wide.uhub-review .issue-main-column > *:not(#addcomment):not(:has(#addcomment)), html.uhub-wide.uhub-review:not(.uhub-meta-open) #viewissuesidebar { display: none !important }
html.uhub-wide.uhub-review .aui-group.issue-body { grid-template-columns: minmax(0, 1fr) !important; row-gap: 0 !important }
html.uhub-wide.uhub-review .issue-main-column { min-height: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important }
html.uhub-wide.uhub-review .aui-group.issue-body > #attachmentmodule { grid-column: 1 / -1 !important; margin-top: 0 !important; padding-top: 0 !important; border-top: 0 !important }

/* Telas estreitas: gaveta O conteudo (titulo, toolbar, anexos) usa a largura toda; o painel, quando aberto, cobre a pagina como uma gaveta. */
html.uhub-wide.uhub-narrow header#stalker { margin-right: calc(var(--uhub-col-gap) + var(--uhub-stalker-fix, 0px)) !important }
html.uhub-wide.uhub-narrow .aui-group.issue-body > #attachmentmodule { margin-right: 0 !important }
/* Telas estreitas (gaveta ou empilhar): a toolbar da direita (Email/Exportar) quebra linha em vez de vazar pela esquerda. */
html.uhub-wide.uhub-narrow header#stalker.issue-header, html.uhub-wide.uhub-cstack header#stalker.issue-header { padding-right: 0 !important }
html.uhub-wide header#stalker .aui-toolbar2-inner { display: flex !important; flex-wrap: wrap; align-items: center; gap: 0 10px }
/* Lembrete de status: halo azul suave pulsando (~10 s); estatico se o sistema pede menos movimento */
#opsbar-opsbar-transitions.uhub-status-nudge > .aui-button { animation: uhub-nudge 1.6s ease-in-out 6 }
@keyframes uhub-nudge { 0%, 100% { box-shadow: 0 0 0 0 rgba(0, 82, 204, 0) } 50% { box-shadow: 0 0 0 4px rgba(0, 82, 204, 0.24) } }
@media (prefers-reduced-motion: reduce) { #opsbar-opsbar-transitions.uhub-status-nudge > .aui-button { animation: none; box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.24) } }
html.uhub-wide header#stalker .aui-toolbar2-inner::before, html.uhub-wide header#stalker .aui-toolbar2-inner::after { display: none !important }
html.uhub-wide header#stalker .aui-toolbar2-primary, html.uhub-wide header#stalker .aui-toolbar2-secondary { display: contents !important }
html.uhub-wide header#stalker .aui-toolbar2-primary > li, html.uhub-wide header#stalker .aui-toolbar2-secondary > * { float: none !important; margin: 0 !important }
html.uhub-wide header#stalker .aui-toolbar2-primary > li:not(:has(*)) { display: none !important }
html.uhub-wide header#stalker .aui-page-header-main { min-width: 0; flex: 1 1 auto }
html.uhub-wide header#stalker .aui-page-header-actions:not(:has(#issue-header-pager *)) { display: none !important }
@media (max-width: 600px) { html.uhub-wide header#stalker #summary-val :is(h1, h2) { font-size: 20px; line-height: 1.25 } html.uhub-wide header#stalker .aui-page-header-image .aui-avatar, html.uhub-wide header#stalker .aui-page-header-image .aui-avatar-inner, html.uhub-wide header#stalker .aui-page-header-image img { width: 32px !important; height: 32px !important } html.uhub-wide header#stalker .aui-page-header-image { width: 32px } html.uhub-wide header#stalker .aui-page-header-main { padding-left: 8px } }
@media (max-width: 480px) { html.uhub-wide header#stalker .aui-page-header-image { display: none } html.uhub-wide header#stalker .aui-page-header-main { padding-left: 0 } }
/* Telas estreitas: empilhar Uma coluna so: conteudo, metadados, anexos e, por ultimo, os comentarios (titulo, campo de comentario e lista) como secao normal. */
html.uhub-wide.uhub-cstack header#stalker, html.uhub-wide.uhub-cstack .issue-body-content { margin-right: calc(var(--uhub-col-gap) + var(--uhub-body-fix, 0px)) !important }
html.uhub-wide.uhub-cstack header#stalker { margin-right: calc(var(--uhub-col-gap) + var(--uhub-stalker-fix, 0px)) !important }
html.uhub-wide.uhub-cstack .issue-body-content { padding-bottom: 24px !important }
html.uhub-wide.uhub-cstack .aui-group.issue-body { grid-template-columns: minmax(0, 1fr) !important; row-gap: 0 !important }
html.uhub-wide.uhub-cstack .issue-main-column, html.uhub-wide.uhub-cstack #uhub-sidebar { display: contents !important }
html.uhub-wide.uhub-cstack .issue-main-column > * { grid-column: 1 / -1; min-width: 0 }
html.uhub-wide.uhub-cstack .aui-group.issue-body > #attachmentmodule { grid-column: 1 / -1 !important; order: 2; margin-right: 0 !important }
html.uhub-wide.uhub-cstack #uhub-sidebar-header { order: 3; grid-column: 1 / -1; min-width: 0; margin-top: 24px; border-radius: 4px 4px 0 0; cursor: default }
html.uhub-wide.uhub-cstack #uhub-collapse-btn { display: none !important }
html.uhub-wide.uhub-cstack #addcomment.uhub-pinned-footer { order: 4; grid-column: 1 / -1; position: relative !important; top: auto !important; right: auto !important; width: auto !important; max-width: none !important; max-height: none; overflow: visible; min-width: 0; display: block !important; border: 1px solid var(--uhub-border) !important; border-top: 0 !important; border-bottom: 0 !important; box-shadow: none !important }
html.uhub-wide.uhub-cstack #uhub-sidebar-scroll { order: 5; grid-column: 1 / -1; min-width: 0; display: block !important; overflow: visible !important; padding: 4px 14px 12px !important; background: var(--uhub-bg); border: 1px solid var(--uhub-border); border-radius: 0 0 4px 4px }
/* Abas da atividade: todas numa linha so sempre que cabem; se a ordenacao nao couber ao lado, ela desce
   (a direita) em vez de espremer as abas em duas linhas. As abas so quebram quando nem sozinhas cabem. */
#uhub-sidebar-scroll .tabwrap { flex-wrap: wrap; row-gap: 2px }
#uhub-sidebar-scroll .tabwrap > .tabs-menu { flex: 0 1 auto; max-width: 100%; flex-wrap: wrap; padding-right: 0 !important }
#uhub-sidebar-scroll .tabwrap > .sortwrap { margin-left: auto }
/* Ordem dos comentarios: so o icone, na mesma linha das abas e alinhado a direita */
#uhub-sidebar-scroll .tabwrap { display: flex !important; flex-wrap: nowrap; align-items: center }
#uhub-sidebar-scroll .tabwrap > .tabs-menu { flex: 1 1 auto; min-width: 0 }
#uhub-sidebar-scroll .tabwrap > .sortwrap { flex: 0 0 auto; margin: 0 0 0 4px; padding: 0 }
#uhub-sidebar-scroll .sortwrap .activity-tab-sort-label { display: none !important }
#uhub-sidebar-scroll .sortwrap #sort-button { margin: 0; padding: 0 6px; min-width: 0 }
/* painel mais estreito: espacamento compacto entre as abas (cabem numa linha antes de precisar quebrar) */
#uhub-sidebar-scroll { container-type: inline-size }
@container (max-width: 580px) { #uhub-sidebar-scroll #issue-tabs > li > a { padding-left: 6px !important; padding-right: 6px !important } }
@container (max-width: 500px) { #uhub-sidebar-scroll #issue-tabs > li > a { padding-left: 4px !important; padding-right: 4px !important } }
@container (max-width: 440px) { #uhub-sidebar-scroll #issue-tabs > li > a { font-size: 13px !important; padding-left: 3px !important; padding-right: 3px !important } }
/* Selecao de anexos: visivel no hover ou quando ja ha ao menos 1 anexo selecionado */
html.uhub-att #attachment_thumbnails .uhub-att-sel { position: absolute; top: 5px; left: 5px; z-index: 3; box-sizing: border-box; width: 24px; height: 24px; margin: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 1px 3px rgba(9, 30, 66, 0.25); cursor: pointer; transition: opacity 0.12s ease, background 0.12s ease }
html.uhub-att:not(.uhub-att-selecting) #attachment_thumbnails li.attachment-content:not(:hover):not(:focus-within) .uhub-att-sel { opacity: 0; pointer-events: none }
/* Citar, excluir e visualizar (cantos do anexo): so aparecem no hover do proprio anexo; com algum anexo selecionado, ficam visiveis em todos */
html.uhub-att #attachmentmodule #attachment_thumbnails :is(.attachment-delete, .uhub-att-cite, .uhub-att-inspect, .uhub-att-nodel-trash) { transition: opacity 0.12s ease }
html.uhub-att:not(.uhub-att-selecting) #attachmentmodule #attachment_thumbnails li.attachment-content:not(:hover):not(:focus-within) :is(.attachment-delete, .uhub-att-cite, .uhub-att-inspect, .uhub-att-nodel-trash) { opacity: 0 !important; pointer-events: none !important }
html.uhub-att #attachment_thumbnails .uhub-att-sel:hover { background: #deebff }
html.uhub-att #attachment_thumbnails .uhub-att-sel input, #attachmentmodule_heading .uhub-att-selall input { width: 14px; height: 14px; margin: 0; accent-color: #044099; cursor: pointer }
html.uhub-att #attachment_thumbnails .uhub-att-sel:focus-within { outline: 2px solid #4c9aff; outline-offset: 1px }
/* anexo selecionado: moldura na cor de destaque */
html.uhub-att #attachment_thumbnails li.uhub-att-selected .attachment-thumb { box-shadow: 0 0 0 2px #044099 !important; border-color: #044099 !important }
html.uhub-att #attachment_thumbnails li.uhub-att-selected .uhub-att-sel { background: #deebff }
html:not(.uhub-att) .uhub-att-sel, html:not(.uhub-att) .uhub-att-selbar { display: none !important }
/* Barra de acoes da selecao (cabecalho de Anexos): cores distintas e coesas no repouso, atenuadas no hover */
#attachmentmodule_heading .uhub-att-selbar { display: inline-flex; align-items: center; gap: 4px; height: 24px; margin-right: 10px; padding-right: 10px; border-right: 1px solid var(--uhub-border); font-size: 12px; color: #172b4d; transform: translateY(var(--uhub-att-dy, -3px)) }
#attachmentmodule_heading .uhub-att-selbar[hidden] { display: none !important }
#attachmentmodule_heading .uhub-att-selall { width: 26px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; cursor: pointer; margin: 0 }
#attachmentmodule_heading .uhub-att-selall:hover { background: rgba(9, 30, 66, 0.08) }
#attachmentmodule_heading .uhub-att-selcount { font-weight: 600; margin-right: 4px; white-space: nowrap; font-variant-numeric: tabular-nums }
#attachmentmodule_heading .uhub-att-selbtn { appearance: none; border: 0; height: 24px; padding: 0 8px 0 6px; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.12s ease, color 0.12s ease }
#attachmentmodule_heading .uhub-att-selbtn svg { width: 16px; height: 16px }
#attachmentmodule_heading .uhub-att-selbtn .aui-icon { color: inherit; margin: 0 }
#attachmentmodule_heading .uhub-att-selcmp:not(:disabled) { background: #eae6ff; color: #403294 }
#attachmentmodule_heading .uhub-att-selcmp:hover:not(:disabled) { background: #f3f0ff; color: #5243aa }
#attachmentmodule_heading .uhub-att-selcite:not(:disabled) { background: #deebff; color: #0052cc }
#attachmentmodule_heading .uhub-att-selcite:hover:not(:disabled) { background: #e9f2ff; color: #0065ff }
#attachmentmodule_heading .uhub-att-seldel:not(:disabled) { background: #ffebe6; color: #bf2600 }
#attachmentmodule_heading .uhub-att-seldel:hover:not(:disabled) { background: #fff5f3; color: #de350b }
#attachmentmodule_heading .uhub-att-selbtn:disabled { opacity: 0.45; cursor: not-allowed; background: rgba(9, 30, 66, 0.04); color: #42526e }
#attachmentmodule_heading .uhub-att-selbtn:focus-visible, #attachmentmodule_heading .uhub-att-selclear:focus-visible { outline: 2px solid #4c9aff; outline-offset: 1px }
#attachmentmodule_heading .uhub-att-selclear { appearance: none; border: 0; background: transparent; width: 26px; height: 24px; padding: 0; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; color: var(--ds-icon, #42526e); cursor: pointer }
#attachmentmodule_heading .uhub-att-selclear:hover { background: rgba(9, 30, 66, 0.08); color: #172b4d }
#uhub-confirm .uc-list { margin: 4px 0 8px; padding: 6px 10px 6px 26px; max-height: 140px; overflow: auto; background: #f4f5f7; border-radius: 4px; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere }
#uhub-confirm .uc-list .uc-more { list-style: none; margin-left: -16px; color: var(--uhub-text-muted) }
/* Janela de confirmacao (excluir todos os anexos) */
#uhub-confirm-backdrop { position: fixed; inset: 0; background: rgba(9, 30, 66, 0.54); z-index: 2147483000; display: flex; align-items: center; justify-content: center }
#uhub-confirm { background: #fff; border-radius: 6px; box-shadow: 0 8px 32px rgba(9, 30, 66, 0.35); width: 420px; max-width: calc(100vw - 32px); padding: 20px 24px; font-size: 14px; color: #172b4d; line-height: 1.45 }
#uhub-confirm h2 { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #bf2600 }
#uhub-confirm .uc-msg { margin: 0 0 6px }
#uhub-confirm .uc-sub { margin: 0; color: var(--uhub-text-muted); font-size: 12px }
#uhub-confirm .uc-progress { margin-top: 10px; font-size: 13px; min-height: 18px }
#uhub-confirm .uc-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px }
#uhub-confirm .uc-actions button { appearance: none; border: 1px solid transparent; border-radius: 4px; padding: 7px 14px; font: inherit; font-size: 14px; cursor: pointer }
#uhub-confirm .uc-cancel { background: #f4f5f7; color: #172b4d }
#uhub-confirm .uc-cancel:hover { background: #ebecf0 }
#uhub-confirm .uc-ok { background: #de350b; color: #fff; font-weight: 600 }
#uhub-confirm .uc-ok:hover { background: #bf2600 }
#uhub-confirm button:disabled { opacity: 0.5; cursor: default }
/* Descricao: texto sempre em 14px (leitura e edicao) */
html.uhub-wide #description-val .user-content-block, html.uhub-wide #description-val .user-content-block *:not(.aui-icon), html.uhub-wide #description-val textarea { font-size: 14px !important }

/* Selo "Aguardando voce" no cabecalho da coluna */
#uhub-waiting { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 600; line-height: 18px; padding: 0 8px; border-radius: 9px; background: rgba(255, 255, 255, 0.2); color: #ffffff }
#uhub-waiting[data-level="warn"] { background: #ffab00; color: #172b4d }
#uhub-waiting[data-level="late"] { background: #de350b; color: #ffffff }
/* Comentario ainda nao lido: faixa vermelha a esquerda ate ser visto */
#uhub-sidebar-scroll .uhub-unread { box-shadow: inset 3px 0 0 #de350b; border-radius: 4px }
/* Indicador de notificacoes na .aui-toolbar2-primary Botao AUI nativo, so icone (sino + ponto de status): ocupa ~32px e nao altera a largura de nenhum outro botao da toolbar. */
#uhub-notify-status_container { margin-left: 0 }
#uhub-notify-status.aui-button { position: relative; display: inline-flex !important; align-items: center; justify-content: center; padding-left: 8px !important; padding-right: 8px !important }
#uhub-notify-status svg { display: block }
#uhub-notify-status[data-on="1"] { color: #36b37e !important }
#uhub-notify-status[data-on="0"] { color: #6b778c !important }
#uhub-notify-pop { position: fixed; top: var(--uhub-np-top, 120px); left: var(--uhub-np-left, 16px); width: 320px; max-width: calc(100vw - 16px); background: var(--uhub-bg); border: 1px solid var(--uhub-border); border-radius: 4px; box-shadow: 0 8px 24px rgba(9,30,66,.25); z-index: max(var(--uhub-z-floor, -100000), calc(var(--uhub-z, 500) + 150)); display: none; font-size: 12px; color: #172b4d; line-height: 1.45 }
#uhub-notify-pop.uhub-open { display: block }
#uhub-notify-pop .np-head { padding: 10px 14px; font-weight: 700; font-size: 13px; border-bottom: 1px solid var(--uhub-border); background: var(--uhub-bg-subtle); border-radius: 4px 4px 0 0 }
#uhub-notify-pop .np-body { padding: 12px 14px }
#uhub-notify-pop .np-row { display: flex; gap: 8px; align-items: baseline; margin-bottom: 6px }
#uhub-notify-pop .np-row b { flex: 0 0 96px; font-weight: 600; color: var(--uhub-text-muted) }
#uhub-notify-pop .np-summary { display: flex; gap: 8px; align-items: center; font-weight: 600; margin-bottom: 10px }
#uhub-notify-pop .np-summary i { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; background: #97a0af }
#uhub-notify-pop[data-state="ok"] .np-summary i { background: #36b37e }
#uhub-notify-pop[data-state="untested"] .np-summary i { background: #ffab00 }
#uhub-notify-pop[data-state="error"] .np-summary i { background: #de350b }
#uhub-notify-pop .np-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px }
#uhub-notify-pop .np-snooze { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--uhub-border) }
#uhub-notify-pop .np-snooze > b { display: block; font-size: 12px; margin-bottom: 6px; color: #172b4d }
#uhub-notify-pop .np-snooze-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center }
#uhub-notify-pop .np-snooze-row button { appearance: none; border: 0; background: rgba(9, 30, 66, 0.06); color: #172b4d; border-radius: 3px; height: 26px; padding: 0 10px; font: inherit; font-size: 12px; cursor: pointer; font-variant-numeric: tabular-nums }
#uhub-notify-pop .np-snooze-row button:hover { background: #deebff; color: #044099 }
#uhub-notify-pop .np-snooze-on { font-size: 12px; color: #044099; font-weight: 600; margin-right: 4px }
#uhub-notify-pop .np-actions button { appearance: none; border: 1px solid var(--uhub-border); background: var(--uhub-bg-subtle); border-radius: 4px; padding: 6px 10px; font-size: 12px; color: #172b4d; cursor: pointer }
#uhub-notify-pop .np-actions button.np-primary { background: var(--uhub-accent); border-color: var(--uhub-accent); color: #fff }
#uhub-notify-pop .np-actions button:hover { filter: brightness(0.96) }
#uhub-notify-pop .np-ask { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--uhub-border) }
#uhub-notify-pop .np-tips { margin: 8px 0 0; padding-left: 16px; color: #42526e }
#uhub-notify-pop .np-tips li { margin-bottom: 4px }
/* Telas pequenas: aperta paddings; a estrategia de 3 colunas continua, nunca vira overlay, mas fica justa (o botao de recolher comentarios ajuda) */
@media (max-width: 720px) { html.uhub-wide .aui-page-panel-inner { padding-left: 8px !important; padding-right: 8px !important } }
`);
  }
  // Helpers de leitura do DOM do Jira
  function getIssueType() {
    const el = q1('#type-val');
    return el ? el.textContent.trim().toLowerCase() : '';
  }
  function isInternalReview() {
    return getIssueType().includes(TARGET_TYPE);
  }
  function getIssueKey() {
    const meta = q1('meta[name="ajs-issue-key"]');
    if (meta) return meta.content;
    const el = q1('#key-val');
    return el ? el.textContent.trim() : null;
  }
  // Icones inline
  const ICON_REFRESH = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.65 2.35A7.958 7.958 0 0 0 8 0C3.58 0 0 3.58 0 8s3.58 8 8 8a7.98 7.98 0 0 0 7.75-6h-2.08A5.98 5.98 0 0 1 8 14a6 6 0 1 1 4.24-10.24L9 7h7V0l-2.35 2.35Z" fill="currentColor"/></svg>';
  const ICON_COLLAPSE = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_EXPAND = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10l5-5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_NAV_EXPAND = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_NAV_COLLAPSE = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_SETTINGS = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="1.3"/><path d="M13 8.5v-1l-1.4-.3a4.4 4.4 0 0 0-.5-1.2l.8-1.2-.7-.7-1.2.8a4.4 4.4 0 0 0-1.2-.5L8.5 3h-1l-.3 1.4a4.4 4.4 0 0 0-1.2.5l-1.2-.8-.7.7.8 1.2a4.4 4.4 0 0 0-.5 1.2L3 7.5v1l1.4.3c.1.4.3.8.5 1.2l-.8 1.2.7.7 1.2-.8c.4.2.8.4 1.2.5l.3 1.4h1l.3-1.4c.4-.1.8-.3 1.2-.5l1.2.8.7-.7-.8-1.2c.2-.4.4-.8.5-1.2L13 8.5Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  const ICON_CLOSE = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  function buildSidebar() {
    if (gid('uhub-sidebar')) return;
    const activityModule = gid('activitymodule');
    if (!activityModule) return;
    const sidebar = mk('div');
    sidebar.id = 'uhub-sidebar';
    const header = mk('div');
    header.id = 'uhub-sidebar-header';
    const title = mk('span');
    title.id = 'uhub-sidebar-title';
    title.textContent = 'Comentários';
    header.appendChild(title);
    const collapseBtn = mk('button');
    collapseBtn.id = 'uhub-collapse-btn';
    collapseBtn.title = 'Minimizar painel de comentários';
    collapseBtn.innerHTML = ICON_COLLAPSE;
    const setCollapsed = (collapsed) => {
      const root = document.documentElement;
      narrow.autoCollapsed = false;
      narrow.autoExpanded = false;
      root.classList.add('uhub-anim');
      clearTimeout(setCollapsed._t);
      setCollapsed._t = setTimeout(() => root.classList.remove('uhub-anim'), 260);
      root.classList.toggle('uhub-comments-collapsed', collapsed);
      applyResponsive();
      syncCollapseBtn();
      updateSettingsWarning();
      measureEdgeFix();
    };
    collapseBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      setCollapsed(!document.documentElement.classList.contains('uhub-comments-collapsed'));
    });
    header.addEventListener('click', (ev) => {
      if (!document.documentElement.classList.contains('uhub-comments-collapsed')) return;
      if (ev.target.closest('button') && ev.target.closest('button') !== collapseBtn) return;
      setCollapsed(false);
    });
    header.appendChild(collapseBtn);
    const scrollArea = mk('div');
    scrollArea.id = 'uhub-sidebar-scroll';
    ensureToastEl();
    scrollArea.appendChild(activityModule);
    pinAddCommentInPlace();
    sidebar.appendChild(header);
    sidebar.appendChild(scrollArea);
    document.body.appendChild(sidebar);
    state.sidebarEl = sidebar;
    syncCollapseBtn();
  }
  function ensureToastEl() {
    let toast = gid('uhub-refresh-toast');
    if (!toast) {
      toast = mk('div');
      toast.id = 'uhub-refresh-toast';
      toast.textContent = 'Atualizado';
    }
    if (document.body && toast.parentElement !== document.body) {
      document.body.appendChild(toast);
    }
    return toast;
  }
  // Aplica position:fixed no #addcomment SEM tira-lo do DOM original, fazendo-o aparecer visualmente como o
  // rodape da sidebar de comentarios.
  function pinAddCommentInPlace() {
    const addCommentModule = gid('addcomment');
    if (!addCommentModule) return;
    addCommentModule.classList.add('uhub-pinned-footer');
  }
  function showToast(msg, duration = 1600) {
    const toast = ensureToastEl();
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('uhub-show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('uhub-show'), duration);
  }
  // Aplicacao das larguras configuraveis + painel de ajustes
  const MAIN_MIN_SAFE_WIDTH = 480;
  // Layout responsivo - Tela >= dockMinWidth (padrao 1880px): 3 colunas lado a lado, sem sobreposicao. A coluna
  // de comentarios ocupa ~30% da tela (no maximo a largura configurada) e os metadados ~36% do conteudo (no
  // maximo a largura configurada, no minimo 300px). - Tela menor: os comentarios viram um painel flutuante de
  // altura total por cima da pagina (minimizavel para a barra do rodape), e a pagina passa a usar a largura
  // toda. - Se o conteudo principal ficar com menos de 480px, os metadados descem para baixo da Descricao, na
  // largura total.
  const LAYOUT = { gap: 24, edge: 24, chatMin: 360, mainMinDock: 600, floatTopOffset: 46 };
  function computeLayout() {
    const root = document.documentElement;
    const W = root.clientWidth || window.innerWidth;
    const navW = root.classList.contains('uhub-nav-collapsed') ? NAV_COLLAPSED_WIDTH : 280;
    const avail = W - navW - 32;
    const collapsed = root.classList.contains('uhub-comments-collapsed');
    const S = settings.sidebarWidth;
    let mode = W >= settings.dockMinWidth ? 'dock' : 'float';
    let chatW;
    let content;
    let main;
    if (mode === 'dock') {
      const maxChat = avail - LAYOUT.edge - LAYOUT.gap - LAYOUT.mainMinDock;
      chatW = Math.round(Math.max(LAYOUT.chatMin, Math.min(S, maxChat)));
      content = avail - (collapsed ? 0 : chatW + LAYOUT.gap) - LAYOUT.edge;
      main = content;
      if (!collapsed && main < LAYOUT.mainMinDock) mode = 'float';
    }
    if (mode === 'float') {
      // equilibrado: o painel fica com ~42% (min. 360px, max. a largura escolhida) e o conteudo, ao lado, com o resto
      chatW = Math.round(Math.max(LAYOUT.chatMin, Math.min(S, (W - navW) * 0.42)));
      chatW = Math.max(240, Math.min(chatW, W - LAYOUT.gap * 2));
      content = avail - LAYOUT.edge;
      main = content;
    }
    return { W, mode, chatW, content, main };
  }
  // Telas estreitas (< NARROW_W): o painel de comentarios vira uma gaveta que abre minimizada (o titulo e o
  // conteudo usam a largura toda) ou, se escolhido em Ajustes, uma secao normal abaixo dos anexos (Empilhar).
  // Ao voltar a uma tela larga, o painel volta ao estado de antes.
  const NARROW_W = 1000;
  const narrow = { mode: '', autoCollapsed: false, autoExpanded: false };
  function narrowPref() {
    try { return prefs.narrowLayout === 'stack' ? 'stack' : 'drawer'; } catch (e) { return 'drawer'; }
  }
  function cstackOn() {
    return document.documentElement.classList.contains('uhub-cstack');
  }
  function syncCollapseBtn() {
    const btn = gid('uhub-collapse-btn');
    if (!btn) return;
    const collapsed = document.documentElement.classList.contains('uhub-comments-collapsed');
    const html = collapsed ? ICON_EXPAND : ICON_COLLAPSE;
    if (btn.innerHTML !== html) btn.innerHTML = html;
    const t = collapsed ? 'Restaurar painel de comentários' : 'Minimizar painel de comentários';
    if (btn.title !== t) btn.title = t;
  }
  // O painel mora no <body>; empilhado, ele entra na grade da issue (depois dos anexos). Se o Jira recriar a
  // grade, volta para o lugar certo.
  function placeSidebar() {
    const sb = gid('uhub-sidebar') || (state.sidebarEl && !state.sidebarEl.isConnected ? state.sidebarEl : null);
    if (!sb || !state.applied) return;
    const want = cstackOn() ? q1('.aui-group.issue-body') : document.body;
    if (want && sb.parentElement !== want) want.appendChild(sb);
  }
  function applyNarrow(W) {
    const root = document.documentElement;
    const want = W < NARROW_W ? narrowPref() : 'wide';
    if (want === narrow.mode) return;
    const prev = narrow.mode;
    narrow.mode = want;
    const isCollapsed = () => root.classList.contains('uhub-comments-collapsed');
    if (prev === 'drawer' && narrow.autoCollapsed && isCollapsed()) root.classList.remove('uhub-comments-collapsed');
    if (prev === 'stack' && narrow.autoExpanded) root.classList.add('uhub-comments-collapsed');
    narrow.autoCollapsed = false;
    narrow.autoExpanded = false;
    root.classList.toggle('uhub-narrow', want === 'drawer');
    root.classList.toggle('uhub-cstack', want === 'stack');
    if (want === 'drawer' && !isCollapsed()) { root.classList.add('uhub-comments-collapsed'); narrow.autoCollapsed = true; }
    if (want === 'stack' && isCollapsed()) { root.classList.remove('uhub-comments-collapsed'); narrow.autoExpanded = true; }
    syncCollapseBtn();
    placeSidebar();
    if (prev && typeof measureHeaderHeight === 'function' && state.applied) setTimeout(() => { try { measureHeaderHeight(); measureEdgeFix(); placeMyAvatar(); } catch {} }, 0);
  }
  let lastLayout = null;
  function applyResponsive() {
    const root = document.documentElement;
    applyNarrow(root.clientWidth || window.innerWidth);
    const L = computeLayout();
    lastLayout = L;
    const set = (k, v) => { if (root.style.getPropertyValue(k) !== v) root.style.setProperty(k, v); };
    set('--uhub-sidebar-w', `${L.chatW}px`);
    const wasFloat = root.classList.contains('uhub-float');
    root.classList.toggle('uhub-float', L.mode === 'float');
    if (wasFloat !== (L.mode === 'float') && typeof measureHeaderHeight === 'function' && state.applied) measureHeaderHeight();
    return L;
  }
  function applyColumnWidths() {
    const root = document.documentElement;
    applyResponsive();
    applyAttWidth();
    syncAttachmentControls();
    updateSettingsWarning();
    measureEdgeFix();
  }
  function updateSettingsWarning() {
    const warning = gid('uhub-settings-warning');
    if (!warning) return;
    const L = computeLayout();
    const mainW = L.main;
    if (mainW < MAIN_MIN_SAFE_WIDTH) {
      warning.textContent = `⚠ Nesta largura de tela o conteúdo principal fica com ~${Math.max(0, Math.round(mainW))}px — abaixo do confortável (${MAIN_MIN_SAFE_WIDTH}px).`;
      warning.classList.add('uhub-show');
    } else {
      warning.classList.remove('uhub-show');
    }
  }
  const ICON_RESET_PARAM = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.2 1.8v3.6h3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function isParamDefault(key) {
    if (key in DEFAULTS) return settings[key] === DEFAULTS[key];
    if (key in AUTO_DEFAULTS) return prefs[key] === AUTO_DEFAULTS[key];
    return true;
  }
  function areAllParamsDefault() {
    return Object.keys(DEFAULTS).every(isParamDefault) && Object.keys(AUTO_DEFAULTS).every(isParamDefault);
  }
  function resetParam(key) {
    if (key === 'dockMinWidth' || key === 'sidebarWidth') {
      settings[key] = saveSetting(key, DEFAULTS[key]);
      applyColumnWidths();
      refreshSliderUI();
      return;
    }
    if (key === 'attSize') {
      setAttSize(DEFAULTS.attSize);
      return;
    }
    if (!(key in AUTO_DEFAULTS)) return;
    savePref(key, AUTO_DEFAULTS[key]);
    if (key === 'narrowLayout') {
      applyColumnWidths();
      positionNavToggle();
    } else if (key === 'attProportional') {
      syncAttachmentControls();
    } else if (key === 'betaViewer') {
      if (!prefs.betaViewer) closeBetaViewer();
      qa('#attachment_thumbnails li.attachment-content').forEach(addAttachmentCiteButton);
      syncAttSelection();
    } else if (key === 'autoRefresh') {
      if (prefs.autoRefresh) {
        auto.stopped = false;
        auto.failures = 0;
        scheduleAutoRefresh(0.2);
      } else {
        stopAutoRefreshTimer();
        setStatus('Atualização automática desligada');
      }
    } else if (key === 'autoRefreshSec') {
      if (prefs.autoRefresh && !auto.stopped) {
        refreshAutoStatusText();
        if (!isTabVisible()) scheduleAutoRefresh(nextDelaySec());
      }
    }
  }
  function resetAllParams() {
    Object.keys(DEFAULTS).forEach((k) => { settings[k] = saveSetting(k, DEFAULTS[k]); });
    Object.keys(AUTO_DEFAULTS).forEach((k) => { savePref(k, AUTO_DEFAULTS[k]); });
    applyColumnWidths();
    refreshSliderUI();
    refreshAllTileResolutions();
    positionNavToggle();
    if (prefs.autoRefresh) {
      auto.stopped = false;
      auto.failures = 0;
      scheduleAutoRefresh(0.2);
    } else {
      stopAutoRefreshTimer();
      setStatus('Atualização automática desligada');
    }
  }
  function makeParamResetButton(key, defaultLabel) {
    const b = mk('button');
    b.type = 'button';
    b.className = 'sp-item-reset';
    b.dataset.resetKey = key;
    const tip = defaultLabel ? `Restaurar padrão (${defaultLabel})` : 'Restaurar padrão';
    b.title = tip;
    b.setAttribute('aria-label', tip);
    b.innerHTML = ICON_RESET_PARAM;
    b.disabled = isParamDefault(key);
    b.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      resetParam(key);
    });
    return b;
  }
  function syncAllResetButtons() {
    const panel = gid('uhub-settings-panel');
    if (!panel) return;
    panel.querySelectorAll('.sp-item-reset[data-reset-key]').forEach((b) => {
      b.disabled = isParamDefault(b.dataset.resetKey);
    });
    const allBtn = gid('uhub-reset-all');
    if (allBtn) allBtn.disabled = areAllParamsDefault();
  }
  function buildSettingsPanel() {
    if (gid('uhub-settings-panel')) return;
    const panel = mk('div');
    panel.id = 'uhub-settings-panel';
    const header = mk('div');
    header.className = 'sp-header';
    const ver = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) ? ` <span style="font-weight:400;color:#6b778c;font-size:11px">v${GM_info.script.version}</span>` : '';
    header.innerHTML = `<strong>Ajustes${ver}</strong>`;
    const closeBtn = mk('button');
    closeBtn.innerHTML = ICON_CLOSE;
    closeBtn.title = 'Fechar';
    closeBtn.addEventListener('click', () => toggleSettingsPanel(false));
    header.appendChild(closeBtn);
    const body = mk('div');
    body.className = 'sp-body';
    const warning = mk('div');
    warning.id = 'uhub-settings-warning';
    warning.className = 'sp-warning';
    body.appendChild(warning);
    body.appendChild(buildSliderField({
      key: 'dockMinWidth',
      label: 'Comentários flutuam abaixo de',
      defaultLabel: `${DEFAULTS.dockMinWidth}px`,
      hint: 'Largura de tela abaixo da qual os comentários viram um painel flutuante por cima da página (padrão 1880px). Em telas maiores, ficam como 3ª coluna.',
    }));
    body.appendChild(buildSliderField({
      key: 'sidebarWidth',
      label: 'Largura máxima dos comentários',
      defaultLabel: `${DEFAULTS.sidebarWidth}px`,
      hint: 'Até 1200px. Se a tela não comportar, encolhe sozinha (mín. 360px) para não esconder o conteúdo.',
    }));
    body.appendChild(buildChoiceField({
      key: 'narrowLayout',
      label: `Comentários em telas estreitas (< ${NARROW_W}px)`,
      defaultLabel: 'Gaveta',
      options: [['drawer', 'Gaveta'], ['stack', 'Empilhar']],
      hint: () => ({
        drawer: 'O painel abre minimizado no rodapé e, ao abrir, cobre a página. O conteúdo usa a largura toda.',
        stack: 'Os comentários viram uma seção normal abaixo dos anexos, sem nada sobreposto.',
      })[narrowPref()],
      onChange: () => { applyColumnWidths(); positionNavToggle(); },
    }));
    const resetBtn = mk('button');
    resetBtn.id = 'uhub-reset-all';
    resetBtn.type = 'button';
    resetBtn.className = 'sp-reset';
    resetBtn.textContent = 'Restaurar tudo';
    resetBtn.disabled = areAllParamsDefault();
    resetBtn.addEventListener('click', resetAllParams);
    body.appendChild(resetBtn);
    body.appendChild(buildAttachmentSection());
    body.appendChild(buildAutoRefreshSection());
    body.appendChild(buildBetaSection());
    body.appendChild(buildDiagnosticsSection());
    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);
  }
  function buildBetaSection() {
    const wrap = mk('div');
    wrap.className = 'sp-section';
    wrap.innerHTML = '<div class="sp-section-title">Visualizador 1:1 e comparador (Beta)</div>';
    const bv = buildCheckboxRow('betaViewer', 'Ativar leitor vertical 1:1 e comparador de imagens nos anexos');
    bv.input.addEventListener('change', () => {
      savePref('betaViewer', bv.input.checked);
      if (!prefs.betaViewer) closeBetaViewer();
      qa('#attachment_thumbnails li.attachment-content').forEach(addAttachmentCiteButton);
      syncAttSelection();
    });
    wrap.appendChild(bv.row);
    const hint = mk('div');
    hint.className = 'sp-hint';
    hint.textContent = 'Adiciona o ícone de olho nas imagens para leitura 1:1 (com Light vs Dark quando houver _dm) e a opção "Comparar" ao selecionar 2 ou mais imagens.';
    wrap.appendChild(hint);
    return wrap;
  }
  function buildDiagnosticsReport() {
    let entries = [];
    try { entries = JSON.parse(GM_getValue('uhub-diag', '[]')) || []; } catch (e) { entries = []; }
    return JSON.stringify({
      script: (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '',
      when: new Date().toISOString(),
      ua: navigator.userAgent,
      state: capturePageDiagnosticState(),
      history: entries,
    }, null, 2);
  }
  function buildDiagnosticsSection() {
    const wrap = mk('div');
    wrap.className = 'sp-section';
    wrap.innerHTML = '<div class="sp-section-title">Diagnóstico</div>';
    const row = mk('div');
    row.style.cssText = 'display:flex;gap:6px';
    const b = mk('button');
    b.type = 'button';
    b.className = 'sp-reset';
    b.style.flex = '1 1 0';
    b.textContent = 'Copiar diagnóstico';
    b.addEventListener('click', async () => {
      const ok = await copyText(buildDiagnosticsReport());
      showToast(ok ? 'Diagnóstico copiado — cole na conversa' : 'Não foi possível copiar', 3000);
    });
    const dl = mk('button');
    dl.type = 'button';
    dl.className = 'sp-reset';
    dl.style.flex = '0 0 auto';
    dl.style.width = 'auto';
    dl.style.padding = '8px 10px';
    dl.textContent = 'Baixar .txt';
    dl.title = 'Baixar arquivo .txt com o relatório completo de diagnóstico';
    dl.addEventListener('click', () => {
      try {
        const report = buildDiagnosticsReport();
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = mk('a');
        const key = (state.issueKey || getIssueKey() || 'jira').replace(/[^A-Za-z0-9_-]/g, '');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `diagnostico-${key}-${stamp}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showToast('Arquivo .txt baixado', 2500);
      } catch (e) {
        showToast('Não foi possível baixar o arquivo', 3000);
      }
    });
    row.appendChild(b);
    row.appendChild(dl);
    const hint = mk('div');
    hint.className = 'sp-hint';
    hint.textContent = 'Coleta a estrutura da tela, estado do editor, seleção de anexos e eventos recentes para auditoria.';
    wrap.appendChild(row);
    wrap.appendChild(hint);
    return wrap;
  }
  function buildSliderField({ key, label, defaultLabel, hint, onChange }) {
    const field = mk('div');
    field.className = 'sp-field';
    field.dataset.key = key;
    const labelEl = mk('label');
    const labelText = mk('span');
    labelText.textContent = label;
    const valEl = mk('span');
    valEl.className = 'sp-val';
    valEl.textContent = `${settings[key]}px`;
    labelEl.appendChild(labelText);
    labelEl.appendChild(valEl);
    labelEl.appendChild(makeParamResetButton(key, defaultLabel || `${DEFAULTS[key]}px`));
    const input = mk('input');
    input.type = 'range';
    input.min = LIMITS[key].min;
    input.max = LIMITS[key].max;
    input.step = 10;
    input.value = settings[key];
    input.addEventListener('input', () => {
      const value = Number(input.value);
      settings[key] = saveSetting(key, value);
      valEl.textContent = `${settings[key]}px`;
      applyColumnWidths();
      syncAllResetButtons();
      if (onChange) onChange();
    });
    const hintEl = mk('div');
    hintEl.className = 'sp-hint';
    hintEl.textContent = hint;
    field.appendChild(labelEl);
    field.appendChild(input);
    field.appendChild(hintEl);
    return field;
  }
  function refreshSliderUI() {
    const panel = gid('uhub-settings-panel');
    if (!panel) return;
    for (const key of Object.keys(settings)) {
      const field = panel.querySelector(`.sp-field[data-key="${key}"]`);
      if (!field) continue;
      field.querySelector('input[type="range"]').value = settings[key];
      field.querySelector('.sp-val').textContent = `${settings[key]}px`;
    }
    updateSettingsWarning();
    syncAllResetButtons();
  }
  function positionSettingsPanel() {
    const btn = gid('uhub-settings-btn');
    const root = document.documentElement;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const top = Math.max(8, Math.round(r.bottom + 6));
    const right = Math.max(8, Math.round(window.innerWidth - r.right));
    root.style.setProperty('--uhub-sp-top', `${top}px`);
    root.style.setProperty('--uhub-sp-right', `${right}px`);
  }
  function toggleSettingsPanel(force) {
    const panel = gid('uhub-settings-panel');
    if (!panel) return;
    const shouldOpen = force !== undefined ? force : !panel.classList.contains('uhub-open');
    if (shouldOpen) {
      toggleNotifyPopover(false);
      toggleMetaPopover(false);
      positionSettingsPanel();
    }
    panel.classList.toggle('uhub-open', shouldOpen);
    const btn = gid('uhub-settings-btn');
    if (btn) {
      btn.classList.toggle('uhub-active', shouldOpen);
      btn.setAttribute('aria-expanded', String(shouldOpen));
    }
    if (shouldOpen) updateSettingsWarning();
  }
  // ---------- Engrenagem de Ajustes na topbar do Jira ----------
  const ICON_SETTINGS_HEADER = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg>';
  function onSettingsBtnClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    toggleSettingsPanel();
  }
  const ICON_REVIEW_HEADER = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"></path><rect x="8" y="8" width="8" height="8" rx="1.5"></rect></svg>';
  const ICON_REFRESH_HEADER = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>';
  const ICON_LAYOUT_TOGGLE_ON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="6"></rect><circle cx="16" cy="12" r="2.5" fill="currentColor"></circle></svg>';
  const ICON_LAYOUT_TOGGLE_OFF = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="6"></rect><circle cx="8" cy="12" r="2.5"></circle></svg>';
  function onRefreshBtnClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    refreshComments();
  }
  function makeHeaderLink(id, liId, label, title, icon, onClick) {
    const li = mk('li');
    li.id = liId;
    const a = mk('a');
    a.id = id;
    a.className = 'aui-nav-link aui-button-round';
    a.href = '#';
    a.setAttribute('role', 'button');
    a.setAttribute('aria-label', label);
    a.title = title;
    a.innerHTML = icon;
    a.addEventListener('click', onClick);
    li.appendChild(a);
    return li;
  }
  // Icones do script na topbar do Jira, imediatamente a esquerda da busca (revisao, atualizar, ajustes, interruptor do layout | Pesquisa)
  function buildHeaderSettingsButton() {
    const quick = gid('quicksearch-menu');
    const secondary = quick && quick.parentElement;
    const nav = gid('uhub-settings-header-nav');
    if (nav && nav.querySelector('#uhub-refresh-btn') && nav.querySelector('#uhub-settings-btn') && nav.querySelector('#uhub-review-btn') && nav.querySelector('#uhub-layout-toggle')) {
      syncReviewButton();
      syncLayoutToggle();
      return;
    }
    const inTopbar = (id) => { const e = gid(id); return !!(e && e.closest('#uhub-settings-header-nav')); };
    if (!secondary && gid('uhub-settings-btn') && gid('uhub-refresh-btn')) return;
    if (secondary) {
      ['uhub-refresh-btn', 'uhub-settings-btn', 'uhub-layout-toggle'].forEach((id) => {
        const e = gid(id);
        if (e && !inTopbar(id)) e.remove();
      });
      if (nav) nav.remove();
      const ul = mk('ul');
      ul.className = 'aui-nav';
      ul.id = 'uhub-settings-header-nav';
      const refreshLi = makeHeaderLink('uhub-refresh-btn', 'uhub-refresh-header-item',
        'Atualizar tudo sem recarregar a página', 'Atualizar tudo (sem recarregar a página)',
        ICON_REFRESH_HEADER, onRefreshBtnClick);
      const gearLi = makeHeaderLink('uhub-settings-btn', 'uhub-settings-header-item',
        'Ajustes do layout 3 colunas', 'Ajustes do layout (larguras, atualização e notificações)',
        ICON_SETTINGS_HEADER, onSettingsBtnClick);
      gearLi.firstChild.setAttribute('aria-expanded', 'false');
      const reviewLi = makeHeaderLink('uhub-review-btn', 'uhub-review-header-item',
        'Modo revisão', 'Modo revisão: só os anexos (grandes) e os comentários. Clique de novo ou Esc para voltar.',
        ICON_REVIEW_HEADER, onReviewBtnClick);
      const toggleLi = makeHeaderLink('uhub-layout-toggle', 'uhub-layout-toggle-item',
        'Alternar layout otimizado', 'Layout 3 colunas ativado (clique para voltar ao padrão do Jira)',
        ICON_LAYOUT_TOGGLE_ON, onLayoutToggleClick);
      ul.appendChild(reviewLi);
      ul.appendChild(refreshLi);
      ul.appendChild(gearLi);
      ul.appendChild(toggleLi);
      secondary.insertBefore(ul, quick);
      syncReviewButton();
      syncLayoutToggle();
      refitHeader(true);
      if (auto.status) setStatus(auto.status);
      return;
    }
    const header = gid('uhub-sidebar-header');
    const collapse = gid('uhub-collapse-btn');
    if (!header) return;
    if (!gid('uhub-refresh-btn')) {
      const r = mk('button');
      r.id = 'uhub-refresh-btn';
      r.title = 'Atualizar tudo (sem recarregar a página)';
      r.innerHTML = ICON_REFRESH;
      r.addEventListener('click', onRefreshBtnClick);
      header.insertBefore(r, collapse || null);
    }
    if (!gid('uhub-settings-btn')) {
      const g = mk('button');
      g.id = 'uhub-settings-btn';
      g.title = 'Ajustes do layout';
      g.innerHTML = ICON_SETTINGS;
      g.addEventListener('click', onSettingsBtnClick);
      header.insertBefore(g, gid('uhub-refresh-btn'));
    }
  }
  // Fecha paineis flutuantes ao clicar fora ou com Esc
  function onDocPointerDownForPanels(ev) {
    const t = ev.target;
    const panel = gid('uhub-settings-panel');
    if (panel && panel.classList.contains('uhub-open')
        && !panel.contains(t) && !(t.closest && t.closest('#uhub-settings-btn'))) {
      toggleSettingsPanel(false);
    }
    const pop = gid('uhub-notify-pop');
    if (pop && pop.classList.contains('uhub-open')
        && !pop.contains(t) && !(t.closest && t.closest('#uhub-notify-status'))) {
      toggleNotifyPopover(false);
    }
    const sb = gid('viewissuesidebar');
    if (metaPopoverOpen() && sb && !sb.contains(t) && !(t.closest && t.closest('#uhub-meta-info-btn'))) {
      if (!(t.closest && t.closest('.aui-dropdown2, .aui-dialog2, .jira-dialog, .aui-inline-dialog, aui-inline-dialog'))) {
        toggleMetaPopover(false);
      }
    }
  }
  function onDocKeyDownForPanels(ev) {
    if (ev.key !== 'Escape') return;
    toggleSettingsPanel(false);
    toggleNotifyPopover(false);
    toggleMetaPopover(false);
  }
  // Refresh de comentarios (manual e automatico) + notificacoes Estrategia: 1. Deteccao leve e periodica via
  // API REST do Jira (/rest/api/2/issue/{key}/comment, JSON pequeno). Se a REST nao estiver disponivel, cai
  // para o HTML do painel de comentarios. 2. So quando algo mudou (comentario novo, editado ou apagado) o
  // painel visivel e recarregado — preservando a posicao de leitura, os comentarios recolhidos e sem mexer no
  // campo de novo comentario. 3. Comentarios novos de outras pessoas geram notificacao do navegador (sem
  // duplicar entre abas da mesma issue) e ficam destacados na lista.
  const COMMENT_TAB_KEY = 'com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel';
  const ALL_TAB_KEY = 'com.atlassian.jira.plugin.system.issuetabpanels:all-tabpanel';
  const REFRESH_TARGET_SELECTORS = [
    '#activitymodule',
    '#comment-tabpanel-tabpanel',
    '#issue_actions_container',
    '.issuePanelWrapper',
  ];
  const ACTIVE_TAB_SEC = 1;
  const AUTO_DEFAULTS = { autoRefresh: true, autoRefreshSec: 15, notifyEnabled: true, notifyWhenFocused: true, reminderEnabled: true, reminderMin: 30, attProportional: true, attGroup: 'stack', attSens: 'normal', dueReminder: true, dueHour: 8, sendCheck: true, narrowLayout: 'drawer', betaViewer: true, sharedPolling: true };
  const AUTO_CHOICES = { attGroup: ['off', 'stack', 'frame'], attSens: ['estrito', 'normal', 'amplo'], narrowLayout: ['drawer', 'stack'] };
  const AUTO_LIMITS = { autoRefreshSec: { min: 15, max: 300 }, reminderMin: { min: 5, max: 120 }, dueHour: { min: 0, max: 23 } };
  const MAX_BACKOFF_SEC = 300;
  function isTabVisible() {
    return document.visibilityState === 'visible';
  }
  function currentIntervalSec() {
    return isTabVisible() ? ACTIVE_TAB_SEC : prefs.autoRefreshSec;
  }
  function autoStatusSummary() {
    if (!prefs.autoRefresh) return 'Atualização automática desligada';
    return (isTabVisible()
      ? `Atualização automática a cada 1s (aba ativa · ${prefs.autoRefreshSec}s em 2º plano)`
      : `Atualização automática a cada ${prefs.autoRefreshSec}s (2º plano)`) + hubLabel();
  }
  function refreshAutoStatusText() {
    if (!prefs.autoRefresh) { setStatus('Atualização automática desligada'); return; }
    if (auto.stopped || auto.failures) return;
    const suffix = auto.lastCheckAt ? ` · última verificação ${new Date(auto.lastCheckAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '';
    setStatus(`${autoStatusSummary()}${suffix}`);
  }
  function loadPref(key) {
    const v = GM_getValue(key, null);
    if (v === null || v === undefined) return AUTO_DEFAULTS[key];
    if (AUTO_CHOICES[key]) return AUTO_CHOICES[key].includes(String(v)) ? String(v) : AUTO_DEFAULTS[key];
    if (typeof AUTO_DEFAULTS[key] === 'boolean') return v === true || v === 'true';
    const n = Number(v);
    if (Number.isNaN(n)) return AUTO_DEFAULTS[key];
    const lim = AUTO_LIMITS[key];
    return lim ? Math.max(lim.min, Math.min(lim.max, n)) : n;
  }
  function savePref(key, value) {
    GM_setValue(key, value);
    prefs[key] = loadPref(key);
    syncPrefInputs();
    updateNotifyIndicator();
    return prefs[key];
  }
  const prefs = {
    autoRefresh: loadPref('autoRefresh'),
    autoRefreshSec: loadPref('autoRefreshSec'),
    notifyEnabled: loadPref('notifyEnabled'),
    notifyWhenFocused: loadPref('notifyWhenFocused'),
    reminderEnabled: loadPref('reminderEnabled'),
    reminderMin: loadPref('reminderMin'),
    attProportional: loadPref('attProportional'),
    attGroup: loadPref('attGroup'),
    attSens: loadPref('attSens'),
    dueReminder: loadPref('dueReminder'),
    dueHour: loadPref('dueHour'),
    sendCheck: loadPref('sendCheck'),
    narrowLayout: loadPref('narrowLayout'),
    betaViewer: loadPref('betaViewer'),
    sharedPolling: loadPref('sharedPolling'),
  };
  const auto = {
    timer: null,
    running: false,
    stopped: false,
    seenIds: null,
    lastSignature: null,
    pendingDomUpdate: false,
    failures: 0,
    restAvailable: true,
    lastCheckAt: 0,
    status: '',
  };
  // ---------- utilidades ---------- Sempre o MESMO endereco da pagina aberta (nunca o "base URL" configurado
  // no Jira): se o Jira for acessado por outro dominio/protocolo, uma URL diferente seria bloqueada pelo
  // navegador (CORS). Respeita instalacoes em subcaminho.
  function jiraBaseUrl() {
    const meta = q1('meta[name="ajs-context-path"]');
    const ctx = (meta && meta.content ? meta.content : '').replace(/\/+$/, '');
    return location.origin + ctx;
  }
  function currentUser() {
    const meta = q1('meta[name="ajs-remote-user"]');
    return meta && meta.content ? meta.content.trim().toLowerCase() : '';
  }
  function scrollAreaEl() {
    return gid('uhub-sidebar-scroll');
  }
  function activeTabKey() {
    const sa = scrollAreaEl();
    const li = (sa && sa.querySelector('#issue-tabs li.active-tab')) || q1('#issue-tabs li.active-tab');
    return (li && li.dataset && li.dataset.key) || COMMENT_TAB_KEY;
  }
  function tabShowsComments(key) {
    return key === COMMENT_TAB_KEY || key === ALL_TAB_KEY;
  }
  function domCommentIds(root) {
    const ids = new Set();
    if (!root) return ids;
    root.querySelectorAll('[id^="comment-"]').forEach((el) => {
      const m = /^comment-(\d+)$/.exec(el.id);
      if (m) ids.add(m[1]);
    });
    return ids;
  }
  function cleanText(t) {
    return String(t || '')
      .replace(/\[~([^\]]+)\]/g, '@$1')
      .replace(/\{[^}]*\}/g, '')
      .replace(/[*_+^~]{1,2}([^*_+^~]+)[*_+^~]{1,2}/g, '$1')
      .replace(/!\S+!/g, '[imagem]')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return String(h);
  }
  function isLoginPage(doc) {
    return !!doc.querySelector('#login-form, form[name="loginform"], input[name="os_username"]');
  }
  class RefreshError extends Error {
    constructor(kind, message) { super(message); this.kind = kind; }
  }
  // ---------- deteccao (lista de comentarios) ----------
  async function fetchSnapshotRest(key) {
    const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(key)}/comment?_=${Date.now()}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) throw new RefreshError('session', 'HTTP 401');
    if (!res.ok) throw new RefreshError(res.status === 403 || res.status === 404 ? 'rest-unavailable' : 'http', 'HTTP ' + res.status);
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) throw new RefreshError('rest-unavailable', 'resposta nao-JSON');
    const data = await res.json();
    const list = Array.isArray(data && data.comments) ? data.comments : null;
    if (!list) throw new RefreshError('rest-unavailable', 'formato inesperado');
    return list.map((c) => ({
      id: String(c.id),
      authorName: ((c.author && (c.author.name || c.author.key || c.author.emailAddress)) || '').toLowerCase(),
      authorDisplay: (c.author && c.author.displayName) || 'Alguém',
      text: cleanText(c.body),
      created: String(c.created || ''),
      version: String(c.updated || c.created || ''),
    }));
  }
  async function fetchPanelDoc(tabKey) {
    const key = state.issueKey;
    const base = `${jiraBaseUrl()}/browse/${encodeURIComponent(key)}?page=${encodeURIComponent(tabKey)}`;
    const urls = [`${base}&decorator=none&_=${Date.now()}`, `${base}&_=${Date.now()}`];
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.status === 401) throw new RefreshError('session', 'HTTP 401');
        if (!res.ok) throw new RefreshError('http', 'HTTP ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        if (isLoginPage(doc)) throw new RefreshError('session', 'pagina de login');
        if (REFRESH_TARGET_SELECTORS.some((sel) => doc.querySelector(sel))) return doc;
        lastErr = new RefreshError('format', 'painel nao encontrado na resposta');
      } catch (err) {
        if (err.kind === 'session') throw err;
        lastErr = err;
      }
    }
    throw lastErr || new RefreshError('format', 'painel nao encontrado');
  }
  function snapshotFromDoc(doc) {
    const out = [];
    doc.querySelectorAll('.activity-comment[id^="comment-"], [id^="comment-"].issue-data-block').forEach((el) => {
      const m = /^comment-(\d+)$/.exec(el.id);
      if (!m) return;
      const author = el.querySelector('.action-details a.user-hover, a.user-hover');
      const body = el.querySelector('.action-body');
      const text = cleanText(body ? body.textContent : '');
      const time = el.querySelector('.action-details time[datetime]');
      out.push({
        created: time ? time.getAttribute('datetime') : '',
        id: m[1],
        authorName: ((author && author.getAttribute('rel')) || '').toLowerCase(),
        authorDisplay: (author && author.textContent.trim()) || 'Alguém',
        text,
        version: hashString(text),
      });
    });
    return out;
  }
  async function fetchSnapshot() {
    if (auto.restAvailable) {
      try {
        return { list: await fetchSnapshotRest(state.issueKey), doc: null };
      } catch (err) {
        if (err.kind !== 'rest-unavailable') throw err;
        auto.restAvailable = false;
      }
    }
    const doc = await fetchPanelDoc(COMMENT_TAB_KEY);
    return { list: snapshotFromDoc(doc), doc };
  }
  function signatureOf(list) {
    return list.map((c) => `${c.id}:${c.version}`).sort().join('|');
  }
  // ---------- atualizacao do painel visivel ----------
  function userIsBusyInPanel() {
    const sa = scrollAreaEl();
    if (!sa) return false;
    const a = document.activeElement;
    if (a && sa.contains(a) && a.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
    const sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed && sel.anchorNode && sa.contains(sel.anchorNode)) return true;
    return false;
  }
  function captureReadingPosition(sa) {
    const saTop = sa.getBoundingClientRect().top + parseFloat(getComputedStyle(sa).paddingTop || 0);
    const pos = { scrollTop: sa.scrollTop, id: null, offset: 0 };
    for (const el of sa.querySelectorAll('[id^="comment-"].issue-data-block, .activity-comment[id^="comment-"], .issue-data-block[id]')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > saTop + 1) { pos.id = el.id; pos.offset = r.top - saTop; break; }
    }
    return pos;
  }
  function restoreReadingPosition(sa, pos) {
    if (pos.scrollTop < 5) { sa.scrollTop = 0; return; }
    if (pos.id) {
      const el = sa.querySelector('#' + CSS.escape(pos.id));
      if (el) {
        const saTop = sa.getBoundingClientRect().top + parseFloat(getComputedStyle(sa).paddingTop || 0);
        sa.scrollTop += (el.getBoundingClientRect().top - saTop) - pos.offset;
        return;
      }
    }
    sa.scrollTop = pos.scrollTop;
  }
  // Troca o painel atual pelo painel novo. Retorna true se trocou.
  function applyPanelDoc(doc, highlightIds) {
    const sa = scrollAreaEl();
    let fresh = null;
    let current = null;
    for (const sel of REFRESH_TARGET_SELECTORS) {
      const f = doc.querySelector(sel);
      if (!f) continue;
      const c = (sa && sa.querySelector(sel)) || q1(sel);
      if (c) { fresh = f; current = c; break; }
    }
    if (!fresh || !current) return false;
    const pos = sa ? captureReadingPosition(sa) : null;
    const twixi = {};
    current.querySelectorAll('.twixi-block[id]').forEach((el) => {
      twixi[el.id] = el.classList.contains('collapsed') ? 'collapsed' : 'expanded';
    });
    const imported = document.importNode(fresh, true);
    current.replaceWith(imported);
    Object.entries(twixi).forEach(([id, st]) => {
      const el = imported.querySelector('#' + CSS.escape(id)) || (imported.id === id ? imported : null);
      if (!el) return;
      el.classList.toggle('collapsed', st === 'collapsed');
      el.classList.toggle('expanded', st === 'expanded');
    });
    (highlightIds || []).forEach((id) => {
      const el = imported.querySelector('#comment-' + CSS.escape(id));
      if (el) {
        el.classList.remove('uhub-new-comment');
        void el.offsetWidth;
        el.classList.add('uhub-new-comment');
      }
    });
    enforceActivityOrder();
    if (sa && pos) restoreReadingPosition(sa, pos);
    rememberDomComments();
    decorateReplyButtons();
    revealOwnNewComment();
    scrollToNewestOnOpen();
    return true;
  }
  // Ordem cronologica rigorosa da atividade. O Jira as vezes coloca o comentario recem-enviado no fim da lista
  // (ou devolve o painel em outra ordem). Sempre que a lista muda, os itens sao reordenados pela DATA/HORA (os
  // ids do Jira NAO sao cronologicos), no sentido do botao de ordenacao do Jira (padrao: mais recentes
  // primeiro). Roda no mesmo quadro, antes de a tela ser desenhada; itens sem data, fixados ou em edicao ficam
  // no lugar.
  function parseJiraTime(v) {
    const t = Date.parse(String(v || '').trim().replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
    return Number.isNaN(t) ? NaN : t;
  }
  function activityTime(el) {
    const t = el.querySelector('.action-details time[datetime]') || el.querySelector('time[datetime]');
    return t ? parseJiraTime(t.getAttribute('datetime')) : NaN;
  }
  function activityNewestFirst(sa) {
    const b = sa.querySelector('#sort-button') || q1('#sort-button');
    if (b) {
      const o = (b.getAttribute('data-order') || '').toLowerCase();
      if (o === 'asc') return true;
      if (o === 'desc') return false;
      if (/antig|oldest/i.test(b.textContent || '')) return false;
    }
    return true;
  }
  let orderRetry = null;
  function enforceActivityOrder({ keepPosition = false } = {}) {
    const sa = scrollAreaEl();
    if (!sa) return false;
    const newestFirst = activityNewestFirst(sa);
    const containers = new Set();
    sa.querySelectorAll('.issue-data-block').forEach((b) => { if (b.parentElement) containers.add(b.parentElement); });
    let moved = false;
    let busy = false;
    let pos = null;
    containers.forEach((ct) => {
      const keyed = [...ct.children]
        .filter((el) => el.classList.contains('issue-data-block') && !/pin/i.test(el.className))
        .map((el, i) => ({ el, i, t: activityTime(el), n: Number((/(\d+)$/.exec(el.id) || [])[1]) || 0 }))
        .filter((k) => !Number.isNaN(k.t));
      if (keyed.length < 2) return;
      const sorted = [...keyed].sort((a, b) => (newestFirst ? (b.t - a.t) || (b.n - a.n) : (a.t - b.t) || (a.n - b.n)) || (a.i - b.i));
      if (sorted.every((k, i) => k === keyed[i])) return;
      if (keyed.some((k) => k.el.querySelector('iframe, textarea, form, [contenteditable="true"]'))) { busy = true; return; }
      if (keepPosition && !moved) pos = captureReadingPosition(sa);
      const marks = keyed.map((k) => { const m = document.createComment(''); k.el.before(m); return m; });
      sorted.forEach((k, i) => marks[i].after(k.el));
      marks.forEach((m) => m.remove());
      moved = true;
    });
    clearTimeout(orderRetry);
    if (busy) orderRetry = setTimeout(() => { try { if (state.applied) enforceActivityOrder(); } catch {} }, 1000);
    if (moved) {
      if (pos && !(ownPost && Date.now() - ownPost.at < 90000)) restoreReadingPosition(sa, pos);
      try { diag({ kind: 'order-fixed' }); } catch {}
    }
    return moved;
  }
  // Tudo que esta visivel no painel conta como "ja visto" (evita notificar o que ja aparece)
  function rememberDomComments() {
    if (!auto.seenIds) return;
    domCommentIds(scrollAreaEl()).forEach((id) => auto.seenIds.add(id));
  }
  // ---------- notificacoes ----------
  function claimNotification(id) {
    const key = 'uhub-notified-ids';
    let list = [];
    try { list = JSON.parse(GM_getValue(key, '[]')) || []; } catch (e) { list = []; }
    if (list.includes(id)) return false;
    list.push(id);
    if (list.length > 300) list = list.slice(-300);
    GM_setValue(key, JSON.stringify(list));
    return true;
  }
  function focusComment(id) {
    try { window.focus(); } catch {}
    const collapseBtn = gid('uhub-collapse-btn');
    if (document.documentElement.classList.contains('uhub-comments-collapsed') && collapseBtn) collapseBtn.click();
    setTimeout(() => {
      const el = id && q1('#uhub-sidebar-scroll #comment-' + CSS.escape(id));
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.remove('uhub-new-comment');
        void el.offsetWidth;
        el.classList.add('uhub-new-comment');
      }
    }, 250);
  }
  function sendSystemNotification(title, text, onclick) {
    if (typeof GM_notification === 'function') {
      GM_notification({ title, text, silent: false, timeout: 15000, onclick });
      return;
    }
    if (!('Notification' in window)) return;
    const show = () => {
      const n = new Notification(title, { body: text });
      n.onclick = () => { onclick(); n.close(); };
    };
    if (Notification.permission === 'granted') show();
    else if (Notification.permission !== 'denied') Notification.requestPermission().then((p) => { if (p === 'granted') show(); });
  }
  // Titulo da issue (summary) para identificar a notificacao
  function issueTitleForNotif() {
    try {
      const t = summaryText();
      if (t) return t.length > 120 ? `${t.slice(0, 119)}…` : t;
    } catch {}
    return '';
  }
  function notifyNewComments(comments) {
    const toNotify = comments.filter((c) => claimNotification(c.id));
    if (!toNotify.length) return;
    const key = state.issueKey;
    const focused = document.visibilityState === 'visible' && document.hasFocus();
    const first = toNotify[toNotify.length - 1];
    showToast(toNotify.length === 1
      ? `Novo comentário de ${first.authorDisplay}`
      : `${toNotify.length} novos comentários`, 5000);
    if (!prefs.notifyEnabled) return;
    if (focused && !prefs.notifyWhenFocused) return;
    const title = issueTitleForNotif() || key;
    let text;
    if (toNotify.length === 1) {
      const snippet = first.text.length > 140 ? first.text.slice(0, 137) + '…' : first.text;
      text = `${first.authorDisplay}: ${snippet || '(sem texto)'}`;
    } else {
      const names = [...new Set(toNotify.map((c) => c.authorDisplay))];
      text = `${toNotify.length} comentários: ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}`;
    }
    sendSystemNotification(title, text, () => focusComment(first.id));
  }
  // ---------- estado / status ----------
  function setStatus(text) {
    auto.status = text;
    const el = gid('uhub-auto-status');
    if (el) el.textContent = text;
    updateNotifyIndicator();
    const btn = gid('uhub-refresh-btn');
    if (btn) btn.title = `Atualizar tudo agora (sem recarregar a página)\n${text}`;
  }
  function timeNow() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  // ---------- ciclo de verificacao ----------
  async function checkForChanges({ manual = false, pageDoc = null } = {}) {
    if (auto.running) return 'busy';
    if (!state.applied) return 'idle';
    if (!state.issueKey) state.issueKey = getIssueKey();
    if (!state.issueKey) return 'idle';
    if (navigator.onLine === false) throw new RefreshError('network', 'sem conexão');
    auto.running = true;
    try {
      const { list, doc: commentDoc } = await fetchSnapshot();
      const signature = signatureOf(list);
      const firstRun = auto.seenIds === null;
      let baselineMax = 0;
      if (firstRun) {
        const onScreen = domCommentIds(scrollAreaEl());
        scrollAreaEl() && scrollAreaEl().querySelectorAll('.activity-comment[id^="comment-"]').forEach((el) => {
          const t = activityTime(el);
          if (!Number.isNaN(t) && t > baselineMax) baselineMax = t;
        });
        auto.seenIds = onScreen.size ? onScreen : new Set(list.map((c) => c.id));
        auto.lastSignature = null;
      }
      const me = currentUser();
      auto.lastList = list;
      const newOnes = list.filter((c) => !auto.seenIds.has(c.id));
      const newFromOthers = newOnes.filter((c) => !me || c.authorName !== me);
      let statusChanged = false;
      try {
        statusChanged = await checkIssueStatus({ firstRun, commentFromOthers: !firstRun && newFromOthers.length > 0, pageDoc });
      } catch (err) {
        if (err && err.kind === 'session') throw err;
        console.warn('[Jira layout] verificação de status:', err);
      }
      const changed = manual || auto.pendingDomUpdate || signature !== auto.lastSignature
        || (statusChanged && activeTabKey() !== COMMENT_TAB_KEY);
      let updated = false;
      if (changed) {
        const tab = activeTabKey();
        if (tabShowsComments(tab)) {
          if (!manual && userIsBusyInPanel()) {
            auto.pendingDomUpdate = true;
          } else {
            const doc = (tab === COMMENT_TAB_KEY && commentDoc) ? commentDoc : await fetchPanelDoc(tab);
            updated = applyPanelDoc(doc, newOnes.map((c) => c.id));
            if (!updated) throw new RefreshError('format', 'painel nao encontrado na pagina');
            auto.pendingDomUpdate = false;
          }
        } else {
          auto.pendingDomUpdate = false;
        }
      }
      list.forEach((c) => auto.seenIds.add(c.id));
      auto.lastSignature = signature;
      updateWaiting(list);
      if (!firstRun) discardDraftIfPosted(newOnes.filter((c) => me && c.authorName === me));
      const fresh = firstRun
        ? (baselineMax ? newFromOthers.filter((c) => parseJiraTime(c.created) > baselineMax) : [])
        : newFromOthers;
      if (fresh.length) {
        notifyNewComments(fresh);
        markUnreadComments(fresh.map((c) => c.id));
      }
      auto.failures = 0;
      auto.lastCheckAt = Date.now();
      hub.lastFull = auto.lastCheckAt;
      setStatus(prefs.autoRefresh
        ? `${autoStatusSummary()} · última verificação ${timeNow()}`
        : `Atualização automática desligada · última verificação ${timeNow()}`);
      return updated ? 'updated' : 'unchanged';
    } finally {
      auto.running = false;
    }
  }
  // Status da issue: botao de transicoes (#opsbar-opsbar-transitions), seu menu
  // (#opsbar-transitions_more_drop), os demais botoes da toolbar e os campos que mudam junto (Resolucao, Status
  // se existir, Datas). Deteccao leve via REST (?fields=status). So quando o status mudou a pagina da issue e
  // baixada e os trechos acima sao trocados pelos novos (links de transicao com token novo). Se o proprio Jira
  // ja atualizou a tela (voce fez a transicao nesta aba), nada e trocado nem notificado. Sem REST, compara com
  // a pagina inteira a cada 4 verificacoes.
  const statusState = {
    id: null,
    restOk: true,
    cycle: 0,
    pendingDoc: null,
    pendingNotify: null,
  };
  function resetStatusState() {
    resetExtrasState();
    statusState.id = null;
    statusState.restOk = true;
    statusState.cycle = 0;
    statusState.pendingDoc = null;
    statusState.pendingNotify = null;
  }
  function displayedStatusText(root) {
    const el = (root || document).querySelector('#opsbar-transitions_more .dropdown-text, #opsbar-transitions_more');
    return el ? cleanText(el.textContent) : '';
  }
  async function fetchStatusRest(key) {
    const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(key)}?fields=status,updated,duedate,attachment&_=${Date.now()}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) throw new RefreshError('session', 'HTTP 401');
    if (!res.ok) throw new RefreshError(res.status === 403 || res.status === 404 ? 'rest-unavailable' : 'http', 'HTTP ' + res.status);
    if (!(res.headers.get('content-type') || '').includes('json')) throw new RefreshError('rest-unavailable', 'resposta nao-JSON');
    const data = await res.json();
    const st = data && data.fields && data.fields.status;
    if (!st || st.id === undefined) throw new RefreshError('rest-unavailable', 'formato inesperado');
    const f = data.fields;
    const att = Array.isArray(f.attachment)
      ? f.attachment.map((x) => ({
        id: String(x.id),
        name: String(x.filename || ''),
        by: ((x.author && (x.author.name || x.author.key)) || '').toLowerCase(),
        byDisplay: (x.author && x.author.displayName) || '',
      }))
      : null;
    return { id: String(st.id), name: String(st.name || ''), updated: String(f.updated || ''), due: String(f.duedate || ''), att };
  }
  async function fetchIssuePageDoc({ fresh = false } = {}) {
    const url = fresh
      ? `${jiraBaseUrl()}/browse/${encodeURIComponent(state.issueKey)}`
      : `${jiraBaseUrl()}/browse/${encodeURIComponent(state.issueKey)}?_=${Date.now()}`;
    const res = await fetch(url, {
      credentials: 'same-origin',
      cache: fresh ? 'reload' : 'no-store',
    });
    if (res.status === 401) throw new RefreshError('session', 'HTTP 401');
    if (!res.ok) throw new RefreshError('http', 'HTTP ' + res.status);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    if (isLoginPage(doc)) throw new RefreshError('session', 'pagina de login');
    if (!doc.querySelector('#opsbar-transitions_more, .aui-toolbar2-primary')) throw new RefreshError('format', 'toolbar nao encontrada');
    return doc;
  }
  // Quem fez a ultima mudanca de status (para nao notificar voce mesmo)
  async function lastStatusChangeAuthor(key) {
    try {
      const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(key)}?fields=status&expand=changelog&_=${Date.now()}`, {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const hist = (data && data.changelog && data.changelog.histories) || [];
      for (let i = hist.length - 1; i >= 0; i -= 1) {
        const h = hist[i];
        if ((h.items || []).some((it) => it.field === 'status')) {
          return {
            name: ((h.author && (h.author.name || h.author.key)) || '').toLowerCase(),
            display: (h.author && h.author.displayName) || '',
            historyId: String(h.id || h.created || ''),
          };
        }
      }
    } catch {}
    return null;
  }
  // O usuario esta usando a toolbar (menu aberto, dialogo de transicao etc.)?
  function userIsBusyInToolbar() {
    if (q1('.command-bar .aui-dropdown2-trigger[aria-expanded="true"], .command-bar .aui-dropdown2-active')) return true;
    if (q1('.jira-dialog.jira-dialog-open, .aui-dialog2[open], .aui-dialog2:not([aria-hidden="true"]):not(.hidden)')) return true;
    const a = document.activeElement;
    if (a && a.closest && a.closest('.command-bar') && a.id !== 'uhub-notify-status') return true;
    return false;
  }
  function importFresh(node) {
    const copy = document.importNode(node, true);
    [copy, ...copy.querySelectorAll('[resolved]')].forEach((el) => el.removeAttribute && el.removeAttribute('resolved'));
    return copy;
  }
  function replaceById(doc, id) {
    const fresh = doc.getElementById(id);
    const cur = gid(id);
    if (!fresh || !cur) return false;
    cur.replaceWith(importFresh(fresh));
    return true;
  }
  // Troca na pagina atual os trechos que dependem do status
  function applyStatusDoc(doc) {
    const curUl = q1('header#stalker .aui-toolbar2-primary') || q1('.aui-toolbar2-primary');
    const newUl = doc.querySelector('.aui-toolbar2-primary');
    if (!curUl || !newUl) return false;
    const menuIds = new Set();
    const collect = (root) => root.querySelectorAll('[aria-controls]').forEach((t) => menuIds.add(t.getAttribute('aria-controls')));
    collect(curUl);
    collect(newUl);
    const ours = curUl.querySelector('#uhub-notify-status_container');
    [...curUl.children].forEach((li) => { if (li !== ours) li.remove(); });
    [...newUl.children].forEach((li) => {
      if (li.id === 'uhub-notify-status_container') return;
      curUl.insertBefore(importFresh(li), ours || null);
    });
    menuIds.forEach((id) => {
      if (!id) return;
      const fresh = doc.getElementById(id);
      const cur = gid(id);
      if (fresh && cur) cur.replaceWith(importFresh(fresh));
      else if (fresh && !cur) {
        const bar = curUl.closest('.command-bar') || curUl.parentNode;
        bar.appendChild(importFresh(fresh));
      } else if (!fresh && cur && !cur.closest('.aui-toolbar2-primary')) {
        if (!q1(`[aria-controls="${CSS.escape(id)}"]`)) cur.remove();
      }
    });
    ['status-val', 'resolution-val'].forEach((id) => {
      const cur = gid(id);
      if (cur && !cur.classList.contains('active')) replaceById(doc, id);
    });
    const freshDates = doc.querySelector('#datesmodule .mod-content');
    const curDates = q1('#datesmodule .mod-content');
    if (freshDates && curDates) curDates.replaceWith(importFresh(freshDates));
    if (!gid('uhub-notify-status')) buildNotifyIndicator();
    renderWaiting();
    return true;
  }
  // Atualizacao completa (botao de atualizar): troca, pelos dados novos do servidor, tudo o que pode mudar na
  // issue — titulo, botoes, Detalhes, Descricao, Anexos, Links, Subtarefas, Pessoas e Datas (os comentarios e o
  // status seguem o fluxo proprio). So troca o que de fato mudou, preserva modulos recolhidos e nunca mexe no
  // que voce esta editando. Paineis de plugins (Tempo, Desenvolvimento, Agile...) ficam de fora: eles sao
  // montados pelo proprio plugin e quebrariam se trocados.
  const FULL_REFRESH_MODULES = [
    ['details-module', 'Detalhes'],
    ['descriptionmodule', 'Descrição'],
    ['attachmentmodule', 'Anexos'],
    ['linkingmodule', 'Links'],
    ['view-subtasks', 'Subtarefas'],
    ['peoplemodule', 'Pessoas'],
    ['datesmodule', 'Datas'],
  ];
  function pageWin() {
    try { return (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window; } catch (e) { return window; }
  }
  // Pede ao Jira para inicializar o conteudo trocado (edicao inline, tooltips, visualizador de anexos...) — o
  // mesmo aviso que ele usa quando recarrega um painel sozinho.
  function jiraContentAdded(el) {
    const w = pageWin();
    const $ = w.jQuery || (w.AJS && w.AJS.$);
    if (!$ || !el) return false;
    try {
      const J = w.JIRA;
      if (J && typeof J.trigger === 'function' && J.Events && J.Events.NEW_CONTENT_ADDED) {
        const reason = (J.CONTENT_ADDED_REASON && J.CONTENT_ADDED_REASON.panelRefreshed) || 'panelRefreshed';
        J.trigger(J.Events.NEW_CONTENT_ADDED, [$(el), reason]);
        return true;
      }
    } catch {}
    try {
      if (typeof w.require === 'function') {
        const events = w.require('jira/util/events');
        const types = w.require('jira/util/events/types');
        const reasons = w.require('jira/util/events/reasons');
        if (events && types && types.NEW_CONTENT_ADDED) {
          events.trigger(types.NEW_CONTENT_ADDED, [$(el), (reasons && reasons.panelRefreshed) || 'panelRefreshed']);
          return true;
        }
      }
    } catch {}
    return false;
  }
  // "Assinatura" do conteudo visivel: texto + links + imagens (ignora atributos que o proprio navegador/AUI
  // mexe, como resolved/aria-*)
  const OUR_DECORATIONS = '[id^="uhub-"], #uhub-sendcheck, .uhub-att-sel, .uhub-att-selbar, .uhub-me-avatar, .uhub-att-nodel-trash, .uhub-att-li, .uhub-reply-btn, .uhub-copy-btn, .uhub-more-li, .uhub-att-cite, .uhub-att-inspect, .uhub-att-vtag, .uhub-att-new, .uhub-due, .uhub-attg-label, .uhub-attg-chip, .uhub-attg-head';
  // Assinatura da lista de anexos: so ids e tamanhos. As miniaturas ganham previas, selos e outro src de imagem
  // do script, entao comparar o HTML inteiro fazia o modulo ser trocado a toa e os anexos piscavam.
  function attModuleSignature(el) {
    try {
      if (!el || !el.querySelector || !(el.id === 'attachmentmodule' || el.querySelector('#attachment_thumbnails'))) return null;
      const lis = Array.from(el.querySelectorAll('li.attachment-content'));
      if (!lis.length) return null;
      const parts = lis.map((li) => {
        const a = li.querySelector('a.attachment-title') || li.querySelector('.attachment-thumb a[href]');
        const href = a ? (a.getAttribute('href') || '') : '';
        const m = /\/secure\/attachment\/(\d+)\//.exec(href);
        const sz = li.querySelector('.attachment-size');
        return `${m ? m[1] : href}:${sz ? cleanText(sz.textContent) : ''}`;
      });
      return `att:${hashString(parts.join('|'))}`;
    } catch (e) {
      try { diag({ kind: 'att-signature', msg: String((e && e.message) || e) }); } catch {}
      return null;
    }
  }
  function contentSignature(el) {
    if (!el) return '';
    const attSig = attModuleSignature(el);
    if (attSig !== null) return attSig;
    // campo que foi para a barra de resumo conta como se estivesse no lugar (senao o modulo seria trocado a toa)
    const moved = Object.keys(rmHome).some((k) => rmHome[k] && el.contains(rmHome[k]));
    if (moved || el.querySelector(OUR_DECORATIONS) || el.querySelector('li.uhub-attg')) {
      el = el.cloneNode(true);
      if (moved) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_COMMENT);
        const marks = [];
        for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data.startsWith('uhub-rm:')) marks.push(n);
        marks.forEach((m) => {
          const f = REVIEW_META_FIELDS.find((x) => x.key === m.data.slice(8));
          const live = f && q1(`#uhub-review-meta ${f.sel}`);
          if (live) m.replaceWith(live.cloneNode(true));
        });
      }
      el.querySelectorAll(OUR_DECORATIONS).forEach((n) => n.remove());
      el.querySelectorAll('#attachment_thumbnails').forEach((list) => {
        if (!list.querySelector('li.uhub-attg')) return;
        Array.from(list.querySelectorAll('li.attachment-content'))
          .sort((a, b) => Number(a.dataset.uhubOrd || 0) - Number(b.dataset.uhubOrd || 0))
          .forEach((li) => list.appendChild(li));
        list.querySelectorAll('li.uhub-attg').forEach((w) => w.remove());
      });
    }
    const parts = [uhubTo24h(cleanText(el.textContent), true)];
    el.querySelectorAll('a[href], img[src]').forEach((n) => {
      const v = n.getAttribute('href') || n.getAttribute('src') || '';
      parts.push(v.replace(/([?&]atl_token=)[^&]*/g, '$1'));
    });
    return hashString(parts.join('\u0001'));
  }
  function userIsEditingIn(el) {
    if (!el) return false;
    const EDITING = '.editable-field.active, .uhub-edit-frozen, form.aui.dirty, .inline-edit-fields';
    if (el.matches(EDITING) || el.querySelector(EDITING)) return true;
    // campo deste modulo que esta na barra de resumo sendo editado conta como edicao no modulo
    if (REVIEW_META_FIELDS.some((f) => rmHome[f.key] && el.contains(rmHome[f.key]) && userIsEditingIn(q1(`#uhub-review-meta ${f.sel}`)))) return true;
    const a = document.activeElement;
    if (a && el.contains(a) && a.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
    const sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed && sel.anchorNode && el.contains(sel.anchorNode)) return true;
    return false;
  }
  function replaceModule(cur, fresh) {
    const copy = importFresh(fresh);
    const wasCollapsed = cur.classList.contains('collapsed');
    copy.classList.toggle('collapsed', wasCollapsed);
    const btn = copy.querySelector(':scope > .mod-header [aria-expanded]');
    if (btn) btn.setAttribute('aria-expanded', String(!wasCollapsed));
    cur.replaceWith(copy);
    jiraContentAdded(copy);
    return copy;
  }
  // Insere um modulo novo (ex.: Anexos depois do primeiro anexo) na mesma posicao relativa que ele tem na
  // pagina nova
  function insertModuleLikeDoc(fresh) {
    let prev = fresh.previousElementSibling;
    while (prev) {
      const anchor = prev.id && gid(prev.id);
      if (anchor && anchor.parentNode && !anchor.closest('#uhub-sidebar')) {
        const copy = importFresh(fresh);
        anchor.after(copy);
        jiraContentAdded(copy);
        return true;
      }
      prev = prev.previousElementSibling;
    }
    return false;
  }
  // Troca, na tela, os modulos da lista que mudaram na pagina nova (mesmas protecoes da atualizacao completa)
  function applyModuleList(doc, list, report) {
    list.forEach(([id, label]) => {
      const cur = gid(id);
      const fresh = doc.getElementById(id);
      if (cur && cur.closest('#uhub-sidebar')) return;
      if (cur && fresh) {
        if (contentSignature(cur) === contentSignature(fresh)) return;
        if (userIsEditingIn(cur)) {
          report.skipped.push(label);
          return;
        }
        replaceModule(cur, fresh);
        report.replaced.push(label);
      } else if (!cur && fresh) {
        if (insertModuleLikeDoc(fresh)) report.replaced.push(label);
      } else if (cur && !fresh) {
        if (userIsEditingIn(cur)) report.skipped.push(label);
        else {
          cur.remove();
          report.replaced.push(label);
        }
      }
    });
    return report;
  }
  function applyFullIssueDoc(doc) {
    const report = { replaced: [], skipped: [] };
    if (!doc) return report;
    if (!userIsBusyInToolbar()) {
      const curUl = q1('header#stalker .aui-toolbar2-primary');
      const newUl = doc.querySelector('.aui-toolbar2-primary');
      if (curUl && newUl) {
        const mine = [...curUl.children].filter((li) => li.id !== 'uhub-notify-status_container');
        const sigCur = mine.map((li) => contentSignature(li)).join('|');
        const sigNew = [...newUl.children].map((li) => contentSignature(li)).join('|');
        if (sigCur !== sigNew) {
          applyStatusDoc(doc);
          report.replaced.push('Botões');
        }
      }
    }
    const curSummary = gid('summary-val');
    const newSummary = doc.getElementById('summary-val');
    if (curSummary && newSummary && contentSignature(curSummary) !== contentSignature(newSummary)) {
      if (userIsEditingIn(curSummary.parentNode) || curSummary.classList.contains('active')) report.skipped.push('Título');
      else {
        const copy = importFresh(newSummary);
        curSummary.replaceWith(copy);
        jiraContentAdded(copy);
        report.replaced.push('Título');
      }
    }
    applyModuleList(doc, FULL_REFRESH_MODULES, report);
    measureHeaderHeight();
    return report;
  }
  // Pendencias nao lidas: contador no favicon + "(N) ● " no titulo da aba. - Comentario novo de outra pessoa:
  // pendente ate ficar visivel na coluna de comentarios, com a aba em foco, por ~1,5 s (faixa vermelha a
  // esquerda do comentario enquanto nao lido). - Mudanca de status (sem comentario): pendente ate voce entrar
  // na aba. Fica salvo por issue (sobrevive a recarregar a pagina) e e compartilhado entre abas da mesma issue:
  // lido em uma, some nas outras.
  const UNREAD_STORE = 'uhub-unread';
  const UNREAD_SEEN_MS = 500;
  const unread = {
    ids: new Set(),
    status: false,
    seenSince: new Map(),
    statusSeenSince: 0,
    timer: null,
    baseTitle: null,
    titleObserver: null,
    iconOriginals: null,
    iconBase: null,
    iconBaseTried: false,
    lastCount: -1,
  };
  function readUnreadStore() {
    try { return JSON.parse(GM_getValue(UNREAD_STORE, '{}')) || {}; } catch (e) { return {}; }
  }
  function writeUnreadStore(mutator) {
    const all = readUnreadStore();
    mutator(all);
    const tooOld = Date.now() - 7 * 24 * 3600 * 1000;
    Object.keys(all).forEach((k) => {
      const v = all[k];
      if (!v || (!(v.ids && v.ids.length) && !v.status) || (v.firstAt || v.at || 0) < tooOld) delete all[k];
    });
    GM_setValue(UNREAD_STORE, JSON.stringify(all));
  }
  function saveUnread() {
    const key = state.issueKey;
    if (!key) return;
    writeUnreadStore((all) => {
      const prev = all[key];
      const now = Date.now();
      const hadPending = !!(prev && ((prev.ids && prev.ids.length) || prev.status));
      all[key] = {
        ids: [...unread.ids].slice(-200),
        status: unread.status,
        at: now,
        firstAt: hadPending && prev.firstAt ? prev.firstAt : now,
        title: unread.baseTitle || prev && prev.title || '',
        summary: issueTitleForNotif() || (prev && prev.summary) || '',
      };
    });
  }
  function markUnreadComments(ids) {
    if (!ids || !ids.length) return;
    ids.forEach((id) => unread.ids.add(String(id)));
    saveUnread();
    renderUnread();
    ensureUnreadWatcher();
  }
  function markUnreadStatus() {
    unread.status = true;
    unread.statusSeenSince = 0;
    saveUnread();
    renderUnread();
    ensureUnreadWatcher();
  }
  document.addEventListener('visibilitychange', () => { try { if (state.applied) renderUnread(); } catch {} });
  function unreadCount() {
    return unread.ids.size + (unread.status ? 1 : 0);
  }
  function tabIsActive() {
    return document.visibilityState === 'visible' && document.hasFocus();
  }
  function commentEl(id) {
    return q1('#uhub-sidebar-scroll #comment-' + CSS.escape(id));
  }
  // Comentario visivel de verdade na coluna (abaixo do campo fixo de comentario, dentro da area que rola,
  // coluna nao minimizada)
  function commentIsVisible(el) {
    if (!el || (document.documentElement.classList.contains('uhub-comments-collapsed') && !cstackOn())) return false;
    const sa = gid('uhub-sidebar-scroll');
    if (!sa) return false;
    const sr = sa.getBoundingClientRect();
    const add = gid('addcomment');
    const top = Math.max(sr.top, 0, add ? add.getBoundingClientRect().bottom : sr.top);
    const bottom = Math.min(sr.bottom, window.innerHeight);
    const r = el.getBoundingClientRect();
    if (!r.height) return false;
    const visible = Math.min(r.bottom, bottom) - Math.max(r.top, top);
    return visible >= Math.min(r.height * 0.5, 60);
  }
  let unreadSyncCounter = 0;
  function unreadTick() {
    unreadSyncCounter = (unreadSyncCounter + 1) % 4;
    const stored = unreadSyncCounter === 0 ? readUnreadStore()[state.issueKey] : { ids: [...unread.ids], status: unread.status };
    let changed = false;
    const storedIds = new Set((stored && stored.ids) || []);
    [...unread.ids].forEach((id) => {
      if (!storedIds.has(id)) { unread.ids.delete(id); changed = true; }
    });
    if (unread.status && !(stored && stored.status)) { unread.status = false; changed = true; }
    const now = Date.now();
    const active = tabIsActive();
    [...unread.ids].forEach((id) => {
      const el = commentEl(id);
      if (el && !el.classList.contains('uhub-unread')) el.classList.add('uhub-unread');
      if (active && commentIsVisible(el)) {
        if (!unread.seenSince.has(id)) unread.seenSince.set(id, now);
        else if (now - unread.seenSince.get(id) >= UNREAD_SEEN_MS) {
          unread.ids.delete(id);
          unread.seenSince.delete(id);
          if (el) el.classList.remove('uhub-unread');
          setReadAt(id, now);
          changed = true;
        }
      } else {
        unread.seenSince.delete(id);
      }
    });
    if (unread.status) {
      if (active) {
        if (!unread.statusSeenSince) unread.statusSeenSince = now;
        else if (now - unread.statusSeenSince >= UNREAD_SEEN_MS) {
          unread.status = false;
          unread.statusSeenSince = 0;
          changed = true;
        }
      } else unread.statusSeenSince = 0;
    }
    if (changed) saveUnread();
    renderUnread();
    if (!unreadCount()) stopUnreadWatcher();
  }
  function ensureUnreadWatcher() {
    if (unread.timer) return;
    unread.timer = setInterval(unreadTick, 125);
  }
  function stopUnreadWatcher() {
    if (unread.timer) {
      clearInterval(unread.timer);
      unread.timer = null;
    }
  }
  // ---------- titulo da aba ---------- Prefixos do titulo da aba: "(N) ● " (nao lidos) e "⏳3h " (aguardando
  // voce)
  const TITLE_PREFIX_RE = /^(\(\d+\) ● )?(⏳\S+ )?/;
  let titleWaitingLabel = '';
  // Selo da aba (titulo e favicon): some na hora em que a aba fica visivel; os comentarios continuam destacados
  // ate voce le-los
  function tabBadgeCount() {
    return document.visibilityState === 'visible' ? 0 : unreadCount();
  }
  function wantedTitle(base) {
    const n = tabBadgeCount();
    return `${n > 0 ? `(${n}) ● ` : ''}${titleWaitingLabel ? `⏳${titleWaitingLabel} ` : ''}${base}`;
  }
  function applyTitle() {
    const cur = document.title;
    const base = cur.replace(TITLE_PREFIX_RE, '');
    unread.baseTitle = base;
    const want = wantedTitle(base);
    if (cur !== want) document.title = want;
  }
  function watchTitle() {
    const t = q1('title');
    if (!t || unread.titleObserver) return;
    unread.titleObserver = new MutationObserver(() => {
      const base = document.title.replace(TITLE_PREFIX_RE, '');
      if (document.title !== wantedTitle(base)) applyTitle();
    });
    unread.titleObserver.observe(t, { childList: true, characterData: true, subtree: true });
  }
  // ---------- favicon com contador ----------
  function iconLinks() {
    return [...qa('link[rel~="icon"], link[rel="shortcut icon"]')];
  }
  function loadBaseIcon() {
    return new Promise((resolve) => {
      if (unread.iconBaseTried) return resolve(unread.iconBase);
      unread.iconBaseTried = true;
      const link = iconLinks()[0];
      const href = (link && link.href) || `${location.origin}/favicon.ico`;
      const img = new Image();
      img.onload = () => { unread.iconBase = img; resolve(img); };
      img.onerror = () => resolve(null);
      img.src = href;
    });
  }
  function drawBadgeIcon(n, base) {
    const size = 32;
    const c = mk('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    try {
      if (base) g.drawImage(base, 0, 0, size, size);
      else {
        g.fillStyle = '#0052cc';
        g.beginPath();
        g.arc(16, 16, 14, 0, Math.PI * 2);
        g.fill();
      }
    } catch {}
    const label = n > 9 ? '9+' : String(n);
    const r = 11;
    const cx = size - r;
    const cy = r;
    g.fillStyle = '#de350b';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = `bold ${label.length > 1 ? 13 : 16}px Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, cx, cy + 1);
    try { return c.toDataURL('image/png'); } catch (e) {
      return base ? drawBadgeIcon(n, null) : null;
    }
  }
  async function applyFavicon(n) {
    if (n > 0) {
      if (!unread.iconOriginals) {
        let links = iconLinks();
        if (!links.length) {
          const l = mk('link');
          l.rel = 'icon';
          l.dataset.uhubCreated = '1';
          document.head.appendChild(l);
          links = [l];
        }
        unread.iconOriginals = links.map((el) => ({ el, href: el.getAttribute('href') }));
      }
      const base = await loadBaseIcon();
      if (tabBadgeCount() !== n) return;
      const url = drawBadgeIcon(n, base);
      if (!url) return;
      unread.iconOriginals.forEach(({ el }) => { el.setAttribute('href', url); });
    } else if (unread.iconOriginals) {
      unread.iconOriginals.forEach(({ el, href }) => {
        if (el.dataset.uhubCreated) el.remove();
        else if (href !== null) el.setAttribute('href', href);
      });
      unread.iconOriginals = null;
    }
  }
  function renderUnread() {
    const n = tabBadgeCount();
    const base = document.title.replace(TITLE_PREFIX_RE, '');
    if (n === unread.lastCount && document.title === wantedTitle(base)) return;
    const countChanged = n !== unread.lastCount;
    unread.lastCount = n;
    applyTitle();
    if (countChanged) applyFavicon(n);
    watchTitle();
  }
  function startUnread() {
    const stored = readUnreadStore()[state.issueKey];
    unread.ids = new Set(((stored && stored.ids) || []).map(String));
    unread.status = !!(stored && stored.status);
    unread.seenSince.clear();
    unread.statusSeenSince = 0;
    unread.lastCount = -1;
    renderUnread();
    if (unreadCount() && stored && !stored.summary) saveUnread();
    if (unreadCount()) ensureUnreadWatcher();
    startReminder();
  }
  // Lembrete de pendencias: repete uma notificacao-resumo a cada N minutos (padrao 30) enquanto houver
  // comentario/status nao lido em alguma issue. Uma unica notificacao por vez para todas as abas (trava
  // compartilhada); e enviada por uma aba que tenha pendencia, e clicar nela leva a essa aba.
  const REMINDER_LAST_KEY = 'uhub-reminder-last';
  const REMINDER_TICK_MS = 30000;
  const tabId = Math.random().toString(36).slice(2);
  let reminderTimer = null;
  function pendingIssues() {
    const all = readUnreadStore();
    const snoozed = readSnooze();
    return Object.keys(all)
      .map((key) => ({ key, ...all[key] }))
      .filter((v) => (v.ids && v.ids.length) || v.status)
      .filter((v) => !(snoozed[v.key] && snoozed[v.key].at > Date.now()))
      .sort((a, b) => (a.firstAt || a.at || 0) - (b.firstAt || b.at || 0));
  }
  function reminderText(list) {
    const name = (v) => v.summary || v.key;
    if (list.length === 1) {
      const v = list[0];
      const n = (v.ids ? v.ids.length : 0);
      const parts = [];
      if (n) parts.push(n === 1 ? '1 comentário não lido' : `${n} comentários não lidos`);
      if (v.status) parts.push('status não visto');
      return { title: name(v), text: `Lembrete: ${parts.join(' e ')}` };
    }
    const names = list.map(name);
    return {
      title: names.join(' · '),
      text: `Lembrete: ${list.length} issues com itens não lidos`,
    };
  }
  function reminderTick() {
    if (!state.applied || !prefs.reminderEnabled || !prefs.notifyEnabled) return;
    if (!unreadCount()) return;
    const intervalMs = prefs.reminderMin * 60000;
    const now = Date.now();
    const list = pendingIssues();
    if (!list.length) return;
    const due = list.filter((v) => now - (v.firstAt || v.at || now) >= intervalMs);
    if (!due.length) return;
    let last = {};
    try { last = JSON.parse(GM_getValue(REMINDER_LAST_KEY, '{}')) || {}; } catch (e) { last = {}; }
    if (last.at && now - last.at < intervalMs) return;
    if (tabIsActive() && !prefs.notifyWhenFocused) return;
    GM_setValue(REMINDER_LAST_KEY, JSON.stringify({ at: now, by: tabId }));
    setTimeout(() => {
      let cur = {};
      try { cur = JSON.parse(GM_getValue(REMINDER_LAST_KEY, '{}')) || {}; } catch (e) { cur = {}; }
      if (cur.by !== tabId) return;
      const { title, text } = reminderText(due);
      sendSystemNotification(title, text, () => {
        const first = [...unread.ids][0];
        focusComment(first || null);
      });
    }, 400 + Math.floor(Math.random() * 300));
  }
  function startReminder() {
    if (reminderTimer) return;
    reminderTimer = setInterval(reminderTick, REMINDER_TICK_MS);
  }
  function stopReminder() {
    if (reminderTimer) {
      clearInterval(reminderTimer);
      reminderTimer = null;
    }
  }
  function stopUnread() {
    stopReminder();
    stopUnreadWatcher();
    if (unread.titleObserver) {
      unread.titleObserver.disconnect();
      unread.titleObserver = null;
    }
    unread.ids = new Set();
    unread.status = false;
    unread.lastCount = -1;
    titleWaitingLabel = '';
    applyTitle();
    applyFavicon(0);
    qa('.uhub-unread').forEach((el) => el.classList.remove('uhub-unread'));
  }
  function notifyStatusChange(info) {
    markUnreadStatus();
    const key = state.issueKey;
    const who = info.by ? ` por ${info.by}` : '';
    showToast(`Status alterado para ${info.name}${who}`, 5000);
    if (!prefs.notifyEnabled) return;
    const focused = document.visibilityState === 'visible' && document.hasFocus();
    if (focused && !prefs.notifyWhenFocused) return;
    if (!claimNotification(`status:${key}:${info.id || info.name}:${info.stamp}`)) return;
    sendSystemNotification(issueTitleForNotif() || key, `Status: ${info.name}${who}`, () => {
      try { window.focus(); } catch {}
    });
  }
  function flushPendingStatus() {
    if (!statusState.pendingDoc || userIsBusyInToolbar()) return false;
    const doc = statusState.pendingDoc;
    const note = statusState.pendingNotify;
    statusState.pendingDoc = null;
    statusState.pendingNotify = null;
    const nudge = statusState.pendingNudge;
    statusState.pendingNudge = false;
    if (displayedStatusText() === displayedStatusText(doc)) return false;
    applyStatusDoc(doc);
    if (note) notifyStatusChange(note);
    if (nudge) nudgeStatus();
    return true;
  }
  // ---------- Anexos e datas: atualizacao automatica + aviso ----------
  // Junto com a verificacao de status (mesma consulta leve ao Jira), a cada ciclo o script tambem confere se a
  // data de atualizacao da issue, a lista de anexos ou o prazo mudaram. Se mudaram, baixa a pagina da issue e
  // troca na tela so os modulos Anexos e Datas, com as mesmas protecoes da atualizacao completa: nao mexe no
  // que voce esta editando (se algo estiver em edicao, tenta de novo em alguns segundos). Anexo novo de outra
  // pessoa e mudanca de prazo feita por outra pessoa geram aviso (toast + notificacao do navegador), igual a
  // comentarios e status. O que voce mesmo fez nao gera aviso.
  const LIVE_MODULE_IDS = ['attachmentmodule', 'datesmodule'];
  const extrasState = { key: '', updated: null, att: null, due: null, domDirty: false, retryAt: 0 };
  function resetExtrasState() {
    extrasState.key = '';
    extrasState.updated = null;
    extrasState.att = null;
    extrasState.due = null;
    extrasState.domDirty = false;
    extrasState.retryAt = 0;
  }
  function formatDueBr(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }
  function dueFieldLabel() {
    const el = gid('due-date');
    return (el && el.getAttribute('data-name')) || 'Prazo';
  }
  // Quem fez a ultima mudanca de prazo (para nao avisar voce sobre o que voce mesmo fez)
  async function lastDueChangeAuthor(key) {
    try {
      const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(key)}?fields=duedate&expand=changelog&_=${Date.now()}`, {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const hist = (data && data.changelog && data.changelog.histories) || [];
      for (let i = hist.length - 1; i >= 0; i -= 1) {
        const h = hist[i];
        if ((h.items || []).some((it) => it.fieldId === 'duedate' || String(it.field || '').toLowerCase() === 'duedate')) {
          return {
            name: ((h.author && (h.author.name || h.author.key)) || '').toLowerCase(),
            display: (h.author && h.author.displayName) || '',
            historyId: String(h.id || h.created || ''),
          };
        }
      }
    } catch (e) { /* sem autoria: avisa mesmo assim */ }
    return null;
  }
  function scrollToModule(id) {
    try { window.focus(); } catch (e) { /* ok */ }
    const el = gid(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function announceExtra(message, claimId, onclick) {
    markUnreadStatus();
    showToast(message, 5000);
    if (!prefs.notifyEnabled) return;
    const focused = document.visibilityState === 'visible' && document.hasFocus();
    if (focused && !prefs.notifyWhenFocused) return;
    if (!claimNotification(claimId)) return;
    sendSystemNotification(issueTitleForNotif() || state.issueKey, message, onclick);
  }
  async function handleExtras(rest, getDoc) {
    const key = state.issueKey;
    if (extrasState.key !== key) {
      resetExtrasState();
      extrasState.key = key;
    }
    const ids = rest.att ? rest.att.map((a) => a.id) : null;
    if (extrasState.updated === null) {
      extrasState.updated = rest.updated;
      extrasState.att = ids ? new Set(ids) : null;
      extrasState.due = rest.due;
      return;
    }
    const added = rest.att && extrasState.att ? rest.att.filter((a) => !extrasState.att.has(a.id)) : [];
    const removed = ids && extrasState.att ? [...extrasState.att].filter((id) => !ids.includes(id)) : [];
    const dueChanged = rest.due !== extrasState.due;
    const changed = !!(added.length || removed.length || dueChanged || rest.updated !== extrasState.updated);
    const retry = extrasState.domDirty && Date.now() >= extrasState.retryAt;
    if (!changed && !retry) return;
    const prevDue = extrasState.due;
    extrasState.updated = rest.updated;
    if (ids) extrasState.att = new Set(ids);
    extrasState.due = rest.due;
    // 1) tela: troca so Anexos e Datas, e so se de fato mudaram. Com o visualizador de anexos aberto, deixa
    // a troca para depois (tenta de novo a cada poucos segundos ate ele ser fechado).
    const viewer = gid('uhub-beta-viewer');
    if (false && viewer && !viewer.hidden) {
      extrasState.domDirty = true;
    } else {
      try {
        const doc = await getDoc();
        const mods = FULL_REFRESH_MODULES.filter(([id]) => LIVE_MODULE_IDS.includes(id));
        const report = applyModuleList(doc, mods, { replaced: [], skipped: [] });
        extrasState.domDirty = report.skipped.length > 0;
        bvLiveSync();
      } catch (err) {
        if (err && err.kind === 'session') throw err;
        extrasState.domDirty = true;
        console.warn('[Jira layout] atualização de anexos/datas:', err);
      }
    }
    if (extrasState.domDirty) extrasState.retryAt = Date.now() + 5000;
    // 2) avisos (so quando algo realmente mudou, nunca numa simples nova tentativa da tela)
    if (!changed) return;
    const me = currentUser();
    const fromOthers = added.filter((a) => !(me && a.by === me));
    if (fromOthers.length) {
      const who = [...new Set(fromOthers.map((a) => a.byDisplay).filter(Boolean))];
      const byTxt = who.length ? ` · ${who.slice(0, 3).join(', ')}${who.length > 3 ? '…' : ''}` : '';
      const nm = fromOthers[0].name.length > 80 ? `${fromOthers[0].name.slice(0, 79)}…` : fromOthers[0].name;
      const msg = fromOthers.length === 1 ? `📎 Novo anexo: ${nm}${byTxt}` : `📎 ${fromOthers.length} novos anexos${byTxt}`;
      announceExtra(msg, `att:${key}:${fromOthers.map((a) => a.id).join(',')}`, () => scrollToModule('attachmentmodule'));
    }
    if (dueChanged) {
      const author = await lastDueChangeAuthor(key);
      if (!(author && me && author.name === me)) {
        const label = dueFieldLabel();
        const fmt = (v) => formatDueBr(v) || 'sem data';
        const who = author && author.display ? ` · ${author.display}` : '';
        const msg = rest.due
          ? `📅 ${label}: ${fmt(prevDue)} → ${fmt(rest.due)}${who}`
          : `📅 ${label} removido (era ${fmt(prevDue)})${who}`;
        announceExtra(msg, `due:${key}:${rest.due}:${(author && author.historyId) || ''}`, () => scrollToModule('datesmodule'));
      }
    }
  }
  // ---------- fim: anexos e datas ----------
  // Retorna true se o status mudou (tela atualizada ou pendente)
  async function checkIssueStatus({ firstRun, commentFromOthers, pageDoc = null }) {
    const key = state.issueKey;
    statusState.cycle += 1;
    let docMemo = pageDoc;
    const getDoc = async () => {
      if (!docMemo) docMemo = await fetchIssuePageDoc();
      return docMemo;
    };
    if (statusState.pendingDoc) {
      flushPendingStatus();
      if (statusState.pendingDoc) return false;
    }
    let rest = null;
    if (statusState.restOk) {
      try {
        rest = await fetchStatusRest(key);
      } catch (err) {
        if (err.kind === 'session') throw err;
        if (err.kind === 'rest-unavailable') statusState.restOk = false;
        else throw err;
      }
    }
    if (rest) {
      try {
        await handleExtras(rest, getDoc);
      } catch (err) {
        if (err && err.kind === 'session') throw err;
        console.warn('[Jira layout] anexos/datas:', err);
      }
    }
    if (rest) {
      if (firstRun || statusState.id === null) {
        statusState.id = rest.id;
        return false;
      }
      if (rest.id === statusState.id) return false;
    } else if (firstRun || statusState.cycle % 4 !== 0) {
      return false;
    }
    const doc = await getDoc();
    const newText = displayedStatusText(doc);
    if (rest) statusState.id = rest.id;
    if (!newText || newText === displayedStatusText()) return false;
    const author = await lastStatusChangeAuthor(key);
    const me = currentUser();
    const byMe = !!(author && me && author.name === me);
    const note = (!commentFromOthers && !byMe)
      ? { id: rest ? rest.id : '', name: (rest && rest.name) || newText, by: author ? author.display : '', stamp: (author && author.historyId) || String(Math.floor(Date.now() / 600000)) }
      : null;
    if (userIsBusyInToolbar()) {
      statusState.pendingDoc = doc;
      statusState.pendingNotify = note;
      statusState.pendingNudge = !byMe;
      return true;
    }
    applyStatusDoc(doc);
    if (note) notifyStatusChange(note);
    if (!byMe) nudgeStatus();
    return true;
  }
  // Lembrete sutil para mudar o status: depois que VOCE comenta, ou quando outra pessoa muda o status, o
  // botao de status pulsa de leve por ~10 s (para na hora se voce clicar nele). Sobrevive ao Jira redesenhar a toolbar.
  let statusNudgeUntil = 0;
  function nudgeStatus() {
    statusNudgeUntil = Date.now() + 10000;
    syncStatusNudge();
    clearTimeout(nudgeStatus.t);
    nudgeStatus.t = setTimeout(syncStatusNudge, 10050);
  }
  function syncStatusNudge() {
    const on = state.applied && Date.now() < statusNudgeUntil;
    qa('#opsbar-opsbar-transitions').forEach((li) => { if (li.classList.contains('uhub-status-nudge') !== on) li.classList.toggle('uhub-status-nudge', on); });
  }
  document.addEventListener('pointerdown', (ev) => {
    if (statusNudgeUntil && ev.target.closest && ev.target.closest('#opsbar-opsbar-transitions')) { statusNudgeUntil = 0; syncStatusNudge(); }
  }, true);
  function handleCheckError(err) {
    const kind = err && err.kind;
    if (kind === 'session') {
      auto.stopped = true;
      stopAutoRefreshTimer();
      setStatus('Pausado: sua sessão do Jira expirou. Recarregue a página para retomar.');
      showToast('Sessão do Jira expirou — recarregue a página', 8000);
      return;
    }
    auto.failures += 1;
    const wait = Math.min(MAX_BACKOFF_SEC, currentIntervalSec() * Math.pow(2, auto.failures));
    const reason = kind === 'network' ? 'sem conexão' : 'falha ao consultar o Jira';
    setStatus(`${reason[0].toUpperCase() + reason.slice(1)} · nova tentativa em ${wait}s`);
    console.warn('[Jira layout] atualização de comentários:', err);
  }
  function nextDelaySec() {
    const base = currentIntervalSec();
    if (!auto.failures) return base;
    return Math.min(MAX_BACKOFF_SEC, base * Math.pow(2, auto.failures));
  }
  function scheduleAutoRefresh(delaySec) {
    stopAutoRefreshTimer();
    if (!prefs.autoRefresh || auto.stopped || !state.applied) return;
    auto.timer = setTimeout(runAutoCycle, Math.max(0.15, delaySec) * 1000);
  }
  async function runAutoCycle() {
    auto.timer = null;
    if (!prefs.autoRefresh || auto.stopped || !state.applied) return;
    try {
      if (!hubFeeds()) await checkForChanges();
    } catch (err) {
      handleCheckError(err);
    }
    scheduleAutoRefresh(nextDelaySec());
  }
  function stopAutoRefreshTimer() {
    if (auto.timer) {
      clearTimeout(auto.timer);
      auto.timer = null;
    }
  }
  function onVisibilityForAutoRefresh() {
    if (!prefs.autoRefresh || auto.stopped || !state.applied) return;
    refreshAutoStatusText();
    if (auto.running) return;
    if (isTabVisible()) {
      const elapsedSec = (Date.now() - auto.lastCheckAt) / 1000;
      const wait = elapsedSec >= ACTIVE_TAB_SEC ? 0.15 : Math.max(0.15, ACTIVE_TAB_SEC - elapsedSec);
      scheduleAutoRefresh(wait);
    } else {
      scheduleAutoRefresh(nextDelaySec());
    }
  }
  function onOnlineForAutoRefresh() {
    if (!prefs.autoRefresh || auto.stopped || !state.applied) return;
    auto.failures = 0;
    scheduleAutoRefresh(0.2);
  }
  // ---------- Verificacao compartilhada entre abas ----------
  // Varias abas de issues abertas nao precisam perguntar ao Jira cada uma por si. Uma aba "central" (a que
  // esta a vista; se nenhuma estiver, a de menor id) pergunta por TODAS as issues abertas numa unica consulta
  // (/rest/api/2/search: so data de atualizacao e status) e avisa as outras pelo BroadcastChannel. Cada aba,
  // ao ver que a SUA issue mudou, roda na hora a verificacao completa (comentarios, status, anexos, datas).
  // Aba a vista: continua com o proprio ciclo completo de sempre (1s). Aba escondida: alem de reagir na hora ao
  // aviso da central, ainda faz a verificacao completa a cada 30s (ou 2x o intervalo de 2o plano, o que for
  // maior) como rede de seguranca. Se a central falhar ou sumir, as abas voltam sozinhas ao modo antigo.
  const HUB_BEAT_MS = 2000;
  const HUB_PEER_TTL_MS = 6500;
  const HUB_SAFETY_HIDDEN_SEC = 30;
  const HUB_MAX_KEYS = 50;
  const HUB_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/i;
  const hub = {
    started: false, ch: null, beatTimer: null, pollTimer: null, polling: false,
    peers: new Map(), token: null, lastData: 0, lastFull: 0, lastStatusAt: 0,
    checking: false, rerun: false, sentBye: false, fails: 0, blockedUntil: 0,
  };
  function hubWanted() {
    return !!(prefs.sharedPolling && prefs.autoRefresh && state.applied && !auto.stopped && state.issueKey
      && typeof BroadcastChannel === 'function');
  }
  function hubSend(m) {
    try { if (hub.ch) hub.ch.postMessage(m); } catch (e) { /* canal fechado */ }
  }
  function hubPeersFresh() {
    const now = Date.now();
    const list = [];
    hub.peers.forEach((p, id) => {
      if (now - p.at > HUB_PEER_TTL_MS) hub.peers.delete(id);
      else list.push({ id, key: p.key, vis: p.vis });
    });
    list.push({ id: tabId, key: state.issueKey, vis: isTabVisible() });
    return list;
  }
  // Mesma regra em todas as abas, entao todas chegam a mesma central: a de menor id entre as que estao a vista;
  // se nenhuma estiver a vista, a de menor id entre todas.
  function hubLeaderId(list) {
    const vis = list.filter((p) => p.vis);
    return (vis.length ? vis : list).map((p) => p.id).sort()[0];
  }
  function hubLabel() {
    if (!hub.started || !hubWanted()) return '';
    const peers = hubPeersFresh();
    if (peers.length < 2) return '';
    if (hubLeaderId(peers) === tabId) return ' · esta aba verifica para todas';
    return hub.lastData && Date.now() - hub.lastData < 15000 ? ' · verificação feita por outra aba' : '';
  }
  function hubBeat() {
    if (!hub.started) return;
    if (!hubWanted()) {
      if (!hub.sentBye) { hubSend({ t: 'bye', id: tabId }); hub.sentBye = true; }
      hub.lastData = 0;
      hub.token = null;
      return;
    }
    hub.sentBye = false;
    hubSend({ t: 'hb', id: tabId, key: state.issueKey, vis: isTabVisible() });
    hubLoopKick();
  }
  function hubOnMessage(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hb' && m.id) {
      hub.peers.set(m.id, { key: m.key, vis: !!m.vis, at: Date.now() });
      hubLoopKick();
    } else if (m.t === 'bye' && m.id) {
      hub.peers.delete(m.id);
      hubLoopKick();
    } else if (m.t === 'hello' && m.id !== tabId) {
      if (hubWanted()) hubSend({ t: 'hb', id: tabId, key: state.issueKey, vis: isTabVisible() });
    } else if (m.t === 'data') {
      hubOnData(m);
    }
  }
  // Chegou o "resumo" da central: se a data de atualizacao ou o status da MINHA issue mudou, verifica tudo agora
  function hubOnData(m) {
    if (!hub.started || !hubWanted() || !m || !m.items) return;
    const it = m.items[String(state.issueKey || '').toUpperCase()];
    if (!it) return;
    const now = Date.now();
    hub.lastData = now;
    if (!auto.lastCheckAt || m.at > auto.lastCheckAt) auto.lastCheckAt = Math.min(m.at || now, now);
    const token = `${it.u}|${it.s}`;
    if (hub.token === null) hub.token = token;
    else if (token !== hub.token) { hub.token = token; hubTriggerCheck(); }
    if (now - hub.lastStatusAt > 5000) { hub.lastStatusAt = now; try { refreshAutoStatusText(); } catch (e) { /* ok */ } }
  }
  async function hubTriggerCheck() {
    if (hub.checking) { hub.rerun = true; return; }
    hub.checking = true;
    try {
      for (let n = 0; n < 20; n += 1) {
        hub.rerun = false;
        let r;
        try { r = await checkForChanges(); } catch (err) { handleCheckError(err); break; }
        if (r === 'busy') { hub.rerun = true; await sleep(200); }
        if (!hub.rerun) break;
      }
    } finally { hub.checking = false; }
  }
  // true = a central esta me mantendo em dia; o ciclo proprio desta aba pode pular a consulta ao Jira
  function hubFeeds() {
    if (!hub.started || !hubWanted()) return false;
    if (isTabVisible()) return false;
    if (hub.checking) return true;
    if (auto.failures || auto.pendingDomUpdate || statusState.pendingDoc) return false;
    const now = Date.now();
    const expectSec = hubPeersFresh().some((p) => p.vis) ? ACTIVE_TAB_SEC : prefs.autoRefreshSec;
    if (!hub.lastData || now - hub.lastData > Math.max(5, expectSec * 3) * 1000) return false;
    const safetySec = Math.max(HUB_SAFETY_HIDDEN_SEC, prefs.autoRefreshSec * 2);
    return now - hub.lastFull < safetySec * 1000;
  }
  async function hubFetchOne(key) {
    const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(key)}?fields=updated,status&_=${Date.now()}`, {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
    });
    if (res.status === 401) throw new RefreshError('session', 'HTTP 401');
    if (!res.ok) throw new RefreshError('http', 'HTTP ' + res.status);
    const d = await res.json();
    const f = (d && d.fields) || {};
    return { key: String((d && d.key) || key).toUpperCase(), u: String(f.updated || ''), s: String((f.status && f.status.id) || '') };
  }
  async function hubFetch(keys) {
    const jql = `key in (${keys.join(',')})`;
    const res = await fetch(`${jiraBaseUrl()}/rest/api/2/search?jql=${encodeURIComponent(jql)}&fields=updated,status&maxResults=${HUB_MAX_KEYS}&validateQuery=false&_=${Date.now()}`, {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
    });
    if (res.status === 401) throw new RefreshError('session', 'HTTP 401');
    if (res.status === 400) {
      // alguma chave invalida/inexistente derrubou a consulta conjunta: pergunta uma a uma so desta vez
      const out = {};
      const all = await Promise.allSettled(keys.map(hubFetchOne));
      all.forEach((r) => { if (r.status === 'fulfilled') out[r.value.key] = { u: r.value.u, s: r.value.s }; });
      if (!Object.keys(out).length) throw new RefreshError('http', 'HTTP 400');
      return out;
    }
    if (!res.ok) throw new RefreshError(res.status === 403 || res.status === 404 ? 'rest-unavailable' : 'http', 'HTTP ' + res.status);
    if (!(res.headers.get('content-type') || '').includes('json')) throw new RefreshError('rest-unavailable', 'resposta nao-JSON');
    const data = await res.json();
    if (!data || !Array.isArray(data.issues)) throw new RefreshError('rest-unavailable', 'formato inesperado');
    const items = {};
    data.issues.forEach((i) => {
      const f = i.fields || {};
      items[String(i.key).toUpperCase()] = { u: String(f.updated || ''), s: String((f.status && f.status.id) || '') };
    });
    return items;
  }
  function hubLoopKick() {
    if (!hub.started || hub.pollTimer || hub.polling || !hubWanted()) return;
    hub.pollTimer = setTimeout(hubLeaderTick, 0);
  }
  async function hubLeaderTick() {
    hub.pollTimer = null;
    if (!hub.started || !hubWanted()) return;
    const peers = hubPeersFresh();
    if (hubLeaderId(peers) !== tabId || Date.now() < hub.blockedUntil) {
      hub.pollTimer = setTimeout(hubLeaderTick, 1000);
      return;
    }
    let delay = peers.some((p) => p.vis) ? ACTIVE_TAB_SEC : prefs.autoRefreshSec;
    hub.polling = true;
    try {
      const keys = [...new Set(peers.map((p) => p.key).filter((k) => HUB_KEY_RE.test(k || '')).map((k) => k.toUpperCase()))].slice(0, HUB_MAX_KEYS);
      if (keys.length) {
        if (navigator.onLine === false) throw new RefreshError('network', 'sem conexão');
        const items = await hubFetch(keys);
        hub.fails = 0;
        const msg = { t: 'data', from: tabId, at: Date.now(), items };
        hubSend(msg);
        hubOnData(msg);
      }
    } catch (err) {
      hub.fails += 1;
      if (err && err.kind === 'rest-unavailable') hub.blockedUntil = Date.now() + 10 * 60000;
      delay = Math.min(MAX_BACKOFF_SEC, delay * Math.pow(2, Math.min(hub.fails, 6)));
      try { diag({ kind: 'hub-poll', error: String((err && err.message) || err).slice(0, 200) }); } catch (e) { /* ok */ }
    } finally { hub.polling = false; }
    if (hub.started && hubWanted()) hub.pollTimer = setTimeout(hubLeaderTick, Math.max(0.5, delay) * 1000);
  }
  function hubStart() {
    if (hub.started || typeof BroadcastChannel !== 'function') return;
    try {
      hub.ch = new BroadcastChannel('uhub-shared-poll-v1');
      hub.ch.onmessage = (ev) => hubOnMessage(ev.data);
    } catch (e) { hub.ch = null; return; }
    hub.started = true;
    hub.peers.clear();
    hub.token = null;
    hub.lastData = 0;
    hub.lastFull = 0;
    hub.fails = 0;
    hub.blockedUntil = 0;
    hub.sentBye = false;
    document.addEventListener('visibilitychange', hubBeat);
    // Aba nova: se apresenta e espera um instante a resposta das outras antes de decidir se e a central
    // (assim nao faz uma consulta a toa so porque ainda nao conhecia as demais abas).
    hub.pollTimer = setTimeout(hubLeaderTick, 400);
    hubBeat();
    hubSend({ t: 'hello', id: tabId });
    hub.beatTimer = setInterval(hubBeat, HUB_BEAT_MS);
  }
  function hubStop() {
    if (!hub.started) return;
    hub.started = false;
    hubSend({ t: 'bye', id: tabId });
    clearInterval(hub.beatTimer);
    clearTimeout(hub.pollTimer);
    hub.beatTimer = null;
    hub.pollTimer = null;
    document.removeEventListener('visibilitychange', hubBeat);
    try { if (hub.ch) hub.ch.close(); } catch (e) { /* ok */ }
    hub.ch = null;
    hub.peers.clear();
    hub.token = null;
    hub.lastData = 0;
  }
  // ---------- fim: verificacao compartilhada entre abas ----------
  function startAutoRefresh() {
    auto.stopped = false;
    auto.failures = 0;
    auto.seenIds = null;
    auto.lastSignature = null;
    auto.pendingDomUpdate = false;
    auto.restAvailable = true;
    resetStatusState();
    startUnread();
    document.addEventListener('visibilitychange', onVisibilityForAutoRefresh);
    window.addEventListener('online', onOnlineForAutoRefresh);
    hubStart();
    setStatus(autoStatusSummary());
    if (prefs.autoRefresh) scheduleAutoRefresh(isTabVisible() ? 1 : 2);
  }
  function stopAutoRefresh() {
    hubStop();
    stopAutoRefreshTimer();
    stopUnread();
    document.removeEventListener('visibilitychange', onVisibilityForAutoRefresh);
    window.removeEventListener('online', onOnlineForAutoRefresh);
  }
  // ---------- refresh manual (botao) ----------
  async function refreshComments() {
    if (state.refreshing || auto.running) return;
    const btn = gid('uhub-refresh-btn');
    const body = scrollAreaEl();
    state.refreshing = true;
    if (btn) btn.classList.add('uhub-spinning');
    if (body) body.classList.add('uhub-loading');
    try {
      auto.stopped = false;
      if (!state.issueKey) state.issueKey = getIssueKey();
      const pageDoc = await fetchIssuePageDoc({ fresh: true });
      const result = await checkForChanges({ manual: true, pageDoc });
      const report = applyFullIssueDoc(pageDoc);
      if (result === 'updated' || result === 'unchanged') {
        const toast = gid('uhub-refresh-toast');
        if (!toast || !toast.classList.contains('uhub-show')) {
          showToast(report.skipped.length
            ? `Atualizado · exceto ${report.skipped.join(', ')} (em edição)`
            : 'Tudo atualizado', report.skipped.length ? 4000 : 1600);
        }
      }
      if (prefs.autoRefresh) scheduleAutoRefresh(nextDelaySec());
    } catch (err) {
      handleCheckError(err);
      if (err.kind !== 'session') showToast('Não foi possível atualizar agora', 3000);
    } finally {
      state.refreshing = false;
      if (btn) btn.classList.remove('uhub-spinning');
      if (body) body.classList.remove('uhub-loading');
    }
  }
  // ---------- secao no painel de ajustes ----------
  function buildCheckboxRow(key, label) {
    const row = mk('label');
    row.className = 'sp-check';
    const input = mk('input');
    input.type = 'checkbox';
    input.checked = !!prefs[key];
    input.dataset.key = key;
    const span = mk('span');
    span.textContent = label;
    row.appendChild(input);
    row.appendChild(span);
    row.appendChild(makeParamResetButton(key, AUTO_DEFAULTS[key] ? 'ativado' : 'desativado'));
    return { row, input };
  }
  function buildAutoRefreshSection() {
    const wrap = mk('div');
    wrap.className = 'sp-section';
    wrap.innerHTML = '<div class="sp-section-title">Atualização de comentários</div>';
    const auto1 = buildCheckboxRow('autoRefresh', 'Atualizar automaticamente');
    auto1.input.addEventListener('change', () => {
      savePref('autoRefresh', auto1.input.checked);
      if (prefs.autoRefresh) {
        auto.stopped = false;
        auto.failures = 0;
        scheduleAutoRefresh(0.2);
      } else {
        stopAutoRefreshTimer();
        setStatus('Atualização automática desligada');
      }
      interval.input.disabled = !prefs.autoRefresh;
    });
    wrap.appendChild(auto1.row);
    const hubChk = buildCheckboxRow('sharedPolling', 'Compartilhar a verificação entre abas (uma aba pergunta ao Jira por todas)');
    hubChk.input.addEventListener('change', () => savePref('sharedPolling', hubChk.input.checked));
    wrap.appendChild(hubChk.row);
    const interval = mk('div');
    interval.className = 'sp-field';
    const lbl = mk('label');
    const lblText = mk('span');
    lblText.textContent = 'Intervalo (aba em segundo plano)';
    const val = mk('span');
    val.className = 'sp-val';
    val.textContent = `${prefs.autoRefreshSec}s`;
    lbl.appendChild(lblText);
    lbl.appendChild(val);
    lbl.appendChild(makeParamResetButton('autoRefreshSec', `${AUTO_DEFAULTS.autoRefreshSec}s`));
    interval.input = mk('input');
    interval.input.type = 'range';
    interval.input.dataset.key = 'autoRefreshSec';
    interval.input.min = AUTO_LIMITS.autoRefreshSec.min;
    interval.input.max = AUTO_LIMITS.autoRefreshSec.max;
    interval.input.step = 15;
    interval.input.value = prefs.autoRefreshSec;
    interval.input.disabled = !prefs.autoRefresh;
    interval.input.addEventListener('input', () => { val.textContent = `${interval.input.value}s`; });
    interval.input.addEventListener('change', () => {
      savePref('autoRefreshSec', Number(interval.input.value));
      val.textContent = `${prefs.autoRefreshSec}s`;
      if (prefs.autoRefresh && !auto.stopped) {
        refreshAutoStatusText();
        if (!isTabVisible()) scheduleAutoRefresh(nextDelaySec());
      }
    });
    const hint = mk('div');
    hint.className = 'sp-hint';
    hint.textContent = 'Com a aba aberta e ativa, a verificação ocorre a cada 1s. Este intervalo vale quando a aba estiver em segundo plano (padrão 15s).';
    interval.appendChild(lbl);
    interval.appendChild(interval.input);
    interval.appendChild(hint);
    wrap.appendChild(interval);
    const n1 = buildCheckboxRow('notifyEnabled', 'Notificações do navegador para comentários novos');
    n1.input.addEventListener('change', () => {
      savePref('notifyEnabled', n1.input.checked);
      n2.input.disabled = !prefs.notifyEnabled;
    });
    wrap.appendChild(n1.row);
    const n2 = buildCheckboxRow('notifyWhenFocused', 'Notificar também com a aba em foco');
    n2.input.disabled = !prefs.notifyEnabled;
    n2.input.addEventListener('change', () => savePref('notifyWhenFocused', n2.input.checked));
    wrap.appendChild(n2.row);
    const r1 = buildCheckboxRow('reminderEnabled', 'Lembrete de não lidos (repete até você ler)');
    r1.input.addEventListener('change', () => {
      savePref('reminderEnabled', r1.input.checked);
      rInterval.input.disabled = !prefs.reminderEnabled;
    });
    wrap.appendChild(r1.row);
    const rInterval = mk('div');
    rInterval.className = 'sp-field';
    const rLbl = mk('label');
    const rLblText = mk('span');
    rLblText.textContent = 'Repetir lembrete a cada';
    const rVal = mk('span');
    rVal.className = 'sp-val';
    rVal.textContent = `${prefs.reminderMin} min`;
    rLbl.appendChild(rLblText);
    rLbl.appendChild(rVal);
    rLbl.appendChild(makeParamResetButton('reminderMin', `${AUTO_DEFAULTS.reminderMin} min`));
    rInterval.input = mk('input');
    rInterval.input.type = 'range';
    rInterval.input.dataset.key = 'reminderMin';
    rInterval.input.min = AUTO_LIMITS.reminderMin.min;
    rInterval.input.max = AUTO_LIMITS.reminderMin.max;
    rInterval.input.step = 5;
    rInterval.input.value = prefs.reminderMin;
    rInterval.input.disabled = !prefs.reminderEnabled;
    rInterval.input.addEventListener('input', () => { rVal.textContent = `${rInterval.input.value} min`; });
    rInterval.input.addEventListener('change', () => {
      savePref('reminderMin', Number(rInterval.input.value));
      rVal.textContent = `${prefs.reminderMin} min`;
    });
    const rHint = mk('div');
    rHint.className = 'sp-hint';
    rHint.textContent = 'Uma notificação-resumo com todas as issues pendentes abertas em abas. Precisa das notificações ligadas.';
    rInterval.appendChild(rLbl);
    rInterval.appendChild(rInterval.input);
    rInterval.appendChild(rHint);
    wrap.appendChild(rInterval);
    const d1 = buildCheckboxRow('dueReminder', 'Lembrete de prazo (véspera, dia e se vencer sem concluir)');
    d1.input.disabled = !prefs.notifyEnabled;
    d1.input.addEventListener('change', () => {
      savePref('dueReminder', d1.input.checked);
      dHour.input.disabled = !prefs.dueReminder || !prefs.notifyEnabled;
    });
    wrap.appendChild(d1.row);
    const dHour = mk('div');
    dHour.className = 'sp-field';
    const dLbl = mk('label');
    const dLblText = mk('span');
    dLblText.textContent = 'Avisar a partir de';
    const dVal = mk('span');
    dVal.className = 'sp-val';
    const fmtHour = (h) => `${String(h).padStart(2, '0')}:00`;
    dVal.textContent = fmtHour(prefs.dueHour);
    dLbl.appendChild(dLblText);
    dLbl.appendChild(dVal);
    dLbl.appendChild(makeParamResetButton('dueHour', fmtHour(AUTO_DEFAULTS.dueHour)));
    dHour.input = mk('input');
    dHour.input.type = 'range';
    dHour.input.dataset.key = 'dueHour';
    dHour.input.min = AUTO_LIMITS.dueHour.min;
    dHour.input.max = AUTO_LIMITS.dueHour.max;
    dHour.input.step = 1;
    dHour.input.value = prefs.dueHour;
    dHour.input.disabled = !prefs.dueReminder || !prefs.notifyEnabled;
    dHour.input.addEventListener('input', () => { dVal.textContent = fmtHour(dHour.input.value); });
    dHour.input.addEventListener('change', () => {
      savePref('dueHour', Number(dHour.input.value));
      dVal.textContent = fmtHour(prefs.dueHour);
    });
    const dHint = mk('div');
    dHint.className = 'sp-hint';
    dHint.textContent = 'Vale para as issues Internal Review que você abriu. Funciona com qualquer issue do Jira aberta numa aba; não avisa se o prazo mudou ou a issue foi concluída.';
    dHour.appendChild(dLbl);
    dHour.appendChild(dHour.input);
    dHour.appendChild(dHint);
    wrap.appendChild(dHour);
    const sc = buildCheckboxRow('sendCheck', 'Conferir o comentário antes de enviar (anexo não citado, @ sem marcar, comentário novo)');
    sc.input.addEventListener('change', () => savePref('sendCheck', sc.input.checked));
    wrap.appendChild(sc.row);
    const test = mk('button');
    test.className = 'sp-reset';
    test.textContent = 'Testar notificação';
    test.addEventListener('click', () => {
      toggleSettingsPanel(false);
      runNotificationTest();
    });
    wrap.appendChild(test);
    const status = mk('div');
    status.id = 'uhub-auto-status';
    status.className = 'sp-hint sp-status';
    status.textContent = auto.status;
    wrap.appendChild(status);
    return wrap;
  }
  function syncPrefInputs() {
    const panel = gid('uhub-settings-panel');
    if (!panel) return;
    panel.querySelectorAll('.sp-check input[data-key]').forEach((input) => {
      input.checked = !!prefs[input.dataset.key];
    });
    const n2 = panel.querySelector('.sp-check input[data-key="notifyWhenFocused"]');
    if (n2) n2.disabled = !prefs.notifyEnabled;
    const range = panel.querySelector('input[data-key="autoRefreshSec"]');
    if (range) {
      range.disabled = !prefs.autoRefresh;
      range.value = prefs.autoRefreshSec;
      const v = range.closest('.sp-field') && range.closest('.sp-field').querySelector('.sp-val');
      if (v) v.textContent = `${prefs.autoRefreshSec}s`;
    }
    const rRange = panel.querySelector('input[data-key="reminderMin"]');
    if (rRange) {
      rRange.disabled = !prefs.reminderEnabled;
      rRange.value = prefs.reminderMin;
      const v = rRange.closest('.sp-field') && rRange.closest('.sp-field').querySelector('.sp-val');
      if (v) v.textContent = `${prefs.reminderMin} min`;
    }
    const dChk = panel.querySelector('.sp-check input[data-key="dueReminder"]');
    if (dChk) dChk.disabled = !prefs.notifyEnabled;
    const dRange = panel.querySelector('input[data-key="dueHour"]');
    if (dRange) {
      dRange.disabled = !prefs.dueReminder || !prefs.notifyEnabled;
      dRange.value = prefs.dueHour;
      const v = dRange.closest('.sp-field') && dRange.closest('.sp-field').querySelector('.sp-val');
      if (v) v.textContent = `${String(prefs.dueHour).padStart(2, '0')}:00`;
    }
    panel.querySelectorAll('.sp-choice').forEach(syncChoiceField);
    syncAllResetButtons();
  }
  // Indicador de notificacoes na .aui-toolbar2-primary Mostra num relance se a verificacao automatica esta
  // rodando e se as notificacoes estao ligadas e com entrega confirmada: verde = tudo ativo e entrega
  // confirmada pelo teste amarelo = ativo, mas a entrega ainda nao foi testada/confirmada vermelho = problema
  // (sessao expirada, falha de conexao, bloqueio) cinza = notificacoes ou verificacao automatica desligadas
  // Nenhum site/script consegue ler se o Windows/macOS esta bloqueando as notificacoes do Chrome; por isso a
  // "entrega" e confirmada pelo usuario no teste (e vale por 30 dias).
  const NOTIFY_CONFIRM_KEY = 'notifyConfirmedAt';
  const NOTIFY_CONFIRM_TTL = 30 * 24 * 3600 * 1000;
  // Ligado: sino preenchido (verde via CSS). Desligado: contorno riscado (cinza).
  const ICON_BELL_ON = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 6-2.6 8-3 8.3a.8.8 0 0 0 .5 1.45h18a.8.8 0 0 0 .5-1.45c-.4-.3-3-2.3-3-8.3A6.5 6.5 0 0 0 12 2.5Z" fill="currentColor"/><path d="M9.8 20.5a2.4 2.4 0 0 0 4.4 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const ICON_BELL_OFF = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.73 21a2 2 0 0 1-3.46 0"></path><path d="M18.63 13A17.9 17.9 0 0 1 18 8"></path><path d="M6.26 6.26A5.9 5.9 0 0 0 6 8c0 7-3 9-3 9h14"></path><path d="M18 8a6 6 0 0 0-9.33-5"></path><path d="M2 2l20 20"></path></svg>';
  function notificationsOn() { return !!(prefs.notifyEnabled && prefs.autoRefresh); }
  const notifyUi = { asking: false, showTips: false, lastTestAt: 0 };
  function usesGmNotification() {
    return typeof GM_notification === 'function';
  }
  function sitePermission() {
    if (usesGmNotification()) return 'extension';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }
  function confirmedAt() {
    const v = Number(GM_getValue(NOTIFY_CONFIRM_KEY, 0)) || 0;
    return (v && Date.now() - v < NOTIFY_CONFIRM_TTL) ? v : 0;
  }
  function fmtDate(ts) {
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function notifyHealth() {
    const perm = sitePermission();
    const monitor = !prefs.autoRefresh
      ? 'Desligado'
      : auto.stopped
        ? 'Pausado (sessão do Jira expirou)'
        : auto.failures
          ? `Com falha · ${auto.status}`
          : auto.lastCheckAt
            ? `Ativo · ${isTabVisible() ? `1s ativa / ${prefs.autoRefreshSec}s 2º plano` : `${prefs.autoRefreshSec}s (2º plano)`} · última ${new Date(auto.lastCheckAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : `Ativo · ${isTabVisible() ? `1s ativa / ${prefs.autoRefreshSec}s 2º plano` : `${prefs.autoRefreshSec}s (2º plano)`} · iniciando…`;
    const notif = !prefs.notifyEnabled ? 'Desligadas'
      : perm === 'denied' ? 'Bloqueadas pelo navegador'
        : perm === 'unsupported' ? 'Não suportadas neste navegador'
          : 'Ativadas';
    const conf = confirmedAt();
    const delivery = conf ? `Confirmada em ${fmtDate(conf)}` : 'Ainda não confirmada — faça o teste';
    let st;
    let summary;
    if (!prefs.autoRefresh || !prefs.notifyEnabled) {
      st = 'off';
      summary = !prefs.autoRefresh ? 'Verificação automática desligada' : 'Notificações desligadas';
    } else if (auto.stopped || auto.failures || perm === 'denied' || perm === 'unsupported') {
      st = 'error';
      summary = auto.stopped ? 'Pausado: recarregue a página'
        : auto.failures ? 'Falha ao consultar o Jira'
          : 'Notificações bloqueadas';
    } else if (!conf) {
      st = 'untested';
      summary = 'Ativas · entrega ainda não testada';
    } else {
      st = 'ok';
      summary = 'Ativas e funcionando';
    }
    return { st, summary, monitor, notif, delivery };
  }
  function buildNotifyIndicator() {
    const toolbar = q1('header#stalker .aui-toolbar2-primary')
      || q1('.aui-toolbar2-primary');
    if (!toolbar) return;
    if (toolbar.querySelector('#uhub-notify-status')) return;
    qa('#uhub-notify-status_container').forEach((el) => el.remove());
    const li = mk('li');
    li.id = 'uhub-notify-status_container';
    li.className = 'aui-buttons';
    const a = mk('a');
    a.id = 'uhub-notify-status';
    a.className = 'aui-button';
    a.href = '#';
    a.setAttribute('role', 'button');
    a.setAttribute('aria-haspopup', 'dialog');
    a.dataset.on = notificationsOn() ? '1' : '0';
    a.innerHTML = notificationsOn() ? ICON_BELL_ON : ICON_BELL_OFF;
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleNotifyPopover();
    });
    li.appendChild(a);
    toolbar.appendChild(li);
    updateNotifyIndicator();
  }
  function updateNotifyIndicator() {
    const h = notifyHealth();
    const btn = gid('uhub-notify-status');
    if (btn) {
      if (btn.dataset.state !== h.st) btn.dataset.state = h.st;
      const on = notificationsOn() ? '1' : '0';
      if (btn.dataset.on !== on) {
        btn.dataset.on = on;
        btn.innerHTML = on === '1' ? ICON_BELL_ON : ICON_BELL_OFF;
      }
      const title = `Notificações ${on === '1' ? 'ATIVADAS' : 'DESATIVADAS'} · ${h.summary}\nClique para opções, teste e ativar/desativar`;
      if (btn.title !== title) btn.title = title;
      btn.setAttribute('aria-label', `Opções de notificações de comentários — ${h.summary}`);
    }
    const pop = gid('uhub-notify-pop');
    if (pop && pop.classList.contains('uhub-open')) renderNotifyPopover();
  }
  function ensureNotifyPopover() {
    let pop = gid('uhub-notify-pop');
    if (pop) return pop;
    pop = mk('div');
    pop.id = 'uhub-notify-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Notificações de comentários');
    document.body.appendChild(pop);
    return pop;
  }
  function positionNotifyPopover() {
    const btn = gid('uhub-notify-status');
    const root = document.documentElement;
    let top = 120;
    let left = 16;
    if (btn) {
      const r = btn.getBoundingClientRect();
      top = Math.round(r.bottom + 6);
      left = Math.round(Math.min(Math.max(8, r.left), window.innerWidth - 328));
    }
    root.style.setProperty('--uhub-np-top', `${Math.max(8, top)}px`);
    root.style.setProperty('--uhub-np-left', `${Math.max(8, left)}px`);
  }
  function renderNotifyPopover() {
    const pop = ensureNotifyPopover();
    const h = notifyHealth();
    pop.dataset.state = h.st;
    pop.innerHTML = '';
    const head = mk('div');
    head.className = 'np-head';
    head.textContent = 'Notificações de comentários';
    pop.appendChild(head);
    const body = mk('div');
    body.className = 'np-body';
    const summary = mk('div');
    summary.className = 'np-summary';
    summary.innerHTML = '<i></i><span></span>';
    summary.querySelector('span').textContent = h.summary;
    body.appendChild(summary);
    const row = (label, value) => {
      const r = mk('div');
      r.className = 'np-row';
      const b = mk('b');
      b.textContent = label;
      const v = mk('span');
      v.textContent = value;
      r.appendChild(b);
      r.appendChild(v);
      body.appendChild(r);
    };
    row('Verificação', h.monitor);
    row('Notificações', h.notif);
    row('Entrega', h.delivery);
    row('Lembrete', prefs.reminderEnabled ? `A cada ${prefs.reminderMin} min enquanto houver não lidos` : 'Desligado');
    const nDue = Object.keys(readDueTrack()).length;
    row('Prazos', prefs.dueReminder ? `Véspera, dia e vencido, a partir das ${String(prefs.dueHour).padStart(2, '0')}:00 · ${nDue} ${nDue === 1 ? 'issue acompanhada' : 'issues acompanhadas'}` : 'Desligado');
    const sn = mk('div');
    sn.className = 'np-snooze';
    const snKey = state.issueKey || getIssueKey();
    const cur = snKey && readSnooze()[snKey];
    const snTitle = mk('b');
    snTitle.textContent = 'Lembrar desta issue';
    sn.appendChild(snTitle);
    const snRow = mk('div');
    snRow.className = 'np-snooze-row';
    if (cur && cur.at > Date.now()) {
      const t = mk('span');
      t.className = 'np-snooze-on';
      t.textContent = `Lembrete ${fmtClock(cur.at).startsWith('amanhã') ? '' : 'às '}${fmtClock(cur.at)}`;
      snRow.appendChild(t);
      const c = mk('button');
      c.type = 'button';
      c.textContent = 'Cancelar';
      c.addEventListener('click', (ev) => { ev.stopPropagation(); clearSnooze(); renderNotifyPopover(); });
      snRow.appendChild(c);
    } else {
      [['m30', '30 min'], ['h1', '1 h'], ['h3', '3 h'], ['tomorrow', `Amanhã ${String(prefs.dueHour || 8).padStart(2, '0')}:00`]].forEach(([k, label]) => {
        const b = mk('button');
        b.type = 'button';
        b.textContent = label;
        b.dataset.snooze = k;
        b.addEventListener('click', (ev) => { ev.stopPropagation(); setSnooze(k); renderNotifyPopover(); });
        snRow.appendChild(b);
      });
    }
    sn.appendChild(snRow);
    body.appendChild(sn);
    const actions = mk('div');
    actions.className = 'np-actions';
    const btn = (label, onClick, primary) => {
      const b = mk('button');
      b.type = 'button';
      b.textContent = label;
      if (primary) b.className = 'np-primary';
      b.addEventListener('click', (ev) => { ev.stopPropagation(); onClick(); });
      actions.appendChild(b);
      return b;
    };
    if (!prefs.autoRefresh || !prefs.notifyEnabled) {
      btn('Ativar notificações', () => {
        if (!prefs.notifyEnabled) savePref('notifyEnabled', true);
        if (!prefs.autoRefresh) {
          savePref('autoRefresh', true);
          auto.stopped = false;
          auto.failures = 0;
          scheduleAutoRefresh(0.5);
        }
        renderNotifyPopover();
      }, true);
    }
    if (prefs.autoRefresh && prefs.notifyEnabled) {
      btn('Desativar notificações', () => {
        savePref('notifyEnabled', false);
        renderNotifyPopover();
      });
    }
    if (sitePermission() !== 'unsupported') {
      btn('Enviar notificação de teste', () => runNotificationTest(), prefs.autoRefresh && prefs.notifyEnabled);
    }
    if (auto.stopped || auto.failures) btn('Verificar agora', () => refreshComments());
    btn('Ajustes', () => { toggleNotifyPopover(false); toggleSettingsPanel(true); });
    body.appendChild(actions);
    if (notifyUi.asking) {
      const ask = mk('div');
      ask.className = 'np-ask';
      const q = mk('div');
      q.textContent = 'A notificação de teste apareceu no seu computador?';
      ask.appendChild(q);
      const askActions = mk('div');
      askActions.className = 'np-actions';
      const yes = mk('button');
      yes.type = 'button';
      yes.className = 'np-primary';
      yes.textContent = 'Sim, apareceu';
      yes.addEventListener('click', (ev) => {
        ev.stopPropagation();
        GM_setValue(NOTIFY_CONFIRM_KEY, Date.now());
        notifyUi.asking = false;
        notifyUi.showTips = false;
        updateNotifyIndicator();
        renderNotifyPopover();
      });
      const no = mk('button');
      no.type = 'button';
      no.textContent = 'Não apareceu';
      no.addEventListener('click', (ev) => {
        ev.stopPropagation();
        GM_setValue(NOTIFY_CONFIRM_KEY, 0);
        notifyUi.asking = false;
        notifyUi.showTips = true;
        updateNotifyIndicator();
        renderNotifyPopover();
      });
      askActions.appendChild(yes);
      askActions.appendChild(no);
      ask.appendChild(askActions);
      body.appendChild(ask);
    }
    if (notifyUi.showTips) {
      const tips = mk('div');
      tips.className = 'np-ask';
      tips.innerHTML = '<div><b>O sistema está bloqueando as notificações do Chrome.</b> Verifique:</div>';
      const ul = mk('ul');
      ul.className = 'np-tips';
      const items = sitePermission() === 'extension'
        ? [
          'Windows: Configurações › Sistema › Notificações › "Google Chrome" ativado, e "Não perturbe" desligado.',
          'macOS: Ajustes do Sistema › Notificações › Google Chrome › Permitir notificações; modo Foco desligado.',
          'Depois de ajustar, clique em "Enviar notificação de teste" de novo.',
        ]
        : [
          'Clique no cadeado ao lado do endereço do site › Notificações › Permitir.',
          'Windows/macOS: permita notificações do Google Chrome nas configurações do sistema.',
          'Depois de ajustar, recarregue a página e teste de novo.',
        ];
      items.forEach((t) => {
        const li = mk('li');
        li.textContent = t;
        ul.appendChild(li);
      });
      tips.appendChild(ul);
      body.appendChild(tips);
    }
    pop.appendChild(body);
  }
  function toggleNotifyPopover(force) {
    const pop = gid('uhub-notify-pop');
    const isOpen = !!(pop && pop.classList.contains('uhub-open'));
    const shouldOpen = force !== undefined ? force : !isOpen;
    if (!shouldOpen) {
      if (pop) pop.classList.remove('uhub-open');
      notifyUi.showTips = false;
      if (!pop || !isOpen) return;
      const b = gid('uhub-notify-status');
      if (b) b.setAttribute('aria-expanded', 'false');
      return;
    }
    toggleSettingsPanel(false);
    toggleMetaPopover(false);
    renderNotifyPopover();
    positionNotifyPopover();
    ensureNotifyPopover().classList.add('uhub-open');
    const b = gid('uhub-notify-status');
    if (b) b.setAttribute('aria-expanded', 'true');
  }
  async function runNotificationTest() {
    const perm = sitePermission();
    if (perm === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    if (sitePermission() === 'denied') {
      notifyUi.asking = false;
      notifyUi.showTips = true;
      toggleNotifyPopover(true);
      updateNotifyIndicator();
      return;
    }
    notifyUi.lastTestAt = Date.now();
    sendSystemNotification(
      issueTitleForNotif() || 'Teste de notificação',
      'Se você está vendo isto, as notificações de comentários estão funcionando.',
      () => focusComment(null)
    );
    notifyUi.asking = true;
    notifyUi.showTips = false;
    toggleNotifyPopover(true);
  }
  // Botao de alternar entre layout otimizado e o padrao do Jira na topbar (#uhub-settings-header-nav).
  // Ao desligar, desfaz o layout e mantem apenas este icone na topbar para poder reativar na aba atual.
  function onLayoutToggleClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (state.applied) {
      state.userDisabled = true;
      resetLayout({ keepToggle: true });
      document.documentElement.classList.add('uhub-layout-off');
    } else {
      state.userDisabled = false;
      document.documentElement.classList.remove('uhub-layout-off');
      applyLayout();
    }
    syncLayoutToggle();
    refitHeader(true);
  }
  function buildLayoutToggle() {
    buildHeaderSettingsButton();
    syncLayoutToggle();
  }
  function syncLayoutToggle() {
    const btn = gid('uhub-layout-toggle');
    if (!btn) return;
    const on = !!state.applied;
    btn.classList.toggle('uhub-active', on);
    btn.setAttribute('aria-pressed', String(on));
    const icon = on ? ICON_LAYOUT_TOGGLE_ON : ICON_LAYOUT_TOGGLE_OFF;
    if (btn.innerHTML !== icon) btn.innerHTML = icon;
    const title = on
      ? 'Layout 3 colunas ativado (clique para voltar ao layout padrão do Jira)'
      : 'Layout padrão do Jira (clique para ativar o layout 3 colunas)';
    if (btn.title !== title) {
      btn.title = title;
      btn.setAttribute('aria-label', title);
    }
  }
  // Nav lateral esquerda: recolhida por padrao, com botao pra reexpandir
  // Nav lateral do Jira: o estado real e o do proprio Jira (body.aui-sidebar-collapsed, que ele lembra entre
  // paginas). O botao aciona o toggle nativo do Jira e a nossa classe so acompanha; usar o "«" do Jira tambem
  // sincroniza. Ao mudar, as colunas sao recalculadas (a nav ocupa 56px recolhida ou ~280px aberta).
  function nativeNavCollapsed() { return document.body.classList.contains('aui-sidebar-collapsed'); }
  function setNavCollapsed(collapsed) {
    const root = document.documentElement;
    if (nativeNavCollapsed() !== collapsed) { const t = q1('#sidebar .aui-sidebar-toggle'); if (t) t.click(); }
    root.classList.toggle('uhub-nav-collapsed', collapsed);
    syncNavToggle();
  }
  function syncNavToggle() {
    const btn = gid('uhub-nav-toggle');
    const collapsed = document.documentElement.classList.contains('uhub-nav-collapsed');
    if (btn) {
      const html = collapsed ? ICON_NAV_EXPAND : ICON_NAV_COLLAPSE;
      if (btn.innerHTML !== html) btn.innerHTML = html;
      btn.title = collapsed ? 'Expandir a navegação lateral' : 'Recolher a navegação lateral';
    }
    if (state.applied) { applyResponsive(); positionNavToggle(); measureEdgeFix(); }
  }
  let navObserver = null;
  function buildNavToggle() {
    if (!navObserver) {
      // "«" nativo (ou atalho "[") mudou o estado: a nossa classe acompanha
      navObserver = new MutationObserver(() => {
        if (!state.applied) return;
        const n = nativeNavCollapsed();
        if (n !== document.documentElement.classList.contains('uhub-nav-collapsed')) {
          document.documentElement.classList.toggle('uhub-nav-collapsed', n);
          syncNavToggle();
        }
      });
      navObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    if (gid('uhub-nav-toggle')) return;
    const btn = mk('button');
    btn.id = 'uhub-nav-toggle';
    btn.type = 'button';
    btn.addEventListener('click', () => setNavCollapsed(!document.documentElement.classList.contains('uhub-nav-collapsed')));
    document.body.appendChild(btn);
    syncNavToggle();
    positionNavToggle();
  }
  function positionNavToggle() {
    const btn = gid('uhub-nav-toggle');
    if (!btn) return;
    const collapsed = document.documentElement.classList.contains('uhub-nav-collapsed');
    const stalker = q1('header#stalker');
    const top = stalker ? stalker.getBoundingClientRect().top + window.scrollY + 8 : 64;
    btn.style.top = `${top}px`;
    btn.style.left = collapsed ? `${NAV_COLLAPSED_WIDTH + 4}px` : '284px';
  }
  // Altura combinada da topbar do Jira (#header) + cabecalho da issue (header#stalker). A sidebar de
  // comentarios (e o painel de config) comecam exatamente onde esses dois terminam, para pertencer a mesma
  // hierarquia vertical das colunas de conteudo e metadados — nunca ao lado da topbar nem do cabecalho da
  // issue. Recalculada sempre que a altura desses elementos muda (titulo que quebra em 2 linhas,
  // redimensionamento).
  let headerResizeObserver = null;
  function measureHeaderHeight() {
    const topbar = gid('header');
    const stalker = q1('header#stalker');
    const topbarH = topbar ? topbar.getBoundingClientRect().height : 0;
    const stalkerH = stalker ? stalker.getBoundingClientRect().height : 0;
    const bar = stalker && stalker.querySelector('.command-bar, .ops-menus.aui-toolbar2');
    const floating = document.documentElement.classList.contains('uhub-float');
    const totalH = floating
      ? Math.round(topbarH + LAYOUT.floatTopOffset)
      : (bar && stalkerH)
        ? Math.round(topbarH + (bar.getBoundingClientRect().top - stalker.getBoundingClientRect().top))
        : Math.round(topbarH + stalkerH);
    document.documentElement.style.setProperty('--uhub-header-h', `${totalH}px`);
    document.documentElement.style.setProperty('--uhub-topbar-h', `${Math.round(topbarH)}px`);
    const sidebarHeader = gid('uhub-sidebar-header');
    const sidebarHeaderH = sidebarHeader ? sidebarHeader.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--uhub-sidebar-content-top', `${totalH + Math.round(sidebarHeaderH)}px`);
    if (sidebarHeaderH) document.documentElement.style.setProperty('--uhub-sidebar-header-h', `${Math.round(sidebarHeaderH)}px`);
  }
  // Correcao de subpixel/bordas do Jira: garante que o respiro entre as colunas e a coluna de comentarios seja
  // EXATAMENTE --uhub-col-gap. Medido e aplicado antes da pintura (sem salto visivel).
  function measureEdgeFix() {
    if (!document.documentElement.classList.contains('uhub-wide')) return;
    const root = document.documentElement;
    const gap = 24;
    const collapsed = root.classList.contains('uhub-comments-collapsed');
    const floating = root.classList.contains('uhub-float');
    const L = lastLayout || computeLayout();
    const panelW = collapsed ? 0 : L.chatW + gap;
    [['.issue-body-content', '--uhub-body-fix', floating ? 0 : panelW], ['header#stalker', '--uhub-stalker-fix', panelW]].forEach(([sel, v, sidebarW]) => {
      const el = q1(sel);
      if (!el) return;
      const desiredRight = root.clientWidth - gap - sidebarW;
      const cur = parseFloat(root.style.getPropertyValue(v)) || 0;
      const delta = el.getBoundingClientRect().right - desiredRight;
      if (Math.abs(delta) >= 0.5 && Math.abs(cur + delta) < 40) root.style.setProperty(v, `${Math.round((cur + delta) * 2) / 2}px`);
    });
  }
  function watchHeaderHeight() {
    measureHeaderHeight();
    measureEdgeFix();
    if (typeof ResizeObserver === 'undefined') return;
    if (headerResizeObserver) headerResizeObserver.disconnect();
    headerResizeObserver = new ResizeObserver(() => { measureHeaderHeight(); measureEdgeFix(); });
    const topbar = gid('header');
    const stalker = q1('header#stalker');
    const sidebarHeader = gid('uhub-sidebar-header');
    if (topbar) headerResizeObserver.observe(topbar);
    if (stalker) headerResizeObserver.observe(stalker);
    if (sidebarHeader) headerResizeObserver.observe(sidebarHeader);
  }
  function unwatchHeaderHeight() {
    if (headerResizeObserver) {
      headerResizeObserver.disconnect();
      headerResizeObserver = null;
    }
  }
  // Altura do #addcomment "pinado" (que agora e fixed, fora do fluxo normal), para que a lista de comentarios
  // que rola por baixo dele nunca fique escondida atras. Recalculada sempre que o formulario expande/recolhe (o
  // usuario clica para comentar, abre a toolbar do TinyMCE, etc).
  let addCommentResizeObserver = null;
  function measureAddCommentHeight() {
    const addComment = gid('addcomment');
    const h = addComment ? Math.round(addComment.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--uhub-addcomment-h', `${h}px`);
    placeMyAvatar();
  }
  // ---------- Sua foto ao lado do novo comentario ----------
  const MY_AVATAR_SIZE = 32;
  function myAvatarSrc() {
    const img = q1('#header-details-user-fullname img, #user-options img');
    let src = img ? (img.currentSrc || img.getAttribute('src') || '') : '';
    if (img && (!src || /^data:image\/svg/.test(src))) {
      const m = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(img).backgroundImage || '');
      if (m) src = m[1];
    }
    return /^https?:|^\//.test(src) ? src.replace(/([?&]size=)(xsmall|small)\b/, '$1medium') : src;
  }
  function placeMyAvatar() {
    const ac = gid('addcomment');
    let av = ac && ac.querySelector(':scope > .uhub-me-avatar');
    if (!ac || !state.applied || !ac.classList.contains('uhub-pinned-footer')) { if (av) av.remove(); return; }
    const src = myAvatarSrc();
    if (!src) { if (av) av.remove(); return; }
    if (!av) {
      av = mk('img');
      av.className = 'uhub-me-avatar';
      av.alt = '';
      av.decoding = 'async';
      av.addEventListener('error', () => {
        const orig = (q1('#header-details-user-fullname img') || {}).src;
        if (orig && av.src !== orig) av.src = orig; else av.remove();
      });
      ac.appendChild(av);
    }
    if (av.getAttribute('src') !== src && !av.dataset.fallback) av.setAttribute('src', src);
    const name = (q1('meta[name="ajs-remote-user-fullname"]') || {}).content || '';
    const title = name ? `Comentando como ${name}` : 'Seu comentário';
    if (av.title !== title) av.title = title;
    const box = ['#addcomment form .jira-wikifield', '#addcomment form .wiki-edit', '#addcomment #footer-comment-button', '#addcomment form']
      .map((q) => q1(q)).find((e) => e && e.getBoundingClientRect().width > 0);
    const inner = gid('addcomment-inner') || ac;
    if (!box) { av.hidden = true; return; }
    const ar = ac.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    const ir = inner.getBoundingClientRect();
    const free = br.left - ir.left;
    if (free < MY_AVATAR_SIZE + 8) { av.hidden = true; return; }
    av.hidden = false;
    const left = `${Math.round(ir.left - ar.left - ac.clientLeft + (free - MY_AVATAR_SIZE) / 2)}px`;
    const top = `${Math.round(br.top - ar.top - ac.clientTop + Math.max(0, (Math.min(br.height, 42) - MY_AVATAR_SIZE) / 2))}px`;
    if (av.style.left !== left) av.style.left = left;
    if (av.style.top !== top) av.style.top = top;
  }
  function watchAddCommentHeight() {
    measureAddCommentHeight();
    if (typeof ResizeObserver === 'undefined') return;
    if (addCommentResizeObserver) addCommentResizeObserver.disconnect();
    const addComment = gid('addcomment');
    if (!addComment) return;
    addCommentResizeObserver = new ResizeObserver(() => measureAddCommentHeight());
    addCommentResizeObserver.observe(addComment);
  }
  function unwatchAddCommentHeight() {
    if (addCommentResizeObserver) {
      addCommentResizeObserver.disconnect();
      addCommentResizeObserver = null;
    }
  }
  // Reconciliacao permanente. Ao enviar um comentario (e em outras acoes), o Jira recarrega a issue via AJAX e
  // RECRIA #activitymodule, #addcomment e o cabecalho na posicao original, descartando nossa organizacao. Este
  // observador detecta essas reconstrucoes e reorganiza na hora: move a lista nova para a coluna de
  // comentarios, descarta a copia antiga, re-fixa o campo de comentario e volta a medir as alturas.
  let reconcileObserver = null;
  let reconcileScheduled = false;
  let observedStalker = null;
  let observedAddComment = null;
  function reconcileLayout() {
    reconcileScheduled = false;
    if (!state.applied) return;
    placeSidebar();
    const scrollArea = gid('uhub-sidebar-scroll');
    if (!scrollArea) return;
    const outside = [...qa('#activitymodule')]
      .filter((m) => !scrollArea.contains(m));
    if (outside.length) {
      const fresh = outside[outside.length - 1];
      scrollArea.querySelectorAll('#activitymodule').forEach((old) => old.remove());
      outside.forEach((m) => { if (m !== fresh) m.remove(); });
      scrollArea.appendChild(fresh);
      rememberDomComments();
    }
    qa('#addcomment').forEach((el) => {
      if (!el.classList.contains('uhub-pinned-footer')) el.classList.add('uhub-pinned-footer');
    });
    buildHeaderSettingsButton();
    watchTopbar();
    enforceActivityOrder({ keepPosition: true });
    syncStatusNudge();
    decorateCopyButtons();
    decorateReplyButtons();
    placeDetailsInSidebar();
    placeAttachments();
    decorateAttachments();
    renderDueChip();
    placeMyAvatar();
    styleDescriptionEditors();
    revealOwnNewComment();
    scrollToNewestOnOpen();
    renderWaiting();
    if (!gid('uhub-notify-status')) buildNotifyIndicator();
    const stalker = q1('header#stalker');
    if (stalker !== observedStalker) {
      observedStalker = stalker;
      watchHeaderHeight();
    }
    const addComment = gid('addcomment');
    if (addComment !== observedAddComment) {
      observedAddComment = addComment;
      watchAddCommentHeight();
    }
  }
  function scheduleReconcile() {
    if (reconcileScheduled) return;
    reconcileScheduled = true;
    requestAnimationFrame(reconcileLayout);
  }
  function startReconcileObserver() {
    if (reconcileObserver) return;
    observedStalker = q1('header#stalker');
    observedAddComment = gid('addcomment');
    reconcileObserver = new MutationObserver(scheduleReconcile);
    reconcileObserver.observe(document.body, { childList: true, subtree: true });
  }
  function stopReconcileObserver() {
    if (reconcileObserver) {
      reconcileObserver.disconnect();
      reconcileObserver = null;
    }
  }
  // Sobreposicoes do Jira (visualizador de anexos, dialogos com fundo escurecido etc.). Algumas usam z-index
  // menor que o das nossas camadas fixas, ou ficam dentro de um conteiner com camada baixa, e acabavam abaixo
  // da coluna de comentarios. Detectamos qualquer sobreposicao de tela cheia aberta e, enquanto ela existir,
  // baixamos a base de camadas do script (--uhub-z) para ficar abaixo dela. Ao fechar, volta ao normal.
  const UHUB_Z_DEFAULT = 500;
  const UHUB_Z_SPAN = 201;
  const OUR_SELECTORS = '#uhub-sidebar, #addcomment, #uhub-settings-panel, #uhub-notify-pop, #uhub-nav-toggle, #uhub-refresh-toast, #uhub-beta-viewer, html.uhub-meta-open #viewissuesidebar';
  let overlayObserver = null;
  let overlayScheduled = false;
  function isOurs(el) {
    return !!(el && el.closest && el.closest(OUR_SELECTORS));
  }
  function findOpenOverlay() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const points = [[w * 0.03, h * 0.5], [w * 0.3, h * 0.97], [w * 0.5, h * 0.5]];
    for (const [x, y] of points) {
      let el = document.elementFromPoint(x, y);
      while (el && el !== document.body && el !== document.documentElement) {
        if (!isOurs(el)) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.position === 'absolute') {
            const r = el.getBoundingClientRect();
            const coversViewport = r.width >= w * 0.9 && r.height >= h * 0.9;
            const isPageWrapper = el.querySelector('#issue-content, #header, #uhub-sidebar');
            if (coversViewport && !isPageWrapper) return el;
          }
        }
        el = el.parentElement;
      }
    }
    return null;
  }
  // z-index efetivo da sobreposicao no nivel da pagina: o do ancestral posicionado mais externo que define
  // z-index (ou o proprio elemento).
  function effectiveRootZ(el) {
    let z = 0;
    for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.position !== 'static' && cs.zIndex !== 'auto') {
        const v = parseInt(cs.zIndex, 10);
        if (!Number.isNaN(v)) z = v;
      }
    }
    return z;
  }
  function updateOverlayLayering() {
    overlayScheduled = false;
    if (!state.applied) return;
    const overlay = findOpenOverlay();
    let base = UHUB_Z_DEFAULT;
    let floor = -100000;
    let compress = false;
    if (overlay) {
      const rootZ = effectiveRootZ(overlay);
      if (rootZ > UHUB_Z_SPAN) {
        base = Math.min(UHUB_Z_DEFAULT, rootZ - UHUB_Z_SPAN);
      } else if (rootZ >= 1) {
        base = -100000;
        floor = 0;
        compress = true;
      } else {
        base = rootZ - UHUB_Z_SPAN;
      }
    }
    const root = document.documentElement;
    if (root.style.getPropertyValue('--uhub-z') !== String(base)) root.style.setProperty('--uhub-z', String(base));
    if (root.style.getPropertyValue('--uhub-z-floor') !== String(floor)) root.style.setProperty('--uhub-z-floor', String(floor));
    root.classList.toggle('uhub-overlay-open', !!overlay);
    root.classList.toggle('uhub-overlay-compress', compress);
  }
  function scheduleOverlayCheck() {
    if (overlayScheduled) return;
    overlayScheduled = true;
    requestAnimationFrame(updateOverlayLayering);
  }
  function onOverlayMutations(records) {
    for (const r of records) {
      if (!isOurs(r.target)) { scheduleOverlayCheck(); return; }
    }
  }
  function onAnyClickForOverlay() {
    scheduleOverlayCheck();
    setTimeout(scheduleOverlayCheck, 150);
    setTimeout(scheduleOverlayCheck, 500);
  }
  function startOverlayWatcher() {
    if (overlayObserver) return;
    overlayObserver = new MutationObserver(onOverlayMutations);
    overlayObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'aria-hidden', 'hidden', 'open'],
    });
    document.addEventListener('click', onAnyClickForOverlay, true);
    document.addEventListener('keydown', onAnyClickForOverlay, true);
    updateOverlayLayering();
  }
  function stopOverlayWatcher() {
    if (overlayObserver) {
      overlayObserver.disconnect();
      overlayObserver = null;
    }
    document.removeEventListener('click', onAnyClickForOverlay, true);
    document.removeEventListener('keydown', onAnyClickForOverlay, true);
    document.documentElement.style.removeProperty('--uhub-z');
    document.documentElement.style.removeProperty('--uhub-z-floor');
    document.documentElement.classList.remove('uhub-overlay-open', 'uhub-overlay-compress');
  }
  // Edicao inline estavel nos Detalhes do Item. No modo de edicao o Jira troca o valor por um campo de
  // formulario com largura propria; no layout compacto (flex-wrap) isso fazia o item quebrar para a linha de
  // baixo. No instante do clique (antes do Jira trocar o conteudo) guardamos a largura atual do item e a
  // mantemos ate a edicao terminar.
  const frozen = new Map();
  function unfreezeItem(li) {
    const f = frozen.get(li);
    if (!f) return;
    frozen.delete(li);
    if (f.observer) f.observer.disconnect();
    clearTimeout(f.timer);
    li.classList.remove('uhub-edit-frozen');
    li.style.removeProperty('width');
    if (f.value) {
      f.value.classList.remove('uhub-edit-frozen-value');
      f.value.style.removeProperty('--uhub-frozen-w');
      f.value.style.removeProperty('--uhub-frozen-h');
    }
  }
  function unfreezeAll() {
    [...frozen.keys()].forEach(unfreezeItem);
  }
  function freezeEditableItem(value) {
    const li = value.closest('#issuedetails > li');
    if (!li || frozen.has(li)) return;
    const w = li.getBoundingClientRect().width;
    const vr = value.getBoundingClientRect();
    const vw = vr.width;
    if (!vw) return;
    value.style.setProperty('--uhub-frozen-h', `${vr.height}px`);
    li.style.setProperty('width', `${w}px`, 'important');
    value.style.setProperty('--uhub-frozen-w', `${vw}px`);
    value.classList.add('uhub-edit-frozen-value');
    li.classList.add('uhub-edit-frozen');
    const f = { value, observer: null, timer: null };
    frozen.set(li, f);
    f.observer = new MutationObserver(() => {
      if (!li.isConnected || !value.isConnected || !value.classList.contains('active')) unfreezeItem(li);
    });
    f.observer.observe(value, { attributes: true, attributeFilter: ['class'] });
    f.timer = setTimeout(() => {
      if (!value.isConnected || !value.classList.contains('active')) unfreezeItem(li);
    }, 1500);
  }
  function onDetailsEditIntent(ev) {
    if (!state.applied) return;
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    const t = ev.target;
    const value = t && t.closest && t.closest('#issuedetails .editable-field');
    if (!value || value.classList.contains('active')) return;
    freezeEditableItem(value);
  }
  function startDetailsEditGuard() {
    document.addEventListener('pointerdown', onDetailsEditIntent, true);
    document.addEventListener('keydown', onDetailsEditIntent, true);
  }
  function stopDetailsEditGuard() {
    document.removeEventListener('pointerdown', onDetailsEditIntent, true);
    document.removeEventListener('keydown', onDetailsEditIntent, true);
    unfreezeAll();
  }
  // Campo de comentario: operacoes seguras sobre o editor do Jira. O editor tem dois modos (abas Visual/Texto).
  // Em ambos, o <textarea id=comment> guarda o texto em wiki markup ([~usuario], [texto|url], [^anexo]) — e ele
  // que e enviado. Para inserir/restaurar conteudo sem quebrar mencoes, links e anexos: - modo Texto:
  // escrevemos o wiki markup direto no textarea; - modo Visual: inserimos a mencao no editor exatamente no
  // formato que o Jira gera e CONFERIMOS se o Jira a converteu para [~usuario]; se nao, desfazemos e usamos o
  // proprio conversor do Jira (Texto -> edita -> Visual). O rascunho e restaurado sempre por esse caminho
  // oficial. As operacoes sao enfileiradas (varios cliques em sequencia nao se atropelam).
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(cond, timeout = 6000, step = 50) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try {
        const v = cond();
        if (v) return v;
      } catch {}
      await sleep(step);
    }
    return null;
  }
  let editorQueue = Promise.resolve();
  function enqueueEditorOp(fn) {
    const run = editorQueue.then(fn);
    editorQueue = run.catch((err) => console.warn('[Jira layout] editor de comentário:', err));
    return run;
  }
  function normWiki(v) {
    return String(v || '').replace(/\u00a0/g, ' ').replace(/[ \t]+$/gm, '').trim();
  }
  function acEl() { return gid('addcomment'); }
  function acTextarea() { const a = acEl(); return a && a.querySelector('textarea#comment'); }
  function acIsOpen() { const a = acEl(); return !!(a && a.classList.contains('active') && acTextarea()); }
  function acMode() {
    const a = acEl();
    const sel = a && a.querySelector('.editor-toggle-tabs li.aui-nav-selected[data-mode]');
    if (sel) return sel.getAttribute('data-mode');
    const ta = acTextarea();
    return ta && ta.getAttribute('data-rich-editor-active') === 'true' ? 'wysiwyg' : 'source';
  }
  function acIframe() {
    const a = acEl();
    return a && a.querySelector('.rte-container iframe, iframe[id^="mce_"]');
  }
  function acEditorBody() {
    const f = acIframe();
    try {
      const d = f && (f.contentDocument || (f.contentWindow && f.contentWindow.document));
      return (d && d.body) || null;
    } catch (e) { return null; }
  }
  function acEditorReady() {
    if (!acIsOpen()) return false;
    const a = acEl();
    const ta = acTextarea();
    if (!ta || ta.disabled) return false;
    const hasRichShell = !!(a && a.querySelector('rich-editor, .editor-toggle-tabs, .jira-wikifield'));
    if (!hasRichShell) return true;
    const sel = a.querySelector('.editor-toggle-tabs li.aui-nav-selected[data-mode]');
    const richAttr = ta.getAttribute('data-rich-editor-active');
    const wikiInit = ta.classList.contains('wiki-editor-initialised') || ta.classList.contains('wiki-edit-wrapped');
    if (!sel && richAttr === null && !wikiInit) return false;
    if (acMode() === 'source') {
      return richAttr === null || richAttr === 'false';
    }
    if (richAttr !== null && richAttr !== 'true') return false;
    const body = acEditorBody();
    if (!body) return false;
    const tm = pageWin().tinymce;
    if (tm && typeof tm.get === 'function') {
      const ed = tinyEditor();
      if (!ed || ed.initialized === false) return false;
    }
    return true;
  }
  function tinyEditor() {
    try {
      const tm = pageWin().tinymce;
      if (!tm || typeof tm.get !== 'function') return null;
      const rich = acEl() && acEl().querySelector('rich-editor[id]');
      const ed = rich ? tm.get(rich.id) : null;
      if (ed) return ed;
      const act = tm.activeEditor;
      if (act && typeof act.getElement === 'function' && acEl().contains(act.getElement())) return act;
    } catch {}
    return null;
  }
  function findCommentTrigger() {
    return gid('footer-comment-button')
      || q1('#addcomment .mod-footer a, #addcomment .mod-footer button, #addcomment .inline-comment')
      || gid('comment-issue')
      || q1('.issueaction-comment-issue.inline-comment');
  }
  async function openCommentForm() {
    if (acEditorReady()) return true;
    if (!acIsOpen()) {
      const b = findCommentTrigger();
      if (!b) return false;
      b.click();
    }
    let ok = await waitFor(acEditorReady, 8000);
    if (!ok && !acIsOpen()) {
      const fallback = gid('comment-issue') || q1('.issueaction-comment-issue.inline-comment');
      if (fallback) {
        fallback.click();
        ok = await waitFor(acEditorReady, 4000);
      }
    }
    if (ok) watchEditorKeys();
    return !!ok;
  }
  async function setEditorMode(mode) {
    if (acMode() === mode) return true;
    const btn = acEl() && acEl().querySelector(`.editor-toggle-tabs li[data-mode="${mode}"] button`);
    if (!btn) return false;
    btn.click();
    const ok = await waitFor(() => acMode() === mode && (mode === 'source' || acEditorReady()), 6000);
    await sleep(mode === 'wysiwyg' ? 250 : 80);
    return !!ok;
  }
  function writeSourceText(text) {
    const ta = acTextarea();
    if (!ta) return false;
    ta.value = text;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  // Troca todo o conteudo pelo wiki markup informado, pelo conversor do Jira
  async function replaceCommentWiki(wiki) {
    veilEditor(true);
    try {
      return await replaceCommentWikiInner(wiki);
    } finally {
      veilEditor(false);
    }
  }
  async function replaceCommentWikiInner(wiki) {
    const prev = acMode();
    if (prev === 'wysiwyg' && !(await setEditorMode('source'))) return false;
    writeSourceText(wiki);
    if (prev === 'wysiwyg') {
      await setEditorMode('wysiwyg');
      if (normWiki(wiki)) await waitFor(() => { const b = acEditorBody(); return b && cleanText(b.textContent); }, 4000);
    }
    return true;
  }
  // Uma "referencia" inserida no comentario: mencao a pessoa ([~usuario]) ou link de anexo ([^arquivo]). Mesmo
  // motor robusto para as duas.
  function asRef(r) {
    return typeof r === 'string' ? { kind: 'mention', user: r, display: r } : r;
  }
  // Nome de arquivo com [ ] | { } quebra o [^arquivo] do Jira: nesses casos cita como link normal
  // [nome|url-do-anexo] (o nome troca [] por ())
  function attNeedsUrlLink(r) { return /[[\]|{}]/.test(r.file); }
  function attAbsUrl(r) {
    return new URL(r.href, location.origin).href.replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/\|/g, '%7C');
  }
  function attSafeLabel(r) {
    return r.file.replace(/[[{]/g, '(').replace(/[\]}]/g, ')').replace(/\|/g, '-');
  }
  function refWiki(r) {
    r = asRef(r);
    if (r.kind === 'attachment') return attNeedsUrlLink(r) ? `[${attSafeLabel(r)}|${attAbsUrl(r)}]` : `[^${r.file}]`;
    return `[~${r.user}]`;
  }
  function refLabel(r) {
    r = asRef(r);
    return r.kind === 'attachment' ? r.file : r.display;
  }
  function hasMention(wiki, user) {
    return normWiki(wiki).toLowerCase().includes(refWiki(user).toLowerCase());
  }
  // Insere a referencia no fim do texto (usado so no caminho reserva)
  function addMentionToWiki(wiki, user) {
    if (hasMention(wiki, user)) return wiki;
    const text = String(wiki || '').replace(/[ \t\u00a0]+$/, '');
    return `${text}${text ? ' ' : ''}${refWiki(user)} `;
  }
  // Insere a referencia onde esta o cursor do campo em modo Texto Espacos ao redor da referencia sem quebrar a
  // marcacao do Jira: nada de espaco antes do fecho de *negrito*, _italico_ etc. nem depois da abertura.
  const WIKI_MARK = '*_+^~-?';
  function wikiSpaceBefore(before) {
    if (!before || /[\s\u00a0]$/.test(before)) return '';
    const last = before.slice(-1);
    const prev = before.slice(-2, -1);
    if (WIKI_MARK.includes(last) && (!prev || /[\s\u00a0([{]/.test(prev))) return '';
    return ' ';
  }
  function wikiSpaceAfter(after) {
    if (/^[\s\u00a0]/.test(after)) return '';
    const first = after.charAt(0);
    const next = after.charAt(1);
    if (first && WIKI_MARK.includes(first) && (!next || /[\s\u00a0.,;:!?)\]}]/.test(next))) return '';
    return ' ';
  }
  // Posicao segura no wiki: nunca dentro de [mencao], [link|url], [^anexo] ou !imagem!; se o campo nunca
  // recebeu o cursor, vai para o fim.
  function safeWikiCaret(v, pos) {
    pos = Math.max(0, Math.min(v.length, pos));
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = v.indexOf('\n', pos);
    if (lineEnd < 0) lineEnd = v.length;
    const line = v.slice(lineStart, lineEnd);
    const rel = pos - lineStart;
    const re = /\[[^\[\]\n]*\]|![^!\s][^!\n]*!/g;
    let m;
    while ((m = re.exec(line))) {
      if (rel > m.index && rel < m.index + m[0].length) return lineStart + m.index + m[0].length;
    }
    return pos;
  }
  function insertMentionAtCaret(ta, user) {
    const v = ta.value;
    const touched = caretIsReal(ta);
    let start = touched && typeof ta.selectionStart === 'number' ? ta.selectionStart : v.length;
    let end = touched && typeof ta.selectionEnd === 'number' ? ta.selectionEnd : start;
    start = safeWikiCaret(v, Math.max(start, end));
    end = start;
    const before = v.slice(0, start);
    const after = v.slice(end);
    const pre = wikiSpaceBefore(before);
    const post = wikiSpaceAfter(after);
    const ins = `${pre}${refWiki(user)}${post}`;
    writeSourceText(before + ins + after);
    const caret = before.length + ins.length;
    try {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    } catch {}
    markCaret(ta);
  }
  // Lembra que o cursor do campo Texto e "de verdade" (voce clicou/digitou)
  function markCaret(ta) {
    if (!ta) return;
    ta.dataset.uhubCaret = '1';
    ta.dataset.uhubCaretLen = String(ta.value.length);
  }
  function caretIsReal(ta) {
    return ta.dataset.uhubCaret === '1' && ta.dataset.uhubCaretLen === String(ta.value.length);
  }
  ['mouseup', 'keyup', 'input'].forEach((t) => document.addEventListener(t, (ev) => {
    const ta = ev.target;
    if (ta && ta.id === 'comment' && ta.tagName === 'TEXTAREA' && ta.closest && ta.closest('#addcomment') && ev.isTrusted) markCaret(ta);
  }, true));
  function profileHref(user) {
    const ctx = (q1('meta[name="ajs-context-path"]') || {}).content || '';
    return `${ctx}/secure/ViewProfile.jspa?name=${encodeURIComponent(user)}`;
  }
  // Mencao (Responder) — motor robusto 1. Espera o editor "assentar" (logo apos abrir, o Jira ainda reescreve o
  // conteudo; inserir antes disso fazia a mencao sumir). 2. Caminho rapido e invisivel: insere a mencao no
  // cursor PELO PROPRIO EDITOR (API do TinyMCE ou edicao nativa do navegador), no mesmo HTML que o Jira gera ao
  // digitar @. 3. Conferencia dupla e tardia (~0,9 s): a mencao precisa estar no texto que sera enviado
  // ([~usuario]) E na tela. So entao conta como feita. 4. Se falhar: caminho garantido pelo conversor do Jira
  // (marca no cursor, Texto -> troca pela mencao -> Visual), com o editor "velado" para nao piscar. 5. Vigia
  // por 4 s: se o editor apagar a mencao depois, refaz sozinho. Tudo fica registrado no diagnostico (Ajustes ->
  // Copiar diagnostico).
  const DIAG_KEY = 'uhub-diag';
  function diag(entry) {
    try {
      let list = [];
      try { list = JSON.parse(GM_getValue(DIAG_KEY, '[]')) || []; } catch (e) { list = []; }
      list.push({ t: new Date().toISOString(), issue: state.issueKey, ...entry });
      if (list.length > 60) list = list.slice(-60);
      GM_setValue(DIAG_KEY, JSON.stringify(list));
    } catch {}
  }

  function captureEditorDiagnostic() {
    const a = acEl();
    const ta = acTextarea();
    const sel = a && a.querySelector('.editor-toggle-tabs li.aui-nav-selected[data-mode]');
    return {
      hasAddComment: !!a,
      open: acIsOpen(),
      ready: acEditorReady(),
      mode: acIsOpen() ? acMode() : null,
      selectedTabMode: sel ? sel.getAttribute('data-mode') : null,
      richAttr: ta ? ta.getAttribute('data-rich-editor-active') : null,
      taClasses: ta ? ta.className : null,
      valLen: ta ? ta.value.length : 0,
      hasRichEditor: !!(a && a.querySelector('rich-editor')),
      hasIframe: !!acIframe(),
      hasBody: !!acEditorBody(),
      tinyApi: !!tinyEditor(),
      hasFooterBtn: !!gid('footer-comment-button'),
      hasCommentIssueBtn: !!gid('comment-issue'),
    };
  }
  // Editores de comentario sempre abrem no modo Visual (novo, citacao, resposta, edicao e comentario em transicao)
  const visualDefault = new WeakMap();
  function commentTabsTextarea(tabs) {
    let p = tabs.parentElement;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
      const t = p.querySelector('textarea');
      if (t) return t;
    }
    return null;
  }
  function forceVisualEditors() {
    try {
      Array.from(qa('.editor-toggle-tabs')).forEach((tabs) => {
        let rec = visualDefault.get(tabs);
        if (!rec) { rec = { done: false, tries: 0, last: 0 }; visualDefault.set(tabs, rec); }
        if (rec.done) return;
        const ta = commentTabsTextarea(tabs);
        if (!ta) return;
        if (!(ta.name === 'comment' || ta.id === 'comment')) { rec.done = true; return; }
        if (tabs.closest('.uhub-editor-veil')) return;
        const sel = tabs.querySelector('li.aui-nav-selected[data-mode]');
        if (!sel) return;
        if (sel.getAttribute('data-mode') === 'wysiwyg') { rec.done = true; return; }
        if (rec.tries >= 5) { rec.done = true; return; }
        if (Date.now() - rec.last < 400) return;
        const btn = tabs.querySelector('li[data-mode="wysiwyg"] button');
        if (!btn) return;
        rec.tries += 1;
        rec.last = Date.now();
        btn.click();
        setTimeout(forceVisualEditors, 500);
      });
    } catch (e) {
      diag({ where: 'visual-default', error: String(e && (e.stack || e.message) || e).slice(0, 500) });
    }
  }
  try {
    let visualTick = false;
    new MutationObserver(() => {
      if (visualTick) return;
      visualTick = true;
      requestAnimationFrame(() => { visualTick = false; forceVisualEditors(); });
    }).observe(document, { childList: true, subtree: true });
  } catch (e) {
    diag({ where: 'visual-default-init', error: String(e && (e.stack || e.message) || e).slice(0, 500) });
  }
  function capturePageDiagnosticState() {
    const s = {
      url: location.href,
      issue: state.issueKey,
      applied: state.applied,
      lite: state.lite,
      narrowMode: narrow.mode,
      W: document.documentElement.clientWidth,
      H: window.innerHeight,
      zFloor: document.documentElement.style.getPropertyValue('--uhub-z-floor'),
      zBase: document.documentElement.style.getPropertyValue('--uhub-z'),
      htmlClasses: document.documentElement.className,
    };
    try { s.type = getIssueType(); } catch {}
    try { s.editor = captureEditorDiagnostic(); } catch {}
    try {
      s.attachmentsSel = {
        totalTiles: qa('#attachment_thumbnails li.attachment-content').length,
        selectedCount: attSel.size,
        selectedIds: Array.from(attSel),
      };
    } catch {}
    try {
      const getTree = (el) => el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.trim().replace(/\s+/g, '.') : ''}` : 'null';
      s.structure = {
        main: getTree(q1('.issue-main-column')),
        sidebar: getTree(gid('uhub-sidebar')),
        attachments: getTree(gid('attachmentmodule')),
        details: getTree(gid('details-module')),
        reviewMeta: getTree(gid('uhub-review-meta')),
        modals: [...qa('.aui-dialog2[aria-hidden="false"], .jira-dialog.jira-dialog-open, #uhub-settings-panel.uhub-open, #uhub-notify-pop.uhub-open, #uhub-beta-viewer:not([hidden])')].map(getTree),
      };
    } catch {}
    return s;
  }
  function mentionHtml(user, display) {
    const r = asRef(user);
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    if (r.kind === 'attachment' && attNeedsUrlLink(r)) {
      return `<a href="${esc(attAbsUrl(r))}" data-mce-href="${esc(attAbsUrl(r))}">${esc(attSafeLabel(r))}</a>`;
    }
    if (r.kind === 'attachment') {
      return `<a class="attachment-title" title="${esc(r.file)}" href="${esc(new URL(r.href, location.origin).href)}" data-mce-href="${esc(new URL(r.href, location.origin).href)}">${esc(r.file)}</a>`;
    }
    const u = r.user;
    const href = profileHref(u);
    return `<a class="user-hover" contenteditable="false" tabindex="-1" title="Seguir link" href="${esc(new URL(href, location.origin).href)}" rel="${esc(u)}" data-mce-href="${esc(href)}">${esc(display || r.display)}</a>`;
  }
  function refBodySelector(user) {
    const r = asRef(user);
    if (r.kind === 'attachment') return `a[href*="/secure/attachment/${CSS.escape(String(r.id))}/"]`;
    return `a.user-hover[rel="${CSS.escape(r.user)}"]`;
  }
  function bodyHasAnyText() {
    const b = acEditorBody();
    return !!(b && (cleanText(b.textContent) || b.querySelector('a, img')));
  }
  // Elementos da referencia no editor (anexo: pelo ID no link OU pelo nome do arquivo, caso o editor renderize
  // o link com outro formato de URL)
  function bodyRefEls(user) {
    const body = acEditorBody();
    if (!body) return [];
    const r = asRef(user);
    const found = Array.from(body.querySelectorAll(refBodySelector(user)));
    if (r.kind === 'attachment') {
      body.querySelectorAll('a[href*="/secure/attachment/"]').forEach((a) => {
        const t = cleanText(a.textContent);
        if (!found.includes(a) && (t === r.file || t === attSafeLabel(r))) found.push(a);
      });
    }
    return found;
  }
  function bodyHasMention(user) {
    return bodyRefEls(user).length > 0;
  }
  function wikiRefCount(wiki, user) {
    const w = normWiki(wiki).toLowerCase();
    const needle = refWiki(user).toLowerCase();
    let n = 0;
    let i = w.indexOf(needle);
    while (i >= 0) { n += 1; i = w.indexOf(needle, i + needle.length); }
    return n;
  }
  function mentionPresent(user) {
    const ta = acTextarea();
    if (!ta) return false;
    if (acMode() === 'source') return hasMention(ta.value, user);
    return hasMention(ta.value, user) && bodyHasMention(user);
  }
  // Espera o editor parar de ser reescrito (sem mudancas por 160 ms)
  async function waitEditorSettled(maxMs = 2500) {
    if (acMode() === 'source') return;
    const t0 = Date.now();
    let body = acEditorBody();
    let last = Date.now();
    let mo = null;
    const watch = (b) => {
      if (mo) mo.disconnect();
      if (!b) return;
      mo = new MutationObserver(() => { last = Date.now(); });
      mo.observe(b, { childList: true, subtree: true, characterData: true, attributes: true });
    };
    watch(body);
    while (Date.now() - t0 < maxMs) {
      const cur = acEditorBody();
      if (cur !== body) { body = cur; last = Date.now(); watch(body); }
      if (body && Date.now() - last >= 160) break;
      await sleep(30);
    }
    if (mo) mo.disconnect();
  }
  // Ponto de insercao: cursor do editor (preservado mesmo sem foco) ou fim do texto
  function editorRange(body) {
    const doc = body.ownerDocument;
    let range = null;
    try {
      const sel = doc.defaultView.getSelection();
      if (sel && sel.rangeCount && body.contains(sel.getRangeAt(0).startContainer)) range = sel.getRangeAt(0).cloneRange();
    } catch (e) { range = null; }
    if (!range) {
      let p = body.lastElementChild;
      if (!p || !/^(P|DIV|LI)$/.test(p.tagName)) {
        p = doc.createElement('p');
        body.appendChild(p);
      }
      range = doc.createRange();
      range.selectNodeContents(p);
    }
    range.collapse(false);
    if (range.startContainer === body) {
      const prev = body.childNodes[range.startOffset - 1];
      const next = body.childNodes[range.startOffset];
      const isBlock = (n) => n && n.nodeType === 1 && /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE)$/.test(n.tagName);
      if (isBlock(prev)) { range.selectNodeContents(prev); range.collapse(false); }
      else if (isBlock(next)) { range.selectNodeContents(next); range.collapse(true); }
      else {
        const p = doc.createElement('p');
        range.insertNode(p);
        range.selectNodeContents(p);
        range.collapse(true);
      }
    }
    const startEl = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const inLink = startEl && startEl.closest && startEl.closest('a');
    if (inLink && body.contains(inLink)) {
      range.setStartAfter(inLink);
      range.collapse(true);
    }
    return range;
  }
  // O texto logo depois do cursor ja comeca com espaco? (evita espaco duplo)
  function nextCharIsSpace(body, range) {
    try {
      const doc = body.ownerDocument;
      const block = (() => {
        const el = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
        return (el && el.closest && el.closest('p, li, div')) || body;
      })();
      const post = doc.createRange();
      post.setStart(range.startContainer, range.startOffset);
      post.setEnd(block, block.childNodes.length);
      const ch = post.toString().charAt(0);
      return /[\s\u00a0]/.test(ch);
    } catch (e) { return false; }
  }
  function needsSpaceBefore(body, range) {
    try {
      const doc = body.ownerDocument;
      const startEl = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      const block = (startEl && startEl.closest && startEl.closest('p, li, div')) || body;
      const pre = doc.createRange();
      pre.setStart(body.contains(block) ? block : body, 0);
      pre.setEnd(range.startContainer, range.startOffset);
      const ch = pre.toString().slice(-1);
      return !!ch && !/[\s ]/.test(ch);
    } catch (e) { return false; }
  }
  // Depois de inserir, o campo fica focado com o cursor logo apos o espaco:
  // e so continuar digitando (o texto nunca gruda no nome/anexo)
  function focusEditorBody(body) {
    try {
      const w = body.ownerDocument.defaultView;
      const sel = w.getSelection();
      const r = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      w.focus();
      body.focus({ preventScroll: true });
      if (!state.applied) { const a = acEl(); if (a) a.scrollIntoView({ block: 'nearest' }); }
      if (r) { sel.removeAllRanges(); sel.addRange(r); }
    } catch {}
  }
  // Verifica se a linha atual antes do cursor ja possui texto ou elemento inline no mesmo paragrafo
  function lineHasTextBeforeCursor(body, range) {
    try {
      const doc = body.ownerDocument;
      const startEl = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      const block = (startEl && startEl.closest && startEl.closest('p, li, div, h1, h2, h3, h4, h5, h6, blockquote, pre')) || body;
      const pre = doc.createRange();
      pre.setStart(body.contains(block) ? block : body, 0);
      pre.setEnd(range.startContainer, range.startOffset);
      const frag = pre.cloneContents();
      const brs = frag.querySelectorAll('br');
      if (brs.length) {
        const lastBr = brs[brs.length - 1];
        const afterBr = doc.createRange();
        afterBr.setStartAfter(lastBr);
        afterBr.setEnd(frag, frag.childNodes.length);
        const sub = afterBr.cloneContents();
        const txt = (sub.textContent || '').replace(/[\s\u00a0\u200b]/g, '');
        return !!(txt || sub.querySelector('a, img'));
      }
      const txt = (frag.textContent || '').replace(/[\s\u00a0\u200b]/g, '');
      return !!(txt || frag.querySelector('a, img'));
    } catch (e) { return false; }
  }
  // Insere HTML no cursor pelo proprio editor (sem mexer no DOM por fora)
  function editorInsertHtml(html, { trailingSpace = false, startCleanLine = false } = {}) {
    const body = acEditorBody();
    if (!body) return 'no-body';
    const doc = body.ownerDocument;
    const range = editorRange(body);
    const breakBefore = startCleanLine && lineHasTextBeforeCursor(body, range);
    const spaceBefore = !breakBefore && !/^<br\b/i.test(html) && needsSpaceBefore(body, range);
    const fullHtml = (breakBefore ? '<br>' : (spaceBefore ? ' ' : '')) + html
      + (trailingSpace && !nextCharIsSpace(body, range) ? '&nbsp;' : '');
    const ed = tinyEditor();
    if (ed && typeof ed.insertContent === 'function') {
      try {
        if (ed.selection && typeof ed.selection.setRng === 'function') ed.selection.setRng(range);
        ed.insertContent(fullHtml);
        if (typeof ed.nodeChanged === 'function') ed.nodeChanged();
        ed.fire('change');
        focusEditorBody(body);
        return 'api';
      } catch {}
    }
    try {
      const frag = range.createContextualFragment(fullHtml);
      const last = frag.lastChild;
      range.insertNode(frag);
      const sel = doc.defaultView.getSelection();
      if (sel && last) {
        const after = doc.createRange();
        if (last.nodeType === 3) after.setStart(last, last.textContent.length);
        else after.setStartAfter(last);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
      }
      body.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      body.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      focusEditorBody(body);
      return 'native';
    } catch {}
    return 'failed';
  }
  function removeInsertedMention(user) {
    const body = acEditorBody();
    if (!body) return;
    const all = bodyRefEls(user);
    const a = all[all.length - 1];
    if (!a) return;
    const next = a.nextSibling;
    if (next && next.nodeType === 3 && /^[  ]/.test(next.textContent)) next.textContent = next.textContent.slice(1);
    a.remove();
    const ed = tinyEditor();
    try { if (ed) { ed.fire('input'); ed.fire('change'); } else body.dispatchEvent(new InputEvent('input', { bubbles: true })); } catch {}
  }
  // Esconde o editor durante o caminho garantido (sem "piscada")
  function veilEditor(on) {
    const a = acEl();
    if (!a) return;
    if (on) {
      const content = a.querySelector('.wiki-edit-content') || a.querySelector('#comment-wiki-edit');
      if (content && !content.dataset.uhubLockH) {
        content.dataset.uhubLockH = '1';
        const h = content.getBoundingClientRect().height;
        content.style.setProperty('height', `${h}px`, 'important');
        content.style.setProperty('overflow', 'hidden', 'important');
      }
      a.classList.add('uhub-editor-veil');
    } else {
      a.classList.remove('uhub-editor-veil');
      a.querySelectorAll('[data-uhub-lock-h]').forEach((el) => {
        el.style.removeProperty('height');
        el.style.removeProperty('overflow');
        delete el.dataset.uhubLockH;
      });
    }
  }
  // Caminho garantido: marca no cursor -> modo Texto -> troca pela mencao -> Visual
  async function mentionViaConverter(user, display) {
    if (!acIsOpen()) return false;
    const token = `UHUBMENTION${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    veilEditor(true);
    try {
      const placed = editorInsertHtml(token);
      const tokenPlaced = placed === 'api' || placed === 'native';
      await sleep(60);
      if (!(await setEditorMode('source'))) return false;
      const ta = acTextarea();
      let wiki = ta.value;
      if (tokenPlaced && wiki.includes(token)) {
        wiki = wiki.replace(token, (m, off, str) => {
          const before = str.slice(0, off);
          const after = str.slice(off + m.length);
          const pre = wikiSpaceBefore(before);
          const post = wikiSpaceAfter(after);
          return `${pre}${refWiki(user)}${post}`;
        });
      } else {
        wiki = addMentionToWiki(wiki.split(token).join(''), user);
      }
      if (!acIsOpen()) return false;
      writeSourceText(wiki);
      await setEditorMode('wysiwyg');
      await waitFor(() => bodyHasMention(user), 2500, 40);
      const ok = mentionPresent(user);
      if (ok) caretAfterRef(user);
      return ok;
    } finally {
      removeStrayToken(token);
      veilEditor(false);
    }
  }
  // Nunca deixa a marca temporaria para tras (nem no editor, nem no campo Texto)
  function removeStrayToken(token) {
    try {
      const ta = acTextarea();
      if (ta && ta.value.includes(token)) writeSourceText(ta.value.split(token).join(''));
      const body = acEditorBody();
      if (body && body.textContent.includes(token)) {
        const w = body.ownerDocument.createTreeWalker(body, 4);
        const hits = [];
        let n;
        while ((n = w.nextNode())) if (n.textContent.includes(token)) hits.push(n);
        hits.forEach((t) => { t.textContent = t.textContent.split(token).join(''); });
        body.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
    } catch {}
  }
  // Cursor logo depois da referencia inserida (cliques seguidos ficam em ordem)
  function caretAfterRef(user) {
    try {
      const els = bodyRefEls(user);
      const a = els[els.length - 1];
      if (!a) return;
      const doc = a.ownerDocument;
      const r = doc.createRange();
      const next = a.nextSibling;
      if (next && next.nodeType === 3 && /^[\s\u00a0]/.test(next.textContent)) r.setStart(next, 1);
      else r.setStartAfter(a);
      r.collapse(true);
      const sel = doc.defaultView.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      const ed = tinyEditor();
      if (ed && ed.selection && typeof ed.selection.setRng === 'function') ed.selection.setRng(r);
    } catch {}
  }
  async function mentionUser(user, display) {
    const log = { ref: refWiki(user), steps: [] };
    if (document.documentElement.classList.contains('uhub-comments-collapsed')) {
      const cb = gid('uhub-collapse-btn');
      if (cb) { cb.click(); log.steps.push('expanded'); await sleep(60); }
    }
    if (!acEl()) {
      showToast('Não há campo de comentário nesta issue', 3000);
      return 'noform';
    }
    let slowShown = false;
    const slowT = setTimeout(() => { slowShown = true; showToast(`Inserindo ${refLabel(user)}…`, 8000); }, 1500);
    let res = false;
    try {
      const gen = editorGen;
      res = await mentionUserInner(user, display, log, gen);
      return res;
    } finally {
      clearTimeout(slowT);
      if (slowShown && res && res !== 'dup') showToast(`✓ ${refLabel(user)} inserido`, 1200);
    }
  }
  // Cancelar/enviar o comentario encerra qualquer insercao em andamento
  let editorGen = 0;
  const cancelled = (gen) => gen !== editorGen || !acIsOpen();
  async function mentionUserInner(user, display, log, gen) {
    const wasOpen = acIsOpen();
    if (!(await openCommentForm())) {
      diag({ ...log, result: 'form-not-opened', editorState: captureEditorDiagnostic() });
      showToast('Não foi possível abrir o campo de comentário', 3000);
      return false;
    }
    log.mode = acMode();
    log.api = !!tinyEditor();
    if (!wasOpen) { await waitEditorSettled(); log.steps.push('settled'); }
    if (!wasOpen && !normWiki(acTextarea().value) && !bodyHasAnyText() && (readDrafts()[state.issueKey] || {}).wiki) {
      await restoreDraft();
      await waitEditorSettled(1200);
      log.steps.push('draft-restored');
    }
    const ta = acTextarea();
    const already = acMode() === 'source' ? hasMention(ta.value, user) : bodyHasMention(user);
    if (already) {
      diag({ ...log, result: 'dup' });
      return 'dup';
    }
    let ok = false;
    if (acMode() === 'source') {
      insertMentionAtCaret(ta, user);
      ok = hasMention(acTextarea().value, user);
      log.steps.push('source');
    } else {
      const before = wikiRefCount(ta.value, user);
      const how = editorInsertHtml(mentionHtml(user, display), { trailingSpace: true });
      log.steps.push(`insert:${how}`);
      if (how !== 'failed' && how !== 'no-body') {
        const fresh = () => bodyHasMention(user) && wikiRefCount((acTextarea() || {}).value, user) > before;
        await waitFor(fresh, 600, 30);
        await sleep(60);
        ok = fresh();
        log.steps.push(`verify:${ok}`);
        if (cancelled(gen)) { diag({ ...log, result: 'aborted' }); return 'aborted'; }
        if (!ok) removeInsertedMention(user);
      }
      if (!ok) {
        ok = await mentionViaConverter(user, display);
        log.steps.push(`converter:${ok}`);
        if (cancelled(gen)) { diag({ ...log, result: 'aborted' }); return 'aborted'; }
      }
      if (!ok && acIsOpen()) {
        await waitEditorSettled(1500);
        ok = mentionPresent(user) || await mentionViaConverter(user, display);
        log.steps.push(`retry:${ok}`);
      }
    }
    diag({ ...log, result: ok ? 'ok' : 'fail', wiki: (acTextarea() || {}).value });
    if (ok) watchMention(user, display);
    return ok;
  }
  // Citacao em lote de anexos: quebra linha simples (Shift+Enter) no mesmo paragrafo se a linha atual ja tiver texto e coloca cada anexo em sua propria linha na ordem de selecao.
  function lineHasTextBeforeWiki(before) {
    if (!before) return false;
    const lineStart = before.lastIndexOf('\n') + 1;
    const curLine = before.slice(lineStart).replace(/[ \t\u00a0]+/g, '');
    return curLine.length > 0;
  }
  function insertBatchAtCaretSource(ta, refs) {
    const v = ta.value;
    const touched = caretIsReal(ta);
    let start = touched && typeof ta.selectionStart === 'number' ? ta.selectionStart : v.length;
    let end = touched && typeof ta.selectionEnd === 'number' ? ta.selectionEnd : start;
    start = safeWikiCaret(v, Math.max(start, end));
    end = start;
    const before = v.slice(0, start);
    const after = v.slice(end);
    const pre = lineHasTextBeforeWiki(before) ? '\n' : '';
    const block = refs.map((r) => refWiki(r)).join('\n');
    const post = wikiSpaceAfter(after);
    const ins = `${pre}${block}${post}`;
    writeSourceText(before + ins + after);
    const caret = before.length + ins.length;
    try {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    } catch {}
    markCaret(ta);
  }
  async function citeViaConverterBatch(refs) {
    if (!acIsOpen() || !refs.length) return false;
    const token = `UHUBBATCH${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    veilEditor(true);
    try {
      const placed = editorInsertHtml(token);
      const tokenPlaced = placed === 'api' || placed === 'native';
      await sleep(30);
      if (!(await setEditorMode('source'))) return false;
      const ta = acTextarea();
      let wiki = ta.value;
      const block = refs.map((r) => refWiki(r)).join('\n');
      if (tokenPlaced && wiki.includes(token)) {
        wiki = wiki.replace(token, (m, off, str) => {
          const before = str.slice(0, off).replace(/[ \t\u00a0]+$/, '');
          const after = str.slice(off + m.length);
          const pre = lineHasTextBeforeWiki(before) ? '\n' : '';
          return `${pre}${block}${wikiSpaceAfter(after)}`;
        });
      } else {
        const clean = wiki.split(token).join('').replace(/[ \t\u00a0]+$/, '');
        const pre = lineHasTextBeforeWiki(clean) ? '\n' : '';
        wiki = `${clean}${pre}${block} `;
      }
      if (!acIsOpen()) return false;
      writeSourceText(wiki);
      await setEditorMode('wysiwyg');
      await waitFor(() => refs.every((r) => bodyHasMention(r)), 2500, 30);
      const ok = refs.every((r) => mentionPresent(r));
      if (ok) {
        caretAfterRef(refs[refs.length - 1]);
        const b = acEditorBody();
        if (b) focusEditorBody(b);
      }
      return ok;
    } finally {
      removeStrayToken(token);
      veilEditor(false);
    }
  }
  async function citeRefs(refs) {
    if (!refs || !refs.length) return { ok: 0, dup: 0, fail: 0 };
    if (document.documentElement.classList.contains('uhub-comments-collapsed')) {
      const cb = gid('uhub-collapse-btn');
      if (cb) { cb.click(); await sleep(40); }
    }
    if (!acEl()) {
      showToast('Não há campo de comentário nesta issue', 3000);
      return { ok: 0, dup: 0, fail: 0, aborted: true };
    }
    const gen = editorGen;
    const wasOpen = acIsOpen();
    if (!(await openCommentForm())) {
      diag({ kind: 'cite-batch', count: refs.length, refs: refs.map(refWiki), result: 'form-not-opened', editorState: captureEditorDiagnostic() });
      showToast('Não foi possível abrir o campo de comentário', 3000);
      return { ok: 0, dup: 0, fail: refs.length, aborted: true };
    }
    if (!wasOpen) await waitEditorSettled();
    if (!wasOpen && !normWiki(acTextarea().value) && !bodyHasAnyText() && (readDrafts()[state.issueKey] || {}).wiki) {
      await restoreDraft();
      await waitEditorSettled(800);
    }
    if (cancelled(gen)) return { ok: 0, dup: 0, fail: 0, aborted: true };
    const ta = acTextarea();
    const mode = acMode();
    const toInsert = [];
    let dup = 0;
    for (const r of refs) {
      const already = mode === 'source'
        ? hasMention(ta.value, r)
        : (bodyHasMention(r) || hasMention(ta.value, r));
      if (already) dup += 1;
      else toInsert.push(r);
    }
    if (!toInsert.length) return { ok: 0, dup, fail: 0 };
    let ok = false;
    if (mode === 'source') {
      insertBatchAtCaretSource(ta, toInsert);
      ok = toInsert.every((r) => hasMention(acTextarea().value, r));
    } else {
      const html = toInsert.map((r) => mentionHtml(r, r.file)).join('<br>');
      const how = editorInsertHtml(html, { trailingSpace: true, startCleanLine: true });
      if (how !== 'failed' && how !== 'no-body') {
        const allReady = () => toInsert.every((r) => bodyHasMention(r) && hasMention((acTextarea() || {}).value, r));
        await waitFor(allReady, 400, 25);
        await sleep(50);
        ok = allReady();
        if (cancelled(gen)) return { ok: 0, dup, fail: 0, aborted: true };
        if (!ok) toInsert.forEach((r) => removeInsertedMention(r));
      }
      if (!ok && !cancelled(gen)) {
        ok = await citeViaConverterBatch(toInsert);
      }
      if (ok) {
        caretAfterRef(toInsert[toInsert.length - 1]);
        const b = acEditorBody();
        if (b) focusEditorBody(b);
      }
    }
    diag({ kind: 'cite-batch', count: toInsert.length, mode, result: ok ? 'ok' : 'fail', wiki: (acTextarea() || {}).value });
    return { ok: ok ? toInsert.length : 0, dup, fail: ok ? 0 : toInsert.length };
  }
  // 5) vigia: se o EDITOR (nao voce) apagar a mencao nos proximos segundos, refaz. Qualquer acao sua no campo
  // (digitar, clicar, colar, trocar de modo) encerra o vigia — a mencao apagada por voce nunca volta sozinha.
  function watchMention(user, display, attempt = 0) {
    const t0 = Date.now();
    const gen0 = editorGen;
    const mode0 = acMode();
    let touched = false;
    const onTouch = () => { touched = true; };
    const targets = [];
    const add = (el) => {
      if (!el) return;
      ['keydown', 'mousedown', 'paste', 'cut', 'drop'].forEach((t) => el.addEventListener(t, onTouch, true));
      targets.push(el);
    };
    add(acEl());
    const body = acEditorBody();
    if (body) add(body.ownerDocument);
    const cleanup = () => targets.forEach((el) => ['keydown', 'mousedown', 'paste', 'cut', 'drop'].forEach((t) => el.removeEventListener(t, onTouch, true)));
    const check = () => {
      if (touched || gen0 !== editorGen || !acIsOpen() || acMode() !== mode0 || Date.now() - t0 > 2500) { cleanup(); return; }
      if (!mentionPresent(user)) {
        cleanup();
        diag({ ref: refWiki(user), result: 'lost-after-insert', steps: ['watchdog'] });
        enqueueEditorOp(async () => {
          if (touched || gen0 !== editorGen || !acIsOpen() || mentionPresent(user)) return;
          await waitEditorSettled(1200);
          const ok = mentionPresent(user) || await mentionViaConverter(user, display);
          diag({ ref: refWiki(user), result: ok ? 'restored' : 'restore-failed', steps: ['watchdog-converter', `attempt:${attempt + 1}`] });
          if (attempt < 2) watchMention(user, display, attempt + 1);
        });
        return;
      }
      setTimeout(check, 200);
    };
    setTimeout(check, 200);
  }
  // ---------- Botao "Responder" em cada comentario ----------
  const ICON_REPLY = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4 2 8l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 8H10a4 4 0 0 1 4 4v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function decorateCommentCopyButtons(sa) {
    sa.querySelectorAll('.activity-comment[id^="comment-"]').forEach((c) => {
      const details = c.querySelector('.action-details');
      if (!details) return;
      const dateLink = details.querySelector('a.comment-created-date-link, a[href*="focusedId="]');
      if (!dateLink) return;
      const anchor = dateLink;
      let b = details.querySelector('.uhub-cmt-copy');
      if (b && b.previousElementSibling === anchor) return;
      if (!b) {
        b = mk('button');
        b.type = 'button';
        b.className = 'uhub-copy-btn uhub-cmt-copy';
        b.title = 'Copiar link do comentário';
        b.setAttribute('aria-label', 'Copiar link do comentário');
        b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
      }
      anchor.after(b);
    });
  }
  function shortenCommentActionText(root) {
    if (!root) return;
    root.querySelectorAll('.action-head, .action-details, .twixi').forEach((el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (/adicionou um coment[aá]rio/i.test(n.nodeValue)) {
          n.nodeValue = n.nodeValue.replace(/adicionou um coment[aá]rio/gi, 'comentou');
        }
      }
    });
  }
  function decorateReplyButtons() {
    const sa = gid('uhub-sidebar-scroll');
    if (!sa) return;
    try {
      shortenCommentActionText(sa);
      decorateReplyButtonsIn(sa);
    } finally {
      decorateCommentCopyButtons(sa);
      placeCommentButtonsAfterEdited(sa);
    }
  }
  // Em comentários editados, move "copiar link" e "Responder" para depois do selo "editado"
  function placeCommentButtonsAfterEdited(sa) {
    try {
      Array.from(sa.querySelectorAll('.activity-comment .action-details')).forEach((d) => {
        const ed = d.querySelector('.update-info');
        if (!ed) return;
        let ref = ed;
        [d.querySelector('.uhub-cmt-copy'), d.querySelector('.uhub-reply-btn')].forEach((b) => {
          if (!b) return;
          if (ref.nextElementSibling !== b) ref.after(b);
          ref = b;
        });
      });
    } catch (e) {
      try { diag({ kind: 'place-comment-buttons', err: String((e && e.message) || e) }); } catch {}
    }
  }
  function decorateReplyButtonsIn(sa) {
    const me = currentUser();
    sa.querySelectorAll('.activity-comment[id^="comment-"]').forEach((c) => {
      if (c.hasAttribute('data-uhub-reply') && (c.querySelector('.uhub-reply-btn') || c.getAttribute('data-uhub-reply') === 'none')) return;
      c.setAttribute('data-uhub-reply', 'none');
      const author = c.querySelector('.action-details a.user-hover[rel]');
      if (!author) return;
      const user = author.getAttribute('rel');
      if (!user || (me && user.toLowerCase() === me)) return;
      const display = cleanText(author.textContent) || user;
      const btn = mk('button');
      btn.type = 'button';
      btn.className = 'uhub-reply-btn';
      btn.title = `Mencionar ${display} no novo comentário`;
      btn.innerHTML = `${ICON_REPLY}<span>Responder</span>`;
      btn.dataset.user = user;
      btn.dataset.display = display;
      c.setAttribute('data-uhub-reply', '1');
      const details = c.querySelector('.action-details');
      const dateLink = details && (details.querySelector('.comment-created-date-link')
        || (details.querySelector('.date.user-tz') && details.querySelector('.date.user-tz').closest('a'))
        || details.querySelector('.date.user-tz'));
      const copyBtn = details && details.querySelector('.uhub-cmt-copy');
      if (copyBtn) copyBtn.after(btn);
      else if (dateLink) dateLink.after(btn);
      else if (details) details.appendChild(btn);
      else c.appendChild(btn);
    });
  }
  // Rascunho do comentario: salvo automaticamente (wiki markup do Jira, que preserva mencoes, links e anexos) e
  // restaurado sozinho ao reabrir a issue. Some ao enviar, ao clicar em Cancelar ou ao apagar todo o texto.
  const DRAFTS_KEY = 'uhub-drafts';
  const DRAFT_TTL = 14 * 24 * 3600 * 1000;
  const draft = { timer: null, lastSaved: '', suspendUntil: 0, busy: false, restoreTimer: null };
  const watchedEditorDocs = new WeakSet();
  function readDrafts() {
    try { return JSON.parse(GM_getValue(DRAFTS_KEY, '{}')) || {}; } catch (e) { return {}; }
  }
  function writeDrafts(mutator) {
    const all = readDrafts();
    mutator(all);
    const old = Date.now() - DRAFT_TTL;
    Object.keys(all).forEach((k) => { if (!all[k] || !all[k].wiki || (all[k].at || 0) < old) delete all[k]; });
    GM_setValue(DRAFTS_KEY, JSON.stringify(all));
  }
  function discardDraft() {
    const key = state.issueKey;
    draft.lastSaved = '';
    if (key && readDrafts()[key]) writeDrafts((all) => { delete all[key]; });
  }
  function draftTick(force) {
    if (!state.applied || !state.issueKey || draft.busy) return;
    if (!force && Date.now() < draft.suspendUntil) return;
    if (!acIsOpen()) return;
    const raw = acTextarea().value;
    const n = normWiki(raw);
    if (n === draft.lastSaved) return;
    const key = state.issueKey;
    if (n) {
      draft.lastSaved = n;
      writeDrafts((all) => { all[key] = { wiki: raw, at: Date.now() }; });
    } else if (draft.lastSaved) {
      discardDraft();
    }
  }
  // Depois de voce comentar: rola a coluna ate o seu comentario novo (o topo, com "Mais recentes primeiro") e
  // destaca brevemente.
  let ownPost = null;
  // Ao abrir a issue: a coluna de comentarios comeca no comentario mais recente (sem destaque). Nao interfere
  // se voce ja rolou a coluna ou se abriu um link para um comentario especifico.
  const openScroll = { key: '', done: false, userScrolled: false, bound: null };
  function scrollToNewestOnOpen() {
    const key = state.issueKey || getIssueKey();
    if (openScroll.key !== key) { openScroll.key = key; openScroll.done = false; openScroll.userScrolled = false; }
    if (openScroll.done) return;
    const sa = gid('uhub-sidebar-scroll');
    if (!sa) return;
    if (openScroll.bound !== sa) {
      openScroll.bound = sa;
      const mark = () => { openScroll.userScrolled = true; };
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((t) => sa.addEventListener(t, mark, { passive: true }));
    }
    if (/[?&]focusedId=|#comment-/.test(location.href)) { openScroll.done = true; return; }
    const cs = sa.querySelectorAll('.activity-comment[id^="comment-"]');
    if (!cs.length) return;
    openScroll.done = true;
    if (openScroll.userScrolled) return;
    const t = (el) => { const x = el.querySelector('time[datetime]'); return x ? Date.parse(x.getAttribute('datetime')) || 0 : 0; };
    const first = cs[0];
    const last = cs[cs.length - 1];
    const newestFirst = cs.length === 1 || t(first) >= t(last);
    if (newestFirst) { if (sa.scrollTop !== 0) sa.scrollTop = 0; }
    else {
      const add = gid('addcomment');
      const top = Math.max(sa.getBoundingClientRect().top, add ? add.getBoundingClientRect().bottom : 0);
      sa.scrollTop += last.getBoundingClientRect().top - top - 8;
    }
  }
  function revealOwnNewComment() {
    if (!ownPost || Date.now() - ownPost.at > 90000) { ownPost = null; return; }
    const sa = gid('uhub-sidebar-scroll');
    const me = currentUser();
    if (!sa || !me) return;
    const mine = [...sa.querySelectorAll('.activity-comment[id^="comment-"]')].filter((c) => {
      const id = c.id.slice(8);
      if (ownPost.before.has(id)) return false;
      const a = c.querySelector('.action-details a.user-hover[rel]');
      return a && a.getAttribute('rel').toLowerCase() === me;
    });
    if (!mine.length) return;
    ownPost = null;
    nudgeStatus();
    const el = mine[0];
    const all = sa.querySelectorAll('.activity-comment[id^="comment-"]');
    if (cstackOn()) { const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center' }); }
    else if (all[0] === el) sa.scrollTop = 0;
    else {
      const add = gid('addcomment');
      const top = Math.max(sa.getBoundingClientRect().top, add ? add.getBoundingClientRect().bottom : 0);
      sa.scrollTop += el.getBoundingClientRect().top - top - 8;
    }
    el.classList.remove('uhub-new-comment');
    void el.offsetWidth;
    el.classList.add('uhub-new-comment');
  }
  function onSubmitIntent() {
    editorGen += 1;
    closeSendCheck();
    ownPost = { at: Date.now(), before: new Set(domCommentIds(scrollAreaEl())) };
    discardDraft();
    draft.suspendUntil = Date.now() + 8000;
  }
  function onDocSubmitCapture(ev) {
    if (ev.target && ev.target.id === 'issue-comment-add') onSubmitIntent();
  }
  function onDocClickForDraft(ev) {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('#issue-comment-add-cancel')) {
      editorGen += 1;
      closeSendCheck();
      discardDraft();
      draft.suspendUntil = Date.now() + 3000;
    } else if (t.closest('#issue-comment-add-submit')) {
      onSubmitIntent();
    }
  }
  function isSubmitKey(ev) {
    return ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)
      || (ev.ctrlKey && ev.altKey && (ev.key === 's' || ev.key === 'S'));
  }
  function onDocKeyForDraft(ev) {
    if (ev.defaultPrevented) return;
    if (isSubmitKey(ev) && ev.target && ev.target.closest && ev.target.closest('#addcomment')) onSubmitIntent();
  }
  // Atalhos de envio digitados DENTRO do editor visual (outro documento)
  function watchEditorKeys() {
    const body = acEditorBody();
    const d = body && body.ownerDocument;
    if (!d || watchedEditorDocs.has(d)) return;
    watchedEditorDocs.add(d);
    try {
      d.addEventListener('keydown', onSendKeyCapture, true);
      d.addEventListener('keydown', (ev) => { if (isSubmitKey(ev) && !ev.defaultPrevented) onSubmitIntent(); }, true);
    } catch {}
  }
  // Conferencia antes de enviar o comentario Ao clicar em Adicionar (ou Ctrl+Enter), confere o texto e, se
  // notar algo, mostra um aviso discreto dentro do campo, com a correcao em 1 clique: - fala de anexo ("segue",
  // "em anexo", "v2", "nova versão"...) e nao cita nenhum -> oferece citar os anexos certos (a versao citada,
  // os que voce enviou depois do seu ultimo comentario, os novos ou o mais recente); - escreveu "@nome" sem
  // marcar a pessoa -> oferece marcar quem combina; - chegou comentario novo enquanto voce escrevia -> mostra
  // qual. "Enviar assim" envia sem mudar nada. Desligavel em Ajustes.
  const sendCheck = { bypass: false, lastIssues: null };
  const ATT_INTENT_RE = /(^|[^\p{L}])(segue[m]?|em anexo|anex(o|os|ei|ado|ada|ados|adas|ando)|subi|upei|nova vers[aã]o|vers[aã]o (nova|atualizada|ajustada|final)|print|arquivos?|v\d{1,3}|op\d{1,3})(?=$|[^\p{L}\d])/iu;
  function normTxt(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function commentSnapshot() {
    const ta = acTextarea();
    const mode = acMode();
    const out = { text: '', hasAttRef: false, mentions: new Set(), mode };
    if (mode === 'source' || !acEditorBody()) {
      const v = ta ? ta.value : '';
      out.text = v.replace(/\[~[^\]]+\]/g, ' ').replace(/\[[^\]|]*\|[^\]]+\]/g, (m) => (/\/secure\/attachment\//.test(m) ? ' ' : m));
      out.hasAttRef = /\[\^[^\]]+\]|![^!\s][^!\n]*!|\/secure\/(attachment|thumbnail)\//.test(v);
      (v.match(/\[~([^\]]+)\]/g) || []).forEach((m) => out.mentions.add(m.slice(2, -1).toLowerCase()));
    } else {
      const b = acEditorBody();
      const clone = b.cloneNode(true);
      clone.querySelectorAll('a.user-hover, a[href*="/secure/attachment/"]').forEach((a) => a.remove());
      out.text = clone.textContent || '';
      out.hasAttRef = !!b.querySelector('a[href*="/secure/attachment/"], img[src*="/secure/attachment/"], img[src*="/secure/thumbnail/"]')
        || /\[\^[^\]]+\]|![^!\s][^!\n]*!/.test(ta ? ta.value : '');
      b.querySelectorAll('a.user-hover[rel]').forEach((a) => out.mentions.add(String(a.getAttribute('rel')).toLowerCase()));
    }
    return out;
  }
  function peopleOnIssue() {
    const me = currentUser();
    const map = new Map();
    qa('#uhub-sidebar-scroll .action-details a.user-hover[rel], #peoplemodule a.user-hover[rel], #peoplemodule span.user-hover[rel]').forEach((a) => {
      const rel = String(a.getAttribute('rel') || '').trim();
      if (!rel || rel.toLowerCase() === me) return;
      const name = cleanText(a.textContent) || rel;
      if (!map.has(rel.toLowerCase())) map.set(rel.toLowerCase(), { user: rel, display: name });
    });
    return [...map.values()];
  }
  function matchPeople(word, people) {
    const w = normTxt(word).replace(/[._-]+$/, '');
    if (w.length < 2) return [];
    const score = (p) => {
      const d = normTxt(p.display);
      const u = normTxt(p.user);
      const parts = d.split(/\s+/);
      if (u === w || u.split('@')[0] === w || d === w) return 3;
      if (parts.some((x) => x === w) || u.startsWith(w)) return 2;
      if (parts.some((x) => x.startsWith(w)) || d.replace(/\s+/g, '').startsWith(w.replace(/[._-]/g, ''))) return 1;
      return 0;
    };
    const ranked = people.map((p) => ({ p, s: score(p) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    if (!ranked.length) return [];
    const best = ranked[0].s;
    return ranked.filter((x) => x.s === best).map((x) => x.p).slice(0, 3);
  }
  function myLastCommentTime() {
    const me = currentUser();
    let last = 0;
    qa('#uhub-sidebar-scroll .activity-comment[id^="comment-"]').forEach((c) => {
      const a = c.querySelector('.action-details a.user-hover[rel]');
      if (!a || String(a.getAttribute('rel')).toLowerCase() !== me) return;
      const t = c.querySelector('time[datetime]');
      const ts = t ? Date.parse(t.getAttribute('datetime')) : 0;
      if (ts > last) last = ts;
    });
    return last;
  }
  // Quais anexos fazem sentido citar, do mais especifico ao mais generico
  function attachmentSuggestions(text) {
    const infos = Array.from(qa('#attachment_thumbnails li.attachment-content')).map(attLiInfo).filter(Boolean);
    if (!infos.length) return { refs: [], why: '' };
    const sens = prefs.attSens || 'normal';
    const n = normTxt(text);
    const vm = n.match(/(^|[^a-z\d])v(?:ersao\s*)?(\d{1,3})(?![\d])/);
    const om = n.match(/(^|[^a-z\d])op(?:cao\s*)?(\d{1,3})(?![\d])/);
    const byTime = (a, b) => a.t - b.t;
    const pick = (list, why) => ({ refs: list.sort(byTime).map((i) => attachmentRef(i.li)).filter(Boolean), why });
    if (vm) {
      const v = Number(vm[2]);
      let hits = infos.filter((i) => parseAttName(i.name, sens).ver === v && !parseAttName(i.name, sens).solo);
      if (om && hits.length) {
        const o = Number(om[2]);
        const h2 = hits.filter((i) => parseAttName(i.name, sens).op === o);
        if (h2.length) hits = h2;
      }
      if (hits.length) return pick(hits, `v${v}`);
    }
    const me = myFullName();
    const since = myLastCommentTime();
    const mine = infos.filter((i) => (!me || i.author.toLowerCase() === me) && i.t > since);
    if (mine.length && mine.length <= 8) return pick(mine, since ? 'enviados depois do seu último comentário' : 'enviados por você');
    const fresh = infos.filter((i) => attNewState.fresh.has(i.id));
    if (fresh.length && fresh.length <= 8) return pick(fresh, 'novos');
    const newest = infos.slice().sort(byTime).pop();
    return pick([newest], 'mais recente');
  }
  function analyzeComment() {
    const snap = commentSnapshot();
    const issues = [];
    const text = snap.text || '';
    if (!snap.hasAttRef && ATT_INTENT_RE.test(text)) {
      const sug = attachmentSuggestions(text);
      if (sug.refs.length) issues.push({ type: 'attach', refs: sug.refs, why: sug.why });
    }
    const people = peopleOnIssue();
    const re = /(^|[\s(,;:])@([\p{L}][\p{L}\d._-]{1,40})/gu;
    let m;
    const seen = new Set();
    while ((m = re.exec(text))) {
      const word = m[2].replace(/[._-]+$/, '');
      if (seen.has(word.toLowerCase())) continue;
      seen.add(word.toLowerCase());
      const cands = matchPeople(word, people).filter((p) => !snap.mentions.has(p.user.toLowerCase()));
      const already = matchPeople(word, people).some((p) => snap.mentions.has(p.user.toLowerCase()));
      if (already && !cands.length) continue;
      issues.push({ type: 'at', word, cands });
    }
    const fresh = [...unread.ids].map((id) => commentEl(id)).filter(Boolean);
    if (fresh.length) issues.push({ type: 'new', ids: [...unread.ids], n: fresh.length });
    return issues;
  }
  function sendCheckPanel() {
    const ac = acEl();
    if (!ac) return null;
    let p = ac.querySelector('#uhub-sendcheck');
    if (!p) {
      p = mk('div');
      p.id = 'uhub-sendcheck';
      p.setAttribute('role', 'alertdialog');
      p.setAttribute('aria-live', 'polite');
      const form = ac.querySelector('form') || ac;
      const actions = ac.querySelector('#issue-comment-add-submit');
      const anchor = actions ? (actions.closest('.buttons-container, .buttons, .form-footer') || actions) : null;
      if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(p, anchor);
      else form.appendChild(p);
    }
    return p;
  }
  function closeSendCheck() {
    const p = gid('uhub-sendcheck');
    if (p) p.remove();
    sendCheck.lastIssues = null;
  }
  function renderSendCheck(issues) {
    const p = sendCheckPanel();
    if (!p) return;
    sendCheck.lastIssues = issues;
    p.innerHTML = '';
    const head = mk('div');
    head.className = 'sc-head';
    head.textContent = issues.length ? 'Antes de enviar' : 'Tudo certo';
    p.appendChild(head);
    const list = mk('div');
    list.className = 'sc-list';
    const mkBtn = (label, onClick, cls = '') => {
      const b = mk('button');
      b.type = 'button';
      b.className = `sc-btn ${cls}`.trim();
      b.textContent = label;
      b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); onClick(b); });
      return b;
    };
    issues.forEach((it) => {
      const row = mk('div');
      row.className = `sc-item sc-${it.type}`;
      const msg = mk('div');
      msg.className = 'sc-msg';
      const acts = mk('div');
      acts.className = 'sc-acts';
      if (it.type === 'attach') {
        msg.textContent = it.refs.length === 1
          ? `O texto fala de anexo, mas nenhum foi citado. Citar “${it.refs[0].file}” (${it.why})?`
          : `O texto fala de anexo, mas nenhum foi citado. Citar os ${it.refs.length} anexos ${it.why}?`;
        acts.appendChild(mkBtn(it.refs.length === 1 ? 'Citar' : `Citar ${it.refs.length}`, (b) => fixAttach(it.refs, b), 'sc-fix'));
        acts.appendChild(mkBtn('Escolher', () => chooseAttachments()));
      } else if (it.type === 'at') {
        if (it.cands.length) {
          msg.textContent = `“@${it.word}” não marca ninguém (a pessoa não será notificada).`;
          it.cands.forEach((c) => acts.appendChild(mkBtn(`Marcar ${c.display}`, (b) => fixAt(it.word, c, b), 'sc-fix')));
        } else {
          msg.textContent = `“@${it.word}” não marca ninguém e não achei essa pessoa na issue. Use o Responder no comentário dela ou digite @ e escolha da lista.`;
        }
      } else if (it.type === 'new') {
        msg.textContent = it.n === 1 ? 'Tem 1 comentário novo que você ainda não leu.' : `Tem ${it.n} comentários novos que você ainda não leu.`;
        acts.appendChild(mkBtn('Ver', () => focusComment(it.ids[0])));
      }
      row.appendChild(msg);
      if (acts.childNodes.length) row.appendChild(acts);
      list.appendChild(row);
    });
    p.appendChild(list);
    const foot = mk('div');
    foot.className = 'sc-foot';
    foot.appendChild(mkBtn(issues.length ? 'Enviar assim' : 'Enviar', () => submitBypassingCheck(), issues.length ? 'sc-send' : 'sc-send sc-primary'));
    foot.appendChild(mkBtn('Voltar ao texto', () => closeSendCheck(), 'sc-back'));
    p.appendChild(foot);
    const first = p.querySelector('.sc-fix') || p.querySelector('.sc-send');
    if (first && !sendCheck.quiet) try { first.focus({ preventScroll: true }); } catch {}
    watchSendCheckInput();
  }
  // Com o aviso aberto, voce corrigiu no texto? O aviso se atualiza sozinho.
  let sendCheckT = 0;
  function onSendCheckInput() {
    if (!gid('uhub-sendcheck')) return;
    clearTimeout(sendCheckT);
    sendCheckT = setTimeout(() => {
      if (!gid('uhub-sendcheck') || !acIsOpen()) return;
      sendCheck.quiet = true;
      try { renderSendCheck(analyzeComment()); } finally { sendCheck.quiet = false; }
    }, 450);
  }
  const sendCheckWatched = new WeakSet();
  function watchSendCheckInput() {
    const ta = acTextarea();
    const body = acEditorBody();
    [ta, body].forEach((el) => {
      if (!el || sendCheckWatched.has(el)) return;
      sendCheckWatched.add(el);
      el.addEventListener('input', onSendCheckInput);
      el.addEventListener('keyup', onSendCheckInput);
    });
  }
  async function recheckAfterFix() {
    await sleep(120);
    if (!acIsOpen()) { closeSendCheck(); return; }
    renderSendCheck(analyzeComment());
  }
  async function fixAttach(refs, btn) {
    if (btn) btn.disabled = true;
    const res = await enqueueEditorOp(() => citeRefs(refs));
    if (!res || res.aborted) return;
    recheckAfterFix();
  }
  function chooseAttachments() {
    closeSendCheck();
    const am = gid('attachmentmodule');
    if (am) am.scrollIntoView({ block: 'start', behavior: 'smooth' });
    showToast('Marque os anexos e use “Citar” no cabeçalho de Anexos', 3500);
  }
  async function fixAt(word, person, btn) {
    if (btn) btn.disabled = true;
    const token = `@${word}`;
    if (acMode() === 'source') {
      const ta = acTextarea();
      const i = ta.value.indexOf(token);
      if (i >= 0) {
        writeSourceText(ta.value.slice(0, i) + ta.value.slice(i + token.length));
        try { ta.focus(); ta.setSelectionRange(i, i); } catch {}
        markCaret(ta);
      }
    } else {
      const b = acEditorBody();
      if (b) {
        const w = b.ownerDocument.createTreeWalker(b, 4);
        let n;
        while ((n = w.nextNode())) {
          const i = n.nodeValue.indexOf(token);
          if (i < 0) continue;
          const r = b.ownerDocument.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + token.length);
          r.deleteContents();
          r.collapse(true);
          const sel = b.ownerDocument.defaultView.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
          b.dispatchEvent(new InputEvent('input', { bubbles: true }));
          break;
        }
      }
    }
    await enqueueEditorOp(() => mentionUser(person.user, person.display));
    recheckAfterFix();
  }
  function submitBypassingCheck() {
    closeSendCheck();
    const btn = gid('issue-comment-add-submit');
    if (!btn) return;
    sendCheck.bypass = true;
    try { btn.click(); } finally { setTimeout(() => { sendCheck.bypass = false; }, 0); }
  }
  // true = pode enviar; false = mostrou o aviso e segurou o envio
  function sendCheckAllows() {
    if (sendCheck.bypass || !prefs.sendCheck || !state.applied || !acIsOpen()) return true;
    let issues = [];
    try { issues = analyzeComment(); } catch (e) { return true; }
    if (!issues.length) { closeSendCheck(); return true; }
    renderSendCheck(issues);
    try { diag({ kind: 'send-check', issues: issues.map((i) => i.type) }); } catch {}
    return false;
  }
  function blockEvent(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  }
  function onSendClickCapture(ev) {
    const t = ev.target && ev.target.closest ? ev.target.closest('#issue-comment-add-submit') : null;
    if (!t || !t.closest('#addcomment')) return;
    if (!sendCheckAllows()) blockEvent(ev);
  }
  function onSendSubmitCapture(ev) {
    if (!ev.target || ev.target.id !== 'issue-comment-add') return;
    if (!sendCheckAllows()) blockEvent(ev);
  }
  function onSendKeyCapture(ev) {
    if (ev.key === 'Escape' && gid('uhub-sendcheck')) { blockEvent(ev); closeSendCheck(); return; }
    if (!isSubmitKey(ev)) return;
    const t = ev.target;
    const inEditorFrame = !!(t && t.ownerDocument && t.ownerDocument !== document);
    const inForm = !!(t && t.closest && t.closest('#addcomment'));
    if (!inEditorFrame && !inForm) return;
    if (!sendCheckAllows()) blockEvent(ev);
  }
  document.addEventListener('click', onSendClickCapture, true);
  document.addEventListener('submit', onSendSubmitCapture, true);
  document.addEventListener('keydown', onSendKeyCapture, true);
  // Comentario seu publicado com o mesmo texto do rascunho -> descarta
  function draftMatchesComment(d, c) {
    const a = cleanText(normWiki(d.wiki)).toLowerCase();
    const b = cleanText(c.text || '').toLowerCase();
    return !!a && !!b && (a === b || b.includes(a) || a.includes(b));
  }
  function discardDraftIfPosted(myNewComments) {
    const d = readDrafts()[state.issueKey];
    if (!d || !myNewComments || !myNewComments.length) return;
    if (acIsOpen() && normWiki(acTextarea().value) && !myNewComments.some((c) => draftMatchesComment(d, c))) return;
    if (myNewComments.some((c) => draftMatchesComment(d, c)) || !acIsOpen() || !normWiki(acTextarea().value)) discardDraft();
  }
  async function restoreDraft() {
    const key = state.issueKey;
    const d = readDrafts()[key];
    if (!d || !normWiki(d.wiki)) return;
    const me = currentUser();
    const mine = (auto.lastList || []).filter((c) => me && c.authorName === me);
    if (mine.some((c) => draftMatchesComment(d, c) && Date.parse(fixIsoOffset(c.created)) >= (d.at || 0) - 120000)) {
      discardDraft();
      return;
    }
    if (acIsOpen() && normWiki(acTextarea().value)) return;
    draft.busy = true;
    try {
      if (!(await openCommentForm())) return;
      if (normWiki(acTextarea().value)) return;
      const ok = await replaceCommentWiki(d.wiki);
      if (ok) {
        draft.lastSaved = normWiki(d.wiki);
        const t = new Date(d.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        showToast(`Rascunho restaurado (${t})`, 3500);
      }
    } finally {
      draft.busy = false;
    }
  }
  function onPageHideForDraft() { draftTick(true); }
  function startDrafts() {
    draft.lastSaved = '';
    draft.suspendUntil = 0;
    draft.busy = false;
    document.addEventListener('submit', onDocSubmitCapture, true);
    document.addEventListener('click', onDocClickForDraft, true);
    document.addEventListener('keydown', onDocKeyForDraft, true);
    window.addEventListener('pagehide', onPageHideForDraft);
    draft.timer = setInterval(() => { draftTick(false); if (acIsOpen()) watchEditorKeys(); }, 1000);
    const t0 = Date.now();
    const waitBaseline = () => {
      if (!state.applied) return;
      if (auto.lastList || Date.now() - t0 > 5000) enqueueEditorOp(restoreDraft);
      else draft.restoreTimer = setTimeout(waitBaseline, 250);
    };
    draft.restoreTimer = setTimeout(waitBaseline, 600);
  }
  function stopDrafts() {
    draftTick(true);
    clearInterval(draft.timer);
    clearTimeout(draft.restoreTimer);
    draft.timer = null;
    document.removeEventListener('submit', onDocSubmitCapture, true);
    document.removeEventListener('click', onDocClickForDraft, true);
    document.removeEventListener('keydown', onDocKeyForDraft, true);
    window.removeEventListener('pagehide', onPageHideForDraft);
  }
  async function copyText(text) {
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, 'text');
        return true;
      }
    } catch {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = mk('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
  function summaryText() {
    const el = gid('summary-val');
    if (!el) return '';
    const input = el.querySelector('input, textarea');
    if (input && input.value) return input.value.trim();
    const h = el.querySelector('h1, h2, h3');
    return cleanText((h || el).textContent);
  }
  function makeCopyButton(id, label, getText) {
    const b = mk('button');
    b.type = 'button';
    b.id = id;
    b.className = 'uhub-copy-btn';
    b.title = label;
    b.setAttribute('aria-label', label);
    b.innerHTML = ICON_COPY;
    b.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const text = getText();
      if (!text) return;
      const ok = await copyText(text);
      if (ok) {
        b.innerHTML = ICON_CHECK;
        b.classList.add('uhub-copied');
        b.title = 'Copiado!';
        showToast(`Copiado: ${text.length > 60 ? text.slice(0, 57) + '…' : text}`, 1600);
        setTimeout(() => {
          b.innerHTML = ICON_COPY;
          b.classList.remove('uhub-copied');
          b.title = label;
        }, 1400);
      } else showToast('Não foi possível copiar', 2500);
    });
    return b;
  }
  function decorateCopyButtons() {
    const summary = gid('summary-val');
    if (summary && !(summary.nextElementSibling && summary.nextElementSibling.id === 'uhub-copy-summary')) {
      const old = gid('uhub-copy-summary');
      if (old) old.remove();
      summary.after(makeCopyButton('uhub-copy-summary', 'Copiar título', summaryText));
    }
    ensureKeyCopyButton();
  }
  function ensureKeyCopyButton() {
    try { if (typeof window.__uhubEnsureKeyCopy === 'function') window.__uhubEnsureKeyCopy(); } catch {}
  }
  // "Aguardando voce": o ultimo comentario e de outra pessoa e voce ainda nao respondeu. Selo no cabecalho da
  // coluna + "⏳3h" no titulo da aba. Neutro, amarelo a partir de 2h e vermelho a partir de 8h.
  const waiting = { since: 0, by: '', id: '', readAt: 0, seenSince: 0, timer: null, readTimer: null };
  function fixIsoOffset(s) {
    return String(s || '').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  }
  function fmtWaiting(ms) {
    const min = Math.max(0, Math.floor(ms / 60000));
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
  // Quando cada comentario foi lido por voce (compartilhado entre abas)
  const READ_AT_KEY = 'uhub-read-at';
  function readAtMap() {
    try { return JSON.parse(GM_getValue(READ_AT_KEY, '{}')) || {}; } catch (e) { return {}; }
  }
  function getReadAt(id) {
    return Number(readAtMap()[String(id)]) || 0;
  }
  function setReadAt(id, ts) {
    const map = readAtMap();
    if (map[String(id)]) return;
    map[String(id)] = ts;
    const keys = Object.keys(map);
    if (keys.length > 500) keys.sort((x, y) => map[x] - map[y]).slice(0, keys.length - 500).forEach((k) => delete map[k]);
    GM_setValue(READ_AT_KEY, JSON.stringify(map));
  }
  // Status final da issue: sem ampulheta nem selo
  const FINAL_STATUS_RE = /^(approved|aprovad[oa]|done|conclu[ií]d[oa]|canceled|cancelled|cancelad[oa]|closed|fechad[oa]|resolved|resolvid[oa])$/i;
  function issueIsFinal() {
    const trig = gid('opsbar-transitions_more');
    if (trig && /status-category_done/.test(trig.className)) return true;
    const name = displayedStatusText();
    return !!name && FINAL_STATUS_RE.test(name.trim());
  }
  function updateWaiting(list) {
    const me = currentUser();
    const prevId = waiting.id;
    waiting.since = 0;
    waiting.by = '';
    waiting.id = '';
    if (list && list.length && me) {
      const withTime = list.map((c) => ({ c, t: Date.parse(fixIsoOffset(c.created)) }));
      withTime.sort((x, y) => (x.t || 0) - (y.t || 0) || Number(x.c.id) - Number(y.c.id));
      const last = withTime[withTime.length - 1];
      if (last && last.c.authorName !== me && last.t) {
        waiting.since = last.t;
        waiting.by = last.c.authorDisplay;
        waiting.id = String(last.c.id);
      }
    }
    if (waiting.id !== prevId) waiting.seenSince = 0;
    waiting.readAt = waiting.id ? getReadAt(waiting.id) : 0;
    renderWaiting();
  }
  function fmtDateShort(ts) {
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function renderWaiting() {
    const header = gid('uhub-sidebar-header');
    let pill = gid('uhub-waiting');
    const setTitleLabel = (label) => {
      if (titleWaitingLabel !== label) {
        titleWaitingLabel = label;
        applyTitle();
        if (label) watchTitle();
      }
    };
    if (!waiting.since || issueIsFinal()) {
      if (pill) pill.remove();
      setTitleLabel('');
      return;
    }
    if (header && !pill) {
      pill = mk('span');
      pill.id = 'uhub-waiting';
      const title = gid('uhub-sidebar-title');
      if (title) title.after(pill); else header.insertBefore(pill, header.firstChild);
    }
    const read = waiting.readAt && waiting.readAt >= waiting.since;
    const ms = (read ? waiting.readAt : Date.now()) - waiting.since;
    const label = fmtWaiting(ms);
    if (pill) {
      const text = read ? `Aguardou você por ${label}` : `Aguardando você há ${label}`;
      const level = ms >= 8 * 3600000 ? 'late' : ms >= 2 * 3600000 ? 'warn' : 'ok';
      if (pill.textContent !== text) pill.textContent = text;
      if (pill.dataset.level !== level) pill.dataset.level = level;
      const tip = read
        ? `Comentário de ${waiting.by} em ${fmtDateShort(waiting.since)}, lido por você em ${fmtDateShort(waiting.readAt)} — ainda sem resposta sua`
        : `Último comentário de ${waiting.by} em ${fmtDateShort(waiting.since)}, ainda não lido e sem resposta sua`;
      if (pill.title !== tip) pill.title = tip;
    }
    setTitleLabel(read ? '' : label);
  }
  // Marca como lido o ultimo comentario (mesma regra: visivel na coluna, aba em foco, por meio segundo) — vale
  // tambem para comentarios que ja estavam na issue quando voce a abriu.
  let waitingSyncCounter = 0;
  function waitingReadTick() {
    if (!waiting.since || !waiting.id || waiting.readAt) return;
    waitingSyncCounter = (waitingSyncCounter + 1) % 4;
    const other = waitingSyncCounter === 0 ? getReadAt(waiting.id) : 0;
    if (other) {
      waiting.readAt = other;
      renderWaiting();
      return;
    }
    const el = commentEl(waiting.id);
    if (tabIsActive() && commentIsVisible(el)) {
      const now = Date.now();
      if (!waiting.seenSince) waiting.seenSince = now;
      else if (now - waiting.seenSince >= UNREAD_SEEN_MS) {
        setReadAt(waiting.id, now);
        waiting.readAt = now;
        renderWaiting();
      }
    } else waiting.seenSince = 0;
  }
  function startWaiting() {
    const sa = gid('uhub-sidebar-scroll');
    if (sa && sa.querySelector('.activity-comment')) updateWaiting(snapshotFromDoc(sa));
    waiting.timer = setInterval(renderWaiting, 60000);
    waiting.readTimer = setInterval(waitingReadTick, 125);
  }
  function stopWaiting() {
    clearInterval(waiting.timer);
    clearInterval(waiting.readTimer);
    waiting.timer = null;
    waiting.readTimer = null;
    waiting.since = 0;
    waiting.id = '';
    waiting.readAt = 0;
    const pill = gid('uhub-waiting');
    if (pill) pill.remove();
    titleWaitingLabel = '';
  }
  // Descricao em edicao: o editor visual fica num documento proprio (iframe); aplicamos la dentro o mesmo 14px.
  function styleDescriptionEditors() {
    if (!document.documentElement.classList.contains('uhub-wide')) return;
    qa('#descriptionmodule iframe').forEach((f) => {
      const apply = () => {
        try {
          const d = f.contentDocument;
          if (!d || !d.head || d.getElementById('uhub-desc-14')) return;
          const st = d.createElement('style');
          st.id = 'uhub-desc-14';
          st.textContent = 'body, body *:not(.aui-icon) { font-size: 14px !important; }';
          d.head.appendChild(st);
        } catch {}
      };
      apply();
      if (!f.dataset.uhubDesc14) {
        f.dataset.uhubDesc14 = '1';
        f.addEventListener('load', apply);
      }
    });
  }
  // Detalhes do Item (#details-module): realocado para dentro do popover flutuante (#viewissuesidebar)
  // para desaparecer da coluna principal mantendo os campos restantes (Tipo, Componentes, Rotulos, Account...) acessiveis.
  let detailsAnchor = null;
  function placeDetailsInSidebar() {
    dedupeById('details-module', (m) => m.dataset.uhubPlaced === '1');
    const dm = gid('details-module');
    const sb = gid('viewissuesidebar');
    if (dm) dedupeById['details-module'] = dm;
    if (!dm || !sb || dm.parentElement === sb) return;
    if (!detailsAnchor || !detailsAnchor.isConnected) {
      detailsAnchor = document.createComment('uhub-details-anchor');
      dm.before(detailsAnchor);
    }
    dm.dataset.uhubPlaced = '1';
    sb.prepend(dm);
    let close = sb.querySelector('#uhub-meta-close');
    if (!close) {
      close = mk('button');
      close.id = 'uhub-meta-close';
      close.type = 'button';
      close.title = 'Fechar';
      close.innerHTML = ICON_CLOSE;
      close.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleMetaPopover(false); });
      sb.prepend(close);
    }
    if (metaPopoverOpen()) expandMetaPopoverModules();
  }
  function restoreDetailsFromSidebar() {
    const dm = gid('details-module');
    if (dm) {
      delete dm.dataset.uhubPlaced;
      if (detailsAnchor && detailsAnchor.isConnected) detailsAnchor.before(dm);
      else if (dm.parentElement && dm.parentElement.id === 'viewissuesidebar') {
        const main = q1('.issue-main-column');
        if (main) main.prepend(dm);
      }
    }
    if (detailsAnchor) detailsAnchor.remove();
    detailsAnchor = null;
  }
  // Anexos: largura total, tamanho ajustavel e largura proporcional - #attachmentmodule passa a ficar abaixo
  // das DUAS colunas (conteudo e metadados), ocupando a largura toda. So muda de lugar no DOM: todos os
  // recursos do Jira (arrastar arquivos, visualizador, excluir) continuam. - Tamanho (largura de cada anexo)
  // ajustavel no cabecalho de Anexos e nos Ajustes; vale para todas as issues. Acima do tamanho da miniatura do
  // Jira, a imagem original do anexo e usada para nao ficar borrada. - Largura proporcional (opcional, ligada
  // por padrao): anexo estreito (retrato) ocupa menos espaco horizontal.
  const THUMB_NATIVE_MAX = 220;
  const DISPLAYABLE_IMG = /\.(jpe?g|png|gif|webp|bmp|svg|avif)(\?|#|$)/i;
  let attachAnchor = null;
  // Ao enviar anexo (e em outras atualizacoes) o Jira desenha um
  // #attachmentmodule NOVO no lugar original; o antigo, que movemos, ficaria
  // duplicado. Fica sempre so a versao mais nova (a que ainda nao decoramos).
  function dedupeById(id, isOurs) {
    const all = [...qa('#' + id)];
    if (all.length < 2) return;
    const placed = dedupeById[id];
    const keep = all.find((e) => e !== placed && !isOurs(e)) || all.find((e) => e !== placed) || all[0];
    all.forEach((e) => { if (e !== keep) e.remove(); });
  }
  function placeAttachments() {
    dedupeById('attachmentmodule', (m) => !!m.querySelector('.uhub-att-li, [data-uhub-att]'));
    const am = gid('attachmentmodule');
    const group = q1('.issue-body-content .aui-group.issue-body, .aui-group.issue-body');
    if (am) dedupeById.attachmentmodule = am;
    if (!am || !group || am.parentElement === group) return;
    if (!attachAnchor || !attachAnchor.isConnected) {
      attachAnchor = document.createComment('uhub-attachments-anchor');
      am.before(attachAnchor);
    }
    group.appendChild(am);
  }
  function restoreAttachments() {
    const am = gid('attachmentmodule');
    if (am) {
      if (attachAnchor && attachAnchor.isConnected) attachAnchor.before(am);
      else if (am.parentElement && am.parentElement.matches('.aui-group.issue-body')) {
        const desc = gid('descriptionmodule');
        const main = q1('.issue-main-column');
        if (desc) desc.after(am); else if (main) main.appendChild(am);
      }
    }
    if (attachAnchor) attachAnchor.remove();
    attachAnchor = null;
  }
  function tileAspect(li, img) {
    const w = img.naturalWidth || Number(img.getAttribute('width')) || 0;
    const h = img.naturalHeight || Number(img.getAttribute('height')) || 0;
    if (!w || !h) return;
    li.style.setProperty('--uhub-aspect', (w / h).toFixed(4));
    li.setAttribute('data-uhub-aspect', '1');
  }
  function applyTileResolution(li) {
    const img = li.querySelector('img.attachment-thumb-img');
    const a = li.querySelector('.attachment-thumb a[href]');
    if (!img || !a) return;
    const full = a.getAttribute('href') || '';
    const isImage = li.getAttribute('data-attachment-type') === 'image' && DISPLAYABLE_IMG.test(full);
    if (!img.dataset.uhubThumb) img.dataset.uhubThumb = img.getAttribute('src') || '';
    const wantFull = isImage && effectiveAttSize() > THUMB_NATIVE_MAX && !img.dataset.uhubNoFull;
    const want = wantFull ? full : img.dataset.uhubThumb;
    if (!want || img.getAttribute('src') === want) return;
    if (wantFull && !img.dataset.uhubErrWatch) {
      img.dataset.uhubErrWatch = '1';
      img.addEventListener('error', () => {
        if (img.getAttribute('src') === full && img.dataset.uhubThumb) {
          img.dataset.uhubNoFull = '1';
          img.setAttribute('src', img.dataset.uhubThumb);
        }
      });
    }
    // troca para a versao grande so depois de ela carregar (evita o quadro em branco / piscada)
    if (!wantFull) {
      img.dataset.uhubSwap = '';
      img.setAttribute('src', want);
      return;
    }
    if (img.dataset.uhubSwap === want) return;
    img.dataset.uhubSwap = want;
    try {
      const pre = new Image();
      pre.onload = () => {
        try { if (img.dataset.uhubSwap === want && img.getAttribute('src') !== want) img.setAttribute('src', want); } catch (e) { perRowLog(e); }
      };
      pre.onerror = () => {
        try { img.dataset.uhubNoFull = '1'; img.dataset.uhubSwap = ''; } catch (e) { perRowLog(e); }
      };
      pre.src = want;
    } catch (e) {
      perRowLog(e);
      img.setAttribute('src', want);
    }
  }
  function decorateAttachments() {
    const list = gid('attachment_thumbnails');
    if (!list) return;
    list.querySelectorAll('li.attachment-content').forEach(addAttachmentCiteButton);
    syncAttSelection();
    list.querySelectorAll('li.attachment-content:not([data-uhub-att])').forEach((li) => {
      li.setAttribute('data-uhub-att', '1');
      const img = li.querySelector('img.attachment-thumb-img');
      if (!img) return;
      if (img.getAttribute('loading') === 'lazy' && !img.dataset.uhubThumb) img.setAttribute('loading', 'eager');
      if (img.complete && img.naturalWidth) tileAspect(li, img);
      else img.addEventListener('load', () => { if (!li.hasAttribute('data-uhub-aspect')) tileAspect(li, img); }, { once: true });
      applyTileResolution(li);
    });
    decorateAttachmentHeader();
    syncAttachmentControls();
    syncReviewChip();
    applyReviewSize();
    syncReviewMeta();
    applyAttachmentNewBadges();
    bindEditorPreview();
  }
  // ---------- Citar o anexo no novo comentario ---------- Balao preenchido com aspas vazadas: mesmo peso
  // visual da lixeira (preenchida)
  const ICON_CITE = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M3.5 2h9A1.5 1.5 0 0 1 14 3.5v6a1.5 1.5 0 0 1-1.5 1.5H7.2l-3 2.6a.5.5 0 0 1-.8-.4V11A1.5 1.5 0 0 1 2 9.5v-6A1.5 1.5 0 0 1 3.5 2zM5 4.6h2.2v2.2c0 1-.45 1.75-1.35 2.2l-.45-.7c.45-.3.7-.65.7-1.1H5zm3.8 0H11v2.2c0 1-.45 1.75-1.35 2.2l-.45-.7c.45-.3.7-.65.7-1.1H8.8z"/></svg>';
  function attachmentRef(li) {
    const link = li.querySelector('a.attachment-title') || li.querySelector('.attachment-thumb a[href]');
    if (!link) return null;
    const href = link.getAttribute('href') || '';
    const prev = li.querySelector('a[file-preview-id]');
    const m = /\/secure\/attachment\/(\d+)\/([^?#]+)/.exec(href);
    const id = (prev && prev.getAttribute('file-preview-id')) || (m && m[1]);
    let file = (prev && prev.getAttribute('file-preview-title')) || cleanText(li.querySelector('a.attachment-title') ? li.querySelector('a.attachment-title').textContent : '');
    if (!file && m) { try { file = decodeURIComponent(m[2]); } catch (e) { file = m[2]; } }
    if (!id || !file) return null;
    return { kind: 'attachment', id: String(id), file, href };
  }
  // Os cliques dos botoes do script sao tratados por UM ouvinte delegado (onUhubButtonClick), entao qualquer
  // botao funciona mesmo que o Jira recrie/clone o anexo ou o comentario: nao depende de ouvinte no elemento.
  function addAttachmentCiteButton(li) {
    const dt = li.querySelector('dl dt');
    const ref = attachmentRef(li);
    if (!dt || !ref) return;
    const tl = li.querySelector('a.attachment-title');
    if (tl && tl.childNodes.length === 1 && tl.firstChild.nodeType === 3 && /_./.test(tl.textContent)) {
      const parts = tl.textContent.split(/(?<=_)/);
      tl.textContent = '';
      parts.forEach((part, i) => {
        if (i) tl.appendChild(mk('wbr'));
        tl.appendChild(document.createTextNode(part));
      });
    }
    const canDelete = !!li.querySelector('.attachment-delete a[href]');
    li.classList.toggle('uhub-att-nodel', !canDelete);
    let ph = dt.querySelector(':scope > .uhub-att-nodel-trash');
    if (!canDelete && !ph) {
      const info = attLiInfo(li);
      ph = mk('span');
      ph.className = 'uhub-att-nodel-trash';
      ph.setAttribute('role', 'img');
      ph.title = `Sem permissão para excluir${info && info.author ? ` (enviado por ${info.author})` : ''}`;
      ph.setAttribute('aria-label', ph.title);
      // SVG proprio: a fonte de icones do Jira nem sempre carrega (ficava um quadrado vazio)
      ph.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6 1.5h4a1 1 0 0 1 1 1V3h2.5a.75.75 0 0 1 0 1.5h-.6l-.6 8.6a1.75 1.75 0 0 1-1.75 1.6h-5.1a1.75 1.75 0 0 1-1.75-1.6L3.1 4.5h-.6a.75.75 0 0 1 0-1.5H5v-.5a1 1 0 0 1 1-1zM6.5 3h3v-.25h-3z"/></svg>';
      dt.appendChild(ph);
    } else if (canDelete && ph) ph.remove();
    let b = dt.querySelector('.uhub-att-cite') || li.querySelector('.uhub-att-cite');
    if (!b) {
      b = mk('button');
      b.type = 'button';
      b.className = 'uhub-att-cite';
      b.innerHTML = ICON_CITE;
      dt.appendChild(b);
    }
    const title = 'Citar este anexo no novo comentário';
    if (b.title !== title) b.title = title;
    const aria = `Citar ${ref.file} no novo comentário`;
    if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
    syncAttachmentInspectButton(li, ref);
  }
  const ICON_EYE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.1" stroke="currentColor" stroke-width="1.4"/></svg>';
  // Previa de PDF: 1a pagina desenhada no card (pdf.js), reaproveitada entre atualizacoes para nao piscar
  const pdfCache = new Map();
  let pdfWorkerReady = false, pdfQueue = Promise.resolve(), pdfErrs = 0;
  function pdfWarn(kind, e) {
    try { if (pdfErrs++ < 3) diag({ kind, msg: String(e && e.message || e) }); } catch {}
  }
  function pdfLib() {
    try {
      const lib = (typeof pdfjsLib !== 'undefined' && pdfjsLib) || (typeof unsafeWindow !== 'undefined' && unsafeWindow.pdfjsLib) || null;
      if (!lib || !lib.GlobalWorkerOptions) return null;
      if (!pdfWorkerReady) {
        pdfWorkerReady = true;
        const src = typeof GM_getResourceText === 'function' ? GM_getResourceText('pdfWorker') : '';
        if (src) lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      }
      return lib;
    } catch (e) { pdfWarn('pdf-lib-error', e); return null; }
  }
  async function pdfRender(ref, box) {
    const lib = pdfLib();
    if (!lib) throw new Error('pdf.js indisponivel');
    const res = await fetch(ref.href, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (Number(res.headers.get('content-length') || 0) > 30000000) throw new Error('PDF grande demais');
    const data = new Uint8Array(await res.arrayBuffer());
    const doc = await lib.getDocument({ data }).promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(2, 420 / (base.width || 420)) });
      const cv = mk('canvas');
      cv.width = Math.max(1, Math.round(vp.width));
      cv.height = Math.max(1, Math.round(vp.height));
      const ctx = cv.getContext('2d');
      if (!ctx) throw new Error('canvas indisponivel');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      box.appendChild(cv);
    } finally { try { doc.destroy(); } catch {} }
  }
  function pdfDone(id) {
    try {
      const list = gid('attachment_thumbnails');
      if (!list) return;
      Array.from(list.querySelectorAll('li.attachment-content')).forEach((li) => {
        const r = attachmentRef(li);
        if (r && r.id === id) syncPdfPreview(li, r);
      });
    } catch (e) { pdfWarn('pdf-preview-error', e); }
  }
  function syncPdfPreview(li, ref) {
    if (!li || !ref || !/\.pdf$/i.test(ref.file || '')) return;
    const thumb = li.querySelector('.attachment-thumb');
    const host = thumb ? thumb.querySelector(':scope > a') : null;
    if (!host) return;
    const old = host.querySelector(':scope > .uhub-pdfp');
    if (!attOn()) { if (old) old.remove(); li.classList.remove('uhub-pdf-on'); return; }
    let st = pdfCache.get(ref.id);
    if (!st) {
      if (pdfCache.size > 60) pdfCache.clear();
      st = { box: mk('div'), done: false, failed: false };
      st.box.className = 'uhub-pdfp';
      pdfCache.set(ref.id, st);
      const run = st;
      pdfQueue = pdfQueue.then(() => pdfRender(ref, run.box)).then(
        () => { run.done = true; pdfDone(ref.id); },
        (e) => { run.failed = true; pdfWarn('pdf-preview-error', e); }
      );
    }
    if (st.failed || !st.done) return;
    if (old !== st.box) {
      if (old) old.remove();
      host.appendChild(st.box);
    }
    li.classList.add('uhub-pdf-on');
  }
  // Previa de video: 1o quadro do video como thumb (mesmo estilo do PDF), reaproveitada entre atualizacoes para nao piscar
  const vidCache = new Map();
  let vidErrs = 0;
  function vidWarn(e) {
    try { if (vidErrs++ < 3) diag({ kind: 'video-preview-error', msg: String(e && e.message || e) }); } catch {}
  }
  function vidDone(id) {
    try {
      const list = gid('attachment_thumbnails');
      if (!list) return;
      Array.from(list.querySelectorAll('li.attachment-content')).forEach((li) => {
        const r = attachmentRef(li);
        if (r && r.id === id) syncVideoPreview(li, r);
      });
    } catch (e) { vidWarn(e); }
  }
  function syncVideoPreview(li, ref) {
    try {
      if (!li || !ref || !/\.(mp4|m4v|mov|webm|ogv)$/i.test(ref.file || '')) return;
      const thumb = li.querySelector('.attachment-thumb');
      const host = thumb ? thumb.querySelector(':scope > a') : null;
      if (!host) return;
      const old = host.querySelector(':scope > .uhub-vidp');
      if (!attOn()) { if (old) old.remove(); li.classList.remove('uhub-vid-on'); return; }
      let st = vidCache.get(ref.id);
      if (!st) {
        if (vidCache.size > 60) vidCache.clear();
        const box = mk('div');
        box.className = 'uhub-vidp';
        const v = mk('video');
        v.muted = true;
        v.preload = 'metadata';
        v.playsInline = true;
        v.tabIndex = -1;
        v.setAttribute('aria-hidden', 'true');
        st = { box, ready: false, failed: false };
        const run = st;
        v.addEventListener('loadeddata', () => { run.ready = true; vidDone(ref.id); }, { once: true });
        v.addEventListener('error', () => {
          run.failed = true;
          const l = box.closest('li.attachment-content');
          box.remove();
          if (l) l.classList.remove('uhub-vid-on');
          vidWarn(new Error('video sem previa: ' + ref.file));
        }, { once: true });
        box.appendChild(v);
        vidCache.set(ref.id, st);
        v.src = (ref.href || '') + '#t=0.1';
      }
      if (st.failed || !st.ready) return;
      if (old !== st.box) {
        if (old) old.remove();
        host.appendChild(st.box);
      }
      li.classList.add('uhub-vid-on');
    } catch (e) { vidWarn(e); }
  }
  function isImageAttachmentLi(li, ref) {
    if (!li || !ref) return false;
    if (li.getAttribute('data-attachment-type') === 'image') return true;
    return DISPLAYABLE_IMG.test(ref.href || '') || DISPLAYABLE_IMG.test(ref.file || '');
  }
  function syncAttachmentInspectButton(li, ref) {
    const thumb = li.querySelector('.attachment-thumb');
    if (!thumb) return;
    let btn = thumb.querySelector(':scope > .uhub-att-inspect');
    const isZip = isZipAttachmentLi(li, ref);
    const zz = isZip ? bvZip(ref.id) : null;
    try { syncZipPreview(li, ref, zz); } catch (e) { if (!syncZipPreview.warned) { syncZipPreview.warned = true; try { diag({ kind: 'zip-preview-error', msg: String(e && e.message || e) }); } catch {} } }
    try { syncPdfPreview(li, ref); } catch (e) { pdfWarn('pdf-preview-error', e); }
    try { syncVideoPreview(li, ref); } catch (e) { vidWarn(e); }
    const isVidFile = /\.(mp4|m4v|mov|webm|ogv)$/i.test(ref.file || '');
    const showable = isZip ? !!(zz.entries && zz.entries.length) : (isImageAttachmentLi(li, ref) || isVidFile);
    if (!prefs.betaViewer || !attOn() || !showable) {
      if (btn) btn.remove();
      return;
    }
    if (!btn) {
      btn = mk('button');
      btn.type = 'button';
      btn.className = 'uhub-att-inspect';
      btn.innerHTML = ICON_EYE;
      thumb.appendChild(btn);
    }
    const tip = isZip ? `Visualizar as ${zz.entries.length} imagens de ${ref.file} (Beta)` : (isVidFile ? `Assistir ${ref.file} (Beta)` : `Visualizar ${ref.file} em 1:1 (Beta)`);
    if (btn.title !== tip) btn.title = tip;
    if (btn.getAttribute('aria-label') !== tip) btn.setAttribute('aria-label', tip);
  }
  function onUhubButtonClick(ev) {
    const t = ev.target && ev.target.closest ? ev.target.closest('.uhub-att-cite, .uhub-att-inspect, .uhub-reply-btn, .uhub-attg-chip, .uhub-cmt-copy') : null;
    if (!t) return;
    ev.preventDefault();
    ev.stopPropagation();
    try {
      if (t.classList.contains('uhub-att-inspect')) {
        const li = t.closest('li.attachment-content');
        const r = li && attachmentRef(li);
        if (!r) { showToast('Não foi possível identificar a imagem', 3000); return; }
        if (isZipAttachmentLi(li, r)) {
          const zf = bvZip(r.id).entries;
          if (!zf || !zf.length) { showToast('Lendo o conteúdo do zip… tente de novo em instantes', 2500); return; }
          bv.zipOpen.add(r.id);
          openBetaViewer(`${r.id}/${zf[0].index}`);
        } else openBetaViewer(r.id);
      } else if (t.classList.contains('uhub-att-cite')) {
        const li = t.closest('li.attachment-content');
        const r = li && attachmentRef(li);
        if (!r) { showToast('Não foi possível identificar o anexo', 3000); return; }
        enqueueEditorOp(async () => {
          const res = await mentionUser(r, r.file);
          if (res === 'dup') showToast('Este anexo já está citado no comentário', 1800);
          else if (res === 'aborted' || res === 'noform') {  }
          else if (res) {
            t.classList.add('uhub-done');
            setTimeout(() => t.classList.remove('uhub-done'), 1500);
          } else showToast('Não foi possível citar o anexo', 3000);
        });
      } else if (t.classList.contains('uhub-reply-btn')) {
        const c = t.closest('.activity-comment');
        const author = c && c.querySelector('.action-details a.user-hover[rel]');
        const user = t.dataset.user || (author && author.getAttribute('rel')) || '';
        const display = t.dataset.display || (author && cleanText(author.textContent)) || user;
        if (!user) { showToast('Não foi possível identificar o autor', 3000); return; }
        enqueueEditorOp(async () => {
          const r = await mentionUser(user, display);
          if (r === 'dup') showToast(`${display} já está mencionado`, 1800);
          else if (r === 'aborted' || r === 'noform') {  }
          else if (r) {
            t.classList.add('uhub-reply-done');
            setTimeout(() => t.classList.remove('uhub-reply-done'), 1500);
          } else showToast('Não foi possível adicionar a menção', 3000);
        });
      } else if (t.classList.contains('uhub-cmt-copy')) {
        const c = t.closest('.activity-comment');
        const link = c && c.querySelector('.action-details a.comment-created-date-link, .action-details a[href*="focusedId="], .action-details a[href*="#comment-"]');
        const url = link ? new URL(link.getAttribute('href'), location.href).href : '';
        if (!url) { showToast('Não foi possível encontrar o link do comentário', 3000); return; }
        copyText(url).then((ok) => {
          if (!ok) { showToast('Não foi possível copiar', 2500); return; }
          t.innerHTML = ICON_CHECK;
          t.classList.add('uhub-copied');
          showToast('Link do comentário copiado', 1600);
          clearTimeout(t._uhubT);
          t._uhubT = setTimeout(() => { t.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'; t.classList.remove('uhub-copied'); }, 1400);
        });
      }
    } catch (e) {
      try { diag({ kind: 'button-click', err: String((e && e.message) || e) }); } catch {}
      showToast('Algo deu errado. Tente de novo.', 3000);
    }
  }
  document.addEventListener('click', onUhubButtonClick, true);
  // Imagens embutidas no corpo dos comentarios (coladas ou com miniatura): abrem no Visualizador Beta.
  // So intercepta quando o anexo esta na lista de anexos da issue; nos outros casos (ou com Cmd/Ctrl/Shift/Alt)
  // o clique segue o comportamento normal do Jira.
  function onCommentImageClick(ev) {
    try {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      if (!prefs.betaViewer || !attOn()) return;
      const tgt = ev.target;
      if (!tgt || !tgt.closest) return;
      const img = tgt.closest('img');
      if (!img || img.classList.contains('rendericon') || !img.closest('.action-body')) return;
      if (img.closest('#uhub-beta-viewer, #addcomment, #attachment_thumbnails')) return;
      const a = img.closest('a');
      const fromSrc = /\/secure\/(?:attachment|thumbnail)\/(\d+)\//.exec(img.getAttribute('src') || '');
      const fromHref = a ? /\/secure\/attachment\/(\d+)\//.exec(a.getAttribute('href') || '') : null;
      const previewId = a ? a.getAttribute('file-preview-id') : '';
      if (a && !previewId && !fromHref) return;
      const id = previewId || (fromHref && fromHref[1]) || (fromSrc && fromSrc[1]) || '';
      if (!id) return;
      const li = Array.from(qa('#attachment_thumbnails li.attachment-content')).find((x) => {
        const r = attachmentRef(x);
        return !!r && r.id === String(id);
      });
      const ref = li ? attachmentRef(li) : null;
      if (!li || !ref || !isImageAttachmentLi(li, ref)) return;
      ev.preventDefault();
      ev.stopPropagation();
      openBetaViewer(ref.id, ref.file);
    } catch (e) {
      try { diag({ kind: 'comment-image-click', err: String((e && e.message) || e) }); } catch {}
    }
  }
  document.addEventListener('click', onCommentImageClick, true);
  // ---------- Visualizador Unificado BETA: Leitor Vertical 1:1 + Light vs Dark (_dm) + Comparacao (max 2 imagens) ----------
  const BV_ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200, 250, 300];

  function bvParseDm(filename) {
    const m = /^(.+)(\.[^.]+)$/.exec(String(filename || ''));
    if (!m) return { base: String(filename || ''), isDm: false, ext: '' };
    const stem = m[1];
    const ext = m[2];
    const dm = /^(.+)_dm$/i.exec(stem);
    if (dm) return { base: dm[1], isDm: true, ext };
    return { base: stem, isDm: false, ext };
  }

  // Linha de metadados do topo: "por" normal e o nome de quem enviou em negrito
  function bvSetMeta(metaEl, parts, author) {
    try {
      metaEl.textContent = parts.join(' · ');
      if (author) {
        metaEl.appendChild(document.createTextNode(`${parts.length ? ' · ' : ''}por `));
        const b = mk('strong');
        b.textContent = author;
        metaEl.appendChild(b);
      }
    } catch (e) {
      metaEl.textContent = parts.concat(author ? [`por ${author}`] : []).join(' · ');
      diag({ where: 'bv-meta', error: String(e && (e.stack || e.message) || e).slice(0, 500) });
    }
  }
  // Nome de quem enviou o anexo (para anexos dentro de zip, o autor do zip)
  function bvAuthorOf(item) {
    try {
      const key = String((item && (item.zip || item.id)) || '');
      if (!key) return '';
      const li = Array.from(qa('#attachment_thumbnails li.attachment-content')).find((l) => {
        const r = attachmentRef(l);
        return r && r.id === key;
      });
      const info = li && attLiInfo(li);
      if (info && info.author) return String(info.author);
      if (!li) return '';
      const ref = attachmentRef(li);
      const fileName = ref ? ref.file : '';
      // Imagens comuns: o autor pode vir em outro atributo ("arquivo.png - Nome")
      const els = [li].concat(Array.from(li.querySelectorAll('*')));
      for (const e of els) {
        for (const a of ['title', 'aria-label', 'alt', 'original-title', 'data-original-title']) {
          const v = e.getAttribute && e.getAttribute(a);
          if (v && fileName && v.indexOf(fileName) === 0 && v.indexOf(' - ') > 0) {
            const au = v.split(' - ').pop().trim();
            if (au && au !== fileName) return au;
          }
        }
      }
      const ae = li.querySelector('.attachment-author, a.user-hover, .user-hover');
      const at = ae ? cleanText(ae.textContent) : '';
      if (at) return at;
      bvAuthorOf.warned = bvAuthorOf.warned || new Set();
      if (!bvAuthorOf.warned.has(key)) {
        bvAuthorOf.warned.add(key);
        diag({ where: 'bv-author-empty', id: key, html: String(li.outerHTML || '').slice(0, 900) });
      }
      return '';
    } catch (e) {
      diag({ where: 'bv-author', error: String(e && (e.stack || e.message) || e).slice(0, 500) });
      return '';
    }
  }
  function bvCollectImages() {
    const list = gid('attachment_thumbnails');
    if (!list) return [];
    const lis = attEnsureOrder(list);
    const out = [];
    lis.forEach((li) => {
      const ref = attachmentRef(li);
      if (ref && isZipAttachmentLi(li, ref)) { bvPushZipItems(out, li, ref); return; }
      const isVid = !!ref && /\.(mp4|m4v|mov|webm|ogv)$/i.test(ref.file || '');
      if (!ref || !(isVid || isImageAttachmentLi(li, ref))) return;
      const img = li.querySelector('img.attachment-thumb-img');
      const thumbSrc = img ? (img.dataset.uhubThumb || img.getAttribute('src') || '') : '';
      const sizeEl = li.querySelector('.attachment-size');
      const dateEl = li.querySelector('.attachment-date time');
      const fullUrl = new URL(ref.href, location.origin).href;
      out.push({
        id: ref.id,
        file: ref.file,
        href: ref.href,
        fullUrl,
        thumbSrc,
        size: sizeEl ? cleanText(sizeEl.textContent) : '',
        date: dateEl ? cleanText(dateEl.textContent) : '',
        dm: bvParseDm(ref.file),
        isVideo: isVid,
      });
    });
    return out;
  }

  function bvFindDmPair(item, all) {
    if (!item || item.isVideo) return null;
    for (const o of all) {
      if (o.id === item.id || o.isVideo) continue;
      if (o.dm.base === item.dm.base && o.dm.isDm !== item.dm.isDm && o.dm.ext.toLowerCase() === item.dm.ext.toLowerCase()) {
        return o;
      }
    }
    return null;
  }

  const bv = {
    open: false,
    items: [],
    activeId: '',
    mode: 'single',      // 'single' | 'dm' | 'compare'
    cmpStyle: 'sbs',     // 'curtain' | 'sbs' | 'flip'
    zoom: '100',         // 'fit' | numeric string '25'..'300'
    split: 50,
    flipShowB: true,
    syncScroll: true,
    lightStage: false,
    compareIds: [],      // max 2 image IDs
    zipOpen: new Set(),  // zips expandidos na barra de thumbs
    stripX: 0,
    natW: 0,
    natH: 0,
    prevFocus: null,
  };

  const bvVideoCache = new Map();
  function bvBindImgFallback(img, item) {
    // If it was already preloaded successfully, it will load instantly from cache
    const pre = bvGetPreloadedDimensions(item.fullUrl);
    if (pre) {
      const host = gid('uhub-beta-viewer');
      const w = bvScaledWidth(pre.w, { clientWidth: bv.stgW || (host ? host.clientWidth : window.innerWidth), clientHeight: bv.stgH || 0 }, pre.h);
      img.style.width = `${w}px`;
      img.style.aspectRatio = `${pre.w} / ${pre.h}`;
      img.decoding = 'sync';
    }
    img.src = bvBlobUrls.get(item.fullUrl) || item.fullUrl;
    img.onerror = () => {
      if (item.thumbSrc && img.src !== item.thumbSrc) img.src = item.thumbSrc;
    };
  }

  function bvScaledWidth(naturalWidth, stageEl, naturalHeight) {
    const nw = naturalWidth || 600;
    if (bv.zoom === 'fit') {
      const availW = Math.max(200, (stageEl ? stageEl.clientWidth : window.innerWidth) - 144);
      const availH = (stageEl && stageEl.clientHeight) ? stageEl.clientHeight - 40 : 0;
      let w = availW;
      if (naturalHeight && availH > 100) w = Math.min(availW, Math.floor((availH * nw) / naturalHeight));
      return Math.max(40, w);
    }
    const pct = Number(bv.zoom) || 100;
    return Math.max(120, Math.round((nw * pct) / 100));
  }

  function ensureBetaViewer() {
    let el = gid('uhub-beta-viewer');
    if (el) return el;
    el = mk('div');
    el.id = 'uhub-beta-viewer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Leitor vertical 1:1 e comparador Beta');
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  function closeBetaViewer() {
    const el = gid('uhub-beta-viewer');
    if (!el || el.hidden) {
      bv.open = false;
      return;
    }
    el.hidden = true;
    el.innerHTML = '';
    bv.open = false;
    document.documentElement.classList.remove('uhub-beta-open');
    bv.compareIds = [];
    if (bv.prevFocus && typeof bv.prevFocus.focus === 'function') {
      try { bv.prevFocus.focus({ preventScroll: true }); } catch {}
    }
    bv.prevFocus = null;
  }

  function openBetaViewer(imageId, fallbackFile) {
    if (!prefs.betaViewer) return;
    const items = bvCollectImages();
    if (!items.length) {
      showToast('Nenhuma imagem disponível para visualizar', 2500);
      return;
    }
    bv.items = items;
    bv.compareIds = [];
    const target = items.find((x) => x.id === String(imageId))
      || (fallbackFile && items.find((x) => x.file === fallbackFile))
      || items[0];
    bv.prevFocus = document.activeElement;
    bv.open = true;
    document.documentElement.classList.add('uhub-beta-open');
    bvSelectImage(target.id, 'single');
  }

  function openBetaViewerCompare(selectedIds) {
    if (!prefs.betaViewer) return;
    const items = bvCollectImages();
    const chosen = (selectedIds || []).map((id) => items.find((x) => x.id === String(id))).filter(Boolean);
    if (chosen.length !== 2 || chosen.some((x) => x.isVideo)) {
      showToast('Selecione exatamente 2 imagens para comparar', 2500);
      return;
    }
    bv.items = items;
    bv.compareIds = [chosen[0].id, chosen[1].id];
    bv.activeId = chosen[0].id;
    bv.natW = 0;
    bv.natH = 0;
    bv.mode = 'compare';
    bv.prevFocus = document.activeElement;
    bv.open = true;
    document.documentElement.classList.add('uhub-beta-open');
    bvRender();
  }

  function bvSelectImage(imageId, requestedMode) {
    const items = bv.items;
    const idx = Math.max(0, items.findIndex((x) => x.id === String(imageId)));
    const item = items[idx];
    bv.activeId = item.id;
    bv.natW = 0;
    bv.natH = 0;

    const dmPair = bvFindDmPair(item, items);

    if (requestedMode) {
      bv.mode = requestedMode;
      if (requestedMode === 'dm') bv.cmpStyle = 'curtain';
      else if (requestedMode === 'compare') bv.cmpStyle = 'sbs';
    } else if (bv.mode === 'dm' && !dmPair) {
      bv.mode = 'single';
    }
    if (item.isVideo && bv.mode !== 'single') bv.mode = 'single';

    bvRender();
  }

  function bvCompareItems() {
    return bv.compareIds.map((id) => bv.items.find((x) => x.id === id)).filter(Boolean).slice(0, 2);
  }

  function bvResolvePair(item) {
    if (bv.mode === 'dm') {
      const pair = bvFindDmPair(item, bv.items);
      if (!pair) return null;
      const light = item.dm.isDm ? pair : item;
      const dark = item.dm.isDm ? item : pair;
      return {
        a: light,
        b: dark,
        labelA: 'Light mode',
        labelB: 'Dark mode',
      };
    }
    if (bv.mode === 'compare') {
      const pool = bvCompareItems();
      if (pool.length < 2) return null;
      return {
        a: pool[0],
        b: pool[1],
        labelA: `A: ${pool[0].file}`,
        labelB: `B: ${pool[1].file}`,
      };
    }
    return null;
  }

  // Remove A ou B da comparacao ativa (em qualquer modo: Light vs Dark ou Comparar) e volta ao Leitor 1:1 com a imagem restante
  function bvRemoveFromComparison(side) {
    const item = bv.items.find((x) => x.id === bv.activeId);
    const pair = item && bvResolvePair(item);
    if (!pair) return;
    const survivor = side === 'a' ? pair.b : pair.a;
    if (bv.mode === 'compare') {
      bv.compareIds = [survivor.id];
    }
    bv.activeId = survivor.id;
    bv.natW = 0;
    bv.natH = 0;
    bv.mode = 'single';
    bvRender();
  }

  function bvToggleStripCheckbox(imageId) {
    const id = String(imageId);
    try {
      const clicked = bv.items.find((x) => x.id === id);
      if (clicked && clicked.isVideo) {
        showToast('O comparador não está disponível para vídeos', 2200);
        bvRender();
        return;
      }
    } catch (e) { try { diag({ where: 'bv-compare-video', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); } catch {} }
    const cur = bvCompareItems().map((x) => x.id);
    const pos = cur.indexOf(id);

    if (pos >= 0) {
      // Unchecking an image
      if (bv.mode === 'compare' && cur.length === 2) {
        bvRemoveFromComparison(pos === 0 ? 'a' : 'b');
        return;
      }
      bv.compareIds = cur.filter((x) => x !== id);
      bvRender();
      return;
    }

    // Checking a new image (max 2 allowed)
    if (cur.length >= 2) {
      showToast('Apenas 2 imagens podem ser comparadas por vez', 2200);
      bvRender();
      return;
    }

    if (cur.length === 0) {
      const activeItem = bv.items.find((x) => x.id === bv.activeId);
      if (bv.mode === 'single' && bv.activeId && bv.activeId !== id && !(activeItem && activeItem.isVideo)) {
        // User is viewing image X and checks image Y -> immediately compare X vs Y
        bv.compareIds = [bv.activeId, id];
        bv.mode = 'compare';
        bv.natW = 0;
        bv.natH = 0;
      } else {
        // User checked the currently viewed image -> 1/2 selected
        bv.compareIds = [id];
      }
      bvRender();
      return;
    }

    // cur.length === 1 -> now we have 2 images -> open comparator!
    bv.compareIds = [cur[0], id];
    bv.mode = 'compare';
    bv.cmpStyle = 'sbs';
    bv.natW = 0;
    bv.natH = 0;
    bvRender();
  }

  function bvApplyZoomToStage(el, preserveAnchor = false) {
    const stage = el.querySelector('.bv-stage');
    if (!stage) return;
    bv.stgW = stage.clientWidth;
    bv.stgH = stage.clientHeight;
    const prevRatioY = (preserveAnchor && stage.scrollHeight > stage.clientHeight)
      ? (stage.scrollTop + stage.clientHeight / 2) / stage.scrollHeight
      : null;

    if (bv.mode === 'single') {
      const img = stage.querySelector('.bv-single-wrap img');
      if (img && img.naturalWidth) {
        img.style.width = `${bvScaledWidth(img.naturalWidth, stage, img.naturalHeight)}px`;
      }
    } else if (bv.cmpStyle === 'curtain') {
      const wrap = stage.querySelector('.bv-curtain-wrap');
      const imgA = wrap && wrap.querySelector('img.bv-img-a');
      if (wrap && imgA && imgA.naturalWidth) {
        wrap.style.width = `${bvScaledWidth(imgA.naturalWidth, stage, imgA.naturalHeight)}px`;
      }
    } else if (bv.cmpStyle === 'sbs') {
      stage.querySelectorAll('.bv-sbs-scroll img').forEach((img) => {
        if (!img.naturalWidth) return;
        const pane = img.closest('.bv-sbs-scroll');
        if (bv.zoom === 'fit') {
          const avail = Math.max(200, (pane ? pane.clientWidth : window.innerWidth / 2) - 32);
          const availH = pane ? pane.clientHeight - 28 : 0;
          const wFit = availH > 100 ? Math.min(avail, Math.floor((availH * img.naturalWidth) / img.naturalHeight)) : avail;
          img.style.width = `${wFit}px`;
        } else {
          img.style.width = `${Math.max(120, Math.round((img.naturalWidth * (Number(bv.zoom) || 100)) / 100))}px`;
        }
      });
    } else if (bv.cmpStyle === 'flip') {
      const stg = stage.querySelector('.bv-flip-stage');
      if (stg) {
        const imgs = [...stg.querySelectorAll('img')];
        const refImg = imgs.find((im) => im.naturalWidth) || imgs[0];
        if (refImg && refImg.naturalWidth) {
          const w = bvScaledWidth(refImg.naturalWidth, stage, refImg.naturalHeight);
          imgs.forEach((im) => { im.style.width = `${w}px`; });
        }
      }
    }

    if (prevRatioY !== null && stage.scrollHeight > stage.clientHeight) {
      stage.scrollTop = Math.max(0, Math.round(prevRatioY * stage.scrollHeight - stage.clientHeight / 2));
    }

    const zLbl = el.querySelector('.bv-zoom-val');
    if (zLbl) zLbl.textContent = bv.zoom === 'fit' ? 'Ajustar' : (bv.zoom === '100' ? '1:1 (100%)' : `${bv.zoom}%`);
    bvPositionNavButtons(el);
  }
  function bvPositionNavButtons(el) {
    if (!el || el.hidden) return;
    const prevBtn = el.querySelector('.bv-side-prev');
    const nextBtn = el.querySelector('.bv-side-next');
    if (!prevBtn || !nextBtn) return;
    const stg = el.querySelector('.bv-stage');
    const sr = stg ? stg.getBoundingClientRect() : null;
    const midY = sr && sr.height > 0 ? Math.round(sr.top + sr.height / 2) : Math.round(window.innerHeight / 2);
    [prevBtn, nextBtn].forEach((b) => {
      const S = (k, v) => b.style.setProperty(k, v, 'important');
      S('position', 'fixed');
      S('top', `${midY}px`);
      S('transform', 'translateY(-50%)');
      S('width', '64px');
      S('height', '140px');
      S('padding', '0');
      S('display', 'flex');
      S('align-items', 'center');
      S('justify-content', 'center');
      S('background', 'none');
      S('border', 'none');
      S('border-radius', '0');
      S('box-shadow', 'none');
      S('z-index', '30');
      const s = b.querySelector('svg');
      if (s) {
        s.setAttribute('width', '40');
        s.setAttribute('height', '40');
        s.style.filter = 'none';
      }
    });
    prevBtn.style.setProperty('left', '4px', 'important');
    prevBtn.style.setProperty('right', 'auto', 'important');
    nextBtn.style.setProperty('right', '4px', 'important');
    nextBtn.style.setProperty('left', 'auto', 'important');
  }

  // ---------- Imagens dentro de zips ----------
  const bvZipCache = new Map();
  const bvThumbCache = new Map();
  function isZipAttachmentLi(li, ref) {
    return !!ref && (/\.zip(?:$|[?#])/i.test(ref.file || '') || /\.zip(?:$|[?#])/i.test(ref.href || ''));
  }
  function bvIssueId() {
    let v = '';
    try { if (typeof issueNumericId === 'function') v = issueNumericId(); } catch (e) {}
    return String(v || (q1('meta[name="ajs-issue-id"]') || {}).content || '');
  }
  function bvZip(attId) {
    let z = bvZipCache.get(attId);
    if (z) return z;
    z = { entries: null, failed: false };
    bvZipCache.set(attId, z);
    const iid = bvIssueId();
    fetch(`/rest/api/2/attachment/${encodeURIComponent(attId)}/expand/human`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error('http'); return r.json(); })
      .then((d) => {
        z.entries = !iid ? [] : (d.entries || [])
          .filter((e) => /^image\/(png|jpe?g|gif|webp|bmp|avif)$/i.test(e.mediaType || ''))
          .map((e) => ({
            index: e.index,
            name: String(e.path || e.label || '').split('/').pop(),
            size: e.size || '',
            url: new URL(`/secure/attachmentzip/unzip/${iid}/${attId}%5B${e.index}%5D/`, location.origin).href,
          }));
        bvZipLoaded(attId);
      })
      .catch(() => { z.failed = true; z.entries = []; });
    return z;
  }
  function bvZipLoaded(attId) {
    const list = gid('attachment_thumbnails');
    if (list) {
      list.querySelectorAll('li.attachment-content').forEach((li) => {
        const r = attachmentRef(li);
        if (r && r.id === attId) syncAttachmentInspectButton(li, r);
      });
    }
    bvRefreshItems();
  }
  // Previa do zip no anexo: ate 4 mini miniaturas das imagens de dentro (+N quando tem mais).
  // Reaproveita o mesmo bloco entre atualizacoes da pagina para nao piscar.
  const zpCache = new Map();
  function syncZipPreview(li, ref, zz) {
    if (!li || !ref) return;
    const thumb = li.querySelector('.attachment-thumb');
    const host = thumb ? thumb.querySelector(':scope > a') : null;
    if (!host) return;
    const old = host.querySelector(':scope > .uhub-zp');
    const entries = zz && Array.isArray(zz.entries) ? zz.entries : [];
    if (!attOn() || !entries.length) {
      if (old) old.remove();
      li.classList.remove('uhub-zp-on');
      return;
    }
    const sig = entries.map((e) => e.index).join(',');
    const key = `${ref.id}:${sig}`;
    if (old && old.getAttribute('data-sig') === sig) { li.classList.add('uhub-zp-on'); return; }
    if (old) old.remove();
    let box = zpCache.get(key);
    if (!box) {
      box = mk('div');
      box.className = `uhub-zp uhub-zp-${Math.min(entries.length, 4)}`;
      box.setAttribute('data-sig', sig);
      const extra = entries.length - 4;
      entries.slice(0, 4).forEach((e, i) => {
        const cell = mk('span');
        cell.className = 'uhub-zp-cell';
        const im = mk('img');
        im.alt = '';
        im.decoding = 'async';
        im.loading = 'lazy';
        im.draggable = false;
        im.src = (typeof bvBlobUrls !== 'undefined' && bvBlobUrls.get(e.url)) || e.url;
        im.onerror = () => { if (im.src !== e.url) im.src = e.url; };
        cell.appendChild(im);
        if (i === 3 && extra > 0) {
          const more = mk('span');
          more.className = 'uhub-zp-more';
          more.textContent = `+${extra}`;
          cell.appendChild(more);
        }
        box.appendChild(cell);
      });
      if (zpCache.size > 60) zpCache.clear();
      zpCache.set(key, box);
    }
    host.appendChild(box);
    li.classList.add('uhub-zp-on');
  }
  function bvPushZipItems(out, li, ref) {
    const z = bvZip(ref.id);
    if (!z.entries || !z.entries.length) return;
    const dateEl = li.querySelector('.attachment-date time');
    const date = dateEl ? cleanText(dateEl.textContent) : '';
    z.entries.forEach((e) => {
      out.push({
        id: `${ref.id}/${e.index}`,
        file: e.name,
        href: e.url,
        fullUrl: e.url,
        thumbSrc: '',
        size: e.size,
        date,
        dm: bvParseDm(e.name),
        zip: ref.id,
        zipFile: ref.file,
      });
    });
  }
  function bvRefreshItems() {
    const el = gid('uhub-beta-viewer');
    if (!el || el.hidden) return;
    const next = bvCollectImages();
    if (next.length === bv.items.length) return;
    bv.items = next;
    if (bv.items.some((x) => x.id === bv.activeId)) bvRender();
  }
  // Atualiza o visualizador aberto quando anexos sao enviados ou excluidos (sem recarregar a pagina)
  function bvLiveSync() {
    const el = gid('uhub-beta-viewer');
    if (!el || el.hidden || !bv.open) return;
    const sync = () => {
      const v = gid('uhub-beta-viewer');
      if (!v || v.hidden || !bv.open) return;
      const next = bvCollectImages();
      const sig = (l) => l.map((x) => x.id).join('|');
      if (sig(next) === sig(bv.items)) return;
      const oldIdx = Math.max(0, bv.items.findIndex((x) => x.id === bv.activeId));
      bv.items = next;
      if (!next.length) { closeBetaViewer(); showToast('Todos os anexos foram removidos', 2500); return; }
      const ids = new Set(next.map((x) => x.id));
      const activeGone = !ids.has(bv.activeId);
      const cmpBroken = bv.compareIds.length > 0 && !bv.compareIds.every((id) => ids.has(id));
      if (cmpBroken) bv.compareIds = [];
      if (activeGone) showToast('O anexo que você estava vendo foi removido', 2500);
      const target = activeGone ? next[Math.min(oldIdx, next.length - 1)].id : bv.activeId;
      bvSelectImage(target, (activeGone || cmpBroken) ? 'single' : undefined);
    };
    sync();
    setTimeout(sync, 600);
  }
  // Reaproveita o mesmo <img> entre renderizacoes: a thumb ja carregada nao pisca
  function bvThumbImg(it, key) {
    const k = key || it.id;
    let im = bvThumbCache.get(k);
    if (im) return im;
    im = mk('img');
    im.alt = it.file;
    im.decoding = 'async';
    if (it.zip) im.loading = 'lazy';
    if (it.isVideo) {
      try {
        const v = mk('video');
        v.muted = true;
        v.preload = 'metadata';
        v.playsInline = true;
        v.addEventListener('loadeddata', () => {
          try {
            const w = 160;
            const h = Math.max(1, Math.round(w * ((v.videoHeight || 9) / (v.videoWidth || 16))));
            const cv = mk('canvas');
            cv.width = w;
            cv.height = h;
            const ctx = cv.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(v, 0, 0, w, h);
            im.src = cv.toDataURL('image/jpeg', 0.7);
            v.removeAttribute('src');
            v.load();
          } catch (e) { diag({ where: 'video-strip-thumb', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); }
        }, { once: true });
        v.addEventListener('error', () => diag({ where: 'video-strip-thumb', error: 'video sem quadro: ' + it.file }), { once: true });
        v.src = it.fullUrl + '#t=0.1';
      } catch (e) { diag({ where: 'video-strip-thumb', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); }
    } else {
      im.src = it.thumbSrc || bvBlobUrls.get(it.fullUrl) || it.fullUrl;
      im.onerror = () => { if (it.fullUrl && im.src !== it.fullUrl) im.src = it.fullUrl; };
    }
    bvThumbCache.set(k, im);
    return im;
  }
  function bvZipColor(zipId) {
    const pal = ['#00875a', '#6554c0', '#ff8b00', '#00a3bf', '#c9372c'];
    const zips = [...new Set(bv.items.filter((x) => x.zip).map((x) => x.zip))];
    return pal[Math.max(0, zips.indexOf(zipId)) % pal.length];
  }
  // Zip aberto: vira uma secao recolhivel (cabecalho colorido + imagens de dentro numa caixa so)
  function bvZipSection(zipId, active) {
    try {
      const group = bv.items.filter((x) => x.zip === zipId);
      if (!group.length) return bvZipCard(zipId, active);
      const sec = mk('div');
      sec.className = 'bv-strip-sec';
      sec.style.setProperty('--bv-zc', bvZipColor(zipId));
      sec.setAttribute('role', 'group');
      sec.setAttribute('aria-label', `${group[0].zipFile}, ${group.length} imagens`);
      const head = mk('button');
      head.type = 'button';
      head.className = 'bv-strip-sechead';
      head.setAttribute('aria-expanded', 'true');
      head.title = `${group[0].zipFile} · ${group.length} imagens · clique para recolher`;
      const top = mk('span');
      top.className = 'bv-strip-sechead-top';
      top.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const tag = mk('span');
      tag.textContent = 'ZIP';
      top.appendChild(tag);
      const nm = mk('span');
      nm.className = 'bv-strip-sechead-name';
      nm.textContent = group[0].zipFile;
      const cnt = mk('span');
      cnt.className = 'bv-strip-sechead-count';
      cnt.textContent = `${group.length} imagens`;
      head.appendChild(top);
      head.appendChild(nm);
      head.appendChild(cnt);
      const collapse = () => { bv.zipOpen.delete(zipId); bvRender(); };
      head.addEventListener('click', collapse);
      head.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowLeft') return;
        ev.preventDefault();
        ev.stopPropagation();
        collapse();
      });
      sec.appendChild(head);
      return sec;
    } catch (e) {
      diag({ where: 'zip-section', error: String(e && (e.stack || e.message) || e).slice(0, 500) });
      return bvZipCard(zipId, active);
    }
  }
  function bvZipCard(zipId, active) {
    const group = bv.items.filter((x) => x.zip === zipId);
    const open = bv.zipOpen.has(zipId);
    const card = mk('div');
    card.className = `bv-strip-item bv-strip-zip${active && active.zip === zipId ? ' bv-strip-active' : ''}`;
    card.style.setProperty('--bv-zc', bvZipColor(zipId));
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', String(open));
    card.title = `${group[0].zipFile} · ${group.length} imagens · clique para ${open ? 'recolher' : 'expandir'}`;
    const th = mk('div');
    th.className = 'bv-strip-thumb';
    th.appendChild(bvThumbImg(group[0], `zip:${zipId}`));
    const badge = mk('span');
    badge.className = 'bv-strip-zipbadge';
    badge.textContent = `ZIP · ${group.length}`;
    th.appendChild(badge);
    card.appendChild(th);
    const nm = mk('div');
    nm.className = 'bv-strip-name';
    nm.textContent = group[0].zipFile;
    card.appendChild(nm);
    const toggle = () => {
      if (bv.zipOpen.has(zipId)) bv.zipOpen.delete(zipId); else bv.zipOpen.add(zipId);
      bvRender();
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      ev.stopPropagation();
      toggle();
    });
    return card;
  }

  async function bvGetBlob(url) {
    const hit = bvBlobData.get(url);
    if (hit) return hit;
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error('http');
    return r.blob();
  }
  async function bvInflate(u8) {
    const ds = new DecompressionStream('deflate');
    const out = new Response(new Blob([u8]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }
  function bvIcc(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const s4 = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    const r = { name: '', space: s4(16).trim(), ver: `${u8[8]}.${u8[9] >> 4}` };
    try {
      const n = Math.min(dv.getUint32(128), 200);
      for (let i = 0; i < n; i++) {
        const o = 132 + i * 12;
        if (s4(o) !== 'desc') continue;
        const off = dv.getUint32(o + 4);
        if (s4(off) === 'mluc') {
          const l = dv.getUint32(off + 20), so = dv.getUint32(off + 24);
          r.name = new TextDecoder('utf-16be').decode(u8.subarray(off + so, off + so + l));
        } else {
          const l = dv.getUint32(off + 8);
          r.name = String.fromCharCode(...u8.subarray(off + 12, off + 11 + l));
        }
        break;
      }
    } catch (e) {}
    return r;
  }
  async function bvReadMeta(item) {
    const blob = await bvGetBlob(item.fullUrl);
    const u8 = new Uint8Array(await blob.arrayBuffer());
    const dv = new DataView(u8.buffer);
    const s = (a, b) => String.fromCharCode(...u8.subarray(a, b));
    const m = { fmt: blob.type || '', dpi: 0, depth: 0, mode: '', icc: null, srgb: false };
    try {
      if (s(1, 4) === 'PNG') {
        m.fmt = 'PNG';
        const CT = { 0: 'Tons de cinza', 2: 'RGB', 3: 'Indexado', 4: 'Cinza + alfa', 6: 'RGB + alfa' };
        for (let p = 8; p + 8 <= u8.length;) {
          const len = dv.getUint32(p), t = s(p + 4, p + 8), d = p + 8;
          if (t === 'IHDR') { m.depth = u8[d + 8]; m.mode = CT[u8[d + 9]] || ''; }
          else if (t === 'pHYs' && u8[d + 8] === 1) m.dpi = Math.round(dv.getUint32(d) * 0.0254);
          else if (t === 'sRGB') m.srgb = true;
          else if (t === 'iCCP') {
            let z = d;
            while (u8[z]) z++;
            m.icc = bvIcc(await bvInflate(u8.subarray(z + 2, d + len)));
          } else if (t === 'IDAT' || t === 'IEND') break;
          p += 12 + len;
        }
      } else if (u8[0] === 0xFF && u8[1] === 0xD8) {
        m.fmt = 'JPEG';
        const parts = [];
        for (let p = 2; p + 4 <= u8.length && u8[p] === 0xFF;) {
          const k = u8[p + 1], len = dv.getUint16(p + 2);
          if (k === 0xDA) break;
          if (k === 0xE0 && s(p + 4, p + 8) === 'JFIF') { const u = u8[p + 11], x = dv.getUint16(p + 12); m.dpi = u === 1 ? x : (u === 2 ? Math.round(x * 2.54) : 0); }
          else if (k === 0xE2 && s(p + 4, p + 15) === 'ICC_PROFILE') parts[u8[p + 16]] = u8.subarray(p + 18, p + 2 + len);
          else if (k >= 0xC0 && k <= 0xC2) { m.depth = u8[p + 4]; m.mode = { 1: 'Tons de cinza', 3: 'RGB / YCbCr', 4: 'CMYK' }[u8[p + 9]] || ''; }
          p += 2 + len;
        }
        const ch = parts.filter(Boolean);
        if (ch.length) {
          const all = new Uint8Array(ch.reduce((a, c) => a + c.length, 0));
          let o = 0;
          ch.forEach((c) => { all.set(c, o); o += c.length; });
          m.icc = bvIcc(all);
        }
      } else if (s(0, 3) === 'GIF') {
        m.fmt = 'GIF';
        m.mode = 'Indexado (paleta)';
        m.depth = ((u8[10] >> 4) & 7) + 1;
        m.frames = 0;
        m.ms = 0;
        const skip = (q) => { while (q < u8.length && u8[q]) q += u8[q] + 1; return q + 1; };
        let p = 13 + ((u8[10] & 0x80) ? 3 * (2 ** ((u8[10] & 7) + 1)) : 0);
        while (p < u8.length) {
          const b = u8[p];
          if (b === 0x21) {
            if (u8[p + 1] === 0xF9) { const d = dv.getUint16(p + 4, true); m.ms += (d <= 1 ? 10 : d) * 10; }
            p = skip(p + 2);
          } else if (b === 0x2C) {
            m.frames++;
            const f = u8[p + 9];
            p = skip(p + 11 + ((f & 0x80) ? 3 * (2 ** ((f & 7) + 1)) : 0));
          } else break;
        }
      } else if (s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') {
        m.fmt = 'WebP';
        for (let p = 12; p + 8 <= u8.length;) {
          const sz = dv.getUint32(p + 4, true);
          if (s(p, p + 4) === 'ICCP') { m.icc = bvIcc(u8.subarray(p + 8, p + 8 + sz)); break; }
          p += 8 + sz + (sz & 1);
        }
      }
    } catch (e) {}
    return m;
  }
  // Conta as cores diferentes da imagem (ignora pixels totalmente transparentes; para em 1 milhão)
  async function bvCountColors(item) {
    try {
      const blob = await bvGetBlob(item.fullUrl);
      const bmp = await createImageBitmap(blob);
      const w = bmp.width, h = bmp.height;
      if (!w || !h) return '';
      const cv = mk('canvas');
      const band = Math.max(1, Math.min(h, Math.floor(1000000 / w)));
      cv.width = w;
      cv.height = band;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (!ctx) return '';
      const seen = new Set();
      const LIMIT = 1000000;
      for (let y = 0; y < h && seen.size <= LIMIT; y += band) {
        const hh = Math.min(band, h - y);
        ctx.clearRect(0, 0, w, band);
        ctx.drawImage(bmp, 0, y, w, hh, 0, 0, w, hh);
        const d = ctx.getImageData(0, 0, w, hh).data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] === 0) continue;
          seen.add(((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0);
          if (seen.size > LIMIT) break;
        }
        await sleep(0);
      }
      if (bmp.close) bmp.close();
      return seen.size > LIMIT ? 'mais de 1.000.000' : seen.size.toLocaleString('pt-BR');
    } catch (e) {
      diag({ where: 'count-colors', error: String(e && (e.stack || e.message) || e).slice(0, 500) });
      return '';
    }
  }
  async function bvToggleInfo(el, item, btn) {
    const old = el.querySelector('.bv-info-pop');
    if (old) { old.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
    const pop = mk('div');
    pop.className = 'bv-info-pop';
    pop.textContent = 'Lendo metadados…';
    const r = btn.getBoundingClientRect();
    pop.style.left = `${Math.round(r.left)}px`;
    pop.style.top = `${Math.round(r.bottom + 6)}px`;
    el.appendChild(pop);
    btn.setAttribute('aria-expanded', 'true');
    const off = (ev) => {
      if (pop.contains(ev.target) || btn.contains(ev.target)) return;
      pop.remove();
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', off, true);
    };
    document.addEventListener('pointerdown', off, true);
    if (item.isVideo) {
      try {
        const fmtDur = (d) => (d >= 60 ? `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}` : `${d.toFixed(1).replace('.', ',')} s`);
        const cached = bvVideoCache.get(item.id);
        let probe = (cached && cached.readyState >= 1) ? cached : null;
        if (!probe) {
          probe = mk('video');
          probe.muted = true;
          probe.preload = 'metadata';
          await new Promise((resolve) => {
            const t = setTimeout(resolve, 10000);
            const fin = () => { clearTimeout(t); resolve(); };
            probe.addEventListener('loadedmetadata', fin, { once: true });
            probe.addEventListener('error', fin, { once: true });
            probe.src = item.fullUrl;
          });
        }
        const vw = probe.videoWidth || 0;
        const vh = probe.videoHeight || 0;
        const vd = Number.isFinite(probe.duration) ? probe.duration : 0;
        if (probe !== cached) { try { probe.removeAttribute('src'); probe.load(); } catch {} }
        if (!pop.isConnected) return;

        let bytes = 0;
        const sm = /([\d.,]+)\s*(bytes?|kB|KB|MB|GB)/i.exec(item.size || '');
        if (sm) {
          const n = parseFloat(sm[1].replace(',', '.'));
          const u = sm[2].toLowerCase();
          bytes = Math.round(n * (u === 'gb' ? 1073741824 : u === 'mb' ? 1048576 : u === 'kb' ? 1024 : 1));
        }
        const info = { brand: '', vcodec: '', vprof: '', fps: 0, frames: 0, color: '', acodec: '', ach: 0, ahz: 0, hasAudio: false, parsed: false };
        const ext = ((item.file || '').split('.').pop() || '').toLowerCase();
        if (/^(mp4|m4v|mov)$/.test(ext) && bytes <= 200 * 1048576) {
          try {
            const blob = await bvGetBlob(item.fullUrl);
            if (!pop.isConnected) return;
            bytes = blob.size || bytes;
            const cc = (dv, o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
            const boxes = (dv, start, end) => {
              const out = [];
              let p = start;
              while (p + 8 <= end && out.length < 200) {
                let size = dv.getUint32(p);
                const type = cc(dv, p + 4);
                let hdr = 8;
                if (size === 1 && p + 16 <= end) { size = dv.getUint32(p + 8) * 4294967296 + dv.getUint32(p + 12); hdr = 16; }
                else if (size === 0) size = end - p;
                if (size < hdr || p + size > end) break;
                out.push({ type, start: p + hdr, end: p + size });
                p += size;
              }
              return out;
            };
            let pos = 0, guard = 0, moov = null;
            while (pos + 16 <= blob.size && guard++ < 64) {
              const h = new DataView(await blob.slice(pos, pos + 16).arrayBuffer());
              let size = h.getUint32(0);
              const type = cc(h, 4);
              let hdr = 8;
              if (size === 1) { size = h.getUint32(8) * 4294967296 + h.getUint32(12); hdr = 16; }
              else if (size === 0) size = blob.size - pos;
              if (size < hdr) break;
              if (type === 'ftyp') info.brand = cc(h, 8);
              if (type === 'moov') { moov = new DataView(await blob.slice(pos + hdr, pos + size).arrayBuffer()); break; }
              pos += size;
            }
            if (moov) {
              info.parsed = true;
              boxes(moov, 0, moov.byteLength).filter((b) => b.type === 'trak').forEach((trak) => {
                const mdia = boxes(moov, trak.start, trak.end).find((b) => b.type === 'mdia');
                if (!mdia) return;
                const kids = boxes(moov, mdia.start, mdia.end);
                const hdlr = kids.find((b) => b.type === 'hdlr');
                const mdhd = kids.find((b) => b.type === 'mdhd');
                const minf = kids.find((b) => b.type === 'minf');
                if (!hdlr || !minf) return;
                const kind = cc(moov, hdlr.start + 8);
                let ts = 0, dur = 0;
                if (mdhd) {
                  if (moov.getUint8(mdhd.start) === 1) { ts = moov.getUint32(mdhd.start + 20); dur = moov.getUint32(mdhd.start + 24) * 4294967296 + moov.getUint32(mdhd.start + 28); }
                  else { ts = moov.getUint32(mdhd.start + 12); dur = moov.getUint32(mdhd.start + 16); }
                }
                const stbl = boxes(moov, minf.start, minf.end).find((b) => b.type === 'stbl');
                if (!stbl) return;
                const st = boxes(moov, stbl.start, stbl.end);
                const stsd = st.find((b) => b.type === 'stsd');
                const stts = st.find((b) => b.type === 'stts');
                const entry = stsd ? boxes(moov, stsd.start + 8, stsd.end)[0] : null;
                if (kind === 'vide' && entry) {
                  info.vcodec = entry.type;
                  boxes(moov, entry.start + 78, entry.end).forEach((c) => {
                    if (c.type === 'avcC') {
                      const P = { 66: 'Baseline', 77: 'Main', 88: 'Extended', 100: 'High', 110: 'High 10', 122: 'High 4:2:2', 244: 'High 4:4:4' };
                      const pr = moov.getUint8(c.start + 1);
                      const lv = moov.getUint8(c.start + 3);
                      info.vprof = (P[pr] || ('perfil ' + pr)) + ' · nível ' + (lv / 10).toFixed(1);
                    } else if (c.type === 'hvcC') {
                      const pr = moov.getUint8(c.start + 1) & 31;
                      info.vprof = ({ 1: 'Main', 2: 'Main 10' })[pr] || ('perfil ' + pr);
                    } else if (c.type === 'colr') {
                      const ct = cc(moov, c.start);
                      if (ct === 'nclx' || ct === 'nclc') {
                        const PRI = { 1: 'BT.709', 5: 'BT.601', 6: 'BT.601', 9: 'BT.2020', 11: 'DCI-P3', 12: 'Display P3' };
                        const TRC = { 1: 'BT.709', 6: 'BT.601', 13: 'sRGB', 16: 'PQ (HDR10)', 18: 'HLG (HDR)' };
                        const MAT = { 1: 'BT.709', 5: 'BT.601', 6: 'BT.601', 9: 'BT.2020' };
                        const pri = moov.getUint16(c.start + 4), trc = moov.getUint16(c.start + 6), mat = moov.getUint16(c.start + 8);
                        info.color = 'primárias ' + (PRI[pri] || pri) + ' · curva ' + (TRC[trc] || trc) + ' · matriz ' + (MAT[mat] || mat);
                      }
                    }
                  });
                  if (stts && ts && dur) {
                    const n = moov.getUint32(stts.start + 4);
                    let total = 0;
                    for (let i = 0; i < n && i < 200000; i++) total += moov.getUint32(stts.start + 8 + i * 8);
                    info.frames = total;
                    info.fps = total / (dur / ts);
                  }
                } else if (kind === 'soun') {
                  info.hasAudio = true;
                  if (entry) {
                    info.acodec = entry.type;
                    info.ach = moov.getUint16(entry.start + 16);
                    info.ahz = moov.getUint32(entry.start + 24) >>> 16;
                  }
                }
              });
            }
          } catch (e) { try { diag({ where: 'video-info-parse', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); } catch {} }
        }
        if (!pop.isConnected) return;

        const VC = { avc1: 'H.264 (AVC)', avc3: 'H.264 (AVC)', hvc1: 'H.265 (HEVC)', hev1: 'H.265 (HEVC)', av01: 'AV1', vp09: 'VP9', apcn: 'ProRes 422', apch: 'ProRes 422 HQ', apcs: 'ProRes 422 LT', apco: 'ProRes 422 Proxy', ap4h: 'ProRes 4444', jpeg: 'Motion JPEG' };
        const AC = { mp4a: 'AAC', 'ac-3': 'Dolby Digital', 'ec-3': 'Dolby Digital Plus', Opus: 'Opus', alac: 'ALAC', lpcm: 'PCM', sowt: 'PCM', twos: 'PCM' };
        const EXT = { mp4: 'MP4', m4v: 'M4V', mov: 'QuickTime (MOV)', webm: 'WebM', ogv: 'Ogg' };
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        let ratio = '';
        if (vw && vh) {
          const g = gcd(vw, vh);
          const rw = vw / g, rh = vh / g;
          ratio = (rw <= 32 && rh <= 32) ? `${rw}:${rh}` : `${(vw / vh).toFixed(2).replace('.', ',')}:1`;
        }
        let rate = '';
        if (bytes && vd) {
          const mbps = (bytes * 8) / vd / 1e6;
          rate = mbps < 1 ? `${Math.round(mbps * 1000)} kb/s` : `${mbps.toFixed(2).replace('.', ',')} Mb/s`;
        }
        const container = info.brand ? (info.brand === 'qt  ' ? 'QuickTime (MOV)' : `MP4 (${info.brand.trim()})`) : (EXT[ext] || ext.toUpperCase());
        const vcName = info.vcodec ? ((VC[info.vcodec] || info.vcodec) + (info.vprof ? ` · ${info.vprof}` : '')) : '';
        const audioText = info.parsed
          ? (info.hasAudio
            ? [AC[info.acodec] || info.acodec, info.ach ? (info.ach === 1 ? 'mono' : info.ach === 2 ? 'estéreo' : `${info.ach} canais`) : '', info.ahz ? `${String(info.ahz / 1000).replace('.', ',')} kHz` : ''].filter(Boolean).join(' · ')
            : 'Sem faixa de áudio')
          : '';
        const vrows = [
          ['Arquivo', item.file],
          ['Contêiner', container],
          ['Dimensões', vw ? `${vw} × ${vh} px` : ''],
          ['Proporção', ratio],
          ['Orientação', vw && vh ? (vw === vh ? 'Quadrado' : (vw > vh ? 'Horizontal' : 'Vertical')) : ''],
          ['Duração', vd ? fmtDur(vd) : ''],
          ['Tamanho', item.size],
          ['Taxa de bits (média)', rate],
          ['Codec de vídeo', vcName],
          ['Quadros por segundo (média)', info.fps ? `${String(Number(info.fps.toFixed(2))).replace('.', ',')} fps` : ''],
          ['Total de quadros', info.frames ? String(info.frames) : ''],
          ['Espaço de cor', info.color],
          ['Áudio', audioText],
          ['Enviado', bvAuthorOf(item) ? `${item.date} · por ${bvAuthorOf(item)}` : item.date],
        ];
        const dlv = mk('dl');
        vrows.forEach(([k, v]) => {
          if (!v) return;
          const dt = mk('dt');
          dt.textContent = k;
          const dd = mk('dd');
          dd.textContent = v;
          dlv.append(dt, dd);
        });
        pop.textContent = '';
        pop.appendChild(dlv);
      } catch (e) {
        try { diag({ where: 'video-info', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); } catch {}
        if (pop.isConnected) pop.textContent = 'Não foi possível ler os metadados do vídeo.';
      }
      return;
    }
    const m = await bvReadMeta(item).catch(() => null);
    if (!pop.isConnected) return;
    const colorCount = await bvCountColors(item);
    if (!pop.isConnected) return;
    const rows = [
      ['Arquivo', item.file],
      ['Formato', m && m.fmt],
      ['Dimensões', bv.natW ? `${bv.natW} × ${bv.natH} px` : ''],
      ['Tamanho', item.size],
      ['Enviado', bvAuthorOf(item) ? `${item.date} · por ${bvAuthorOf(item)}` : item.date],
      ['Modo de cor', m && m.mode],
      ['Profundidade', m && m.depth ? `${m.depth} bits` : ''],
      ['Cores', colorCount],
      ['Resolução', m && m.dpi ? `${m.dpi} ppi` : ''],
      ['Perfil de cor', m && (m.icc ? (m.icc.name || 'Sem nome') : (m.srgb ? 'sRGB (marcador PNG)' : 'Nenhum embutido'))],
      ['Espaço do perfil', m && m.icc ? `${m.icc.space} · ICC v${m.icc.ver}` : ''],
      ['Quadros', m && m.frames > 1 ? String(m.frames) : ''],
      ['Duração', m && m.frames > 1 && m.ms ? `${(m.ms / 1000).toFixed(2).replace('.', ',')} s` : ''],
    ];
    const dl = mk('dl');
    rows.forEach(([k, v]) => {
      if (!v) return;
      const dt = mk('dt');
      dt.textContent = k;
      const dd = mk('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    });
    pop.textContent = '';
    pop.appendChild(dl);
  }

  function bvToggleFitZoom(el) {
    bv.zoom = bv.zoom === '100' ? 'fit' : '100';
    bvApplyZoomToStage(el, true);
  }

  function bvMakeRemovablePill(label, isB, onRemove) {
    const pill = mk('span');
    pill.className = `bv-pill${isB ? ' bv-pill-b' : ''}`;
    const txt = mk('span');
    txt.textContent = label;
    txt.title = label;
    const rm = mk('button');
    rm.type = 'button';
    rm.className = 'bv-pill-rm';
    rm.title = `Remover ${label} da comparação`;
    rm.setAttribute('aria-label', `Remover ${label} da comparação`);
    rm.innerHTML = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    rm.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    rm.addEventListener('dblclick', (ev) => ev.stopPropagation());
    rm.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onRemove();
    });
    pill.appendChild(txt);
    pill.appendChild(rm);
    return pill;
  }

  const bvImageCache = new Map();
  const bvBlobUrls = new Map();
  const bvBlobData = new Map();
  function bvBlobFetch(url, img, prio) {
    const fallback = () => { if (!img.src) img.src = url; if (img.decode) img.decode().catch(() => {}); };
    fetch(url, { credentials: 'include', priority: prio || 'low' })
      .then((r) => { if (!r.ok) throw new Error('http'); return r.blob(); })
      .then((b) => {
        if (!bvImageCache.has(url)) return null;
        const u = URL.createObjectURL(b);
        bvBlobUrls.set(url, u);
        bvBlobData.set(url, b);
        img.decoding = 'async';
        img.src = u;
        return img.decode ? img.decode() : null;
      })
      .catch(fallback);
  }
  function bvPreload(url, prio) {
    if (!url) return;
    if (bvImageCache.has(url)) { const hit = bvImageCache.get(url); bvImageCache.delete(url); bvImageCache.set(url, hit); return; }
    const img = new Image();
    img.decoding = 'async';
    bvImageCache.set(url, img);
    bvBlobFetch(url, img, prio);
    if (bvImageCache.size > 40) {
      const old = bvImageCache.keys().next().value;
      bvImageCache.delete(old);
      const ou = bvBlobUrls.get(old);
      if (ou) { try { URL.revokeObjectURL(ou); } catch (e) {} }
      bvBlobUrls.delete(old);
      bvBlobData.delete(old);
    }
  }
  function bvGetPreloadedDimensions(url) {
    const img = bvImageCache.get(url);
    if (img && img.complete && img.naturalWidth) return { w: img.naturalWidth, h: img.naturalHeight };
    return null;
  }
  function bvPreloadNeighbors(items, idx) {
    for (let d = 1; d <= 6; d++) {
      const p = d === 1 ? 'high' : 'low';
      const next = items[(idx + d) % items.length];
      const prev = items[(idx - d + items.length * 7) % items.length];
      if (next) bvPreload(next.fullUrl, p);
      if (prev) bvPreload(prev.fullUrl, p);
    }
  }

  function bvRender() {
    const el = ensureBetaViewer();
    const items = bv.items;
    const idx = Math.max(0, items.findIndex((x) => x.id === bv.activeId));
    const item = items[idx];
    bvPreload(item.fullUrl, 'high');
    bvPreloadNeighbors(items, idx);

    const dmPair = bvFindDmPair(item, items);
    if (dmPair) bvPreload(dmPair.fullUrl);

    const cmpPool = bvCompareItems();
    if (cmpPool.length === 2) {
      bvPreload(cmpPool[0].fullUrl);
      bvPreload(cmpPool[1].fullUrl);
    }

    const hasCompare = cmpPool.length === 2;
    if (bv.mode === 'compare' && !hasCompare) bv.mode = 'single';
    const isComparing = bv.mode === 'dm' || bv.mode === 'compare';

    el.classList.toggle('bv-light-bg', !!bv.lightStage);
    { const oldList = el.querySelector('.bv-strip-list'); bv.stripX = oldList ? oldList.scrollLeft : 0; }
    el.innerHTML = '';

    // 3. Stage (Declare early so lateral buttons can be appended)
    const stage = mk('div');
    stage.className = 'bv-stage';

    // 1. Top Bar (Jira AUI style)
    const top = mk('div');
    top.className = 'bv-top';

    const brand = mk('div');
    brand.className = 'bv-brand';
    const badge = mk('span');
    badge.className = 'bv-beta-tag';
    badge.textContent = 'Beta';
    brand.appendChild(badge);

    // Setas laterais fora da imagem (ciclicas: da ultima volta para a primeira)
    const prevBtn = mk('button');
    prevBtn.type = 'button';
    prevBtn.className = 'bv-side-nav bv-side-prev';
    prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    prevBtn.title = 'Imagem anterior (←)';
    prevBtn.setAttribute('aria-label', 'Imagem anterior');
    prevBtn.disabled = items.length <= 1;
    prevBtn.addEventListener('click', () => bvSelectImage(items[(idx - 1 + items.length) % items.length].id));

    const nextBtn = mk('button');
    nextBtn.type = 'button';
    nextBtn.className = 'bv-side-nav bv-side-next';
    nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    nextBtn.title = 'Próxima imagem (→)';
    nextBtn.setAttribute('aria-label', 'Próxima imagem');
    nextBtn.disabled = items.length <= 1;
    nextBtn.addEventListener('click', () => bvSelectImage(items[(idx + 1) % items.length].id));

    stage.appendChild(prevBtn);
    stage.appendChild(nextBtn);

    const titleWrap = mk('div');
    titleWrap.className = 'bv-title-wrap';
    const titleEl = mk('div');
    titleEl.className = 'bv-title';
    titleEl.textContent = item.file;
    titleEl.title = item.file;
    const metaEl = mk('div');
    metaEl.className = 'bv-meta';

    // Apply preloaded dimensions immediately if available
    const dims = bvGetPreloadedDimensions(item.fullUrl);
    const dimStr = dims ? `${dims.w} × ${dims.h} px` : '... px';

    const metaParts = [`${idx + 1}/${items.length}`, dimStr];
    if (item.size) metaParts.push(item.size);
    if (item.date) metaParts.push(item.date);
    const upAuthor = bvAuthorOf(item);

    bvSetMeta(metaEl, metaParts, upAuthor);
    titleWrap.appendChild(titleEl);
    const infoBtn = mk('button');
    infoBtn.type = 'button';
    infoBtn.className = 'bv-info-btn';
    infoBtn.title = item.isVideo ? 'Informações do vídeo (metadados e qualidade)' : 'Informações da imagem (metadados e perfil de cor)';
    infoBtn.setAttribute('aria-label', item.isVideo ? 'Informações do vídeo' : 'Informações da imagem');
    infoBtn.setAttribute('aria-expanded', 'false');
    infoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.4" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor"/></svg>';
    infoBtn.addEventListener('click', (ev) => { ev.stopPropagation(); bvToggleInfo(el, item, infoBtn); });
    const metaRow = mk('div');
    metaRow.className = 'bv-meta-row';
    metaRow.appendChild(metaEl);
    metaRow.appendChild(infoBtn);
    titleWrap.appendChild(metaRow);
    brand.appendChild(titleWrap);
    top.appendChild(brand);

    // Center Controls (Mode Switcher + Zoom)
    const centerCtrl = mk('div');
    centerCtrl.className = 'bv-center-controls';

    // Primary Mode Switcher
    const modeSeg = mk('div');
    modeSeg.className = 'bv-seg';
    modeSeg.setAttribute('role', 'group');
    modeSeg.setAttribute('aria-label', 'Modo do visualizador');

    const mkModeBtn = (modeKey, label, { disabled = false, title = '' } = {}) => {
      const b = mk('button');
      b.type = 'button';
      b.textContent = label;
      b.disabled = disabled;
      if (title) b.title = title;
      b.setAttribute('aria-pressed', String(bv.mode === modeKey));
      b.addEventListener('click', () => {
        if (b.disabled || bv.mode === modeKey) return;
        bv.mode = modeKey;
        if (modeKey === 'dm') bv.cmpStyle = 'curtain';
        else if (modeKey === 'compare') bv.cmpStyle = 'sbs';
        // 5. Default zoom for Curtain / SBS in DM is 100%
        if ((bv.mode === 'dm' || bv.mode === 'compare') && bv.cmpStyle === 'curtain') {
            bv.zoom = '100';
        }
        bvRender();
      });
      return b;
    };

    modeSeg.appendChild(mkModeBtn('single', 'Leitor 1:1', {
      title: 'Leitura vertical contínua em tamanho real (1:1)',
    }));
    modeSeg.appendChild(mkModeBtn('dm', 'Light vs Dark', {
      disabled: !dmPair,
      title: dmPair
        ? `Comparar versão Light com ${dmPair.file}`
        : 'Disponível quando existe outro arquivo com exatamente o mesmo nome + "_dm"',
    }));
    if (hasCompare) {
      modeSeg.appendChild(mkModeBtn('compare', 'Comparar (2)', {
        title: `Comparar ${cmpPool[0].file} e ${cmpPool[1].file}`,
      }));
    }
    centerCtrl.appendChild(modeSeg);

    // Zoom Controls
    const zoomBox = mk('div');
    zoomBox.className = 'bv-zoom';
    const effectiveZoomPct = () => {
      if (bv.zoom !== 'fit') return Number(bv.zoom) || 100;
      const stg = el.querySelector('.bv-stage');
      if (!bv.natW || !stg) return 100;
      return Math.max(25, Math.min(300, Math.round((bvScaledWidth(bv.natW, stg, bv.natH) / bv.natW) * 100)));
    };

    const zOut = mk('button');
    zOut.type = 'button';
    zOut.className = 'bv-icon-btn';
    zOut.textContent = '−';
    zOut.title = 'Diminuir zoom (- ou Ctrl+Scroll)';
    zOut.addEventListener('click', () => {
      const cur = effectiveZoomPct();
      const lower = [...BV_ZOOM_STEPS].reverse().find((z) => z < cur) || BV_ZOOM_STEPS[0];
      bv.zoom = String(lower);
      bvApplyZoomToStage(el, true);
    });

    const zVal = mk('button');
    zVal.type = 'button';
    zVal.className = 'bv-icon-btn bv-zoom-val';
    zVal.textContent = bv.zoom === 'fit' ? 'Ajustar' : (bv.zoom === '100' ? '1:1 (100%)' : `${bv.zoom}%`);
    zVal.title = 'Alternar entre 1:1 (100%) e Ajustar à largura (ou duplo clique na imagem)';
    zVal.addEventListener('click', () => bvToggleFitZoom(el));

    const zIn = mk('button');
    zIn.type = 'button';
    zIn.className = 'bv-icon-btn';
    zIn.textContent = '+';
    zIn.title = 'Aumentar zoom (+ ou Ctrl+Scroll)';
    zIn.addEventListener('click', () => {
      const cur = effectiveZoomPct();
      const higher = BV_ZOOM_STEPS.find((z) => z > cur) || BV_ZOOM_STEPS[BV_ZOOM_STEPS.length - 1];
      bv.zoom = String(higher);
      bvApplyZoomToStage(el, true);
    });

    zoomBox.appendChild(zOut);
    zoomBox.appendChild(zVal);
    zoomBox.appendChild(zIn);
    centerCtrl.appendChild(zoomBox);
    top.appendChild(centerCtrl);

    // Right Actions
    const acts = mk('div');
    acts.className = 'bv-actions';

    const bgBtn = mk('button');
    bgBtn.type = 'button';
    bgBtn.className = 'bv-icon-btn';
    bgBtn.innerHTML = bv.lightStage ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    bgBtn.title = 'Alternar fundo (claro/escuro)';
    bgBtn.setAttribute('aria-label', bgBtn.title);
    bgBtn.addEventListener('click', () => {
      bv.lightStage = !bv.lightStage;
      el.classList.toggle('bv-light-bg', bv.lightStage);
      bgBtn.innerHTML = bv.lightStage ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    });

    const citeBtn = mk('button');
    citeBtn.type = 'button';
    citeBtn.className = 'bv-icon-btn';
    citeBtn.innerHTML = `${ICON_CITE}<span>Citar</span>`;
    citeBtn.title = item.zip ? `Citar o zip ${item.zipFile} no novo comentário` : `Citar ${item.file} no novo comentário`;
    citeBtn.addEventListener('click', () => {
      let ref = { kind: 'attachment', id: item.id, file: item.file, href: item.href };
      if (item.zip) {
        try {
          const zli = Array.from(qa('#attachment_thumbnails li.attachment-content')).find((l) => { const r = attachmentRef(l); return r && r.id === String(item.zip); });
          const zr = zli && attachmentRef(zli);
          if (!zr) { showToast('Não foi possível identificar o zip', 3000); return; }
          ref = zr;
        } catch (e) { diag({ where: 'cite-zip', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); return; }
      }
      enqueueEditorOp(async () => {
        const res = await mentionUser(ref, ref.file);
        if (res === 'dup') showToast('Este anexo já está citado no comentário', 1800);
        else if (res && res !== 'aborted' && res !== 'noform') {
          citeBtn.classList.add('bv-done');
          showToast(`✓ ${ref.file} citado no comentário`, 1600);
          setTimeout(() => citeBtn.classList.remove('bv-done'), 1500);
        }
      });
    });

    const openOrig = mk('a');
    openOrig.className = 'bv-icon-btn';
    openOrig.href = item.href;
    openOrig.target = '_blank';
    openOrig.rel = 'noopener';
    openOrig.textContent = 'Abrir original ↗';
    openOrig.title = 'Abrir arquivo original em nova aba';

    const closeBtn = mk('button');
    closeBtn.type = 'button';
    closeBtn.className = 'bv-icon-btn bv-close';
    closeBtn.innerHTML = `${ICON_CLOSE}<span>Fechar</span>`;
    closeBtn.title = 'Fechar visualizador (Esc)';
    closeBtn.addEventListener('click', closeBetaViewer);

    acts.appendChild(bgBtn);
    acts.appendChild(citeBtn);
    acts.appendChild(openOrig);
    acts.appendChild(closeBtn);
    top.appendChild(acts);
    el.appendChild(top);

    // 2. Subbar (for Comparison Modes: Curtain / Side-by-Side / Flip + Swap + Quick Remove)
    const sub = mk('div');
    sub.className = 'bv-subbar';
    sub.hidden = !isComparing;

    const pair = isComparing ? bvResolvePair(item) : null;

    if (isComparing && pair) {
      const styleSeg = mk('div');
      styleSeg.className = 'bv-seg';
      styleSeg.setAttribute('role', 'group');
      styleSeg.setAttribute('aria-label', 'Estilo de comparação');
      [
        ['curtain', 'Cortina deslizante'],
        ['sbs', 'Lado a lado'],
        ['flip', 'Alternar (A / B)'],
      ].forEach(([stKey, stLabel]) => {
        const b = mk('button');
        b.type = 'button';
        b.textContent = stLabel;
        b.setAttribute('aria-pressed', String(bv.cmpStyle === stKey));
        b.addEventListener('click', () => {
          if (bv.cmpStyle === stKey) return;
          bv.cmpStyle = stKey;
          bvRender();
        });
        styleSeg.appendChild(b);
      });
      sub.appendChild(styleSeg);

      if (bv.mode === 'compare' && bv.compareIds.length === 2) {
        const swapBtn = mk('button');
        swapBtn.type = 'button';
        swapBtn.className = 'bv-icon-btn';
        swapBtn.textContent = '⇄ Inverter A / B';
        swapBtn.title = 'Trocar posição entre A e B';
        swapBtn.addEventListener('click', () => {
          bv.compareIds = [bv.compareIds[1], bv.compareIds[0]];
          bvRender();
        });
        sub.appendChild(swapBtn);
      }

      if (bv.cmpStyle === 'sbs') {
        const syncBtn = mk('button');
        syncBtn.type = 'button';
        syncBtn.className = 'bv-icon-btn';
        syncBtn.textContent = bv.syncScroll ? 'Rolagem sincronizada' : 'Rolagem independente';
        syncBtn.addEventListener('click', () => {
          bv.syncScroll = !bv.syncScroll;
          syncBtn.textContent = bv.syncScroll ? 'Rolagem sincronizada' : 'Rolagem independente';
        });
        sub.appendChild(syncBtn);
      } else if (bv.cmpStyle === 'flip') {
        const flipBtn = mk('button');
        flipBtn.type = 'button';
        flipBtn.className = 'bv-icon-btn';
        flipBtn.textContent = bv.flipShowB ? 'Mostrando B (clique ou Espaço → A)' : 'Mostrando A (clique ou Espaço → B)';
        flipBtn.addEventListener('click', () => bvToggleFlip());
        sub.appendChild(flipBtn);

        const rmABtn = mk('button');
        rmABtn.type = 'button';
        rmABtn.className = 'bv-icon-btn';
        rmABtn.textContent = '× Remover A';
        rmABtn.title = `Remover ${pair.a.file} da comparação`;
        rmABtn.addEventListener('click', () => bvRemoveFromComparison('a'));

        const rmBBtn = mk('button');
        rmBBtn.type = 'button';
        rmBBtn.className = 'bv-icon-btn';
        rmBBtn.textContent = '× Remover B';
        rmBBtn.title = `Remover ${pair.b.file} da comparação`;
        rmBBtn.addEventListener('click', () => bvRemoveFromComparison('b'));

        sub.appendChild(rmABtn);
        sub.appendChild(rmBBtn);
      } else if (bv.cmpStyle === 'curtain') {
        const centerBtn = mk('button');
        centerBtn.type = 'button';
        centerBtn.className = 'bv-icon-btn';
        centerBtn.textContent = 'Centralizar 50%';
        centerBtn.addEventListener('click', () => {
          bv.split = 50;
          const cw = el.querySelector('.bv-curtain-wrap');
          if (cw) cw.style.setProperty('--bv-split', '50%');
        });
        sub.appendChild(centerBtn);
        const h = mk('span');
        h.className = 'bv-subhint';
        h.textContent = 'Arraste a divisória ou use Shift + ← / →';
        sub.appendChild(h);
      }
    }
    el.appendChild(sub);

    // 3. Stage content setup

    // Ctrl + Scroll for smooth zoom without taking hand off the mouse
    stage.addEventListener('wheel', (ev) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      ev.stopPropagation();
      const cur = effectiveZoomPct();
      const factor = ev.deltaY < 0 ? 1.1 : (1 / 1.1);
      let next = Math.round(cur * factor);
      if (next === cur) next = ev.deltaY < 0 ? cur + 5 : cur - 5;
      next = Math.max(25, Math.min(300, next));
      if (next === cur) return;
      bv.zoom = String(next);
      bvApplyZoomToStage(el, true);
    }, { passive: false });

    const updateDims = (w, h) => {
      if (!w || !h || (bv.natW && bv.natH)) return;
      bv.natW = w;
      bv.natH = h;
      const upBy = bvAuthorOf(item);
      bvSetMeta(metaEl, [`${idx + 1}/${items.length}`, `${w} × ${h} px`, item.size, item.date].filter(Boolean), upBy);
      bvApplyZoomToStage(el);
    };

    if (!pair) {
      // Single 1:1 Vertical Reader
      const wrap = mk('div');
      wrap.className = 'bv-single-wrap';
      const img = mk('img');
      img.alt = item.file;
      img.decoding = 'async';
      img.title = 'Duplo clique para alternar 1:1 (100%) ↔ Ajustar à largura · Ctrl+Scroll para zoom';
      img.addEventListener('load', () => updateDims(img.naturalWidth, img.naturalHeight));
      img.addEventListener('dblclick', (ev) => {
        ev.preventDefault();
        bvToggleFitZoom(el);
      });
      if (item.isVideo) {
        try {
          let vid = bvVideoCache.get(item.id);
          if (!vid) {
            vid = mk('video');
            vid.controls = true;
            vid.preload = 'auto';
            vid.playsInline = true;
            vid.title = item.file;
            vid.style.cssText = 'display:block;max-width:100%;max-height:100%;background:#000';
            const vidKey = item.id;
            const vidNew = vid;
            vid.addEventListener('error', () => {
              if (bvVideoCache.get(vidKey) !== vidNew) return;
              bvVideoCache.delete(vidKey);
              showToast('Não foi possível reproduzir este vídeo (formato não suportado pelo navegador)', 3500);
            });
            vid.src = item.fullUrl;
            bvVideoCache.set(vidKey, vid);
            while (bvVideoCache.size > 4) {
              const oldKey = bvVideoCache.keys().next().value;
              const oldVid = bvVideoCache.get(oldKey);
              bvVideoCache.delete(oldKey);
              if (oldVid) { try { oldVid.pause(); oldVid.removeAttribute('src'); oldVid.load(); } catch {} }
            }
          } else {
            bvVideoCache.delete(item.id);
            bvVideoCache.set(item.id, vid);
          }
          wrap.style.cssText = 'position:absolute;inset:20px 72px;margin:0;min-height:0;display:flex;align-items:center;justify-content:center';
          const applyVidMeta = () => {
            try {
              const upBy = bvAuthorOf(item);
              const dim = vid.videoWidth ? `${vid.videoWidth} × ${vid.videoHeight} px` : '';
              bvSetMeta(metaEl, [`${idx + 1}/${items.length}`, dim, item.size, item.date].filter(Boolean), upBy);
            } catch (e) { diag({ where: 'video-meta', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); }
          };
          if (vid.readyState >= 1) applyVidMeta();
          else vid.addEventListener('loadedmetadata', applyVidMeta, { once: true });
          wrap.appendChild(vid);
        } catch (e) { diag({ where: 'video-viewer', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); }
      } else {
        bvBindImgFallback(img, item);
        wrap.appendChild(img);
      }
      stage.appendChild(wrap);
    } else if (bv.cmpStyle === 'curtain') {
      // Curtain Slider Comparison (both pills have × remove button)
      const wrap = mk('div');
      wrap.className = 'bv-curtain-wrap';
      wrap.style.setProperty('--bv-split', `${bv.split}%`);

      const badges = mk('div');
      badges.className = 'bv-curtain-badges';
      badges.appendChild(bvMakeRemovablePill(pair.labelA, false, () => bvRemoveFromComparison('a')));
      badges.appendChild(bvMakeRemovablePill(pair.labelB, true, () => bvRemoveFromComparison('b')));
      wrap.appendChild(badges);

      const imgA = mk('img');
      imgA.className = 'bv-img-a';
      imgA.alt = pair.a.file;
      imgA.decoding = 'async';
      imgA.addEventListener('load', () => {
        updateDims(imgA.naturalWidth, imgA.naturalHeight);
        try { bvApplyZoomToStage(el); } catch (e) { diag({ where: 'curtain-zoom', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); }
      });
      bvBindImgFallback(imgA, pair.a);

      const imgB = mk('img');
      imgB.className = 'bv-img-b';
      imgB.alt = pair.b.file;
      imgB.decoding = 'async';
      bvBindImgFallback(imgB, pair.b);

      const line = mk('div');
      line.className = 'bv-curtain-line';
      const knob = mk('div');
      knob.className = 'bv-curtain-knob';
      knob.tabIndex = 0;
      knob.setAttribute('role', 'slider');
      knob.setAttribute('aria-label', 'Divisória de comparação');
      knob.setAttribute('aria-valuemin', '0');
      knob.setAttribute('aria-valuemax', '100');
      knob.setAttribute('aria-valuenow', String(Math.round(bv.split)));
      knob.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      line.appendChild(knob);

      const setSplitFromClientX = (clientX) => {
        const r = wrap.getBoundingClientRect();
        if (!r.width) return;
        const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
        bv.split = pct;
        wrap.style.setProperty('--bv-split', `${pct.toFixed(2)}%`);
        knob.setAttribute('aria-valuenow', String(Math.round(pct)));
      };

      let dragging = false;
      wrap.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 || ev.target.closest('.bv-pill-rm')) return;
        dragging = true;
        try { wrap.setPointerCapture(ev.pointerId); } catch {}
        setSplitFromClientX(ev.clientX);
      });
      wrap.addEventListener('pointermove', (ev) => {
        if (!dragging) return;
        setSplitFromClientX(ev.clientX);
      });
      const stopDrag = (ev) => {
        if (!dragging) return;
        dragging = false;
        try { wrap.releasePointerCapture(ev.pointerId); } catch {}
      };
      wrap.addEventListener('pointerup', stopDrag);
      wrap.addEventListener('pointercancel', stopDrag);
      wrap.addEventListener('dblclick', (ev) => {
        if (ev.target.closest('.bv-curtain-knob, .bv-pill-rm')) return;
        ev.preventDefault();
        bvToggleFitZoom(el);
      });

      wrap.appendChild(imgA);
      wrap.appendChild(imgB);
      wrap.appendChild(line);
      stage.appendChild(wrap);
    } else if (bv.cmpStyle === 'sbs') {
      // Side-by-Side Synchronized Comparison (both pane headers have × remove button)
      const grid = mk('div');
      grid.className = 'bv-sbs-grid';

      const panes = [
        { imgItem: pair.a, label: pair.labelA, side: 'a' },
        { imgItem: pair.b, label: pair.labelB, side: 'b' },
      ].map(({ imgItem, label, side }) => {
        const pane = mk('div');
        pane.className = 'bv-sbs-pane';
        const head = mk('div');
        head.className = 'bv-sbs-head';
        const st = mk('strong');
        st.textContent = label;
        st.title = imgItem.file;

        const rightBox = mk('div');
        rightBox.className = 'bv-sbs-head-r';
        const dims = mk('span');
        dims.className = 'bv-meta';
        const rmBtn = mk('button');
        rmBtn.type = 'button';
        rmBtn.className = 'bv-sbs-rm';
        rmBtn.title = `Remover ${imgItem.file} da comparação`;
        rmBtn.setAttribute('aria-label', `Remover ${imgItem.file} da comparação`);
        rmBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
        rmBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          bvRemoveFromComparison(side);
        });
        rightBox.appendChild(dims);
        rightBox.appendChild(rmBtn);

        head.appendChild(st);
        head.appendChild(rightBox);

        const sc = mk('div');
        sc.className = 'bv-sbs-scroll';
        const im = mk('img');
        im.alt = imgItem.file;
        im.decoding = 'async';
        im.title = 'Duplo clique para alternar 1:1 (100%) ↔ Ajustar à largura';
        im.addEventListener('load', () => {
          dims.textContent = `${im.naturalWidth} × ${im.naturalHeight} px`;
          updateDims(im.naturalWidth, im.naturalHeight);
          bvApplyZoomToStage(el);
        });
        im.addEventListener('dblclick', (ev) => {
          ev.preventDefault();
          bvToggleFitZoom(el);
        });
        bvBindImgFallback(im, imgItem);
        sc.appendChild(im);
        pane.appendChild(head);
        pane.appendChild(sc);
        grid.appendChild(pane);
        return sc;
      });

      let syncingDst = null;
      const syncHandler = (srcPane, dstPane) => {
        if (!bv.syncScroll) return;
        const ex = srcPane._ex;
        if (ex && ex.t === srcPane.scrollTop && ex.l === srcPane.scrollLeft) { srcPane._ex = null; return; }
        srcPane._ex = null;
        const maxSrc = srcPane.scrollHeight - srcPane.clientHeight;
        const maxDst = dstPane.scrollHeight - dstPane.clientHeight;
        if (maxSrc > 0 && maxDst > 0) {
          dstPane.scrollTop = Math.abs(maxSrc - maxDst) <= 4
            ? srcPane.scrollTop
            : (srcPane.scrollTop / maxSrc) * maxDst;
        }
        const maxSrcX = srcPane.scrollWidth - srcPane.clientWidth;
        const maxDstX = dstPane.scrollWidth - dstPane.clientWidth;
        if (maxSrcX > 0 && maxDstX > 0) {
          dstPane.scrollLeft = (srcPane.scrollLeft / maxSrcX) * maxDstX;
        }
        dstPane._ex = { t: dstPane.scrollTop, l: dstPane.scrollLeft };
      };
      panes[0].addEventListener('scroll', () => syncHandler(panes[0], panes[1]), { passive: true });
      panes[1].addEventListener('scroll', () => syncHandler(panes[1], panes[0]), { passive: true });
      panes.forEach((p, i) => p.addEventListener('wheel', (ev) => {
        if (!bv.syncScroll || ev.ctrlKey || ev.metaKey) return;
        ev.preventDefault();
        const k = ev.deltaMode === 1 ? 16 : (ev.deltaMode === 2 ? p.clientHeight : 1);
        p.scrollTop += ev.deltaY * k;
        p.scrollLeft += ev.deltaX * k;
        p._ex = { t: p.scrollTop, l: p.scrollLeft };
        syncHandler(p, panes[1 - i]);
      }, { passive: false }));

      stage.appendChild(grid);
    } else if (bv.cmpStyle === 'flip') {
      // Blink / Flip Comparison (pill has × remove button, subbar also has Remove A / Remove B)
      const wrap = mk('div');
      wrap.className = 'bv-flip-wrap';

      const banner = mk('div');
      banner.className = 'bv-flip-banner';
      banner.appendChild(bvMakeRemovablePill(
        bv.flipShowB ? pair.labelB : pair.labelA,
        bv.flipShowB,
        () => bvRemoveFromComparison(bv.flipShowB ? 'b' : 'a')
      ));
      wrap.appendChild(banner);

      const stg = mk('div');
      stg.className = 'bv-flip-stage';
      stg.title = 'Clique ou pressione Espaço para alternar entre A e B · Duplo clique para zoom 1:1 / Ajustar';

      const imgA = mk('img');
      imgA.alt = pair.a.file;
      imgA.hidden = bv.flipShowB;
      imgA.addEventListener('load', () => updateDims(imgA.naturalWidth, imgA.naturalHeight));
      bvBindImgFallback(imgA, pair.a);

      const imgB = mk('img');
      imgB.alt = pair.b.file;
      imgB.hidden = !bv.flipShowB;
      imgB.addEventListener('load', () => updateDims(imgB.naturalWidth, imgB.naturalHeight));
      bvBindImgFallback(imgB, pair.b);

      stg.addEventListener('click', (ev) => {
        if (ev.target.closest('.bv-pill-rm')) return;
        bvToggleFlip();
      });
      stg.addEventListener('dblclick', (ev) => {
        if (ev.target.closest('.bv-pill-rm')) return;
        ev.preventDefault();
        bvToggleFitZoom(el);
      });
      stg.appendChild(imgA);
      stg.appendChild(imgB);
      wrap.appendChild(stg);
      stage.appendChild(wrap);
    }

    el.appendChild(stage);

    // 4. Bottom Thumbnail Strip (all attached images with checkboxes, max 2 for comparator)
    const strip = mk('div');
    strip.className = 'bv-strip';
    strip.hidden = items.length < 2;

    if (items.length >= 2) {
      const checkedIds = bvCompareItems().map((x) => x.id);
      const info = mk('div');
      info.className = 'bv-strip-info';
      const infoTitle = mk('strong');
      infoTitle.textContent = checkedIds.length === 2
        ? 'Comparando 2 imagens'
        : 'Comparar imagens';
      const infoSub = mk('span');
      infoSub.textContent = checkedIds.length === 2
        ? 'Desmarque uma para remover da comparação'
        : (checkedIds.length === 1
          ? '1 marcada — marque mais 1 para comparar'
          : 'Marque 2 caixas para comparar lado a lado');
      info.appendChild(infoTitle);
      info.appendChild(infoSub);
      strip.appendChild(info);

      const listEl = mk('div');
      listEl.className = 'bv-strip-list';
      const seenZip = new Set();
      const secOf = new Map();
      items.forEach((it) => {
        let host = listEl;
        if (it.zip) {
          if (!seenZip.has(it.zip)) {
            seenZip.add(it.zip);
            if (bv.zipOpen.has(it.zip)) {
              const sec = bvZipSection(it.zip, item);
              secOf.set(it.zip, sec);
              listEl.appendChild(sec);
            } else listEl.appendChild(bvZipCard(it.zip, item));
          }
          if (!bv.zipOpen.has(it.zip)) return;
          host = secOf.get(it.zip) || listEl;
        }
        const slotIdx = checkedIds.indexOf(it.id);
        const isChecked = slotIdx >= 0;
        const isActiveSingle = bv.mode === 'single' && it.id === item.id;
        const isActiveCompare = isComparing && pair && (it.id === pair.a.id || it.id === pair.b.id);

        const card = mk('div');
        const nxt = items[items.indexOf(it) + 1];
        card.className = `bv-strip-item${(isActiveSingle || isActiveCompare) ? ' bv-strip-active' : ''}${it.zip ? ' bv-strip-child' : ''}${(it.zip && !(nxt && nxt.zip === it.zip)) ? ' bv-strip-child-last' : ''}`;
        if (it.zip) card.style.setProperty('--bv-zc', bvZipColor(it.zip));
        card.title = `${it.file}${it.size ? ` (${it.size})` : ''}${it.zip ? ` · dentro de ${it.zipFile}` : ''}`;

        const chkLabel = mk('label');
        chkLabel.className = 'bv-strip-chk';
        const chk = mk('input');
        chk.type = 'checkbox';
        chk.checked = isChecked;
        chk.disabled = !isChecked && checkedIds.length >= 2;
        const chkTip = isChecked
          ? `Remover ${it.file} da comparação`
          : (checkedIds.length >= 2
            ? 'Apenas 2 imagens podem ser comparadas por vez'
            : `Marcar ${it.file} para comparar`);
        chkLabel.title = chkTip;
        chk.setAttribute('aria-label', chkTip);
        chkLabel.addEventListener('click', (ev) => ev.stopPropagation());
        chk.addEventListener('change', (ev) => {
          ev.stopPropagation();
          bvToggleStripCheckbox(it.id);
        });
        chkLabel.appendChild(chk);
        card.appendChild(chkLabel);

        if (isChecked) {
          const slotTag = mk('span');
          slotTag.className = 'bv-strip-slot';
          slotTag.textContent = slotIdx === 0 ? 'A' : 'B';
          card.appendChild(slotTag);
        }

        const th = mk('div');
        th.className = 'bv-strip-thumb';
        th.appendChild(bvThumbImg(it));
        card.appendChild(th);

        const nm = mk('div');
        nm.className = 'bv-strip-name';
        nm.textContent = it.file;
        card.appendChild(nm);

        card.addEventListener('click', () => {
          if (bv.mode === 'single') {
            if (it.id !== item.id) bvSelectImage(it.id, 'single');
          } else {
            bvSelectImage(it.id, 'single');
          }
        });

        host.appendChild(card);
      });
      strip.appendChild(listEl);
    }
    el.appendChild(strip);
    { const sl = strip.querySelector('.bv-strip-list'); if (sl && bv.stripX) sl.scrollLeft = bv.stripX; }

    el.hidden = false;
    bvApplyZoomToStage(el);
    requestAnimationFrame(() => {
      bvPositionNavButtons(el);
      const activeCard = strip.querySelector('.bv-strip-item.bv-strip-active');
      if (activeCard && typeof activeCard.scrollIntoView === 'function') {
        try { activeCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' }); } catch {}
      }
    });
    try { closeBtn.focus({ preventScroll: true }); } catch {}
  }

  function bvToggleFlip() {
    const el = gid('uhub-beta-viewer');
    if (!el || el.hidden || bv.cmpStyle !== 'flip') return;
    bv.flipShowB = !bv.flipShowB;
    const item = bv.items.find((x) => x.id === bv.activeId);
    const pair = item && bvResolvePair(item);
    if (!pair) return;
    const imgs = el.querySelectorAll('.bv-flip-stage img');
    if (imgs.length === 2) {
      imgs[0].hidden = bv.flipShowB;
      imgs[1].hidden = !bv.flipShowB;
    }
    const banner = el.querySelector('.bv-flip-banner');
    if (banner) {
      banner.innerHTML = '';
      banner.appendChild(bvMakeRemovablePill(
        bv.flipShowB ? pair.labelB : pair.labelA,
        bv.flipShowB,
        () => bvRemoveFromComparison(bv.flipShowB ? 'b' : 'a')
      ));
    }
    const btn = el.querySelector('.bv-subbar > .bv-icon-btn');
    if (btn) btn.textContent = bv.flipShowB ? 'Mostrando B (clique ou Espaço → A)' : 'Mostrando A (clique ou Espaço → B)';
  }

  document.addEventListener('keydown', (ev) => {
    if (!bv.open) return;
    const el = gid('uhub-beta-viewer');
    if (!el || el.hidden) { bv.open = false; return; }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      closeBetaViewer();
      return;
    }
    const tag = ev.target && ev.target.tagName;
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (ev.key === ' ' && (bv.mode === 'dm' || bv.mode === 'compare') && bv.cmpStyle === 'flip') {
      ev.preventDefault();
      bvToggleFlip();
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      if ((bv.mode === 'dm' || bv.mode === 'compare') && bv.cmpStyle === 'curtain' && (ev.shiftKey || (document.activeElement && document.activeElement.classList.contains('bv-curtain-knob')))) {
        ev.preventDefault();
        const step = ev.shiftKey ? 10 : 2;
        bv.split = Math.max(0, Math.min(100, bv.split + (ev.key === 'ArrowRight' ? step : -step)));
        const cw = el.querySelector('.bv-curtain-wrap');
        if (cw) cw.style.setProperty('--bv-split', `${bv.split}%`);
        const kn = el.querySelector('.bv-curtain-knob');
        if (kn) kn.setAttribute('aria-valuenow', String(Math.round(bv.split)));
      } else if (bv.items.length > 1) {
        ev.preventDefault();
        const idx = Math.max(0, bv.items.findIndex((x) => x.id === bv.activeId));
        const nextIdx = ev.key === 'ArrowRight' ? (idx + 1) % bv.items.length : (idx - 1 + bv.items.length) % bv.items.length;
        bvSelectImage(bv.items[nextIdx].id);
      }
    } else if (ev.key === '+' || ev.key === '=') {
      const zIn = el.querySelectorAll('.bv-zoom .bv-icon-btn')[2];
      if (zIn) zIn.click();
    } else if (ev.key === '-') {
      const zOut = el.querySelectorAll('.bv-zoom .bv-icon-btn')[0];
      if (zOut) zOut.click();
    } else if (ev.key === '0') {
      bv.zoom = '100';
      bvApplyZoomToStage(el, true);
    }
  }, true);
  // Anexos: versoes agrupadas, selo "novo" e previa ao passar o mouse Convencao interna: v1, v2, v3... =
  // versoes; OP1, OP2... = opcoes da MESMA versao (nunca escondidas); _dm = previa em dark mode da mesma
  // versao. Sem vN = v1. Prints colados (image-AAAA-MM-DD...) nunca agrupam. Os <li> do Jira so sao movidos
  // para dentro de um <li class=uhub-attg> (nada e clonado), entao links, previa nativa, lixeira etc.
  // continuam.
  const ATT_SEP = '[\\s._-]';
  const ATT_RE = {
    ext: /\.[a-z0-9]{2,5}$/i,
    archive: /\.zip$/i, // pacote: ZIP com vN explicito cobre todas as versoes menores
    paste: /^(image-\d{4}-\d{2}-\d{2}-|screenshot|screen shot|captura de tela|clipboard)/i,
    dm: new RegExp(`(^|${ATT_SEP})(dm|dark${ATT_SEP}?mode)(?=$|${ATT_SEP})`, 'i'),
    ver: new RegExp(`(^|${ATT_SEP})v(?:ers(?:a|ã)o|ersion)?${ATT_SEP}?0*(\\d{1,3})(?=$|${ATT_SEP})`, 'i'),
    op: new RegExp(`(^|${ATT_SEP})op(?:[cç](?:a|ã)o|tion)?${ATT_SEP}?0*(\\d{1,3})(?=$|${ATT_SEP})`, 'i'),
    words: new RegExp(`(^|${ATT_SEP})(final|ajustad[oa]|ajuste|revisad[oa]|revisao|corrigid[oa]|nov[oa]|copia|copy)(?=$|${ATT_SEP})`, 'g'),
    wide: new RegExp(`(^|${ATT_SEP})(dark|light|escuro|claro|\\d{2,5}x\\d{2,5}|\\d{2,5}px|\\d{4}-?\\d{2}-?\\d{2}|\\d{2}-\\d{2})(?=$|${ATT_SEP})`, 'g'),
  };
  const ATT_SENS_HINT = {
    estrito: 'Junta só nomes idênticos depois de tirar vN, OPn e _dm.',
    normal: 'Também ignora maiúsculas, separadores, "final", "ajustado", "cópia", "(1)". Recomendado.',
    amplo: 'Também ignora dark/light, tamanhos (1920px, 360x640) e datas no nome.',
  };
  const attParseCache = new Map();
  function parseAttName(name, sens) {
    const ck = `${sens}\u0001${name}`;
    if (attParseCache.has(ck)) return attParseCache.get(ck);
    const em = name.match(ATT_RE.ext);
    const ext = em ? em[0] : '';
    let s = name.slice(0, name.length - ext.length);
    let res;
    if (ATT_RE.paste.test(s)) {
      res = { solo: true, ver: 1, explicit: false, op: null, dm: false, key: '' };
    } else {
      let ver = 1;
      let op = null;
      let dm = false;
      let explicit = false;
      s = s.replace(ATT_RE.dm, (m, p) => { dm = true; return p; });
      s = s.replace(ATT_RE.ver, (m, p, n) => { ver = Number(n) || 1; explicit = true; return p; });
      s = s.replace(ATT_RE.op, (m, p, n) => { op = Number(n); return p; });
      let key;
      if (sens === 'estrito') {
        key = s.replace(/^[\s._-]+|[\s._-]+$/g, '') + ext.toLowerCase();
      } else {
        let k = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        k = k.replace(/\(\d{1,2}\)/g, ' ').replace(ATT_RE.words, ' ');
        if (sens === 'amplo') k = k.replace(ATT_RE.wide, ' ');
        k = k.replace(/[\s._-]+\d{1,2}$/, '');
        key = k.replace(/[\s._-]+/g, ' ').trim();
      }
      res = { solo: !key, ver, explicit, op, dm, key };
    }
    if (attParseCache.size > 2000) attParseCache.clear();
    attParseCache.set(ck, res);
    return res;
  }
  function attDisplayBase(name) {
    return name.replace(ATT_RE.ext, '')
      .replace(ATT_RE.dm, '$1').replace(ATT_RE.ver, '$1').replace(ATT_RE.op, '$1')
      .replace(/[\s._-]+$/, '').replace(/^[\s._-]+/, '') || name;
  }
  function attTagText(p) {
    const parts = [`v${p.ver}`];
    if (p.op != null) parts.push(`OP${p.op}`);
    if (p.dm) parts.push('dm');
    return parts.join(' · ');
  }
  function attLiInfo(li) {
    const ref = attachmentRef(li);
    if (!ref) return null;
    const t = li.querySelector('.attachment-date time[datetime], time[datetime]');
    const ts = t ? Date.parse(t.getAttribute('datetime')) : NaN;
    const thumbA = li.querySelector('.attachment-thumb a[title]');
    const title = thumbA ? thumbA.getAttribute('title') || '' : '';
    const author = title.includes(' - ') ? title.split(' - ').pop().trim() : '';
    return { li, id: ref.id, name: ref.file, t: Number.isFinite(ts) ? ts : 0, author };
  }
  function attAllLis(list) {
    return Array.from(list.querySelectorAll('li.attachment-content'));
  }
  // ordem original do Jira, preservada mesmo depois de mover os <li>
  function attEnsureOrder(list) {
    let max = -1;
    const lis = attAllLis(list);
    lis.forEach((li) => { const o = Number(li.dataset.uhubOrd); if (Number.isFinite(o) && li.dataset.uhubOrd !== '') max = Math.max(max, o); });
    lis.forEach((li) => { if (li.dataset.uhubOrd === undefined || li.dataset.uhubOrd === '') li.dataset.uhubOrd = String(++max); });
    return lis.sort((a, b) => Number(a.dataset.uhubOrd) - Number(b.dataset.uhubOrd));
  }
  function attSortItems(list) {
    return list.sort((a, b) => ((a.p.op ?? 0) - (b.p.op ?? 0)) || (Number(a.p.dm) - Number(b.p.dm)) || (a.t - b.t) || a.name.localeCompare(b.name));
  }
  function attMkVlist(items) {
    const vers = new Map();
    items.forEach((it) => { if (!vers.has(it.p.ver)) vers.set(it.p.ver, []); vers.get(it.p.ver).push(it); });
    return Array.from(vers.keys()).sort((a, b) => a - b).map((v) => ({ v, items: attSortItems(vers.get(v)) }));
  }
  // Palavras relevantes do nome do anexo (para associar ZIP com vN apenas a arquivos relacionados)
  const ATT_STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'pra', 'pro', 'com', 'sem', 'por', 'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as', 'ao', 'aos']);
  function attRelevantWords(name) {
    let s = String(name || '').replace(ATT_RE.ext, '');
    s = s.replace(ATT_RE.dm, '$1').replace(ATT_RE.ver, '$1').replace(ATT_RE.op, '$1');
    s = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/\(\d{1,2}\)/g, ' ').replace(ATT_RE.words, ' ');
    const out = new Set();
    for (const raw of s.split(/[\s_-]+/)) {
      const w = raw.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
      if (w.length >= 2 && !/^\d{1,2}$/.test(w) && !ATT_STOP_WORDS.has(w)) out.add(w);
    }
    return out;
  }
  function attCommonWordCount(wordsA, wordsB) {
    let n = 0;
    wordsA.forEach((w) => { if (wordsB.has(w)) n += 1; });
    return n;
  }
  // Pacote (1B): um ZIP com vN explicito (N >= 2) absorve anexos nao colados com versao <= N que tenham
  // vN explicito OU 2 ou mais palavras relevantes em comum com o nome do ZIP. Prints colados nunca entram.
  function attBuildPackages(infos, groupOf) {
    const zips = infos
      .filter((it) => !it.p.solo && it.p.explicit && it.p.ver >= 2 && ATT_RE.archive.test(it.name))
      .sort((a, b) => (b.p.ver - a.p.ver) || (b.t - a.t));
    if (!zips.length) return;
    const nonSolo = infos.filter((it) => !it.p.solo);
    const maxAll = nonSolo.length ? Math.max(...nonSolo.map((it) => it.p.ver)) : 0;
    const wordsById = new Map(nonSolo.map((it) => [it.id, attRelevantWords(it.name)]));
    zips.forEach((top) => {
      if (groupOf.has(top.id)) return;
      const N = top.p.ver;
      const topWords = wordsById.get(top.id) || new Set();
      const members = nonSolo.filter((it) => {
        if (groupOf.has(it.id) || it.p.ver > N) return false;
        if (it.id === top.id || (!ATT_RE.archive.test(it.name) && it.p.explicit)) return true;
        return attCommonWordCount(topWords, wordsById.get(it.id) || new Set()) >= 2;
      });
      if (members.length < 2 || !members.some((it) => it.p.ver < N)) return;
      const pkg = { key: `pkg:${top.id}`, title: attDisplayBase(top.name), vlist: attMkVlist(members), pkg: true, isCurrent: maxAll <= N };
      members.forEach((it) => groupOf.set(it.id, pkg));
    });
  }
  function attBuildGroups(infos, sens) {
    infos.forEach((it) => { it.p = parseAttName(it.name, sens); });
    const groupOf = new Map();
    attBuildPackages(infos, groupOf);
    const map = new Map();
    infos.forEach((it) => {
      if (it.p.solo || groupOf.has(it.id)) return;
      if (!map.has(it.p.key)) map.set(it.p.key, []);
      map.get(it.p.key).push(it);
    });
    map.forEach((items, key) => {
      const vlist = attMkVlist(items);
      if (vlist.length < 2) return;
      const g = { key, title: attDisplayBase(items[0].name), vlist, isCurrent: true };
      items.forEach((it) => groupOf.set(it.id, g));
    });
    return groupOf;
  }
  const attGroupOpen = new Set();
  let attGroupSig = '';
  function attUnwrapAll(list) {
    const lis = attEnsureOrder(list);
    list.querySelectorAll('.uhub-att-vtag').forEach((n) => n.remove());
    lis.forEach((li) => { li.classList.remove('uhub-att-stackfx', 'uhub-att-older'); list.appendChild(li); });
    list.querySelectorAll(':scope > li.uhub-attg').forEach((w) => w.remove());
  }
  function applyAttachmentGrouping() {
    const list = gid('attachment_thumbnails');
    if (!list) return;
    const mode = 'off';
    const sens = prefs.attSens;
    const lis = attEnsureOrder(list);
    const infos = lis.map(attLiInfo).filter(Boolean);
    const groupOf = mode === 'off' ? new Map() : attBuildGroups(infos, sens);
    const wrapped = list.querySelector(':scope > li.uhub-attg');
    const sig = [mode, sens, infos.map((i) => `${i.id}:${i.li.dataset.uhubOrd}`).join(','),
      Array.from(attGroupOpen).join('|')].join('\u0001');
    if (!groupOf.size && !wrapped) {
      list.querySelectorAll('.uhub-att-vtag').forEach((n) => n.remove());
      attGroupSig = sig;
      return;
    }
    const intact = infos.every((i) => (i.li.parentElement === list) === !groupOf.has(i.id));
    if (sig === attGroupSig && intact && (!groupOf.size || wrapped)) return;
    attGroupSig = sig;
    attUnwrapAll(list);
    if (!groupOf.size) return;
    const done = new Set();
    const byId = new Map(infos.map((i) => [i.id, i]));
    infos.forEach((it) => {
      const g = groupOf.get(it.id);
      if (!g) { list.appendChild(it.li); return; }
      if (done.has(g)) return;
      done.add(g);
      list.appendChild(mode === 'frame' ? attRenderFrame(g) : attRenderStack(g));
    });
    groupOf.forEach((g, id) => {
      const it = byId.get(id);
      const thumb = it && it.li.querySelector('.attachment-thumb');
      if (!thumb) return;
      const tag = mk('span');
      tag.className = 'uhub-att-vtag';
      tag.textContent = attTagText(it.p);
      thumb.appendChild(tag);
    });
  }
  function attMkRow(items, cls) {
    const row = mk('div');
    row.className = `uhub-attg-row${cls ? ` ${cls}` : ''}`;
    items.forEach((it) => row.appendChild(it.li));
    return row;
  }
  function attRenderStack(g) {
    const w = mk('li');
    w.className = 'uhub-attg uhub-attg-stack';
    const last = g.vlist[g.vlist.length - 1];
    const older = g.vlist.slice(0, -1);
    const open = attGroupOpen.has(g.key);
    const label = mk('span');
    label.className = 'uhub-attg-label uhub-attg-cur';
    label.textContent = g.isCurrent ? `v${last.v} · atual` : `v${last.v}`;
    label.title = g.title;
    w.appendChild(label);
    const cur = attMkRow(last.items, 'uhub-attg-current');
    if (last.items[0]) last.items[0].li.classList.add('uhub-att-stackfx');
    w.appendChild(cur);
    const nOld = older.reduce((a, v) => a + v.items.length, 0);
    const chip = mk('button');
    chip.type = 'button';
    chip.className = 'uhub-attg-chip';
    chip.setAttribute('aria-expanded', String(open));
    chip.textContent = `${open ? '▾' : '▸'} ${older.map((v) => `v${v.v}`).join(', ')} · ${nOld} arquivo${nOld > 1 ? 's' : ''}`;
    chip.title = open ? 'Ocultar versões anteriores' : 'Mostrar versões anteriores';
    chip.dataset.g = g.key;
    w.appendChild(chip);
    const old = attMkRow(older.flatMap((v) => v.items), 'uhub-attg-older');
    older.forEach((v) => v.items.forEach((it) => it.li.classList.add('uhub-att-older')));
    if (!open) old.hidden = true;
    w.appendChild(old);
    return w;
  }
  function attRenderFrame(g) {
    const w = mk('li');
    w.className = 'uhub-attg uhub-attg-frame';
    const head = mk('div');
    head.className = 'uhub-attg-head';
    const t = mk('strong');
    t.textContent = g.title;
    const n = mk('span');
    n.textContent = `${g.vlist.length} versões`;
    head.appendChild(t);
    head.appendChild(n);
    w.appendChild(head);
    const vers = mk('div');
    vers.className = 'uhub-attg-vers';
    const maxV = g.vlist[g.vlist.length - 1].v;
    g.vlist.forEach((v) => {
      const box = mk('div');
      box.className = 'uhub-attg-ver';
      const lb = mk('span');
      const isCur = v.v === maxV && g.isCurrent;
      lb.className = `uhub-attg-label${isCur ? ' uhub-attg-cur' : ''}`;
      lb.textContent = isCur ? `v${v.v} · atual` : `v${v.v}`;
      box.appendChild(lb);
      box.appendChild(attMkRow(v.items));
      vers.appendChild(box);
    });
    w.appendChild(vers);
    return w;
  }
  // ---------- Selo "novo" (desde a sua ultima visita a esta issue) ----------
  const ATT_SEEN_KEY = 'uhub-att-seen';
  const attNewState = { key: '', known: null, fresh: new Set() };
  function myFullName() {
    const m = q1('meta[name="ajs-remote-user-fullname"]');
    return m && m.content ? m.content.trim().toLowerCase() : '';
  }
  function applyAttachmentNewBadges() {
    const list = gid('attachment_thumbnails');
    const key = state.issueKey || getIssueKey();
    if (!list || !key || !attOn()) return;
    const infos = attAllLis(list).map(attLiInfo).filter(Boolean);
    if (attNewState.key !== key) {
      let store = {};
      try { store = JSON.parse(GM_getValue(ATT_SEEN_KEY, '{}')) || {}; } catch (e) { store = {}; }
      const rec = store[key];
      attNewState.key = key;
      attNewState.saved = false;
      attNewState.fresh = new Set();
      attNewState.known = new Set(rec && Array.isArray(rec.ids) ? rec.ids : infos.map((i) => i.id));
    }
    const me = myFullName();
    let changed = false;
    infos.forEach((i) => {
      if (!attNewState.known.has(i.id)) {
        attNewState.known.add(i.id);
        changed = true;
        if (!me || i.author.toLowerCase() !== me) attNewState.fresh.add(i.id);
      }
    });
    if (changed || !attNewState.saved) {
      attNewState.saved = true;
      try {
        const store = JSON.parse(GM_getValue(ATT_SEEN_KEY, '{}')) || {};
        const prev = store[key] && Array.isArray(store[key].ids) ? store[key].ids : [];
        store[key] = { ids: Array.from(new Set(prev.concat(Array.from(attNewState.known)))).slice(-400), at: Date.now() };
        const keys = Object.keys(store);
        if (keys.length > 300) keys.sort((a, b) => (store[a].at || 0) - (store[b].at || 0)).slice(0, keys.length - 300).forEach((k) => delete store[k]);
        GM_setValue(ATT_SEEN_KEY, JSON.stringify(store));
      } catch {}
    }
    infos.forEach((i) => {
      const thumb = i.li.querySelector('.attachment-thumb');
      if (!thumb) return;
      const has = thumb.querySelector(':scope > .uhub-att-new');
      if (attNewState.fresh.has(i.id)) {
        if (!has) {
          const b = mk('span');
          b.className = 'uhub-att-new';
          b.textContent = 'novo';
          b.title = 'Adicionado desde a sua última visita';
          thumb.appendChild(b);
        }
      } else if (has) has.remove();
    });
  }
  // ---------- Previa ao passar o mouse em links de anexo (clique na imagem abre no Visualizador Beta) ----------
  const ATT_IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
  const attPv = { timer: 0, hideTimer: 0, link: null, el: null, imageId: '', imageFile: '' };
  function attPvEl() {
    if (attPv.el && attPv.el.isConnected) return attPv.el;
    const el = mk('div');
    el.id = 'uhub-att-pv';
    el.setAttribute('role', 'tooltip');
    el.hidden = true;
    el.innerHTML = '<div class="pv-img"><img alt=""></div><div class="pv-meta"><span class="pv-name"></span><span class="pv-size"></span></div>';
    const pvImgBox = el.querySelector('.pv-img');
    el.querySelector('img').addEventListener('error', () => {
      el.classList.add('pv-noimg');
      el.classList.remove('pv-clickable');
      if (!el.dataset.hasMeta) attPvHide();
    });
    el.querySelector('img').addEventListener('load', () => attPvPlace());
    el.addEventListener('mouseenter', () => {
      clearTimeout(attPv.hideTimer);
    });
    el.addEventListener('mouseleave', () => {
      clearTimeout(attPv.hideTimer);
      attPv.hideTimer = setTimeout(() => {
        if (!attPv.link || !attPv.link.matches(':hover')) attPvHide();
      }, 120);
    });
    pvImgBox.addEventListener('click', (ev) => {
      if (!prefs.betaViewer || !attPv.imageId) return;
      ev.preventDefault();
      ev.stopPropagation();
      const targetId = attPv.imageId;
      const targetFile = attPv.imageFile;
      attPvHide();
      openBetaViewer(targetId, targetFile);
    });
    document.body.appendChild(el);
    attPv.el = el;
    return el;
  }
  function attPvTarget(node) {
    const a = node && node.closest ? node.closest('a[href*="/secure/attachment/"]') : null;
    if (!a || a.querySelector('img:not(.rendericon)')) return null;
    if (a.closest('#attachment_thumbnails, #uhub-att-pv, #attachmentmodule_heading')) return null;
    return /\/secure\/attachment\/\d+\//.test(a.getAttribute('href') || '') ? a : null;
  }
  function attPvShow(a) {
    clearTimeout(attPv.hideTimer);
    const m = /\/secure\/attachment\/(\d+)\/([^?#]*)/.exec(a.getAttribute('href') || '');
    if (!m) return;
    const id = m[1];
    let file = '';
    try { file = decodeURIComponent(m[2]); } catch (e) { file = m[2]; }
    file = file.replace(new RegExp(`^${id}_`), '');
    const lis = Array.from(qa('#attachment_thumbnails li.attachment-content'));
    const li = lis.find((x) => { const r = attachmentRef(x); return r && r.id === id; })
      || lis.reverse().find((x) => { const r = attachmentRef(x); return r && r.file === file; });
    const tileImg = li && li.querySelector('img.attachment-thumb-img');
    let src = tileImg ? (tileImg.currentSrc || tileImg.getAttribute('src')) : '';
    if (!src && ATT_IMG_EXT.test(file)) src = `${location.origin}${(q1('meta[name="ajs-context-path"]') || {}).content || ''}/secure/thumbnail/${id}/_thumb_${id}.png`;
    const sizeEl = li && li.querySelector('.attachment-size');
    if (!src && !li) return;
    const ref = li ? attachmentRef(li) : null;
    const isImg = !!(src && ((li && isImageAttachmentLi(li, ref)) || ATT_IMG_EXT.test(file)));
    const resolvedId = (ref && ref.id) || id;
    const resolvedFile = file || (ref && ref.file) || '';
    const el = attPvEl();
    el.classList.toggle('pv-noimg', !src);
    const canInspect = !!(prefs.betaViewer && isImg && resolvedId);
    el.classList.toggle('pv-clickable', canInspect);
    const pvImgBox = el.querySelector('.pv-img');
    if (pvImgBox) pvImgBox.title = canInspect ? `Clique para abrir ${resolvedFile} no visualizador 1:1 (Beta)` : '';
    el.dataset.hasMeta = '1';
    const img = el.querySelector('img');
    if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
    el.querySelector('.pv-name').textContent = resolvedFile;
    el.querySelector('.pv-size').textContent = sizeEl ? cleanText(sizeEl.textContent) : '';
    attPv.link = a;
    attPv.imageId = canInspect ? resolvedId : '';
    attPv.imageFile = canInspect ? resolvedFile : '';
    el.hidden = false;
    attPvPlace();
  }
  function attPvPlace() {
    const el = attPv.el;
    const a = attPv.link;
    if (!el || el.hidden || !a || !a.isConnected) return;
    // link dentro do editor (iframe): soma a posicao do iframe na pagina
    const r0 = a.getBoundingClientRect();
    const fe = a.ownerDocument !== document && a.ownerDocument.defaultView && a.ownerDocument.defaultView.frameElement;
    const fr = fe ? fe.getBoundingClientRect() : { left: 0, top: 0 };
    const r = { left: r0.left + fr.left, top: r0.top + fr.top, bottom: r0.bottom + fr.top };
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let top = r.bottom + 8;
    if (top + h > vh - 8 && r.top - 8 - h >= 8) top = r.top - 8 - h;
    const left = Math.max(8, Math.min(r.left, vw - w - 8));
    el.style.top = `${Math.round(Math.max(8, top))}px`;
    el.style.left = `${Math.round(left)}px`;
  }
  function attPvHide() {
    clearTimeout(attPv.timer);
    clearTimeout(attPv.hideTimer);
    attPv.link = null;
    attPv.imageId = '';
    attPv.imageFile = '';
    if (attPv.el) {
      attPv.el.hidden = true;
      attPv.el.classList.remove('pv-clickable');
    }
  }
  function onAttPvOver(ev) {
    try {
      if (ev.target && ev.target.closest && ev.target.closest('#uhub-beta-viewer')) return;
    } catch (e) { diag({ where: 'attpv-viewer', error: String(e && (e.stack || e.message) || e).slice(0, 500) }); }
    if (!attOn()) return;
    const a = attPvTarget(ev.target);
    if (!a) return;
    clearTimeout(attPv.hideTimer);
    if (attPv.link === a && attPv.el && !attPv.el.hidden) return;
    clearTimeout(attPv.timer);
    attPv.timer = setTimeout(() => { if (a.matches(':hover')) attPvShow(a); }, 150);
  }
  function onAttPvOut(ev) {
    const a = attPvTarget(ev.target);
    if (!a) return;
    if (ev.relatedTarget && (a.contains(ev.relatedTarget) || (attPv.el && attPv.el.contains(ev.relatedTarget)))) return;
    clearTimeout(attPv.timer);
    clearTimeout(attPv.hideTimer);
    attPv.hideTimer = setTimeout(() => {
      if (attPv.el && attPv.el.matches(':hover')) return;
      attPvHide();
    }, 150);
  }
  let attPvBound = false;
  // Previa tambem no comentario sendo escrito: o editor visual e um iframe e os eventos de mouse dele nao
  // chegam a pagina, entao os mesmos ouvintes sao ligados no documento do editor (e de novo se ele recarregar).
  function bindEditorPreview() {
    qa('#addcomment iframe').forEach((f) => {
      if (!f.__uhubPvLoad) { f.__uhubPvLoad = true; f.addEventListener('load', bindEditorPreview); }
      let d = null;
      try { d = f.contentDocument; } catch {}
      // marca no <body>: se o editor reescrever o documento (document.open), os ouvintes somem e o body e novo
      if (!d || !d.body || d.body.__uhubPv) return;
      d.body.__uhubPv = true;
      d.addEventListener('mouseover', onAttPvOver, true);
      d.addEventListener('mouseout', onAttPvOut, true);
      ['scroll', 'mousedown', 'keydown'].forEach((t) => d.addEventListener(t, () => { if (attPv.link) attPvHide(); }, true));
    });
  }
  function bindAttachmentPreview() {
    if (attPvBound) return;
    attPvBound = true;
    document.addEventListener('mouseover', onAttPvOver, true);
    document.addEventListener('mouseout', onAttPvOut, true);
    ['scroll', 'keydown', 'blur'].forEach((t) => window.addEventListener(t, () => { if (attPv.link) attPvHide(); }, true));
    window.addEventListener('mousedown', (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('#uhub-att-pv')) return;
      if (attPv.link) attPvHide();
    }, true);
  }
  // ---------- Lembrete de prazo ---------- Guarda o "Ficar pronto" das issues Internal Review que voce abriu e
  // avisa por notificacao na vespera e no dia, a partir do horario escolhido (padrao 08:00). Funciona com
  // qualquer issue do Jira aberta numa aba; antes de avisar, confere no Jira se o prazo mudou ou se ja foi
  // concluida.
  const DUE_TRACK_KEY = 'uhub-due-track';
  let dueTrackLast = '';
  function readDueTrack() {
    try { return JSON.parse(GM_getValue(DUE_TRACK_KEY, '{}')) || {}; } catch (e) { return {}; }
  }
  function writeDueTrack(mutate) {
    const all = readDueTrack();
    mutate(all);
    Object.keys(all).forEach((k) => { const d = dueDayDiff(all[k] && all[k].due); if (d === null || d < -2) delete all[k]; });
    const keys = Object.keys(all);
    if (keys.length > 150) keys.sort((a, b) => (all[a].at || 0) - (all[b].at || 0)).slice(0, keys.length - 150).forEach((k) => delete all[k]);
    GM_setValue(DUE_TRACK_KEY, JSON.stringify(all));
  }
  function dueDayDiff(iso, now = new Date()) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return null;
    const due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((due - today) / 86400000);
  }
  // vespera, dia, e um aviso unico de vencido (no 1o ou 2o dia apos o prazo)
  function dueKind(d) {
    if (d === 1) return 'd1';
    if (d === 0) return 'd0';
    if (d === -1 || d === -2) return 'late';
    return null;
  }
  function dueShort(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}` : '';
  }
  // Chamado a cada passagem do layout (barato: so grava quando muda)
  function trackDueDate() {
    if (!state.applied) return;
    const key = state.issueKey || getIssueKey();
    if (!key) return;
    const t = q1('#due-date time[datetime]');
    const due = t ? (/^(\d{4}-\d{2}-\d{2})/.exec(t.getAttribute('datetime') || '') || [])[1] || '' : '';
    const final = issueIsFinal();
    const summary = summaryText().slice(0, 160);
    const sig = `${key}|${due}|${final}|${summary}`;
    if (sig === dueTrackLast) return;
    dueTrackLast = sig;
    writeDueTrack((all) => {
      if (!due || final) delete all[key];
      else all[key] = { due, summary, at: Date.now() };
    });
  }
  function notifiedHas(id) {
    try { return (JSON.parse(GM_getValue('uhub-notified-ids', '[]')) || []).includes(id); } catch (e) { return false; }
  }
  async function fetchDueInfo(key) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
    try {
      const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(key)}?fields=duedate,status,summary`, {
        credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined,
      });
      if (res.status === 404) {
        let j = null;
        try { j = await res.json(); } catch (e) { j = null; }
        return j && Array.isArray(j.errorMessages) && j.errorMessages.length ? { gone: true } : null;
      }
      if (!res.ok) return null;
      const j = await res.json();
      const f = (j && j.fields) || {};
      const st = f.status || {};
      const cat = st.statusCategory && st.statusCategory.key;
      return {
        due: f.duedate || '',
        final: cat === 'done' || (!!st.name && FINAL_STATUS_RE.test(String(st.name).trim())),
        summary: f.summary || '',
        hasDueField: Object.prototype.hasOwnProperty.call(f, 'duedate'),
      };
    } catch (e) {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  function openIssue(key) {
    if ((state.issueKey || getIssueKey()) === key) { try { window.focus(); } catch {} return; }
    const url = `${jiraBaseUrl()}/browse/${encodeURIComponent(key)}`;
    try {
      if (typeof GM_openInTab === 'function') { GM_openInTab(url, { active: true, insert: true }); return; }
    } catch {}
    window.open(url, '_blank', 'noopener');
  }
  let dueTickBusy = false;
  async function dueReminderTick() {
    if (dueTickBusy || !prefs.notifyEnabled || !prefs.dueReminder) return;
    const now = new Date();
    if (now.getHours() < prefs.dueHour) return;
    const all = readDueTrack();
    const cand = [];
    Object.keys(all).forEach((key) => {
      const e = all[key] || {};
      const d = dueDayDiff(e.due, now);
      const kind = dueKind(d);
      if (!kind) return;
      const id = `due:${key}:${e.due}:${kind}`;
      if (!notifiedHas(id)) cand.push({ key, due: e.due, summary: e.summary || key, kind, id, d });
    });
    if (!cand.length) return;
    if (tabIsActive() && !prefs.notifyWhenFocused) return;
    dueTickBusy = true;
    try {
      const ready = [];
      for (const c of cand) {
        const info = await fetchDueInfo(c.key);
        if (info && (info.gone || info.final || (info.hasDueField && !info.due))) {
          writeDueTrack((a) => { delete a[c.key]; });
          continue;
        }
        if (info && info.due && info.due !== c.due) {
          writeDueTrack((a) => { if (a[c.key]) { a[c.key].due = info.due; a[c.key].at = Date.now(); } });
          const d = dueDayDiff(info.due, now);
          const kind = dueKind(d);
          if (!kind) continue;
          c.due = info.due;
          c.kind = kind;
          c.d = d;
          c.id = `due:${c.key}:${c.due}:${kind}`;
          if (notifiedHas(c.id)) continue;
        }
        if (info && info.summary) c.summary = info.summary;
        if (claimNotification(c.id)) ready.push(c);
      }
      if (!ready.length) return;
      const label = (c) => {
        if (c.kind === 'late') return `vencido ${c.d === -1 ? 'ontem' : `há ${-c.d} dias`} (${dueShort(c.due)})`;
        return c.kind === 'd0' ? `hoje (${dueShort(c.due)})` : `amanhã (${dueShort(c.due)})`;
      };
      if (ready.length === 1) {
        const c = ready[0];
        const title = c.summary.length > 120 ? `${c.summary.slice(0, 119)}…` : c.summary;
        sendSystemNotification(title, `⏰ Prazo ${label(c)} · ${c.key}`, () => openIssue(c.key));
      } else {
        const late = ready.filter((c) => c.kind === 'late').map((c) => c.key);
        const today = ready.filter((c) => c.kind === 'd0').map((c) => c.key);
        const tomorrow = ready.filter((c) => c.kind === 'd1').map((c) => c.key);
        const lines = [];
        if (late.length) lines.push(`Vencidos: ${late.join(', ')}`);
        if (today.length) lines.push(`Hoje: ${today.join(', ')}`);
        if (tomorrow.length) lines.push(`Amanhã: ${tomorrow.join(', ')}`);
        const first = ready.find((c) => c.kind === 'late') || ready.find((c) => c.kind === 'd0') || ready[0];
        sendSystemNotification(`⏰ ${ready.length} prazos`, lines.join(' · '), () => openIssue(first.key));
      }
      try { diag({ kind: 'due-reminder', sent: ready.map((c) => c.id) }); } catch {}
    } finally {
      dueTickBusy = false;
    }
  }
  // ---------- Modo revisao ---------- Esconde descricao, detalhes e metadados: ficam so os anexos (maiores) e
  // os comentarios. Nada e removido do DOM (so CSS), entao sair volta tudo exatamente como estava. Esc tambem
  // sai.
  function reviewOn() { return document.documentElement.classList.contains('uhub-review'); }
  // Tamanho no modo revisao: automatico (~3 por linha) ate voce mexer no controle de tamanho durante a revisao;
  // dai vale o seu (guardado so para o modo revisao). O botao de voltar retorna ao automatico.
  const REVIEW_SIZE_KEY = 'reviewAttSize';
  function reviewUserSize() {
    const v = Number(GM_getValue(REVIEW_SIZE_KEY, 0)) || 0;
    return v ? Math.max(LIMITS.attSize.min, Math.min(LIMITS.attSize.max, Math.round(v))) : 0;
  }
  function setReviewAttSize(v) {
    GM_setValue(REVIEW_SIZE_KEY, v ? Math.round(v) : 0);
    applyReviewSize();
    syncAttachmentControls();
  }
  function reviewTileSize() {
    const user = reviewUserSize();
    if (user) return user;
    const list = gid('attachment_thumbnails') || gid('attachmentmodule');
    const w = list ? list.getBoundingClientRect().width : 0;
    if (!w) return Math.max(settings.attSize, 360);
    const per = Math.floor((w - 14 * 2) / 3);
    return Math.round(Math.max(settings.attSize, Math.min(600, Math.max(320, per))));
  }
  function effectiveAttSize() {
    return parseFloat(document.documentElement.style.getPropertyValue('--uhub-att-w')) || settings.attSize;
  }
  function applyReviewSize() {
    if (!reviewOn()) return;
    const want = `${reviewTileSize()}px`;
    const root = document.documentElement;
    if (root.style.getPropertyValue('--uhub-att-w-review') !== want) {
      root.style.setProperty('--uhub-att-w-review', want);
      refreshAllTileResolutions();
    }
  }
  function setReviewMode(on) {
    const root = document.documentElement;
    if (on === reviewOn()) { syncReviewButton(); return; }
    if (on && !state.applied) return;
    const sa = gid('uhub-sidebar-scroll');
    const keepScroll = sa ? sa.scrollTop : 0;
    root.classList.toggle('uhub-review', on);
    if (on) {
      applyReviewSize();
      const am = gid('attachmentmodule');
      if (am) {
        if (am.classList.contains('collapsed')) { const t = am.querySelector('.toggle-title'); if (t) t.click(); }
        window.scrollTo({ top: 0 });
      }
    } else {
      root.style.removeProperty('--uhub-att-w-review');
      refreshAllTileResolutions();
    }
    if (sa) sa.scrollTop = keepScroll;
    measureEdgeFix();
    syncReviewButton();
    syncReviewMeta();
    syncAttachmentControls();
  }
  function syncReviewButton() {
    const b = gid('uhub-review-btn');
    if (!b) return;
    const on = reviewOn();
    b.classList.toggle('uhub-active', on);
    b.setAttribute('aria-pressed', String(on));
    const t = on ? 'Sair do modo revisão (Esc)' : 'Modo revisão: só os anexos (grandes) e os comentários';
    if (b.title !== t) b.title = t;
    const li = b.closest('li');
    if (li) li.hidden = !state.applied;
    syncReviewChip();
  }
  // Etiqueta "Modo revisão · Sair" ao lado do titulo Anexos (deixa claro por que o resto sumiu e como voltar)
  function syncReviewChip() {
    const h3 = q1('#attachmentmodule_heading h3');
    let chip = gid('uhub-review-chip');
    if (!reviewOn() || !h3) { if (chip) chip.remove(); return; }
    if (!chip) {
      chip = mk('button');
      chip.type = 'button';
      chip.id = 'uhub-review-chip';
      chip.title = 'Sair do modo revisão (Esc)';
      chip.innerHTML = '<span>Modo revisão</span><svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      chip.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); setReviewMode(false); });
      ['pointerdown', 'mousedown'].forEach((t) => chip.addEventListener(t, (ev) => ev.stopPropagation()));
    }
    if (chip.parentElement !== h3.parentElement || chip.previousElementSibling !== h3) h3.after(chip);
    placeReviewChip();
  }
  // O rotulo "Anexos" do Jira e posicionado de forma absoluta (o <h3> quase nao ocupa largura); a etiqueta mede
  // onde o rotulo termina e fica 12px depois dele, centralizada na mesma linha.
  function placeReviewChip() {
    const chip = gid('uhub-review-chip');
    const h3 = q1('#attachmentmodule_heading h3');
    if (!chip || !h3 || !reviewOn()) return;
    const lbl = h3.querySelector('.aui-toggle-header-button-label') || h3.querySelector('button') || h3;
    const lr = lbl.getBoundingClientRect();
    const cr = chip.getBoundingClientRect();
    if (!lr.width || !cr.width) return;
    const curMl = parseFloat(chip.style.marginLeft) || parseFloat(getComputedStyle(chip).marginLeft) || 0;
    const ml = Math.max(10, Math.round(lr.right - (cr.left - curMl) + 12));
    if (chip.style.marginLeft !== `${ml}px`) chip.style.marginLeft = `${ml}px`;
    const curDy = parseFloat(chip.style.getPropertyValue('--uhub-chip-dy')) || 0;
    const dy = Math.round(((lr.top + lr.height / 2) - (cr.top + cr.height / 2) + curDy) * 2) / 2;
    if (Math.abs(dy - curDy) >= 0.5) chip.style.setProperty('--uhub-chip-dy', `${Math.max(-8, Math.min(8, dy))}px`);
  }
  try { document.fonts.ready.then(() => { try { placeReviewChip(); } catch {} }); } catch {}
  // ---------- Modo revisao: faixa com Prioridade, Responsavel, Solicitante e Ficar pronto (copias so de
  // leitura, atualizadas quando o Jira muda) ----------
  const REVIEW_META_FIELDS = [
    { sel: '#assignee-val', label: 'Responsável', key: 'assignee' },
    { sel: '#reporter-val', label: 'Solicitante', key: 'reporter' },
    { sel: '#priority-val', label: 'Prioridade', key: 'priority' },
    { sel: '#due-date', label: 'Ficar pronto', key: 'due' },
  ];
  // onde o campo morava (li de Detalhes, ou dt+dd de Pessoas/Datas): fica oculto enquanto o campo esta na barra
  function rmSrcBoxes(el) {
    const li = el.closest('li.item');
    if (li) return [li];
    const dd = el.closest('dd');
    if (!dd) return [];
    const dt = dd.previousElementSibling;
    return dt && dt.tagName === 'DT' ? [dt, dd] : [dd];
  }
  function reviewFieldLabel(src, fallback) {
    let t = '';
    const wrap = src.closest('.wrap');
    const strong = wrap && wrap.querySelector('strong.name');
    if (strong) t = strong.textContent;
    else {
      const dd = src.closest('dd');
      const dt = dd && dd.previousElementSibling && dd.previousElementSibling.tagName === 'DT' ? dd.previousElementSibling : null;
      if (dt) t = dt.textContent;
    }
    t = cleanText(t).replace(/:\s*$/, '');
    return t || fallback;
  }
  const ICON_META_INFO = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="5.1" r="0.95" fill="currentColor"/><path d="M8 7.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  function metaPopoverOpen() {
    return document.documentElement.classList.contains('uhub-meta-open');
  }
  function positionMetaPopover() {
    const btn = gid('uhub-meta-info-btn');
    const root = document.documentElement;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const top = Math.max(8, Math.round(r.bottom + 6));
    const right = Math.max(8, Math.round(window.innerWidth - r.right));
    root.style.setProperty('--uhub-mp-top', `${top}px`);
    root.style.setProperty('--uhub-mp-right', `${right}px`);
  }
  function expandMetaPopoverModules() {
    const sb = gid('viewissuesidebar');
    if (!sb) return;
    sb.querySelectorAll('.module.toggle-wrap.collapsed').forEach((mod) => {
      if (getComputedStyle(mod).display === 'none') return;
      mod.classList.remove('collapsed');
      const btn = mod.querySelector(':scope > .mod-header .toggle-title');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    });
    if (!sb.dataset.uhubNoToggle) {
      sb.dataset.uhubNoToggle = '1';
      sb.addEventListener('click', (ev) => {
        if (!metaPopoverOpen()) return;
        const trig = ev.target && ev.target.closest ? ev.target.closest('.mod-header .toggle-title, .mod-header h3') : null;
        if (trig) {
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
        }
      }, true);
    }
  }
  function toggleMetaPopover(force) {
    const sb = gid('viewissuesidebar');
    const shouldOpen = !!(sb && state.applied && (force !== undefined ? force : !metaPopoverOpen()));
    if (shouldOpen) {
      toggleSettingsPanel(false);
      toggleNotifyPopover(false);
      expandMetaPopoverModules();
      positionMetaPopover();
    }
    document.documentElement.classList.toggle('uhub-meta-open', shouldOpen);
    const btn = gid('uhub-meta-info-btn');
    if (btn) {
      btn.classList.toggle('uhub-active', shouldOpen);
      btn.setAttribute('aria-expanded', String(shouldOpen));
    }
  }
  // Os campos REAIS do Jira vao para a faixa (edicao e menus continuam
  // funcionando) e voltam ao lugar ao sair. Se o Jira redesenhar o campo,
  // a versao nova substitui a antiga (nunca ha dois com o mesmo id).
  const rmHome = {};
  function rmRestore(strip) {
    REVIEW_META_FIELDS.forEach((f) => {
      const el = strip.querySelector(f.sel);
      const ph = rmHome[f.key];
      delete rmHome[f.key];
      if (ph && ph.parentElement) rmSrcBoxes(ph.parentElement).forEach((b) => b.classList.remove('uhub-moved'));
      if (el) {
        if (ph && ph.isConnected && ![...qa(f.sel)].some((e) => e !== el)) ph.replaceWith(el);
        else el.remove();
      }
      if (ph) ph.remove();
    });
  }
  // O Jira recria campos (ex.: ao salvar a Prioridade ele redesenha o modulo Detalhes). Para a copia nova nunca
  // aparecer nem por 1 quadro, vigiamos a insercao dela e resolvemos no mesmo ciclo (antes da pintura).
  const RM_SELS = REVIEW_META_FIELDS.map((f) => f.sel).join(',');
  let rmObserver = null;
  let rmSizer = null;
  function rmMeasure(strip, on) {
    if (!on) { if (rmSizer) rmSizer.disconnect(); rmSizer = null; return; }
    if (!rmSizer && window.ResizeObserver) {
      rmSizer = new ResizeObserver((es) => es.forEach((e) => {
        const v = e.target;
        if (v.querySelector(':scope > .active')) return; // aberto: mantem a medida do valor fechado
        const r = v.getBoundingClientRect();
        if (r.width) { v.style.setProperty('--rm-w', `${r.width.toFixed(2)}px`); v.style.setProperty('--rm-h', `${r.height.toFixed(2)}px`); }
      }));
    }
    if (rmSizer) strip.querySelectorAll('.rm-val').forEach((v) => rmSizer.observe(v));
  }
  function rmWatch(on) {
    if (!on) { if (rmObserver) rmObserver.disconnect(); rmObserver = null; return; }
    if (rmObserver) return;
    rmObserver = new MutationObserver((recs) => {
      const hit = recs.some((r) => r.type === 'attributes'
        ? r.target.matches(RM_SELS) && !!q1('.uhub-dup') // edicao terminou: a copia nova que esperava assume
        : [...r.addedNodes].some((n) => n.nodeType === 1 && (n.matches(RM_SELS) || n.querySelector(RM_SELS))));
      if (!hit) return;
      syncReviewMeta();
      rmObserver.takeRecords();
    });
    rmObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  const swapPermCache = new Map();
  const swapPermInFlight = new Set();
  function getSwapPermState(key) {
    return swapPermCache.get(key) || null;
  }
  function setSwapPermState(key, patch) {
    const prev = swapPermCache.get(key) || { assignee: true, reporter: true };
    swapPermCache.set(key, { ...prev, ...patch });
  }
  async function checkSwapPermissions(key) {
    if (!key || swapPermCache.has(key) || swapPermInFlight.has(key)) return;
    swapPermInFlight.add(key);
    try {
      const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(key)}/editmeta?_=${Date.now()}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const fields = data && data.fields;
      if (fields && typeof fields === 'object') {
        setSwapPermState(key, {
          assignee: Object.prototype.hasOwnProperty.call(fields, 'assignee'),
          reporter: Object.prototype.hasOwnProperty.call(fields, 'reporter'),
        });
        if (state.applied) syncReviewMeta();
      }
    } catch {} finally {
      swapPermInFlight.delete(key);
    }
  }
  function syncReviewMeta() {
    let strip = gid('uhub-review-meta');
    const group = q1('.issue-body-content .aui-group.issue-body, .aui-group.issue-body');
    if (!state.applied || !group) {
      toggleMetaPopover(false);
      rmWatch(false);
      rmMeasure(null, false);
      if (strip) { rmRestore(strip); strip.remove(); renderDueChip(); }
      return;
    }
    rmWatch(true);
    if (!strip) {
      strip = mk('div');
      strip.id = 'uhub-review-meta';
      strip.setAttribute('role', 'group');
      strip.setAttribute('aria-label', 'Resumo da issue');
      strip.innerHTML = REVIEW_META_FIELDS.map((f) => `<div class="rm-item rm-${f.key}"><span class="rm-label"></span><span class="rm-val"></span></div>`).join('');
    }
    let infoBtn = strip.querySelector('#uhub-meta-info-btn');
    if (!infoBtn) {
      infoBtn = mk('button');
      infoBtn.type = 'button';
      infoBtn.id = 'uhub-meta-info-btn';
      infoBtn.title = 'Mais detalhes da issue (Colaboradores, Desenvolvimento, Ágil, Seguidores e datas)';
      infoBtn.setAttribute('aria-label', 'Mais detalhes da issue');
      infoBtn.setAttribute('aria-haspopup', 'dialog');
      infoBtn.setAttribute('aria-expanded', 'false');
      infoBtn.setAttribute('aria-controls', 'viewissuesidebar');
      infoBtn.innerHTML = ICON_META_INFO;
      infoBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        toggleMetaPopover();
      });
      strip.appendChild(infoBtn);
    } else if (strip.lastElementChild !== infoBtn) {
      strip.appendChild(infoBtn);
    }
    if (strip.parentElement !== group || group.firstElementChild !== strip) group.prepend(strip); // logo abaixo da toolbar
    rmMeasure(strip, true);
    let any = false;
    REVIEW_META_FIELDS.forEach((f) => {
      const item = strip.querySelector(`.rm-${f.key}`);
      const val = item.lastElementChild;
      const all = [...qa(f.sel)];
      const cur = all.find((e) => val.contains(e));
      const others = all.filter((e) => !strip.contains(e));
      // Campo da faixa em EDICAO de verdade (aberto e ainda nao enviado): e o unico que vale; a copia nova que o
      // Jira recriou fica oculta ate acabar. Se ja foi enviado ("saving") ou nao ha edicao, a versao nova do Jira
      // substitui a da faixa NA HORA (antes ficava "salvando" para sempre e o campo antigo aparecia duplicado).
      const editing = cur && cur.classList.contains('active') && !cur.classList.contains('saving');
      const fresh = editing ? null : others[0];
      others.forEach((o) => {
        if (o === fresh) return;
        o.classList.add('uhub-dup');
        rmSrcBoxes(o).forEach((x) => x.classList.add('uhub-moved'));
      });
      if (fresh) {
        fresh.classList.remove('uhub-dup');
        if (cur) cur.remove();
        if (rmHome[f.key]) rmHome[f.key].remove();
        const ph = document.createComment(`uhub-rm:${f.key}`);
        fresh.before(ph);
        rmHome[f.key] = ph;
        rmSrcBoxes(fresh).forEach((x) => x.classList.add('uhub-moved'));
        item.firstElementChild.textContent = reviewFieldLabel(fresh, f.label);
        val.prepend(fresh);
      }
      const el = val.querySelector(f.sel);
      item.hidden = !el;
      if (el) any = true;
    });

    // Botao de troca exclusiva entre Responsavel e Solicitante (setas esquerda/direita)
    const assigneeItem = strip.querySelector('.rm-assignee');
    const reporterItem = strip.querySelector('.rm-reporter');
    const hasBothUsers = false; // botão de troca removido da interface
    let swapBtn = strip.querySelector('.uhub-rm-pass');
    if (hasBothUsers) {
      const key = state.issueKey || getIssueKey();
      const aValEl = strip.querySelector('#assignee-val');
      const rValEl = strip.querySelector('#reporter-val');
      const domInited = !!(aValEl && aValEl.classList.contains('editable-field')) || !!(rValEl && rValEl.classList.contains('editable-field'));
      const domNoAssignee = domInited && aValEl && !aValEl.classList.contains('editable-field') && !aValEl.classList.contains('active');
      const domNoReporter = domInited && rValEl && !rValEl.classList.contains('editable-field') && !rValEl.classList.contains('active');
      const perm = key ? getSwapPermState(key) : null;
      if (key && !perm) checkSwapPermissions(key);

      const restrictedReason = (() => {
        if ((perm && perm.reporter === false) || domNoReporter) {
          if ((perm && perm.assignee === false) || domNoAssignee) {
            return 'Troca indisponível: sem permissão para alterar Responsável e Solicitante neste projeto';
          }
          return 'Troca indisponível: seu usuário não tem permissão para alterar o Solicitante neste projeto';
        }
        if ((perm && perm.assignee === false) || domNoAssignee) {
          return 'Troca indisponível: seu usuário não tem permissão para alterar o Responsável neste projeto';
        }
        return '';
      })();

      if (!swapBtn) {
        swapBtn = mk('button');
        swapBtn.type = 'button';
        swapBtn.className = 'uhub-rm-pass';
        swapBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 5H3M3 5l3-3M3 5l3 3"/><path d="M3 11h10M13 11l-3-3M13 11l-3 3"/></svg>';
        swapBtn.style.cssText = 'appearance:none; border:1px solid var(--uhub-border); background:#ffffff; width:24px; height:24px; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; color:#42526e; cursor:pointer; flex:0 0 auto; transition:background 0.12s ease, color 0.12s ease, border-color 0.12s ease';
        swapBtn.addEventListener('mouseenter', () => {
          if (swapBtn.disabled) return;
          swapBtn.style.background = '#deebff';
          swapBtn.style.borderColor = '#b3d4ff';
          swapBtn.style.color = '#0052cc';
        });
        swapBtn.addEventListener('mouseleave', () => {
          swapBtn.style.background = '#ffffff';
          swapBtn.style.borderColor = 'var(--uhub-border)';
          swapBtn.style.color = '#42526e';
        });
        swapBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (swapBtn.disabled || swapBtn.dataset.busy === '1') return;
          const aHover = strip.querySelector('#assignee-val .user-hover[rel]');
          const rHover = strip.querySelector('#reporter-val .user-hover[rel]');
          const aUser = aHover ? (aHover.getAttribute('rel') || '').trim() : '';
          const rUser = rHover ? (rHover.getAttribute('rel') || '').trim() : '';
          const aName = aHover ? cleanText(aHover.textContent) : aUser;
          const rName = rHover ? cleanText(rHover.textContent) : rUser;
          if (!aUser || !rUser) {
            showToast('Não é possível trocar: Responsável ou Solicitante não definido', 2800);
            return;
          }
          if (aUser.toLowerCase() === rUser.toLowerCase()) {
            showToast('Responsável e Solicitante já são a mesma pessoa', 2400);
            return;
          }
          const curKey = state.issueKey || getIssueKey();
          if (!curKey) return;
          swapBtn.dataset.busy = '1';
          swapBtn.disabled = true;
          swapBtn.style.opacity = '0.5';
          try {
            const res = await fetch(`${jiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(curKey)}`, {
              method: 'PUT',
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'application/json',
                'X-Atlassian-Token': 'no-check',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                fields: {
                  assignee: { name: rUser },
                  reporter: { name: aUser },
                },
              }),
            });
            if (!res.ok && res.status !== 204) {
              let errDetail = '';
              try {
                const j = await res.json();
                if (j && j.errors) {
                  if (j.errors.reporter) setSwapPermState(curKey, { reporter: false });
                  if (j.errors.assignee) setSwapPermState(curKey, { assignee: false });
                }
                errDetail = (j && j.errors && Object.values(j.errors).join('; ')) || (j && j.errorMessages && j.errorMessages.join('; ')) || '';
              } catch {}
              showToast(errDetail ? `Não foi possível trocar: ${errDetail}` : `Não foi possível trocar (HTTP ${res.status})`, 3500);
              return;
            }
            await refreshComments();
            showToast(`⇄ Trocado: ${rName} (Resp.) ↔ ${aName} (Solic.)`, 2600);
          } catch (e) {
            showToast('Falha ao trocar Responsável e Solicitante', 3000);
          } finally {
            delete swapBtn.dataset.busy;
            syncReviewMeta();
          }
        });
      }
      if (swapBtn.previousElementSibling !== assigneeItem) {
        assigneeItem.after(swapBtn);
      }
      const isBusy = swapBtn.dataset.busy === '1';
      const isBlocked = !!restrictedReason;
      swapBtn.disabled = isBusy || isBlocked;
      swapBtn.style.opacity = isBlocked ? '0.4' : (isBusy ? '0.5' : '1');
      swapBtn.style.cursor = isBlocked ? 'not-allowed' : (isBusy ? 'wait' : 'pointer');
      if (isBlocked) {
        swapBtn.style.background = '#ffffff';
        swapBtn.style.borderColor = 'var(--uhub-border)';
        swapBtn.style.color = '#42526e';
      }
      const aH = strip.querySelector('#assignee-val .user-hover[rel]');
      const rH = strip.querySelector('#reporter-val .user-hover[rel]');
      const tip = restrictedReason || ((aH && rH)
        ? `Trocar Responsável (${cleanText(aH.textContent)}) ↔ Solicitante (${cleanText(rH.textContent)})`
        : 'Trocar Responsável ↔ Solicitante');
      if (swapBtn.title !== tip) swapBtn.title = tip;
      swapBtn.setAttribute('aria-label', tip);
    } else if (swapBtn) {
      swapBtn.remove();
    }
    const sb = gid('viewissuesidebar');
    if (!sb && metaPopoverOpen()) toggleMetaPopover(false);
    if (infoBtn) {
      infoBtn.hidden = !sb;
      infoBtn.classList.toggle('uhub-active', metaPopoverOpen());
      infoBtn.setAttribute('aria-expanded', String(metaPopoverOpen()));
    }
    if (metaPopoverOpen()) {
      expandMetaPopoverModules();
      positionMetaPopover();
    }
    strip.hidden = !any && !sb;
  }
  function onReviewBtnClick(ev) {
    ev.preventDefault();
    setReviewMode(!reviewOn());
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !reviewOn() || ev.defaultPrevented) return;
    if (gid('uhub-confirm-backdrop')) return;
    if (attSel.size) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT|IFRAME)$/.test(a.tagName))) return;
    if (metaPopoverOpen() || q1('.aui-dialog2[aria-hidden="false"], .jira-dialog.jira-dialog-open, #uhub-settings-panel.uhub-open, #uhub-notify-pop.uhub-open')) return;
    setReviewMode(false);
  });
  window.addEventListener('resize', () => { if (reviewOn()) { applyReviewSize(); placeReviewChip(); } if (bv.open) { const el = gid('uhub-beta-viewer'); if (el) bvPositionNavButtons(el); } });
  // ---------- Adiar ("Lembrar em…") ----------
  const SNOOZE_KEY = 'uhub-snooze';
  function readSnooze() {
    try { return JSON.parse(GM_getValue(SNOOZE_KEY, '{}')) || {}; } catch (e) { return {}; }
  }
  function writeSnooze(mutate) {
    const all = readSnooze();
    mutate(all);
    const now = Date.now();
    Object.keys(all).forEach((k) => { if (!all[k] || !all[k].at || all[k].at < now - 7 * 86400000) delete all[k]; });
    GM_setValue(SNOOZE_KEY, JSON.stringify(all));
  }
  function snoozeTarget(kind) {
    const d = new Date();
    if (kind === 'tomorrow') {
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, prefs.dueHour || 8, 0, 0, 0);
      return t.getTime();
    }
    return Date.now() + ({ m30: 30, h1: 60, h3: 180 }[kind] || 60) * 60000;
  }
  function fmtClock(ts) {
    const d = new Date(ts);
    const today = new Date();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (d.toDateString() === today.toDateString()) return hm;
    const tm = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (d.toDateString() === tm.toDateString()) return `amanhã ${hm}`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hm}`;
  }
  function setSnooze(kind) {
    const key = state.issueKey || getIssueKey();
    if (!key) return;
    const at = snoozeTarget(kind);
    writeSnooze((all) => { all[key] = { at, summary: summaryText().slice(0, 160) }; });
    showToast(`Vou lembrar desta issue ${fmtClock(at).startsWith('amanhã') ? '' : 'às '}${fmtClock(at)}`, 2600);
  }
  function clearSnooze() {
    const key = state.issueKey || getIssueKey();
    writeSnooze((all) => { delete all[key]; });
  }
  function snoozeTick() {
    const all = readSnooze();
    const now = Date.now();
    const due = Object.keys(all).filter((k) => all[k] && all[k].at <= now);
    if (!due.length) return;
    const fire = due.filter((k) => claimNotification(`snooze:${k}:${all[k].at}`));
    writeSnooze((a) => { due.forEach((k) => { if (a[k] && a[k].at <= now) delete a[k]; }); });
    if (!fire.length || !prefs.notifyEnabled) return;
    if (fire.length === 1) {
      const k = fire[0];
      const sm = all[k].summary || k;
      sendSystemNotification(sm.length > 120 ? `${sm.slice(0, 119)}…` : sm, `🔔 Lembrete que você pediu · ${k}`, () => openIssue(k));
    } else {
      sendSystemNotification(`🔔 ${fire.length} lembretes`, fire.join(', '), () => openIssue(fire[0]));
    }
  }
  function startDueReminders() {
    if (startDueReminders.started) return;
    startDueReminders.started = true;
    const safe = () => {
      try { snoozeTick(); } catch {}
      dueReminderTick().catch(() => { dueTickBusy = false; });
    };
    setTimeout(safe, 6000);
    setInterval(safe, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(safe, 1500); });
  }
  // ---------- Prazo ("Ficar pronto") no campo Datas ----------
  function renderDueChip() {
    try { trackDueDate(); } catch {}
    const span = gid('due-date');
    const existing = q1('.uhub-due');
    if (existing && span && span.classList.contains('active')) return; // data em edicao (sem <time>): o selo continua onde esta
    const time = span && span.querySelector('time[datetime]');
    const clear = () => {
      if (existing) existing.remove();
      qa('dd.uhub-due-dd').forEach((d) => d.classList.remove('uhub-due-dd'));
    };
    if (!state.applied || !span || !time || issueIsFinal()) { clear(); return; }
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(time.getAttribute('datetime') || '');
    if (!m) { clear(); return; }
    const dd = span.parentElement;
    if (dd && dd.tagName === 'DD' && !dd.classList.contains('uhub-due-dd')) dd.classList.add('uhub-due-dd');
    const due = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((due - today) / 86400000);
    let cls;
    let txt;
    if (diff < 0) { cls = 'late'; txt = `Atrasado há ${-diff} ${-diff === 1 ? 'dia' : 'dias'}`; }
    else if (diff === 0) { cls = 'soon'; txt = 'Vence hoje'; }
    else if (diff === 1) { cls = 'soon'; txt = 'Vence amanhã'; }
    else { cls = 'ok'; txt = `Vence em ${diff} dias`; }
    let chip = existing;
    if (!chip || chip.previousElementSibling !== span) {
      if (chip) chip.remove();
      chip = mk('span');
      span.after(chip);
    }
    const wantCls = `uhub-due uhub-due-${cls}`;
    if (chip.className !== wantCls) chip.className = wantCls;
    if (chip.textContent !== txt) chip.textContent = txt;
    syncReviewMeta();
  }
  function refreshAllTileResolutions() {
    qa('#attachment_thumbnails li.attachment-content[data-uhub-att]').forEach(applyTileResolution);
  }
  // Tamanho dos anexos por issue: o que você escolher vale só para esta issue; sem escolha, calcula para preencher a largura
  // Anexos por linha (N): salvo por issue, 0 = automatico. A largura de cada anexo sai de N e da largura da lista;
  // a altura da miniatura (largura x 0,725) fica sempre entre 128 e 512px. Vale tambem no modo revisao.
  const PERROW = { gap: 14, ratio: 0.725, hMin: 128, hMax: 512, nMax: 12 };
  PERROW.sMin = Math.ceil(PERROW.hMin / PERROW.ratio);
  PERROW.sMax = Math.floor(PERROW.hMax / PERROW.ratio);
  function perRowLog(e) {
    try {
      const t = Date.now();
      if (perRowLog.at && t - perRowLog.at < 10000) return;
      perRowLog.at = t;
      diag({ kind: 'att-perrow', msg: String(e && e.message || e) });
    } catch {}
  }
  function issueSizeKey() { return `attPerRow:${getIssueKey() || state.issueKey || ''}`; }
  function issueUserSize() {
    try {
      const k = issueSizeKey();
      if (k === 'attPerRow:') return 0;
      const v = Math.round(Number(GM_getValue(k, 0)) || 0);
      return v >= 1 ? Math.min(PERROW.nMax, v) : 0;
    } catch (e) { perRowLog(e); return 0; }
  }
  function perRowAuto(W, count, lo, hi) {
    const P = PERROW;
    const target = reviewOn() ? 440 : 280;
    let best = lo;
    let bestScore = Infinity;
    for (let k = lo; k <= hi; k++) {
      const s = Math.floor((W - P.gap * (k - 1)) / k);
      const empty = Math.ceil(count / k) * k - count;
      const score = (empty / k) * 50 + (Math.abs(s - target) / target) * 50;
      if (score < bestScore - 0.01) { bestScore = score; best = k; }
    }
    return best;
  }
  function perRowInfo() {
    const P = PERROW;
    const fallback = { ok: false, n: 0, min: 2, max: 2, S: settings.attSize, count: 0, W: 0 };
    try {
      const list = gid('attachment_thumbnails');
      if (!list) return fallback;
      const W = list.getBoundingClientRect().width - 1;
      const count = Array.from(qa('#attachment_thumbnails li.attachment-content')).filter((li) => li.getClientRects().length).length;
      if (W < 200 || !count) return fallback;
      const hi = Math.max(1, Math.min(P.nMax, Math.floor((W + P.gap) / (P.sMin + P.gap)), count));
      const lo = Math.min(Math.max(2, Math.ceil((W + P.gap) / (P.sMax + P.gap))), hi);
      let n;
      const user = issueUserSize();
      if (user) n = Math.max(lo, Math.min(hi, user));
      else {
        n = perRowAuto(W, count, lo, hi);
        // trava de seguranca contra vai-e-volta (ex.: barra de rolagem aparecendo/sumindo)
        const f = perRowInfo;
        const now = Date.now();
        f.hist = (f.hist || []).filter((t) => now - t < 2000);
        if (f.last !== undefined && n !== f.last) f.hist.push(now);
        if (f.hist.length > 6 && f.last !== undefined) n = Math.max(lo, Math.min(hi, f.last));
        f.last = n;
      }
      let S = Math.max(P.sMin, Math.min(P.sMax, Math.floor((W - P.gap * (n - 1)) / n)));
      // anti-vai-e-volta: se so sobrou um espaco pequeno (ex.: barra de rolagem sumiu), mantem o tamanho
      // anterior, que ainda cabe. Encolher quando falta espaco continua imediato.
      const st = perRowInfo;
      if (st.keepS && st.keepN === n && st.keepCount === count && S > st.keepS && (S - st.keepS) * n <= 18) S = st.keepS;
      st.keepS = S;
      st.keepN = n;
      st.keepCount = count;
      return { ok: true, n, min: lo, max: hi, S, count, W };
    } catch (e) { perRowLog(e); return fallback; }
  }
  // Largura real de cada anexo, igual às regras do CSS (inclui "largura proporcional")
  function autoFitAttSize() {
    const base = settings.attSize;
    const list = gid('attachment_thumbnails');
    const W = list ? list.getBoundingClientRect().width - 1 : 0;
    const tiles = Array.from(qa('#attachment_thumbnails li.attachment-content')).filter((li) => li.getClientRects().length);
    if (W < 200 || !tiles.length) return base;
    const prop = document.documentElement.classList.contains('uhub-att-prop');
    const info = tiles.map((li) => ({
      isImg: li.getAttribute('data-attachment-type') === 'image',
      hasAsp: li.hasAttribute('data-uhub-aspect'),
      asp: parseFloat(li.style.getPropertyValue('--uhub-aspect')) || 1,
    }));
    const widthOf = (t, S) => {
      let w = S;
      if (prop) {
        if (!t.isImg) w = S * 0.725 + 2;
        else if (t.hasAsp) w = Math.max(Math.max(140, S * 0.4), Math.min(S * 0.725 * t.asp + 2, S));
      }
      return Math.min(w, W);
    };
    const gap = 14;
    const lo = Math.max(LIMITS.attSize.min, base);
    const hi = Math.max(lo, Math.min(LIMITS.attSize.max, 560));
    let best = lo;
    let bestScore = Infinity;
    for (let S = lo; S <= hi; S += 2) {
      const rows = [];
      let x = 0;
      for (const t of info) {
        const w = widthOf(t, S);
        if (x > 0 && x + gap + w > W) { rows.push(x); x = w; } else x = x ? x + gap + w : w;
      }
      rows.push(x);
      let left = 0;
      for (let i = 0; i < rows.length - 1; i++) left += W - rows[i];
      if (rows.length === 1) left = W - rows[0];
      const score = left + (S - lo) * 0.1;
      if (score < bestScore - 0.5) { bestScore = score; best = S; }
    }
    // trava de seguranca contra vai-e-volta (ex.: barra de rolagem aparecendo/sumindo)
    const f = autoFitAttSize;
    const now = Date.now();
    f.hist = (f.hist || []).filter((t) => now - t < 2000);
    if (f.last !== undefined && best !== f.last) f.hist.push(now);
    if (f.hist.length > 6 && f.last !== undefined) return f.last;
    f.last = best;
    return best;
  }
  // Recalcula quando os anexos mudam (imagem carregada, anexo novo) ou a largura da lista muda
  function bindAttFitWatchers() {
    const list = gid('attachment_thumbnails');
    if (!list || (bindAttFitWatchers.el === list && bindAttFitWatchers.mo)) return;
    if (bindAttFitWatchers.ro) bindAttFitWatchers.ro.disconnect();
    if (bindAttFitWatchers.mo) bindAttFitWatchers.mo.disconnect();
    bindAttFitWatchers.el = list;
    const run = () => {
      cancelAnimationFrame(applyAttWidth.raf);
      applyAttWidth.raf = requestAnimationFrame(applyAttWidth);
    };
    if (typeof ResizeObserver !== 'undefined') {
      let lastW = 0;
      bindAttFitWatchers.ro = new ResizeObserver(() => {
        const w = Math.round(list.getBoundingClientRect().width);
        if (w !== lastW) { lastW = w; run(); }
      });
      bindAttFitWatchers.ro.observe(list);
    }
    bindAttFitWatchers.mo = new MutationObserver(run);
    bindAttFitWatchers.mo.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-uhub-aspect', 'style', 'class', 'hidden'] });
  }
  function attWidthWanted() {
    try { return perRowInfo().S; } catch (e) { perRowLog(e); return settings.attSize; }
  }
  function applyAttWidth() {
    if (!attOn()) return;
    const root = document.documentElement;
    bindAttFitWatchers();
    const wantNum = attWidthWanted();
    const cur = parseFloat(root.style.getPropertyValue('--uhub-att-w')) || 0;
    if (cur && !reviewOn() && !issueUserSize() && Math.abs(cur - wantNum) < 1) return;
    if (cur === wantNum) return;
    root.style.setProperty('--uhub-att-w', `${wantNum}px`);
    refreshAllTileResolutions();
  }
  function setIssueAttSize(v) {
    try {
      const k = issueSizeKey();
      if (k !== 'attPerRow:') GM_setValue(k, v ? Math.round(v) : 0);
    } catch (e) { perRowLog(e); }
    applyAttWidth();
    syncAttachmentControls();
  }
  window.addEventListener('resize', () => {
    cancelAnimationFrame(applyAttWidth.raf);
    applyAttWidth.raf = requestAnimationFrame(applyAttWidth);
  });
  function setAttSize(value) {
    settings.attSize = saveSetting('attSize', value);
    if (state.applied) applyColumnWidths();
    else { document.documentElement.style.setProperty('--uhub-att-w', `${settings.attSize}px`); syncAttachmentControls(); }
    refreshSliderUI();
    refreshAllTileResolutions();
  }
  // ---------- Excluir todos os anexos ----------
  function attachmentIds() {
    const ids = new Set();
    const mod = gid('attachmentmodule');
    if (!mod) return [];
    mod.querySelectorAll('[id^="del_"]').forEach((a) => { const m = /^del_(\d+)$/.exec(a.id); if (m) ids.add(m[1]); });
    mod.querySelectorAll('a[href*="deleteAttachmentId="]').forEach((a) => { const m = /deleteAttachmentId=(\d+)/.exec(a.getAttribute('href')); if (m) ids.add(m[1]); });
    mod.querySelectorAll('li.attachment-content, #file_attachments .attachment-content').forEach((li) => {
      const a = li.querySelector('a[file-preview-id]');
      if (a) { ids.add(String(a.getAttribute('file-preview-id'))); return; }
      const h = li.querySelector('a[href*="/secure/attachment/"]');
      const m = h && /\/secure\/attachment\/(\d+)\//.exec(h.getAttribute('href'));
      if (m) ids.add(m[1]);
    });
    return [...ids];
  }
  function pageAtlToken() {
    const meta = q1('meta[name="atlassian-token"]');
    if (meta && meta.content) return meta.content;
    const a = q1('a[href*="atl_token="]');
    const m = a && /atl_token=([^&]+)/.exec(a.getAttribute('href'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function issueNumericId() {
    const m = q1('meta[name="ajs-issue-id"]');
    if (m && m.content) return m.content;
    const k = gid('key-val');
    return (k && k.getAttribute('rel')) || '';
  }
  // Exclui um anexo: API REST do Jira; se ela nao existir, a acao classica
  async function deleteAttachment(id) {
    try {
      const res = await fetch(`${jiraBaseUrl()}/rest/api/2/attachment/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'X-Atlassian-Token': 'no-check', Accept: 'application/json' },
      });
      if (res.status === 204 || res.status === 200 || res.status === 404) return 'ok';
      if (res.status === 403) return 'forbidden';
      if (res.status === 401) return 'session';
    } catch {}
    try {
      const body = new URLSearchParams({ id: issueNumericId(), deleteAttachmentId: id, from: 'issue', atl_token: pageAtlToken() });
      const res = await fetch(`${jiraBaseUrl()}/secure/DeleteAttachment.jspa`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Atlassian-Token': 'no-check' },
        body,
      });
      if (res.ok || res.redirected) return 'ok';
      if (res.status === 403) return 'forbidden';
      if (res.status === 401) return 'session';
    } catch {}
    return 'error';
  }
  function removeAttachmentTile(id) {
    const mod = gid('attachmentmodule');
    if (!mod) return;
    mod.querySelectorAll('li.attachment-content, #file_attachments .attachment-content').forEach((li) => {
      const has = li.querySelector(`#del_${CSS.escape(id)}, a[file-preview-id="${CSS.escape(id)}"], a[href*="/secure/attachment/${id}/"]`);
      if (has) li.remove();
    });
  }
  function confirmDeleteAllAttachments() {
    confirmDeleteAttachments(attachmentIds(), {
      title: 'Excluir todos os anexos?',
      sub: 'Inclui anexos enviados por outras pessoas, se o Jira permitir para o seu usuário.',
    });
  }
  function escHtml(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function confirmDeleteAttachments(ids, { title, sub = '', names = [], onDone } = {}) {
    if (!ids.length || gid('uhub-confirm-backdrop')) return;
    const back = mk('div');
    back.id = 'uhub-confirm-backdrop';
    const list = names.length
      ? `<ul class="uc-list">${names.slice(0, 6).map((n) => `<li>${escHtml(n)}</li>`).join('')}${names.length > 6 ? `<li class="uc-more">e mais ${names.length - 6}</li>` : ''}</ul>`
      : '';
    back.innerHTML = `<div id="uhub-confirm" role="alertdialog" aria-modal="true" aria-labelledby="uhub-confirm-title">
      <h2 id="uhub-confirm-title">${escHtml(title)}</h2>
      <p class="uc-msg">Excluir <b>${ids.length} ${ids.length === 1 ? 'anexo' : 'anexos'}</b> desta issue? Não dá para desfazer.</p>
      ${list}
      ${sub ? `<p class="uc-sub">${escHtml(sub)}</p>` : ''}
      <div class="uc-progress" aria-live="polite"></div>
      <div class="uc-actions"><button type="button" class="uc-cancel">Cancelar</button><button type="button" class="uc-ok">Excluir ${ids.length}</button></div>
    </div>`;
    document.body.appendChild(back);
    const ok = back.querySelector('.uc-ok');
    const cancel = back.querySelector('.uc-cancel');
    const prog = back.querySelector('.uc-progress');
    let busy = false;
    const close = () => { if (!busy) { back.remove(); document.removeEventListener('keydown', onKey, true); } };
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('mousedown', (ev) => { if (ev.target === back) close(); });
    cancel.addEventListener('click', close);
    cancel.focus();
    ok.addEventListener('click', async () => {
      busy = true;
      ok.disabled = true;
      cancel.disabled = true;
      const result = { ok: 0, forbidden: 0, error: 0, session: 0 };
      let done = 0;
      const queue = ids.slice();
      const worker = async () => {
        while (queue.length) {
          const id = queue.shift();
          const r = await deleteAttachment(id);
          result[r] = (result[r] || 0) + 1;
          if (r === 'ok') removeAttachmentTile(id);
          done += 1;
          prog.textContent = `Excluindo… ${done} de ${ids.length}`;
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      busy = false;
      back.remove();
      document.removeEventListener('keydown', onKey, true);
      const parts = [`${result.ok} ${result.ok === 1 ? 'anexo excluído' : 'anexos excluídos'}`];
      if (result.forbidden) parts.push(`${result.forbidden} sem permissão`);
      if (result.session) parts.push('sessão expirada — recarregue a página');
      if (result.error) parts.push(`${result.error} com erro`);
      showToast(parts.join(' · '), 5000);
      syncAttachmentControls();
      if (onDone) { try { onDone(result); } catch {} }
      refreshComments();
    });
  }
  // Selecao de anexos: caixa no canto superior esquerdo de cada miniatura; com 1+ selecionado, o cabecalho de
  // Anexos mostra Citar / Excluir. Shift+clique seleciona um intervalo; Esc limpa.
  const attSel = new Set();
  let attSelAnchor = null;
  let attSelShift = false;
  function attVisibleLis() {
    return Array.from(qa('#attachment_thumbnails li.attachment-content'))
      .filter((li) => li.offsetParent !== null);
  }
  function attLiById(id) {
    return Array.from(qa('#attachment_thumbnails li.attachment-content'))
      .find((li) => { const r = attachmentRef(li); return r && r.id === id; }) || null;
  }
  function addAttachmentSelectBox(li, ref) {
    const thumb = li.querySelector('.attachment-thumb');
    if (!thumb) return;
    let box = thumb.querySelector(':scope > .uhub-att-sel');
    if (!box) {
      box = mk('label');
      box.className = 'uhub-att-sel';
      box.innerHTML = '<input type="checkbox">';
      thumb.appendChild(box);
    }
    const input = box.querySelector('input');
    const want = attSel.has(ref.id);
    if (input.checked !== want) input.checked = want;
    const label = `Selecionar ${ref.file}`;
    if (box.title !== label) { box.title = label; input.setAttribute('aria-label', label); }
    li.classList.toggle('uhub-att-selected', want);
  }
  function ensureAttSelBar() {
    const heading = gid('attachmentmodule_heading');
    const ops = heading && heading.querySelector('ul.ops');
    if (!ops) return null;
    let bar = ops.querySelector(':scope > .uhub-att-selbar');
    if (bar && !bar.__uhubLive) { bar.remove(); bar = null; }
    if (!bar) {
      bar = mk('li');
      bar.className = 'uhub-att-selbar';
      bar.innerHTML = '<label class="uhub-att-selall" title="Selecionar todos"><input type="checkbox" aria-label="Selecionar todos os anexos"></label>'
        + '<span class="uhub-att-selcount" aria-live="polite"></span>'
        + `<button type="button" class="uhub-att-selbtn uhub-att-selcmp" title="Comparar imagens selecionadas">${ICON_EYE}<span>Comparar</span></button>`
        + `<button type="button" class="uhub-att-selbtn uhub-att-selcite" title="Citar os selecionados no novo comentário">${ICON_CITE}<span>Citar</span></button>`
        + '<button type="button" class="uhub-att-selbtn uhub-att-seldel" title="Excluir os selecionados"><span class="aui-icon aui-icon-small aui-iconfont-delete" aria-hidden="true"></span><span>Excluir</span></button>'
        + '<button type="button" class="uhub-att-selclear" title="Limpar seleção (Esc)" aria-label="Limpar seleção"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>';
      bar.__uhubLive = true;
      ['pointerdown', 'mousedown', 'keydown'].forEach((t) => bar.addEventListener(t, (ev) => ev.stopPropagation()));
    }
    const sizeLi = ops.querySelector(':scope > .uhub-att-li');
    const before = sizeLi || ops.firstChild;
    if (before !== bar && bar.nextElementSibling !== before) ops.insertBefore(bar, before);
    return bar;
  }
  function syncAttSelection() {
    const lis = Array.from(qa('#attachment_thumbnails li.attachment-content'));
    const present = new Set();
    lis.forEach((li) => {
      const ref = attachmentRef(li);
      if (!ref) return;
      present.add(ref.id);
      addAttachmentSelectBox(li, ref);
    });
    Array.from(attSel).forEach((id) => { if (!present.has(id)) attSel.delete(id); });
    document.documentElement.classList.toggle('uhub-att-selecting', attSel.size > 0);
    const bar = ensureAttSelBar();
    if (!bar) return;
    const n = attSel.size;
    if (bar.hidden !== (n === 0)) bar.hidden = n === 0;
    const txt = `${n} ${n === 1 ? 'selecionado' : 'selecionados'}`;
    const cnt = bar.querySelector('.uhub-att-selcount');
    if (cnt.textContent !== txt) cnt.textContent = txt;
    const all = bar.querySelector('.uhub-att-selall input');
    const allOn = n > 0 && n >= present.size;
    if (all.checked !== allOn) all.checked = allOn;
    const mixed = n > 0 && n < present.size;
    if (all.indeterminate !== mixed) all.indeterminate = mixed;
    const cmp = bar.querySelector('.uhub-att-selcmp');
    if (cmp) {
      cmp.hidden = !prefs.betaViewer;
      const selImgCount = lis.filter((li) => {
        const ref = attachmentRef(li);
        return ref && attSel.has(ref.id) && isImageAttachmentLi(li, ref);
      }).length;
      cmp.disabled = selImgCount !== 2;
      const ct = selImgCount < 2
        ? 'Selecione 2 imagens para comparar'
        : (selImgCount > 2
          ? 'Selecione apenas 2 imagens por vez para comparar'
          : 'Comparar 2 imagens selecionadas (Beta)');
      if (cmp.title !== ct) cmp.title = ct;
    }
    const deletable = Array.from(attSel).filter((id) => { const li = attLiById(id); return li && li.querySelector('.attachment-delete a[href]'); }).length;
    const del = bar.querySelector('.uhub-att-seldel');
    del.disabled = deletable === 0;
    const dt = deletable === 0 ? 'Você não tem permissão para excluir os selecionados' : (deletable < n ? `Excluir ${deletable} (${n - deletable} sem permissão)` : 'Excluir os selecionados');
    if (del.title !== dt) del.title = dt;
  }
  function setAttSelected(ids, on) {
    ids.forEach((id) => { if (on) attSel.add(id); else attSel.delete(id); });
    syncAttSelection();
  }
  function clearAttSelection() {
    if (!attSel.size) return;
    attSel.clear();
    attSelAnchor = null;
    syncAttSelection();
  }
  function onAttSelClickCapture(ev) {
    const box = ev.target && ev.target.closest ? ev.target.closest('.uhub-att-sel, .uhub-att-selall') : null;
    if (!box) return;
    attSelShift = !!ev.shiftKey;
    ev.stopPropagation();
  }
  function onAttSelChange(ev) {
    const input = ev.target;
    if (!input || input.type !== 'checkbox') return;
    const all = input.closest('.uhub-att-selall');
    if (all) {
      const ids = Array.from(qa('#attachment_thumbnails li.attachment-content')).map(attachmentRef).filter(Boolean).map((r) => r.id);
      const everything = ids.length && ids.every((id) => attSel.has(id));
      setAttSelected(ids, !everything);
      return;
    }
    const box = input.closest('.uhub-att-sel');
    const li = box && box.closest('li.attachment-content');
    const ref = li && attachmentRef(li);
    if (!ref) return;
    const on = input.checked;
    if (attSelShift && attSelAnchor && attSelAnchor !== ref.id) {
      const order = attVisibleLis().map((x) => (attachmentRef(x) || {}).id);
      const a = order.indexOf(attSelAnchor);
      const b = order.indexOf(ref.id);
      if (a >= 0 && b >= 0) {
        const slice = a <= b ? order.slice(a, b + 1) : order.slice(b, a + 1).reverse();
        setAttSelected(slice, on);
        attSelShift = false;
        return;
      }
    }
    attSelShift = false;
    attSelAnchor = ref.id;
    setAttSelected([ref.id], on);
  }
  async function citeSelectedAttachments() {
    const refs = Array.from(attSel)
      .map((id) => { const li = attLiById(id); return li ? attachmentRef(li) : null; })
      .filter(Boolean);
    if (!refs.length) return;
    const res = await enqueueEditorOp(() => citeRefs(refs));
    if (!res || res.aborted) return;
    const parts = [`${res.ok} ${res.ok === 1 ? 'anexo citado' : 'anexos citados'}`];
    if (res.dup) parts.push(`${res.dup} já ${res.dup === 1 ? 'estava' : 'estavam'} no comentário`);
    if (res.fail) parts.push(`${res.fail} não ${res.fail === 1 ? 'pôde' : 'puderam'} ser citado${res.fail === 1 ? '' : 's'}`);
    showToast(parts.join(' · '), 3000);
    if (!res.fail) clearAttSelection();
  }
  function deleteSelectedAttachments() {
    const sel = Array.from(attSel).map((id) => ({ id, li: attLiById(id) })).filter((x) => x.li);
    const can = sel.filter((x) => x.li.querySelector('.attachment-delete a[href]'));
    if (!can.length) { showToast('Você não tem permissão para excluir os selecionados', 3000); return; }
    const skipped = sel.length - can.length;
    confirmDeleteAttachments(can.map((x) => x.id), {
      title: can.length === 1 ? 'Excluir o anexo selecionado?' : 'Excluir os anexos selecionados?',
      names: can.map((x) => (attachmentRef(x.li) || {}).file || x.id),
      sub: skipped ? `${skipped} ${skipped === 1 ? 'selecionado não será excluído' : 'selecionados não serão excluídos'} (sem permissão).` : '',
      onDone: () => clearAttSelection(),
    });
  }
  function compareSelectedAttachments() {
    const list = gid('attachment_thumbnails');
    const order = list ? attEnsureOrder(list) : Array.from(qa('#attachment_thumbnails li.attachment-content'));
    const imgIds = order.map((li) => {
      const ref = attachmentRef(li);
      return (ref && attSel.has(ref.id) && isImageAttachmentLi(li, ref)) ? ref.id : null;
    }).filter(Boolean);
    if (imgIds.length !== 2) {
      showToast('Selecione exatamente 2 imagens para comparar', 2500);
      return;
    }
    openBetaViewerCompare(imgIds);
  }
  function onAttSelBarClick(ev) {
    const t = ev.target && ev.target.closest ? ev.target.closest('.uhub-att-selcmp, .uhub-att-selcite, .uhub-att-seldel, .uhub-att-selclear') : null;
    if (!t) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (t.disabled) return;
    if (t.classList.contains('uhub-att-selcmp')) compareSelectedAttachments();
    else if (t.classList.contains('uhub-att-selcite')) citeSelectedAttachments();
    else if (t.classList.contains('uhub-att-seldel')) deleteSelectedAttachments();
    else clearAttSelection();
  }
  function onAttSelKey(ev) {
    if (ev.key !== 'Escape' || !attSel.size || ev.defaultPrevented) return;
    if (gid('uhub-confirm-backdrop')) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT|IFRAME)$/.test(a.tagName)) && !(a.closest && a.closest('.uhub-att-sel, .uhub-att-selbar'))) return;
    clearAttSelection();
  }
  document.addEventListener('click', onAttSelClickCapture, true);
  document.addEventListener('change', onAttSelChange, true);
  document.addEventListener('click', onAttSelBarClick, true);
  document.addEventListener('keydown', onAttSelKey);
  function decorateAttachmentHeader() {
    const heading = gid('attachmentmodule_heading');
    if (!heading) return;
    const old = heading.querySelector('.uhub-att-li');
    if (old && old.__uhubLive && old.querySelector('.uhub-att-delall') && old.querySelector('.uhub-att-reset')) { alignAttHeader(old); applyAttWidth(); syncAttachmentControls(); return; }
    if (old) old.remove();
    let ops = heading.querySelector('ul.ops');
    if (!ops) {
      ops = mk('ul');
      ops.className = 'ops';
      heading.appendChild(ops);
    }
    const li = mk('li');
    li.className = 'uhub-att-li';
    li.title = 'Tamanho dos anexos (vale para todas as issues)';
    const input = mk('input');
    input.type = 'range';
    input.min = 2;
    input.max = 12;
    input.step = 1;
    input.value = 4;
    input.setAttribute('aria-label', 'Anexos por linha');
    const val = mk('span');
    val.className = 'uhub-att-val';
    val.textContent = '4 por linha';
    ['pointerdown', 'mousedown', 'click', 'keydown'].forEach((t) => li.addEventListener(t, (ev) => ev.stopPropagation()));
    input.addEventListener('input', () => { setIssueAttSize(Number(input.value)); });
    const reset = mk('button');
    reset.type = 'button';
    reset.className = 'uhub-att-reset';
    reset.title = `Voltar ao padrão (${DEFAULTS.attSize}px)`;
    reset.setAttribute('aria-label', reset.title);
    reset.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.2 1.8v3.6h3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    reset.disabled = !issueUserSize();
    reset.addEventListener('click', () => { setIssueAttSize(0); });
    const delAll = mk('button');
    delAll.type = 'button';
    delAll.className = 'uhub-att-delall';
    delAll.title = 'Excluir todos os anexos';
    delAll.setAttribute('aria-label', 'Excluir todos os anexos');
    delAll.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.2c.05.7.6 1.3 1.3 1.3h4c.7 0 1.25-.6 1.3-1.3L12 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.7 6.8v5M9.3 6.8v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    delAll.hidden = !attachmentIds().length;
    delAll.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      confirmDeleteAllAttachments();
    });
    li.appendChild(input);
    li.appendChild(val);
    li.appendChild(reset);
    li.appendChild(delAll);
    li.dataset.uhubBuilt = '1';
    li.__uhubLive = true;
    ops.insertBefore(li, ops.firstChild);
    alignAttHeader(li);
    syncAttachmentControls();
  }
  // Centro vertical dos nossos botoes = centro do botao nativo "..." (Opcoes)
  function alignAttHeader(li) {
    const heading = gid('attachmentmodule_heading');
    const ref = heading && heading.querySelector('.aui-dd-parent button, #attachments-actions-trigger-button');
    const btn = li.querySelector('.uhub-att-reset');
    if (!ref || !btn) return;
    const rr = ref.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    if (!rr.height || !br.height) return;
    const cur = parseFloat(li.style.getPropertyValue('--uhub-att-dy')) || -3;
    const delta = (rr.top + rr.height / 2) - (br.top + br.height / 2);
    if (Math.abs(delta) < 0.5) return;
    const next = Math.max(-10, Math.min(10, Math.round((cur + delta) * 2) / 2));
    li.style.setProperty('--uhub-att-dy', `${next}px`);
  }
  // Mantem os dois controles (cabecalho e Ajustes) sincronizados
  function syncAttachmentControls() {
    applyAttWidth();
    qa('#attachmentmodule_heading .uhub-att-li').forEach((li) => {
      const input = li.querySelector('input');
      const val = li.querySelector('.uhub-att-val');
      const rev = false;
      const pr = perRowInfo();
      if (input && pr.ok) {
        if (Number(input.min) !== pr.min) input.min = pr.min;
        if (Number(input.max) !== pr.max) input.max = pr.max;
        if (Number(input.value) !== pr.n) input.value = pr.n;
        input.disabled = pr.max <= pr.min;
      }
      const prTxt = pr.ok ? `${pr.n} por linha` : '';
      if (val && prTxt && val.textContent !== prTxt) val.textContent = prTxt;
      const reset = li.querySelector('.uhub-att-reset');
      if (reset) {
        reset.disabled = rev ? !reviewUserSize() : !issueUserSize();
        const t = rev ? 'Voltar ao tamanho automático do modo revisão' : 'Voltar ao automático (anexos por linha)';
        if (reset.title !== t) { reset.title = t; reset.setAttribute('aria-label', t); }
      }
      const lt = rev ? 'Tamanho dos anexos no modo revisão' : 'Anexos por linha (salvo só para esta issue)';
      if (li.title !== lt) li.title = lt;
      const del = li.querySelector('.uhub-att-delall');
      if (del) del.hidden = !attachmentIds().length;
    });
    document.documentElement.classList.remove('uhub-att-prop');
  }
  function buildAttachmentSection() {
    const wrap = mk('div');
    wrap.className = 'sp-section';
    wrap.innerHTML = '<div class="sp-section-title">Anexos</div>';
    const prNote = mk('div');
    prNote.className = 'sp-field';
    const prHint = mk('div');
    prHint.className = 'sp-hint';
    prHint.textContent = 'Tamanho dos anexos: use o controle "anexos por linha" no cabeçalho de Anexos (2 a 12). Vale por issue e no modo revisão; o automático escolhe sozinho.';
    prNote.appendChild(prHint);
    wrap.appendChild(prNote);
    const { row, input } = buildCheckboxRow('attProportional', 'Largura proporcional (anexo estreito ocupa menos espaço)');
    input.addEventListener('change', () => {
      savePref('attProportional', input.checked);
      syncAttachmentControls();
    });
    row.style.display = 'none';
    wrap.appendChild(row);
    return wrap;
  }
  // Campo de escolha (botoes segmentados) para prefs de texto
  function buildChoiceField({ key, label, defaultLabel, options, hint, onChange }) {
    const field = mk('div');
    field.className = 'sp-field sp-choice';
    const lb = mk('label');
    const lbSpan = mk('span');
    lbSpan.textContent = label;
    lb.appendChild(lbSpan);
    lb.appendChild(makeParamResetButton(key, defaultLabel));
    field.appendChild(lb);
    const seg = mk('div');
    seg.className = 'sp-seg';
    seg.dataset.key = key;
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', label);
    options.forEach(([v, text]) => {
      const b = mk('button');
      b.type = 'button';
      b.dataset.v = v;
      b.textContent = text;
      b.addEventListener('click', () => {
        if (prefs[key] === v) return;
        savePref(key, v);
        if (onChange) { onChange(v); return; }
        attGroupSig = '';
        applyAttachmentGrouping();
      });
      seg.appendChild(b);
    });
    field.appendChild(seg);
    const h = mk('div');
    h.className = 'sp-hint';
    field.appendChild(h);
    field._hint = hint;
    syncChoiceField(field);
    return field;
  }
  function syncChoiceField(field) {
    const seg = field.querySelector('.sp-seg');
    const key = seg.dataset.key;
    seg.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.v === prefs[key];
      if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
      b.disabled = key === 'attSens' && prefs.attGroup === 'off';
    });
    const h = field.querySelector('.sp-hint');
    const txt = field._hint ? field._hint() || '' : '';
    if (h.textContent !== txt) h.textContent = txt;
  }
  // Aplicacao do layout (idempotente)
  function applyLayout() {
    if (state.applied || state.userDisabled) return;
    if (!isInternalReview()) return;
    const activityModule = gid('activitymodule');
    const mainColumn = q1('.issue-main-column');
    if (!activityModule || !mainColumn) return;
    state.applied = true;
    state.issueKey = getIssueKey();
    document.documentElement.classList.add('uhub-wide', 'uhub-att', 'uhub-nav-collapsed');
    applyColumnWidths();
    placeDetailsInSidebar();
    placeAttachments();
    decorateAttachments();
    renderDueChip();
    bindAttachmentPreview();
    if (!state.dueTimer) state.dueTimer = setInterval(() => { if (state.applied) renderDueChip(); }, 60000);
    decorateCopyButtons();
    buildSidebar();
    placeSidebar();
    buildSettingsPanel();
    buildHeaderSettingsButton();
    buildNotifyIndicator();
    buildLayoutToggle();
    buildNavToggle();
    document.addEventListener('pointerdown', onDocPointerDownForPanels, true);
    document.addEventListener('keydown', onDocKeyDownForPanels);
    watchHeaderHeight();
    watchAddCommentHeight();
    startReconcileObserver();
    startOverlayWatcher();
    startDetailsEditGuard();
    startAutoRefresh();
    decorateReplyButtons();
    startWaiting();
    startDrafts();
    document.documentElement.classList.remove('uhub-boot-pending', 'uhub-boot-head');
    disconnectBootObserver();
  }
  function disconnectBootObserver() {
    if (bootObserver) {
      bootObserver.disconnect();
      bootObserver = null;
    }
  }
  function resetLayout({ keepToggle = false } = {}) {
    resetLite();
    state.applied = false;
    syncReviewMeta();
    state.issueKey = null;
    document.documentElement.classList.remove(
      'uhub-wide', 'uhub-att', 'uhub-comments-collapsed', 'uhub-nav-collapsed', 'uhub-narrow', 'uhub-cstack', 'uhub-meta-open'
    );
    narrow.mode = '';
    narrow.autoCollapsed = false;
    narrow.autoExpanded = false;
    document.removeEventListener('pointerdown', onDocPointerDownForPanels, true);
    document.removeEventListener('keydown', onDocKeyDownForPanels);
    unwatchHeaderHeight();
    unwatchAddCommentHeight();
    stopReconcileObserver();
    stopOverlayWatcher();
    stopDetailsEditGuard();
    stopDrafts();
    stopWaiting();
    stopAutoRefresh();
    const addComment = gid('addcomment');
    if (addComment) addComment.classList.remove('uhub-pinned-footer');
    const sidebar = gid('uhub-sidebar');
    const activity = sidebar && sidebar.querySelector('#activitymodule');
    if (activity) {
      const main = q1('.issue-main-column');
      if (addComment && addComment.parentNode) addComment.parentNode.insertBefore(activity, addComment);
      else if (main) main.appendChild(activity);
    }
    if (sidebar) sidebar.remove();
    qa('.uhub-att-nodel').forEach((li) => li.classList.remove('uhub-att-nodel'));
    attSel.clear();
    document.documentElement.classList.remove('uhub-att-selecting', 'uhub-review');
    document.documentElement.style.removeProperty('--uhub-att-w-review');
    qa('.uhub-att-selected').forEach((li) => li.classList.remove('uhub-att-selected'));
    closeBetaViewer();
    qa('.uhub-reply-btn, .uhub-cmt-copy, .uhub-att-sel, .uhub-att-selbar, .uhub-att-cite, .uhub-att-inspect, .uhub-att-nodel-trash, .uhub-att-li, #uhub-confirm-backdrop, #uhub-beta-viewer, #uhub-review-chip, #uhub-review-meta, #uhub-sendcheck').forEach((b) => b.remove());
    applyAttachmentGrouping();
    attGroupSig = '';
    attPvHide();
    qa('.uhub-att-new, .uhub-due, .uhub-att-vtag, .uhub-me-avatar').forEach((n) => n.remove());
    qa('dd.uhub-due-dd').forEach((d) => d.classList.remove('uhub-due-dd'));
    restoreDetailsFromSidebar();
    restoreAttachments();
    qa('#attachment_thumbnails li[data-uhub-att]').forEach((li) => {
      li.removeAttribute('data-uhub-att');
      li.removeAttribute('data-uhub-aspect');
      li.style.removeProperty('--uhub-aspect');
      const img = li.querySelector('img.attachment-thumb-img');
      if (img && img.dataset.uhubThumb) {
        if (img.getAttribute('src') !== img.dataset.uhubThumb) img.setAttribute('src', img.dataset.uhubThumb);
        delete img.dataset.uhubThumb;
      }
    });
    document.documentElement.classList.remove('uhub-att-prop', 'uhub-anim');
    qa('[data-uhub-reply]').forEach((c) => c.removeAttribute('data-uhub-reply'));
    ['uhub-settings-panel', 'uhub-notify-pop',
      'uhub-notify-status_container', 'uhub-nav-toggle', 'uhub-copy-summary'].forEach((id) => {
      const el = gid(id);
      if (el) el.remove();
    });
    ['uhub-settings-btn', 'uhub-refresh-btn'].forEach((id) => {
      const stray = gid(id);
      if (stray && !stray.closest('#uhub-settings-header-nav')) stray.remove();
    });
    if (!keepToggle) {
      const nav = gid('uhub-settings-header-nav');
      if (nav) nav.remove();
      const toggle = gid('uhub-layout-toggle');
      if (toggle) toggle.remove();
      document.documentElement.classList.remove('uhub-layout-off');
    }
  }
  // Topbar do Jira: botoes inseridos depois do carregamento (este script e outros) aumentam o bloco da
  // direita sem o Jira saber. Pedimos ao Jira para recalcular o "Mais" (ele escuta o resize) e marcamos o
  // bloco da esquerda quando ainda ha excedente (esmaece a borda em vez de cortar seco).
  function fitHeader() {
    const pr = q1('#header .aui-header-primary');
    if (pr) pr.classList.toggle('uhub-hdr-clip', pr.scrollWidth > pr.clientWidth + 1);
  }
  function refitHeader(askJira) {
    clearTimeout(refitHeader.t);
    if (askJira) requestAnimationFrame(() => { try { window.dispatchEvent(new Event('resize')); } catch {} });
    refitHeader.t = setTimeout(fitHeader, 300); // depois que o Jira reorganiza os itens
  }
  // Modo leve (issues que nao sao Internal Review): sem o layout de 3 colunas, so as funcoes de anexos
  // (selecionar, citar, excluir, tamanho, versoes, selo novo, previa) no lugar nativo do Jira.
  function attOn() { return state.applied || state.lite; }
  let liteObserver = null;
  let liteScheduled = false;
  function liteTick() {
    liteScheduled = false;
    if (!state.lite) return;
    watchTopbar();
    shortenCommentActionText(gid('activitymodule'));
    dedupeById('attachmentmodule', (m) => !!m.querySelector('.uhub-att-li, [data-uhub-att]'));
    const am = gid('attachmentmodule');
    if (am) dedupeById.attachmentmodule = am;
    decorateAttachments();
  }
  function applyLite() {
    if (state.applied || state.lite || state.userDisabled || !gid('type-val') || isInternalReview()) return;
    state.lite = true;
    state.issueKey = getIssueKey();
    const root = document.documentElement;
    root.classList.add('uhub-att');
    root.classList.remove('uhub-boot-pending', 'uhub-boot-head');
    applyAttWidth();
    bindAttachmentPreview();
    refitHeader(false);
    liteTick();
    liteObserver = new MutationObserver(() => { if (!liteScheduled) { liteScheduled = true; requestAnimationFrame(liteTick); } });
    liteObserver.observe(document.body, { childList: true, subtree: true });
  }
  function resetLite() {
    state.lite = false;
    if (liteObserver) liteObserver.disconnect();
    liteObserver = null;
  }
  // Topbar do Jira (#033F9A): ela e responsiva (AUI), mas so recalcula quantos menus cabem quando a JANELA muda
  // de tamanho. Botoes adicionados depois (os nossos ou de outros complementos) alargam a area da direita sem
  // avisar e os menus se sobrepunham. Observamos a area da direita e pedimos o recalculo ao proprio Jira (o que
  // nao cabe vai para o "Mais" dele); se ainda assim sobrar sobreposicao, os menus da ponta saem de cena
  // (nunca o "Criar" nem o "Mais"). Vale em qualquer pagina de issue.
  let topbarRO = null;
  let topbarPinging = false;
  function watchTopbar() {
    const sec = q1('#header .aui-header-secondary');
    if (!sec || typeof ResizeObserver === 'undefined' || (topbarRO && topbarRO.el === sec)) return;
    if (topbarRO) topbarRO.disconnect();
    topbarRO = new ResizeObserver(() => {
      clearTimeout(watchTopbar.t);
      watchTopbar.t = setTimeout(() => {
        topbarPinging = true;
        window.dispatchEvent(new Event('resize'));
        topbarPinging = false;
        setTimeout(fitTopbar, 150);
      }, 50);
    });
    topbarRO.el = sec;
    topbarRO.observe(sec);
    fitTopbar();
  }
  function fitTopbar() {
    const pri = q1('#header .aui-header-primary > .aui-nav');
    const sec = q1('#header .aui-header-secondary');
    if (!pri || !sec) return;
    const root = document.documentElement;
    const lis = [...pri.children].filter((li) => li.tagName === 'LI');
    lis.forEach((li) => li.classList.remove('uhub-hdr-off'));
    root.classList.remove('uhub-hdr-1', 'uhub-hdr-2', 'uhub-hdr-3', 'uhub-hdr-4');
    const logoImg = q1('#header .aui-header-logo img');
    if (logoImg && logoImg.offsetHeight) root.style.setProperty('--uhub-logo-h', `${logoImg.offsetHeight}px`);
    const create = gid('create_link');
    if (create && create.offsetHeight) root.style.setProperty('--uhub-create-h', `${create.offsetHeight}px`);
    const fixed = [q1('#header .aui-header-before'), q1('#header .aui-header-logo')].filter(Boolean);
    const over = () => {
      const right = Math.max(0, ...fixed.concat(lis).filter((e) => e.offsetWidth).map((e) => e.getBoundingClientRect().right));
      return right > sec.getBoundingClientRect().left - 8;
    };
    const keep = (li) => li.id === 'create-menu' || !!li.querySelector('[aria-controls*="responsive"]') || /^(Mais|More)$/.test(cleanText(li.textContent));
    // 1o: menus da ponta saem (como o "Mais" do Jira faria); 2o: compacta em etapas, so o necessario
    // (1 icones mais juntos, 2 logo so com o simbolo, 3 "Criar" vira "+", 4 sai o seletor de apps)
    for (let i = lis.length - 1; i >= 0 && over(); i--) if (!keep(lis[i])) lis[i].classList.add('uhub-hdr-off');
    for (let lv = 1; lv <= 4 && over(); lv++) root.classList.add(`uhub-hdr-${lv}`);
  }
  window.addEventListener('resize', () => {
    if (topbarPinging) return;
    clearTimeout(fitTopbar.t);
    fitTopbar.t = setTimeout(fitTopbar, 200);
  });
  // Bootstrap Fase inicial: assim que o tipo da issue aparece no HTML (logo depois do cabecalho), ja aplica as
  // classes do layout e o botao de copiar — o cabecalho nunca aparece numa posicao e depois "pula" para outra.
  // Ate o tipo ser conhecido, o cabecalho da issue fica oculto (fracao de segundo, no mesmo carregamento do
  // HTML).
  function earlyApply() {
    if (state.applied || state.early || state.userDisabled) return;
    if (!gid('type-val')) return;
    state.early = true;
    const root = document.documentElement;
    if (isInternalReview()) {
      root.classList.add('uhub-wide', 'uhub-att', 'uhub-nav-collapsed');
      applyColumnWidths();
      decorateCopyButtons();
    } else root.classList.remove('uhub-boot-pending');
    root.classList.remove('uhub-boot-head');
  }
  function bootTick() {
    watchTopbar();
    earlyApply();
    applyLayout();
    if (state.applied) document.documentElement.classList.remove('uhub-boot-head');
    else applyLite();
  }
  // Rede de seguranca: se o layout completo nao pode ser aplicado, volta tudo ao normal
  function bootValve() {
    if (state.applied) return;
    const root = document.documentElement;
    root.classList.remove('uhub-boot-pending', 'uhub-boot-head');
    if (state.early) {
      if (!state.lite) root.classList.remove('uhub-wide', 'uhub-att', 'uhub-nav-collapsed');
      else root.classList.remove('uhub-wide', 'uhub-nav-collapsed');
      const e = gid('uhub-copy-summary');
      if (e) e.remove();
    }
    disconnectBootObserver();
  }
  function startBoot() {
    state.early = false;
    document.documentElement.classList.add('uhub-boot-pending', 'uhub-boot-head');
    bootObserver = new MutationObserver(bootTick);
    bootObserver.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(bootValve, 4000);
  }
  injectStyles();
  startBoot();
  if (document.readyState !== 'loading') bootTick();
  document.addEventListener('DOMContentLoaded', bootTick);
  window.addEventListener('scroll', () => {
    if (!state.applied) return;
    positionNavToggle();
    const sp = gid('uhub-settings-panel');
    if (sp && sp.classList.contains('uhub-open')) positionSettingsPanel();
    const np = gid('uhub-notify-pop');
    if (np && np.classList.contains('uhub-open')) positionNotifyPopover();
    if (metaPopoverOpen()) positionMetaPopover();
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (state.applied || state.lite || state.userDisabled) refitHeader(false);
    // so onde o layout de 3 colunas esta ativo (nao em outras issues nem no "Layout padrao")
    if (state.applied || (state.early && document.documentElement.classList.contains('uhub-wide'))) applyResponsive();
    if (state.applied) {
      positionNavToggle();
      updateSettingsWarning();
      measureEdgeFix();
      const sp = gid('uhub-settings-panel');
      if (sp && sp.classList.contains('uhub-open')) positionSettingsPanel();
      const np = gid('uhub-notify-pop');
      if (np && np.classList.contains('uhub-open')) positionNotifyPopover();
      if (metaPopoverOpen()) positionMetaPopover();
    }
  });
  // So reinicia quando a ISSUE muda. Trocar de aba (Todos/Comentarios/ Historico), abrir um link de comentario
  // etc. muda a URL da mesma issue e nao pode desmontar o layout.
  const issueKeyFromUrl = () => {
    const m = location.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/i);
    return m ? m[1].toUpperCase() : location.pathname;
  };
  let lastIssueUrlKey = issueKeyFromUrl();
  try { startDueReminders(); } catch {}
  setInterval(() => {
    const key = issueKeyFromUrl();
    if (key !== lastIssueUrlKey) {
      lastIssueUrlKey = key;
      state.userDisabled = false;
      resetLayout();
      disconnectBootObserver();
      startBoot();
      bootTick();
    }
  }, 600);
})();