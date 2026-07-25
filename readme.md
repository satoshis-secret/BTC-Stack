# BTC Stack

App de controle de aportes, posições e desempenho em Bitcoin. Single-page app estático (HTML/CSS/JS puro), sem backend — todos os dados ficam no dispositivo (localStorage/IndexedDB).

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

## Notificações de preço

Os alertas de preço (`_priceAlerts`) funcionam em dois níveis:

1. **App aberto:** checagem via JS da página, feedback imediato.
2. **App fechado/minimizado:** o `sw.js` sincroniza os alertas via IndexedDB (o Service Worker não acessa `localStorage`) e tenta rodar checagens em segundo plano via **Periodic Background Sync**, buscando o preço direto na API da Binance e disparando `showNotification()`.

> Suporte a Periodic Background Sync existe hoje majoritariamente em Chrome/Edge no Android, com o app instalado (Appilix conta como instalado) e uso recorrente — o navegador decide o intervalo real, sem garantia de frequência fixa. Em engines sem suporte (iOS Safari, Firefox), os alertas continuam funcionando normalmente enquanto o app está aberto, sem quebrar nada.
>
> Há também um **Background Sync (one-off)** como reforço: sempre que a conexão volta ou o app é minimizado, é pedida uma checagem pontual — útil como rede de segurança mesmo em conexões instáveis.
>
> Se `SW_VERSION` (no topo do `sw.js`) mudar, incremente o valor para forçar a atualização do cache nos dispositivos que já instalaram o app.
