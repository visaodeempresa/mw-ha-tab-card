/* Stubs da bancada: fazem o mw-tab-card rodar no navegador sem Home Assistant.
 * Usado por tools/preview.html (as variações lado a lado) e por tools/shots.html
 * (as fotos do README, uma por vez). Os "cards de dentro" aqui são desenhos de
 * mentira — quem está sendo conferido é a casca.
 */
(() => {
  "use strict";

  customElements.define("ha-card", class extends HTMLElement {
    connectedCallback() {
      if (this._d) return; this._d = true;
      this.attachShadow({ mode: "open" }).innerHTML =
        `<style>:host{display:block;background:var(--ha-card-background,var(--card-background-color));
          border-radius:var(--ha-card-border-radius,16px);color:var(--primary-text-color)}</style><slot></slot>`;
    }
  });

  /* Ícone da bancada: o dublê é o bloco canônico da área de IA
   * (IA/lib/bench-ha-icon) — ele desenha o path do MDI num <svg>, então o
   * tamanho vem do CSS do card como no HA, e ícone sem path sai como
   * losango VERMELHO em vez de bolinha discreta. A lista de paths é deste
   * repo (cada bancada usa ícones diferentes); para acrescentar:
   *   IA/lib/bench-ha-icon/tools/mdi-paths.sh --from tools/bench-stubs.js
   * Conferir o bloco antes de commitar: IA/tools/check-embeds.sh
   * Paths: Material Design Icons (@mdi/js v7.4.47), Apache-2.0. */
  // >>> bench-ha-icon v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/bench-ha-icon/bench-ha-icon.js
  // Dublê de <ha-icon> que desenha o ícone DE VERDADE (path do MDI em <svg>
  // ocupando a caixa toda), para o tamanho vir do CSS do card como no HA.
  // Ícone sem path vira losango VERMELHO: erro tem que gritar, e bolinha
  // discreta já fez a bancada inteira mentir uma vez.
  const BENCH_ICON_MISSING = "M11 15.5H12.5V17H11V15.5M12 6.95C14.7 7.06 15.87 9.78 14.28 11.81C13.86 12.31 13.19 12.64 12.85 13.07C12.5 13.5 12.5 14 12.5 14.5H11C11 13.65 11 12.94 11.35 12.44C11.68 11.94 12.35 11.64 12.77 11.31C14 10.18 13.68 8.59 12 8.46C11.18 8.46 10.5 9.13 10.5 9.97H9C9 8.3 10.35 6.95 12 6.95M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41L10.59 21.41C11.37 22.2 12.63 22.2 13.41 21.41L21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2M12 4L20 12L12 20L4 12Z";
  const defineBenchHaIcon = (paths) => customElements.define("ha-icon", class extends HTMLElement {
    static get observedAttributes() { return ["icon"]; }
    _benchPaint() {
      const name = String(this.getAttribute("icon") || "").replace(/^mdi:/, "");
      const d = (paths || {})[name];
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML =
        `<style>:host{display:block;line-height:0}svg{width:100%;height:100%;display:block}</style>`
        + `<svg viewBox="0 0 24 24" aria-hidden="true">`
        + `<path fill="${d ? "currentColor" : "#e11d48"}" d="${d || BENCH_ICON_MISSING}"></path></svg>`;
      this.title = d ? "" : `bancada: ícone "${name}" sem path — ver o mapa MDI deste repo`;
    }
    attributeChangedCallback() { this._benchPaint(); }
    connectedCallback() { this._benchPaint(); }
  });
  // <<< bench-ha-icon v1

  const MDI = {
    "account": "M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z",
    "account-heart": "M15,14C12.3,14 7,15.3 7,18V20H23V18C23,15.3 17.7,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5,15L4.4,14.5C2.4,12.6 1,11.4 1,9.9C1,8.7 2,7.7 3.2,7.7C3.9,7.7 4.6,8 5,8.5C5.4,8 6.1,7.7 6.8,7.7C8,7.7 9,8.6 9,9.9C9,11.4 7.6,12.6 5.6,14.5L5,15Z",
    "account-question": "M13,8A4,4 0 0,1 9,12A4,4 0 0,1 5,8A4,4 0 0,1 9,4A4,4 0 0,1 13,8M17,18V20H1V18C1,15.79 4.58,14 9,14C13.42,14 17,15.79 17,18M20.5,14.5V16H19V14.5H20.5M18.5,9.5H17V9A3,3 0 0,1 20,6A3,3 0 0,1 23,9C23,9.97 22.5,10.88 21.71,11.41L21.41,11.6C20.84,12 20.5,12.61 20.5,13.3V13.5H19V13.3C19,12.11 19.6,11 20.59,10.35L20.88,10.16C21.27,9.9 21.5,9.47 21.5,9A1.5,1.5 0 0,0 20,7.5A1.5,1.5 0 0,0 18.5,9V9.5Z",
    "bed": "M19,7H11V14H3V5H1V20H3V17H21V20H23V11A4,4 0 0,0 19,7M7,13A3,3 0 0,0 10,10A3,3 0 0,0 7,7A3,3 0 0,0 4,10A3,3 0 0,0 7,13Z",
    "chart-line": "M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z",
    "chevron-right": "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
    "cog": "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",
    "flash": "M7,2V13H10V22L17,10H13L17,2H7Z",
    "home": "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
    "shield-home": "M11,13H13V16H16V11H18L12,6L6,11H8V16H11V13M12,1L21,5V11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1Z",
    "sofa": "M12.5 7C12.5 5.89 13.39 5 14.5 5H18C19.1 5 20 5.9 20 7V9.16C18.84 9.57 18 10.67 18 11.97V14H12.5V7M6 11.96V14H11.5V7C11.5 5.89 10.61 5 9.5 5H6C4.9 5 4 5.9 4 7V9.15C5.16 9.56 6 10.67 6 11.96M20.66 10.03C19.68 10.19 19 11.12 19 12.12V15H5V12C5 10.9 4.11 10 3 10S1 10.9 1 12V17C1 18.1 1.9 19 3 19V21H5V19H19V21H21V19C22.1 19 23 18.1 23 17V12C23 10.79 21.91 9.82 20.66 10.03Z",
    "trophy-outline": "M18 2C17.1 2 16 3 16 4H8C8 3 6.9 2 6 2H2V11C2 12 3 13 4 13H6.2C6.6 15 7.9 16.7 11 17V19.08C8 19.54 8 22 8 22H16C16 22 16 19.54 13 19.08V17C16.1 16.7 17.4 15 17.8 13H20C21 13 22 12 22 11V2H18M6 11H4V4H6V11M16 11.5C16 13.43 15.42 15 12 15C8.59 15 8 13.43 8 11.5V6H16V11.5M20 11H18V4H20V11Z",
    "wallet": "M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z",
    "ceiling-light": "M8,9H11V4H13V9H16L20,17H4L8,9M14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18H14Z",
    "lightbulb": "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
    "led-strip-variant": "M2.95 3L2 6.91L19.34 11.25L20.29 7.34L2.95 3M6.09 6.89L4.16 6.41L4.64 4.46L6.57 4.94L6.09 6.89M9.94 7.86L8 7.38L8.5 5.42L10.42 5.91L9.94 7.86M13.8 8.82L11.87 8.34L12.35 6.39L14.27 6.87L13.8 8.82M17.65 9.79L15.72 9.31L16.2 7.35L18.13 7.84L17.65 9.79M4.66 12.75L3.71 16.66L21.05 21L22 17.1L4.66 12.75M7.8 16.65L5.88 16.16L6.35 14.21L8.28 14.69L7.8 16.65M11.65 17.61L9.73 17.13L10.2 15.18L12.13 15.66L11.65 17.61M15.5 18.58L13.58 18.09L14.06 16.14L16 16.62L15.5 18.58M19.36 19.54L17.43 19.06L17.91 17.11L19.84 17.59L19.36 19.54M6.25 12.11L11 10.2L17.75 11.89L13 13.8L6.25 12.11Z",
    "movie-open": "M20.84 2.18L16.91 2.96L19.65 6.5L21.62 6.1L20.84 2.18M13.97 3.54L12 3.93L14.75 7.46L16.71 7.07L13.97 3.54M9.07 4.5L7.1 4.91L9.85 8.44L11.81 8.05L9.07 4.5M4.16 5.5L3.18 5.69A2 2 0 0 0 1.61 8.04L2 10L6.9 9.03L4.16 5.5M2 10V20C2 21.11 2.9 22 4 22H20C21.11 22 22 21.11 22 20V10H2Z",
    "check": "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
    "help-rhombus-outline": "M11 15.5H12.5V17H11V15.5M12 6.95C14.7 7.06 15.87 9.78 14.28 11.81C13.86 12.31 13.19 12.64 12.85 13.07C12.5 13.5 12.5 14 12.5 14.5H11C11 13.65 11 12.94 11.35 12.44C11.68 11.94 12.35 11.64 12.77 11.31C14 10.18 13.68 8.59 12 8.46C11.18 8.46 10.5 9.13 10.5 9.97H9C9 8.3 10.35 6.95 12 6.95M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41L10.59 21.41C11.37 22.2 12.63 22.2 13.41 21.41L21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2M12 4L20 12L12 20L4 12Z",
  };
  defineBenchHaIcon(MDI);

  const DEMOS = {
    wallet: `<div style="display:grid;grid-template-columns:1fr 1fr;text-align:center;padding:8px 0 20px">
        <div style="border-right:1px solid rgba(0,0,0,.10)">
          <div style="font-size:44px;font-weight:800;letter-spacing:-1px">983</div>
          <div style="font-size:13px;opacity:.5;margin-top:-4px">Total Hours</div></div>
        <div><div style="font-size:44px;font-weight:800;letter-spacing:-1px">24k</div>
          <div style="font-size:13px;opacity:.5;margin-top:-4px">Total Earned</div></div></div>`,
    rows: `<div style="border-radius:18px;background:linear-gradient(145deg,#fffdf8,#f1ece1);
        box-shadow:0 2px 6px rgba(0,0,0,.10),0 8px 18px rgba(0,0,0,.07),inset 2px 2px 5px rgba(255,255,255,.9);padding:6px 14px">
        ${[["$ 1,750", "Amazone Camp…"], ["$ 820", "Extention"]].map((r, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:16px 0;${i ? "border-top:1px solid rgba(0,0,0,.07)" : ""}">
          <div style="width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,.18);
            display:flex;align-items:center;justify-content:center;font-size:14px;opacity:.35">+</div>
          <div style="flex:1"><div style="font-size:21px;font-weight:700">${r[0]}</div>
            <div style="font-size:14px;color:#c0335c">${r[1]}</div></div>
          <div style="width:44px;height:44px;border-radius:50%;background:#fff;
            box-shadow:0 3px 8px rgba(0,0,0,.16),0 8px 16px rgba(0,0,0,.08);
            display:flex;align-items:center;justify-content:center;font-size:19px">→</div></div>`).join("")}</div>`,
    awards: `<div style="text-align:center;padding:26px 0"><div style="font-size:40px">♛</div>
        <div style="font-size:15px;opacity:.55;margin-top:8px">Nenhum prêmio ainda</div></div>`,
    power: `<div style="display:flex;align-items:baseline;gap:8px;padding:10px 2px">
        <span style="font-size:30px">⚡</span>
        <span style="font-size:38px;font-weight:800;letter-spacing:-1px">1.240</span>
        <span style="font-size:16px;font-weight:700;opacity:.7">W</span></div>`,
    chart: `<svg viewBox="0 0 240 90" style="width:100%;height:92px;display:block">
        <polyline fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2.5" stroke-linejoin="round"
          points="4,72 30,58 56,64 82,38 108,46 134,22 160,34 186,14 212,26 236,10"/>
        <polyline fill="rgba(0,0,0,.06)" stroke="none"
          points="4,72 30,58 56,64 82,38 108,46 134,22 160,34 186,14 212,26 236,10 236,88 4,88"/></svg>`,
    generic: (t) => `<div style="padding:18px 4px"><div style="font-size:15px;font-weight:600">${t}</div>
        <div style="font-size:13px;opacity:.55;margin-top:6px">card de exemplo da bancada</div></div>`,
  };

  window.loadCardHelpers = async () => ({
    createCardElement(cfg) {
      const el = document.createElement("div");
      el.innerHTML = DEMOS[cfg.demo] || DEMOS.generic(cfg.title || cfg.type || "card");
      Object.defineProperty(el, "hass", { set() {}, configurable: true });
      el.getCardSize = () => 3;
      return el;
    },
  });

  // ------- as variações que a bancada e as fotos do README compartilham -------
  const WALLET = (extra = {}) => ({
    header: "UPDATE PAYMENT METHOD", header_icon: "mdi:chevron-right",
    tabs: [
      { label: "My Wallet", icon: "mdi:wallet", cards: [{ demo: "wallet" }, { demo: "rows" }] },
      { label: "My Awards", icon: "mdi:trophy-outline", cards: [{ demo: "awards" }] },
    ], ...extra,
  });

  window.MW_CASES = {
    clone: {
      title: "Clone da referência", width: 430,
      cfg: WALLET({ tab_display: "text", tab_font_size: 12 }),
    },
    bottom: {
      title: "Abas embaixo", width: 300,
      cfg: WALLET({ tab_display: "both", header: "", header_icon: "", panel_min_height: 200,
        tabs: [{ label: "Sala", icon: "mdi:sofa", cards: [{ demo: "power" }] },
          { label: "Casa", icon: "mdi:home", cards: [{ demo: "chart" }] }] }),
    },
    top: {
      title: "Abas em cima", width: 300,
      cfg: WALLET({ tab_position: "top", tab_display: "both", header: "", header_icon: "",
        paper_color: "yellow-2", shell_color: "#7c2d12", panel_min_height: 200,
        tabs: [{ label: "Agora", icon: "mdi:flash", cards: [{ demo: "power" }] },
          { label: "Histórico", icon: "mdi:chart-line", cards: [{ demo: "chart" }] }] }),
    },
    left: {
      title: "Abas à esquerda", width: 300,
      // sem tab_size: a faixa lateral automática se mede pelo conteúdo
      cfg: { tab_position: "left", tab_display: "icon",
        paper_color: "blue-3", shell_color: "#123f6b", panel_min_height: 246,
        tabs: [{ label: "Sala", icon: "mdi:sofa", cards: [{ demo: "power" }] },
          { label: "Suíte", icon: "mdi:bed", cards: [{ demo: "chart" }] },
          { label: "Segurança", icon: "mdi:shield-home", cards: [{ title: "Tudo trancado" }] }] },
    },
    right: {
      title: "Abas à direita", width: 300,
      // com tab_size na mão: continua valendo, sem piso nem teto por cima
      cfg: { tab_position: "right", tab_display: "icon", tab_size: 56,
        paper_color: "green-3", shell_color: "#14532d", panel_min_height: 246,
        tabs: [{ label: "Casa", icon: "mdi:home", cards: [{ demo: "chart" }] },
          { label: "Ajustes", icon: "mdi:cog", cards: [{ title: "Ajustes" }] }] },
    },
    meio: {
      title: "Aba do meio ativa · dois recortes", width: 300,
      cfg: { paper_color: "violet-2", shell_color: "#4c1d95", default_tab: 1, tab_display: "text",
        panel_min_height: 180,
        tabs: [{ label: "Sala", icon: "mdi:sofa", cards: [{ title: "Sala" }] },
          { label: "Quarto", icon: "mdi:bed", cards: [{ demo: "awards" }] },
          { label: "Casa", icon: "mdi:home", cards: [{ title: "Casa" }] }] },
    },
    deitada: {
      title: "Abas deitadas (retrato) · ícone ao lado do rótulo", width: 320,
      // tab_rotate: true força o que o `auto` faz sozinho quando o APARELHO
      // está em retrato — é o caso do dono: faixa à direita ótima em paisagem
      // que virava «CO…» ao girar o telefone.
      cfg: { tab_position: "right", tab_display: "both", tab_rotate: true,
        paper_color: "paper", shell_color: "#7f1d1d", panel_min_height: 246,
        tabs: [{ label: "CORPO", icon: "mdi:human-handsup", cards: [{ demo: "chart" }] },
          { label: "VITAIS", icon: "mdi:heart-pulse", cards: [{ title: "Vitais" }] },
          { label: "COMPOSIÇÃO", icon: "mdi:scale-bathroom", cards: [{ title: "Composição" }] },
          { label: "COLETAS", icon: "mdi:history", cards: [{ title: "Coletas" }] }] },
    },
    deitada_esq: {
      title: "Deitadas à esquerda · leitura de baixo para cima", width: 320,
      cfg: { tab_position: "left", tab_display: "both", tab_rotate: true,
        paper_color: "blue-3", shell_color: "#123f6b", panel_min_height: 246,
        tabs: [{ label: "HOJE", icon: "mdi:calendar-today", cards: [{ demo: "chart" }] },
          { label: "SEMANA", icon: "mdi:calendar-week", cards: [{ title: "Semana" }] },
          { label: "AJUSTES", icon: "mdi:cog", cards: [{ title: "Ajustes" }] }] },
    },
    deitada_270: {
      title: "270° · só o texto gira (ícone de pé)", width: 320,
      cfg: { tab_position: "right", tab_display: "both", tab_rotate: true,
        tab_rotate_angle: "270", tab_rotate_what: "text",
        paper_color: "violet-2", shell_color: "#4c1d95", panel_min_height: 200,
        tabs: [{ label: "CORPO", icon: "mdi:human-handsup", cards: [{ demo: "chart" }] },
          { label: "COMPOSIÇÃO", icon: "mdi:scale-bathroom", cards: [{ title: "Composição" }] },
          { label: "AJUSTES", icon: "mdi:cog", cards: [{ title: "Ajustes" }] }] },
    },
    deitada_icone: {
      title: "Só o ÍCONE gira · rótulo de pé", width: 320,
      cfg: { tab_position: "left", tab_display: "both", tab_rotate: true,
        tab_rotate_what: "icon",
        paper_color: "green-3", shell_color: "#14532d", panel_min_height: 200,
        tabs: [{ label: "HOJE", icon: "mdi:calendar-today", cards: [{ demo: "chart" }] },
          { label: "MÊS", icon: "mdi:calendar-month", cards: [{ title: "Mês" }] }] },
    },
    plano: {
      title: "Sem relevo · abas centradas", width: 300,
      cfg: { paper_color: "red-4", shell_color: "#7f1d1d", elevation: false, tab_stretch: false,
        tab_display: "both", panel_min_height: 180,
        tabs: [{ label: "Hoje", icon: "mdi:chart-line", cards: [{ demo: "chart" }] },
          { label: "Ajustes", icon: "mdi:cog", cards: [{ title: "Ajustes" }] }] },
    },
  };
})();
