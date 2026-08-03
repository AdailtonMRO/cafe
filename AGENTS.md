# AGENTS.md - Registro de Evolução, Decisões e Contexto para IAs e Agentes

> **ORIENTAÇÃO PARA TODAS AS IAs / AGENTES:**  
> Este documento é a **Fonte Única da Verdade (Single Source of Truth)** para o desenvolvimento do **App Coffee Experience**.  
> **Antes de realizar qualquer modificação no código ou criar novas funcionalidades**, você **DEVE ler este arquivo na íntegra** para entender o histórico de decisões, status das etapas, contratos estabelecidos e diretrizes de aprovação do usuário.

---

## 1. Princípios Inegociáveis do Projeto
1. **Aprovação Estrita do Usuário:** Nenhuma funcionalidade, arquivo de código ou teste é considerado "concluído" sem a revisão e aprovação explícita do usuário humano.
2. **Zero Dados Fictícios:** Não criar dados falsos ("mock data") genéricos ou inventados. Toda modelagem deve corresponder ao modelo de negócios real do clube de compras coletivas.
3. **Proteção Rigorosa de Dados Confidenciais:** Nenhuma informação sensível ou confidencial (como telefones, e-mails, chaves PIX, endereços ou dados de pagamento) pode ficar aberta ou exposta publicamente. Todo acesso deve respeitar o Princípio do Menor Privilégio (PoLP) e regras estritas de autenticação/autorização (LGPD).
4. **Documentação Modular em `docs/`:** O projeto é guiado por 10 documentos sequenciais localizados em `docs/`. Respeitar a ordem das etapas.
5. **Registros de Alteração Obrigatórios:** Toda IA que fizer modificações relevantes deve atualizar o registro de auditoria na Seção 4 deste arquivo.

---

## 2. Visão Geral da Arquitetura & Stack
- **Plataforma:** Web (Mobile-First + Desktop).
- **Frontend:** HTML5, CSS3 Vanilla (Design System com Warm Charcoal `#0e0906`, Âmbar `#e29339`, Creme `#f4eee8`) e JavaScript Nativo (ES Modules).
- **Backend / Persistência:** Firebase Auth, Firestore Database e Firebase Hosting.
- **Inteligência Artificial:** Integration com Google Gemini API / Firebase AI Logic para auxílio de barista sommelier virtual.
- **PWA:** Suporte offline para consulta de fichas e comprovantes de retirada via Service Worker (`sw.js`).

---

## 3. Matriz de Status das 10 Etapas

| Etapa | Documento de Especificação | Descrição | Status Atual | Responsável |
| :---: | :--- | :--- | :---: | :---: |
| **01** | [`docs/01-visao-geral-e-requisitos.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/01-visao-geral-e-requisitos.md) | Visão geral, requisitos funcionais/não-funcionais e segurança/escalabilidade de dados | 🟩 Concluído e Aprovado | Antigravity AI |
| **02** | [`docs/02-design-system-e-ui-ux.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/02-design-system-e-ui-ux.md) | Tokens de cores, tipografia, componentes UI, Modo Claro/Escuro e Cards Expansíveis | 🟩 Concluído e Aprovado | Antigravity AI |
| **03** | [`docs/03-arquitetura-e-estrutura-de-arquivos.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/03-arquitetura-e-estrutura-de-arquivos.md) | Refatoração e modularização do `app.js` monolítico | 🟩 Concluído e Aprovado | Antigravity AI |
| **04** | [`docs/04-modelagem-de-dados-e-firestore.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/04-modelagem-de-dados-e-firestore.md) | Schemas Firestore (`users`, `lotes`, `participacoes`, `fornecedores`) e Resiliência | 🟩 Concluído e Aprovado | Antigravity AI |
| **05** | [`docs/05-autenticacao-e-perfil-de-usuario.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/05-autenticacao-e-perfil-de-usuario.md) | Firebase Auth, Perfil com Endereço e Pagamentos em 2 Fases (PIX / Gateway) | 🟩 Concluído e Aprovado | Antigravity AI |
| **06** | [`docs/06-modulo-de-cafes-e-receitas.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/06-modulo-de-cafes-e-receitas.md) | Fichas SCA, calculadora de água/café e timer | 🟩 Concluído e Aprovado | Antigravity AI |
| **07** | [`docs/07-comunidade-e-recursos-sociais.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/07-comunidade-e-recursos-sociais.md) | Feed social, reviews e barra de engajamento do lote | 🟩 Concluído e Aprovado | Antigravity AI |
| **08** | [`docs/08-integracao-ai-gemini.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/08-integracao-ai-gemini.md) | Barista virtual inteligente com Gemini API | ⬜ A Iniciar (Pausado) | - |
| **09** | [`docs/09-seguranca-pwa-e-performance.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/09-seguranca-pwa-e-performance.md) | Security Rules, Service Worker e performance | 🟩 Concluído e Aprovado | Antigravity AI |
| **10** | [`docs/10-plano-de-testes-e-implantacao.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/10-plano-de-testes-e-implantacao.md) | Validação E2E, aprovação do usuário e deploy | 🟩 Concluído e Aprovado | Antigravity AI |

*Legenda de Status:*  
- ⬜ **A Iniciar:** Especificado na documentação, aguardando início.  
- 🟨 **Em Definição / Em Progresso:** Trabalho ativo na etapa.  
- 🟦 **Aguardando Aprovação:** Código/Funcionalidade construída, submetida para revisão do usuário.  
- 🟩 **Concluído e Aprovado:** Validado e aprovado diretamente pelo usuário.

---

## 4. Registro Histórico de Alterações e Evolução (Changelog de IAs)

### [2026-08-02] - Início do Replanejamento e Estruturação do `docs/` e `AGENTS.md`
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** A versão legada monolítica (`app.js`) não atende às expectativas de modularização, clareza visual e experiência do usuário.
- **Alterações Realizadas:**
  1. Criação do diretório `docs/` com 10 especificações de etapas (`01-visao-geral-e-requisitos.md` até `10-plano-de-testes-e-implantacao.md`).
  2. Criação do arquivo `AGENTS.md` no repositório raiz como guia permanente para todas as ferramentas e modelos de IA futuros.
- **Decisões Técnicas Alinhadas:**
  - Código limpo, modularizado sob `src/`.
  - Zero dados inventados.
  - Aprovação mandatória do usuário para encerramento de tarefas/testes.

### [2026-08-02] - Ajuste da Etapa 02 & 06: Suporte a Cards Expansíveis (Accordion Inline) na Lista de Cafés
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Permitir que a visualização de detalhes (ficha sensorial, meta coletiva e calculadora de cotas em kg) ocorra de forma fluida com a expansão inline do card ao clicar no botão "Ver Detalhes".
- **Alterações Realizadas:**
  1. Atualização dos documentos [`docs/02-design-system-e-ui-ux.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/02-design-system-e-ui-ux.md) e [`docs/06-modulo-de-cafes-e-receitas.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/06-modulo-de-cafes-e-receitas.md).
  2. Especificação do componente expansível (Accordion suave com transição CSS) mantendo a foto à direita (`96px`) e revelando os detalhes avançados sem navegação de página.

### [2026-08-02] - Ajuste da Etapa 02 & 06: Layout da Lista de Cafés no Estilo Cardápio Digital (Referência LiveMenu/Arvo)
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Adaptar a exibição da lista de cafés para uma estrutura moderna e de alta legibilidade tipo cardápio digital premium, idêntica ao modelo de referência fornecido pelo usuário.
- **Alterações Realizadas:**
  1. Atualização das especificações nos documentos [`docs/02-design-system-e-ui-ux.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/02-design-system-e-ui-ux.md) e [`docs/06-modulo-de-cafes-e-receitas.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/06-modulo-de-cafes-e-receitas.md).
  2. Definição do layout da lista:
     - **Carrossel Superior de Categorias:** Thumbnails horizontais deslizáveis (ex: *Microlotes 85+*, *Torra Média*).
     - **Abas Horizontais com Indicador Âmbar:** Alternância limpa entre categorias.
     - **Cards Horizontais Elegantes:** Informações detalhadas do grão (nome, notas sensoriais, preço/kg, pontuação SCA e meta de saca) alinhadas à esquerda, acompanhadas da thumbnail da foto do produto à direita (`96x96px` arredondada).

### [2026-08-02] - Ajuste da Etapa 02 & 08: Prevenção de Sobreposição do Barista IA no Mobile
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Evitar que o Botão Flutuante (FAB) do Assistente Barista IA sobreponha a barra de navegação/sidebar inferior em dispositivos móveis.
- **Alterações Realizadas:**
  1. Atualização dos documentos [`docs/02-design-system-e-ui-ux.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/02-design-system-e-ui-ux.md) e [`docs/08-integracao-ai-gemini.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/08-integracao-ai-gemini.md).
  2. Definição da regra responsiva de CSS para o FAB: `bottom: 80px; right: 16px;` no mobile (`< 768px`), garantindo folga adequada acima da navegação inferior (que ocupa até 64px) e respeitando a *safe area*.

### [2026-08-02] - Ajuste da Etapa 05: Estratégia de Pagamento de Cotas em 2 Fases (PIX Direto ao Líder vs. Gateway Digital)
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Definir o fluxo de pagamento das cotas de café alinhando a operação imediata (PIX direto ao organizador) com a evolução em escala (gateway bancário com cartão de crédito e split de pagamento).
- **Alterações Realizadas:**
  1. Atualização do documento [`docs/05-autenticacao-e-perfil-de-usuario.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/05-autenticacao-e-perfil-de-usuario.md) detalhando as 2 Fases de Pagamento:
     - **Fase 1 (Atual):** PIX direto ao Líder de Grupo com botão "Copiar Chave", QR Code estático e confirmação pelo painel administrativo.
     - **Fase 2 (Escala):** Integração com Gateway/Conta Digital (PIX dinâmico via webhook com confirmação automática, Cartão de Crédito parcelado e Split automático de pagamento entre fornecedor e frete).

### [2026-08-02] - Ajuste da Etapa 04 & 09: Arquitetura de Resiliência para Instabilidade de Rede e Sincronização Offline
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Garantir que nenhuma participação ou compra de kg seja perdida quando o participante estiver em locais de sinal instável ou offline.
- **Alterações Realizadas:**
  1. Atualização dos documentos [`docs/04-modelagem-de-dados-e-firestore.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/04-modelagem-de-dados-e-firestore.md) e [`docs/09-seguranca-pwa-e-performance.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/09-seguranca-pwa-e-performance.md).
  2. Implementação da estratégia em 3 camadas:
     - **Persistência IndexedDB Nativa do Firestore:** Gravação e confirmação imediata no cache do navegador.
     - **Fila de Sincronização Offline (`Outbox Sync Queue`):** Retentativas automáticas no retorno do sinal (`online` event) via Firestore Transactions.
     - **Inalterabilidade de Valores (`snapshotPricePerKg`):** Congelamento do preço acertado no momento do clique, independente de atraso no sinal.

### [2026-08-02] - Execução da Etapa 09: Implementação das Regras de Segurança Estritas e Service Worker PWA com Background Sync
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Aplicar as melhores práticas de Engenharia de Software para segurança de banco de dados no Firestore e resiliência offline do aplicativo.
- **Alterações Realizadas:**
  1. Reescrita do arquivo [`firestore.rules`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/firestore.rules) para suportar subcoleções hierárquicas (`groups/{groupId}/orders/{orderId}/participations`), checagem por Custom Claims e proteção de dados confidenciais (LGPD).
  2. Atualização do arquivo [`sw.js`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/sw.js) com estratégia de cache *Cache First* e escuta de eventos de **Background Sync** (`sync-participations`).

### [2026-08-02] - Execução da Etapa 07: Implementação dos Módulos de Comunidade, Feed Social e Avaliações de Degustação
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Construir os componentes sociais e de engajamento em tempo real do lote sob `src/js/modules/community/feed.js`.
- **Alterações Realizadas:**
  1. Criação do arquivo [`src/js/modules/community/feed.js`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/src/js/modules/community/feed.js).
  2. Desenvolvimento da função `renderCollectiveBatchActivityFeed` (exibe adesões recentes ao lote e estimula atingimento da meta em kg).
  3. Desenvolvimento da função `renderCoffeeReviewCard` (exibe reviews com classificação de 1 a 5 estrelas e comentários dos membros).

### [2026-08-02] - Execução da Etapa 06: Implementação do Módulo de Calculadora de Água/Café e Timer de Barista
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Construir o módulo interativo de extração de café sob `src/js/modules/coffee/brew-calculator.js`.
- **Alterações Realizadas:**
  1. Criação do arquivo [`src/js/modules/coffee/brew-calculator.js`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/src/js/modules/coffee/brew-calculator.js).
  2. Implementação do dicionário de proporções de extração (`V60`, `Aeropress`, `Prensa Francesa`, `Clever`, `Chemex`).
  3. Desenvolvimento da função bi-direcional `calculateBrewRatio` (calcula gramas de café a partir de ml de água e vice-versa).
  4. Desenvolvimento da classe `BaristaTimer` com contagem em tempo real e notificações por estágios de infusão (Pré-infusão, 1º despejo, 2º despejo e drenagem).

### [2026-08-02] - Execução da Etapa 04 & 05: Implementação dos Módulos de Firebase Offline, Fila Transacional e Pagamentos PIXDedicada de Fornecedores (Suppliers)
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Atender à solicitação do usuário para incluir a estrutura completa de endereço dos participantes e formalizar a modelagem dos parceiros fornecedores (produtores/torrefações).
- **Alterações Realizadas:**
  1. Atualização do documento [`docs/04-modelagem-de-dados-e-firestore.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/04-modelagem-de-dados-e-firestore.md):
     - Adição do objeto `endereco` (`logradouro`, `complemento`, `cidade`, `uf`, `cep`, `pontoReferencia`) no schema da coleção `users` e `participacoes`.
  2. Atualização do documento [`docs/05-autenticacao-e-perfil-de-usuario.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/05-autenticacao-e-perfil-de-usuario.md) incluindo a gestão e cadastro do endereço no perfil do participante.

### [2026-08-02] - Execução da Etapa 03: Criação da Estrutura Modular `src/` e Gerenciador de Estado Reativográfica Responsiva (Mobile vs Desktop)
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Definir paleta de cores para Modo Claro (Light Mode) e Modo Escuro (Dark Mode), além de diferenciar tamanhos de texto para telas de celular e desktop baseados em aplicativos de sucesso.
- **Alterações Realizadas:**
  1. Atualização do documento [`docs/02-design-system-e-ui-ux.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/02-design-system-e-ui-ux.md) com tokens CSS para Dark Mode (`#0e0906`) e Light Mode (`#f9f6f0`).
  2. Criação da Tabela Tipográfica Fluida Responsiva separando os tamanhos para **Celular (Mobile < 768px)** (H1: 28px, H2: 22px, Body: 15px) e **Computador (Desktop >= 768px)** (H1: 36px, H2: 28px, Body: 16px), evitando zoom automático forçado no iOS/Android.

### [2026-08-02] - Revisão da Etapa 01: Segurança, Subcoleções, Resiliência e Proteção de Dados Confidenciais
- **Agente:** Antigravity AI (Google DeepMind)
- **Motivação:** Incluir diretrizes estritas de privacidade e proteção de dados confidenciais (LGPD) no escopo da Etapa 01 e nos Princípios Inegociáveis do projeto.
- **Alterações Realizadas:**
  1. Adição do Princípio Inegociável nº 3 no [`AGENTS.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/AGENTS.md) focado na proteção de dados sensíveis (telefones, e-mails, chaves PIX, endereços).
  2. Atualização do documento [`docs/01-visao-geral-e-requisitos.md`](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/docs/01-visao-geral-e-requisitos.md) com a Seção 5.4 (Princípio do Menor Privilégio e Sanitização de Estado) e inclusão do **RNF-04**.
  3. Proposta de reestruturação para **subcoleções hierárquicas** (`groups/{groupId}/orders/{orderId}/participations/{participationId}`) para eliminar vazamento multi-tenant.
  4. Recomendação de transição de *lookups* no Firestore Rules para **Custom Claims no Firebase Auth** (custo zero de leitura e verificação $O(1)$).
  5. Exigência de **Firestore Transactions (`runTransaction`)** para prevenir *race conditions* no estouro de cotas de quilos em lotes disputados.

---

## 5. Instruções para os Próximos Agentes/IAs que Trabalharem no Projeto
Quando você (IA / Agente) for acionado para executar uma tarefa neste projeto:
1. **Leia este arquivo (`AGENTS.md`)** e o arquivo de especificação da etapa correspondente na pasta `docs/`.
2. **Consulte a Seção 3 (Matriz de Status)** para saber o ponto exato em que o projeto parou.
3. **Não altere estados para "Concluído"** sem o consentimento do usuário.
4. **Após concluir suas alterações de código:**
   - Atualize a tabela da Seção 3 com o novo status.
   - Adicione uma entrada na Seção 4 (Registro Histórico) descrevendo com precisão o que foi alterado e o motivo.
