# Etapa 10: Plano de Testes e Implantação

## 1. Diretriz Mandatória de Testes
> **REGRA CRÍTICA:** Todos os testes e validações de funcionalidades devem ser apresentados e explicitamente aprovados pelo usuário antes de qualquer entrega ou encerramento de etapa. Nenhum dado será inventado.

## 2. Roteiro Passo a Passo de Testes Finais para Aprovação do Usuário

Abaixo está o guia detalhado de testes que o usuário/testador deve executar para validar e aprovar o aplicativo:

---

### 🧪 Teste 1: Autenticação, Perfil e Endereço (Etapa 05)
1. **Passo 1.1:** Acesse a tela inicial e clique em **"Criar Conta"**.
2. **Passo 1.2:** Preencha Nome, E-mail, Senha e os campos de **Endereço Completo** (Rua, Número, Bairro, Cidade, Estado e CEP).
3. **Passo 1.3:** Confirme o cadastro. Verifique se o perfil foi criado como `participante` e se as informações de endereço aparecem corretamente salvas no Perfil.
4. **Passo 1.4:** Faça logout e efetue login novamente para validar a persistência da sessão.

---

### 🧪 Teste 2: Visualização do Catálogo & Alternância de Temas (Etapa 02)
1. **Passo 2.1:** Navegue para a tela de **Marketplace / Cardápio**.
2. **Passo 2.2:** Clique no botão **"🌙 Escuro" / "☀️ Claro"** no topo da tela e confirme se a interface alterna de forma fluida entre o tema terroso escuro (`#0e0906`) e o tema creme claro (`#f9f6f0`).
3. **Passo 2.3:** Deslize pelo carrossel superior de categorias (*Microlotes 85+*, *Torra Média*) e alterne as abas superiores com o indicador Âmbar.

---

### 🧪 Teste 3: Cards Expansíveis Inline e Calculadora de Receita (Etapa 02 & 06)
1. **Passo 3.1:** Na lista de cafés, localize um card e clique no botão **"Saiba mais ∨"**.
2. **Passo 3.2:** Confirme se o card se desdobra para baixo sem trocar de página, exibindo a ficha sensorial completa (SCA, varietal, notas gustativas).
3. **Passo 3.3:** Clique em **"Ocultar ▲"** e verifique se o card se recolhe suavemente.
4. **Passo 3.4:** Acesse a **Calculadora de Proporção** e insira 300 ml de água no método V60 (1:15). Verifique se o sistema calcula instantaneamente **20.0g de café**.
5. **Passo 3.5:** Inicie o **Timer de Barista** e observe a transição dos estágios (*Pré-Infusão*, *1º Despejo*, *2º Despejo*).

---

### 🧪 Teste 4: Compra de Cota, Rateio de Frete e Checkout PIX em 2 Fases (Etapa 04 & 05)
1. **Passo 4.1:** No card do café do lote ativo, selecione **2 kg** e clique em **"+ 1kg ao Carrinho"**.
2. **Passo 4.2:** Abra o carrinho flutuante e verifique se o valor total do café é calculado corretamente (**Quantidade kg × Preço kg + Rateio Proporcional do Frete**).
3. **Passo 4.3:** Clique em **"Finalizar Pedido"**.
4. **Passo 4.4:** No modal de pagamento, confirme se a **Chave PIX do Líder de Grupo** e o QR Code são exibidos.
5. **Passo 4.5:** Clique em **"Copiar Chave PIX"** e verifique a notificação de confirmação.

---

### 🧪 Teste 5: Resiliência de Conexão e Fila Offline (Etapa 04 & 09)
1. **Passo 5.1:** Desconecte a internet do seu computador/celular (ou ative o modo *Offline* no DevTools do navegador).
2. **Passo 5.2:** Tente realizar uma participação em um lote.
3. **Passo 5.3:** Confirme se o aplicativo grava a cota no cache local (`IndexedDB`) com aviso de *"Participação gravada offline"*.
4. **Passo 5.4:** Reconecte a internet. Verifique se o evento `online` dispara a sincronização automática e atualiza o lote no servidor.

---

### 🧪 Teste 6: Feed da Comunidade e Engajamento (Etapa 07)
1. **Passo 6.1:** Acesse a seção de **Engajamento do Lote**.
2. **Passo 6.2:** Verifique se as últimas adesões dos participantes aparecem no feed em tempo real.
3. **Passo 6.3:** Visualize os cards de avaliações de degustação (reviews de 1 a 5 estrelas).

---

## 3. Procedimento de Implantação (Deploy)
- Hospedagem e deploy contínuo via Firebase Hosting (`firebase deploy`).
- Verificação do Service Worker e regras do Firestore em ambiente de produção.
- Checklist final de entrega em conjunto com a aprovação explícita do usuário humano.
