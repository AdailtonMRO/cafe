# Plano ajustado da aplicação de compra coletiva de café

## 1. Objetivo
Criar uma aplicação web onde:
- administradores abrem pedidos coletivos de café;
- usuários cadastrados visualizam os pedidos e escolhem participar;
- o usuário informa a quantidade em quilos que deseja comprar;
- o sistema calcula automaticamente o valor total com base no tipo de café e no valor por kg;
- o participante pode pagar sua parte via PIX com QR Code;
- o administrador acompanha o status da participação e do pagamento.

## 2. Regras de negócio

### Cadastro do pedido pelo administrador
Ao abrir um pedido, o administrador informa:
- tipo de café;
- valor por kg;
- data de abertura;
- data limite para participação;
- data limite para pagamento;
- status do pedido (aberto, fechado ou cancelado).

### Participação do usuário
Quando um usuário participa, ele informa:
- quantidade em kg que deseja comprar;
- o valor total é calculado automaticamente com a regra:
  - valor_total = quantidade_kg × valor_por_kg.

### Status de pagamento e retirada
Cada participação pode ter status como:
- pendente;
- pago;
- cancelado;
- além disso, pode indicar se o pedido foi retirado pelo usuário.

### Controle de retirada
Depois que o pedido é entregue ou disponibilizado para retirada, o usuário deve poder marcar a participação como:
- aguardando retirada;
- recebido/retirado.

Isso ajuda o administrador a acompanhar quais pedidos já foram efetivamente recebidos pelos participantes.

## 3. Fluxo principal de uso
1. O administrador faz login.
2. Cria um pedido coletivo informando o tipo de café e o valor por kg.
3. Os usuários cadastrados visualizam o pedido e escolhem a quantidade desejada.
4. O sistema calcula o valor total da participação.
5. O usuário vê o QR Code do PIX para efetuar o pagamento.
6. O administrador confirma o pagamento e fecha o pedido quando necessário.

## 4. Arquitetura proposta

### Frontend
- Aplicação web estática hospedada no GitHub Pages.
- Ideal para uma interface simples e rápida de usar.
- Pode ser construída com HTML, CSS e JavaScript puros ou com um framework leve como React.

### Banco de dados e autenticação
- Firebase Authentication para cadastro e login.
- Firestore para armazenar:
  - usuários;
  - pedidos;
  - participações;
  - status de pagamento.

### Observação importante
Como o GitHub Pages é uma hospedagem estática, a lógica mais sensível deve ficar no frontend com cuidado ou, no futuro, em Firebase Functions. Para o MVP, a regra de cálculo do valor e a gestão de estados podem ser feitas diretamente no app.

## 5. Estrutura de dados no Firebase

### Coleção users
Campos:
- uid
- nome
- email
- papel (admin ou usuario)
- criadoEm

### Coleção pedidos
Campos:
- id
- criadoPor
- tipoCafe
- valorPorKg
- dataAbertura
- dataLimiteParticipacao
- dataLimitePagamento
- status
- observacoes

### Coleção participacoes
Campos:
- id
- pedidoId
- usuarioId
- quantidadeKg
- valorTotal
- statusPagamento
- dataParticipacao
- dataPagamento
- qrCodePago (opcional)

## 6. MVP inicial
As funcionalidades prioritárias para a primeira versão são:
1. Cadastro e login de usuários.
2. Login com papel de administrador ou usuário comum.
3. Criação de pedidos pelo administrador.
4. Listagem de pedidos abertos.
5. Participação com escolha de quantidade em kg.
6. Cálculo automático do valor total.
7. Exibição de QR Code do PIX para pagamento.
8. Status de pagamento atualizado pelo administrador.
9. Controle de retirada, com o usuário informando quando recebeu o pedido.

## 7. Estratégia de pagamento no MVP
Para não complicar a primeira versão, a recomendação é:
- usar um fluxo simples de QR Code de exemplo ou um link de pagamento temporário;
- depois evoluir para integração real com um provedor de PIX.

## 8. Próximos passos para a implementação
1. Definir a estrutura das telas principais.
2. Criar o projeto no Firebase.
3. Configurar autenticação e Firestore.
4. Criar a interface de cadastro/login.
5. Implementar a criação de pedidos pelo administrador.
6. Implementar a participação do usuário com cálculo automático do valor.
7. Adicionar a exibição do QR Code do PIX.
8. Implementar o fluxo de confirmação de retirada pelo usuário.
9. Publicar a aplicação no GitHub Pages.

## 9. Perguntas para decidir a seguir
- Quer que o MVP use um QR Code de exemplo ou já uma integração real com um provedor de PIX?
- O usuário deve poder alterar a quantidade escolhida antes do fechamento do pedido?
- O administrador precisa ver uma lista completa de participantes com valor e status de pagamento?
- Deseja uma interface simples com poucas telas ou um painel mais completo já na primeira versão?
