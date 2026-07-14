import { coffeeNews, getCoffeeNewsStory } from './coffee-news.js';
import { buildConsumerRanking } from './dashboard-utils.js';

const appState = {
  user: null,
  profile: null, // { name, role, groupId, canCreateGroup, requestStatus, ... }
  group: null, // { id, name, code, adminId }
  orders: [],
  participations: [],
  reviews: [],
  usersList: [], // To map names in Admin View
  loading: true,
  firebaseMode: false,
  firebaseError: null,
  activeAuthTab: 'login', // 'login' or 'register'
  activeGroupTab: 'join', // 'join' or 'create'
  
  // Supplier states and promotions
  products: [],
  activePromoIndex: 0,

  // Super Admin panel states
  currentView: 'dashboard', // 'dashboard' or 'super_admin'
  superAdminTab: 'groups', // 'groups' or 'users' or 'requests'
  superGroups: [],
  superUsers: [],
  superRequests: [],
};

// Global real-time unsubscribers
let ordersUnsubscribe = null;

function calculateTotal(quantityKg, pricePerKg) {
  return Number((quantityKg * pricePerKg).toFixed(2));
}

function isPlaceholder(value) {
  if (!value) return true;
  const normalized = String(value).trim();
  return ['YOUR_', 'your_', 'SUA_', 'sua_', 'seu-', 'SEU-'].some((prefix) => normalized.includes(prefix)) || normalized.includes('example');
}

function getFirebaseConfig() {
  return window.firebaseConfig || null;
}

// Visual feedback systems
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close" type="button">&times;</button>
  `;

  container.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideIn 0.3s reverse forwards';
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }
  }, 4000);
}

function showModal({ title, bodyHtml, confirmText = 'Confirmar', cancelText = 'Cancelar', onShow, onConfirm }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = ''; // Clear previous modals

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" type="button">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      <div class="modal-footer">
        <button class="secondary modal-cancel-btn" type="button">${cancelText}</button>
        <button class="primary modal-confirm-btn" type="button">${confirmText}</button>
      </div>
    </div>
  `;

  container.appendChild(backdrop);

  // Trigger optional onShow hook for custom bindings
  if (onShow) {
    onShow(backdrop);
  }

  const closeModal = () => {
    backdrop.style.pointerEvents = 'none';
    // Remove immediately from DOM to prevent phantom overlays blocking page clicks
    backdrop.remove();
  };

  backdrop.querySelector('.modal-close').addEventListener('click', closeModal);
  backdrop.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);

  backdrop.querySelector('.modal-confirm-btn').addEventListener('click', async () => {
    const success = await onConfirm(backdrop);
    if (success !== false) {
      closeModal();
    }
  });
}

// Native PWA system notifications
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        showToast('Notificações do sistema ativadas com sucesso!');
      }
    });
  }
}

function triggerSystemNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: './assets/coffee-hero.svg',
        badge: './assets/coffee-hero.svg'
      });
    } catch (e) {
      // In some mobile browsers notifications need service worker registrations
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: './assets/coffee-hero.svg',
            badge: './assets/coffee-hero.svg'
          });
        });
      }
    }
  }
}

// Active connection test
async function testFirebaseConnection() {
  try {
    const db = window.firebase.firestore();
    await db.collection('orders').limit(1).get();
    return { success: true };
  } catch (error) {
    if (error.code === 'permission-denied' || error.message.includes('permission') || error.message.includes('allow')) {
      return { success: true, restricted: true };
    }
    return { success: false, error: error.message || error };
  }
}

// Unique group code generator
function generateGroupCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'CAF-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isPlatformAdmin() {
  return appState.user && window.adminEmail && appState.user.email?.toLowerCase() === window.adminEmail.toLowerCase();
}

async function loadPlatformGroups() {
  if (!isPlatformAdmin()) return;
  try {
    const db = window.firebase.firestore();
    const groupsSnapshot = await db.collection('groups').get();
    appState.superGroups = groupsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao pré-carregar lista de grupos:", error);
  }
}

async function loadSuperAdminData() {
  if (!isPlatformAdmin()) return;
  try {
    const db = window.firebase.firestore();
    const [groupsSnap, usersSnap, requestsSnap] = await Promise.all([
      db.collection('groups').get(),
      db.collection('users').get(),
      db.collection('group_requests').orderBy('createdAt', 'desc').get()
    ]);
    appState.superGroups = groupsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    appState.superUsers = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    appState.superRequests = requestsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao carregar dados de administração geral:", error);
    throw error;
  }
}

async function toggleSuperAdminView() {
  if (appState.currentView !== 'super_admin') {
    appState.loading = true;
    render();
    try {
      if (appState.firebaseMode) {
        await loadSuperAdminData();
      } else {
        loadLocalData();
      }
      appState.currentView = 'super_admin';
    } catch (err) {
      showToast('Erro ao carregar dados de controle: ' + err.message, 'error');
    } finally {
      appState.loading = false;
      render();
    }
  } else {
    appState.currentView = 'dashboard';
    if (appState.firebaseMode) {
      appState.loading = true;
      render();
      try {
        await loadPlatformGroups();
        if (appState.user) {
          await loadFirebaseData(appState.user.uid);
        }
      } catch (err) {
        console.error("Erro ao retornar para o painel:", err);
      } finally {
        appState.loading = false;
      }
    }
    render();
  }
}

async function initializeFirebase() {
  const config = getFirebaseConfig();
  if (!window.firebase || !window.firebase.auth || !window.firebase.firestore || !config || isPlaceholder(config.apiKey) || isPlaceholder(config.projectId)) {
    appState.firebaseMode = false;
    appState.firebaseError = "Configuração ausente ou incompleta no arquivo 'firebase-config.js'.";
    appState.loading = false;
    loadLocalData();
    render();
    return;
  }

  try {
    window.firebase.initializeApp(config);
    const db = window.firebase.firestore();
    try {
      await db.enablePersistence();
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn("Múltiplas abas abertas: persistência offline desativada.");
      } else if (err.code === 'unimplemented') {
        console.warn("Navegador não suporta persistência local.");
      }
    }
    const conn = await testFirebaseConnection();
    if (conn.success) {
      appState.firebaseMode = true;
      appState.firebaseError = null;
    } else {
      appState.firebaseMode = false;
      appState.firebaseError = `Erro de Conexão Firestore: ${conn.error}`;
      loadLocalData();
      appState.loading = false;
      render();
      return;
    }
  } catch (error) {
    appState.firebaseMode = false;
    appState.firebaseError = `Erro de Inicialização SDK: ${error.message}`;
    loadLocalData();
    appState.loading = false;
    render();
    return;
  }

  const auth = window.firebase.auth();
  const db = window.firebase.firestore();


  // Load active promotions on startup for both guest and authenticated views
  try {
    const productsSnap = await db.collection('products')
      .where('deadline', '>=', new Date().toISOString().slice(0, 10))
      .get();
    appState.products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Erro ao carregar produtos parceiros no inicio:", err);
  }

  auth.onAuthStateChanged(async (user) => {
    appState.loading = true;
    render();

    if (user) {
      appState.user = user;
      try {
        const profileDoc = await db.collection('users').doc(user.uid).get();
        const defaultRole = window.adminEmail && user.email?.toLowerCase() === window.adminEmail.toLowerCase() ? 'admin' : 'user';
        const canCreateGroup = defaultRole === 'admin';
        
        let profile = {
          name: user.displayName || user.email?.split('@')[0] || 'Usuário',
          role: defaultRole,
          groupId: null,
          canCreateGroup,
          requestStatus: 'none',
          createdAt: new Date().toISOString()
        };

        if (profileDoc.exists) {
          profile = { ...profile, ...profileDoc.data() };
        } else {
          await db.collection('users').doc(user.uid).set(profile);
        }

        appState.profile = profile;

        // Fetch active group if associated
        if (profile.groupId) {
          const groupDoc = await db.collection('groups').doc(profile.groupId).get();
          if (groupDoc.exists) {
            appState.group = { id: groupDoc.id, ...groupDoc.data() };
            const actualRole = appState.group.adminId === user.uid ? 'admin' : 'user';
            if (profile.role !== actualRole) {
              profile.role = actualRole;
              await db.collection('users').doc(user.uid).update({ role: actualRole });
            }
            await loadFirebaseData(user.uid);
            requestNotificationPermission(); // Ask for system notifications amigably
          } else {
            profile.groupId = null;
            profile.role = 'user';
            await db.collection('users').doc(user.uid).update({ groupId: null, role: 'user' });
            appState.group = null;
            showToast("O grupo anterior não foi encontrado ou foi excluído.", "warning");
          }
        } else {
          appState.group = null;
          appState.orders = [];
          appState.participations = [];
        }

        // Pre-load groups for selector dropdown if platform admin
        if (isPlatformAdmin()) {
          await loadPlatformGroups();
        }
      } catch (error) {
        console.error("Erro ao sincronizar perfil do Firebase:", error);
        showToast(`Erro de perfil: ${error.message}`, 'error');
      }
    } else {
      appState.user = null;
      appState.profile = null;
      appState.group = null;
      appState.orders = [];
      appState.participations = [];
      appState.reviews = [];
      appState.currentView = 'dashboard';
      if (ordersUnsubscribe) {
        ordersUnsubscribe();
        ordersUnsubscribe = null;
      }
    }

    appState.loading = false;
    render();
  });
}

async function loadFirebaseData(uid) {
  try {
    const db = window.firebase.firestore();
    const gId = appState.profile?.groupId;
    if (!gId) return;

    // Unsubscribe from previous updates before binding a new real-time sync listener
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
      ordersUnsubscribe = null;
    }

    // Bind real-time listener (onSnapshot) to orders collection
    let isFirstLoad = true;
    ordersUnsubscribe = db.collection('orders')
      .where('groupId', '==', gId)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const orderData = { id: change.doc.id, ...change.doc.data() };
          if (change.type === 'added') {
            // Trigger OS notifications if not the initial load and created by another group administrator
            if (!isFirstLoad && orderData.createdBy !== uid) {
              triggerSystemNotification(
                `Novo Café no grupo ${appState.group?.name || 'Coffee Experience'}!`,
                `${orderData.type} por R$ ${Number(orderData.pricePerKg).toFixed(2)}/kg. Participe até ${orderData.deadline}!`
              );
              showToast(`Novo pedido de café disponível: ${orderData.type}!`);
            }
          }
        });

        appState.orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        isFirstLoad = false;
        render();
      }, (error) => {
        console.error("Erro na escuta de pedidos em tempo real:", error);
      });

    // Parallelize Firestore queries for participations, users list, and limited reviews
    // Parallelize Firestore queries for participations, users list, products and limited reviews
    const isAdmin = appState.profile?.role === 'admin';
    const participationsPromise = isAdmin
      ? db.collection('participations').where('groupId', '==', gId).get()
      : db.collection('participations').where('groupId', '==', gId).where('userId', '==', uid).get();

    const reviewsPromise = db.collection('reviews').orderBy('createdAt', 'desc').limit(10).get();

    // Fetch users of the group if user is group admin or super admin
    const loadUsers = isAdmin || isPlatformAdmin();
    const usersPromise = loadUsers
      ? db.collection('users').where('groupId', '==', gId).get()
      : Promise.resolve(null);

    const productsPromise = db.collection('products')
      .where('deadline', '>=', new Date().toISOString().slice(0, 10))
      .get();

    const [partsSnap, reviewsSnap, usersSnap, productsSnap] = await Promise.all([
      participationsPromise,
      reviewsPromise,
      usersPromise,
      productsPromise
    ]);

    appState.participations = partsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    appState.reviews = reviewsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    appState.products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    if (usersSnap) {
      appState.usersList = usersSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
    }
  } catch (error) {
    console.error("Erro ao carregar dados do Firebase:", error);
    showToast("Erro ao carregar dados remotos.", "warning");
  }
}

function loadLocalData() {
  const storedOrders = localStorage.getItem('cafe-orders');
  const storedParticipations = localStorage.getItem('cafe-participations');
  const storedReviews = localStorage.getItem('cafe-reviews');
  const storedProfile = localStorage.getItem('cafe-profile');
  const storedGroup = localStorage.getItem('cafe-group');
  
  appState.orders = storedOrders ? JSON.parse(storedOrders) : [];
  appState.participations = storedParticipations ? JSON.parse(storedParticipations) : [];
  appState.reviews = storedReviews ? JSON.parse(storedReviews) : [];

  if (appState.user) {
    appState.profile = storedProfile ? JSON.parse(storedProfile) : {
      name: appState.user.displayName || appState.user.email?.split('@')[0] || 'Usuário',
      role: 'user',
      groupId: null,
      canCreateGroup: isPlatformAdmin(),
      requestStatus: 'none'
    };
    appState.group = storedGroup ? JSON.parse(storedGroup) : null;
  }

  // Load Platform Admin global lists locally for testing
  if (isPlatformAdmin()) {
    const localGroups = JSON.parse(localStorage.getItem('cafe-local-groups') || '[]');
    appState.superGroups = localGroups;

    let localUsers = JSON.parse(localStorage.getItem('cafe-local-users') || '[]');
    if (localUsers.length === 0 && appState.profile) {
      localUsers = [
        { uid: appState.user.uid, name: appState.profile.name, email: appState.user.email, role: appState.profile.role, groupId: appState.profile.groupId, canCreateGroup: appState.profile.canCreateGroup, requestStatus: 'none' },
        { uid: 'mock-user-1', name: 'João Silva', email: 'joao.silva@example.com', role: 'user', groupId: localGroups[0]?.id || null, canCreateGroup: false, requestStatus: 'none' },
        { uid: 'mock-user-2', name: 'Maria Santos', email: 'maria.santos@example.com', role: 'admin', groupId: localGroups[0]?.id || null, canCreateGroup: true, requestStatus: 'none' }
      ];
      localStorage.setItem('cafe-local-users', JSON.stringify(localUsers));
    }
    appState.superUsers = localUsers;

    const localRequests = JSON.parse(localStorage.getItem('cafe-local-requests') || '[]');
    appState.superRequests = localRequests;
  }
}

function saveLocalData() {
  localStorage.setItem('cafe-orders', JSON.stringify(appState.orders));
  localStorage.setItem('cafe-participations', JSON.stringify(appState.participations));
  localStorage.setItem('cafe-reviews', JSON.stringify(appState.reviews));
  if (appState.profile) {
    localStorage.setItem('cafe-profile', JSON.stringify(appState.profile));
  }
  if (appState.group) {
    localStorage.setItem('cafe-group', JSON.stringify(appState.group));
  }
  if (isPlatformAdmin()) {
    localStorage.setItem('cafe-local-groups', JSON.stringify(appState.superGroups));
    localStorage.setItem('cafe-local-users', JSON.stringify(appState.superUsers));
    localStorage.setItem('cafe-local-requests', JSON.stringify(appState.superRequests));
  }
}

function getUserName(userId) {
  if (appState.user && userId === appState.user.uid) {
    return appState.profile?.name || 'Você';
  }
  // Prioritize active group user list
  const match = appState.usersList.find((u) => u.uid === userId || u.id === userId);
  if (match && match.name) return match.name;

  // Fallback to platform-wide users list if loaded
  const superMatch = appState.superUsers.find((u) => u.uid === userId || u.id === userId);
  if (superMatch && superMatch.name) return superMatch.name;

  return `Consumidor ${userId.slice(-4)}`;
}

function renderConnectionBadge() {
  if (appState.firebaseMode) {
    return `
      <div class="connection-badge" title="Conectado ao Firebase Cloud Database">
        <span class="dot online"></span>
        <span>Firebase Online</span>
      </div>
    `;
  }
  return `
    <div class="connection-badge" title="${appState.firebaseError || 'Configuração offline'}">
      <span class="dot offline"></span>
      <span>Modo Local (Offline)</span>
    </div>
  `;
}

function renderGroupInfo() {
  const role = appState.profile?.role || 'user';
  const isAdmin = role === 'admin';

  if (isPlatformAdmin()) {
    return `
      <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <span class="pill" style="background:var(--accent); color:var(--bg)">Modo Super Admin</span>
        <span class="pill">Visualizar Grupo:</span>
        <select id="superAdminGroupSelector" style="background:var(--card); color:var(--text); border:1px solid var(--border); padding:0.25rem 0.5rem; border-radius:6px; font-size:0.75rem; font-family:inherit; cursor:pointer;">
          <option value="">-- Selecione o Grupo --</option>
          ${appState.superGroups.map(g => `
            <option value="${g.id}" ${appState.group?.id === g.id ? 'selected' : ''}>${g.name}</option>
          `).join('')}
        </select>
        ${appState.group ? `
          <span class="pill" style="cursor: pointer;" id="copyGroupCodeBtn" title="Clique para copiar o código de convite">
            Convite: <strong style="color:var(--accent-strong)">${appState.group.code}</strong> 📋
          </span>
        ` : ''}
      </div>
    `;
  }

  if (!appState.group) return '';
  return `
    <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <span class="pill">Grupo: <strong>${appState.group.name}</strong></span>
      <span class="pill" style="cursor: pointer;" id="copyGroupCodeBtn" title="Clique para copiar o código de convite">
        Convite: <strong style="color:var(--accent-strong)">${appState.group.code}</strong> 📋
      </span>
      ${isAdmin ? `
        <button id="groupSettingsBtn" class="secondary" style="font-size:0.7rem; padding:0.25rem 0.65rem; border-radius:6px; border:1px dashed var(--accent); margin-left:0.25rem; font-weight:600;">
          ⚙ Configurar Pix
        </button>
      ` : ''}
    </div>
  `;
}

function renderPlatformAdminToggle() {
  if (!isPlatformAdmin()) return '';
  return `
    <button id="toggleSuperAdminViewBtn" class="primary" style="background:linear-gradient(135deg, #7c2d12, #c2410c); color:white; font-size:0.75rem; padding:0.4rem 0.8rem; box-shadow:none;">
      ${appState.currentView === 'super_admin' ? 'Ver Dashboard de Compras' : '⚙️ Painel Geral do Site'}
    </button>
  `;
}

function renderPromotionsCarousel() {
  if (!appState.products || appState.products.length === 0) return '';

  const index = appState.activePromoIndex;
  const product = appState.products[index] || appState.products[0];
  if (!product) return '';

  return `
    <div class="promo-carousel-container" style="background:rgba(212,144,62,0.06); border:1px solid var(--accent); border-radius:12px; padding:1.25rem; margin-bottom:1.5rem; display:flex; flex-direction:column; gap:0.75rem; position:relative; overflow:hidden;">
      <div style="position:absolute; top:0; right:0; background:var(--accent); color:var(--bg); font-size:0.65rem; font-weight:700; text-transform:uppercase; padding:0.25rem 0.6rem; border-bottom-left-radius:8px; letter-spacing:0.04em;">
        🔥 Promoção de Fornecedor
      </div>
      <div style="margin-top:0.4rem;">
        <h3 style="font-family:'Playfair Display', serif; font-size:1.2rem; color:var(--text); margin-bottom:0.25rem;">${product.name}</h3>
        <p style="font-size:0.82rem; color:var(--muted); line-height:1.4; margin-bottom:0.75rem;">${product.description || 'Café premium diretamente do produtor parceiro.'}</p>
        
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <span class="status-pill pago" style="font-weight:700; font-size:0.75rem;">R$ ${Number(product.pricePerKg).toFixed(2)} / kg</span>
          <span class="status-pill pendente" style="background:rgba(255,255,255,0.06); font-size:0.75rem; color:var(--muted);">Estoque: ${product.availableQty} kg</span>
          <span class="status-pill pendente" style="background:rgba(239,68,68,0.1); font-size:0.75rem; color:var(--error);">Válido até: ${product.deadline}</span>
        </div>
      </div>
      ${appState.products.length > 1 ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.5rem;">
          <button class="secondary promo-prev-btn" style="padding:0.25rem 0.5rem; font-size:0.7rem; border-radius:4px; border:none; cursor:pointer;">&larr; Anterior</button>
          <span style="font-size:0.7rem; color:var(--muted); font-weight:600;">${index + 1} de ${appState.products.length}</span>
          <button class="secondary promo-next-btn" style="padding:0.25rem 0.5rem; font-size:0.7rem; border-radius:4px; border:none; cursor:pointer;">Próxima &rarr;</button>
        </div>
      ` : ''}
    </div>
  `;
}

function bindPromoCarouselEvents() {
  document.querySelector('.promo-prev-btn')?.addEventListener('click', () => {
    if (appState.products.length <= 1) return;
    appState.activePromoIndex = (appState.activePromoIndex - 1 + appState.products.length) % appState.products.length;
    render();
  });
  document.querySelector('.promo-next-btn')?.addEventListener('click', () => {
    if (appState.products.length <= 1) return;
    appState.activePromoIndex = (appState.activePromoIndex + 1) % appState.products.length;
    render();
  });
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  if (appState.loading) {
    app.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; min-height:60vh; flex-direction:column; gap:1.5rem;">
        <div style="width: 50px; height: 50px; border: 4px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s infinite linear;"></div>
        <p style="color: var(--muted)">Carregando café e conexões...</p>
      </div>
    `;
    return;
  }

  // 1. Guest view
  if (!appState.user) {
    const featuredStory = getCoffeeNewsStory(0);
    app.innerHTML = `
      <header class="header">
        <div>
          <p class="eyebrow">Clube de Compras</p>
          <h1>Coffee Experience</h1>
        </div>
        ${renderConnectionBadge()}
      </header>

      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Café & comunidade</p>
          <h1>Descubra um universo de aromas, histórias e encontros.</h1>
          <p>Monte sua compra coletiva de café com uma experiência visual inspirada no universo do café especial, acompanhada de notícias curtas para mergulhar no mundo do grão.</p>
          <div class="hero-highlights">
            <span class="pill">Café especial</span>
            <span class="pill">Torra artesanal</span>
            <span class="pill">Comunidade</span>
          </div>
          <button id="exploreButton" type="button" class="primary">Explorar e Entrar</button>
        </div>
        <div class="hero-visual">
          <img src="assets/coffee-hero.svg" alt="Ilustração de uma xícara e grãos de café" />
        </div>
        <div class="hero-panel">
          <div class="metric">
            <span>Notícia em destaque</span>
            <strong>${featuredStory.category}</strong>
          </div>
          <div>
            <h3>${featuredStory.title}</h3>
            <p>${featuredStory.blurb}</p>
          </div>
          <div class="metric">
            <span>Experiência</span>
            <strong>${featuredStory.accent}</strong>
          </div>
        </div>
      </section>

      <div class="dashboard-grid">
        <div style="display:flex; flex-direction:column; gap:1.5rem">
          ${renderPromotionsCarousel()}
          <section class="card">
            <div class="section-title">
              <h2>Novidades do café</h2>
            </div>
            <div class="news-grid">
              ${coffeeNews.map((story) => `
                <article class="news-card">
                  <span class="news-tag">${story.category}</span>
                  <strong>${story.title}</strong>
                  <p>${story.blurb}</p>
                </article>
              `).join('')}
            </div>
          </section>
        </div>

        <section class="card auth-card" id="loginSection">
          <div class="auth-tabs">
            <div class="auth-tab ${appState.activeAuthTab === 'login' ? 'active' : ''}" data-tab="login">Entrar</div>
            <div class="auth-tab ${appState.activeAuthTab === 'register' ? 'active' : ''}" data-tab="register">Criar Conta</div>
          </div>

          <form id="authForm">
            ${appState.activeAuthTab === 'register' ? `
              <div class="form-group">
                <label for="nameInput">Seu Nome</label>
                <input id="nameInput" placeholder="Ex: Ana Silva" required />
              </div>
              <div class="form-group">
                <label for="accountTypeInput">Tipo de Conta</label>
                <select id="accountTypeInput" style="padding:0.5rem; font-size:0.85rem; border-radius:6px;">
                  <option value="user">Membro Consumidor</option>
                  <option value="supplier">Fornecedor Parceiro (Requer Aprovação)</option>
                </select>
              </div>
            ` : ''}
            <div class="form-group">
              <label for="emailInput">E-mail</label>
              <input id="emailInput" type="email" placeholder="nome@provedor.com" required />
            </div>
            <div class="form-group">
              <label for="passwordInput">Senha</label>
              <input id="passwordInput" type="password" placeholder="••••••••" required />
            </div>
            <button type="submit" class="primary">
              ${appState.activeAuthTab === 'login' ? 'Entrar no Clube' : 'Registrar e Entrar'}
            </button>
          </form>

          <div class="auth-providers">
            <button id="googleSignInButton" type="button" class="secondary">
              Entrar com Google
            </button>
            <button id="phoneAuthToggleButton" type="button" class="secondary">
              Entrar via SMS (Telefone)
            </button>
          </div>

          <div id="phoneAuthSection" style="margin-top:1.25rem; display:none; flex-direction:column; gap:0.75rem; border-top:1px dashed var(--border); padding-top:1.25rem;">
            <div class="form-group">
              <label for="phoneNumber">Número de Telefone</label>
              <input id="phoneNumber" type="tel" placeholder="+55 11 99999-9999" />
            </div>
            <button id="sendCodeButton" type="button" class="primary">Enviar Código por SMS</button>
            
            <div id="otpSection" style="display:none; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">
              <div class="form-group">
                <label for="otpCode">Código de Validação</label>
                <input id="otpCode" inputmode="numeric" placeholder="6 dígitos" />
              </div>
              <button id="verifyCodeButton" type="button" class="primary">Confirmar Código</button>
            </div>
            <div id="phoneRecaptchaContainer"></div>
          </div>

          ${appState.firebaseError ? `
            <div class="hint-box warning">
              <strong>⚠️ Diagnóstico de Conexão:</strong>
              <p>Firebase indisponível. Detalhe técnico:</p>
              <code>${appState.firebaseError}</code>
              <p>Usando o <strong>Modo Local (Offline)</strong> com persistência no navegador.</p>
            </div>
          ` : `
            <div class="hint-box">
              <span>🔌 status de integração</span>
              <p>${appState.firebaseMode ? 'Banco de dados Firestore ativo.' : 'Modo local ativo.'}</p>
            </div>
          `}
        </section>
      </div>
    `;

    // Guest Event Bindings
    document.getElementById('exploreButton')?.addEventListener('click', () => {
      document.getElementById('loginSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.querySelectorAll('.auth-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        appState.activeAuthTab = tab.getAttribute('data-tab');
        render();
      });
    });

    document.getElementById('authForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('emailInput').value.trim();
      const password = document.getElementById('passwordInput').value;
      const name = document.getElementById('nameInput')?.value.trim() || '';
      const requestedType = document.getElementById('accountTypeInput')?.value || 'user';

      appState.loading = true;
      render();

      try {
        if (appState.firebaseMode) {
          await handleFirebaseAuth(appState.activeAuthTab, name, email, password, requestedType);
        } else {
          appState.user = { uid: crypto.randomUUID(), email, displayName: name || email.split('@')[0] };
          appState.profile = {
            name: name || email.split('@')[0],
            email: email.toLowerCase(),
            role: requestedType === 'supplier' ? 'user' : 'user',
            requestSupplierStatus: requestedType === 'supplier' ? 'pending' : 'none',
            groupId: null,
            canCreateGroup: false,
            requestStatus: 'none',
            createdAt: new Date().toISOString()
          };
          saveLocalData();
          showToast(requestedType === 'supplier' ? 'Cadastro de fornecedor enviado para aprovação!' : `Conectado localmente como ${appState.profile.name}`);
        }
      } catch (error) {
        showToast(error.message || 'Erro ao autenticar', 'error');
      } finally {
        appState.loading = false;
        render();
      }
    });

    document.getElementById('googleSignInButton')?.addEventListener('click', async () => {
      if (!appState.firebaseMode) {
        showToast('Google login requer conexão com Firebase activa.', 'warning');
        return;
      }
      try {
        await handleGoogleSignIn();
      } catch (error) {
        showToast(error.message || 'Erro no login com Google', 'error');
      }
    });

    document.getElementById('phoneAuthToggleButton')?.addEventListener('click', () => {
      const section = document.getElementById('phoneAuthSection');
      if (section) {
        section.style.display = section.style.display === 'none' ? 'flex' : 'none';
      }
    });

    document.getElementById('sendCodeButton')?.addEventListener('click', async () => {
      const phoneNumber = document.getElementById('phoneNumber').value.trim();
      if (!phoneNumber) {
        showToast('Por favor, insira o número de telefone.', 'warning');
        return;
      }
      try {
        await handlePhoneSignIn(phoneNumber);
        document.getElementById('otpSection').style.display = 'flex';
        showToast('Código enviado! Verifique seu SMS.');
      } catch (error) {
        showToast(error.message || 'Erro ao enviar SMS', 'error');
      }
    });

    document.getElementById('verifyCodeButton')?.addEventListener('click', async () => {
      const code = document.getElementById('otpCode').value.trim();
      if (!code) {
        showToast('Insira o código de validação.', 'warning');
        return;
      }
      try {
        await handlePhoneCodeVerification(code);
        showToast('Autenticado com sucesso!');
      } catch (error) {
        showToast(error.message || 'Código incorreto ou expirado.', 'error');
      }
    });

    bindPromoCarouselEvents();
    return;
  }

  // 2. Super Admin view (Platform Control)
  if (isPlatformAdmin() && appState.currentView === 'super_admin') {
    renderSuperAdminPanel();
    return;
  }

  // 2.5. Supplier View (Fornecedor Panel)
  if (appState.profile?.role === 'supplier') {
    renderSupplierPanel();
    return;
  }

  // 2.7. Pending Supplier View
  if (appState.profile?.requestSupplierStatus === 'pending') {
    app.innerHTML = `
      <header class="header">
        <div>
          <p class="eyebrow">Clube de Compras</p>
          <h1>Coffee Experience</h1>
        </div>
        <div style="display:flex; align-items:center; gap:1.25rem;">
          ${renderConnectionBadge()}
          <button id="logoutButton" class="secondary">Sair</button>
        </div>
      </header>

      <section class="card auth-card" style="text-align:center; padding:3rem 2rem;">
        <div style="font-size:3rem; margin-bottom:1rem;">⏳</div>
        <h2 style="font-family:'Playfair Display', serif; margin-bottom:0.75rem;">Cadastro de Fornecedor em Análise</h2>
        <p style="color:var(--muted); font-size:0.9rem; line-height:1.6; max-width:480px; margin:0 auto 1.5rem;">
          Seu pedido para se tornar um <strong>Fornecedor Parceiro</strong> está pendente de aprovação por um Administrador do Sistema. 
          Você terá acesso total ao painel de anúncios de café assim que a análise for concluída!
        </p>
        <div style="color:var(--accent-strong); font-size:0.8rem; font-weight:600;">
          E-mail de cadastro: ${appState.profile.email}
        </div>
      </section>
    `;

    document.getElementById('logoutButton')?.addEventListener('click', async () => {
      appState.loading = true;
      render();
      if (appState.firebaseMode) {
        await window.firebase.auth().signOut();
      }
      appState.user = null;
      appState.profile = null;
      appState.group = null;
      appState.orders = [];
      appState.participations = [];
      appState.reviews = [];
      appState.currentView = 'dashboard';
      appState.loading = false;
      render();
    });
    return;
  }

  // 3. Logged-in BUT NO group associated view
  if (!appState.profile?.groupId && !isPlatformAdmin()) {
    app.innerHTML = `
      <header class="header">
        <div>
          <p class="eyebrow">Clube de Compras</p>
          <h1>Coffee Experience</h1>
        </div>
        <div style="display:flex; align-items:center; gap:1.25rem;">
          ${renderPlatformAdminToggle()}
          ${renderConnectionBadge()}
          <button id="logoutButton" class="secondary">Sair</button>
        </div>
      </header>

      <section class="card auth-card">
        <div class="section-title">
          <h2>Associe-se a um Grupo</h2>
        </div>
        <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 1.5rem; line-height: 1.5;">
          Para participar das compras de café, você precisa fazer parte de um grupo. Escolha abaixo se quer entrar em um grupo existente ou criar um novo grupo (opção para administradores parceiros).
        </p>

        <div class="auth-tabs" style="margin-bottom: 1.5rem;">
          <div class="auth-tab ${appState.activeGroupTab === 'join' ? 'active' : ''}" data-group-tab="join">Entrar em Grupo</div>
          <div class="auth-tab ${appState.activeGroupTab === 'create' ? 'active' : ''}" data-group-tab="create">Criar Novo Grupo</div>
        </div>

        ${appState.activeGroupTab === 'join' ? `
          <form id="groupJoinForm">
            <div class="form-group">
              <label for="groupCodeInput">Código do Grupo (Ex: CAF-ABCD)</label>
              <input id="groupCodeInput" placeholder="Digite o código que você recebeu" required style="text-transform: uppercase;" />
            </div>
            <button type="submit" class="primary">Entrar no Grupo</button>
          </form>
        ` : `
          <div id="groupCreateContainer">
            ${appState.profile.canCreateGroup ? `
              <form id="groupCreateForm">
                <div class="form-group">
                  <label for="groupNameInput">Nome do Grupo</label>
                  <input id="groupNameInput" placeholder="Ex: Café dos Amigos, Bloco B..." required />
                </div>
                <button type="submit" class="primary">Criar Grupo (Serei Admin)</button>
              </form>
            ` : `
              <div style="display:flex; flex-direction:column; gap:1rem;">
                <p style="font-size:0.85rem; color:var(--muted); line-height: 1.4;">
                  A criação de grupos é reservada para assinantes ou parceiros aprovados. Solicite seu convite ou ative usando um código de desenvolvedor.
                </p>
                
                <form id="activationCodeForm" style="margin-top:0.5rem; display:grid; gap:0.75rem;">
                  <div class="form-group">
                    <label for="activationCodeInput">Código de Ativação do Desenvolvedor</label>
                    <input id="activationCodeInput" placeholder="Insira o código de ativação" required />
                  </div>
                  <button type="submit" class="primary">Validar Código</button>
                </form>

                <div style="text-align:center; color:var(--muted); font-size:0.75rem; font-weight:700;">OU</div>

                ${appState.profile.requestStatus === 'pending' ? `
                  <div class="hint-box warning" style="margin-top:0;">
                    <strong>Solicitação Pendente</strong>
                    <p style="font-size:0.8rem">Seu pedido foi enviado! Entraremos em contato para ativação.</p>
                  </div>
                ` : `
                  <button id="requestInviteButton" type="button" class="secondary" style="width:100%">
                    Solicitar Convite de Administrador
                  </button>
                `}
              </div>
            `}
          </div>
        `}
      </section>
    `;

    // Group Selection Event Bindings
    document.querySelectorAll('[data-group-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        appState.activeGroupTab = tab.getAttribute('data-group-tab');
        render();
      });
    });

    document.getElementById('toggleSuperAdminViewBtn')?.addEventListener('click', toggleSuperAdminView);

    document.getElementById('logoutButton')?.addEventListener('click', async () => {
      appState.loading = true;
      render();
      if (appState.firebaseMode) {
        await window.firebase.auth().signOut();
      }
      appState.user = null;
      appState.profile = null;
      appState.group = null;
      appState.loading = false;
      render();
    });

    // Join Group Submission
    document.getElementById('groupJoinForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('groupCodeInput').value.trim().toUpperCase();
      if (!code) return;

      appState.loading = true;
      render();

      try {
        let groupData = null;
        if (appState.firebaseMode) {
          const db = window.firebase.firestore();
          const q = await db.collection('groups').where('code', '==', code).get();
          if (q.empty) {
            throw new Error('Nenhum grupo encontrado com este código de convite.');
          }
          const doc = q.docs[0];
          groupData = { id: doc.id, ...doc.data() };

          await db.collection('users').doc(appState.user.uid).update({
            groupId: groupData.id,
            role: 'user'
          });
        } else {
          const localGroups = JSON.parse(localStorage.getItem('cafe-local-groups') || '[]');
          groupData = localGroups.find((g) => g.code === code);
          if (!groupData) {
            groupData = { id: crypto.randomUUID(), name: `Grupo Local ${code}`, code, adminId: 'mock-admin', createdAt: new Date().toISOString() };
            localGroups.push(groupData);
            localStorage.setItem('cafe-local-groups', JSON.stringify(localGroups));
          }
        }

        appState.profile.groupId = groupData.id;
        appState.profile.role = 'user';
        appState.group = groupData;

        if (appState.firebaseMode) {
          await loadFirebaseData(appState.user.uid);
        } else {
          saveLocalData();
        }
        showToast(`Você entrou no grupo "${groupData.name}"!`);
      } catch (err) {
        showToast(err.message || 'Erro ao ingressar no grupo', 'error');
      } finally {
        appState.loading = false;
        render();
      }
    });

    // Create Group Submission
    document.getElementById('groupCreateForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('groupNameInput').value.trim();
      if (!name) return;

      appState.loading = true;
      render();

      try {
        const code = generateGroupCode();
        const newGroup = {
          name,
          code,
          adminId: appState.user.uid,
          createdAt: new Date().toISOString()
        };

        let gId = '';
        if (appState.firebaseMode) {
          const db = window.firebase.firestore();
          const ref = await db.collection('groups').add(newGroup);
          gId = ref.id;

          await db.collection('users').doc(appState.user.uid).update({
            groupId: gId,
            role: 'admin'
          });
        } else {
          gId = crypto.randomUUID();
          const localGroups = JSON.parse(localStorage.getItem('cafe-local-groups') || '[]');
          localGroups.push({ id: gId, ...newGroup });
          localStorage.setItem('cafe-local-groups', JSON.stringify(localGroups));
        }

        appState.profile.groupId = gId;
        appState.profile.role = 'admin';
        appState.group = { id: gId, ...newGroup };

        if (appState.firebaseMode) {
          await loadFirebaseData(appState.user.uid);
        } else {
          saveLocalData();
        }
        showToast(`Grupo "${name}" criado com sucesso! Código: ${code}`);
      } catch (err) {
        showToast(err.message || 'Erro ao criar grupo', 'error');
      } finally {
        appState.loading = false;
        render();
      }
    });

    // Validate Activation Code
    document.getElementById('activationCodeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = document.getElementById('activationCodeInput').value.trim();
      if (codeInput !== 'VIP-COFFEE-2026') {
        showToast('Código de ativação inválido ou expirado.', 'error');
        return;
      }

      appState.loading = true;
      render();

      try {
        if (appState.firebaseMode) {
          const db = window.firebase.firestore();
          await db.collection('users').doc(appState.user.uid).update({
            canCreateGroup: true,
            requestStatus: 'approved'
          });
        }
        appState.profile.canCreateGroup = true;
        appState.profile.requestStatus = 'approved';
        if (!appState.firebaseMode) {
          saveLocalData();
        }
        showToast('Permissão de Administrador ativada com sucesso!');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        appState.loading = false;
        render();
      }
    });

    // Request Access Invite
    document.getElementById('requestInviteButton')?.addEventListener('click', async () => {
      appState.loading = true;
      render();

      try {
        if (appState.firebaseMode) {
          const db = window.firebase.firestore();
          const request = {
            userId: appState.user.uid,
            userEmail: appState.user.email || 'no-email',
            userName: appState.profile.name || 'no-name',
            status: 'pending',
            createdAt: new Date().toISOString()
          };
          await db.collection('group_requests').add(request);
          await db.collection('users').doc(appState.user.uid).update({
            requestStatus: 'pending'
          });
        }
        appState.profile.requestStatus = 'pending';
        if (!appState.firebaseMode) {
          saveLocalData();
        }
        showToast('Solicitação enviada ao desenvolvedor!');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        appState.loading = false;
        render();
      }
    });

    return;
  }

  // 4. Main Dashboard View (associated with group)
  const role = appState.profile?.role || 'user';
  const isAdmin = role === 'admin';
  const ranking = buildConsumerRanking(appState.participations, appState.user.uid, appState.profile?.name || 'Você');
  
  const totalConsumed = appState.participations.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);
  const totalSpent = appState.participations.reduce((sum, item) => sum + Number(item.valueTotal || 0), 0);
  const activeOrdersCount = appState.orders.filter((o) => o.status === 'aberto').length;
  const pendingPaymentsCount = appState.participations.filter((p) => p.paymentStatus === 'pendente').length;

  app.innerHTML = `
    <header class="header">
      <div>
        <p class="eyebrow">${isAdmin ? 'Gestão do Grupo (Admin)' : 'Painel do Consumidor'}</p>
        <h1>Olá, ${appState.profile?.name || appState.user.displayName || appState.user.email}</h1>
        ${renderGroupInfo()}
      </div>
      <div style="display:flex; align-items:center; gap:1.25rem;">
        ${renderPlatformAdminToggle()}
        ${renderConnectionBadge()}
        <button id="logoutButton" class="secondary">Sair</button>
      </div>
    </header>

    <div class="dashboard-grid">
      ${!appState.group ? `
        <div style="grid-column: span 2; display:flex; flex-direction:column; gap:1.5rem;">
          <section class="card" style="text-align:center; padding:3.5rem 2rem;">
            <img src="assets/coffee-hero.svg" alt="Café" style="max-height:140px; margin-bottom:1.5rem; opacity:0.85;" />
            <h2 style="font-family:'Playfair Display', serif; font-size:1.75rem; margin-bottom:0.75rem;">Modo de Auditoria Geral</h2>
            <p style="color:var(--muted); max-width:560px; margin:0 auto 1.75rem; font-size:0.95rem; line-height:1.6;">
              Você está conectado como Administrador do Site. Selecione um grupo no menu superior para visualizar seu painel de compras coletivas, pedidos e consumo de membros.
            </p>
            <div style="display:flex; justify-content:center; gap:1rem;">
              <button id="cardGoToSuperBtn" class="primary" style="background:linear-gradient(135deg, #7c2d12, #c2410c); padding:0.6rem 1.2rem;">Abrir Painel Geral do Site</button>
            </div>
          </section>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          ${renderPromotionsCarousel()}
          ${renderUserOrdersSection()}
          ${isAdmin ? renderAdminOrdersSection() : ''}
          ${renderUserParticipationsSection()}
          ${isAdmin ? renderAdminParticipationsSection() : ''}

          <section class="card">
            <div class="section-title">
              <h2>Classifique suas Experiências</h2>
            </div>
            <form id="reviewForm" class="review-form">
              <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:0.75rem;">
                <select id="reviewCoffee" required>
                  <option value="">Selecione um café degustado</option>
                  ${appState.orders.map((o) => `<option value="${o.type}">${o.type}</option>`).join('')}
                </select>
                <select id="reviewRating" required>
                  <option value="">Nota</option>
                  <option value="5">5 ★ ★ ★ ★ ★</option>
                  <option value="4">4 ★ ★ ★ ★</option>
                  <option value="3">3 ★ ★ ★</option>
                  <option value="2">2 ★ ★</option>
                  <option value="1">1 ★</option>
                </select>
              </div>
              <textarea id="reviewNote" rows="2" placeholder="Descreva notas de torra, sabor, acidez..." required></textarea>
              <button type="submit" class="primary">Salvar Avaliação</button>
            </form>

            <div class="review-grid" id="reviewList"></div>
          </section>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          <section class="card">
            <div class="section-title">
              <h2>Resumo Geral</h2>
            </div>
            <div class="metric-card">
              <h3>Métricas do Grupo</h3>
              <div class="metric-list">
                ${isAdmin ? `
                  <div class="metric-item"><span>Pedidos Abertos</span><strong>${activeOrdersCount}</strong></div>
                  <div class="metric-item"><span>Pagamentos Pendentes</span><strong>${pendingPaymentsCount}</strong></div>
                  <div class="metric-item"><span>Total Participantes</span><strong>${ranking.length}</strong></div>
                ` : `
                  <div class="metric-item"><span>Total Adquirido</span><strong>${totalConsumed.toFixed(2)} kg</strong></div>
                  <div class="metric-item"><span>Valor Investido</span><strong>R$ ${totalSpent.toFixed(2)}</strong></div>
                  <div class="metric-item"><span>Sabor Favorito</span><strong>${appState.reviews[0]?.coffee || 'Nenhum'}</strong></div>
                `}
              </div>
            </div>
          </section>

          <section class="card">
            <div class="section-title">
              <h2>Consumo do Grupo</h2>
            </div>
            <ul class="rank-list">
              ${ranking.map((entry, index) => `
                <li>
                  <span>#${index + 1} ${entry.displayName}</span>
                  <strong>${entry.totalKg.toFixed(2)} kg</strong>
                </li>
              `).join('')}
            </ul>
          </section>
        </div>
      `}
    </div>

    <section class="card" style="margin-top: 1.5rem">
      <div class="section-title">
        <h2>Extração do Café Especial</h2>
      </div>
      <div class="tech-grid">
        <article class="tech-card">
          <h3>Espresso</h3>
          <p>Extração rápida e intensa, ideal para quem gosta de um café concentrado e com corpo forte.</p>
          <ul>
            <li>Pressão alta (9 bar)</li>
            <li>Tempo curto (25-30s)</li>
            <li>Perfis encorpados e crema</li>
          </ul>
        </article>
        <article class="tech-card">
          <h3>Aeropress</h3>
          <p>Uma técnica limpa e versátil, perfeita para explorar sabores com mais clareza e equilíbrio.</p>
          <ul>
            <li>Filtro de papel ou metal</li>
            <li>Imersão + pressão manual</li>
            <li>Finalização extremamente limpa</li>
          </ul>
        </article>
        <article class="tech-card">
          <h3>Hario V60</h3>
          <p>O método de filtro em dripper destaca a complexidade aromática do café, com ótima precisão.</p>
          <ul>
            <li>Fluxo de água centralizado</li>
            <li>Notas florais e frutadas acentuadas</li>
            <li>Corpo leve e acidez brilhante</li>
          </ul>
        </article>
        <article class="tech-card">
          <h3>French Press</h3>
          <p>Reúne sabor, textura e uma experiência mais encorpada, excelente para cafés mais robustos.</p>
          <ul>
            <li>Imersão total (4 minutos)</li>
            <li>Filtro metálico preserva óleos essenciais</li>
            <li>Bebida densa e aromática</li>
          </ul>
        </article>
      </div>
    </section>
  `;

  // Bind Common Header View Events
  document.getElementById('logoutButton')?.addEventListener('click', async () => {
    appState.loading = true;
    render();
    if (appState.firebaseMode) {
      await window.firebase.auth().signOut();
    }
    appState.user = null;
    appState.profile = null;
    appState.group = null;
    appState.orders = [];
    appState.participations = [];
    appState.reviews = [];
    appState.currentView = 'dashboard';
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
      ordersUnsubscribe = null;
    }
    appState.loading = false;
    render();
  });

  document.getElementById('toggleSuperAdminViewBtn')?.addEventListener('click', toggleSuperAdminView);

  document.getElementById('copyGroupCodeBtn')?.addEventListener('click', () => {
    if (appState.group?.code) {
      navigator.clipboard.writeText(appState.group.code);
      showToast('Código do grupo copiado para a área de transferência!');
    }
  });

  document.getElementById('superAdminGroupSelector')?.addEventListener('change', async (e) => {
    const gId = e.target.value;
    appState.loading = true;
    render();

    try {
      if (gId) {
        let groupData = appState.superGroups.find(g => g.id === gId);
        if (!groupData && appState.firebaseMode) {
          const db = window.firebase.firestore();
          const groupDoc = await db.collection('groups').doc(gId).get();
          if (groupDoc.exists) {
            groupData = { id: groupDoc.id, ...groupDoc.data() };
          }
        }
        appState.group = groupData;
        if (appState.profile) {
          appState.profile.groupId = gId;
          appState.profile.role = groupData?.adminId === appState.user.uid ? 'admin' : 'user';
        }
        if (appState.firebaseMode) {
          await loadFirebaseData(appState.user.uid);
        } else {
          loadLocalData();
        }
      } else {
        appState.group = null;
        if (appState.profile) appState.profile.groupId = null;
        appState.orders = [];
        appState.participations = [];
      }
      showToast('Visualização de grupo atualizada!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      appState.loading = false;
      render();
    }
  });

  document.getElementById('cardGoToSuperBtn')?.addEventListener('click', toggleSuperAdminView);

  if (isAdmin) {
    bindAdminEvents();
    bindUserEvents(); // Admin can also participate!
  } else {
    bindUserEvents();
  }

  renderReviews();
  bindReviewFormSubmit();
  bindPromoCarouselEvents();
}

// =============================================================================
// SECTION 6.5 — SUPPLIER (FORNECEDOR) PANEL & EVENTS
// =============================================================================

function renderSupplierPanel() {
  const app = document.getElementById('app');
  const myUid = appState.user?.uid;
  
  // Filter products belonging to this supplier
  const myProducts = appState.products.filter(p => p.supplierId === myUid);
  const totalQty = myProducts.reduce((sum, p) => sum + Number(p.availableQty || 0), 0);

  app.innerHTML = `
    <header class="header">
      <div>
        <p class="eyebrow">Painel do Fornecedor Parceiro</p>
        <h1>Olá, ${appState.profile?.name || appState.user.displayName || appState.user.email}</h1>
        <div style="margin-top:0.4rem; display:flex; align-items:center; gap:0.5rem;">
          <span class="pill" style="background:var(--accent); color:var(--bg); font-weight:700;">FORNECEDOR PARCEIRO</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:1.25rem;">
        ${renderConnectionBadge()}
        <button id="logoutButton" class="secondary">Sair</button>
      </div>
    </header>

    <div class="dashboard-grid" style="grid-template-columns: 1fr;">
      <div style="display:flex; flex-direction:column; gap:1.5rem;">
        
        <!-- Metrics Header -->
        <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
          <div class="metric-card" style="padding:1.25rem; flex:1; min-width:200px;">
            <span style="font-size:0.75rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em;">Produtos Anunciados</span>
            <strong style="display:block; font-size:1.8rem; color:var(--accent-strong); margin-top:0.25rem;">${myProducts.length} itens</strong>
          </div>
          <div class="metric-card" style="padding:1.25rem; flex:1; min-width:200px;">
            <span style="font-size:0.75rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em;">Total em Estoque</span>
            <strong style="display:block; font-size:1.8rem; color:var(--accent-strong); margin-top:0.25rem;">${totalQty.toFixed(1)} kg</strong>
          </div>
        </div>

        <!-- Product Management Card -->
        <section class="card">
          <div class="section-title">
            <h2>Meus Produtos & Ofertas</h2>
            <button id="supplierAddProductBtn" class="primary">+ Anunciar Café</button>
          </div>
          
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Café / Produtor</th>
                  <th>Quantidade Disponível</th>
                  <th>Valor por kg</th>
                  <th>Validade do Preço</th>
                  <th style="text-align:right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${myProducts.map((p) => {
                  const isExpired = new Date(p.deadline) < new Date(new Date().toISOString().slice(0, 10));
                  return `
                    <tr style="${isExpired ? 'opacity:0.6;' : ''}">
                      <td>
                        <strong>${p.name}</strong>
                        <p style="font-size:0.75rem; color:var(--muted); max-width:320px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; margin-top:0.15rem;">
                          ${p.description || 'Sem descrição.'}
                        </p>
                      </td>
                      <td><strong>${p.availableQty} kg</strong></td>
                      <td><span style="color:var(--success); font-weight:700;">R$ ${Number(p.pricePerKg).toFixed(2)}</span></td>
                      <td>
                        <span class="status-pill ${isExpired ? 'cancelado' : 'aberto'}" style="font-size:0.75rem;">
                          ${p.deadline} ${isExpired ? '(Expirado)' : ''}
                        </span>
                      </td>
                      <td style="text-align:right; display:flex; gap:0.4rem; justify-content:flex-end;">
                        <button class="edit-product-btn secondary" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-product-id="${p.id}">Editar / Ampliar Prazo</button>
                        <button class="delete-product-btn danger" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-product-id="${p.id}">Excluir</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
                ${myProducts.length === 0 ? '<tr><td colspan="5" class="hint" style="text-align:center; padding:2rem 0;">Você ainda não anunciou nenhum produto. Clique em "+ Anunciar Café" para começar!</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  `;

  bindSupplierEvents();
}

function bindSupplierEvents() {
  // Common Logout button binding
  document.getElementById('logoutButton')?.addEventListener('click', async () => {
    appState.loading = true;
    render();
    if (appState.firebaseMode) {
      await window.firebase.auth().signOut();
    }
    appState.user = null;
    appState.profile = null;
    appState.group = null;
    appState.orders = [];
    appState.participations = [];
    appState.reviews = [];
    appState.currentView = 'dashboard';
    appState.loading = false;
    render();
  });

  // Add Product button
  document.getElementById('supplierAddProductBtn')?.addEventListener('click', () => {
    showModal({
      title: 'Anunciar Novo Café',
      bodyHtml: `
        <form id="modalAddProductForm" style="margin-top:0;">
          <div class="form-group">
            <label for="prodName">Nome do Café / Produtor / Região</label>
            <input type="text" id="prodName" placeholder="Ex: Catuaí Vermelho - Sítio Vista Alegre (Mogiana)" required />
          </div>
          <div class="form-group">
            <label for="prodDesc">Descrição do Café (Variedade, torra, notas sensoriais...)</label>
            <textarea id="prodDesc" rows="3" placeholder="Ex: Café arábica, torra média, notas de caramelo e chocolate, corpo aveludado e acidez equilibrada." required></textarea>
          </div>
          <div class="form-group">
            <label for="prodQty">Quantidade Disponível (kg)</label>
            <input type="number" id="prodQty" min="1" step="0.5" placeholder="Ex: 100" required />
          </div>
          <div class="form-group">
            <label for="prodPrice">Valor por Quilo (R$)</label>
            <input type="number" id="prodPrice" min="0.01" step="0.01" placeholder="Ex: 75.00" required />
          </div>
          <div class="form-group">
            <label for="prodDeadline">Prazo Limite deste Preço</label>
            <input type="date" id="prodDeadline" required />
          </div>
        </form>
      `,
      confirmText: 'Anunciar Produto',
      onConfirm: async (modalEl) => {
        const name = modalEl.querySelector('#prodName').value.trim();
        const description = modalEl.querySelector('#prodDesc').value.trim();
        const availableQty = Number(modalEl.querySelector('#prodQty').value);
        const pricePerKg = Number(modalEl.querySelector('#prodPrice').value);
        const deadline = modalEl.querySelector('#prodDeadline').value;

        if (!name || !description || isNaN(availableQty) || availableQty <= 0 || isNaN(pricePerKg) || pricePerKg <= 0 || !deadline) {
          showToast('Preencha todos os campos com dados válidos.', 'warning');
          return false;
        }

        const newProduct = {
          name,
          description,
          availableQty,
          pricePerKg,
          deadline,
          supplierId: appState.user.uid,
          createdAt: new Date().toISOString()
        };

        try {
          if (appState.firebaseMode) {
            const db = window.firebase.firestore();
            const ref = await db.collection('products').add(newProduct);
            appState.products.unshift({ id: ref.id, ...newProduct });
          } else {
            appState.products.unshift({ id: crypto.randomUUID(), ...newProduct });
            saveLocalData();
          }
          showToast('Produto anunciado com sucesso!');
          render();
          return true;
        } catch (error) {
          showToast(`Erro ao anunciar: ${error.message}`, 'error');
          return false;
        }
      }
    });
  });

  // Edit / Extend Product button
  document.querySelectorAll('.edit-product-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-product-id');
      const product = appState.products.find(p => p.id === pId);
      if (!product) return;

      showModal({
        title: 'Editar Produto & Ampliar Prazo',
        bodyHtml: `
          <form id="modalEditProductForm" style="margin-top:0;">
            <div class="form-group">
              <label for="editProdName">Nome do Café / Produtor / Região</label>
              <input type="text" id="editProdName" value="${product.name}" required />
            </div>
            <div class="form-group">
              <label for="editProdDesc">Descrição do Café (Variedade, torra, notas sensoriais...)</label>
              <textarea id="editProdDesc" rows="3" required>${product.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="editProdQty">Quantidade Disponível (kg)</label>
              <input type="number" id="editProdQty" value="${product.availableQty}" min="0.5" step="0.5" required />
            </div>
            <div class="form-group">
              <label for="editProdPrice">Valor por Quilo (R$)</label>
              <input type="number" id="editProdPrice" value="${product.pricePerKg}" min="0.01" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="editProdDeadline">Prazo Limite deste Preço (Amplie este prazo)</label>
              <input type="date" id="editProdDeadline" value="${product.deadline}" required />
            </div>
          </form>
        `,
        confirmText: 'Salvar Alterações',
        onConfirm: async (modalEl) => {
          const name = modalEl.querySelector('#editProdName').value.trim();
          const description = modalEl.querySelector('#editProdDesc').value.trim();
          const availableQty = Number(modalEl.querySelector('#editProdQty').value);
          const pricePerKg = Number(modalEl.querySelector('#editProdPrice').value);
          const deadline = modalEl.querySelector('#editProdDeadline').value;

          if (!name || !description || isNaN(availableQty) || availableQty < 0 || isNaN(pricePerKg) || pricePerKg <= 0 || !deadline) {
            showToast('Preencha os campos com valores válidos.', 'warning');
            return false;
          }

          try {
            if (appState.firebaseMode) {
              const db = window.firebase.firestore();
              await db.collection('products').doc(pId).update({
                name,
                description,
                availableQty,
                pricePerKg,
                deadline
              });
              appState.products = appState.products.map(p => p.id === pId ? { ...p, name, description, availableQty, pricePerKg, deadline } : p);
            } else {
              appState.products = appState.products.map(p => p.id === pId ? { ...p, name, description, availableQty, pricePerKg, deadline } : p);
              saveLocalData();
            }
            showToast('Produto atualizado com sucesso!');
            render();
            return true;
          } catch (error) {
            showToast(`Erro ao atualizar: ${error.message}`, 'error');
            return false;
          }
        }
      });
    });
  });

  // Delete Product button
  document.querySelectorAll('.delete-product-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-product-id');
      const product = appState.products.find(p => p.id === pId);
      if (!product) return;

      showModal({
        title: 'Excluir Anúncio',
        bodyHtml: `<p>Deseja realmente remover o produto <strong>${product.name}</strong> do catálogo? Essa ação é permanente.</p>`,
        confirmText: 'Sim, Excluir',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          try {
            if (appState.firebaseMode) {
              const db = window.firebase.firestore();
              await db.collection('products').doc(pId).delete();
              appState.products = appState.products.filter(p => p.id !== pId);
            } else {
              appState.products = appState.products.filter(p => p.id !== pId);
              saveLocalData();
            }
            showToast('Produto removido do catálogo.');
            render();
            return true;
          } catch (error) {
            showToast(`Erro ao remover: ${error.message}`, 'error');
            return false;
          }
        }
      });
    });
  });
}

// PLATFORM SUPER ADMIN RENDERERS
function renderSuperAdminPanel() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="header">
      <div>
        <p class="eyebrow">Administração Geral do Site</p>
        <h1>Painel de Controle Central</h1>
      </div>
      <div style="display:flex; align-items:center; gap:1.25rem;">
        ${renderPlatformAdminToggle()}
        ${renderConnectionBadge()}
        <button id="logoutButton" class="secondary">Sair</button>
      </div>
    </header>

    <div class="super-tabs">
      <button class="super-tab ${appState.superAdminTab === 'groups' ? 'active' : ''}" data-super-tab="groups">
        Grupos (${appState.superGroups.length})
      </button>
      <button class="super-tab ${appState.superAdminTab === 'users' ? 'active' : ''}" data-super-tab="users">
        Usuários (${appState.superUsers.length})
      </button>
      <button class="super-tab ${appState.superAdminTab === 'requests' ? 'active' : ''}" data-super-tab="requests">
        Solicitações (${appState.superRequests.filter(r => r.status === 'pending').length} pendentes)
      </button>
    </div>

    <section class="card">
      ${renderSuperAdminTabContent()}
    </section>
  `;

  document.querySelectorAll('[data-super-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      appState.superAdminTab = tab.getAttribute('data-super-tab');
      render();
    });
  });

  document.getElementById('toggleSuperAdminViewBtn')?.addEventListener('click', toggleSuperAdminView);

  document.getElementById('logoutButton')?.addEventListener('click', async () => {
    appState.loading = true;
    render();
    if (appState.firebaseMode) {
      await window.firebase.auth().signOut();
    }
    appState.user = null;
    appState.profile = null;
    appState.group = null;
    appState.orders = [];
    appState.participations = [];
    appState.reviews = [];
    appState.currentView = 'dashboard';
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
      ordersUnsubscribe = null;
    }
    appState.loading = false;
    render();
  });

  bindSuperAdminEvents();
}

function renderSuperAdminTabContent() {
  if (appState.superAdminTab === 'groups') {
    return `
      <div class="section-title">
        <h2>Lista de Grupos Ativos</h2>
        <button id="superCreateGroupBtn" class="primary">+ Adicionar Grupo</button>
      </div>
      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nome do Grupo</th>
              <th>Código</th>
              <th>Administrador (Líder)</th>
              <th>Qtd Membros</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${appState.superGroups.map((g) => {
              const adminUser = appState.superUsers.find((u) => u.uid === g.adminId);
              const membersCount = appState.superUsers.filter((u) => u.groupId === g.id).length;
              return `
                <tr>
                  <td><strong>${g.name}</strong></td>
                  <td><code style="background:rgba(255,255,255,0.06); padding:0.2rem 0.4rem; border-radius:4px;">${g.code}</code></td>
                  <td>${adminUser ? `${adminUser.name} (${adminUser.email})` : `<span style="color:var(--error)">Nenhum</span>`}</td>
                  <td>${membersCount} usuários</td>
                  <td style="text-align:right; display:flex; gap:0.4rem; justify-content:flex-end;">
                    <button class="toggle-group-admin-btn secondary" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-group-id="${g.id}">Trocar Líder</button>
                    <button class="edit-group-super-btn secondary" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-group-id="${g.id}">Editar</button>
                    <button class="delete-group-super-btn danger" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-group-id="${g.id}">Deletar</button>
                  </td>
                </tr>
              `;
            }).join('')}
            ${appState.superGroups.length === 0 ? '<tr><td colspan="5" class="hint" style="text-align:center;">Nenhum grupo cadastrado.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  }
  
  if (appState.superAdminTab === 'users') {
    return `
      <div class="section-title">
        <h2>Usuários Registrados</h2>
        <button id="superCreateUserBtn" class="primary">+ Adicionar Usuário</button>
      </div>
      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Grupo</th>
              <th>Cargo</th>
              <th>Criar Grupo?</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${appState.superUsers.map((u) => {
              const group = appState.superGroups.find((g) => g.id === u.groupId);
              return `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${u.email}</td>
                  <td>${group ? group.name : '<span style="color:var(--muted)">Nenhum</span>'}</td>
                  <td><span class="badge-role ${u.role}">${u.role === 'admin' ? 'Líder' : 'Membro'}</span></td>
                  <td>
                    <button class="toggle-user-can-create-btn secondary" style="font-size:0.75rem; padding:0.3rem 0.6rem;" data-user-uid="${u.uid}">
                      ${u.canCreateGroup ? 'Sim (Remover)' : 'Não (Dar Permissão)'}
                    </button>
                  </td>
                  <td style="text-align:right; display:flex; gap:0.4rem; justify-content:flex-end;">
                    <button class="edit-user-super-btn secondary" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-user-uid="${u.uid}">Editar</button>
                    <button class="delete-user-super-btn danger" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-user-uid="${u.uid}">Remover</button>
                  </td>
                </tr>
              `;
            }).join('')}
            ${appState.superUsers.length === 0 ? '<tr><td colspan="6" class="hint" style="text-align:center;">Nenhum usuário cadastrado.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  }

  if (appState.superAdminTab === 'requests') {
    const pendingSuppliers = appState.superUsers.filter(u => u.requestSupplierStatus === 'pending');

    return `
      <div class="section-title">
        <h2>Solicitações de Acesso a Liderança (Grupos)</h2>
      </div>
      <div class="admin-table-container">
        <table class="admin-table" style="margin-bottom: 2rem;">
          <thead>
            <tr>
              <th>Solicitante</th>
              <th>E-mail</th>
              <th>Data do Pedido</th>
              <th>Status</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${appState.superRequests.map((r) => `
              <tr>
                <td><strong>${r.userName}</strong></td>
                <td>${r.userEmail}</td>
                <td>${new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
                <td><span class="status-pill ${r.status}">${r.status.toUpperCase()}</span></td>
                <td style="text-align:right; display:flex; gap:0.4rem; justify-content:flex-end;">
                  ${r.status === 'pending' ? `
                    <button class="approve-request-btn primary" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-req-id="${r.id}" data-user-uid="${r.userId}">Aprovar</button>
                    <button class="reject-request-btn danger" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-req-id="${r.id}">Rejeitar</button>
                  ` : `<span style="color:var(--muted)">Processado</span>`}
                </td>
              </tr>
            `).join('')}
            ${appState.superRequests.length === 0 ? '<tr><td colspan="5" class="hint" style="text-align:center;">Nenhuma solicitação encontrada.</td></tr>' : ''}
          </tbody>
        </table>
      </div>

      <div class="section-title" style="margin-top:2rem;">
        <h2>Solicitações de Cadastro de Fornecedor</h2>
      </div>
      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nome / Empresa</th>
              <th>E-mail</th>
              <th>Status</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${pendingSuppliers.map((u) => `
              <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="status-pill pendente">PENDENTE</span></td>
                <td style="text-align:right; display:flex; gap:0.4rem; justify-content:flex-end;">
                  <button class="approve-supplier-btn primary" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-user-uid="${u.uid || u.id}">Aprovar</button>
                  <button class="reject-supplier-btn danger" style="font-size:0.75rem; padding:0.4rem 0.8rem;" data-user-uid="${u.uid || u.id}">Rejeitar</button>
                </td>
              </tr>
            `).join('')}
            ${pendingSuppliers.length === 0 ? '<tr><td colspan="4" class="hint" style="text-align:center;">Nenhuma solicitação de fornecedor pendente.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  }

  return '';
}

function bindSuperAdminEvents() {
  const db = appState.firebaseMode ? window.firebase.firestore() : null;

  // Add Group Manually
  document.getElementById('superCreateGroupBtn')?.addEventListener('click', () => {
    showModal({
      title: 'Criar Grupo (Modo Super Admin)',
      bodyHtml: `
        <form id="modalSuperCreateGroup" style="margin-top:0;">
          <div class="form-group">
            <label for="superGroupName">Nome do Grupo</label>
            <input type="text" id="superGroupName" placeholder="Ex: Café da Diretoria" required />
          </div>
          <div class="form-group">
            <label for="superGroupAdminId">Selecione o Administrador (Líder) do Grupo</label>
            <select id="superGroupAdminId">
              <option value="">Nenhum (Definir depois)</option>
              ${appState.superUsers.map(u => `<option value="${u.uid}">${u.name} (${u.email})</option>`).join('')}
            </select>
          </div>
        </form>
      `,
      confirmText: 'Criar Grupo',
      onConfirm: async (modalEl) => {
        const name = modalEl.querySelector('#superGroupName').value.trim();
        const adminId = modalEl.querySelector('#superGroupAdminId').value || "";

        if (!name) {
          showToast('Preencha o nome do grupo.', 'warning');
          return false;
        }

        const code = generateGroupCode();
        const newGroup = {
          name,
          code,
          adminId,
          createdAt: new Date().toISOString()
        };

        try {
          if (appState.firebaseMode) {
            const ref = await db.collection('groups').add(newGroup);
            const gId = ref.id;
            
            if (adminId) {
              await db.collection('users').doc(adminId).update({
                groupId: gId,
                role: 'admin',
                canCreateGroup: true
              });
            }
          } else {
            const gId = crypto.randomUUID();
            appState.superGroups.push({ id: gId, ...newGroup });
            if (adminId) {
              appState.superUsers = appState.superUsers.map((u) => u.uid === adminId ? { ...u, groupId: gId, role: 'admin', canCreateGroup: true } : u);
            }
            saveLocalData();
          }

          showToast('Grupo criado com sucesso!');
          if (appState.firebaseMode) {
            await loadSuperAdminData();
          }
          render();
          return true;
        } catch (error) {
          showToast(error.message, 'error');
          return false;
        }
      }
    });
  });

  // Transfer Group Leadership (Trocar Administrador do Grupo)
  document.querySelectorAll('.toggle-group-admin-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const gId = btn.getAttribute('data-group-id');
      const group = appState.superGroups.find(g => g.id === gId);
      if (!group) return;

      showModal({
        title: 'Transferir Liderança do Grupo',
        bodyHtml: `
          <form id="modalTransferLeadership" style="margin-top:0;">
            <p style="color:var(--muted); font-size:0.85rem; margin-bottom:1rem;">
              Escolha o novo administrador do grupo <strong>${group.name}</strong>. O líder atual será rebaixado para membro.
            </p>
            <div class="form-group">
              <label for="newLeaderSelect">Novo Administrador</label>
              <select id="newLeaderSelect" required>
                <option value="">Selecione um usuário do sistema...</option>
                ${appState.superUsers.map(u => `
                  <option value="${u.uid}" ${u.uid === group.adminId ? 'selected' : ''}>
                    ${u.name} (${u.email}) ${u.uid === group.adminId ? '[LÍDER ATUAL]' : ''}
                  </option>
                `).join('')}
              </select>
            </div>
          </form>
        `,
        confirmText: 'Transferir Liderança',
        onConfirm: async (modalEl) => {
          const newLeaderId = modalEl.querySelector('#newLeaderSelect').value;
          const oldLeaderId = group.adminId;

          if (!newLeaderId) {
            showToast('Selecione um usuário válido.', 'warning');
            return false;
          }

          if (newLeaderId === oldLeaderId) {
            showToast('Este usuário já é o líder do grupo.', 'warning');
            return true;
          }

          try {
            if (appState.firebaseMode) {
              const batch = db.batch();
              batch.update(db.collection('groups').doc(gId), { adminId: newLeaderId });
              batch.update(db.collection('users').doc(newLeaderId), { role: 'admin', groupId: gId, canCreateGroup: true });
              if (oldLeaderId) {
                batch.update(db.collection('users').doc(oldLeaderId), { role: 'user' });
              }
              await batch.commit();
            } else {
              appState.superGroups = appState.superGroups.map(g => g.id === gId ? { ...g, adminId: newLeaderId } : g);
              appState.superUsers = appState.superUsers.map(u => {
                if (u.uid === newLeaderId) return { ...u, role: 'admin', groupId: gId, canCreateGroup: true };
                if (u.uid === oldLeaderId) return { ...u, role: 'user' };
                return u;
              });
              saveLocalData();
            }

            showToast('Liderança de grupo transferida!');
            if (appState.firebaseMode) {
              await loadFirebaseData(appState.user.uid);
            }
            render();
            return true;
          } catch (error) {
            showToast(`Erro na transferência: ${error.message}`, 'error');
            return false;
          }
        }
      });
    });
  });

  // Edit Group Name / Code
  document.querySelectorAll('.edit-group-super-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const gId = btn.getAttribute('data-group-id');
      const group = appState.superGroups.find(g => g.id === gId);
      if (!group) return;

      showModal({
        title: 'Editar Grupo',
        bodyHtml: `
          <form id="modalSuperEditGroup" style="margin-top:0;">
            <div class="form-group">
              <label for="superGroupNameEdit">Nome do Grupo</label>
              <input type="text" id="superGroupNameEdit" value="${group.name}" required />
            </div>
            <div class="form-group">
              <label for="superGroupCodeEdit">Código de Convite</label>
              <input type="text" id="superGroupCodeEdit" value="${group.code}" required style="text-transform: uppercase;" />
            </div>
          </form>
        `,
        confirmText: 'Salvar Grupo',
        onConfirm: async (modalEl) => {
          const name = modalEl.querySelector('#superGroupNameEdit').value.trim();
          const code = modalEl.querySelector('#superGroupCodeEdit').value.trim().toUpperCase();

          if (!name || !code) return false;

          try {
            if (appState.firebaseMode) {
              await db.collection('groups').doc(gId).update({ name, code });
            } else {
              appState.superGroups = appState.superGroups.map(g => g.id === gId ? { ...g, name, code } : g);
              saveLocalData();
            }

            showToast('Grupo atualizado!');
            if (appState.firebaseMode) {
              await loadFirebaseData(appState.user.uid);
            }
            render();
            return true;
          } catch (error) {
            showToast(error.message, 'error');
            return false;
          }
        }
      });
    });
  });

  // Delete Group
  document.querySelectorAll('.delete-group-super-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const gId = btn.getAttribute('data-group-id');
      const group = appState.superGroups.find(g => g.id === gId);
      if (!group) return;

      showModal({
        title: 'Excluir Grupo Permanentemente?',
        bodyHtml: `
          <p>Você tem certeza que deseja excluir o grupo <strong>${group.name}</strong>?</p>
          <p style="color:var(--error); font-size:0.8rem; margin-top:0.5rem;">
            Aviso: Todos os membros deste grupo serão desassociados e rebaixados a usuários sem grupo.
          </p>
        `,
        confirmText: 'Excluir Grupo',
        onConfirm: async () => {
          try {
            if (appState.firebaseMode) {
              const batch = db.batch();
              batch.delete(db.collection('groups').doc(gId));
              
              const usersInGroup = appState.superUsers.filter(u => u.groupId === gId);
              usersInGroup.forEach(u => {
                batch.update(db.collection('users').doc(u.uid), { groupId: null, role: 'user' });
              });
              await batch.commit();
            } else {
              appState.superGroups = appState.superGroups.filter(g => g.id !== gId);
              appState.superUsers = appState.superUsers.map(u => u.groupId === gId ? { ...u, groupId: null, role: 'user' } : u);
              saveLocalData();
            }

            // Prevent rendering orphan data if the deleted group was currently active
            if (appState.group && appState.group.id === gId) {
              appState.group = null;
              if (appState.profile) appState.profile.groupId = null;
              appState.orders = [];
              appState.participations = [];
            }

            showToast('Grupo removido!');
            if (appState.firebaseMode) {
              await loadSuperAdminData();
            }
            render();
            return true;
          } catch (error) {
            showToast(error.message, 'error');
            return false;
          }
        }
      });
    });
  });

  // Toggle permission `canCreateGroup`
  document.querySelectorAll('.toggle-user-can-create-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userUid = btn.getAttribute('data-user-uid');
      const user = appState.superUsers.find(u => u.uid === userUid);
      if (!user) return;

      const nextVal = !user.canCreateGroup;

      try {
        if (appState.firebaseMode) {
          await db.collection('users').doc(userUid).update({ canCreateGroup: nextVal });
        } else {
          appState.superUsers = appState.superUsers.map(u => u.uid === userUid ? { ...u, canCreateGroup: nextVal } : u);
          saveLocalData();
        }

        showToast('Permissão de usuário atualizada!');
        if (appState.firebaseMode) {
          await loadFirebaseData(appState.user.uid);
        }
        render();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  // Edit User profile/groups
  document.querySelectorAll('.edit-user-super-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const userUid = btn.getAttribute('data-user-uid');
      const user = appState.superUsers.find(u => u.uid === userUid);
      if (!user) return;

      showModal({
        title: `Editar Usuário: ${user.name}`,
        bodyHtml: `
          <form id="modalSuperEditUser" style="margin-top:0;">
            <div class="form-group">
              <label for="editUserName">Nome</label>
              <input type="text" id="editUserName" value="${user.name}" required />
            </div>
            <div class="form-group">
              <label for="editUserGroup">Grupo Vinculado</label>
              <select id="editUserGroup">
                <option value="">Nenhum</option>
                ${appState.superGroups.map(g => `<option value="${g.id}" ${g.id === user.groupId ? 'selected' : ''}>${g.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="editUserRole">Papel no Grupo</label>
              <select id="editUserRole" required>
                <option value="user" ${user.role === 'user' ? 'selected' : ''}>Membro Comum (User)</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Líder do Grupo (Admin)</option>
              </select>
            </div>
          </form>
        `,
        confirmText: 'Salvar Usuário',
        onConfirm: async (modalEl) => {
          const name = modalEl.querySelector('#editUserName').value.trim();
          const groupId = modalEl.querySelector('#editUserGroup').value;
          const role = modalEl.querySelector('#editUserRole').value;

          if (!name) return false;

          try {
            if (appState.firebaseMode) {
              const batch = db.batch();
              batch.update(db.collection('users').doc(userUid), { name, groupId: groupId || null, role });
              
              if (role === 'admin' && groupId) {
                batch.update(db.collection('groups').doc(groupId), { adminId: userUid });
              }
              await batch.commit();
            } else {
              appState.superUsers = appState.superUsers.map((u) => {
                if (u.uid === userUid) return { ...u, name, groupId: groupId || null, role };
                return u;
              });
              if (role === 'admin' && groupId) {
                appState.superGroups = appState.superGroups.map(g => g.id === groupId ? { ...g, adminId: userUid } : g);
              }
              saveLocalData();
            }

            showToast('Perfil de usuário atualizado!');
            if (appState.firebaseMode) {
              await loadFirebaseData(appState.user.uid);
            }
            render();
            return true;
          } catch (error) {
            showToast(error.message, 'error');
            return false;
          }
        }
      });
    });
  });

  // Delete User Profile
  document.querySelectorAll('.delete-user-super-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const userUid = btn.getAttribute('data-user-uid');
      const user = appState.superUsers.find(u => u.uid === userUid);
      if (!user) return;

      showModal({
        title: 'Remover Usuário do Sistema?',
        bodyHtml: `
          <p>Deseja mesmo excluir o perfil de <strong>${user.name}</strong> (${user.email})?</p>
          <p style="color:var(--error); font-size:0.8rem; margin-top:0.5rem">
            Nota: Isso removerá o documento de usuário no Firestore.
          </p>
        `,
        confirmText: 'Remover Usuário',
        onConfirm: async () => {
          try {
            if (appState.firebaseMode) {
              await db.collection('users').doc(userUid).delete();
            } else {
              appState.superUsers = appState.superUsers.filter(u => u.uid !== userUid);
              saveLocalData();
            }

            showToast('Usuário removido!');
            if (appState.firebaseMode) {
              await loadFirebaseData(appState.user.uid);
            }
            render();
            return true;
          } catch (error) {
            showToast(error.message, 'error');
            return false;
          }
        }
      });
    });
  });

  // Approve group request
  document.querySelectorAll('.approve-request-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reqId = btn.getAttribute('data-req-id');
      const userUid = btn.getAttribute('data-user-uid');

      try {
        if (appState.firebaseMode) {
          const batch = db.batch();
          batch.update(db.collection('group_requests').doc(reqId), { status: 'approved' });
          batch.update(db.collection('users').doc(userUid), { canCreateGroup: true, requestStatus: 'approved' });
          await batch.commit();
        } else {
          appState.superRequests = appState.superRequests.map(r => r.id === reqId ? { ...r, status: 'approved' } : r);
          appState.superUsers = appState.superUsers.map(u => u.uid === userUid ? { ...u, canCreateGroup: true, requestStatus: 'approved' } : u);
          saveLocalData();
        }

        showToast('Solicitação aprovada! Permissão concedida.');
        if (appState.firebaseMode) {
          await loadFirebaseData(appState.user.uid);
        }
        render();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  // Reject group request
  document.querySelectorAll('.reject-request-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reqId = btn.getAttribute('data-req-id');

      try {
        if (appState.firebaseMode) {
          await db.collection('group_requests').doc(reqId).update({ status: 'denied' });
        } else {
          appState.superRequests = appState.superRequests.map(r => r.id === reqId ? { ...r, status: 'denied' } : r);
          saveLocalData();
        }

        showToast('Solicitação rejeitada.');
        if (appState.firebaseMode) {
          await loadFirebaseData(appState.user.uid);
        }
        render();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  // Approve Supplier Request
  document.querySelectorAll('.approve-supplier-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const uId = btn.getAttribute('data-user-uid');
      appState.loading = true;
      render();
      try {
        if (appState.firebaseMode) {
          await db.collection('users').doc(uId).update({
            role: 'supplier',
            requestSupplierStatus: 'approved'
          });
          await loadSuperAdminData();
        } else {
          appState.superUsers = appState.superUsers.map(u => (u.uid === uId || u.id === uId) ? { ...u, role: 'supplier', requestSupplierStatus: 'approved' } : u);
          saveLocalData();
        }
        showToast('Fornecedor aprovado com sucesso!');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        appState.loading = false;
        render();
      }
    });
  });

  // Reject Supplier Request
  document.querySelectorAll('.reject-supplier-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const uId = btn.getAttribute('data-user-uid');
      appState.loading = true;
      render();
      try {
        if (appState.firebaseMode) {
          await db.collection('users').doc(uId).update({
            requestSupplierStatus: 'rejected'
          });
          await loadSuperAdminData();
        } else {
          appState.superUsers = appState.superUsers.map(u => (u.uid === uId || u.id === uId) ? { ...u, requestSupplierStatus: 'rejected' } : u);
          saveLocalData();
        }
        showToast('Solicitação de fornecedor rejeitada.');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        appState.loading = false;
        render();
      }
    });
  });

  // Add User Manually (Pre-registration)
  document.getElementById('superCreateUserBtn')?.addEventListener('click', () => {
    showModal({
      title: 'Pré-cadastrar Novo Usuário',
      bodyHtml: `
        <form id="modalSuperCreateUser" style="margin-top:0;">
          <p style="color:var(--muted); font-size:0.85rem; margin-bottom:1rem; line-height:1.4;">
            Cadastre os dados de acesso do usuário. Quando ele se registrar no sistema com este e-mail, ele herdará automaticamente as permissões e o grupo vinculados.
          </p>
          <div class="form-group">
            <label for="superUserName">Nome</label>
            <input type="text" id="superUserName" placeholder="Ex: Lucas Oliveira" required />
          </div>
          <div class="form-group">
            <label for="superUserEmail">E-mail</label>
            <input type="email" id="superUserEmail" placeholder="Ex: lucas@provedor.com" required />
          </div>
          <div class="form-group">
            <label for="superUserGroup">Grupo Vinculado</label>
            <select id="superUserGroup">
              <option value="">Nenhum</option>
              ${appState.superGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="superUserRole">Papel no Grupo</label>
            <select id="superUserRole" required>
              <option value="user">Membro (User)</option>
              <option value="admin">Líder do Grupo (Admin)</option>
              <option value="supplier">Fornecedor (Supplier)</option>
            </select>
          </div>
          <div class="form-group" style="flex-direction:row; align-items:center; gap:0.5rem; margin-top:0.5rem;">
            <input type="checkbox" id="superUserCanCreate" style="width:auto; margin:0;" />
            <label for="superUserCanCreate" style="margin:0; cursor:pointer;">Permitir criar novos grupos?</label>
          </div>
        </form>
      `,
      confirmText: 'Pré-cadastrar Usuário',
      onConfirm: async (modalEl) => {
        const name = modalEl.querySelector('#superUserName').value.trim();
        const email = modalEl.querySelector('#superUserEmail').value.trim().toLowerCase();
        const groupId = modalEl.querySelector('#superUserGroup').value;
        const role = modalEl.querySelector('#superUserRole').value;
        const canCreateGroup = modalEl.querySelector('#superUserCanCreate').checked;

        if (!name || !email) {
          showToast('Preencha os campos obrigatórios.', 'warning');
          return false;
        }

        const preRegProfile = {
          name,
          email,
          groupId: groupId || null,
          role,
          canCreateGroup: role === 'admin' ? true : canCreateGroup,
          requestStatus: 'approved',
          createdAt: new Date().toISOString()
        };

        try {
          if (appState.firebaseMode) {
            // Generate a temporary document ID, which will be merged/deleted when the user signs up
            const tempId = `prereg_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            await db.collection('users').doc(tempId).set(preRegProfile);
          } else {
            const tempId = `prereg_${crypto.randomUUID()}`;
            appState.superUsers.push({ uid: tempId, ...preRegProfile });
            saveLocalData();
          }
          showToast('Usuário pré-cadastrado com sucesso!');
          if (appState.firebaseMode) {
            await loadSuperAdminData();
          }
          render();
          return true;
        } catch (error) {
          showToast(`Erro ao salvar: ${error.message}`, 'error');
          return false;
        }
      }
    });
  });
}

// =============================================================================
// SECTION 7 — DASHBOARD RENDER FUNCTIONS (GROUP VIEW)
// =============================================================================

/**
 * Admin view: shows all open/closed orders with per-order kg totals and
 * action buttons to create, edit, and manage orders.
 */
function renderAdminOrdersSection() {
  const openOrders = appState.orders.filter((o) => o.status === 'aberto');
  const closedOrders = appState.orders.filter((o) => o.status !== 'aberto');

  const renderOrderCard = (order) => {
    // Compute total kg requested by all participants for this order
    const orderParticipations = appState.participations.filter((p) => p.orderId === order.id);
    const totalKg = orderParticipations.reduce((sum, p) => sum + Number(p.quantityKg || 0), 0);
    const totalValue = orderParticipations.reduce((sum, p) => sum + Number(p.valueTotal || 0), 0);
    const participantsCount = orderParticipations.length;

    return `
      <article class="order-item">
        <div class="order-details" style="flex:1;">
          <strong>${order.type}</strong>
          <p>R$ ${Number(order.pricePerKg).toFixed(2)}/kg — Prazo: ${order.deadline}</p>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.4rem; align-items:center;">
            <span class="status-pill ${order.status}">${order.status.toUpperCase()}</span>
            <span style="font-size:0.8rem; color:var(--muted);">${participantsCount} participante(s)</span>
            <span style="font-size:0.8rem; color:var(--accent-strong); font-weight:700;">
              📦 ${totalKg.toFixed(2)} kg &nbsp;|&nbsp; R$ ${totalValue.toFixed(2)}
            </span>
          </div>
        </div>
        <div class="actions">
          <button class="edit-order-btn secondary" data-order-id="${order.id}" style="font-size:0.8rem; padding:0.5rem 1rem;">Editar</button>
        </div>
      </article>
    `;
  };

  return `
    <section class="card">
      <div class="section-title">
        <h2>Pedidos de Café</h2>
        <button id="newOrderButton" class="primary">+ Novo Pedido</button>
      </div>
      <div class="orders-container">
        ${openOrders.length === 0 ? `
          <p class="hint" style="color:var(--muted); font-size:0.9rem; text-align:center; padding:2rem 0;">
            Nenhum pedido aberto. Clique em "+ Novo Pedido" para iniciar uma compra coletiva.
          </p>
        ` : openOrders.map(renderOrderCard).join('')}
      </div>
      ${closedOrders.length > 0 ? `
        <details style="margin-top:1.25rem;">
          <summary style="cursor:pointer; color:var(--muted); font-size:0.85rem; padding:0.5rem 0; border-top:1px solid var(--border);">
            Ver pedidos encerrados (${closedOrders.length})
          </summary>
          <div class="orders-container" style="margin-top:0.75rem;">
            ${closedOrders.map(renderOrderCard).join('')}
          </div>
        </details>
      ` : ''}
    </section>
  `;
}

/**
 * Member view: shows open orders they can join by entering a quantity in kg.
 */
function renderUserOrdersSection() {
  const openOrders = appState.orders.filter((o) => o.status === 'aberto');
  const myUid = appState.user?.uid;

  const renderOrderCard = (order) => {
    const myParticipation = appState.participations.find(
      (p) => p.orderId === order.id && p.userId === myUid
    );
    const orderParticipations = appState.participations.filter((p) => p.orderId === order.id);
    const totalKg = orderParticipations.reduce((sum, p) => sum + Number(p.quantityKg || 0), 0);

    if (myParticipation) {
      // Already participating — show summary card
      return `
        <article class="order-item order-item--joined">
          <div class="order-details" style="flex:1;">
            <strong>${order.type}</strong>
            <p>R$ ${Number(order.pricePerKg).toFixed(2)}/kg — Prazo: ${order.deadline}</p>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.4rem; align-items:center;">
              <span class="status-pill pago" style="background:rgba(74,222,128,0.15);">✔ Você pediu ${Number(myParticipation.quantityKg).toFixed(2)} kg</span>
              <span style="font-size:0.8rem; color:var(--muted);">Total do grupo: ${totalKg.toFixed(2)} kg</span>
            </div>
          </div>
          <div class="actions" style="align-items:flex-end;">
            <span style="color:var(--success); font-size:0.85rem; font-weight:700;">R$ ${Number(myParticipation.valueTotal).toFixed(2)}</span>
            <span class="status-pill ${myParticipation.paymentStatus}" style="font-size:0.7rem;">${myParticipation.paymentStatus.toUpperCase()}</span>
          </div>
        </article>
      `;
    }

    // Not yet participating — show join form
    return `
      <article class="order-item order-item--available">
        <div class="order-details" style="flex:1;">
          <strong>${order.type}</strong>
          <p>R$ ${Number(order.pricePerKg).toFixed(2)}/kg — Prazo: ${order.deadline}</p>
          <p style="font-size:0.8rem; color:var(--muted); margin-top:0.2rem;">Grupo já solicitou: ${totalKg.toFixed(2)} kg</p>
        </div>
        <div class="actions" style="min-width:210px;">
          <form class="join-order-form" data-order-id="${order.id}" data-price="${order.pricePerKg}" style="display:grid; grid-template-columns:1fr auto; gap:0.5rem; margin:0; align-items:end;">
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.75rem;">Qtd. (kg)</label>
              <input
                type="number"
                class="join-qty-input"
                min="0.1"
                step="0.1"
                placeholder="Ex: 0.5"
                style="padding:0.5rem; font-size:0.85rem;"
                required
              />
            </div>
            <button type="submit" class="primary" style="padding:0.55rem 0.9rem; font-size:0.8rem; border-radius:8px; margin-bottom:0; height:fit-content; align-self:end;">Participar</button>
          </form>
        </div>
      </article>
    `;
  };

  return `
    <section class="card">
      <div class="section-title">
        <h2>Compras Disponíveis</h2>
        <span style="font-size:0.8rem; color:var(--muted);">${openOrders.length} pedido(s) aberto(s)</span>
      </div>
      <div class="orders-container">
        ${openOrders.length === 0 ? `
          <p class="hint" style="color:var(--muted); font-size:0.9rem; text-align:center; padding:2rem 0;">
            Nenhum pedido aberto no momento. Aguarde o administrador do grupo lançar uma nova compra.
          </p>
        ` : openOrders.map(renderOrderCard).join('')}
      </div>
    </section>
  `;
}

/**
 * Admin view: full participation table with payment and pickup status toggles,
 * grouped by order, with totals per order.
 */
function renderAdminParticipationsSection() {
  if (appState.participations.length === 0) {
    return `
      <section class="card">
        <div class="section-title">
          <h2>Controle de Participações</h2>
        </div>
        <p class="hint" style="color:var(--muted); font-size:0.9rem; text-align:center; padding:2rem 0;">
          Nenhum membro se inscreveu em pedidos ainda.
        </p>
      </section>
    `;
  }

  // Group participations by orderId
  const byOrder = {};
  appState.participations.forEach((p) => {
    if (!byOrder[p.orderId]) byOrder[p.orderId] = [];
    byOrder[p.orderId].push(p);
  });

  const sections = Object.entries(byOrder).map(([orderId, parts]) => {
    const order = appState.orders.find((o) => o.id === orderId);
    const orderName = order ? order.type : `Pedido (${orderId.slice(0, 6)}...)`;
    const totalKg = parts.reduce((sum, p) => sum + Number(p.quantityKg || 0), 0);
    const totalValue = parts.reduce((sum, p) => sum + Number(p.valueTotal || 0), 0);
    const paidCount = parts.filter((p) => p.paymentStatus === 'pago').length;
    const receivedCount = parts.filter((p) => p.pickupStatus === 'recebido').length;

    return `
      <div class="participation-group">
        <div class="participation-group-header">
          <div>
            <strong style="color:var(--accent-strong);">${orderName}</strong>
            <span style="font-size:0.8rem; color:var(--muted); margin-left:0.75rem;">${order ? `R$ ${Number(order.pricePerKg).toFixed(2)}/kg` : ''}</span>
          </div>
          <div class="participation-totals">
            <span>📦 <strong>${totalKg.toFixed(2)} kg</strong></span>
            <span>💰 <strong>R$ ${totalValue.toFixed(2)}</strong></span>
            <span style="color:var(--success);">✅ ${paidCount}/${parts.length} pagos</span>
            <span style="color:var(--warning);">📬 ${receivedCount}/${parts.length} retirados</span>
          </div>
        </div>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Membro</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Pagamento</th>
                <th>Retirada</th>
              </tr>
            </thead>
            <tbody>
              ${parts.map((p) => `
                <tr>
                  <td><strong>${getUserName(p.userId)}</strong></td>
                  <td>${Number(p.quantityKg).toFixed(2)} kg</td>
                  <td>R$ ${Number(p.valueTotal).toFixed(2)}</td>
                  <td>
                    <div style="display:flex; flex-direction:column; gap:0.25rem; align-items:flex-start;">
                      <button
                        class="toggle-payment-btn status-pill ${p.paymentStatus}"
                        data-participation-id="${p.id}"
                        data-current="${p.paymentStatus}"
                        style="cursor:pointer; border:none; font-size:0.7rem; font-weight:700; padding:0.25rem 0.6rem; border-radius:4px;"
                      >
                        ${p.paymentStatus === 'pago' ? '✔ Pago' : (p.paymentStatus === 'confirmando' ? '🔍 Validar Pix' : '⏳ Pendente')}
                      </button>
                      ${p.paymentStatus === 'confirmando' ? `
                        <span style="font-size:0.7rem; color:var(--warning); font-weight:600; background:rgba(251,191,36,0.1); padding:0.1rem 0.3rem; border-radius:4px;">
                          Ref: ${p.pixTransactionId || ''}
                        </span>
                      ` : ''}
                    </div>
                  </td>
                  <td>
                    <button
                      class="toggle-pickup-btn status-pill ${p.pickupStatus}"
                      data-participation-id="${p.id}"
                      data-current="${p.pickupStatus}"
                      style="cursor:pointer; border:none; font-size:0.7rem; font-weight:700; padding:0.25rem 0.6rem; border-radius:4px;"
                    >
                      ${p.pickupStatus === 'recebido' ? '✔ Recebido' : '📬 Aguardando'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  return `
    <section class="card">
      <div class="section-title">
        <h2>Controle de Participações</h2>
        <span style="font-size:0.8rem; color:var(--muted);">${appState.participations.length} participação(ões)</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:1.5rem;">
        ${sections.join('')}
      </div>
    </section>
  `;
}

/**
 * Member view: shows only their own participations with status indicators.
 */
function renderUserParticipationsSection() {
  const myUid = appState.user?.uid;
  const mine = appState.participations.filter((p) => p.userId === myUid);

  if (mine.length === 0) {
    return `
      <section class="card">
        <div class="section-title">
          <h2>Meu Histórico de Compras</h2>
        </div>
        <p class="hint" style="color:var(--muted); font-size:0.9rem; text-align:center; padding:1.5rem 0;">
          Você ainda não participou de nenhuma compra. Inscreva-se em um pedido aberto acima!
        </p>
      </section>
    `;
  }

  const totalKg = mine.reduce((sum, p) => sum + Number(p.quantityKg || 0), 0);
  const totalSpent = mine.reduce((sum, p) => sum + Number(p.valueTotal || 0), 0);
  const pendingCount = mine.filter((p) => p.paymentStatus === 'pendente').length;

  return `
      ${pendingCount > 0 && appState.group?.pixKey ? `
        <div class="hint-box" style="margin-bottom:1rem; border: 1px solid var(--accent); background:rgba(212, 144, 62, 0.04);">
          <strong style="color:var(--accent-strong);">💸 Dados para Pagamento Pix:</strong>
          <p style="font-size:0.8rem; margin-top:0.25rem;">
            Chave Pix: <code id="groupPixKeyText" style="font-weight:700; color:var(--text); cursor:pointer;" title="Clique para copiar">${appState.group.pixKey}</code> 📋
          </p>
          <p style="font-size:0.8rem;">Favorecido: <strong>${appState.group.pixReceiver || 'Líder do Grupo'}</strong></p>
          <span style="font-size:0.75rem; color:var(--muted); margin-top:0.4rem; display:block;">
            * Pague o valor total correspondente ao seu pedido e envie o código/comprovante de transação abaixo.
          </span>
        </div>
      ` : (pendingCount > 0 ? `
        <div class="hint-box warning" style="margin-bottom:1rem;">
          <strong>⚠️ ${pendingCount} pagamento(s) pendente(s)</strong>
          <p style="font-size:0.8rem;">O administrador ainda não cadastrou a Chave Pix do grupo. Fale com ele para efetuar o pagamento.</p>
        </div>
      ` : '')}

      <div class="participation-summary-pills" style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1.25rem;">
        <div class="metric-card" style="padding:0.75rem 1.25rem; flex:1; min-width:130px;">
          <span style="font-size:0.7rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em;">Total adquirido</span>
          <strong style="display:block; font-size:1.3rem; color:var(--accent-strong);">${totalKg.toFixed(2)} kg</strong>
        </div>
        <div class="metric-card" style="padding:0.75rem 1.25rem; flex:1; min-width:130px;">
          <span style="font-size:0.7rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em;">Valor investido</span>
          <strong style="display:block; font-size:1.3rem; color:var(--accent-strong);">R$ ${totalSpent.toFixed(2)}</strong>
        </div>
      </div>

      <div class="orders-container">
        ${mine.map((p) => {
          const order = appState.orders.find((o) => o.id === p.orderId);
          const orderName = order ? order.type : `Pedido encerrado`;
          
          let statusText = '⏳ Pag. Pendente';
          if (p.paymentStatus === 'pago') statusText = '✔ Pago';
          if (p.paymentStatus === 'confirmando') statusText = '🔍 Confirmando Pix';

          return `
            <article class="order-item" style="border-left:3px solid var(--${p.paymentStatus === 'pago' ? 'success' : (p.paymentStatus === 'confirmando' ? 'warning' : 'error')});">
              <div class="order-details" style="flex:1;">
                <strong>${orderName}</strong>
                <p>${Number(p.quantityKg).toFixed(2)} kg — R$ ${Number(p.valueTotal).toFixed(2)}</p>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.4rem;">
                  <span class="status-pill ${p.paymentStatus}">${statusText}</span>
                  <span class="status-pill ${p.pickupStatus}">${p.pickupStatus === 'recebido' ? '✔ Recebido' : '📬 Aguardando Retirada'}</span>
                </div>
                
                ${p.paymentStatus === 'pendente' && appState.group?.pixKey ? `
                  <div style="margin-top:0.8rem; border-top:1px dashed var(--border); padding-top:0.6rem; display:flex; gap:0.5rem; align-items:end;">
                    <div class="form-group" style="margin:0; flex:1;">
                      <label style="font-size:0.7rem;">Cód. da Transação / Pix (4 últimos dígitos)</label>
                      <input
                        type="text"
                        class="pix-ref-input"
                        placeholder="Ex: 8a4b"
                        style="padding:0.4rem; font-size:0.8rem; border-radius:6px;"
                        required
                        data-part-id="${p.id}"
                      />
                    </div>
                    <button class="primary confirm-pix-btn" data-part-id="${p.id}" style="padding:0.45rem 0.8rem; font-size:0.75rem; border-radius:6px; height:fit-content;">Confirmar</button>
                  </div>
                ` : ''}

                ${p.paymentStatus === 'confirmando' ? `
                  <p style="font-size:0.75rem; color:var(--muted); margin-top:0.4rem;">
                    Ref. enviada: <code style="background:rgba(0,0,0,0.2); padding:0.1rem 0.3rem; border-radius:4px;">${p.pixTransactionId || ''}</code>
                  </p>
                ` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

/**
 * Binds all interactive events for group members (non-admin users).
 * Main action: submitting a "join order" form to register their quantity.
 */
function bindUserEvents() {
  document.querySelectorAll('.join-order-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const orderId = form.getAttribute('data-order-id');
      const pricePerKg = Number(form.getAttribute('data-price'));
      const qtyInput = form.querySelector('.join-qty-input');
      const quantityKg = Number(qtyInput?.value);

      if (!orderId || isNaN(quantityKg) || quantityKg <= 0) {
        showToast('Informe uma quantidade válida em kg.', 'warning');
        return;
      }

      const valueTotal = calculateTotal(quantityKg, pricePerKg);
      const myName = appState.profile?.name || appState.user?.displayName || 'Usuário';

      const newParticipation = {
        groupId: appState.profile.groupId,
        orderId,
        userId: appState.user.uid,
        userName: myName,
        quantityKg,
        valueTotal,
        paymentStatus: 'pendente',
        pickupStatus: 'aguardando',
        createdAt: new Date().toISOString(),
      };

      try {
        if (appState.firebaseMode) {
          const db = window.firebase.firestore();
          await db.collection('participations').add(newParticipation);
          await loadFirebaseData(appState.user.uid);
        } else {
          appState.participations.unshift({ id: crypto.randomUUID(), ...newParticipation });
          saveLocalData();
        }
        showToast(`Participação registrada! ${quantityKg.toFixed(2)} kg — R$ ${valueTotal.toFixed(2)}`);
        render();
      } catch (error) {
        showToast(`Erro ao registrar: ${error.message}`, 'error');
      }
    });
  });

  // Copy Pix key click handler
  document.getElementById('groupPixKeyText')?.addEventListener('click', () => {
    const key = document.getElementById('groupPixKeyText').textContent.trim();
    navigator.clipboard.writeText(key);
    showToast('Chave Pix copiada para a área de transferência!');
  });

  // Pix transaction reference confirmation handler
  document.querySelectorAll('.confirm-pix-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pId = btn.getAttribute('data-part-id');
      const inputEl = document.querySelector(`.pix-ref-input[data-part-id="${pId}"]`);
      const refCode = inputEl?.value.trim();

      if (!refCode) {
        showToast('Informe o código ou últimos dígitos da transação.', 'warning');
        return;
      }

      try {
        if (appState.firebaseMode) {
          const db = window.firebase.firestore();
          await db.collection('participations').doc(pId).update({
            paymentStatus: 'confirmando',
            pixTransactionId: refCode
          });
          await loadFirebaseData(appState.user.uid);
        } else {
          appState.participations = appState.participations.map((p) =>
            p.id === pId ? { ...p, paymentStatus: 'confirmando', pixTransactionId: refCode } : p
          );
          saveLocalData();
        }
        showToast('Confirmação enviada com sucesso! Aguarde a validação do líder.');
        render();
      } catch (error) {
        showToast(`Erro ao confirmar: ${error.message}`, 'error');
      }
    });
  });
}

// BIND GROUP ADMIN EVENTS
function bindAdminEvents() {
  document.getElementById('groupSettingsBtn')?.addEventListener('click', () => {
    if (!appState.group) return;

    showModal({
      title: 'Configuração de Recebimento Pix',
      bodyHtml: `
        <form id="modalGroupSettingsForm" style="margin-top:0;">
          <p style="color:var(--muted); font-size:0.8rem; margin-bottom:1rem; line-height:1.4;">
            Cadastre a chave Pix e o nome do favorecido do seu grupo. Os membros do grupo visualizarão essas informações no histórico de compras para realizar os pagamentos das cotas.
          </p>
          <div class="form-group">
            <label for="groupPixKey">Chave Pix (E-mail, Telefone, CPF ou Aleatória)</label>
            <input type="text" id="groupPixKey" value="${appState.group.pixKey || ''}" placeholder="Ex: pix@cafecoletivo.com" required />
          </div>
          <div class="form-group">
            <label for="groupPixReceiver">Favorecido (Nome completo do titular)</label>
            <input type="text" id="groupPixReceiver" value="${appState.group.pixReceiver || ''}" placeholder="Ex: João da Silva Santos" required />
          </div>
        </form>
      `,
      confirmText: 'Salvar Configurações',
      onConfirm: async (modalEl) => {
        const pixKey = modalEl.querySelector('#groupPixKey').value.trim();
        const pixReceiver = modalEl.querySelector('#groupPixReceiver').value.trim();

        if (!pixKey || !pixReceiver) {
          showToast('Preencha todos os campos.', 'warning');
          return false;
        }

        try {
          if (appState.firebaseMode) {
            await window.firebase.firestore().collection('groups').doc(appState.group.id).update({
              pixKey,
              pixReceiver
            });
            appState.group.pixKey = pixKey;
            appState.group.pixReceiver = pixReceiver;
          } else {
            appState.group.pixKey = pixKey;
            appState.group.pixReceiver = pixReceiver;
            const localGroups = JSON.parse(localStorage.getItem('cafe-local-groups') || '[]');
            const idx = localGroups.findIndex(g => g.id === appState.group.id);
            if (idx !== -1) {
              localGroups[idx] = { ...localGroups[idx], pixKey, pixReceiver };
              localStorage.setItem('cafe-local-groups', JSON.stringify(localGroups));
            }
            saveLocalData();
          }
          showToast('Configurações do grupo atualizadas!');
          render();
          return true;
        } catch (error) {
          showToast(`Erro ao salvar: ${error.message}`, 'error');
          return false;
        }
      }
    });
  });

  document.getElementById('newOrderButton')?.addEventListener('click', () => {
    showModal({
      title: 'Iniciar Compra de Café (Novo Pedido)',
      bodyHtml: `
        <form id="modalCreateForm" style="margin-top:0;">
          <div class="form-group">
            <label for="orderSourceProduct">Importar oferta de fornecedor parceiro (opcional)</label>
            <select id="orderSourceProduct" style="padding:0.5rem; font-size:0.85rem; border-radius:6px;">
              <option value="">-- Cadastrar Manualmente --</option>
              ${appState.products.map(p => `
                <option value="${p.id}" data-price="${p.pricePerKg}" data-deadline="${p.deadline}">${p.name} (R$ ${Number(p.pricePerKg).toFixed(2)}/kg)</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="orderType">Nome do Café / Produtor / Região</label>
            <input type="text" id="orderType" placeholder="Ex: Catuaí Vermelho - Sítio São João" required />
          </div>
          <div class="form-group">
            <label for="orderPrice">Valor do Quilo (R$)</label>
            <input type="number" id="orderPrice" min="0.01" step="0.01" placeholder="Ex: 80.00" required />
          </div>
          <div class="form-group">
            <label for="orderDeadline">Data Limite de Pedidos</label>
            <input type="date" id="orderDeadline" required />
          </div>
        </form>
      `,
      confirmText: 'Lançar Pedido',
      onShow: (modalEl) => {
        // Change listener to auto populate fields when a partner product is selected
        modalEl.querySelector('#orderSourceProduct')?.addEventListener('change', (e) => {
          const select = e.target;
          const selectedOption = select.options[select.selectedIndex];
          const typeInput = modalEl.querySelector('#orderType');
          const priceInput = modalEl.querySelector('#orderPrice');
          const deadlineInput = modalEl.querySelector('#orderDeadline');

          if (select.value) {
            typeInput.value = selectedOption.text.split(' (R$')[0];
            priceInput.value = selectedOption.getAttribute('data-price');
            deadlineInput.value = selectedOption.getAttribute('data-deadline');
          } else {
            typeInput.value = '';
            priceInput.value = '';
            deadlineInput.value = '';
          }
        });
      },
      onConfirm: async (modalEl) => {
        const type = modalEl.querySelector('#orderType').value.trim();
        const pricePerKg = Number(modalEl.querySelector('#orderPrice').value);
        const deadline = modalEl.querySelector('#orderDeadline').value;

        if (!type || isNaN(pricePerKg) || pricePerKg <= 0 || !deadline) {
          showToast('Preencha os dados de forma correta.', 'warning');
          return false;
        }

        const newOrder = {
          type,
          pricePerKg,
          openingDate: new Date().toISOString().slice(0, 10),
          deadline,
          status: 'aberto',
          groupId: appState.profile.groupId,
          createdBy: appState.user.uid,
          createdAt: new Date().toISOString(),
        };

        try {
          if (appState.firebaseMode) {
            const db = window.firebase.firestore();
            await db.collection('orders').add(newOrder);
            // Real-time listener onSnapshot will automatically trigger System Notification amigably
          } else {
            // Local mode mockup - trigger notification directly for testing
            appState.orders.unshift({ id: crypto.randomUUID(), ...newOrder });
            saveLocalData();
            triggerSystemNotification(
              `Novo Café no grupo ${appState.group.name}!`,
              `${type} por R$ ${pricePerKg.toFixed(2)}/kg. Participe até ${deadline}!`
            );
          }
          showToast('Nova compra coletiva iniciada!');
          render();
          return true;
        } catch (error) {
          showToast(`Erro ao criar: ${error.message}`, 'error');
          return false;
        }
      }
    });

    const deadlineInput = document.getElementById('orderDeadline');
    if (deadlineInput) {
      const inOneWeek = new Date();
      inOneWeek.setDate(inOneWeek.getDate() + 7);
      deadlineInput.value = inOneWeek.toISOString().slice(0, 10);
    }
  });

  document.querySelectorAll('.edit-order-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-order-id');
      const order = appState.orders.find((o) => o.id === orderId);
      if (!order) return;

      showModal({
        title: 'Configurações da Compra Coletiva',
        bodyHtml: `
          <form id="modalEditForm" style="margin-top:0;">
            <div class="form-group">
              <label for="editType">Tipo de Café / Produtor</label>
              <input type="text" id="editType" value="${order.type}" required />
            </div>
            <div class="form-group">
              <label for="editPrice">Valor do Quilo (R$)</label>
              <input type="number" id="editPrice" min="0.01" step="0.01" value="${order.pricePerKg}" required />
            </div>
            <div class="form-group">
              <label for="editDeadline">Data Limite</label>
              <input type="date" id="editDeadline" value="${order.deadline}" required />
            </div>
            <div class="form-group">
              <label for="editStatus">Status da Compra</label>
              <select id="editStatus" required>
                <option value="aberto" ${order.status === 'aberto' ? 'selected' : ''}>Aberto</option>
                <option value="fechado" ${order.status === 'fechado' ? 'selected' : ''}>Fechado</option>
                <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
          </form>
        `,
        confirmText: 'Salvar Configurações',
        onConfirm: async (modalEl) => {
          const type = modalEl.querySelector('#editType').value.trim();
          const pricePerKg = Number(modalEl.querySelector('#editPrice').value);
          const deadline = modalEl.querySelector('#editDeadline').value;
          const status = modalEl.querySelector('#editStatus').value;

          if (!type || isNaN(pricePerKg) || pricePerKg <= 0 || !deadline) {
            showToast('Dados inválidos para atualizar o pedido.', 'warning');
            return false;
          }

          try {
            if (appState.firebaseMode) {
              await window.firebase.firestore().collection('orders').doc(orderId).update({ type, pricePerKg, deadline, status });
              await loadFirebaseData(appState.user.uid);
            } else {
              appState.orders = appState.orders.map((o) => o.id === orderId ? { ...o, type, pricePerKg, deadline, status } : o);
              saveLocalData();
            }
            showToast('Pedido atualizado!');
            render();
            return true;
          } catch (err) {
            showToast(`Erro ao atualizar: ${err.message}`, 'error');
            return false;
          }
        }
      });
    });
  });

  document.querySelectorAll('.toggle-payment-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pId = btn.getAttribute('data-participation-id');
      const current = btn.getAttribute('data-current');
      const nextStatus = current === 'pago' ? 'pendente' : 'pago';

      try {
        if (appState.firebaseMode) {
          await window.firebase.firestore().collection('participations').doc(pId).update({ paymentStatus: nextStatus });
          await loadFirebaseData(appState.user.uid);
        } else {
          appState.participations = appState.participations.map((p) => p.id === pId ? { ...p, paymentStatus: nextStatus } : p);
          saveLocalData();
        }
        showToast('Status de pagamento atualizado!');
        render();
      } catch (err) {
        showToast(`Erro ao alterar: ${err.message}`, 'error');
      }
    });
  });

  document.querySelectorAll('.toggle-pickup-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pId = btn.getAttribute('data-participation-id');
      const current = btn.getAttribute('data-current');
      const nextStatus = current === 'aguardando' ? 'recebido' : 'aguardando';

      try {
        if (appState.firebaseMode) {
          await window.firebase.firestore().collection('participations').doc(pId).update({ pickupStatus: nextStatus });
          await loadFirebaseData(appState.user.uid);
        } else {
          appState.participations = appState.participations.map((p) => p.id === pId ? { ...p, pickupStatus: nextStatus } : p);
          saveLocalData();
        }
        showToast('Status de retirada atualizado!');
        render();
      } catch (err) {
        showToast(`Erro ao alterar: ${err.message}`, 'error');
      }
    });
  });
}

// REVIEWS
function renderReviews() {
  const container = document.getElementById('reviewList');
  if (!container) return;

  if (appState.reviews.length === 0) {
    container.innerHTML = '<p class="hint">Ainda não há avaliações registradas.</p>';
    return;
  }

  container.innerHTML = appState.reviews.map((review) => {
    const stars = '★'.repeat(Number(review.rating)) + '☆'.repeat(5 - Number(review.rating));
    return `
      <article class="review-card">
        <div>
          <strong>${review.coffee}</strong>
          <span class="rating-stars" style="margin-left:0.5rem">${stars}</span>
        </div>
        <p>${review.note}</p>
        <span class="hint" style="font-size:0.75rem;">Avaliado em: ${new Date(review.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
      </article>
    `;
  }).join('');
}

function bindReviewFormSubmit() {
  const form = document.getElementById('reviewForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const coffee = document.getElementById('reviewCoffee').value;
    const rating = Number(document.getElementById('reviewRating').value);
    const note = document.getElementById('reviewNote').value.trim();

    if (!coffee || !rating || !note) {
      showToast('Por favor, preencha todos os campos.', 'warning');
      return;
    }

    const newReview = {
      coffee,
      rating,
      note,
      createdAt: new Date().toISOString(),
    };

    try {
      if (appState.firebaseMode) {
        const db = window.firebase.firestore();
        await db.collection('reviews').add(newReview);
        await loadFirebaseData(appState.user.uid);
      } else {
        appState.reviews.unshift({ id: crypto.randomUUID(), ...newReview });
        saveLocalData();
      }
      showToast('Agradecemos sua avaliação!');
      form.reset();
      render();
    } catch (error) {
      showToast(`Erro ao salvar: ${error.message}`, 'error');
    }
  });
}

// AUTH AND INTEGRATIONS HELPERS
async function handleFirebaseAuth(action, name, email, password, requestedRole = 'user') {
  const auth = window.firebase.auth();
  const db = window.firebase.firestore();

  if (action === 'register') {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    if (name) {
      await userCredential.user.updateProfile({ displayName: name });
    }
    const role = window.adminEmail && email.toLowerCase() === window.adminEmail.toLowerCase() ? 'admin' : 'user';
    const canCreateGroup = role === 'admin';
    
    // Check for pre-registered profile by email
    let profile = {
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      role,
      groupId: null,
      canCreateGroup,
      requestStatus: 'none',
      requestSupplierStatus: requestedRole === 'supplier' ? 'pending' : 'none',
      createdAt: new Date().toISOString()
    };

    const preRegQuery = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (!preRegQuery.empty) {
      const preRegDoc = preRegQuery.docs[0];
      const preRegData = preRegDoc.data();
      profile = {
        ...profile,
        ...preRegData,
        name: name || preRegData.name || profile.name
      };
      
      // If the pre-registered document was using a non-UID placeholder ID, delete it
      if (preRegDoc.id !== userCredential.user.uid) {
        await db.collection('users').doc(preRegDoc.id).delete();
      }
    }

    await db.collection('users').doc(userCredential.user.uid).set(profile);
    appState.user = userCredential.user;
    appState.profile = profile;
    showToast('Conta criada com sucesso!');
  } else {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    appState.user = userCredential.user;
    
    // Fetch profile, checking both UID and pre-registered emails
    let profileDoc = await db.collection('users').doc(userCredential.user.uid).get();
    let profile = null;

    if (profileDoc.exists) {
      profile = profileDoc.data();
      // Ensure email field exists in the document
      if (!profile.email && userCredential.user.email) {
        profile.email = userCredential.user.email.toLowerCase();
        await db.collection('users').doc(userCredential.user.uid).update({ email: profile.email });
      }
    } else {
      // Fallback: check if pre-registered by email
      const preRegQuery = await db.collection('users').where('email', '==', userCredential.user.email?.toLowerCase()).get();
      if (!preRegQuery.empty) {
        const preRegDoc = preRegQuery.docs[0];
        profile = {
          name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Usuário',
          email: userCredential.user.email?.toLowerCase(),
          role: 'user',
          groupId: null,
          canCreateGroup: false,
          requestStatus: 'none',
          createdAt: new Date().toISOString(),
          ...preRegDoc.data()
        };
        await db.collection('users').doc(userCredential.user.uid).set(profile);
        if (preRegDoc.id !== userCredential.user.uid) {
          await db.collection('users').doc(preRegDoc.id).delete();
        }
      } else {
        profile = {
          name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Usuário',
          email: userCredential.user.email?.toLowerCase() || '',
          role: 'user',
          groupId: null,
          canCreateGroup: false,
          requestStatus: 'none',
          createdAt: new Date().toISOString()
        };
        await db.collection('users').doc(userCredential.user.uid).set(profile);
      }
    }
    appState.profile = profile;
    showToast(`Bem-vindo de volta, ${profile.name}!`);
  }
}

async function handleGoogleSignIn() {
  const auth = window.firebase.auth();
  const provider = new window.firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  await auth.signInWithPopup(provider);
}

let phoneRecaptchaVerifier = null;
let phoneConfirmationResult = null;

async function getPhoneRecaptchaVerifier() {
  if (phoneRecaptchaVerifier) return phoneRecaptchaVerifier;

  phoneRecaptchaVerifier = new window.firebase.auth.RecaptchaVerifier('phoneRecaptchaContainer', {
    size: 'invisible',
    callback: () => {},
  });

  await phoneRecaptchaVerifier.render();
  return phoneRecaptchaVerifier;
}

async function handlePhoneSignIn(phoneNumber) {
  const auth = window.firebase.auth();
  const verifier = await getPhoneRecaptchaVerifier();
  phoneConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, verifier);
}

async function handlePhoneCodeVerification(code) {
  if (!phoneConfirmationResult) {
    throw new Error('Código enviado sem dados correspondentes.');
  }
  await phoneConfirmationResult.confirm(code);
}

// =============================================================================
// BOOTSTRAP — ES modules are deferred by default, so the DOM is already ready
// when this code runs. No need to wait for DOMContentLoaded.
// =============================================================================
initializeFirebase();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registrado:', reg.scope))
      .catch((err) => console.error('Falha ao registrar Service Worker:', err));
  });
}
