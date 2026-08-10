/* Probe headless do mw-tab-card — instancia card e editor fora do navegador
 * com um shim mínimo de DOM. Pega o que dói perder sem precisar abrir o HA:
 * a fusão da aba com o painel (recortes e cantos), as 4 posições, os cards de
 * dentro (criação, hass, keep_alive) e as regras do editor.
 *
 * O shim não interpreta HTML: `innerHTML` é guardado como string e
 * querySelectorAll devolve vazio. Por isso as verificações da faixa de abas
 * olham o HTML gerado, não elementos consultados.
 *
 * Roda no CI e antes de qualquer PR:  node tools/probe.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

/* ------------------------------- shim DOM ------------------------------- */

const mkStyle = () => {
  const s = { _p: {} };
  s.setProperty = (k, v) => { s._p[k] = String(v); };
  s.removeProperty = (k) => { delete s._p[k]; };
  s.get = (k) => s._p[k];
  return s;
};

class Node {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.style = mkStyle();
    this.children = [];
    this.dataset = {};
    this._attrs = {};
    this._listeners = {};
    this._q = new Map();
    this._classes = new Set();
    this.innerHTML = "";
    this.textContent = "";
    this.hidden = false;
    this.classList = {
      add: (c) => this._classes.add(c),
      remove: (c) => this._classes.delete(c),
      contains: (c) => this._classes.has(c),
      toggle: (c, on) => (on === undefined
        ? (this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c))
        : (on ? this._classes.add(c) : this._classes.delete(c))),
    };
  }
  appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
  append(...n) { n.forEach((x) => this.appendChild(x)); }
  insertBefore(n, ref) {
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(n); else this.children.splice(i, 0, n);
    n.parentNode = this;
    return n;
  }
  replaceChild(nw, old) {
    const i = this.children.indexOf(old);
    if (i >= 0) this.children[i] = nw;
    nw.parentNode = this;
  }
  removeChild(n) { this.children = this.children.filter((c) => c !== n); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
  addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent(ev) { (this._listeners[ev && ev.type] || []).forEach((f) => f(ev)); return true; }
  // memoiza por seletor: o código só consulta seletores fixos
  querySelector(sel) {
    if (!this._q.has(sel)) this._q.set(sel, new Node("div"));
    return this._q.get(sel);
  }
  querySelectorAll() { return []; }
  getElementById(id) { return this.querySelector("#" + id); }
  focus() {}
}

global.Node = Node;
global.HTMLElement = class extends Node {
  attachShadow() { this.shadowRoot = new Node("shadow-root"); return this.shadowRoot; }
};
global.CustomEvent = class {
  constructor(type, init) { this.type = type; Object.assign(this, init || {}); }
};
const reg = {};
global.customElements = {
  define: (n, c) => { reg[n] = c; },
  get: (n) => reg[n],
  whenDefined: () => Promise.resolve(),
};
global.document = { createElement: (t) => new Node(t), body: new Node("body") };
// no Node 24 `navigator` é getter-only: define por cima, não por atribuição
Object.defineProperty(global, "navigator", { value: { vibrate: () => {} }, configurable: true });

// helpers de bolso: os "cards de dentro" viram nós marcados
global.window = {
  customCards: [],
  localStorage: { _v: {}, getItem(k) { return k in this._v ? this._v[k] : null; }, setItem(k, v) { this._v[k] = v; } },
  dispatchEvent: () => {},
  loadCardHelpers: async () => ({
    createCardElement(cfg) {
      const el = new Node("div");
      el._cfg = cfg;
      el.getCardSize = () => 2;
      return el;
    },
  }),
};
const infoBanner = [];
const realInfo = console.info;
console.info = (...a) => infoBanner.push(a.join(" "));

/* --------------------------------- carga -------------------------------- */

const SRC = path.join(__dirname, "..", "dist", "mw-tab-card.js");
eval(fs.readFileSync(SRC, "utf8"));
console.info = realInfo;

/* ------------------------------- asserções ------------------------------ */

let pass = 0; const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — não achei ${JSON.stringify(needle)}`);

const mk = (cfg) => {
  const el = new reg["mw-tab-card"]();
  el.setConfig(cfg);
  el.hass = { states: {}, callService() {} };
  return el;
};
const style = (el) => el.shadowRoot.getElementById("mw-style").textContent;
const vars = (el) => el.shadowRoot.querySelector(".shell").style._p;
const tabsHtml = (el) => el.shadowRoot.querySelector(".tabs").innerHTML;

const BASE = {
  tabs: [
    { label: "Carteira", icon: "mdi:wallet", cards: [{ type: "markdown", content: "a" }] },
    { label: "Prêmios", icon: "mdi:trophy", cards: [{ type: "markdown", content: "b" }] },
  ],
};

/* 1. registro e banner */
ok(!!reg["mw-tab-card"], "custom element mw-tab-card não registrado");
ok(!!reg["mw-tab-card-editor"], "editor mw-tab-card-editor não registrado");
ok(/%c \d+\.\d+\.\d+ /.test(infoBanner.join(" ")), "banner de versão fora do padrão do auto-release");
ok(window.customCards.length === 1 && window.customCards[0].type === "mw-tab-card",
  "card não se anuncia em window.customCards");
ok(window.customCards[0].preview === true, "card sem preview no seletor");

/* 2. config obrigatória */
let threw = false;
try { new reg["mw-tab-card"]().setConfig({}); } catch (_) { threw = true; }
ok(threw, "setConfig sem 'tabs' deveria falhar");
threw = false;
try { new reg["mw-tab-card"]().setConfig({ tabs: [] }); } catch (_) { threw = true; }
ok(threw, "setConfig com 'tabs' vazio deveria falhar");
ok(!!reg["mw-tab-card"].getStubConfig().tabs.length, "getStubConfig sem abas");
mk(reg["mw-tab-card"].getStubConfig());
pass++; // o stub tem que ser aceito pelo próprio setConfig

/* 3. as 4 posições montam o fluxo certo e o recorte côncavo certo */
const FLOW = { bottom: "column", top: "column-reverse", left: "row-reverse", right: "row" };
for (const [pos, flow] of Object.entries(FLOW)) {
  const el = mk({ ...BASE, tab_position: pos });
  has(style(el), `flex-direction:${flow};`, `posição ${pos}: fluxo errado`);
  has(style(el), "mask:radial-gradient(circle at", `posição ${pos}: sem recorte côncavo`);
  ok((style(el).match(/mask:radial-gradient/g) || []).length === 4,
    `posição ${pos}: esperava 4 máscaras (2 recortes × -webkit)`);
}
/* posição inválida cai para "embaixo" em vez de quebrar */
has(style(mk({ ...BASE, tab_position: "diagonal" })), "flex-direction:column;",
  "posição inválida deveria cair para 'embaixo'");

/* 4. cantos: o lado onde a aba ativa encosta na borda fica reto */
const el0 = mk({ ...BASE, tab_position: "bottom", default_tab: 0 });
ok(vars(el0)["--pr-bl"] === "0px" && vars(el0)["--pr-br"] === "22px",
  "aba 0 embaixo: canto inferior esquerdo deveria ser reto e o direito arredondado");
const el1 = mk({ ...BASE, tab_position: "bottom", default_tab: 1 });
ok(vars(el1)["--pr-br"] === "0px" && vars(el1)["--pr-bl"] === "22px",
  "última aba embaixo: canto inferior direito deveria ser reto");
const mid = mk({
  tab_position: "bottom",
  tabs: [{ label: "a", cards: [] }, { label: "b", cards: [] }, { label: "c", cards: [] }],
  default_tab: 1,
});
ok(vars(mid)["--pr-bl"] === "22px" && vars(mid)["--pr-br"] === "22px",
  "aba do meio: os dois cantos de baixo continuam arredondados");
ok(!/flush-[se]/.test(tabsHtml(mid)), "aba do meio não pode ganhar flush-s/flush-e");
ok(/flush-s/.test(tabsHtml(el0)), "primeira aba (stretch) deveria ganhar flush-s");
ok(/flush-e/.test(tabsHtml(el1)), "última aba (stretch) deveria ganhar flush-e");
/* sem stretch e alinhado ao centro, nenhuma aba encosta na borda */
const centered = mk({ ...BASE, tab_stretch: false, tab_align: "center" });
ok(vars(centered)["--pr-bl"] === "22px" && vars(centered)["--pr-br"] === "22px",
  "abas centradas: nenhum canto do painel deveria ficar reto");

/* 5. ícone / texto / ambos */
const both = tabsHtml(mk({ ...BASE, tab_display: "both" }));
ok(both.includes("ha-icon") && both.includes("Carteira"), "display 'both' deveria ter ícone e texto");
const onlyIcon = tabsHtml(mk({ ...BASE, tab_display: "icon" }));
ok(onlyIcon.includes("ha-icon") && !onlyIcon.includes(">Carteira<"), "display 'icon' não deveria escrever o texto");
const onlyText = tabsHtml(mk({ ...BASE, tab_display: "text" }));
ok(!onlyText.includes("ha-icon") && onlyText.includes("Carteira"), "display 'text' não deveria desenhar ícone");
/* aba sem ícone com display 'icon' cai para o texto em vez de virar caixa vazia */
const noIcon = tabsHtml(mk({ tab_display: "icon", tabs: [{ label: "Só texto", cards: [] }, { label: "b", cards: [] }] }));
has(noIcon, "Só texto", "aba sem ícone no modo 'icon' deveria cair para o texto");
/* override por aba */
const perTab = tabsHtml(mk({
  tab_display: "icon",
  tabs: [{ label: "A", icon: "mdi:a", display: "text", cards: [] }, { label: "B", icon: "mdi:b", cards: [] }],
}));
has(perTab, ">A<", "display por aba deveria vencer o padrão do card");

/* 6. acessibilidade da faixa */
has(both, 'role="tab"', "aba sem role=tab");
has(both, 'aria-selected="true"', "aba ativa sem aria-selected");
has(both, 'tabindex="-1"', "aba inativa deveria sair da ordem de tabulação");

/* 7. cards de dentro: criação, hass, troca de aba, keep_alive */
const wait = () => new Promise((r) => setTimeout(r, 0));
(async () => {
  const el = mk(BASE);
  await wait(); await wait();
  const panes = el._panes;
  ok(panes.size === 1, "só a aba ativa deveria montar (aba não visitada não monta)");
  ok(panes.get(0).children.length === 1, "a aba ativa deveria ter montado 1 card");
  ok(panes.get(0).children[0]._cfg.content === "a", "card da aba 0 não foi criado");

  const hass2 = { states: { "x.y": {} } };
  el.hass = hass2;
  ok(panes.get(0).children[0].hass === hass2, "hass não chegou no card de dentro");
  el.editMode = true;
  ok(panes.get(0).children[0].editMode === true, "editMode não chegou no card de dentro");

  el._select(1, true);
  await wait(); await wait();
  ok(el._panes.size === 2, "aba 1 deveria montar ao ser escolhida");
  ok(el._panes.get(0).classList.contains("on") === false, "aba 0 continuou visível");
  ok(el._panes.get(1).classList.contains("on") === true, "aba 1 não ficou visível");
  ok((await el.getCardSize()) >= 3, "getCardSize deveria somar os cards da aba ativa");

  /* keep_alive: false desmonta a que saiu de cena */
  const el2 = mk({ ...BASE, keep_alive: false });
  await wait(); await wait();
  el2._select(1, true);
  await wait(); await wait();
  ok(el2._panes.size === 1 && el2._panes.has(1), "keep_alive:false deveria desmontar a aba anterior");

  /* preload: monta tudo de uma vez */
  const el3 = mk({ ...BASE, preload: true });
  await wait(); await wait(); await wait();
  ok(el3._panes.size === 2, "preload:true deveria montar as duas abas");

  /* aba sem cards não explode: mostra o aviso */
  const el4 = mk({ tabs: [{ label: "Vazia", cards: [] }] });
  await wait(); await wait();
  has(el4._panes.get(0).innerHTML, "sem cards", "aba vazia deveria avisar em vez de ficar em branco");

  /* remember_tab guarda a escolha e a próxima montagem respeita */
  const el5 = mk({ ...BASE, remember_tab: true });
  el5._select(1, true);
  const el6 = mk({ ...BASE, remember_tab: true });
  ok(el6._active === 1, "remember_tab não trouxe de volta a última aba");

  /* --------------------------- editor --------------------------- */
  const ed = new reg["mw-tab-card-editor"]();
  ed.hass = { states: {} };
  let last = null;
  ed.addEventListener("config-changed", (ev) => { last = ev.detail.config; });
  ed.setConfig(JSON.parse(JSON.stringify(BASE)));

  const names = (s) => s.flatMap((f) => (f.schema ? f.schema.map((g) => g.name) : [f.name]));
  const main = names(ed._form.schema);
  for (const k of ["tab_position", "tab_display", "tab_stretch", "paper_color", "elevation",
    "notch_radius", "header", "default_tab", "keep_alive"]) {
    ok(main.includes(k), `editor sem o campo '${k}'`);
  }
  const paper = ed._form.schema.find((f) => f.name === "paper_color");
  ok(paper.selector.select.options.length === 50, "paleta de papel deveria ter 1 creme + 49 tons");
  ok(names(ed._tabForm.schema).includes("icon"), "editor da aba sem seletor de ícone");
  /* tab_align só aparece quando as abas não dividem a faixa */
  ok(!main.includes("tab_align"), "tab_align não deveria aparecer com stretch ligado");
  ed._config = { ...ed._config, tab_stretch: false };
  ed._renderMainForm();
  ok(names(ed._form.schema).includes("tab_align"), "tab_align deveria aparecer com stretch desligado");

  /* default intacto não polui o YAML */
  ed.setConfig(JSON.parse(JSON.stringify(BASE)));
  ed._patch({ tab_position: "bottom", tab_display: "icon" });
  ok(!("tab_position" in last), "default (bottom) não deveria ir para o YAML");
  ok(last.tab_display === "icon", "valor diferente do default deveria ir para o YAML");

  /* abas: adicionar, duplicar, mover, apagar */
  ed.setConfig(JSON.parse(JSON.stringify(BASE)));
  ed._tab = 0;
  ed._tabAction("dup");
  ok(last.tabs.length === 3 && last.tabs[1].label === "Carteira", "duplicar aba não funcionou");
  ed._tab = 0; ed._tabAction("down");
  ok(last.tabs[0].label === "Carteira" && ed._tab === 1, "mover aba para frente não funcionou");
  ed._tabAction("del");
  ok(last.tabs.length === 2, "apagar aba não funcionou");
  ed.setConfig({ tabs: [{ label: "única", cards: [] }] });
  ed._tab = 0; const antes = JSON.stringify(ed._config);
  ed._tabAction("del");
  ok(JSON.stringify(ed._config) === antes, "não pode apagar a última aba");

  /* cards da aba: mover e apagar */
  ed.setConfig({
    tabs: [{ label: "a", cards: [{ type: "markdown", content: "1" }, { type: "markdown", content: "2" }] }],
  });
  ed._tab = 0;
  ed._cardAction("down", 0);
  ok(last.tabs[0].cards[0].content === "2", "descer card não funcionou");
  ed._cardAction("del", 0);
  ok(last.tabs[0].cards.length === 1 && last.tabs[0].cards[0].content === "1", "apagar card não funcionou");
  ed._writeCard(1, { type: "markdown", content: "3" });
  ok(ed._config.tabs[0].cards.length === 2, "_writeCard deveria acrescentar no fim");

  /* mexer no editor de aba não perde os cards já configurados */
  ed.setConfig(JSON.parse(JSON.stringify(BASE)));
  ed._tab = 0;
  ed._onTabForm({ stopPropagation() {}, detail: { value: { label: "Novo nome", icon: "mdi:wallet", display: "" } } });
  ok(last.tabs[0].cards.length === 1, "renomear a aba não pode apagar os cards dela");
  ok(last.tabs[0].label === "Novo nome" && !("display" in last.tabs[0]),
    "renomear a aba deveria gravar o nome e não gravar display vazio");

  /* --------------------------- fim --------------------------- */
  if (fails.length) {
    console.error(`\n✗ ${fails.length} verificação(ões) falharam:`);
    fails.forEach((f) => console.error("  · " + f));
    process.exit(1);
  }
  console.log(`✓ probe do mw-tab-card: ${pass} verificações passaram`);
})().catch((e) => { console.error("✗ probe explodiu:", e); process.exit(1); });
