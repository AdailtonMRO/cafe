# Configuração do Firebase

## 1. Usar o projeto existente
1. Acesse https://console.firebase.google.com/ e selecione o projeto com o ID `coffeexperience` (ou o projeto vinculado ao número `877876646443`).
2. Se ainda não houver um app web registrado, entre em "Project settings" > "Your apps" > "Add app" > "Web".
3. Registre um app web e copie a configuração do SDK para o arquivo [cafe/firebase-config.js](firebase-config.js).

## 2. Ativar Authentication
1. No painel do Firebase, entre em "Authentication".
2. Clique em "Começar".
3. Ative o método de login por e-mail/senha.
4. Habilite o provedor "Google".
5. Habilite o provedor "Phone".

## 3. Ativar Firestore Database
1. Entre em "Firestore Database".
2. Clique em "Criar banco de dados".
3. Escolha a região mais próxima.
4. Inicie em modo de teste para o MVP.

## 4. Obter as configurações do app
1. Entre em "Project settings".
2. Na seção "Your apps", adicione um app web.
3. Copie as chaves do objeto de configuração:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId

## 5. Preencher o arquivo de configuração
Edite o arquivo [cafe/firebase-config.js](firebase-config.js) e substitua os valores placeholder pelos dados do projeto.

## 6. Definir administrador
No arquivo [cafe/firebase-config.js](firebase-config.js), ajuste a variável `window.adminEmail` para o e-mail que deve ter acesso administrativo.

## 7. Publicar no GitHub Pages
1. Faça o push do projeto para um repositório no GitHub.
2. Ative o GitHub Pages nas configurações do repositório.
3. Use a pasta raiz do projeto como origem.

## 8. Ajustes de segurança para produção
- Troque o Firestore para modo de produção.
- Defina regras adequadas para `users`, `orders` e `participations`.
- Considere usar Firebase Hosting em vez de GitHub Pages se quiser uma solução mais completa.
