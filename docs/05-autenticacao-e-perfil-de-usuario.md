# Etapa 05: Autenticação e Perfil de Usuário

## 1. Escopo de Autenticação (Firebase Auth)
O acesso ao **App Coffee Experience** utiliza o Firebase Authentication para garantir identificação segura dos participantes e controle rigoroso de privilégios.

## 2. Fluxos Principais

### 2.1 Cadastro de Usuário
- **Dados Coletados:** Nome completo, e-mail, senha, telefone (WhatsApp para contato sobre retiradas) e **Endereço Completo** (Rua, Número, Bairro, Cidade, Estado e CEP) para cálculo de entregas locais ou atribuição ao grupo mais próximo.
- **Papel Inicial:** Por padrão, novos cadastros recebem o perfil de `participante`. A atribuição de `lider` ou `fornecedor` é concedida via painel administrativo ou convite verificado.

### 2.2 Login e Sessão
- Autenticação por e-mail e senha.
- Persistência de sessão configurada via Firebase (`LOCAL` persistence).
- Redirecionamento automático baseado no perfil do usuário após o login:
  - `participante` -> Feed de Lotes Abertos.
  - `lider` -> Painel de Gestão de Lotes e Confirmações de Pagamento.
  - `fornecedor` -> Painel de Acompanhamento de Pedidos, Catálogo de Grãos e Torra.

### 2.3 Gestão de Perfil
- Edição de informações de contato e **endereço de entrega/retirada**.
- Histórico pessoal de compras e participações em lotes anteriores.
- Registro de preferências de café (método favorito, perfil de torra preferido).

## 3. Gestão de Pagamentos das Cotas (Evolução em 2 Fases)

O pagamento das cotas dos lotes de compra coletiva segue uma estratégia progressiva para garantir facilidade de operação imediata e escalabilidade futura:

### 3.1 Fase 1 (MVP Atual / Operacional Imaterial): PIX Direto ao Líder do Grupo
- **Funcionamento:**
  - Na finalização da cota, o participante visualiza a **Chave PIX do Líder de Grupo** (Chave Aleatória, CPF/CNPJ, E-mail ou Telefone).
  - O sistema disponibiliza o botão **"Copiar Chave PIX"** e exibe o QR Code estático do Líder.
  - O participante realiza o pagamento no seu app bancário e clica em **"Confirmar Pagamento / Enviar Comprovante"**.
  - O status da participação fica como `pendente_confirmacao`.
  - O Líder acessa seu painel administrativo, confere o valor recebido na conta e altera o status para **`pago`**.

### 3.2 Fase 2 (Evolução / Produção Escala): Gateway de Pagamento & Conta Digital (Split de Pagamento)
- **Funcionamento:**
  - Integração automatizada via Gateway de Pagamento / Conta Digital (ex: *Asaas*, *Mercado Pago*, *PagSeguro* ou *Pagar.me*).
  - **Métodos Suportados:**
    * **PIX Dinâmico (QR Code com Webhook):** Confirmação automática em tempo real assim que o pagamento é efetuado, sem necessidade de aprovação manual do Líder.
    * **Cartão de Crédito (À vista ou Parcelado):** Permite o pagamento em cartão com cálculo de taxas de parcelamento.
    * **Boleto Bancário:** Opcional para lotes de maior volume.
  - **Split de Pagamento Automático:** O gateway direciona a parcela do café diretamente para o fornecedor/produtor e o valor do frete/gestão para o líder de grupo.

---

## 4. Segurança e Controle de Acesso no Frontend
- Guardas de rotas/telas (`auth-guard.js`) que impedem que participantes acessem funções exclusivas de líderes de grupo.
- Ocultação visual de botões administrativos para contas sem privilégio correspondente.
