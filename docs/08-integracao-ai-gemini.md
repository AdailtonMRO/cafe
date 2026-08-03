# Etapa 08: Integração AI Gemini

## 1. Visão Geral da IA
Integração com a API do **Google Gemini** (usando `@google/genai` no frontend/backend ou Firebase AI Logic) para atuar como um **Barista Sommelier Virtual** especializado nos cafés do clube.

## 2. Casos de Uso da IA

### 2.1 Guia de Extração Personalizado
Com base nas características do café ativo no lote (variedade, altitude, notas gustativas) e no método que o usuário possui em casa, o Gemini gera uma receita de extração personalizada (tamanho da moagem, temperatura exata da água e técnica de despejo).

### 2.2 Harmonização (Food Pairing)
Recomendação inteligente de acompanhamentos (doces, queijos, pães) que harmonizam com o perfil sensorial do café comprado no lote.

### 2.3 Atendimento e Resolução de Dúvidas sobre o Lote
Assistente em linguagem natural para responder dúvidas comuns sobre o processo de compra coletiva, rateio de frete e prazos de torra.

## 3. Interface Visual do Barista IA
- **Botão Flutuante (FAB):** 
  - **Desktop:** `bottom: 24px; right: 24px; z-index: 99;`
  - **Mobile (`< 768px`):** `bottom: 80px; right: 16px; z-index: 99;` (posicionado estritamente acima da barra de navegação/sidebar inferior para **evitar qualquer sobreposição visual**).
- **Modal de Chat:** Abertura fluida com animação de subida (slide up) e suporte a histórico de mensagens.

## 4. Segurança e Boas Práticas
- Chaves de API gerenciadas de forma segura.
- Prompts com instruções de sistema (System Instructions) estritas para garantir respostas precisas sobre café sem alucinações de dados.
