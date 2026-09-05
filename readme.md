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

## Usando no Appilix/Median.co (gerar o APK)

1. No painel do wrapper (Appilix, Median.co etc.), informe a URL do GitHub Pages (a URL completa, incluindo `/NOME-DO-REPO/` se for o caso).
2. Configure ícone, splash screen e cores (o app já tem `theme_color: #f7931a` e `background_color: #080808` no manifest, o wrapper pode reaproveitar).
3. **Atenção:** o sistema de "push notifications" do wrapper (ex: OneSignal, no caso do Median) é separado do sistema de alertas de preço deste app — ele serve para você mandar campanhas/mensagens manualmente pelo painel dele; os alertas de preço de BTC continuam sendo controlados pelo Service Worker (`sw.js`) deste projeto, de forma independente. Dentro do WebView empacotado, notificações reais do sistema não funcionam pelo Service Worker — por isso a aba "Alertas" fica automaticamente oculta quando o app roda empacotado.


## Atualizando o app depois do deploy

- Edite `index.html` e/ou `sw.js` normalmente e suba a nova versão (novo commit).
- Se mudar `sw.js`, incremente a constante `SW_VERSION` no topo do arquivo — isso força os dispositivos já instalados a baixar a nova versão do cache em vez de continuar servindo a versão antiga.

## Tutorial de boas-vindas (onboarding)

Na primeira vez que o app abre neste dispositivo, aparece um tutorial de 5 telas (Boas-vindas, Aportes, Patrimônio, Alertas/Ciclo, Segurança dos dados). Depois de visto/pulado uma vez, não aparece mais sozinho — mas pode ser reaberto a qualquer momento em **Mais → Como usar**. O controle de "já visto" fica em `localStorage` (`btcstack_onboarding_v1`); apagar os dados do site no navegador faz o tutorial aparecer de novo.