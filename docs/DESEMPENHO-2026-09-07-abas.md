# MW Tab Card — desempenho das abas e comparação com as views do Lovelace

Data: 2026-09-07 · Base: `dist/mw-tab-card.js` (v0.3.x, código lido nesta sessão)

---

## 1. A dúvida direta

> «Com “Montar todas as abas de uma vez” **desligado**, “Manter as abas já abertas
> montadas” **desligado** e “Lembrar a última aba aberta” **ligado**, o card não fica
> pesado mesmo com muitas abas. Correto?»

**Correto** — com uma ressalva importante sobre *onde* o custo foi parar.

O que o código faz, literalmente:

```js
const want = c.preload === true ? c.tabs.map((_, i) => i) : [this._active];
for (const i of want) if (!this._panes.has(i)) await this._buildPane(i);

if (c.keep_alive === false && c.preload !== true) {
  for (const [i, pane] of [...this._panes.entries()]) {
    if (i !== this._active) { pane.remove(); this._panes.delete(i); }   // destrói de verdade
  }
}
```

E o `set hass` só alimenta o que está montado:

```js
for (const pane of this._panes.values())
  for (const el of pane.children) el.hass = hass;
```

Consequências:

1. **O custo em repouso não depende do número de abas.** Com `preload: false` +
   `keep_alive: false`, existe **exatamente uma** pane no DOM. 2 abas ou 12 abas
   custam o mesmo. Isso vale para RAM, para o trabalho de cada `hass` novo e para
   as assinaturas que os cards de dentro abrem (histórico, estatísticas, stream
   de câmera).
2. **“Lembrar a última aba” não tem custo de renderização.** É um
   `localStorage.getItem` na hora de aplicar a config e um `setItem` no clique.
   Ele **não** monta nada a mais — só decide *qual* aba é a primeira a montar.
3. **O custo mudou de lugar, não sumiu:** ele foi para a **troca de aba**. Cada
   clique **destrói** a pane anterior e **reconstrói do zero** a nova
   (`_buildPane` → `createCardElement` de cada card). Numa aba com um
   picture-elements cheio, isso é recriar todos os elementos, reanexar todos os
   listeners e refazer todas as assinaturas — a cada visita.

Três armadilhas que valem para o seu caso:

- **A aba lembrada pode ser a mais cara.** Com `remember_tab`, a *primeira pintura*
  do dashboard passa a ser a aba que o usuário deixou aberta. Se ele parou na aba
  de câmeras, é ela que abre.
- **A chave da memória é feita dos rótulos/ícones** (`mw-tab-card:${labels.join("|")}`).
  Renomear uma aba zera a lembrança de todo mundo. Não é bug, é o preço de não ter id.
- **Estado interno se perde na troca** com `keep_alive: false`: gráfico com zoom
  volta ao padrão, stream de câmera reinicia (renegocia HLS/WebRTC do zero), aba de
  um `mw-tab-card` aninhado volta à default.

Um detalhe do código que muda a leitura da tabela: **quando `preload` está ligado,
`keep_alive` é ignorado** (a condição exige `preload !== true`). Ligar `preload`
já implica manter tudo montado.

E uma nota sobre o que “montado mas escondido” custa: a pane inativa fica em
`display:none`. O navegador **não** faz layout nem paint dela — mas ela continua
recebendo `hass` a cada mudança de estado e continua com as assinaturas dela
abertas. Na sua casa isso não é detalhe: a auditoria de perf registrou
**1,3–1,6 mil `state_changed`/min**. Cada tique varre todos os cards montados.

---

## 2. Cenários combinados, do mais leve ao mais pesado

Ponto de vista: **smartphone simples** (Android de entrada, pouca RAM, GPU fraca),
dashboard com **N abas**, cada aba com **C cards**.

Sem números inventados: as colunas são relativas, medidas em “quantidade de card
montado”. Nada aqui foi cronometrado nesta sessão.

| # | preload | keep_alive | remember_tab | Montado em repouso | 1ª pintura | Custo por troca | Trabalho por `state_changed` | Veredito para celular fraco |
|---|---------|-----------|--------------|--------------------|-----------|-----------------|------------------------------|------------------------------|
| **1** | ❌ | ❌ | ❌ | `C` (1 aba) | `C` (aba padrão, a mais leve que você escolher) | **Alto** — reconstrói `C` | `C` | 🟢 **O mais leve e o mais previsível.** Melhor padrão para tela pesada. |
| **2** | ❌ | ❌ | ✅ | `C` (1 aba) | `C` (aba lembrada — pode ser a cara) | **Alto** — reconstrói `C` | `C` | 🟢 **O seu cenário.** Igual ao #1 em custo; a única diferença é *qual* aba abre. Melhor UX, mesmo peso. |
| **3** | ❌ | ✅ | ✅/❌ | Cresce até `N×C` **conforme o usuário navega** | `C` | **Baixo** — só troca a classe `.on` | Cresce até `N×C` | 🟡 Troca instantânea, mas o preço sobe em silêncio: quem visita todas as abas fica com o dashboard inteiro montado. Bom só com abas leves. |
| **4** | ✅ | (ignorado) | ✅/❌ | `N×C` **sempre** | `N×C` — a tela demora a aparecer | Nenhum | `N×C` desde o primeiro segundo | 🔴 **O mais pesado.** Só faz sentido em card pequeno, ou quando a troca precisa ser instantânea desde o primeiro toque. |

Regra de bolso derivada da tabela:

- **`preload` é o único que multiplica a primeira pintura.** É o botão que quebra celular fraco.
- **`keep_alive` é uma aposta:** troca rápida em troca de um peso que cresce sozinho.
- **`remember_tab` é grátis** em CPU/RAM. Só escolha bem a aba padrão como plano B.

### 2.1 Quando cada aba é um `picture-elements` cheio de componentes

Este caso merece linha própria porque o `picture-elements` é o pior vizinho possível
para o `preload`:

- Ele **não é preguiçoso**: monta *todos* os elementos de uma vez, cada um com seu
  `hass`. Uma planta com 40 elementos são 40 componentes vivos por aba.
- Cada aba carrega **a sua própria** `<img>` de fundo. Se as plantas forem arquivos
  diferentes, são N bitmaps decodificados na RAM ao mesmo tempo com `preload`. Se
  for **o mesmo arquivo** em todas as abas, o cache do navegador e o decode
  compartilhado salvam boa parte — vale desenhar as N abas sobre a *mesma* imagem.
- Com `preload: true` e 6 plantas de 40 elementos, cada `state_changed` visita
  ~240 componentes escondidos. É exatamente o perfil de travamento que aparece
  como “o dashboard engasga ao rolar” no celular.

**Recomendação para plantas:** cenário **#2** (`preload: false`, `keep_alive: false`,
`remember_tab: true`). Aceite o engasgo de alguns décimos na troca — ele é pontual e
acontece com o dedo do usuário na tela, que é o momento em que ele tolera espera.
O que não se tolera é a tela inicial demorando a pintar.

```yaml
type: custom:mw-tab-card
preload: false          # nunca ligue isso com picture-elements
keep_alive: false       # só a planta visível fica viva
remember_tab: true      # grátis, e devolve o usuário onde ele parou
default_tab: 0          # plano B: aponte para a planta MAIS LEVE
tabs:
  - label: Luzes
    icon: mdi:lightbulb-group
    cards: [{ type: picture-elements, ... }]
```

Se ainda assim engasgar na troca, o caminho **não** é ligar `keep_alive` — é
enxugar a planta (menos elementos, imagem menor, `mw-state-color-element` no lugar
de vários elementos soltos).

---

## 3. Abas do dashboard (views) × MW Tab Card

Cenário: **uma tela com abas — mapa de luzes, mapa de temperatura, mapa de umidade, etc.**

| Critério | Views do Lovelace (abas nativas) | MW Tab Card |
|---|---|---|
| **Peso em repouso** | 🟢 Só a view ativa fica montada; o frontend descarta a anterior ao trocar (equivalente ao `keep_alive: false`) — *comportamento observado, não conferido no código do frontend nesta sessão* | 🟢 Igual, **se** configurado como cenário #2. 🔴 Configurável para pior (`preload`) — a corda para se enforcar existe |
| **Custo da troca** | 🟡 Troca de rota: reconstrói a view **inteira** (header, badges, todas as seções) | 🟢 Reconstrói **só a pane** dentro de uma view que já está de pé — mais barato que a troca de view |
| **Link direto / URL** | 🟢 Cada aba tem `path` próprio: favorito, botão de voltar do navegador, `navigate` em automação, atalho no celular, a Letícia mandando abrir «temperatura» | 🔴 **Não existe.** Não dá para apontar para uma aba de fora. `remember_tab` é o remendo, e só vale naquele navegador |
| **Sobrevive ao reload / troca de dispositivo** | 🟢 A URL é o estado | 🟡 Só com `remember_tab`, e a memória é local por navegador |
| **Convive com outro conteúdo na mesma tela** | 🔴 A faixa de abas é do dashboard inteiro, presa no topo. Não dá para ter cabeçalho fixo + abas no meio da página | 🟢 É um card: fica no meio da view, com cards acima e abaixo, e dá para ter **vários** tab-cards na mesma tela |
| **Aparência** | 🔴 Refém do tema; personalizar exige `card_mod` | 🟢 Papel 3D MW, posição da faixa (topo/base/esquerda/direita), rótulo deitado, raio de canto, háptico no toque — nativo |
| **Badges por aba** | 🟢 Suporte nativo de badges por view | 🔴 Não tem; o equivalente é pôr um card no topo da pane |
| **Altura da tela** | 🟢 Cada view tem sua altura, sem surpresa | 🟡 O card muda de altura conforme a aba; em `sections`/grid isso faz o layout pular. `panel_min_height` amortece |
| **Permissão / visibilidade** | 🟢 View com `visible:` por usuário | 🔴 Não tem filtro por usuário nas abas |
| **Manutenção do YAML** | 🟡 Views separadas: mais arquivo, mais repetição da planta | 🟢 Tudo num card só; fábrica de dashboard gera fácil |
| **Risco de regressão** | 🟢 É o core do HA | 🟡 É código nosso — atualização de frontend pode quebrar (já aconteceu com card hospedeiro) |

### 3.1 Como eu decidiria

- **Se as plantas são pesadas e você quer mandar o usuário direto numa delas**
  (por voz, por automação, por atalho na tela do celular): **views nativas**.
  O link direto e o botão de voltar valem mais que a estética, e o descarte da
  view é garantido pelo core.
- **Se as abas precisam viver dentro de uma página** que já tem cabeçalho, fileira
  de botões e outros cards — o desenho dos seus dashboards 5.x/6.x — **MW Tab Card**
  no cenário #2. Foi para isso que ele nasceu.
- **Híbrido, que é o que eu faria na sua casa:** uma view por *ambiente* (link
  direto, badge, permissão) e, **dentro** de cada uma, um `mw-tab-card` trocando
  entre luzes / temperatura / umidade da mesma planta. Você ganha a URL onde ela
  importa (o ambiente) e a estética onde ela aparece (a grandeza).

---

## 4. Resumo em três linhas

1. Sua leitura está certa: `preload: false` + `keep_alive: false` deixa o card com
   **peso de uma aba só**, independente de quantas existam; `remember_tab` é grátis.
2. O custo migrou para a **troca de aba**, que reconstrói tudo — aceitável, e é a
   troca certa quando cada aba é um `picture-elements` cheio.
3. Contra as views nativas você perde **link direto, badges e visibilidade por
   usuário**, e ganha **abas dentro da página, aparência MW e troca mais barata**.
