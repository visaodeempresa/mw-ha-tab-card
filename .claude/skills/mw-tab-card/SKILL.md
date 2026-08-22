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
| Ícone novo na bancada | path em `https://unpkg.com/@mdi/js/mdi.js` → `MDI` de `bench-stubs.js` | o ícone sai como losango vermelho de erro (e o probe reprova) |
| SSH no HA | `ssh -F PROJECTS/new_wakeword/ssh/ssh_config ha-leticia` | sem deploy de teste; só release via HACS |

## Fluxo

1. Editar `dist/mw-tab-card.js` — default em `DEFAULTS`, rótulo em `LABELS`,
   campo em `_renderMainForm()` (aparência) ou `_renderTabForm()` (por aba).
2. `node --check dist/mw-tab-card.js && node tools/probe.js`
3. `IA/tools/check-embeds.sh`
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
| YAML ganha `tab_position: bottom` sozinho | default indo para a config | `_patch()` apaga tudo que for igual ao `DEFAULTS` |
| Faixa lateral larga demais, painel espremido | `--tsize` fixo na vertical (eram 104px, valessem ícone ou rótulo) | vertical automática usa `max-content` entre `--tmin` (46) e `--tmax` (`min(168px, 45%)`) |
| Ícone/texto da aba **ativa** desalinhado das inativas | a costura de 1px escrita como `padding-<lado>:1px` seco **apaga** o respiro daquele lado (o atalho `padding` já passou) | somar: `padding-<lado>:calc(<respiro> + 1px)` |
| Aba lateral vira pastilha/oval | `--tr` (= `panel_radius`) nas duas quinas de fora se encontra no meio de uma aba curta | `--tminlen` = `max(2×pr + 6, 2×nr + 14)` |
| Ícone grande vaza da aba lateral | `ha-icon` é `flex:none`; faixa mais fina que ele não o encolhe, ele transborda para a casca | piso da faixa é `max(var(--tmin), calc(var(--tis) + 8px))` |
| Ícone virou bolinha na bancada e nas fotos | o dublê de `ha-icon` escrevia **caractere de texto** com `font-size:inherit` e caía num "●" para o que não conhecia — `--mdc-icon-size` não tinha efeito nenhum | `bench-stubs.js` desenha o path do MDI em `<svg>`; ícone fora da lista sai como losango **vermelho** (grita), e o probe confere isso |

## Verificação (o que faz a tarefa estar pronta)

```bash
node --check dist/mw-tab-card.js
node tools/probe.js                    # espera: "✓ probe do mw-tab-card: N verificações passaram"
IA/tools/check-embeds.sh               # espera: "✓ paper-palette v1 — mw-tab-card.js"
git log -1 --pretty='%G? %an'          # espera: G + MAYCON WILLIAN OLIVEIRA
```

Conferência de tela (bancada ou HA real) é do dono — relate o que **não** foi
verificado em vez de omitir (regra global 30).
