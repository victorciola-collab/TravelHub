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

O tema usa `travelhub-theme`; o estado recolhido dos dias usa `travelhub-itinerary-collapsed-v1`. O checklist de chegada usa `travelhub-arrival-narita-2026-v1`, isolado dos dados da viagem. O arquivo offline usa `travelhub-arrival-narita-2026-offline-v1`, sem sincronização com o site. Se o navegador bloquear o armazenamento, o guia informa que o progresso vale apenas para a sessão. Alterações nos registros pela interface continuam temporárias; para mantê-las, edite os arquivos de dados. O GitHub Pages apenas serve os arquivos.

## Transportes — chegada ao Japão

Abra **Transportes** na navegação ou `index.html#transportes`. O guia contém cinco etapas de Narita até o APA Hotel Asakusa Kuramae Kita, checklist de 14 itens com progresso persistente, endereço copiável, atalhos por etapa, links de mapas e referências visuais oficiais. Os futuros guias aparecem apenas como “Em breve”. Os temas Light/Dark reutilizam as cores do aplicativo.

As fontes oficiais foram consultadas em **12/10/2026** e estão vinculadas no próprio guia. American Airlines é listada por Narita no Terminal 2, mas o voo específico AA61 de 31/10 deve ser reconfirmado. O cadastro informa 15h30 e o pedido informa 16h45: a divergência está destacada sem alteração de `data.js`. Também permanecem pendentes estoque e pagamento inicial do Welcome Suica, partida direta disponível após o desembarque, operação do elevador e distância exata da caminhada. Tarifas são referências sujeitas a mudança.

A APA recomenda A2b a três minutos a pé, e a documentação Toei identifica o elevador nesse acesso. O esquema local da caminhada não tem escala nem geometria de ruas: use o mapa vinculado para navegação. As fotos reais e os mapas oficiais são links para os autores; não foram reproduzidos localmente sem autorização confirmada. Não há imagens geradas por IA.

### Consulta offline

O botão **Baixar guia para usar offline** baixa `chegada-japao-offline.html`, um documento independente com CSS, JavaScript e esquema embutidos. Abra-o no navegador antes da viagem. Textos, endereço, contatos e checklist não dependem de rede; Google Maps, fotos e páginas oficiais dependem de conexão. O progresso do arquivo não é sincronizado com o site. Alguns visualizadores de arquivos não executam JavaScript: use um navegador que suporte arquivos HTML locais. A persistência depende do armazenamento permitido por esse navegador.

O site principal mantém sua arquitetura e não possui cache offline garantido. Para atualizar a cópia offline após editar o guia, execute `node scripts/build-arrival-offline.cjs` (Node 22 ou posterior recomendado). O arquivo gerado é versionável e já está pronto; não é necessário Node para usar ou hospedar o projeto.

### Verificação local

`scripts/test-arrival.cjs` executa testes reais em Chrome headless com perfil temporário e servidor restrito a `127.0.0.1`. Não usa sua sessão pessoal e não publica o projeto. Execute `node scripts/test-arrival.cjs`; opcionalmente configure `TRAVELHUB_CHROME` com o caminho do executável. O script usa Node 22 ou posterior e grava `qa-arrival-results.json` como relatório local. Verifica as larguras 320, 375, 390, 768 e 1440 px nos dois temas, navegação das seis seções, checklist e recarga da página, confirmação de reset, falha de armazenamento, endereço, caminhos sob `/TravelHub/` e abertura do guia com rede desligada. Em ambiente restrito, o navegador pode exigir autorização de execução.

## Estrutura

```text
TravelHub/
├── index.html
├── README.md
├── places-japan-2026.json
├── chegada-japao-offline.html
├── scripts/
│   ├── build-arrival-offline.cjs
│   └── test-arrival.cjs
└── assets/
    ├── css/
    │   ├── styles.css
    │   └── transportes.css
    └── js/
        ├── data.js
        ├── places-loader.js
        ├── app.js
        └── transportes.js
```

## Publicar no GitHub Pages

Nas configurações do repositório, abra **Pages**, selecione **Deploy from a branch**, escolha a branch principal e a pasta `/ (root)`. Salve para publicar.
