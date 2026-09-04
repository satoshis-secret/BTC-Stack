# BTC Stack

## Changelog v2.0

- A aba Conversor (BTC/Fiat) agora fica centralizada verticalmente na tela,
  em vez de grudada no topo — já que essa tela esconde o cabeçalho e
  sobrava bastante espaço vazio acima do card.

## Changelog v1.9

- Adicionada a unidade de exibição **₿ (BIP-177)** em Configurações →
  Exibição, ao lado de BTC e sats. Segue a proposta BIP-177 (Redefine
  Bitcoin's Base Unit): mesmo valor bruto em satoshis, exibido com o
  símbolo ₿ como prefixo e separador de milhar (ex: `₿1.200`), sem usar a
  palavra "sat"/"satoshi" na interface — validado contra os vetores de
  teste oficiais do BIP (`bitcoin.org/bip/177`).
- Aplicado de forma consistente em toda a plataforma: card de preço ao
  vivo, patrimônio, tabelas de aportes/vendas, conversor, meta de
  acumulação e formulários de registro — em qualquer lugar que hoje mostra
  BTC ou sats.

## Changelog v1.8

- **Gráfico (TradingView) mais rápido para abrir:**
  - Adicionado `preconnect`/`dns-prefetch` para os domínios da
    TradingView no `<head>`, para o DNS e o handshake TLS já estarem
    prontos antes do usuário tocar na aba "Gráfico".
  - O iframe do gráfico agora começa a carregar em segundo plano assim
    que o app termina a inicialização crítica (preço, portfólio), em vez
    de só começar a carregar no instante em que a aba é aberta — na
    prática, a aba costuma abrir instantânea. Pulado automaticamente em
    conexões lentas (2G) ou com "Economia de dados" ativada, pra não
    gastar dados de quem talvez nunca abra essa aba.
- Trocado o QR code Lightning da seção "Apoie o projeto" pelo novo QR
  enviado.
- Endereço Lightning atualizado de `satoshis_secret@cake.cash` para
  `satoshis-secret@cake.cash` (sublinhado → hífen), tanto no texto exibido
  quanto no botão "Copiar".

## Changelog v1.7

- Correção visual: a tela vazia "Sua stack começa aqui" (antes do primeiro
  aporte) usava o símbolo "₿" verde genérico como ícone. Trocado pela logo
  real do app (o mesmo círculo laranja com "B" usado no cabeçalho e no
  tutorial de boas-vindas), para manter consistência visual.


App de controle de aportes, posições e desempenho em Bitcoin. Single-page app estático (HTML/CSS/JS puro), sem backend — todos os dados ficam no dispositivo (localStorage/IndexedDB).

## Changelog v3.1

- Corrigido: a aba "Variação %" (tipo de alerta) mostrava dois símbolos de
  porcentagem — o ícone grande e um "%" pequeno no próprio texto do rótulo,
  logo abaixo. Removido o "%" do texto (agora só "Variação"), já que o
  ícone acima já comunica isso visualmente.

## Changelog v3.0

- **Auditoria completa do sistema de notificações** (todos os 4 tipos:
  Preço, Variação %, Halving, Ciclo), em primeiro e segundo plano:
  - Confirmado: criação, armazenamento (localStorage + IndexedDB), checagem
    e disparo funcionam corretamente para os 4 tipos com o app aberto.
  - Confirmado: sincronização com o IndexedDB (usado pelo Service Worker)
    acontece tanto ao salvar um alerta quanto no carregamento inicial da
    página — o segundo plano nunca fica dessincronizado.
  - Confirmado: o polling de indicadores de ciclo (Fear & Greed / MVRV)
    também é retomado automaticamente no carregamento, se já houver algum
    alerta de ciclo cadastrado.
- **Bug real corrigido:** o pedido de permissão de notificação (a primeira
  vez que "Adicionar" é clicado) parou de funcionar depois do redesign
  visual da v2.9 — o botão passou a ter um ícone SVG e um `<span>` dentro
  dele, então o clique quase sempre atingia esses elementos filhos, não o
  `<button>` em si, e a checagem `e.target.classList.contains(...)` falhava
  silenciosamente na maioria dos cliques. Trocado por `e.target.closest(...)`,
  que sobe na árvore do DOM até achar o botão, não importa em qual parte
  dele o toque aconteceu.

## Changelog v2.9

- Segundo passe de design no painel de **Alertas**, mais ousado que a
  v2.7: card com elevação (sombra + leve brilho no topo), ícone de cada
  tipo de alerta (Preço/Variação%/Halving/Ciclo) com ícone próprio em vez
  de só texto, botão "Adicionar" com gradiente + ícone de "+" real e
  glow, ícone do cabeçalho com gradiente e sombra, itens da lista de
  alertas com leve elevação/deslocamento no hover, e as notas informativas
  (ℹ) trocaram o texto solto por um ícone circular. Estado vazio agora usa
  borda tracejada, reforçando visualmente que é um placeholder.
- Corrigido de passagem: o botão "Adicionar" só existia estilizado no
  formulário de Preço no i18n (`alerts_add`) — o texto só era trocado no
  primeiro dos 4 botões ao mudar de idioma. Agora atualiza os 4.

## Changelog v2.8

- Corrigida uma regressão que a própria v2.7 introduziu: o título "Alertas"
  passou a aparecer como código SVG cru na tela. Causa: o `applyI18n()` foi
  ajustado pra escrever só o texto do título (`textContent`, pra não apagar
  o novo ícone em badge), mas o valor salvo no dicionário de tradução
  (`alerts_title`) ainda tinha o SVG embutido junto com "Alertas" — sobra
  do formato antigo, de antes do redesign, onde esse texto era injetado
  via `innerHTML`. `textContent` não interpreta HTML, então o SVG aparecia
  como texto literal. Corrigido o valor no dicionário para ser só
  `'Alertas'`, já que o ícone agora vive fixo no HTML, fora do i18n.

## Changelog v2.7

- Redesenhado o painel de **Alertas** (aba Mercado) com visual mais moderno
  e profissional: cabeçalho com ícone em badge e subtítulo; seletor de
  tipo (Preço/Variação %/Halving/Ciclo) agora é uma grade de 4 colunas de
  largura total (corrige o desalinhamento visto quando ele quebrava linha
  ao lado do seletor de moeda); moeda movida pra linha própria com rótulo;
  toggles de direção e botões ativos com leve sombra pra dar mais
  destaque; campos de valor maiores e com foco mais visível (glow); botão
  "+ Adicionar" mais robusto; itens da lista de alertas com borda lateral
  colorida (verde/vermelho conforme a direção) e hover no botão de
  remover; estado vazio com ícone; notas informativas viraram chips com
  fundo sutil em vez de texto solto cinza.

## Changelog v2.6

- Causa raiz real do travamento em "Abrindo gráfico TradingView…" (o
  timeout de 12s da v2.5 era só uma rede de segurança, não a correção):
  o `wrapper` que envolve o iframe do gráfico começa com `display:none` e
  só fica visível quando o evento `load` do iframe dispara — mas o iframe
  tinha `loading="lazy"`, e um iframe lazy dentro de um contêiner escondido
  nunca começa a carregar (o navegador só inicia carregamento lazy quando
  o elemento está visível). Um deadlock: o carregamento esperava ficar
  visível, e a visibilidade esperava o carregamento. Removido
  `loading="lazy"` do iframe — sem prejuízo, já que ele só é criado sob
  demanda, quando a aba do gráfico é aberta.

## Changelog v2.5

- Corrigido: o gráfico TradingView (aba Mercado) ficava travado
  indefinidamente em "Abrindo gráfico TradingView…" depois da correção do
  download de imagem na versão anterior. Revertido o atributo
  `allow="clipboard-write"` adicionado ali — era o candidato mais provável
  a estar interferindo na política de permissões do iframe em alguns
  navegadores — mantendo só o `allow-downloads` no `sandbox`, que é o
  mínimo necessário e documentado pro fix de download continuar
  funcionando.
- Adicionado um timeout de segurança: se o gráfico não sinalizar que
  carregou em 12 segundos (rede lenta, falha momentânea etc.), aparece um
  aviso com botão "Tentar novamente" em vez de ficar preso no placeholder
  de carregamento pra sempre.

## Changelog v2.4

- Corrigido: no gráfico BTC/USD (TradingView, aba Mercado), as opções
  "Baixa imagem" e "Copiar imagem" do menu de captura apareciam mas não
  funcionavam. A causa era o parâmetro `saveimage=0` na URL de incorporação
  do widget, que desativa esse recurso do próprio TradingView. Alterado
  para `saveimage=1`.

## Changelog v2.4

- Corrigido: "Baixa imagem" no menu de captura do gráfico TradingView (aba
  Mercado) não funcionava — o clique registrava, mas o navegador bloqueava
  o download silenciosamente. Causa: o `sandbox` do iframe do gráfico não
  incluía `allow-downloads`, permissão exigida pelo Chrome (desde a v89)
  para que um iframe em sandbox possa disparar downloads de arquivo.
  Adicionado `allow-downloads` ao sandbox e `clipboard-write` ao atributo
  `allow`, para que "Copiar imagem" também funcione.

## Changelog v2.3

- **Auditoria de notificações offline:** alertas de **Preço** e **Variação %**
  não podem funcionar com o dispositivo 100% offline — dependem de saber a
  cotação atual do BTC, e sem internet não existe essa informação (limitação
  real, não um bug). O mesmo vale pra alertas de **Ciclo** (Fear & Greed /
  MVRV), que dependem de um índice externo.
- **Corrigido:** alertas de **Halving** eram o único tipo que já funcionava
  inteiramente offline (é só aritmética sobre a data do último halving, sem
  nenhuma API envolvida) — mas o Service Worker nunca os checava em segundo
  plano, então só disparavam com o app aberto. Agora o `sw.js` calcula os
  dias restantes localmente e dispara a notificação mesmo com o app fechado
  e o dispositivo sem internet nenhuma.
- Continua valendo a limitação de plataforma: checagem em segundo plano
  (app fechado) só é suportada em navegadores com Periodic Background Sync
  (Chrome/Edge no Android, app instalado). Em outros navegadores (ex:
  Safari/iOS), os alertas — incluindo halving — continuam funcionando
  normalmente enquanto o app estiver aberto.

## Changelog v2.2

- O padrão de exibição em **BTC** (em vez de sats) já estava correto no
  código desde a v2.0, mas o `sw.js` (Service Worker do PWA) ainda estava
  na versão `v1.6` — então quem já tinha o app instalado continuava recebendo
  o `index.html` antigo do cache, com o comportamento anterior. Versão do
  cache atualizada para `v2.1`, forçando o Service Worker a buscar a versão
  nova na próxima abertura do app.

## Changelog v2.1

- Corrigido: as seções **Alertas de Preço** e **Meta de Acumulação** ficavam
  escondidas na tela Início quando ainda não havia nenhum aporte registrado.
  Nenhuma das duas depende de aportes existirem (alertas são sobre cotação;
  a meta mostra progresso 0% até o primeiro aporte), então agora aparecem
  sempre. Removidas as variáveis que ficaram sem uso após a correção.

## Changelog v2.0

- Ícone do card "Unidade de exibição" (Configurações) agora alterna
  dinamicamente entre o símbolo ₿ (quando BTC está selecionado) e o ícone
  de sats (quando sats está selecionado).

## Changelog v1.9

- Removido o card **Retorno Anual (XIRR)** da tela Início — o card **Aportes**
  passou a ocupar essa posição na grade.
- Removido também todo o código associado (não ficou "arquivo morto"):
  as funções `_xirrNPV`, `calcXIRR`, `computePortfolioPerformance` e
  `renderPortfolioPerformance`, o cache de throttle do XIRR, o elemento
  `#ps-xirr`/`#ps-xirr-sub` e as três chamadas que os alimentavam (em
  `renderPortfolio()` e `renderPortfolioPrices()`). Textos de onboarding e
  comentários que citavam XIRR/Retorno Anual também foram atualizados.

## Changelog v1.8

- **Correção importante:** o backup criptografado (aba **Mais → Backup**)
  só incluía os **aportes** — vendas e gastos registrados na aba Saídas
  nunca eram salvos no arquivo `.btcbak`. Restaurar um backup em outro
  aparelho (ou depois de limpar os dados) apagava silenciosamente todo o
  histórico de saídas, e a posição líquida usada pelo motor do portfólio
  (Início, Meta, XIRR, gráfico de Evolução Patrimonial) voltava a ser
  calculada como se nada tivesse sido vendido/gasto.
- Agora o export inclui `vendas` junto com `aportes` no payload criptografado,
  e o import valida e restaura as duas listas — com as mesmas opções de
  Substituir/Mesclar já existentes para aportes, agora aplicadas também às
  saídas (a validação de schema para saídas já existia no código, só não
  estava conectada ao fluxo de backup).
- Backups antigos (só com aportes) continuam sendo importados normalmente,
  por compatibilidade — só não trazem as saídas, já que elas nunca foram
  gravadas nesses arquivos.

## Changelog v1.7

- **Correção importante:** vendas/gastos registrados na aba **Saídas**
  passavam a existir só como um card isolado de "Lucro/Prejuízo Realizado"
  ali dentro — mas nunca eram descontados da posição mostrada no resto do
  app. Agora patrimônio (Início), progresso da Meta, Retorno Anual (XIRR) e
  o gráfico de Evolução Patrimonial usam a posição líquida (aportes menos
  vendas/gastos), então registrar uma saída reduz de fato o saldo exibido em
  todo o app, e não só na própria aba Saídas.
- "Valor Investido" e "Preço médio" no card de Início e na aba Meta agora
  refletem o custo que ainda está preso na posição atual (o preço médio de
  compra continua o mesmo — não muda com vendas — mas o valor investido
  total cai proporcionalmente ao que já foi vendido/gasto).
- O Retorno Anual (XIRR) agora considera as saídas como entradas de caixa na
  data em que ocorreram (mesmo "Gasto em BTC", pelo valor de mercado do dia),
  em vez de ignorá-las.

## Changelog v1.6

- Correção visual: a linha "1 BTC = $X" no card de preço ao vivo agora só
  aparece no modo de exibição **sats** (como "1 SAT = $X"). No modo BTC ela
  ficava redundante com o preço grande já mostrado logo acima, então foi
  escondida.
- Auditoria de código: removidas 2 referências a elementos que nunca
  existiram no HTML (`goal-pct-badge` e `fng-label` — código morto que não
  quebrava nada, mas também não fazia nada) e adicionado o elemento que
  faltava para mostrar "Próxima atualização" do Fear & Greed Index (o dado
  já era buscado da API, só não tinha onde aparecer na tela).
- Verificação completa: sem tags HTML desbalanceadas, sem IDs duplicados,
  sem `onclick`/`getElementById` apontando para algo inexistente (exceto os
  2 itens acima, já corrigidos), sem `setInterval` vazando por duplicação.

## Estrutura da pasta

```
.
├── index.html          → o app inteiro (HTML + CSS + JS)
├── manifest.json        → metadados de PWA (nome, ícones, cores)
├── sw.js                 → Service Worker (cache offline + alertas de preço em segundo plano)
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-192-maskable.png   → versão com padding de segurança p/ Android
    ├── icon-512-maskable.png
    ├── apple-touch-icon.png    → 180×180, usado no iOS
    └── favicon-32.png
```

Nenhum arquivo precisa ser compactado — sobem exatamente como estão, soltos no repositório.

## Deploy no GitHub Pages

1. Crie um repositório no GitHub (pode ser público, que é o que o Pages grátis exige).
2. Suba **todo o conteúdo desta pasta** na raiz do repositório (ou dentro de `/docs`, se preferir esse layout) — use "Add file → Upload files" e arraste tudo de uma vez, mantendo a subpasta `icons/`.
3. Em **Settings → Pages**, escolha a branch (`main`) e a pasta (`/root` ou `/docs`).
4. Salve. Em alguns minutos o site fica no ar em:
   `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

   Se o repositório se chamar exatamente `SEU-USUARIO.github.io`, a URL fica limpa, direto na raiz do domínio.

## Usando no Appilix (gerar o APK)

1. No painel do Appilix, informe a URL do GitHub Pages (a URL completa, incluindo `/NOME-DO-REPO/` se for o caso).
2. Configure ícone, splash screen e cores (o app já tem `theme_color: #f7931a` e `background_color: #080808` no manifest, o Appilix pode reaproveitar).
3. **Atenção:** o sistema de "push notifications" do Appilix é separado do sistema de alertas de preço deste app — o Appilix serve para você mandar campanhas/mensagens manualmente pelo painel dele; os alertas de preço de BTC continuam sendo controlados pelo Service Worker (`sw.js`) deste projeto, de forma independente.

## Backup em nuvem (se for reativado no futuro)

Caso volte a usar integração OAuth com Google Drive / Dropbox / OneDrive, cada provedor exige que a URL final do GitHub Pages seja cadastrada como origem/redirect URI autorizada nos respectivos consoles (Google Cloud Console, Dropbox App Console, Azure AD). Isso só funciona com `http(s)`, nunca com `file://`.

## Atualizando o app depois do deploy

- Edite `index.html` e/ou `sw.js` normalmente e suba a nova versão (novo commit).
- Se mudar `sw.js`, incremente a constante `SW_VERSION` no topo do arquivo — isso força os dispositivos já instalados a baixar a nova versão do cache em vez de continuar servindo a versão antiga.

## Métricas de performance (Retorno Anual / XIRR)

Além do P&L simples (valor atual − investido), a tela inicial mostra o
**Retorno Anual**: a taxa interna de retorno anualizada de verdade,
calculada a partir da data e do valor de cada aporte individualmente
(equivalente ao `XIRR()` do Excel/Google Sheets). É o número correto para
avaliar a performance real da carteira quando há vários aportes ao longo do
tempo — diferente de uma valorização simples, ele não trata dinheiro que
entrou ontem como se estivesse investido desde o início.

É recalculado sempre que um aporte é adicionado/editado/excluído ou a moeda
é trocada. Por ser mais custoso (resolvido por bisseção sobre o VPL), também
é atualizado a cada ~30s enquanto o preço do BTC oscila ao vivo, para não
pesar no desempenho em carteiras com muitos aportes. Com menos de 30 dias de
histórico desde o primeiro aporte, o indicador fica marcado como "período
curto", já que taxas anualizadas de janelas muito curtas tendem a ser bem
instáveis.

## Tutorial de boas-vindas (onboarding)

Na primeira vez que o app abre neste dispositivo, aparece um tutorial de 5
telas (Boas-vindas, Aportes, Patrimônio, Alertas/Ciclo, Segurança dos
dados). Depois de visto/pulado uma vez, não aparece mais sozinho — mas pode
ser reaberto a qualquer momento em **Mais → Como usar**. O controle de "já
visto" fica em `localStorage` (`btcstack_onboarding_v1`); apagar os dados do
site no navegador faz o tutorial aparecer de novo.

## Alertas de halving e de indicador de ciclo

Além de preço e variação %, a aba Alertas tem mais dois tipos:

- **Halving**: avisa quando faltar N dias (ou menos) para o próximo halving,
  usando a mesma contagem regressiva já mostrada na tela de ciclo.
- **Ciclo**: avisa quando o Fear & Greed Index ou o MVRV cruzarem um limite
  que você definir (ex: "F&G abaixo de 20" ou "MVRV acima de 3.5").

Diferente dos alertas de preço/variação %, esses dois **só funcionam com o
app aberto** — não têm suporte em segundo plano pelo Service Worker. Como
Fear & Greed e MVRV normalmente só são buscados quando você visita as abas
Mercado/Ciclo, o app passa a buscá-los periodicamente em segundo plano
(dentro da própria aba, em qualquer tela) sempre que houver pelo menos um
alerta de ciclo cadastrado — parando de buscar automaticamente se você
remover todos os alertas desse tipo, pra não gastar bateria/dados à toa.

## Notificações de preço e variação %

Além dos alertas por preço-alvo (ex: "BTC acima de $150.000"), a partir da v1.5
também é possível criar alertas por **variação percentual em uma janela de
tempo** (ex: "avisar se cair 10% em 24h"). Na aba Alertas, escolha a aba
"Variação %", a direção (queda/alta), o percentual e a janela (1h / 24h / 7
dias).

Esses alertas comparam o preço atual com uma amostra salva em
`btcport_price_history_v1` (localStorage), que registra o preço a cada ~5 min
(máx. 8 dias de histórico). Por isso, um alerta de variação recém-criado pode
levar um tempo para ficar com dados completos da janela escolhida — enquanto
isso, ele simplesmente não dispara (sem falsos positivos).

Os alertas de preço (`_priceAlerts`) — agora incluindo os de variação %, que
usam `type: 'percent'` no lugar de `type: 'price'` — funcionam em dois níveis:

1. **App aberto:** checagem via JS da página, feedback imediato.
2. **App fechado/minimizado:** o `sw.js` sincroniza os alertas (e, para os de variação %, o histórico de preço em `priceHistory`) via IndexedDB (o Service Worker não acessa `localStorage`) e tenta rodar checagens em segundo plano via **Periodic Background Sync**, buscando o preço direto na API da Binance, atualizando o histórico e disparando `showNotification()`.

> Suporte a Periodic Background Sync existe hoje majoritariamente em Chrome/Edge no Android, com o app instalado (Appilix conta como instalado) e uso recorrente — o navegador decide o intervalo real, sem garantia de frequência fixa. Em engines sem suporte (iOS Safari, Firefox), os alertas continuam funcionando normalmente enquanto o app está aberto, sem quebrar nada.
>
> Há também um **Background Sync (one-off)** como reforço: sempre que a conexão volta ou o app é minimizado, é pedida uma checagem pontual — útil como rede de segurança mesmo em conexões instáveis.
>
> Se `SW_VERSION` (no topo do `sw.js`) mudar, incremente o valor para forçar a atualização do cache nos dispositivos que já instalaram o app.
