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

  const GLYPH = {
    "mdi:wallet": "▤", "mdi:trophy-outline": "♛", "mdi:sofa": "◧", "mdi:bed": "▭",
    "mdi:chevron-right": "›", "mdi:home": "⌂", "mdi:chart-line": "◹", "mdi:cog": "⚙",
    "mdi:flash": "⚡", "mdi:account": "☺", "mdi:account-heart": "♥", "mdi:shield-home": "⬟",
  };
  customElements.define("ha-icon", class extends HTMLElement {
    static get observedAttributes() { return ["icon"]; }
    _p() {
      this.style.cssText = "display:flex;align-items:center;justify-content:center;font-size:inherit;line-height:1";
      this.textContent = GLYPH[this.getAttribute("icon")] || "●";
    }
    attributeChangedCallback() { this._p(); }
    connectedCallback() { this._p(); }
  });

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
    plano: {
      title: "Sem relevo · abas centradas", width: 300,
      cfg: { paper_color: "red-4", shell_color: "#7f1d1d", elevation: false, tab_stretch: false,
        tab_display: "both", panel_min_height: 180,
        tabs: [{ label: "Hoje", icon: "mdi:chart-line", cards: [{ demo: "chart" }] },
          { label: "Ajustes", icon: "mdi:cog", cards: [{ title: "Ajustes" }] }] },
    },
  };
})();
