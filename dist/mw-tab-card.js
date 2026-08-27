/* mw-ha-tab-card — custom:mw-tab-card
 * Abas de verdade no Lovelace: cada aba guarda uma pilha de cards do HA.
 * A casca é o desenho de referência (painel de papel "fundido" com a aba
 * ativa por um recorte côncavo), com a mesma paleta de papel encardido e o
 * mesmo relevo 3D do MW Power Button Card.
 * Sem build, sem dependências: JS puro + <ha-form> do HA.
 * Repo: https://github.com/visaodeempresa/mw-ha-tab-card
 * Releases automáticas: merge na main → bump semântico → tag → HACS.
 */
(() => {
  "use strict";

  const DEFAULTS = {
    tab_position: "bottom",     // top | bottom | left | right
    tab_display: "both",        // icon | text | both
    // abas dividem a faixa em partes iguais. Só vale para faixa horizontal:
    // faixa vertical com abas esticadas vira um bloco de meia tela por aba e
    // deixa de parecer aba — lá elas são do tamanho do conteúdo, sempre.
    tab_stretch: true,
    tab_align: "",              // "" = automático: centro na horizontal, topo na vertical
    tab_size: 0,                // 0 = automático: 46px na horizontal; na vertical,
                                // do tamanho do conteúdo (entre 46 e 168px)
    tab_font_size: 11,
    tab_icon_size: 20,
    // ORIENTAÇÃO. Faixa lateral que fica ótima em paisagem some em retrato:
    // a mesma aba que tinha 120px de largura passa a ter 60 e o rótulo vira
    // «CO…». `tab_rotate` deita a aba (ícone e texto juntos, girados), e os
    // blocos `portrait:` / `landscape:` sobrescrevem QUALQUER chave visual só
    // naquela orientação — inclusive `tab_position`.
    tab_rotate: "auto",         // auto | true | false  (auto = deita a faixa
                                // lateral quando o aparelho está em retrato)
    tab_rotate_angle: "auto",   // auto | 90 | 270   (auto = 90 à direita, 270 à
                                // esquerda — é o sentido que o olho espera)
    tab_rotate_what: "both",    // both | text | icon — o que gira. O modo de
                                // escrita vertical gira só o TEXTO: `ha-icon`
                                // é elemento substituído e não acompanha, por
                                // isso o ícone leva um transform próprio.
    tab_rotate_dir: "auto",     // LEGADO: cw = 90, ccw = 270
    default_tab: 0,
    remember_tab: false,        // guarda a aba escolhida no navegador
    keep_alive: true,           // aba já aberta continua montada ao trocar
    preload: false,             // monta todas as abas de uma vez
    header: "",
    header_icon: "",
    header_inset: 26,
    header_overlap: 16,
    paper_color: "paper",
    shell_color: "#a5123f",
    header_color: "",           // vazio = clareia a casca sozinho
    header_text_color: "rgba(255, 255, 255, 0.92)",
    tab_active_color: "#1a1a1a",
    tab_inactive_color: "rgba(255, 255, 255, 0.78)",
    content_text_color: "#1a1a1a",
    shell_radius: 26,
    panel_radius: 22,
    notch_radius: 14,
    padding: 14,
    content_padding: 18,
    card_gap: 12,
    panel_min_height: 0,
    elevation: true,            // relevo 3D (neumórfico) no painel de papel
    flat_children: true,        // apaga fundo/sombra dos cards de dentro
    haptic: true,
    tabs: [],
  };

  const POSITIONS = ["top", "bottom", "left", "right"];
  // faixa vertical automática: nunca mais fina que a horizontal (46px, para o
  // ícone não ficar espremido) nem mais larga que o rótulo pede — e nunca
  // passando de SIDE_MAX / 45% do card, senão a aba come o painel.
  const SIDE_MIN = 46;
  const SIDE_MAX = 168;
  const DISPLAYS = ["icon", "text", "both"];
  const ALIGNS = ["start", "center", "end"];
  // faixa horizontal: a fila centrada é o que o desenho de referência mostra.
  // Vertical: começando no topo — fila de abas centrada na lateral flutua e
  // não se lê como abas.
  const autoAlign = (horiz) => (horiz ? "center" : "start");
  const alignOf = (cfg, horiz) =>
    (ALIGNS.includes(cfg.tab_align) ? cfg.tab_align : autoAlign(horiz));

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

  // >>> paper-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-palette/paper-palette.js
  // 49 papéis encardidos: 7 matizes do arco-íris × 7 tons (1 = quase branco,
  // 7 = mais encardido). Saturação baixa de propósito — papel descansa a vista.
  const PAPER_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_TONES = [[97, 6], [96, 9], [94, 12], [92, 15], [90, 18], [88, 21], [85, 24]];
  const PAPER_DEFAULT = "linear-gradient(145deg, #fdfaf3, #e8e3d8)";
  const paperGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DEFAULT;
    const hue = PAPER_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DEFAULT;
    const [l, s] = PAPER_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 4}%, ${l - 7}%))`;
  };
  const paperOptions = () => [{ value: "paper", label: "Papel original (creme)" }].concat(
    ...PAPER_HUES.map((h) => PAPER_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais encardido)" : ""}`,
    }))));
  // <<< paper-palette v1

  // Os dois extremos do mesmo gradiente, em cor sólida. O recorte côncavo que
  // funde a aba ativa ao painel tem 14 px: pintá-lo com o gradiente inteiro
  // deixaria uma emenda visível, porque o gradiente recomeçaria dentro do
  // quadradinho. Sólido no tom do canto certo (claro em cima, encardido
  // embaixo) é indistinguível a olho e não emenda.
  const paperStops = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    const hue = m && PAPER_HUES.find((h) => h[0] === m[1]);
    if (!hue) return ["#fdfaf3", "#e8e3d8"];
    const [l, s] = PAPER_TONES[+m[2] - 1];
    return [`hsl(${hue[2]}, ${s}%, ${l}%)`, `hsl(${hue[2]}, ${s + 4}%, ${l - 7}%)`];
  };

  // ---- cor: parse / compose (mantém alfa, que o desenho usa muito) ----
  const parseColor = (str) => {
    const s = String(str || "").trim();
    let m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }; }
    m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) { const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16)); return { r, g, b, a: 1 }; }
    return { r: 128, g: 128, b: 128, a: 1 };
  };
  const toHex = ({ r, g, b }) =>
    "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const toRgba = ({ r, g, b, a }) => `rgba(${r}, ${g}, ${b}, ${a})`;
  // clareia misturando com branco — a faixa de título da referência é a casca
  // um degrau acima, não uma segunda cor que o dono tenha que acertar à mão
  const lighten = (color, amount) => {
    const { r, g, b, a } = parseColor(color);
    const mix = (v) => Math.round(v + (255 - v) * amount);
    return toRgba({ r: mix(r), g: mix(g), b: mix(b), a });
  };

  // feedback táctil: o app companion escuta o evento "haptic" na window e
  // chama o motor nativo; fora dele cai no navigator.vibrate (o Safari do
  // iPhone não vibra em página nenhuma, só dentro do companion).
  const haptic = (kind) => {
    try {
      window.dispatchEvent(new CustomEvent("haptic",
        { bubbles: true, composed: true, detail: kind }));
      const bridged = !!(window.externalApp || window.webkit?.messageHandlers?.externalBus);
      if (!bridged && navigator.vibrate) navigator.vibrate(kind === "medium" ? 20 : 8);
    } catch (_) { /* vibração é enfeite: nunca pode derrubar o toque */ }
  };

  /* ------------------------------------------------------------------ CARD */

  const RETRATO = "(orientation: portrait)";

  class MwTabCard extends HTMLElement {
    /** "portrait" | "landscape" — do APARELHO, que é o que o dono percebe. */
    _orient() {
      try {
        return window.matchMedia(RETRATO).matches ? "portrait" : "landscape";
      } catch (_) {
        return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
      }
    }

    /** base + o bloco da orientação atual. `tabs` nunca é sobrescrito. */
    _aplicarOrientacao() {
      const base = this._base || {};
      const extra = { ...(base[this._orientAtual] || {}) };
      delete extra.tabs;
      delete extra.portrait;
      delete extra.landscape;
      const antes = this._config;
      this._config = { ...base, ...extra };
      this._config.tabs = base.tabs;
      if (!antes || antes.tab_position !== this._config.tab_position
          || antes.tab_rotate !== this._config.tab_rotate) this._styled = false;
    }

    connectedCallback() {
      if (this._mqOrient) return;
      try {
        this._mqOrient = window.matchMedia(RETRATO);
        this._onOrient = () => {
          const novo = this._orient();
          if (novo === this._orientAtual) return;
          this._orientAtual = novo;
          if (!this._base) return;
          this._aplicarOrientacao();
          this._styled = false;
          this._render();
        };
        // Safari antigo só tem addListener
        if (this._mqOrient.addEventListener) this._mqOrient.addEventListener("change", this._onOrient);
        else this._mqOrient.addListener(this._onOrient);
      } catch (_) { /* sem matchMedia: fica na orientação do primeiro render */ }
    }

    disconnectedCallback() {
      if (!this._mqOrient) return;
      if (this._mqOrient.removeEventListener) this._mqOrient.removeEventListener("change", this._onOrient);
      else this._mqOrient.removeListener(this._onOrient);
      this._mqOrient = null;
    }

    setConfig(config) {
      if (!config || !Array.isArray(config.tabs) || config.tabs.length === 0) {
        throw new Error("mw-tab-card: defina ao menos uma aba em 'tabs'");
      }
      const cfg = { ...DEFAULTS, ...config };
      cfg.tabs = config.tabs.map((t) => ({
        ...t,
        cards: Array.isArray(t.cards) ? t.cards : [],
      }));
      const before = this._config;
      this._base = cfg;
      this._orientAtual = this._orient();
      this._aplicarOrientacao();

      // troca de config = os filhos podem ter mudado; joga fora e remonta.
      // Comparar por JSON é barato perto de recriar cards à toa a cada
      // repintura do editor (e o editor repinta a cada tecla).
      const sig = JSON.stringify(cfg.tabs.map((t) => t.cards));
      if (sig !== this._cardsSig) {
        this._cardsSig = sig;
        this._panes = null;
      }
      if (!before || before.tab_position !== this._config.tab_position) this._styled = false;

      this._active = this._pickInitialTab();
      this._render();
    }

    _pickInitialTab() {
      const n = this._config.tabs.length;
      if (this._active != null && this._active < n && this._userPicked) return this._active;
      let i = num(this._config.default_tab, 0);
      if (this._config.remember_tab) {
        const saved = Number(this._storeGet());
        if (Number.isFinite(saved) && saved >= 0 && saved < n) i = saved;
      }
      return Math.min(Math.max(0, Math.round(i)), n - 1);
    }

    _storeKey() {
      const t = this._config.tabs.map((x) => x.label || x.icon || "").join("|");
      return `mw-tab-card:${t}`;
    }
    _storeGet() { try { return window.localStorage.getItem(this._storeKey()); } catch (_) { return null; } }
    _storeSet(v) { try { window.localStorage.setItem(this._storeKey(), String(v)); } catch (_) { /* modo privado */ } }

    set hass(hass) {
      this._hass = hass;
      if (!this._config) return;
      if (!this._panes) { this._render(); return; }
      for (const pane of this._panes.values()) {
        for (const el of pane.children) el.hass = hass;
      }
    }
    get hass() { return this._hass; }

    // o HA marca os cards quando o dashboard está em edição; repassar para os
    // filhos é o que faz o card de dentro mostrar a moldura de edição dele
    set editMode(v) {
      this._editMode = v;
      if (!this._panes) return;
      for (const pane of this._panes.values()) {
        for (const el of pane.children) el.editMode = v;
      }
    }
    get editMode() { return this._editMode; }

    static getConfigElement() { return document.createElement("mw-tab-card-editor"); }

    static getStubConfig() {
      return {
        header: "UPDATE PAYMENT METHOD",
        tabs: [
          {
            label: "My Wallet", icon: "mdi:wallet",
            cards: [{ type: "markdown", content: "### 983\nTotal Hours" }],
          },
          {
            label: "My Awards", icon: "mdi:trophy-outline",
            cards: [{ type: "markdown", content: "Sem prêmios ainda." }],
          },
        ],
      };
    }

    // soma do que a aba ativa mostra + a casca; getCardSize dos filhos pode
    // devolver Promise (card lazy), então esta é assíncrona de propósito
    async getCardSize() {
      const pane = this._panes && this._panes.get(this._active);
      let total = 0;
      for (const el of (pane ? pane.children : [])) {
        try { total += (await (el.getCardSize ? el.getCardSize() : 1)) || 1; } catch (_) { total += 1; }
      }
      return Math.max(3, Math.round(total) + 2);
    }

    getLayoutOptions() { return { grid_min_rows: 3 }; }

    _pos() { return POSITIONS.includes(this._config.tab_position) ? this._config.tab_position : "bottom"; }
    _horizontal() { const p = this._pos(); return p === "top" || p === "bottom"; }

    /** Deitar a aba só faz sentido em faixa VERTICAL — na horizontal ela já
     *  tem todo o comprimento do card para o rótulo. */
    _deitada() {
      if (this._horizontal()) return false;
      const r = this._config.tab_rotate;
      if (r === true || r === "true" || r === "sempre") return true;
      if (r === false || r === "false" || r === "nunca") return false;
      return this._orientAtual === "portrait";   // "auto"
    }

    /** Ângulo da aba deitada: 90 (leitura de cima para baixo) ou 270 (de
     *  baixo para cima). `auto` = 90 à direita e 270 à esquerda, que é o que o
     *  olho espera de aba lateral. `tab_rotate_dir` continua valendo como
     *  atalho antigo (cw = 90, ccw = 270). */
    _angulo() {
      const a = String(this._config.tab_rotate_angle ?? "auto");
      if (a === "90" || a === "270") return +a;
      if (a === "-90") return 270;
      const d = this._config.tab_rotate_dir;
      if (d === "cw") return 90;
      if (d === "ccw") return 270;
      return this._pos() === "left" ? 270 : 90;
    }

    /** Compatibilidade: o CSS ainda pensa em cw/ccw. */
    _sentido() { return this._angulo() === 270 ? "ccw" : "cw"; }

    /** O que gira: `both` (padrão), só o `text` ou só o `icon`. */
    _oQueGira() {
      const v = String(this._config.tab_rotate_what || "both").toLowerCase();
      return ["both", "text", "icon"].includes(v) ? v : "both";
    }

    /* ---------------- estrutura (montada uma vez) ---------------- */

    _ensureDom() {
      if (this.shadowRoot && this._els) return;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style id="mw-style"></style>
        <ha-card class="shell">
          <div class="hdr" hidden></div>
          <div class="body">
            <div class="panel"></div>
            <div class="tabs" role="tablist"></div>
          </div>
        </ha-card>`;
      this._els = {
        style: this.shadowRoot.getElementById("mw-style"),
        shell: this.shadowRoot.querySelector(".shell"),
        hdr: this.shadowRoot.querySelector(".hdr"),
        body: this.shadowRoot.querySelector(".body"),
        panel: this.shadowRoot.querySelector(".panel"),
        tabs: this.shadowRoot.querySelector(".tabs"),
      };
      this._els.tabs.addEventListener("keydown", (ev) => this._onKey(ev));
    }

    _render() {
      this._ensureDom();
      if (!this._styled) { this._els.style.textContent = this._css(); this._styled = true; }
      this._paintVars();
      this._paintHeader();
      this._paintTabs();
      this._mountCards();
    }

    /* ---------------- CSS (só muda quando a posição muda) ---------------- */

    _css() {
      const pos = this._pos();
      const horiz = this._horizontal();
      // recorte côncavo: um quadrado de --nr colado na aba ativa, pintado de
      // papel e com um quarto de disco apagado por máscara. É o que faz a aba
      // "derreter" no painel em vez de encostar nele em ângulo reto.
      const notch = (sel, place, circle) => `
        .body .tab.active::${sel}{${place}
          -webkit-mask:radial-gradient(circle at ${circle}, transparent 0 var(--nr), #000 calc(var(--nr) + 0.5px));
                  mask:radial-gradient(circle at ${circle}, transparent 0 var(--nr), #000 calc(var(--nr) + 0.5px));}`;
      const notches = {
        bottom: notch("before", "top:0;right:100%;", "0 100%") + notch("after", "top:0;left:100%;", "100% 100%"),
        top: notch("before", "bottom:0;right:100%;", "0 0") + notch("after", "bottom:0;left:100%;", "100% 0"),
        left: notch("before", "bottom:100%;right:0;", "0 0") + notch("after", "top:100%;right:0;", "0 100%"),
        right: notch("before", "bottom:100%;left:0;", "100% 0") + notch("after", "top:100%;left:0;", "100% 100%"),
      }[pos];
      const flow = {
        bottom: "column", top: "column-reverse", left: "row-reverse", right: "row",
      }[pos];
      // respiro da aba: PAD_LEN corre ao longo da faixa, PAD_CROSS atravessa
      // ela. Na horizontal a espessura vem toda de --tsize, então o respiro
      // que atravessa é zero; na vertical o mesmo 14px de antes corre ao
      // longo da faixa — é o que dá à aba lateral a mesma proporção da de
      // cima/baixo em vez de uma tira mais larga que comprida.
      const PAD_LEN = "14px";
      const PAD_CROSS = horiz ? "0px" : "10px";
      // 1px de sobreposição contra a costura de subpixel entre aba e painel.
      // ARMADILHA: escrever `padding-left:1px` seco APAGA o respiro do lado
      // que encosta no painel (o atalho `padding` já passou) e joga ícone e
      // texto da aba ativa para dentro — 3,5px de desalinho em relação às
      // abas inativas na faixa vertical. Somar, nunca substituir.
      const seam = {
        bottom: `margin-top:-1px;padding-top:calc(${PAD_CROSS} + 1px);`,
        top: `margin-bottom:-1px;padding-bottom:calc(${PAD_CROSS} + 1px);`,
        left: `margin-right:-1px;padding-right:calc(${PAD_CROSS} + 1px);`,
        right: `margin-left:-1px;padding-left:calc(${PAD_CROSS} + 1px);`,
      }[pos];
      const tabRadius = {
        bottom: "border-radius:0 0 var(--tr) var(--tr);",
        top: "border-radius:var(--tr) var(--tr) 0 0;",
        left: "border-radius:var(--tr) 0 0 var(--tr);",
        right: "border-radius:0 var(--tr) var(--tr) 0;",
      }[pos];

      return `
        :host{display:block;}
        ha-card.shell{position:relative;box-sizing:border-box;height:100%;overflow:visible;
          background:var(--mw-shell);border:none;border-radius:var(--sr);padding:var(--pad);
          box-shadow:0 6px 18px rgba(0,0,0,0.26), 0 18px 40px rgba(0,0,0,0.16);
          font-family:var(--mw-font, inherit);}
        .hdr{position:relative;z-index:0;margin:0 var(--hdr-inset) calc(-1 * var(--hdr-lap));
          padding:11px 16px calc(var(--hdr-lap) + 9px);
          background:var(--mw-hdr);color:var(--mw-hdr-text);
          border-radius:var(--pr) var(--pr) 0 0;
          display:flex;align-items:center;justify-content:center;gap:8px;
          font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;line-height:1;}
        .hdr[hidden]{display:none;}
        .body{position:relative;z-index:1;display:flex;flex-direction:${flow};height:100%;}
        .panel{flex:1 1 auto;min-width:0;box-sizing:border-box;position:relative;z-index:2;
          background:var(--mw-paper);box-shadow:var(--mw-elev);
          border-radius:var(--pr-tl) var(--pr-tr) var(--pr-br) var(--pr-bl);
          padding:var(--cpad);min-height:var(--panel-min);
          color:var(--mw-content-text);
          --primary-text-color:var(--mw-content-text);
          --secondary-text-color:var(--mw-content-text-soft);
          --ha-card-header-color:var(--mw-content-text);}
        .panel.flat{--ha-card-background:transparent;--ha-card-box-shadow:none;
          --ha-card-border-width:0;--ha-card-border-color:transparent;}
        .pane{display:none;flex-direction:column;gap:var(--gap);}
        .pane.on{display:flex;}
        .pane > *{display:block;}
        .empty{opacity:.55;font-size:13px;text-align:center;padding:22px 8px;}
        .tabs{position:relative;z-index:1;display:flex;
          ${horiz ? "flex-direction:row;height:var(--tsize);"
            : "flex-direction:column;width:var(--tsize);max-width:var(--tmax);"
              // o ícone manda no piso: espessura menor que ele o faria vazar
              // da aba (ha-icon é flex:none) e sair ilegível por cima da casca
              + "min-width:max(var(--tmin), calc(var(--tis) + 8px));"}
          justify-content:var(--talign);}
        .tab{appearance:none;-webkit-appearance:none;border:0;background:transparent;cursor:pointer;
          font-family:inherit;font-size:var(--tfs);font-weight:800;letter-spacing:0.1em;
          text-transform:uppercase;line-height:1.1;color:var(--mw-tab-off);
          position:relative;box-sizing:border-box;min-width:0;min-height:0;
          display:flex;align-items:center;justify-content:center;gap:7px;
          padding:${horiz ? `${PAD_CROSS} ${PAD_LEN}` : `${PAD_LEN} ${PAD_CROSS}`};
          ${horiz ? "" : "flex-direction:column;text-align:center;min-height:var(--tminlen);"}
          -webkit-tap-highlight-color:transparent;touch-action:manipulation;
          transition:color .22s ease;}
        .tab.stretch{flex:1 1 0;}
        .tab .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;}
        /* ABA DEITADA — gira o CONTEUDO, nunca o botao.
           Modo de escrita vertical em vez de transform rotate: com transform a
           caixa continuaria do tamanho de antes e o rotulo longo vazaria.
           E quem deita e a caixa .in, que so tem icone e rotulo dentro — o
           BOTAO carrega a casca, o papel e o recorte concavo que funde a aba
           ativa ao painel, e girar isso junto desencaixava a aba do painel. */
        .tab.rot{flex-direction:row;padding:${PAD_LEN} ${PAD_CROSS};}
        .tab.rot .in{display:inline-flex;align-items:center;justify-content:center;
          gap:7px;writing-mode:vertical-rl;text-align:center;}
        .tab.rot.ccw .in{transform:rotate(180deg);}
        .tab.rot .in .lbl{max-width:none;max-height:100%;}
        .tab.rot .in ha-icon{--mdc-icon-size:var(--tis);}
        /* O ha-icon é elemento SUBSTITUÍDO: writing-mode gira o texto e passa
           por ele em branco. Quem gira o ícone é este transform. */
        .tab.rot.gira-icone .in ha-icon{transform:rotate(90deg);}
        /* só o ÍCONE gira: a caixa volta ao fluxo normal e o rótulo fica de pé */
        .tab.rot.so-icone .in{writing-mode:horizontal-tb;flex-direction:column;
          transform:none;}
        .tab.rot.so-icone.ccw .in ha-icon{transform:rotate(270deg);}
        .tab.rot.so-icone .in .lbl{max-width:100%;max-height:none;}
        .tab ha-icon{--mdc-icon-size:var(--tis);width:var(--tis);height:var(--tis);flex:none;line-height:0;}
        .tab:focus-visible{outline:2px solid var(--mw-tab-on);outline-offset:-4px;}
        .tab.active{color:var(--mw-tab-on);background:var(--mw-paper);${tabRadius}${seam}}
        .tab.active::before,.tab.active::after{content:"";position:absolute;
          width:var(--nr);height:var(--nr);background:var(--mw-notch);pointer-events:none;}
        .tab.active.flush-s::before{display:none;}
        .tab.active.flush-e::after{display:none;}
        ${notches}
        @media (prefers-reduced-motion:reduce){.tab{transition:none;}}`;
    }

    /* ---------------- variáveis (cor, medida, raio) ---------------- */

    _paintVars() {
      const c = this._config;
      const pos = this._pos();
      const horiz = this._horizontal();
      const n = c.tabs.length;
      const active = Math.min(Math.max(0, this._active | 0), n - 1);
      // esticar é opção só na faixa horizontal (ver DEFAULTS.tab_stretch)
      const stretch = horiz ? c.tab_stretch !== false : false;
      const align = alignOf(c, horiz);
      this._stretch = stretch;

      const pr = num(c.panel_radius, 22);
      const nr = num(c.notch_radius, 14);
      const flushS = stretch ? active === 0 : (align === "start" && active === 0);
      const flushE = stretch ? active === n - 1 : (align === "end" && active === n - 1);
      this._flush = { s: flushS, e: flushE };

      // o canto do painel do lado onde a aba ativa encosta na borda vira reto:
      // é o que dá a impressão de uma folha só, recortada
      const R = {
        tl: pr, tr: pr, br: pr, bl: pr,
      };
      if (pos === "bottom") { if (flushS) R.bl = 0; if (flushE) R.br = 0; }
      if (pos === "top") { if (flushS) R.tl = 0; if (flushE) R.tr = 0; }
      if (pos === "left") { if (flushS) R.tl = 0; if (flushE) R.bl = 0; }
      if (pos === "right") { if (flushS) R.tr = 0; if (flushE) R.br = 0; }

      const [c1, c2] = paperStops(c.paper_color);
      // canto claro em cima, encardido embaixo — segue o 145deg do gradiente
      const notchColor = (pos === "bottom" || pos === "right") ? c2 : c1;
      const shell = c.shell_color || DEFAULTS.shell_color;
      const contentText = c.content_text_color || DEFAULTS.content_text_color;
      const soft = parseColor(contentText);

      const s = this._els.shell.style;
      const set = (k, v) => s.setProperty(k, String(v));
      set("--mw-shell", shell);
      set("--mw-hdr", c.header_color || lighten(shell, 0.1));
      set("--mw-hdr-text", c.header_text_color || DEFAULTS.header_text_color);
      set("--mw-paper", paperGradient(c.paper_color));
      set("--mw-notch", notchColor);
      set("--mw-tab-on", c.tab_active_color || DEFAULTS.tab_active_color);
      set("--mw-tab-off", c.tab_inactive_color || DEFAULTS.tab_inactive_color);
      set("--mw-content-text", contentText);
      set("--mw-content-text-soft", toRgba({ ...soft, a: 0.68 }));
      set("--mw-elev", c.elevation === false ? "none"
        : "0 2px 6px rgba(0,0,0,0.18),0 6px 16px rgba(0,0,0,0.14),0 12px 28px rgba(0,0,0,0.08),"
        + "inset 4px 4px 8px rgba(255,252,240,0.90),inset -4px -4px 8px rgba(0,0,0,0.12)");
      set("--sr", `${num(c.shell_radius, 26)}px`);
      set("--pr", `${pr}px`);
      set("--nr", `${nr}px`);
      set("--tr", `${pr}px`);
      set("--pr-tl", `${R.tl}px`); set("--pr-tr", `${R.tr}px`);
      set("--pr-br", `${R.br}px`); set("--pr-bl", `${R.bl}px`);
      set("--pad", `${num(c.padding, 14)}px`);
      set("--cpad", `${num(c.content_padding, 18)}px`);
      set("--gap", `${num(c.card_gap, 12)}px`);
      set("--panel-min", `${num(c.panel_min_height, 0)}px`);
      // Espessura da faixa. Horizontal: 46px por padrão, como sempre.
      // Vertical: "automático" agora é do tamanho do conteúdo, entre SIDE_MIN
      // e SIDE_MAX — os 104px fixos de antes sobravam largura numa faixa só
      // de ícones (aba de 104×40: mais larga que comprida, e o painel perdia
      // um terço do card). tab_size explícito continua mandando.
      const tsz = num(c.tab_size, 0);
      const deitada = this._deitada();
      // faixa deitada é sempre fina: o rótulo cresce para BAIXO, não para o
      // lado, então o painel não perde largura como perdia em retrato
      const sideAuto = !horiz && !tsz && !deitada;
      set("--tsize", tsz ? `${tsz}px`
        : (horiz || deitada ? `${SIDE_MIN}px` : "max-content"));
      set("--tmin", sideAuto ? `${SIDE_MIN}px` : "0px");
      set("--tmax", sideAuto ? `min(${SIDE_MAX}px, 45%)` : "none");
      // sem isso o arredondamento --tr das duas quinas de fora se encontra no
      // meio e a aba vira uma pastilha.
      // Comprimento mínimo da aba lateral. Deitada, quem manda é o rótulo
      // girado — um piso fixo empurraria as abas para fora do card.
      set("--tminlen", deitada ? "0px" : `${Math.max(2 * pr + 6, 2 * nr + 14)}px`);
      set("--tfs", `${num(c.tab_font_size, 11)}px`);
      set("--tis", `${num(c.tab_icon_size, 20)}px`);
      set("--hdr-inset", `${num(c.header_inset, 26)}px`);
      set("--hdr-lap", `${num(c.header_overlap, 16)}px`);
      set("--talign", align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center");

      this._els.panel.classList.toggle("flat", c.flat_children !== false);
      this._active = active;
    }

    _paintHeader() {
      const c = this._config;
      const has = !!(c.header || c.header_icon);
      this._els.hdr.hidden = !has;
      if (!has) return;
      this._els.hdr.innerHTML =
        `${c.header ? `<span>${esc(c.header)}</span>` : ""}` +
        `${c.header_icon ? `<ha-icon icon="${esc(c.header_icon)}" style="--mdc-icon-size:16px;width:16px;height:16px;"></ha-icon>` : ""}`;
    }

    /* ---------------- faixa de abas ---------------- */

    _paintTabs() {
      const c = this._config;
      const stretch = this._stretch;
      const rot = this._deitada();
      const gira = this._oQueGira();
      const gDisp = DISPLAYS.includes(c.tab_display) ? c.tab_display : "both";
      const html = c.tabs.map((t, i) => {
        const disp = DISPLAYS.includes(t.display) ? t.display : gDisp;
        const label = t.label ?? "";
        const icon = t.icon ?? "";
        // aba sem ícone configurado não vira caixa vazia: cai para o texto
        const showIcon = icon && disp !== "text";
        const showText = label && (disp !== "icon" || !showIcon);
        const on = i === this._active;
        const cls = ["tab"];
        // Deitar aba que só mostra ÍCONE não economiza nada — não há rótulo
        // para caber — e ainda deita um ícone que tem lado certo (uma seta
        // deitada aponta para o lugar errado). Só deita quando há texto.
        if (rot && showText) {
          cls.push("rot", this._sentido());
          if (gira !== "text") cls.push("gira-icone");
          if (gira === "icon") cls.push("so-icone");
        }
        if (on) cls.push("active");
        if (stretch) cls.push("stretch");
        if (on && this._flush.s) cls.push("flush-s");
        if (on && this._flush.e) cls.push("flush-e");
        // O conteúdo sai daqui montado: quando a aba deita, ícone e rótulo vão
        // dentro de uma caixa própria — é ELA que gira, não o botão.
        const miolo = (showIcon ? `<ha-icon icon="${esc(icon)}"></ha-icon>` : "")
          + (showText ? `<span class="lbl">${esc(label)}</span>` : "");
        const conteudo = cls.includes("rot") ? `<span class="in">${miolo}</span>` : miolo;
        return `<button class="${cls.join(" ")}" role="tab" data-i="${i}"
          aria-selected="${on}" tabindex="${on ? 0 : -1}"
          title="${esc(label)}">${conteudo}</button>`;
      }).join("");
      this._els.tabs.innerHTML = html;
      this._els.tabs.querySelectorAll(".tab").forEach((el) =>
        el.addEventListener("click", () => this._select(+el.dataset.i, true)));
    }

    _onKey(ev) {
      const horiz = this._horizontal();
      const n = this._config.tabs.length;
      const prev = horiz ? "ArrowLeft" : "ArrowUp";
      const next = horiz ? "ArrowRight" : "ArrowDown";
      let i = null;
      if (ev.key === prev) i = (this._active - 1 + n) % n;
      else if (ev.key === next) i = (this._active + 1) % n;
      else if (ev.key === "Home") i = 0;
      else if (ev.key === "End") i = n - 1;
      if (i === null) return;
      ev.preventDefault();
      this._select(i, true);
      const el = this._els.tabs.querySelector(`.tab[data-i="${i}"]`);
      if (el && el.focus) el.focus();
    }

    _select(i, fromUser) {
      if (i === this._active || !Number.isFinite(i)) return;
      this._active = i;
      if (fromUser) {
        this._userPicked = true;
        if (this._config.haptic !== false) haptic("light");
        if (this._config.remember_tab) this._storeSet(i);
      }
      this._paintVars();
      this._paintTabs();
      this._mountCards();
    }

    /* ---------------- cards de dentro ---------------- */

    async _mountCards() {
      const c = this._config;
      if (!this._panes) { this._panes = new Map(); this._els.panel.innerHTML = ""; }

      const want = c.preload === true
        ? c.tabs.map((_, i) => i)
        : [this._active];

      for (const i of want) {
        if (!this._panes.has(i)) await this._buildPane(i);
      }
      // keep_alive desligado: só a aba visível continua montada
      if (c.keep_alive === false && c.preload !== true) {
        for (const [i, pane] of [...this._panes.entries()]) {
          if (i !== this._active) { pane.remove(); this._panes.delete(i); }
        }
      }
      for (const [i, pane] of this._panes.entries()) pane.classList.toggle("on", i === this._active);
    }

    async _buildPane(i) {
      const tab = this._config.tabs[i];
      const pane = document.createElement("div");
      pane.className = "pane";
      pane.dataset.i = String(i);
      // ordem importa: o painel desenha as abas na ordem do YAML, não na
      // ordem em que o dono foi clicando nelas
      const after = [...this._panes.entries()].filter(([k]) => k < i).length;
      this._els.panel.insertBefore(pane, this._els.panel.children[after] || null);
      this._panes.set(i, pane);

      const cards = tab.cards || [];
      if (!cards.length) {
        pane.innerHTML = `<div class="empty">Aba «${esc(tab.label || i + 1)}» sem cards — adicione no editor.</div>`;
        return;
      }
      const helpers = await this._helpers();
      for (const cfg of cards) pane.appendChild(this._createCard(helpers, cfg));
    }

    async _helpers() {
      if (!this._helpersP) {
        this._helpersP = (window.loadCardHelpers
          ? window.loadCardHelpers()
          : Promise.resolve(null));
      }
      return this._helpersP;
    }

    _createCard(helpers, cfg) {
      let el;
      try {
        el = helpers ? helpers.createCardElement(cfg) : document.createElement("hui-error-card");
      } catch (e) {
        el = document.createElement("div");
        el.textContent = `mw-tab-card: card inválido (${e && e.message ? e.message : e})`;
        el.style.cssText = "padding:12px;border-radius:10px;background:rgba(200,0,0,.12);font-size:13px;";
        return el;
      }
      if (this._hass) el.hass = this._hass;
      if (this._editMode !== undefined) el.editMode = this._editMode;
      // ll-rebuild: o card de dentro pede para ser recriado (é o contrato que
      // as pilhas do HA respeitam). Sem isto, um card que troca de tipo em
      // tempo de execução fica congelado no que era antes.
      el.addEventListener("ll-rebuild", (ev) => {
        ev.stopPropagation();
        const novo = this._createCard(helpers, cfg);
        if (el.parentNode) el.parentNode.replaceChild(novo, el);
      });
      return el;
    }
  }

  /* ---------------------------- EDITOR VISUAL ---------------------------- */

  const LABELS = {
    header: "Faixa de título (opcional)",
    header_icon: "Ícone da faixa de título",
    header_inset: "Faixa de título: recuo lateral",
    header_overlap: "Faixa de título: quanto o painel cobre",
    tab_position: "Posição das abas",
    tab_display: "O que aparece na aba",
    tab_stretch: "Abas dividem a faixa em partes iguais",
    tab_align: "Onde a fila de abas encosta",
    tab_size: "Espessura da faixa de abas (0 = automático: na lateral, do tamanho do conteúdo)",
    tab_rotate: "Deitar a aba lateral (ícone e texto girados juntos)",
    tab_rotate_angle: "Ângulo da aba deitada",
    tab_rotate_what: "O que gira na aba deitada",
    tab_font_size: "Tamanho do texto da aba",
    tab_icon_size: "Tamanho do ícone da aba",
    default_tab: "Aba inicial",
    remember_tab: "Lembrar a última aba aberta (neste navegador)",
    keep_alive: "Manter as abas já abertas montadas",
    preload: "Montar todas as abas de uma vez",
    paper_color: "Cor do papel (painel)",
    shell_radius: "Arredondamento da casca",
    panel_radius: "Arredondamento do painel",
    notch_radius: "Recorte côncavo (fusão aba↔painel)",
    padding: "Respiro entre casca e painel",
    content_padding: "Respiro interno do painel",
    card_gap: "Espaço entre os cards de dentro",
    panel_min_height: "Altura mínima do painel",
    elevation: "Relevo 3D no painel (papel do MW Power Button)",
    flat_children: "Achatar os cards de dentro (sem fundo nem sombra)",
    haptic: "Vibrar ao trocar de aba",
    // cores (seção própria)
    shell_color: "Casca (fundo do card)",
    header_color: "Faixa de título (vazio = clareia a casca)",
    header_text_color: "Texto da faixa de título",
    tab_active_color: "Aba ativa: texto",
    tab_inactive_color: "Aba inativa: texto",
    content_text_color: "Texto dentro do painel",
    // por aba
    label: "Texto da aba",
    icon: "Ícone da aba",
    display: "O que aparece nesta aba",
  };

  const COLOR_FIELDS = ["shell_color", "header_color", "header_text_color",
    "tab_active_color", "tab_inactive_color", "content_text_color"];

  const POS_OPTIONS = [
    { value: "bottom", label: "Embaixo" }, { value: "top", label: "Em cima" },
    { value: "left", label: "À esquerda" }, { value: "right", label: "À direita" },
  ];
  const DISP_OPTIONS = [
    { value: "both", label: "Ícone e texto" }, { value: "icon", label: "Só ícone" },
    { value: "text", label: "Só texto" },
  ];

  // Os editores internos do HA (hui-card-picker / hui-card-element-editor) não
  // vêm carregados: só entram quando alguma tela de edição os pede. Instanciar
  // o editor da pilha vertical puxa os dois de uma vez. Se não vier (versão
  // antiga do HA), o editor cai no textarea JSON — feio, mas nunca sem saída.
  const loadHuiEditors = async () => {
    if (customElements.get("hui-card-element-editor")) return true;
    try {
      const helpers = await window.loadCardHelpers();
      const stack = helpers.createCardElement({ type: "vertical-stack", cards: [] });
      await stack.constructor.getConfigElement();
      await Promise.race([
        customElements.whenDefined("hui-card-element-editor"),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    } catch (_) { /* segue no plano B */ }
    return !!customElements.get("hui-card-element-editor");
  };

  const cardTitle = (cfg) => {
    if (!cfg || typeof cfg !== "object") return "card inválido";
    const t = String(cfg.type || "?").replace(/^custom:/, "");
    const extra = cfg.title || cfg.name || cfg.entity
      || (Array.isArray(cfg.entities) ? `${cfg.entities.length} entidades` : "");
    return extra ? `${t} · ${extra}` : t;
  };

  class MwTabCardEditor extends HTMLElement {
    setConfig(config) {
      this._config = { ...config, tabs: (config.tabs || []).map((t) => ({ ...t })) };
      if (this._tab == null || this._tab >= this._config.tabs.length) this._tab = 0;
      this._render();
    }
    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;
      if (this._tabForm) this._tabForm.hass = hass;
      if (this._cardEditor) this._cardEditor.hass = hass;
      if (this._picker) this._picker.hass = hass;
    }

    // o hui-card-element-editor e o hui-card-picker esperam um objeto lovelace
    // (é assim que o editor da pilha do HA os alimenta). O editor de um card
    // custom não recebe esse objeto, então damos um de bolso — os dois só usam
    // config/editMode para montar a lista de cards.
    get _lovelace() {
      return this._fakeLovelace || (this._fakeLovelace = {
        config: { views: [] },
        editMode: true,
        rawConfig: "",
        saveConfig: async () => {},
        setEditMode: () => {},
      });
    }

    _emit(config) {
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed",
        { bubbles: true, composed: true, detail: { config } }));
    }

    _patch(patch) {
      const next = { ...this._config, ...patch };
      // default intacto não polui o YAML
      for (const [k, v] of Object.entries(next)) {
        if (k !== "tabs" && k in DEFAULTS && v === DEFAULTS[k]) delete next[k];
      }
      this._emit(next);
    }

    _setTabs(tabs) { this._emit({ ...this._config, tabs }); }

    _tabsArr() { return (this._config.tabs || []).map((t) => ({ ...t, cards: [...(t.cards || [])] })); }

    /* ------------------------------ layout ------------------------------ */

    _render() {
      if (!this._root) {
        this._root = document.createElement("div");
        this._root.innerHTML = `
          <style>
            .mtc-sec{margin-top:16px;border:1px solid var(--divider-color);border-radius:10px;padding:10px 12px;}
            .mtc-sec>summary{cursor:pointer;font-weight:600;}
            .mtc-h{font-size:13px;font-weight:600;margin:14px 0 6px;opacity:.85;}
            .mtc-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
            .mtc-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;
              border:1px solid var(--divider-color);background:transparent;color:var(--primary-text-color);
              font:inherit;font-size:12px;cursor:pointer;}
            .mtc-chip.on{background:var(--primary-color);color:var(--text-primary-color, #fff);border-color:transparent;}
            .mtc-chip.add{border-style:dashed;}
            .mtc-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--divider-color);}
            .mtc-row:first-of-type{border-top:0;}
            .mtc-row .nm{flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .mtc-ib{border:0;background:transparent;cursor:pointer;color:var(--secondary-text-color);
              font:inherit;font-size:15px;line-height:1;padding:4px 6px;border-radius:6px;}
            .mtc-ib:hover{background:var(--divider-color);color:var(--primary-text-color);}
            .mtc-ib[disabled]{opacity:.3;cursor:default;}
            .mtc-ib.del:hover{color:var(--error-color, #db4437);}
            .mtc-edit{margin-top:10px;border:1px solid var(--divider-color);border-radius:10px;padding:10px;}
            .mtc-edit .top{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;font-weight:600;}
            .mtc-ta{width:100%;box-sizing:border-box;min-height:220px;font-family:monospace;font-size:12px;
              background:var(--code-editor-background-color, rgba(0,0,0,.06));color:var(--primary-text-color);
              border:1px solid var(--divider-color);border-radius:8px;padding:8px;}
            .mtc-warn{font-size:12px;color:var(--error-color, #db4437);min-height:16px;}
            .mtc-crow{display:grid;grid-template-columns:1fr 44px 110px minmax(110px,1fr);gap:10px;align-items:center;padding:6px 0;}
            .mtc-crow .lbl{font-size:13px;}
            .mtc-crow input[type=color]{width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0;}
            .mtc-crow code{font-size:11px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          </style>
          <div class="mtc-h">Abas</div>
          <div class="mtc-chips" id="chips"></div>
          <div id="tabform"></div>
          <div class="mtc-h">Cards desta aba</div>
          <div id="cards"></div>
          <div id="cardedit"></div>
          <div class="mtc-h">Aparência</div>
          <div id="mainform"></div>
          <details class="mtc-sec" id="colors"></details>`;
        this.appendChild(this._root);
        this._chips = this._root.querySelector("#chips");
        this._cardsEl = this._root.querySelector("#cards");
        this._cardEditEl = this._root.querySelector("#cardedit");
        this._colorsEl = this._root.querySelector("#colors");

        this._tabForm = document.createElement("ha-form");
        this._tabForm.computeLabel = (f) => LABELS[f.name] || f.name;
        this._tabForm.addEventListener("value-changed", (ev) => this._onTabForm(ev));
        this._root.querySelector("#tabform").appendChild(this._tabForm);

        this._form = document.createElement("ha-form");
        this._form.computeLabel = (f) => LABELS[f.name] || f.name;
        this._form.addEventListener("value-changed", (ev) => this._onMainForm(ev));
        this._root.querySelector("#mainform").appendChild(this._form);
      }
      this._renderChips();
      this._renderTabForm();
      this._renderCardList();
      this._renderMainForm();
      this._renderColors();
    }

    /* ----------------------------- abas ----------------------------- */

    _renderChips() {
      const tabs = this._config.tabs || [];
      this._chips.innerHTML = tabs.map((t, i) =>
        `<button class="mtc-chip ${i === this._tab ? "on" : ""}" data-i="${i}">${esc(t.label || t.icon || `Aba ${i + 1}`)}</button>`
      ).join("") + `<button class="mtc-chip add" data-add="1">+ aba</button>`;
      this._chips.querySelectorAll("[data-i]").forEach((el) =>
        el.addEventListener("click", () => { this._tab = +el.dataset.i; this._editing = null; this._render(); }));
      this._chips.querySelector("[data-add]").addEventListener("click", () => {
        const tabs2 = this._tabsArr();
        tabs2.push({ label: `Aba ${tabs2.length + 1}`, icon: "", cards: [] });
        this._tab = tabs2.length - 1;
        this._editing = null;
        this._setTabs(tabs2);
        this._render();
      });
    }

    _renderTabForm() {
      const tabs = this._config.tabs || [];
      const t = tabs[this._tab] || {};
      const n = tabs.length;
      this._tabForm.hass = this._hass;
      this._tabForm.schema = [
        {
          name: "", type: "grid", schema: [
            { name: "label", selector: { text: {} } },
            { name: "icon", selector: { icon: {} } },
          ],
        },
        { name: "display", selector: { select: { mode: "dropdown", options: [{ value: "", label: "Seguir o padrão do card" }, ...DISP_OPTIONS] } } },
      ];
      this._tabForm.data = { label: t.label || "", icon: t.icon || "", display: t.display || "" };

      // barra de ações da aba: mover / duplicar / apagar
      if (!this._tabActions) {
        this._tabActions = document.createElement("div");
        this._tabActions.className = "mtc-row";
        this._root.querySelector("#tabform").appendChild(this._tabActions);
      }
      this._tabActions.innerHTML =
        `<span class="nm">Aba ${this._tab + 1} de ${n}</span>
         <button class="mtc-ib" data-a="up" ${this._tab === 0 ? "disabled" : ""} title="mover para trás">↑</button>
         <button class="mtc-ib" data-a="down" ${this._tab === n - 1 ? "disabled" : ""} title="mover para frente">↓</button>
         <button class="mtc-ib" data-a="dup" title="duplicar aba">⧉</button>
         <button class="mtc-ib del" data-a="del" ${n <= 1 ? "disabled" : ""} title="apagar aba">✕</button>`;
      this._tabActions.querySelectorAll("[data-a]").forEach((b) =>
        b.addEventListener("click", () => this._tabAction(b.dataset.a)));
    }

    _tabAction(a) {
      const tabs = this._tabsArr();
      const i = this._tab;
      if (a === "up" && i > 0) { [tabs[i - 1], tabs[i]] = [tabs[i], tabs[i - 1]]; this._tab = i - 1; }
      else if (a === "down" && i < tabs.length - 1) { [tabs[i + 1], tabs[i]] = [tabs[i], tabs[i + 1]]; this._tab = i + 1; }
      else if (a === "dup") { tabs.splice(i + 1, 0, JSON.parse(JSON.stringify(tabs[i]))); this._tab = i + 1; }
      else if (a === "del" && tabs.length > 1) { tabs.splice(i, 1); this._tab = Math.max(0, i - 1); }
      else return;
      this._editing = null;
      this._setTabs(tabs);
      this._render();
    }

    _onTabForm(ev) {
      ev.stopPropagation();
      const v = ev.detail.value || {};
      const tabs = this._tabsArr();
      const t = tabs[this._tab];
      if (!t) return;
      t.label = v.label || "";
      if (v.icon) t.icon = v.icon; else delete t.icon;
      if (v.display) t.display = v.display; else delete t.display;
      if (!t.label) delete t.label;
      this._setTabs(tabs);
      this._renderChips();
    }

    /* --------------------------- cards da aba --------------------------- */

    _renderCardList() {
      const tabs = this._config.tabs || [];
      const cards = (tabs[this._tab] || {}).cards || [];
      this._cardsEl.innerHTML = cards.map((cfg, j) =>
        `<div class="mtc-row">
           <span class="nm">${j + 1}. ${esc(cardTitle(cfg))}</span>
           <button class="mtc-ib" data-c="edit" data-j="${j}" title="editar">✎</button>
           <button class="mtc-ib" data-c="up" data-j="${j}" ${j === 0 ? "disabled" : ""} title="subir">↑</button>
           <button class="mtc-ib" data-c="down" data-j="${j}" ${j === cards.length - 1 ? "disabled" : ""} title="descer">↓</button>
           <button class="mtc-ib del" data-c="del" data-j="${j}" title="apagar">✕</button>
         </div>`).join("")
        + `<div class="mtc-row"><span class="nm"></span>
             <button class="mtc-chip add" data-c="add">+ adicionar card</button></div>`;
      this._cardsEl.querySelectorAll("[data-c]").forEach((b) =>
        b.addEventListener("click", () => this._cardAction(b.dataset.c, +b.dataset.j)));
      this._renderCardEditor();
    }

    _cardAction(a, j) {
      const tabs = this._tabsArr();
      const cards = tabs[this._tab].cards;
      if (a === "add") { this._editing = { j: cards.length, adding: true }; this._renderCardEditor(); return; }
      if (a === "edit") { this._editing = this._editing && this._editing.j === j && !this._editing.adding ? null : { j }; this._renderCardEditor(); return; }
      if (a === "up" && j > 0) [cards[j - 1], cards[j]] = [cards[j], cards[j - 1]];
      else if (a === "down" && j < cards.length - 1) [cards[j + 1], cards[j]] = [cards[j], cards[j + 1]];
      else if (a === "del") cards.splice(j, 1);
      else return;
      this._editing = null;
      this._setTabs(tabs);
      this._renderCardList();
    }

    _writeCard(j, cfg) {
      const tabs = this._tabsArr();
      const cards = tabs[this._tab].cards;
      if (j >= cards.length) cards.push(cfg); else cards[j] = cfg;
      this._setTabs(tabs);
      // só a lista: recriar o editor a cada tecla mataria o foco de quem digita
      const cards2 = (this._config.tabs[this._tab] || {}).cards || [];
      this._cardsEl.querySelectorAll(".mtc-row .nm").forEach((el, k) => {
        if (cards2[k]) el.textContent = `${k + 1}. ${cardTitle(cards2[k])}`;
      });
    }

    async _renderCardEditor() {
      this._cardEditEl.innerHTML = "";
      this._cardEditor = null;
      this._picker = null;
      if (!this._editing) return;
      const { j, adding } = this._editing;
      const box = document.createElement("div");
      box.className = "mtc-edit";
      box.innerHTML = `<div class="top"><span>${adding ? "Novo card" : `Card ${j + 1}`}</span>
        <span style="flex:1"></span><button class="mtc-ib" data-close="1" title="fechar">✕</button></div>
        <div class="host"></div>`;
      box.querySelector("[data-close]").addEventListener("click", () => { this._editing = null; this._renderCardEditor(); });
      this._cardEditEl.appendChild(box);
      const host = box.querySelector(".host");

      const ok = await loadHuiEditors();
      if (this._editing !== null && adding && ok && customElements.get("hui-card-picker")) {
        const picker = document.createElement("hui-card-picker");
        picker.hass = this._hass;
        picker.lovelace = this._lovelace;
        picker.addEventListener("config-changed", (ev) => {
          ev.stopPropagation();
          this._writeCard(j, ev.detail.config);
          this._editing = { j };          // escolheu o tipo → já abre o editor dele
          this._renderCardList();
        });
        this._picker = picker;
        host.appendChild(picker);
        return;
      }

      const current = adding
        ? { type: "markdown", content: "Conteúdo do card" }
        : ((this._config.tabs[this._tab] || {}).cards || [])[j];

      if (ok) {
        const ed = document.createElement("hui-card-element-editor");
        ed.hass = this._hass;
        ed.lovelace = this._lovelace;
        ed.value = current;
        ed.addEventListener("config-changed", (ev) => {
          ev.stopPropagation();
          if (ev.detail && ev.detail.config) this._writeCard(j, ev.detail.config);
        });
        this._cardEditor = ed;
        host.appendChild(ed);
        if (adding) { this._writeCard(j, current); this._editing = { j }; this._renderCardList(); }
        return;
      }

      // plano B: o HA não entregou os editores internos. JSON cru resolve e é
      // honesto — melhor um textarea que funciona do que uma tela quebrada.
      host.innerHTML = `<textarea class="mtc-ta" spellcheck="false"></textarea><div class="mtc-warn"></div>`;
      const ta = host.querySelector("textarea");
      const warn = host.querySelector(".mtc-warn");
      warn.textContent = "Editor visual do HA indisponível — configuração em JSON.";
      ta.value = JSON.stringify(current, null, 2);
      ta.addEventListener("change", () => {
        try {
          const cfg = JSON.parse(ta.value);
          warn.textContent = "";
          this._writeCard(j, cfg);
          this._renderCardList();
        } catch (e) { warn.textContent = `JSON inválido: ${e.message}`; }
      });
    }

    /* --------------------------- aparência --------------------------- */

    _renderMainForm() {
      const c = { ...DEFAULTS, ...this._config };
      const pos = POSITIONS.includes(c.tab_position) ? c.tab_position : "bottom";
      const horiz = pos === "top" || pos === "bottom";
      // esticar não existe na faixa vertical: esconder é mais honesto que
      // oferecer um interruptor que não faz nada
      const stretch = horiz ? c.tab_stretch !== false : false;
      this._form.hass = this._hass;
      this._form.schema = [
        {
          name: "", type: "grid", schema: [
            { name: "tab_position", selector: { select: { mode: "dropdown", options: POS_OPTIONS } } },
            { name: "tab_display", selector: { select: { mode: "dropdown", options: DISP_OPTIONS } } },
            ...(horiz ? [] : [
              { name: "tab_rotate", selector: { select: { mode: "dropdown", options: [
                { value: "auto", label: "Automático (deita em retrato)" },
                { value: "true", label: "Sempre deitada" },
                { value: "false", label: "Nunca" }] } } },
              { name: "tab_rotate_angle", selector: { select: { mode: "dropdown", options: [
                { value: "auto", label: "Automático (90° à direita, 270° à esquerda)" },
                { value: "90", label: "90° — leitura de cima para baixo" },
                { value: "270", label: "270° — leitura de baixo para cima" }] } } },
              { name: "tab_rotate_what", selector: { select: { mode: "dropdown", options: [
                { value: "both", label: "Ícone e texto" },
                { value: "text", label: "Só o texto (ícone de pé)" },
                { value: "icon", label: "Só o ícone (texto de pé)" }] } } },
            ]),
          ],
        },
        ...(horiz ? [{ name: "tab_stretch", selector: { boolean: {} } }] : []),
        ...(stretch ? [] : [{ name: "tab_align", selector: { select: { mode: "dropdown", options: [
          { value: "start", label: "No começo" }, { value: "center", label: "No centro" }, { value: "end", label: "No fim" },
        ] } } }]),
        {
          name: "", type: "grid", schema: [
            { name: "tab_size", selector: { number: { min: 0, max: 240, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "tab_font_size", selector: { number: { min: 7, max: 28, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "tab_icon_size", selector: { number: { min: 10, max: 48, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "default_tab", selector: { number: { min: 0, max: Math.max(0, (this._config.tabs || []).length - 1), step: 1, mode: "box" } } },
          ],
        },
        { name: "paper_color", selector: { select: { mode: "dropdown", options: paperOptions() } } },
        { name: "header", selector: { text: {} } },
        ...(c.header || c.header_icon ? [
          { name: "header_icon", selector: { icon: {} } },
          {
            name: "", type: "grid", schema: [
              { name: "header_inset", selector: { number: { min: 0, max: 120, step: 1, mode: "box", unit_of_measurement: "px" } } },
              { name: "header_overlap", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            ],
          },
        ] : []),
        {
          name: "", type: "grid", schema: [
            { name: "shell_radius", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "panel_radius", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "notch_radius", selector: { number: { min: 0, max: 40, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "padding", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "content_padding", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "card_gap", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "panel_min_height", selector: { number: { min: 0, max: 800, step: 4, mode: "box", unit_of_measurement: "px" } } },
          ],
        },
        { name: "elevation", selector: { boolean: {} } },
        { name: "flat_children", selector: { boolean: {} } },
        { name: "haptic", selector: { boolean: {} } },
        { name: "remember_tab", selector: { boolean: {} } },
        { name: "keep_alive", selector: { boolean: {} } },
        { name: "preload", selector: { boolean: {} } },
      ];
      const data = { ...c, tab_align: alignOf(c, horiz) };
      delete data.tabs;
      this._form.data = data;
    }

    _onMainForm(ev) {
      ev.stopPropagation();
      const v = { ...ev.detail.value };
      delete v.tabs;
      const patch = {};
      for (const [k, val] of Object.entries(v)) {
        if (val === undefined || val === null) continue;
        patch[k] = val;
      }
      // alinhamento igual ao automático da posição não vai para o YAML
      const pos = POSITIONS.includes(patch.tab_position || this._config.tab_position)
        ? (patch.tab_position || this._config.tab_position) : "bottom";
      const horiz = pos === "top" || pos === "bottom";
      if (patch.tab_align === autoAlign(horiz)) patch.tab_align = "";
      this._patch(patch);
      this._renderMainForm();   // campos condicionais (alinhamento, faixa)
    }

    /* ------------------------------ cores ------------------------------ */

    _renderColors() {
      const rows = COLOR_FIELDS.map((name) => {
        const cur = this._config[name] ?? DEFAULTS[name] ?? "";
        const col = parseColor(cur || "rgba(128,128,128,1)");
        return `<div class="mtc-crow" data-name="${name}">
          <span class="lbl">${LABELS[name] || name}</span>
          <input type="color" value="${toHex(col)}" title="cor">
          <input type="range" min="0" max="1" step="0.01" value="${col.a}" title="transparência (alfa)">
          <code>${esc(cur || "—")}</code>
        </div>`;
      }).join("");
      this._colorsEl.className = "mtc-sec";
      this._colorsEl.innerHTML =
        `<summary>Cores (clique para ajustar — cor + transparência)</summary>${rows}`;
      this._colorsEl.querySelectorAll(".mtc-crow").forEach((rowEl) => {
        const name = rowEl.dataset.name;
        const apply = () => {
          const hex = rowEl.querySelector("input[type=color]").value;
          const a = parseFloat(rowEl.querySelector("input[type=range]").value);
          const { r, g, b } = parseColor(hex);
          this._patch({ [name]: toRgba({ r, g, b, a }) });
          rowEl.querySelector("code").textContent = this._config[name] || "—";
        };
        rowEl.querySelector("input[type=color]").addEventListener("input", apply);
        rowEl.querySelector("input[type=range]").addEventListener("input", apply);
      });
    }
  }

  customElements.define("mw-tab-card", MwTabCard);
  customElements.define("mw-tab-card-editor", MwTabCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "mw-tab-card",
    name: "MW Tab Card",
    description: "Abas com cards dentro — papel encardido, relevo 3D e a aba ativa fundida ao painel.",
    preview: true,
    documentationURL: "https://github.com/visaodeempresa/mw-ha-tab-card",
  });

  console.info("%c MW-TAB-CARD %c 0.3.0 ", "background:#1a1a1a;color:#fdfaf3;font-weight:700;", "background:#e8e3d8;color:#1a1a1a;font-weight:700;");
})();
