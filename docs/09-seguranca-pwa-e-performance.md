# Etapa 09: Segurança, PWA e Performance

## 1. Segurança e Regras do Firestore
- **`firestore.rules`:** Implementação de regras estritas onde:
  - Qualquer usuário autenticado pode ler lotes ativos e participações.
  - Apenas o usuário criador da participação pode modificar ou cancelar sua própria cota antes do fechamento do lote.
  - Apenas o Líder (`lider`) pode alterar o status do lote e confirmar pagamentos PIX de terceiros.
- **`security-monitor.js`:** Validação contínua de tentativas de acesso não autorizadas.

## 2. Progressive Web App (PWA) e Suporte Offline Seguro
- **`manifest.json`:** Definição de ícones, tema (`#0e0906`), nome do app e modo de exibição nativo (`standalone`).
- **`sw.js` (Service Worker & Background Sync):** 
  - Estratégia **Cache First** para ativos visuais (CSS, JS, fontes) garantindo abertura instantânea mesmo sem sinal.
  - **Background Sync API:** Registro de pendências de rede (`sync-participations`) que são enviadas automaticamente ao servidor assim que o dispositivo recuperar o sinal de internet de forma transparente para o usuário.

## 3. Otimização de Performance
- Carregamento sob demanda dos módulos JS.
- Compressão e otimização das imagens dos grãos e produtores.
- Manutenção do tempo de carregamento inicial (First Contentful Paint) abaixo de 1.5 segundos.
