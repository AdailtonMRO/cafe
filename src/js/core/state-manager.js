/**
 * Gerenciador de Estado Global Isolado (State Manager)
 * App Coffee Experience
 */

const initialState = {
  user: null,
  profile: null, // { name, role, groupId, canCreateGroup, ... }
  group: null,   // { id, name, code, adminId }
  orders: [],
  participations: [],
  reviews: [],
  loading: false,
  firebaseMode: false,
  firebaseError: null,
  activeAuthTab: 'login', // 'login' | 'register'
  idToken: null,
  theme: localStorage.getItem('coffee_theme') || 'dark',
  selectedCategory: 'all',
  cart: JSON.parse(localStorage.getItem('coffee_cart_1kg') || '[]'),
  activeNavSection: 'menu',
  expandedCardId: null,
  mobileSidebarOpen: false
};

class StateManager {
  constructor() {
    this.state = { ...initialState };
    this.listeners = [];
  }

  /**
   * Retorna uma cópia do estado atual
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Atualiza parcialmente o estado e notifica ouvintes
   * @param {Partial<typeof initialState>} updates 
   */
  setState(updates) {
    this.state = { ...this.state, ...updates };

    // Persistência sutil no localStorage para preferências
    if ('theme' in updates) {
      localStorage.setItem('coffee_theme', updates.theme);
      document.body.setAttribute('data-theme', updates.theme);
    }
    if ('cart' in updates) {
      localStorage.setItem('coffee_cart_1kg', JSON.stringify(updates.cart));
    }

    this.notify();
  }

  /**
   * Inscreve um callback para reagir a mudanças de estado (Reatividade)
   * @param {Function} listener 
   * @returns {Function} Função para cancelar inscrição
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

export const stateManager = new StateManager();
