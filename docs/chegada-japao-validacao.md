# Guia de chegada ao Japão — validação

Verificação em 12/10/2026. Implementação local, sem commit, push ou publicação.

## Arquivos

- `index.html`: item Transportes na navegação, guia estático e referências aos arquivos novos. Alterações pré-existentes preservadas.
- `assets/css/transportes.css`: estilos limitados ao guia, com as variáveis dos temas existentes.
- `assets/js/transportes.js`: checklist independente, progresso, persistência, reset com confirmação, saltos entre etapas e cópia do endereço com alternativa quando a API não está disponível.
- `chegada-japao-offline.html`: versão independente com textos, esquema, CSS e JavaScript locais.
- `scripts/build-arrival-offline.cjs`: regenera a versão offline a partir do guia no index.
- `scripts/test-arrival.cjs`: testes de integração em Chrome, sem dependências adicionais.
- `README.md`: uso, manutenção, armazenamento e limitações.
- `qa-arrival-results.json`: resultado local dos testes, regenerado pelo script.

`data.js`, `places-japan-2026.json`, `app.js`, `styles.css` e `places-loader.js` mantêm os mesmos hashes SHA-256 registrados antes da implementação. Os testes também compararam os registros em memória antes e depois das interações com o guia.

## Resultado dos testes

Testes reais em Chrome headless, com perfil temporário, servidor em localhost e caminho `/TravelHub/` para simular o prefixo do GitHub Pages:

- 320, 375, 390, 768 e 1440 px, nos temas Dark e Light: nenhuma rolagem horizontal no guia, inclusive com detalhes expandidos.
- Navegação das seis seções, abertura/fechamento do menu mobile e renderização dos registros existentes: passaram.
- Atalhos entre etapas: mantêm `#transportes` e movem o foco para a etapa.
- Checklist de 14 itens: marcação, desmarcação, 100%, persistência após recarga, cancelamento e confirmação do reset passaram.
- Armazenamento bloqueado: checklist continua utilizável, com aviso de ausência de persistência.
- Cópia do endereço: apresenta retorno ao usuário, incluindo alternativa de seleção se a área de transferência estiver indisponível.
- Esquemas de URLs e download da versão offline sob `/TravelHub/`: passaram.
- Arquivo offline aberto por `file://` com rede desligada: textos, endereço e checklist funcionaram.
- Nenhuma exceção JavaScript capturada pelo navegador.
- Sintaxe dos scripts novos e `git diff --check`: sem erros.

Os testes em Chrome não substituem a conferência no modelo específico de celular Android. Abrir HTML em um visualizador que bloqueia JavaScript pode impedir o checklist; use navegador compatível. O relatório de layout verifica dimensões, não representa revisão visual de todas as telas.

## Fontes oficiais e limites

- [Narita — American Airlines](https://www.narita-airport.jp/en/flight/airline-search/aal/): companhia listada no Terminal 2. O terminal específico de chegada do AA61 de 31/10 continua a reconfirmar.
- [Narita — chegada internacional](https://www.narita-airport.jp/en/airportguide/inter-arr/), [mapa](https://www.narita-airport.jp/en/map/) e [JR EAST T2・3](https://www.jreast.co.jp/multi/customer_support/service_center_narita_2nd3rd.html): procedimentos, B1F, localização do balcão e horário informado de 8h30–20h00.
- [JR EAST — Welcome Suica](https://www.jreast.co.jp/en/multi/welcomesuica/purchase.html): venda listada nos terminais, 28 dias, sem depósito, recarga em ienes e ausência de devolução comum de saldo. O estoque no dia e o pagamento inicial por crédito no equipamento específico permanecem pendentes; a aceitação geral de crédito no balcão não foi tratada como confirmação da compra do cartão.
- [Keisei — Access Express](https://www.keisei.co.jp/keisei/tetudou/skyliner/us/traffic/express.php), [tarifas](https://www.keisei.co.jp/keisei/tetudou/skyliner/us/traffic/express_fares.php) e [FAQ](https://www.keisei.co.jp/keisei/tetudou/skyliner/us/faq/index.php): rota, serviços para Asakusa e referência de ¥1.290 em bilhete / ¥1.276 com IC. Não foram inventados plataforma, frequência ou horário de partida.
- [Toei — Asakusa](https://www.kotsu.metro.tokyo.jp/subway/stations/asakusa.html) e [identificação do elevador A2b](https://www.kotsu.metro.tokyo.jp/subway/kanren/inspection/pdf/inspection202509_01.pdf): estação A18, mapa e elevador. O documento de inspeção de setembro/2025 identifica o equipamento, mas não confirma funcionamento em 31/10/2026.
- [APA — hotel](https://www3.apahotel.com/hotel/syutoken/tokyo/asakusa-kuramae-kita/) e [acesso](https://map.apahotel.com/map/840): hotel correto, endereço, telefone, check-in/out e A2b a três minutos a pé.
- [JNTO](https://www.japan.travel/en/plan/hotline/): números locais de emergência 110 e 119.

Pendências destacadas no guia: chegada às 16h45 no pedido versus 15h30 no cadastro; terminal operacional; estoque e pagamento inicial do cartão; trem direto disponível no momento; tarifa vigente; operação dos elevadores; metragem e geometria exatas da caminhada.

As estimativas de tempo são margens de planejamento. A janela conservadora é 19h20–21h00 a partir de 16h45, sem incluir check-in, e pode se ampliar. A distância aproximada de 200–300 m é inferida do tempo divulgado pela APA, sem medição geográfica confirmada.

## Imagens e offline

As fotos reais do cartão, máquina, balcão e fachada correta, além dos mapas oficiais, estão disponíveis por links para os autores. Esses destinos foram consultados; não foi presumida autorização para copiar ou incorporar imagens. Nenhuma fotografia externa foi copiada para o projeto nem apresentada como imagem local. O esquema a pé é original, sem escala e sem representação de ruas.

A versão baixada não requer rede para seu conteúdo essencial; links, mapas e fotos oficiais requerem conexão. Não foi introduzido service worker nem alterada a arquitetura de carregamento de locais. O armazenamento do arquivo offline é independente do site.
