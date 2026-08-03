# Etapa 02: Design System e UI/UX

## 1. Princípios Visuais e Estética
O **App Coffee Experience** adota uma identidade visual elegante, acolhedora e alinhada ao universo de cafés especiais, evitando visuais genéricos ou clichês.

- **Tema:** Dark mode terroso refinado (Warm Charcoal / Cafés Especiais).
- **Sensação do Usuário:** Sensação de clube exclusivo de café, transparência e facilidade de navegação.

## 2. Paleta de Cores (Tokens de Design)
- **Fundo Principal (Background):** `#0e0906` (Warm Charcoal Profundo)
- **Superfícies / Cards:** `#18110c` (Charcoal Médio)
- **Bordas / Divisores:** `#2e2117`
- **Cor Primária (Destaques/Ações):** `#e29339` (Âmbar Torrado)
- **Cor Primária Hover:** `#fca843` (Dourado Vivo)
## 2. Paleta de Cores & Suporte Dual Theme (Modo Escuro e Modo Claro)

O aplicativo suporta alternância fluida de temas (**Modo Escuro** padrão e **Modo Claro**), mantendo a identidade visual terrosa e sofisticada em ambos.

### 2.1 Tokens do Modo Escuro (Dark Mode - Padrão)
- **Background Principal (`--bg-primary`):** `#0e0906` (Warm Charcoal Profundo)
- **Superfícies / Cards (`--bg-surface`):** `#18110c` (Charcoal Amadeirado)
- **Superfícies Elevadas / Modais (`--bg-elevated`):** `#241a13`
- **Bordas e Divisores (`--border-color`):** `#2e2117`
- **Cor Primária / Destaques (`--primary`):** `#e29339` (Âmbar Torrado)
- **Cor Primária Hover (`--primary-hover`):** `#fca843` (Dourado Quente)
- **Texto Principal (`--text-primary`):** `#f4eee8` (Off-white / Creme - Alto Contraste)
- **Texto Secundário (`--text-secondary`):** `#b5a495` (Suave Amadeirado)
- **Texto Muted (`--text-muted`):** `#7e6e60`

### 2.2 Tokens do Modo Claro (Light Mode)
- **Background Principal (`--bg-primary`):** `#f9f6f0` (Creme Suave de Papel Filtro)
- **Superfícies / Cards (`--bg-surface`):** `#ffffff` (Branco Puro com Sombra Suave)
- **Superfícies Elevadas / Modais (`--bg-elevated`):** `#f2ebe1`
- **Bordas e Divisores (`--border-color`):** `#e2d7c9`
- **Cor Primária / Destaques (`--primary`):** `#c4731a` (Âmbar Torrado Escuro)
- **Cor Primária Hover (`--primary-hover`):** `#a55c0f`
- **Texto Principal (`--text-primary`):** `#23170f` (Café Torra Escura - Alto Contraste)
- **Texto Secundário (`--text-secondary`):** `#5c4a3d` (Marrom Amadeirado)
- **Texto Muted (`--text-muted`):** `#8c7868`

---

## 3. Escala Tipográfica e Ergonomia Visual

A escala tipográfica foi calculada para garantir **máximo conforto visual**, legibilidade perfeita em telas de celular e desktop, e hierarquia clara de informações.

### 3.1 Famílias Tipográficas (Google Fonts)
- **Títulos e Headings:** `Playfair Display` ou `Outfit` (Elegância, sofisticação e personalidade).
- **Corpo de Texto e Tabelas:** `Sora` ou `Inter` (Legibilidade extrema, excelente espaçamento entre caracteres e clareza de números).

### 3.2 Tabela Responsiva de Tipografia (Mobile vs. Desktop)

Adotamos a escala de tipos fluidos inspirada nas melhores práticas dos aplicativos mobile e web de maior sucesso (como Stripe, Airbnb e Spotify), ajustando dinamicamente via `clamp()` ou media queries (`@media (min-width: 768px)`).

| Elemento | Celular / Mobile (`< 768px`) | Desktop (`>= 768px`) | Peso (`font-weight`) | Espaçamento (`line-height`) | Uso Indicado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **H1 (Título Principal)** | **28px** (`1.75rem`) | **36px** (`2.25rem`) | `700` (Bold) | `1.2` | Título de páginas e destaques de Lote |
| **H2 (Seção)** | **22px** (`1.375rem`) | **28px** (`1.75rem`) | `600` (Semi-bold) | `1.3` | Título de seções ("Lotes Abertos", "Perfil") |
| **H3 (Subseção / Card)** | **18px** (`1.125rem`) | **22px** (`1.375rem`) | `600` (Semi-bold) | `1.35` | Nome do café no Card, títulos de Modais |
| **H4 (Subcard / Rótulo)** | **16px** (`1.000rem`) | **18px** (`1.125rem`) | `500` (Medium) | `1.4` | Preço/kg, pontuação SCA, subrótulos |
| **Body Large (Texto Destaque)**| **16px** (`1.000rem`) | **18px** (`1.125rem`) | `400` (Regular) | `1.6` | Introduções, resumos sensoriais do café |
| **Body Base (Parágrafo Padrão)**| **15px** (`0.9375rem`)* | **16px** (`1.000rem`) | `400` (Regular) | **`1.55`** | Descrições, regras de frete e notas |
| **Body Small (Legendas/Inputs)**| **14px** (`0.875rem`) | **14px** (`0.875rem`) | `400` / `500` | `1.5` | Inputs, datas, status e prazos |
| **Caption / Badge** | **12px** (`0.750rem`) | **12px** (`0.750rem`) | `600` (Semi-bold) | `1.4` | Badges de status, tags pequenas e avisos |

*\*Nota de Ergonomia Mobile: No mobile, 15px/16px garante que o teclado virtual do iOS/Android não aplique zoom automático forçado em inputs, mantendo a navegação 100% estável e confortável.*

---

## 4. Componentes UI Reutilizáveis e Disposição do Catálogo (Estilo Cardápio Digital)

A exibição do catálogo de cafés da compra coletiva segue o padrão visual refinado dos melhores aplicativos de **cardápio digital / marketplace premium** (referência: *LiveMenu / Arvo*):

### 4.1 Carrossel Superior de Categorias Rápidas
- **Pill Badges com Foto/Thumbnail:** Cards horizontais deslizáveis no topo para filtro rápido de categorias (ex: `Cafés Especiais 85+`, `Lotes Microlotes`, `Torra Média`, `Edição Limitada`, `Kits & Acessórios`).

### 4.2 Navegação por Abas Horizontais Fixas
- **Tabs Deslizantes:** Abas horizontais limpas com linha indicadora inferior na cor Âmbar (`--primary`) para alternância entre seções (ex: `Lotes Abertos`, `Próximos Lotes`, `Produtores Parceiros`).

### 4.3 Cards da Lista de Cafés (Layout Horizontal com Foto à Direita e Expansão inline)
Cada item do lote é disposto em uma linha horizontal elegante e de alta legibilidade:
- **Cabeçalho do Card (Sempre Visível):**
  - **Lado Esquerdo:** Nome do café/produtor em destaque, breve frase de notas sensoriais, preço por kg (ex: **R$ 65,00/kg**), badge de pontuação SCA e botão de alternância **"Ver Detalhes ∨"** / **"Ocultar Detalhes ∧"**.
  - **Lado Direito:** Thumbnail da imagem do café com bordas arredondadas e proporção quadrada (`96x96px`).
- **Área Expansível (Accordion / Dropdown Suave):**
  - Ao clicar no botão **"Ver Detalhes"**, o card se expande suavemente exibindo:
    - Ficha sensorial completa (variedade, altitude, processo de secagem, produtor).
    - Barra detalhada de meta do lote (ex: *45 kg arrecadados de 60 kg meta*).
    - Calculadora interativa para escolha da cota em kg.
    - Botão direto de checkout e participação no lote via PIX.

---

- **Seletor de Tema (Theme Switcher):** Botão acessível para alternar entre Modo Escuro (Dark) e Modo Claro (Light) com salvamento automático no `localStorage`.
- **Botão Flutuante Barista IA (Floating Action Button):** 
  - **Desktop (`>= 768px`):** Posicionado no canto inferior direito (`bottom: 24px; right: 24px;`).
  - **Celular / Mobile (`< 768px`):** Posicionado acima da barra de navegação/sidebar inferior (`bottom: 80px; right: 16px;`), com `z-index` e recuo calculados para **nunca sobrepor a barra de navegação móvel ou menus laterais**.

---

## 5. Diretrizes de UX e Interação
- **Checkout em 2 Clics:** Acesso rápido à cota sem etapas desnecessárias de formulário.
- **Feedback Visual Imediato:** Micro-animações em botões, transições suaves ao alterar quantidades de kg e feedback de carregamento.
- **Contraste Acessível (WCAG AA):** Todas as combinações de cor de texto e fundo no Modo Claro e Escuro possuem contraste mínimo de 4.5:1.
- **Prevenção de Sobreposição de UI Mobile:** Botões flutuantes (FAB) e notificações devem respeitar a *safe area* do dispositivo e a altura da navegação fixa inferior.
- **Design Responsivo:** Grid flexível otimizado primeiramente para mobile (mobile-first) e expandido harmoniosamente no desktop.
