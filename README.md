# TravelHub — Japão 2026

https://victorciola-collab.github.io/TravelHub/

Guia pessoal de viagem feito com HTML, CSS e JavaScript puro. O projeto não usa frameworks, backend ou etapa de build e pode ser publicado diretamente no GitHub Pages.

## Fontes de dados

`places-japan-2026.json` é a fonte única do catálogo de locais. `assets/js/data.js` fornece `window.TRAVEL_DATA` para roteiro, hotéis, voos, tarefas e operações do roteiro, sem duplicar a coleção de locais.

`assets/js/places-loader.js` busca o JSON, valida os IDs e só então carrega `assets/js/app.js`. O restante do aplicativo recebe os locais em `window.TRAVEL_DATA.places` e mantém o mesmo schema e as mesmas funcionalidades.

Edite diretamente `places-japan-2026.json` para alterar locais. Edite `assets/js/data.js` para alterar:

- `itinerary`: dias do roteiro e referências por `localIds`.
- `hotels`: hospedagens e datas.
- `trip`: destino, reserva, passageiros e voos.
- `tasks`: próximos passos.
- `itineraryOps`: observações, progresso, horários e ordenação do roteiro.

Os IDs em `itinerary.localIds` devem corresponder a IDs existentes no JSON. As operações do roteiro também usam os IDs dos locais.

## Execução local e GitHub Pages

O carregamento do JSON usa `fetch()`, portanto abra o projeto por HTTP ou HTTPS. GitHub Pages atende a esse requisito. Para testar localmente, inicie um servidor HTTP estático na pasta do projeto; abrir `index.html` diretamente por `file://` não permite ao navegador buscar o JSON.

## Armazenamento

A única chave de `localStorage` usada é `travelhub-theme`, para guardar a preferência de tema Light/Dark. Alterações feitas nos dados pela interface são temporárias na sessão; para mantê-las, edite os arquivos de dados e publique novamente. O GitHub Pages apenas serve os arquivos.

## Estrutura

```text
TravelHub/
├── index.html
├── README.md
├── places-japan-2026.json
└── assets/
    ├── css/styles.css
    └── js/
        ├── data.js
        ├── places-loader.js
        └── app.js
```

## Publicar no GitHub Pages

Nas configurações do repositório, abra **Pages**, selecione **Deploy from a branch**, escolha a branch principal e a pasta `/ (root)`. Salve para publicar.
