import { coffeeNews, getCoffeeNewsStory } from './coffee-news.js';
import { buildConsumerRanking } from './dashboard-utils.js';

const appState = {
  user: null,
  profile: null,
  orders: [],
  participations: [],
  loading: true,
  firebaseMode: false,
  reviews: [],
};

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

function initializeFirebase() {
  const config = getFirebaseConfig();
  if (!window.firebase || !window.firebase.auth || !window.firebase.firestore || !config || isPlaceholder(config.apiKey) || isPlaceholder(config.projectId)) {
    appState.firebaseMode = false;
    appState.loading = false;
    loadLocalData();
    render();
    return;
  }

  window.firebase.initializeApp(config);
  appState.firebaseMode = true;
  appState.loading = true;
  render();

  const auth = window.firebase.auth();
  const db = window.firebase.firestore();

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      appState.user = user;
      const profileDoc = await db.collection('users').doc(user.uid).get();
      const role = window.adminEmail && user.email?.toLowerCase() === window.adminEmail.toLowerCase() ? 'admin' : 'user';
      const profile = profileDoc.exists ? profileDoc.data() : { name: user.email?.split('@')[0] || 'Usuário', role, createdAt: new Date().toISOString() };

      if (!profileDoc.exists) {
        await db.collection('users').doc(user.uid).set(profile);
      }

      appState.profile = profile;
      await loadFirebaseData(user.uid);
    } else {
      appState.user = null;
      appState.profile = null;
      appState.orders = [];
      appState.participations = [];
    }

    appState.loading = false;
    render();
  });
}

async function loadFirebaseData(uid) {
  const db = window.firebase.firestore();
  const ordersSnapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
  const participationsSnapshot = await db.collection('participations').where('userId', '==', uid).get();

  appState.orders = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  appState.participations = participationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function loadLocalData() {
  const storedOrders = localStorage.getItem('cafe-orders');
  const storedParticipations = localStorage.getItem('cafe-participations');
  appState.orders = storedOrders ? JSON.parse(storedOrders) : [];
  appState.participations = storedParticipations ? JSON.parse(storedParticipations) : [];
}

function saveLocalData() {
  localStorage.setItem('cafe-orders', JSON.stringify(appState.orders));
  localStorage.setItem('cafe-participations', JSON.stringify(appState.participations));
}

function render() {
  const app = document.getElementById('app');

  if (appState.loading) {
    app.innerHTML = '<section class="card"><h1>Carregando...</h1><p>Conectando ao Firebase ou iniciando o modo local.</p></section>';
    return;
  }

  if (!appState.user) {
    const featuredStory = getCoffeeNewsStory(0);
    app.innerHTML = `
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
          <button id="exploreButton" type="button">Explorar novidades</button>
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

      <section class="card auth-card">
        <h1>Entre e participe</h1>
        <p>Cadastre-se ou entre para participar dos pedidos de café e acompanhar o seu ritual favorito.</p>
        <form id="authForm">
          <input id="name" placeholder="Seu nome" />
          <input id="email" type="email" placeholder="Seu e-mail" required />
          <input id="password" type="password" placeholder="Sua senha" required />
          <button type="submit">Entrar / cadastrar</button>
        </form>

        <div class="auth-providers">
          <button id="googleSignInButton" type="button">Entrar com Google</button>
          <button id="phoneAuthToggleButton" type="button">Entrar com telefone</button>
        </div>

        <div id="phoneAuthSection" hidden>
          <input id="phoneNumber" type="tel" placeholder="+55 11 99999-9999" />
          <button id="sendCodeButton" type="button">Enviar código</button>
          <div id="otpSection" hidden>
            <input id="otpCode" inputmode="numeric" placeholder="Código recebido" />
            <button id="verifyCodeButton" type="button">Confirmar código</button>
          </div>
          <div id="phoneRecaptchaContainer"></div>
        </div>

        <p class="hint">${appState.firebaseMode ? 'Conectado ao Firebase.' : 'Modo local ativo. Configure o Firebase para persistência real.'}</p>
      </section>
    `;

    document.getElementById('exploreButton').addEventListener('click', () => {
      document.querySelector('.auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('authForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) return;

      try {
        if (appState.firebaseMode) {
          await handleFirebaseAuth(name, email, password);
        } else {
          appState.user = { uid: crypto.randomUUID(), email, displayName: name || email.split('@')[0] };
          appState.profile = { name: name || email.split('@')[0], role: 'user' };
          appState.orders = loadOrdersFromStorage();
          appState.participations = loadParticipationsFromStorage();
          render();
        }
      } catch (error) {
        alert(error.message || 'Não foi possível entrar');
      }
    });

    document.getElementById('googleSignInButton').addEventListener('click', async () => {
      try {
        if (!appState.firebaseMode) {
          alert('Configure o Firebase para usar o login com Google.');
          return;
        }
        await handleGoogleSignIn();
      } catch (error) {
        alert(error.message || 'Não foi possível entrar com o Google');
      }
    });

    document.getElementById('phoneAuthToggleButton').addEventListener('click', () => {
      const section = document.getElementById('phoneAuthSection');
      section.hidden = !section.hidden;
    });

    document.getElementById('sendCodeButton').addEventListener('click', async () => {
      const phoneNumber = document.getElementById('phoneNumber').value.trim();
      if (!phoneNumber) {
        alert('Informe o número de telefone.');
        return;
      }

      try {
        await handlePhoneSignIn(phoneNumber);
        document.getElementById('otpSection').hidden = false;
      } catch (error) {
        alert(error.message || 'Não foi possível enviar o código de telefone');
      }
    });

    document.getElementById('verifyCodeButton').addEventListener('click', async () => {
      const code = document.getElementById('otpCode').value.trim();
      if (!code) {
        alert('Informe o código recebido por SMS.');
        return;
      }

      try {
        await handlePhoneCodeVerification(code);
      } catch (error) {
        alert(error.message || 'Não foi possível validar o código');
      }
    });

    return;
  }

  const role = appState.profile?.role || 'user';
  const isAdmin = role === 'admin';
  const ranking = buildConsumerRanking(appState.participations, appState.user.uid, appState.profile?.name || 'Você');
  const totalConsumed = appState.participations.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);
  const totalSpent = appState.participations.reduce((sum, item) => sum + Number(item.valueTotal || 0), 0);
  const lastParticipations = [...appState.participations].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 3);

  app.innerHTML = `
    <section class="header">
      <div>
        <p class="eyebrow">Painel do usuário</p>
        <h1>Olá, ${appState.profile?.name || appState.user.displayName || appState.user.email}</h1>
      </div>
      <button id="logoutButton" class="secondary">Sair</button>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>Resumo do seu café</h2>
      </div>
      <div class="dashboard-grid">
        <div class="metric-card">
          <h3>Últimas compras</h3>
          ${lastParticipations.length ? lastParticipations.map((participation) => {
            const order = appState.orders.find((item) => item.id === participation.orderId);
            return `<div class="metric-item"><span>${order ? order.type : 'Pedido removido'}</span><strong>${participation.quantityKg} kg</strong></div>`;
          }).join('') : '<p class="hint">Você ainda não participou de nenhuma compra coletiva.</p>'}
        </div>
        <div class="metric-card">
          <h3>Seu consumo</h3>
          <div class="metric-list">
            <div class="metric-item"><span>Total adquirido</span><strong>${totalConsumed.toFixed(2)} kg</strong></div>
            <div class="metric-item"><span>Valor investido</span><strong>R$ ${totalSpent.toFixed(2)}</strong></div>
            <div class="metric-item"><span>Status</span><strong>${totalConsumed >= 3 ? 'Ávido por café' : 'Em evolução'}</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>Classifique o café que você experimentou</h2>
      </div>
      <form id="reviewForm" class="review-form">
        <select id="reviewCoffee" required>
          <option value="">Selecione um café</option>
          ${appState.orders.map((order) => `<option value="${order.type}">${order.type}</option>`).join('')}
        </select>
        <select id="reviewRating" required>
          <option value="">Sua nota</option>
          <option value="5">5 ★</option>
          <option value="4">4 ★</option>
          <option value="3">3 ★</option>
          <option value="2">2 ★</option>
          <option value="1">1 ★</option>
        </select>
        <input id="reviewNote" placeholder="Conte sua experiência" />
        <button type="submit">Salvar avaliação</button>
      </form>
      <div id="reviewList"></div>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>Ranking dos consumidores</h2>
      </div>
      <ul class="rank-list">
        ${ranking.map((entry, index) => `<li><span>#${index + 1} ${entry.displayName}</span><strong>${entry.totalKg.toFixed(2)} kg</strong></li>`).join('')}
      </ul>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>Conheça os métodos de extração</h2>
      </div>
      <div class="tech-grid">
        <article class="tech-card">
          <h3>Espresso</h3>
          <p>Extração rápida e intensa, ideal para quem gosta de um café concentrado e com corpo forte.</p>
          <ul>
            <li>Pressão alta</li>
            <li>Tempo curto</li>
            <li>Perfis ricos e encorpados</li>
          </ul>
        </article>
        <article class="tech-card">
          <h3>Aeropress</h3>
          <p>Uma técnica limpa e versátil, perfeita para explorar sabores com mais clareza e equilíbrio.</p>
          <ul>
            <li>Filtro fino</li>
            <li>Controle do tempo</li>
            <li>Finalização limpa</li>
          </ul>
        </article>
        <article class="tech-card">
          <h3>V60</h3>
          <p>O método de filtro em dripper destaca a complexidade aromática do café, com ótima precisão.</p>
          <ul>
            <li>Fluxo controlado</li>
            <li>Notas florais e frutadas</li>
            <li>Extração delicada</li>
          </ul>
        </article>
        <article class="tech-card">
          <h3>French Press</h3>
          <p>Reúne sabor, textura e uma experiência mais encorpada, excelente para cafés mais robustos.</p>
          <ul>
            <li>Imersão total</li>
            <li>Corpo mais cheio</li>
            <li>Ritual acolhedor</li>
          </ul>
        </article>
      </div>
    </section>
  `;

  document.getElementById('logoutButton').addEventListener('click', async () => {
    if (appState.firebaseMode) {
      await window.firebase.auth().signOut();
    }
    appState.user = null;
    appState.profile = null;
    appState.orders = [];
    appState.participations = [];
    render();
  });

  if (isAdmin) {
    document.getElementById('newOrderButton').addEventListener('click', async () => {
      const type = prompt('Tipo de café');
      const pricePerKg = Number(prompt('Valor por kg'));
      const openingDate = prompt('Data de abertura (AAAA-MM-DD)') || new Date().toISOString().slice(0, 10);
      const deadline = prompt('Data limite para participação (AAAA-MM-DD)') || openingDate;

      if (!type || Number.isNaN(pricePerKg)) return;

      const newOrder = {
        type,
        pricePerKg,
        openingDate,
        deadline,
        status: 'aberto',
        createdBy: appState.user.uid,
        createdAt: new Date().toISOString(),
      };

      if (appState.firebaseMode) {
        await window.firebase.firestore().collection('orders').add(newOrder);
        await loadFirebaseData(appState.user.uid);
      } else {
        appState.orders.unshift({ id: crypto.randomUUID(), ...newOrder });
        saveLocalData();
      }
      render();
    });
  }

  renderOrders();
  renderParticipations();
  renderReviews();
  bindReviewForm();
}

function renderOrders() {
  const container = document.getElementById('ordersList');
  if (!container) return;

  if (appState.orders.length === 0) {
    container.innerHTML = '<p>Nenhum pedido cadastrado ainda.</p>';
    return;
  }

  container.innerHTML = appState.orders.map((order) => {
    const isAdmin = (appState.profile?.role || 'user') === 'admin';
    const participation = appState.participations.find((item) => item.orderId === order.id && item.userId === appState.user.uid);
    const total = participation ? participation.valueTotal : 0;
    return `
      <article class="order-item">
        <div>
          <strong>${order.type}</strong>
          <p>R$ ${Number(order.pricePerKg || 0).toFixed(2)} por kg</p>
          <p>Aberto em ${order.openingDate} • até ${order.deadline}</p>
          <p>Status: ${order.status}</p>
        </div>
        <div class="actions">
          ${participation ? `<span>Você já participa com R$ ${total.toFixed(2)}</span>` : ''}
          <button class="join-button" data-order-id="${order.id}">Participar</button>
          ${isAdmin ? '<button class="secondary" data-order-id="${order.id}">Editar</button>' : ''}
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('.join-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const orderId = button.getAttribute('data-order-id');
      const order = appState.orders.find((item) => item.id === orderId);
      if (!order) return;

      const quantity = Number(prompt('Quantos kg deseja comprar?'));
      if (!quantity || Number.isNaN(quantity) || quantity <= 0) return;

      const valueTotal = calculateTotal(quantity, order.pricePerKg);
      const participation = {
        orderId,
        userId: appState.user.uid,
        quantityKg: quantity,
        valueTotal,
        paymentStatus: 'pendente',
        pickupStatus: 'aguardando',
        createdAt: new Date().toISOString(),
      };

      if (appState.firebaseMode) {
        await window.firebase.firestore().collection('participations').add(participation);
        await loadFirebaseData(appState.user.uid);
      } else {
        appState.participations.unshift({ id: crypto.randomUUID(), ...participation });
        saveLocalData();
      }
      render();
    });
  });
}

function renderParticipations() {
  const container = document.getElementById('participationsList');
  if (!container) return;

  if (appState.participations.length === 0) {
    container.innerHTML = '<p>Você ainda não participou de nenhum pedido.</p>';
    return;
  }

  container.innerHTML = appState.participations.map((participation) => {
    const order = appState.orders.find((item) => item.id === participation.orderId);
    return `
      <article class="order-item">
        <div>
          <strong>${order ? order.type : 'Pedido removido'}</strong>
          <p>${participation.quantityKg} kg • R$ ${Number(participation.valueTotal || 0).toFixed(2)}</p>
          <p>Pagamento: ${participation.paymentStatus}</p>
          <p>Retirada: ${participation.pickupStatus}</p>
          <p class="hint">PIX mock: 000201... </p>
        </div>
        <div class="actions">
          <button class="secondary" data-participation-id="${participation.id}">Confirmar retirada</button>
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('[data-participation-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.getAttribute('data-participation-id');
      if (appState.firebaseMode) {
        await window.firebase.firestore().collection('participations').doc(id).update({ pickupStatus: 'recebido' });
        await loadFirebaseData(appState.user.uid);
      } else {
        appState.participations = appState.participations.map((item) => item.id === id ? { ...item, pickupStatus: 'recebido' } : item);
        saveLocalData();
      }
      render();
    });
  });
}

function renderReviews() {
  const container = document.getElementById('reviewList');
  if (!container) return;

  if (appState.reviews.length === 0) {
    container.innerHTML = '<p class="hint">Ainda não há avaliações registradas.</p>';
    return;
  }

  container.innerHTML = appState.reviews.map((review) => `
    <article class="review-card">
      <strong>${review.coffee}</strong>
      <p>${review.note}</p>
      <p class="hint">Nota: ${review.rating}/5</p>
    </article>
  `).join('');
}

function bindReviewForm() {
  const form = document.getElementById('reviewForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const coffee = document.getElementById('reviewCoffee').value;
    const rating = document.getElementById('reviewRating').value;
    const note = document.getElementById('reviewNote').value.trim();

    if (!coffee || !rating) return;

    appState.reviews.unshift({
      id: crypto.randomUUID(),
      coffee,
      rating,
      note: note || 'Experiência registrada com sucesso.',
    });

    form.reset();
    renderReviews();
  });
}

function loadOrdersFromStorage() {
  const data = localStorage.getItem('cafe-orders');
  return data ? JSON.parse(data) : [];
}

function loadParticipationsFromStorage() {
  const data = localStorage.getItem('cafe-participations');
  return data ? JSON.parse(data) : [];
}

async function handleFirebaseAuth(name, email, password) {
  const auth = window.firebase.auth();
  const db = window.firebase.firestore();

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    if (name && userCredential.user.displayName !== name) {
      await userCredential.user.updateProfile({ displayName: name });
    }
    const role = window.adminEmail && email.toLowerCase() === window.adminEmail.toLowerCase() ? 'admin' : 'user';
    const profile = { name: name || email.split('@')[0], role, createdAt: new Date().toISOString() };
    await db.collection('users').doc(userCredential.user.uid).set(profile);
    appState.user = userCredential.user;
    appState.profile = profile;
    await loadFirebaseData(userCredential.user.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      appState.user = userCredential.user;
      const profileDoc = await db.collection('users').doc(userCredential.user.uid).get();
      const profile = profileDoc.exists ? profileDoc.data() : { name: name || userCredential.user.email?.split('@')[0] || 'Usuário', role: 'user', createdAt: new Date().toISOString() };
      appState.profile = profile;
      await loadFirebaseData(userCredential.user.uid);
    } else {
      throw error;
    }
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

  const auth = window.firebase.auth();
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
  const confirmation = await auth.signInWithPhoneNumber(phoneNumber, verifier);
  phoneConfirmationResult = confirmation;
}

async function handlePhoneCodeVerification(code) {
  if (!phoneConfirmationResult) {
    throw new Error('Envie o código de telefone antes de confirmar.');
  }

  await phoneConfirmationResult.confirm(code);
}

window.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();
});
