# Etapa 04: Modelagem de Dados e Firestore

## 1. Estrutura do Banco de Dados (Firebase Firestore)
O banco de dados armazena as informações necessárias para operar o clube de compras coletivas de café. Toda a modelagem é focada em dados reais e integridade de relacionamentos.

## 2. Coleções Principais

### Coleção: `users`
Armazena as informações dos usuários cadastrados na plataforma.
- `uid` (String): ID único do Firebase Auth.
- `nome` (String): Nome completo.
- `email` (String): E-mail do usuário (protegido por PoLP/LGPD).
- `papel` (String): Papel no sistema (`participante`, `lider`, `fornecedor`).
- `telefone` (String): Telefone / WhatsApp para contato de retirada (protegido por PoLP/LGPD).
- **`endereco` (Map / Objeto):** Endereço completo para entregas ou referência de ponto de encontro local:
  - `logradouro` (String): Rua / Avenida e número.
  - `complemento` (String): Bairro / Bloco / Ap.
  - `cidade` (String): Cidade.
  - `uf` (String): Estado (ex: SP, MG).
  - `cep` (String): Código de Endereçamento Postal.
  - `pontoReferencia` (String): Ponto de referência opcional.
- `criadoEm` (Timestamp): Data de cadastro.

---

### Coleção: `fornecedores` (Suppliers / Produtores & Torrefações)
Coleção dedicada ao cadastro e gestão dos parceiros fornecedores de café especial.
- `id` (String): ID único do fornecedor (ou UID do usuário com papel `fornecedor`).
- `nomeRazaoSocial` (String): Nome fantasia ou Razão Social da Torrefação / Fazenda.
- `nomeProdutor` (String): Nome do mestre de torra ou produtor responsável.
- `cnpjCpf` (String): Documento fiscal (acesso restrito aos líderes de grupo e administradores).
- `contato` (Map):
  - `telefone` (String): Telefone comercial.
  - `email` (String): E-mail de contato comercial.
  - `instagram` (String): Perfil no Instagram (ex: `@fazenda_primavera`).
- `enderecoOrigem` (Map): Cidade, Estado e Região Cafeeira (ex: *Patrocínio - Alto Paranaíba / Cerrado Mineiro*).
- `certificacoes` (Array of Strings): Ex: `["BSCA", "Organic", "Rainforest Alliance"]`.
- `pontuacaoMediaSCA` (Number): Média de pontuação dos grãos fornecidos.
- `statusAprovacao` (String): `pendente`, `aprovado`, `bloqueado`.
- `produtosDisponiveis` (Array of Refs): Lista de cafés/sacas cadastrados pelo fornecedor na coleção `products`.

---

### Coleção: `lotes` (Pedidos Coletivos)
Representa um lote de café aberto para compra coletiva por um grupo local.
- `id` (String): ID automático da coleção.
- `criadoPor` (String): UID do Líder que abriu o lote.
- `fornecedorId` (String): Referência direta ao ID do fornecedor na coleção `fornecedores`.
- `nomeCafe` (String): Nome do café / lote.
- `produtor` (String): Nome do produtor / fazenda.
- `variedade` (String): Ex: Catuaí Vermelho, Bourbon Amarelo, Arara.
- `pontuacaoSCA` (Number): Pontuação de 0 a 100.
- `valorPorKg` (Number): Preço do kg do café.
- `metaKg` (Number): Meta mínima total em kg para fechar o lote.
- `kgReservados` (Number): Total atual acumulado em kg das participações.
- `valorFreteTotal` (Number): Valor total do frete cobrado pelo envio.
- `tipoRateioFrete` (String): `por_kg` ou `por_membro`.
- `dataAbertura` (Timestamp): Data de início da campanha.
- `dataLimiteParticipacao` (Timestamp): Data limite para adesão.
- `dataLimitePagamento` (Timestamp): Data limite para pagamento do PIX.
- `status` (String): `aberto`, `fechado`, `em_torra`, `aguardando_retirada`, `concluido`, `cancelado`.
- `chavePix` (String): Chave PIX do líder para recebimento.

---

### Coleção: `participacoes`
Representa a cota comprada por um participante dentro de um lote específico.
- `id` (String): ID automático da participação.
- `loteId` (String): Referência ao ID do lote na coleção `lotes`.
- `usuarioId` (String): Referência ao UID do participante na coleção `users`.
- `quantidadeKg` (Number): Quantidade em kg solicitada.
- `valorCafe` (Number): `quantidadeKg` × `lote.valorPorKg`.
- `valorFreteProporcional` (Number): Valor rateado do frete.
- `valorTotal` (Number): `valorCafe` + `valorFreteProporcional`.
- `statusPagamento` (String): `pendente`, `pago`, `confirmado_lider`, `cancelado`.
- `statusRetirada` (String): `aguardando_entrega`, `disponivel_retirada`, `retirado`.
- `enderecoEntrega` (Map): Cópia do endereço do usuário para onde a cota deve ser entregue ou ponto de retirada associado.
- `dataParticipacao` (Timestamp): Data de registro da cota.
- `dataPagamento` (Timestamp): Data informada do pagamento.

## 3. Resiliência de Conexão e Garantia de Efetivação da Participação

Para garantir que **nenhuma participação seja perdida**, mesmo em cenários de oscilação de sinal ou perda total de conexão com a internet, aplicamos uma estratégia de resiliência em 3 camadas:

### 3.1 Habilitação da Persistência Nativa do Firestore (`enableIndexedDbPersistence`)
- **Funcionamento:** O SDK do Firebase Firestore armazena localmente em cache (`IndexedDB`) todas as leituras e gravações efetuadas pelo usuário.
- **Gravação Offline:** Quando o participante confirma sua compra de kg sem conexão, a participação é gravada instantaneamente no cache local com um ID temporário e o aplicativo responde imediatamente na tela com confirmação visual.

### 3.2 Fila de Sincronização com Retentativas Atômicas (`Outbox Sync Queue`)
- **Funcionamento:** O módulo `state-manager.js` mantém uma fila local de pendências (`pending_sync_queue` no `localStorage` / `IndexedDB`).
- **Recuperação Automática:**
  - O Service Worker (`sw.js`) e os listeners nativos de rede (`window.addEventListener('online')`) monitoram o retorno da conexão.
  - Assim que a internet se restabelece, a fila executa automaticamente uma **Firestore Transaction (`runTransaction`)** em segundo plano, enviando a participação e atualizando a cota em kg do lote no servidor.

### 3.3 Garantia de Inalterabilidade de Preço e Validação Pós-Sincronização
- Ao gravar a intenção de participação offline, o sistema gera uma assinatura/hash com o preço por kg vigente no momento do clique (`snapshotPricePerKg`).
- Mesmo que a sincronização ocorra horas depois devido à falta de sinal, o valor acordado pelo participante é garantido.

---

## 4. Fallback Local e Suporte a Demonstração
Caso o ambiente esteja em modo estritamente offline (sem Firebase configurado), o modulo `state-manager.js` garante operação 100% funcional via `localStorage` com persistência total dos dados inseridos pelo usuário.
