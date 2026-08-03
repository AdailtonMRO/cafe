# Etapa 06: Módulo de Cafés e Receitas

## 1. Objetivo do Módulo
Este módulo é responsável por gerenciar a experiência sensorial e prática do consumo de café especial, conectando o lote comprado pelo usuário com fichas técnicas e ferramentas de preparo.

## 2. Funcionalidades Principais

### 2.1 Exibição do Catálogo (Layout Estilo Cardápio Digital / LiveMenu)
Os cafés disponíveis para adesão no lote serão listados em um layout inspirado em cardápios digitais premium:
- **Topo com Carrossel de Categorias:** Filtros deslizantes com thumbnails (ex: *Microlotes 85+*, *Torra Média*, *Pontuação SCA Alta*).
- **Linha de Abas Horizontais:** Transição simples entre *Lotes Abertos*, *Lotes em Processamento* e *Histórico*.
- **Lista de Cafés com Imagem à Direita e Expansão Inline:**
  - Título do café em destaque, preço por kg e pontuação SCA.
  - Thumbnail retangular/quadrado arredondado à direita (`96px`).
  - **Botão "Ver Detalhes ∨":** Expande o card diretamente na lista sem trocar de página, revelando a ficha sensorial completa, contador da cota coletiva e calculadora de quilos.

### 2.2 Catálogo e Ficha Sensorial dos Cafés
Cada café participante de um lote possui uma ficha técnica detalhada:
- **Origem & Produtor:** Região, altitude de cultivo e nome da fazenda.
- **Variedade & Processo:** Ex (Catuaí Amarelo / Processo Natural ou Lavado).
- **Pontuação SCA:** Classificação sensorial oficial.
- **Notas Gustativas:** Ex (Caramelo, Frutas Amarelas, Acidez Cítrica).

### 2.2 Calculadora de Proporção Café / Água
Ferramenta para auxiliar o participante a extrair o melhor resultado da sua cota comprada:
- Entrada de quantidade desejada em ml ou gramas de café.
- Seleção da proporção desejada (ex: `1:15` para café mais encorpado, `1:16` padrão, `1:17` para bebida mais suave).
- Cálculo automático da massa exata de café em gramas e volume de água fervida em ml.

### 2.3 Timer de Extração de Barista
- Timer visual com etapas recomendadas por método (V60, Aeropress, Prensa Francesa, Cleved, Kalita).
- Etapas sinalizadas (Pré-infusão, despejos de água, tempo total de infusão).
