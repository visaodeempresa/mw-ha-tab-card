---
name: mw-tab-card
description: Mexer no card de abas do Home Assistant (custom:mw-tab-card) — o card que guarda outros cards dentro de abas. Use quando o Maycon falar em "abas no dashboard", "MW Tab Card", "aba não troca", "o card de dentro não aparece", "quero as abas do lado/em cima", "a aba não gruda no painel", "o recorte ficou torto", ou quando pedir print/exemplo novo para o README deste repositório.
---

# MW Tab Card

`custom:mw-tab-card` — faixa de abas + painel de papel; cada aba guarda uma
lista de cards do HA. Arquivo único (`dist/mw-tab-card.js`), sem build,
instalado por HACS (tipo Dashboard).

Fábrica e armadilhas gerais: skill `ha-lovelace-card-factory`.
Paleta de papel: canônica em `IA/lib/paper-palette/` (rodar
`IA/tools/check-embeds.sh` antes de commitar).

## O que é específico deste card

**Ele hospeda cards de terceiros.** Isso muda três coisas em relação aos
outros cards MW:

1. **Nunca reescrever o shadow root inteiro no `_render()`.** Um
   `innerHTML = ...` destrói os cards filhos e o estado deles (gráfico
   perde o zoom, câmera reconecta). A estrutura é montada uma vez em
   `_ensureDom()`; depois só mudam variáveis CSS, o HTML da faixa de abas
   (que é nosso) e a classe `.on` dos painéis.
2. **`hass` desce para todo filho montado**, a cada set. Quem faz o diff é
   o card de dentro, não nós.
3. **`ll-rebuild`** — o filho pede para ser recriado. Sem escutar esse
   evento, um card que troca de tipo em tempo de execução congela.
4. **`hass`, `editMode` e `preview` descem para todo filho.** `preview` é o
   que o `<hui-card>` do HA liga **só** no card em edição; sem repassar, o
   picture-elements de dentro ignora o clique na imagem que posiciona o
   elemento.
5. **O editor também hospeda editor de terceiro.** O `setConfig` do editor
   recebe de volta a config que ele mesmo acabou de emitir (é o eco do
   `hui-element-editor`). Re-renderizar nesse eco recria o
   `hui-card-element-editor` aberto e apaga o estado interno dele. E o eco
   **não vem sozinho**: uma ação do dono rende duas ou mais voltas, que
   voltam fora de ordem — por isso `_echos` é um **anel** das últimas
   emissões, não a última.
6. **O `lovelace` tem que ser declarado para chegar.** O HA faz
   `if ("lovelace" in configElement)` (`hui-element-editor.loadConfigElement`)
   e passa o **LovelaceConfig puro** (`{views: […]}`). Quem não declara a
   propriedade nunca recebe — e o substituto de bolso precisa ter `views` na
   raiz, senão o `hui-card-picker` estoura e sai em branco.

**A fusão aba↔painel** é um quadrado de `--nr` px colado na aba ativa,
pintado de papel sólido e recortado por
`mask: radial-gradient(circle at <canto>, transparent 0 var(--nr), #000 …)`.
São 4 combinações de canto (uma por posição da faixa) — mexeu numa, confira
as outras na bancada.

## Pré-condições

| Preciso de | Como obter | Se faltar |
|---|---|---|
| Node | `node --version` | sem probe e sem CI local |
| Navegador | `tools/preview.html` | sem conferência visual — **diga isso**, não deixe implícito |
| Ícone novo na bancada | `IA/lib/bench-ha-icon/tools/mdi-paths.sh --from tools/bench-stubs.js` → colar no mapa `MDI` | o ícone sai como losango vermelho de erro (e o probe reprova) |
| SSH no HA | `ssh -F PROJECTS/new_wakeword/ssh/ssh_config ha-leticia` | sem deploy de teste; só release via HACS |

## Fluxo

1. Editar `dist/mw-tab-card.js` — default em `DEFAULTS`, rótulo em `LABELS`,
   campo em `_renderMainForm()` (aparência) ou `_renderTabForm()` (por aba).
2. `node --check dist/mw-tab-card.js && node tools/probe.js`
3. `IA/tools/check-embeds.sh` — guarda `paper-palette` **e** `bench-ha-icon`
   (o dublê de ícone da bancada; a lista de paths é deste repo, o dublê não)
4. Abrir `tools/preview.html` — as 7 variações têm que continuar certas.
   Geometria não se confere no olho: medir no console é o que pega o
   desalinho de 3,5px da aba ativa —
   `[...sr.querySelectorAll(".tab")].map(t => t.firstElementChild.getBoundingClientRect().x)`
   tem que dar o **mesmo** centro para aba ativa e inativas.
5. Commit assinado (regra 00), feature branch, PR. **Merge é do dono.**

## Armadilhas (com sintoma)

| Sintoma | Causa | Correção |
|---|---|---|
| Trocar de aba recria o gráfico/câmera do zero | algum caminho está reescrevendo `innerHTML` do painel | só `_panes` manda no painel; `_paintTabs` só toca em `.tabs` |
| Aba ativa "encostada" no painel, com quina | `notch_radius: 0` ou máscara sem `-webkit-mask` | manter os dois prefixos; Safari antigo ignora o sem prefixo |
| Emenda de cor visível no recorte | o recorte pintado com o gradiente inteiro (ele recomeça dentro do quadradinho de 14 px) | `paperStops()` — cor sólida do extremo certo do gradiente |
| Card de dentro com fundo próprio sobre o papel | tema com CSS fixo, não variável | `flat_children: false` e deixar cada card com a cara dele |
| Texto do card de dentro sumindo no tema escuro | filho herdou `--primary-text-color` claro | o painel força `--primary-text-color` (`content_text_color`) |
| Editor de card de dentro não abre | HA não carregou `hui-card-element-editor` | `loadHuiEditors()` instancia o editor da pilha vertical para puxá-lo; se falhar, cai no JSON — **é esperado**, não é bug |
| Perde o foco ao digitar no editor | recriar o `ha-form` ou o editor filho a cada tecla | `_writeCard()` só atualiza o rótulo da lista, nunca recria o editor aberto |
| **Clicar no ✎ de um card `grid` não abre o editor dele** — e no `picture-elements`, "adicionar elemento" acrescenta na lista sem abrir o painel do item | o eco do HA **não vem sozinho**: o editor da grid emite sozinho assim que monta (o `<ha-form>` dele injeta os defaults `columns`/`square`) e o painel de item do picture-elements emite ao receber o `.value`. A guarda de eco guardava só a **última** emissão, então a penúltima voltava disfarçada de "mudança de fora": o `_render()` destruía o editor aberto, ele remontava, emitia de novo — laço | `_emit()` guarda um **anel** (`_echos`, `ECHO_RING`) com `{ref, json}` das últimas emissões; `setConfig()` reconhece qualquer uma delas. `_renderCardEditor()` reserva `_aberto` **antes** do `await loadHuiEditors()`, usa token de geração (`_genEditor`) e trata "montagem em voo" como reuso |
| **O "+" dentro de uma `grid`/pilha abre em branco** (e o "+ adicionar card" do MW Tab também) | `hui-card-picker` faz `computeUsedEntities(this.lovelace)` → `config.views.forEach(...)`. O editor recebia um objeto de bolso na forma antiga (`{config:{views}}`) e o HA nunca injetava o real, porque `hui-element-editor` só injeta com `"lovelace" in configElement` | `get/set lovelace` declarados no `MwTabCardEditor` (o HA passa o `LovelaceConfig` do dashboard) + substituto com `views` na raiz **e** `config.views` para HA antigo |
| Editor do card de dentro "pisca" / reprocessa sozinho | o reuso devolvia para o filho a config que o próprio filho acabou de emitir — rebobinar a fita faz ele emitir de novo | `_ultimoDoFilho` guarda a referência emitida; o reuso só empurra `value` quando a config veio **de fora** |
| Trocar uma tecla no editor recria **todos** os cards de **todas** as abas (câmera reconecta, gráfico perde o zoom, picture-elements perde o elemento em posicionamento) | `_cardsSig` era o JSON de todos os cards juntos: qualquer mudança zerava `_panes` | assinatura **por aba** (`Map`) + `_syncPane()`: card de mesmo tipo na mesma posição recebe `setConfig` e continua vivo; só troca de tipo, entrada e saída criam/removem elemento |
| **Não dá para editar os itens de um `picture-elements` de dentro** — o painel do item fecha sozinho na primeira alteração, e "adicionar elemento" acrescenta sem abrir | o HA devolve a config para o `setConfig` do editor logo depois de nós emitirmos (`hui-element-editor`: `set value` → `_updateConfigElement` → `setConfig`). O `_render()` nesse **eco** recriava o `hui-card-element-editor` e levava junto o `_subElementEditorConfig`, que é estado interno do editor do picture-elements | `_emit()` marca o que saiu em `this._echo`; `setConfig()` reconhece o eco (referência **ou** `sameJson`) e atualiza `_config` **sem** `_render()`. `_renderCardEditor()` ainda reaproveita o editor já aberto no mesmo card (`this._aberto`) |
| Slider de cor/alfa "solta" no meio do arrasto | mesmo eco: cada `input` emitia, o HA devolvia e o `_renderColors()` trocava o `innerHTML` embaixo do dedo | a guarda de eco do `setConfig` resolve junto |
| Clicar na imagem do `picture-elements` não posiciona o elemento | o card filho nunca recebia `preview` — `hui-picture-elements-card._handleImageClick` sai na primeira linha se `preview` for falso | `set preview` no `MwTabCard` + repasse em `_createCard()` |
| YAML ganha `tab_position: bottom` sozinho | default indo para a config | `_patch()` apaga tudo que for igual ao `DEFAULTS` |
| Faixa lateral larga demais, painel espremido | `--tsize` fixo na vertical (eram 104px, valessem ícone ou rótulo) | vertical automática usa `max-content` entre `--tmin` (46) e `--tmax` (`min(168px, 45%)`) |
| Ícone/texto da aba **ativa** desalinhado das inativas | a costura de 1px escrita como `padding-<lado>:1px` seco **apaga** o respiro daquele lado (o atalho `padding` já passou) | somar: `padding-<lado>:calc(<respiro> + 1px)` |
| Aba lateral vira pastilha/oval | `--tr` (= `panel_radius`) nas duas quinas de fora se encontra no meio de uma aba curta | `--tminlen` = `max(2×pr + 6, 2×nr + 14)` |
| Ícone grande vaza da aba lateral | `ha-icon` é `flex:none`; faixa mais fina que ele não o encolhe, ele transborda para a casca | piso da faixa é `max(var(--tmin), calc(var(--tis) + 8px))` |
| Ícone virou bolinha na bancada e nas fotos | o dublê de `ha-icon` escrevia **caractere de texto** com `font-size:inherit` e caía num "●" para o que não conhecia — `--mdc-icon-size` não tinha efeito nenhum | o dublê agora é o bloco canônico `IA/lib/bench-ha-icon` embutido em `bench-stubs.js`: desenha o path do MDI em `<svg>`, e ícone fora do mapa sai como losango **vermelho**. O probe confere, e o `check-embeds.sh` guarda o bloco (ADR 0009) |

## Verificação (o que faz a tarefa estar pronta)

```bash
node --check dist/mw-tab-card.js
node tools/probe.js                    # espera: "✓ probe do mw-tab-card: N verificações passaram"
IA/tools/check-embeds.sh               # espera: "✓ paper-palette v1 — mw-tab-card.js"
git log -1 --pretty='%G? %an'          # espera: G + MAYCON WILLIAN OLIVEIRA
```

Conferência de tela (bancada ou HA real) é do dono — relate o que **não** foi
verificado em vez de omitir (regra global 30).
