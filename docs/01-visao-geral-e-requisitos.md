# Etapa 01: Visão Geral e Requisitos

## 1. Propósito do Aplicativo
O **App Coffee Experience** é uma plataforma de economia colaborativa voltada para a realização de **compras coletivas diretas de produtores de café especial**. O objetivo principal é eliminar intermediários, reduzir custos de frete através do rateio e aproximar a comunidade de entusiastas de café de grãos de alta pontuação SCA.

## 2. Perfis de Usuário (Personas)
1. **Participantes (Compradores):** Entusiastas de café especial que buscam grãos selecionados a preço de cota coletiva, acompanhando metas e pagando via PIX.
2. **Líderes de Grupo (Organizadores):** Responsáveis por abrir os lotes, gerenciar o rateio de frete, confirmar pagamentos e organizar o ponto de distribuição local.
3. **Fornecedores (Produtores e Torrefações):** Parceiros que disponibilizam as sacas/kg de café, acompanham o status de torra e prazos de envio.

## 3. Diagnóstico da Versão Atual vs. Expectativas
- **Versão Atual:** Apresenta estrutura monolítica em um único arquivo de código (`app.js` extenso), com mistura de responsabilidades e limitações na experiência do usuário.
- **Expectativa:**
  - Código altamente modular e organizado por responsabilidades claras.
  - Interface com estética premium (tons terrosos, warm charcoal, destaques em âmbar/dourado).
  - Clareza nas regras de compra coletiva, cálculo de rateio de frete e controle de status.
  - Zero dados inventados: utilizar estritamente dados reais e validados.

## 4. Requisitos Funcionais Principais
- **RF-01:** Autenticação de usuários (Login, Cadastro, Perfis com papéis: Usuário/Participante, Líder/Admin, Fornecedor).
- **RF-02:** Criação e Gestão de Lotes de Compra Coletiva (Preço por kg, meta de kg, prazo de adesão, prazo de pagamento, status do lote).
- **RF-03:** Participação em Lotes (Seleção da cota em kg, cálculo automático do valor total).
- **RF-04:** Gestão de Pagamentos PIX (Exibição de QR Code / Chave Pix e confirmação de status: Pendente, Pago, Cancelado).
- **RF-05:** Rateio Transparente de Frete (Distribuição do valor do frete entre os participantes por peso ou por participante).
- **RF-06:** Controle de Retirada e Entrega (Status: Aguardando Retirada, Recebido/Retirado pelo usuário).
- **RF-07:** Ficha Sensorial dos Cafés (Origem, variedade, altitude, pontuação SCA, notas aromáticas e perfil de sabor).
- **RF-08:** Assistente de Barista IA (Integração com Gemini API para sugestão de métodos de preparo e moagem baseada nos grãos do lote).

## 5. Requisitos Não-Funcionais
- **RNF-01:** Performance e Responsividade (Interface rápida para dispositivos móveis e desktop).
- **RNF-02:** Resiliência de Dados (Sincronização com Firebase Firestore e fallback seguro).
## 5. Diagnóstico da Modelagem de Dados Existente & Oportunidades de Melhoria

Analisando o arquivo de regras de segurança ([firestore.rules](file:///c:/Users/Adail/Documents/App%20Coffe%20Experience/firestore.rules)) e a estrutura legada do `app.js`, identificamos que o banco Firestore atual possui 8 coleções: `users`, `groups`, `orders`, `participations`, `reviews`, `group_requests`, `products` e `supplier_history`.

Para garantir **segurança estrita**, **alta escalabilidade** e **performance de custos no Firestore**, propomos as seguintes evoluções arquiteturais:

### 5.1 Isolamento Tenant/Grupo & Subcoleções
- **Problema Atual:** Coleções como `orders` e `participations` estão no nível raiz. Cada consulta precisa de índices compostos complexos e filtros constantes por `groupId`.
- **Melhoria Proposta:** 
  - Estruturar `orders` como subcoleção de `groups` (`groups/{groupId}/orders/{orderId}`).
  - Estruturar `participations` como subcoleção de `orders` (`groups/{groupId}/orders/{orderId}/participations/{participationId}`).
  - **Ganho:** Segurança simplificada por hierarquia no Firestore (herança de escopo), eliminação de risco de vazamento de dados entre grupos e redução drástica do número de leituras no banco.

### 5.2 Segurança e Validação de Funções (Custom Claims vs. Firestore Lookup)
- **Problema Atual:** As regras em `firestore.rules` utilizam a função `get()` para ler a coleção `/users/{userId}` a cada checagem de permissão (`userProfileExists()`, `getUserData()`). Isso gera leituras extras cobradas pelo Firebase e pequena latência.
- **Melhoria Proposta:**
  - Migrar os papéis de usuário (`role`: `admin`, `leader`, `supplier`, `superadmin`) para **Custom Claims** no Firebase Auth token (`request.auth.token.role`).
  - **Ganho:** Checagem de permissões instantânea no Security Rules em memória ($O(1)$) com **custo ZERO** de leitura no Firestore.

### 5.3 Atômicos e Consistência Financeira (Transactions & Batched Writes)
- **Problema Atual:** Ao registrar uma participação, a atualização do volume acumulado do lote (`kgReservados`) e criação da participação no cliente pode gerar *race conditions* (duas pessoas comprando os últimos quilos ao mesmo tempo).
- **Melhoria Proposta:**
  - Toda operação de adesão a lote, encerramento ou rateio deve utilizar **Firestore Transactions (`runTransaction`)**.
  - **Ganho:** Garantia de consistência ACID. Duas compras simultâneas nunca excederão a cota máxima do produtor.

### 5.4 Proteção de Dados Confidenciais, Privacidade e LGPD
- **Problema Atual:** Dados sensíveis de usuários (como telefones, e-mails, endereços de entrega/retirada e chaves PIX de administradores) não devem ficar expostos publicamente nem ser acessíveis por participantes não autorizados.
- **Melhoria Proposta:**
  - **Princípio do Menor Privilégio (PoLP):** Dados de contato (telefone/e-mail) de um participante serão visíveis **exclusivamente** para o próprio usuário e para o Líder/Organizador do grupo responsável pela entrega.
  - **Proteção de Chaves PIX e Dados Financeiros:** A chave PIX do organizador será trafegada e exibida apenas dentro do modal de pagamento autenticado e nunca exposta em coleções públicas.
  - **Ocultação em APIs/Respostas:** Sanitização de dados no frontend para garantir que dados sensíveis não permaneçam em variáveis de estado global (`appState`) desnecessariamente.

---

## 6. Requisitos Não-Funcionais (Atualizado)
- **RNF-01:** Performance e Responsividade (Interface limpa, tempo de carregamento < 1.5s).
- **RNF-02:** Resiliência e Cache (Estratégia offline-first com Service Worker e sincronização transparente).
- **RNF-03:** Segurança Estrita (Custom Claims no Firebase Auth + Security Rules hierárquicas em subcoleções).
- **RNF-04:** Proteção de Dados Confidenciais (Zero exposição de dados pessoais/financeiros para terceiros não autorizados - Conformidade com LGPD).
- **RNF-05:** Integridade Transacional (Uso exclusivo de Firestore Transactions para concorrência de cotas e valores).
- **RNF-06:** Aprovação Explícita do Usuário (Validação e aceite direto do usuário humano para encerramento de qualquer etapa).

