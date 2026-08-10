# MW HA Tab Card

Card Lovelace `custom:mw-tab-card` — **abas de verdade no Home Assistant**:
cada aba guarda uma pilha de cards (qualquer card, inclusive os outros cards
MW e os de terceiros).

O desenho é o painel de papel do
[MW Power Button Card](https://github.com/visaodeempresa/mw-ha-power-button-card):
mesma paleta de **papel encardido** (49 tons + creme) e mesmo **relevo 3D**.
A aba ativa não fica "colada" no painel — ela é **fundida** nele por um recorte
côncavo, como no desenho de referência; as inativas ficam na casca colorida.

- Abas em **cima, embaixo, à esquerda ou à direita**
- Aba com **ícone, texto ou os dois** (padrão do card, com override por aba)
- **Editor visual completo**: abas (criar/duplicar/mover/apagar), cards de cada
  aba (adicionar pelo seletor do HA, editar, mover, apagar) e toda a aparência
- Sem build, sem dependências: JS puro + `<ha-form>` do HA

## Instalação (HACS)

1. HACS → ⋮ → **Repositórios personalizados** → URL
   `https://github.com/visaodeempresa/mw-ha-tab-card` → tipo **Dashboard**.
2. Instalar **MW HA Tab Card** → recarregar o navegador (⌘⇧R).

## Exemplos

### 1. O mínimo — duas abas com cards dentro

```yaml
type: custom:mw-tab-card
tabs:
  - label: Sala
    icon: mdi:sofa
    cards:
      - type: entities
        entities:
          - light.sala
          - switch.tomada_da_tv
  - label: Quarto
    icon: mdi:bed
    cards:
      - type: entities
        entities:
          - light.quarto
```

### 2. Clone da referência — carteira em vermelho, abas embaixo

O desenho que originou o card: casca carmim, faixa de título por trás do
painel, painel de papel com relevo e a aba ativa fundida nele.

```yaml
type: custom:mw-tab-card
header: UPDATE PAYMENT METHOD
header_icon: mdi:chevron-right
shell_color: "#a5123f"
paper_color: paper
tab_position: bottom
tab_display: text
tab_font_size: 12
tabs:
  - label: My Wallet
    cards:
      - type: markdown
        content: |
          # 983 · 24k
          Total Hours · Total Earned
      - type: entities
        entities:
          - sensor.ganho_do_mes
          - sensor.extra
  - label: My Awards
    cards:
      - type: markdown
        content: Nenhum prêmio ainda.
```

### 3. Abas à esquerda, só ícone — painel de ambiente

Faixa vertical de 64 px com ícone apenas: cabe num card estreito e continua
legível no celular.

```yaml
type: custom:mw-tab-card
tab_position: left
tab_display: icon
tab_size: 64
paper_color: blue-3
shell_color: "#123f6b"
tabs:
  - icon: mdi:sofa
    label: Sala           # o texto vira o title (dica ao passar o mouse)
    cards:
      - type: custom:power-button-card
        entity: switch.tomada_da_tv
        sensor_potencia: sensor.tomada_da_tv_potencia
  - icon: mdi:bed
    label: Suíte
    cards:
      - type: custom:mw-temp-humidity-card
        temperature: sensor.suite_temperatura
        humidity: sensor.suite_umidade
  - icon: mdi:shield-home
    label: Segurança
    cards:
      - type: custom:mw-occupancy-motion-card
        entity: binary_sensor.suite_presenca
```

### 4. Abas em cima, ícone + texto — dashboard de energia

```yaml
type: custom:mw-tab-card
tab_position: top
tab_display: both
paper_color: yellow-2
shell_color: "#7c2d12"
panel_min_height: 340
tabs:
  - label: Agora
    icon: mdi:flash
    cards:
      - type: custom:power-button-card
        entity: switch.microondas
        sensor_potencia: sensor.microondas_potencia
        only_power: true
  - label: Histórico
    icon: mdi:chart-line
    cards:
      - type: history-graph
        hours_to_show: 24
        entities:
          - sensor.consumo_da_casa
  - label: Ajustes
    icon: mdi:cog
    cards:
      - type: entities
        entities:
          - input_number.limite_de_consumo
```

### 5. Uma aba por pessoa, com override de exibição

O card inteiro é "só ícone", mas a aba da visita mostra o texto:

```yaml
type: custom:mw-tab-card
tab_display: icon
tab_position: bottom
paper_color: green-3
shell_color: "#14532d"
tabs:
  - icon: mdi:account
    label: Maycon
    cards: [{ type: entities, entities: [device_tracker.maycon] }]
  - icon: mdi:account-heart
    label: Cris
    cards: [{ type: entities, entities: [device_tracker.cris] }]
  - icon: mdi:account-question
    label: Visitas
    display: both          # esta aba mostra ícone E texto
    cards: [{ type: markdown, content: Ninguém por aqui. }]
```

### 6. Sem casca — só as abas, encostadas no tema

Casca transparente, sem relevo e sem respiro: o card some e ficam só as abas
sobre o fundo do dashboard.

```yaml
type: custom:mw-tab-card
shell_color: "rgba(0, 0, 0, 0)"
elevation: false
padding: 0
paper_color: paper
tabs:
  - label: Hoje
    cards: [{ type: markdown, content: "**Hoje**" }]
  - label: Semana
    cards: [{ type: markdown, content: "**Semana**" }]
```

## Propriedades

### Abas

| Propriedade | Tipo | Default | Descrição |
|---|---|---|---|
| `tabs` | lista | — | **obrigatório**, ao menos uma aba |
| `tabs[].label` | texto | "" | texto da aba (vira também o `title` do botão) |
| `tabs[].icon` | ícone mdi | "" | ícone da aba |
| `tabs[].display` | `icon`/`text`/`both` | (do card) | override só desta aba |
| `tabs[].cards` | lista de cards | `[]` | qualquer card do HA, inclusive `custom:` |
| `tab_position` | `top`/`bottom`/`left`/`right` | `bottom` | onde fica a faixa de abas |
| `tab_display` | `icon`/`text`/`both` | `both` | o que a aba mostra |
| `tab_stretch` | bool | `true` | abas dividem a faixa em partes iguais |
| `tab_align` | `start`/`center`/`end` | `center` | só quando `tab_stretch: false` |
| `tab_size` | px | `0` (auto) | altura da faixa (46) ou largura (104) |
| `tab_font_size` / `tab_icon_size` | px | 11 / 20 | tipografia da aba |
| `default_tab` | índice | `0` | aba aberta ao carregar |
| `remember_tab` | bool | `false` | guarda a última aba **neste navegador** |
| `keep_alive` | bool | `true` | aba já aberta continua montada ao trocar |
| `preload` | bool | `false` | monta todas as abas de uma vez |

Aba sem ícone no modo `icon` **não vira caixa vazia**: cai para o texto.

### Aparência

| Propriedade | Tipo | Default | Descrição |
|---|---|---|---|
| `paper_color` | `paper` ou `<cor>-<1..7>` | `paper` | papel do painel — 49 tons encardidos + o creme |
| `shell_color` | cor | `#a5123f` | casca (o fundo colorido do card) |
| `elevation` | bool | `true` | relevo 3D do MW Power Button no painel |
| `flat_children` | bool | `true` | apaga fundo/sombra/borda dos cards de dentro |
| `header` | texto | "" | faixa de título atrás do painel |
| `header_icon` | ícone mdi | "" | ícone ao lado do título |
| `header_color` | cor | (auto) | vazio = clareia a casca sozinho |
| `header_inset` / `header_overlap` | px | 26 / 16 | recuo lateral da faixa e quanto o painel a cobre |
| `shell_radius` / `panel_radius` | px | 26 / 22 | arredondamento da casca e do painel |
| `notch_radius` | px | 14 | tamanho do recorte côncavo que funde aba e painel |
| `padding` / `content_padding` | px | 14 / 18 | respiro casca↔painel e dentro do painel |
| `card_gap` | px | 12 | espaço entre os cards de dentro |
| `panel_min_height` | px | 0 | altura mínima do painel (evita o card "pular" ao trocar de aba) |
| `haptic` | bool | `true` | vibra ao trocar de aba (app companion / Android) |
| `header_text_color`, `tab_active_color`, `tab_inactive_color`, `content_text_color` | cor | (tema papel) | seção **Cores** do editor |

### Paleta de papel encardido (`paper_color`)

`paper` = creme original (`#fdfaf3 → #e8e3d8`). As outras 49 seguem
`<matiz>-<tom>`, com matiz em `red`, `orange`, `yellow`, `green`, `blue`,
`indigo`, `violet` e tom de `1` (quase branco) a `7` (mais encardido) — ex.:
`green-5`, `indigo-7`. Mesma paleta do
[power-button-card](https://github.com/visaodeempresa/mw-ha-power-button-card)
e do [simple-button-card](https://github.com/visaodeempresa/mw-ha-simple-button-card).

## Editor visual

Tudo pela UI, sem YAML:

- **Abas** — chips no topo para escolher qual editar, `+ aba` para criar,
  e por aba: texto, ícone, exibição, `↑ ↓` para reordenar, `⧉` duplicar,
  `✕` apagar (a última aba não pode ser apagada).
- **Cards desta aba** — lista com `✎` editar, `↑ ↓` reordenar, `✕` apagar e
  **+ adicionar card**, que abre o seletor de cards do próprio Home Assistant.
  O editor de cada card é o mesmo do HA (com as abas *Visual* e *Código*).
- **Aparência** — posição, exibição, papel, faixa de título, raios, respiros,
  relevo e comportamento das abas.
- **Cores** — seção com cor + transparência (alfa) por campo.

> Se a versão do HA não entregar os editores internos
> (`hui-card-picker` / `hui-card-element-editor`), o editor **não quebra**:
> cai para um campo JSON por card, com o erro de sintaxe na tela.

## Notas de uso

- **Altura**: o card cresce com o conteúdo da aba ativa. Se as abas têm
  tamanhos muito diferentes, `panel_min_height` evita o pulo ao trocar.
- **`flat_children`** achata os cards de dentro usando as variáveis do tema
  (`--ha-card-background`, `--ha-card-box-shadow`, `--ha-card-border-width`).
  Card de terceiro que pinta o próprio fundo em CSS fixo pode ignorar isso —
  desligue a opção e deixe cada card com a cara dele.
- **Tema escuro**: o painel é papel claro, então o card força texto escuro
  dentro dele (`content_text_color`). Um card de dentro com cor de texto
  própria manda nele mesmo.
- **`remember_tab`** guarda em `localStorage`, por navegador — não sincroniza
  entre celular e desktop, e some na aba anônima. É de propósito: é
  preferência de quem está olhando, não estado da casa.

## Desenvolvimento

```bash
node --check dist/mw-tab-card.js && node tools/probe.js
```

O probe instancia card e editor fora do navegador (74 verificações: as 4
posições, os recortes côncavos, os cantos que ficam retos, ícone/texto/ambos,
criação e reciclagem dos cards de dentro, e as regras do editor) e roda no CI
antes de qualquer release.

Para ver a casca sem Home Assistant, abra `tools/preview.html` no navegador:
seis variações lado a lado (as 4 posições, aba do meio ativa e a versão sem
relevo), com cards de mentira dentro.

## Licença

MIT — MAYCON WILLIAN OLIVEIRA
