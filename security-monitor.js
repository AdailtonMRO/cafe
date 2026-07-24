/**
 * security-monitor.js
 * Módulo de verificação contínua de vulnerabilidades — Coffee Experience App
 *
 * Executa checagens de segurança em segundo plano e expõe os resultados
 * via `window.securityMonitor` para exibição no painel administrativo.
 */

const SecurityMonitor = (() => {
  // -------------------------------------------------------------------------
  // Estado interno
  // -------------------------------------------------------------------------
  const state = {
    checks: [],          // Array de { id, label, status, detail, severity }
    loginEvents: [],     // Log de tentativas de login (para detecção de anomalias)
    lastRunAt: null,
    listeners: [],       // Callbacks registrados para receber atualizações
  };

  // Severidades possíveis: 'ok' | 'warning' | 'critical'
  const STATUS = { OK: 'ok', WARN: 'warning', CRITICAL: 'critical' };

  // -------------------------------------------------------------------------
  // Utilitários
  // -------------------------------------------------------------------------
  function notify() {
    state.listeners.forEach(fn => fn([...state.checks]));
  }

  function setCheck(id, label, status, detail, severity = STATUS.OK) {
    const existing = state.checks.findIndex(c => c.id === id);
    const check = { id, label, status, detail, severity, updatedAt: new Date().toISOString() };
    if (existing >= 0) {
      state.checks[existing] = check;
    } else {
      state.checks.push(check);
    }
    notify();
  }

  // -------------------------------------------------------------------------
  // VERIFICAÇÃO 1 — Service Worker ativo (proteção de cache offline)
  // -------------------------------------------------------------------------
  async function checkServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      setCheck('sw', 'Service Worker', STATUS.WARN,
        'Navegador não suporta Service Workers — PWA sem proteção de cache.', STATUS.WARN);
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration('./sw.js');
    if (reg && reg.active) {
      setCheck('sw', 'Service Worker', STATUS.OK,
        `Ativo e registrado em: ${reg.scope}`);
    } else {
      setCheck('sw', 'Service Worker', STATUS.WARN,
        'Service Worker não encontrado ou inativo.', STATUS.WARN);
    }
  }

  // -------------------------------------------------------------------------
  // VERIFICAÇÃO 2 — HTTPS obrigatório
  // -------------------------------------------------------------------------
  function checkHttps() {
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (isSecure) {
      setCheck('https', 'HTTPS / Conexão Segura', STATUS.OK,
        `Protocolo seguro ativo: ${location.protocol}`);
    } else {
      setCheck('https', 'HTTPS / Conexão Segura', STATUS.CRITICAL,
        `ATENÇÃO: App servido via HTTP inseguro (${location.href}). Dados em risco!`, STATUS.CRITICAL);
    }
  }

  // -------------------------------------------------------------------------
  // VERIFICAÇÃO 3 — Firebase Authentication ativo
  // -------------------------------------------------------------------------
  function checkFirebaseAuth() {
    const hasFirebase = !!(window.firebase && window.firebase.auth);
    if (hasFirebase) {
      setCheck('fb_auth', 'Firebase Authentication', STATUS.OK,
        'SDK Firebase Auth carregado e disponível.');
    } else {
      setCheck('fb_auth', 'Firebase Authentication', STATUS.CRITICAL,
        'Firebase Auth não encontrado — autenticação desativada!', STATUS.CRITICAL);
    }
  }

  // -------------------------------------------------------------------------
  // VERIFICAÇÃO 4 — Sessão de usuário e validade do token
  // -------------------------------------------------------------------------
  async function checkUserSession() {
    if (!window.firebase || !window.firebase.auth) {
      setCheck('session', 'Sessão do Usuário', STATUS.WARN,
        'Firebase Auth não disponível para verificar sessão.', STATUS.WARN);
      return;
    }
    const user = window.firebase.auth().currentUser;
    if (!user) {
      setCheck('session', 'Sessão do Usuário', STATUS.OK,
        'Nenhum usuário autenticado no momento (estado esperado na tela de login).');
      return;
    }
    try {
      const tokenResult = await user.getIdTokenResult(false);
      const expiresAt = new Date(tokenResult.expirationTime);
      const minutesLeft = Math.round((expiresAt - Date.now()) / 60_000);
      setCheck('session', 'Sessão do Usuário', STATUS.OK,
        `Token válido para: ${user.email} — expira em ~${minutesLeft} min (${expiresAt.toLocaleTimeString('pt-BR')})`);
    } catch (e) {
      setCheck('session', 'Sessão do Usuário', STATUS.WARN,
        `Não foi possível verificar o token: ${e.message}`, STATUS.WARN);
    }
  }

  // -------------------------------------------------------------------------
  // VERIFICAÇÃO 5 — Variáveis de ambiente / config expostas
  // -------------------------------------------------------------------------
  function checkConfigExposure() {
    const config = window.firebaseConfig;
    if (!config) {
      setCheck('config', 'Configuração Firebase', STATUS.WARN,
        'firebaseConfig não encontrado em window.', STATUS.WARN);
      return;
    }
    // Para apps web Firebase, expor a apiKey é esperado e aceitável,
    // pois a segurança real é feita pelas Firestore Rules.
    // Verificamos apenas se a chave não está vazia ou placeholder.
    const isPlaceholder = (v) => !v || v.includes('YOUR_') || v.includes('PLACEHOLDER');
    if (isPlaceholder(config.apiKey) || isPlaceholder(config.projectId)) {
      setCheck('config', 'Configuração Firebase', STATUS.CRITICAL,
        'Configuração Firebase contém valores placeholder — app não funcionará.', STATUS.CRITICAL);
    } else {
      setCheck('config', 'Configuração Firebase', STATUS.OK,
        `Configuração válida para projeto: ${config.projectId}`);
    }
  }

  // -------------------------------------------------------------------------
  // VERIFICAÇÃO 6 — Anomalias de login (baseado no loginRateLimit)
  // -------------------------------------------------------------------------
  function checkLoginAnomalies() {
    // Acessa o objeto loginRateLimit do app.js (compartilhado via escopo de módulo)
    // Se não estiver acessível, pula essa verificação
    if (typeof loginRateLimit === 'undefined') {
      setCheck('login_anomaly', 'Anomalias de Login', STATUS.OK,
        'Monitor de tentativas de login não disponível neste contexto.');
      return;
    }
    if (loginRateLimit.isLocked()) {
      setCheck('login_anomaly', 'Anomalias de Login', STATUS.WARN,
        `Login bloqueado por segurança — ${loginRateLimit.attempts} tentativa(s) falha(s). Bloqueio expira em ${loginRateLimit.getRemainingSeconds()}s.`,
        STATUS.WARN);
    } else if (loginRateLimit.attempts >= 3) {
      setCheck('login_anomaly', 'Anomalias de Login', STATUS.WARN,
        `${loginRateLimit.attempts} tentativa(s) de login falha(s) detectada(s) nesta sessão.`, STATUS.WARN);
    } else {
      setCheck('login_anomaly', 'Anomalias de Login', STATUS.OK,
        `${loginRateLimit.attempts} tentativa(s) falha(s) — dentro do limite seguro (máx: ${loginRateLimit.maxAttempts}).`);
    }
  }

  // -------------------------------------------------------------------------
  // VERIFICAÇÃO 7 — Content Security Policy básica
  // -------------------------------------------------------------------------
  function checkCSP() {
    // Verifica se há meta tag CSP no documento
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      setCheck('csp', 'Content Security Policy', STATUS.OK,
        'CSP configurada via meta tag HTML.');
    } else {
      setCheck('csp', 'Content Security Policy', STATUS.WARN,
        'Nenhuma CSP via meta tag encontrada. Recomenda-se configurar via firebase.json headers (já aplicado) ou meta tag.', STATUS.WARN);
    }
  }

  // -------------------------------------------------------------------------
  // Executor principal — roda todas as verificações
  // -------------------------------------------------------------------------
  async function runAllChecks() {
    state.lastRunAt = new Date().toISOString();
    console.info('[SecurityMonitor] Iniciando verificação de segurança...');

    checkHttps();
    checkFirebaseAuth();
    checkConfigExposure();
    checkCSP();
    checkLoginAnomalies();

    // Assíncronas em paralelo
    await Promise.allSettled([
      checkServiceWorker(),
      checkUserSession(),
    ]);

    const criticals = state.checks.filter(c => c.severity === STATUS.CRITICAL).length;
    const warnings = state.checks.filter(c => c.severity === STATUS.WARN).length;
    console.info(
      `[SecurityMonitor] Verificação completa: ${state.checks.length} checks — ` +
      `${criticals} crítico(s), ${warnings} aviso(s).`
    );

    notify();
    return getSummary();
  }

  // -------------------------------------------------------------------------
  // API pública
  // -------------------------------------------------------------------------
  function getSummary() {
    const criticals = state.checks.filter(c => c.severity === STATUS.CRITICAL);
    const warnings = state.checks.filter(c => c.severity === STATUS.WARN);
    const oks = state.checks.filter(c => c.severity === STATUS.OK);
    return {
      score: Math.max(0, 100 - (criticals.length * 30) - (warnings.length * 10)),
      totalChecks: state.checks.length,
      criticals: criticals.length,
      warnings: warnings.length,
      oks: oks.length,
      lastRunAt: state.lastRunAt,
      checks: [...state.checks],
    };
  }

  function onUpdate(callback) {
    state.listeners.push(callback);
    // Dispara imediatamente com estado atual se já tiver checks
    if (state.checks.length > 0) callback([...state.checks]);
    return () => {
      state.listeners = state.listeners.filter(fn => fn !== callback);
    };
  }

  // -------------------------------------------------------------------------
  // Auto-execução: roda ao carregar e a cada 5 minutos
  // -------------------------------------------------------------------------
  let intervalId = null;

  function start(intervalMinutes = 5) {
    // Primeira execução após 2 segundos (aguarda Firebase inicializar)
    setTimeout(runAllChecks, 2000);
    // Subsequentes a cada N minutos
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(runAllChecks, intervalMinutes * 60_000);
    console.info(`[SecurityMonitor] Monitoramento ativo — verificações a cada ${intervalMinutes} min.`);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { start, stop, runAllChecks, getSummary, onUpdate, STATUS };
})();

// Exportar para uso global (app.js acessa via window.securityMonitor)
window.securityMonitor = SecurityMonitor;

// Iniciar monitoramento automaticamente
SecurityMonitor.start(5);
