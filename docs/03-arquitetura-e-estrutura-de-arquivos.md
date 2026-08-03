# Etapa 03: Arquitetura e Estrutura de Arquivos

## 1. Visão Geral da Arquitetura
Para resolver a limitação da versão atual (monolito em `app.js`), o projeto será reestruturado em **módulos JS bem definidos com responsabilidade única**, utilizando JavaScript ES Modules (ESM) nativo no navegador.

## 2. Estrutura Proposta de Diretórios
```
App Coffe Experience/
├── docs/                             # Documentação técnica dividida em 10 etapas
│   ├── 01-visao-geral-e-requisitos.md
│   ├── 02-design-system-e-ui-ux.md
│   ├── 03-arquitetura-e-estrutura-de-arquivos.md
│   ├── 04-modelagem-de-dados-e-firestore.md
│   ├── 05-autenticacao-e-perfil-de-usuario.md
│   ├── 06-modulo-de-cafes-e-receitas.md
│   ├── 07-comunidade-e-recursos-sociais.md
│   ├── 08-integracao-ai-gemini.md
│   ├── 09-seguranca-pwa-e-performance.md
│   └── 10-plano-de-testes-e-implantacao.md
├── src/                              # Código-fonte modularizado
│   ├── js/
│   │   ├── core/                     # Inicialização e estado global
│   │   │   ├── app-init.js
│   │   │   ├── firebase-service.js
│   │   │   └── state-manager.js
│   │   ├── modules/                  # Módulos funcionais da aplicação
│   │   │   ├── auth/                 # Login e gerenciamento de perfil
│   │   │   ├── batches/              # Gestão de lotes de compra coletiva
│   │   │   ├── participations/       # Participação, calculadoras e PIX
│   │   │   ├── delivery/             # Gestão de retiradas e distribuição
│   │   │   └── ai-barista/           # Assistente IA Gemini
│   │   └── utils/                    # Utilitários genéricos e formatadores
│   │       ├── currency.js
│   │       ├── date-helpers.js
│   │       └── ui-helpers.js
│   └── css/                          # Estilos modularizados
│       ├── base.css                  # Reset e variáveis (tokens)
│       ├── components.css            # Botões, cards, modais, badges
│       └── layouts.css               # Header, sidebar, grid de lotes
├── assets/                           # Imagens, ícones e fontes locais
├── index.html                        # Ponto de entrada HTML limpo
├── manifest.json                     # PWA Web App Manifest
├── sw.js                             # Service Worker PWA
└── firestore.rules                   # Regras de segurança Firestore
```

## 3. Diretrizes de Modularização
- **Nenhum arquivo monolítico:** `app.js` será refatorado e dividido na estrutura `src/js/`.
- **Export/Import Nativo:** Utilização de `import { module } from './path.js'` no JavaScript.
- **Isolamento de Estado:** O estado da aplicação será gerenciado por um módulo dedicado `state-manager.js` para garantir consistência visual em tempo real.
