/**
 * Módulo de Serviço de IA (Gemini API / Firebase AI Logic)
 * 
 * ATENÇÃO: Configurado estritamente para o plano gratuito (Free Tier) do Gemini Developer API.
 * Modelo utilizado: gemini-3.6-flash (gratuito, 1M contexto, alta precisão).
 */

const GEMINI_MODEL = 'gemini-3.6-flash';
const STORAGE_KEY = 'app_coffee_gemini_api_key';

// Recomendações locais estáticas para fallback gratuito/offline
const FALLBACK_RECOMMENDATIONS = [
  'Sugestão do Barista: Experimente um café coado na V60 com grãos de torra média-clara para ressaltar notas florais e acidez cítrica vibrante.',
  'Sugestão do Barista: Para manhãs intensas, um Espresso duplo com grãos da Alta Mogiana oferece corpo aveludado e retrogosto prolongado de chocolate amargo.',
  'Sugestão do Barista: Tarde quente? Um Cold Brew extraído por 16h traz doçura natural e baixa acidez, perfeito com rodelas de laranja.',
  'Sugestão do Barista: Na Prensa Francesa, use moagem grossa e infusão de 4 minutos para extrair um café encorpado com óleos essenciais preservados.'
];

export function getStoredApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setStoredApiKey(key) {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Chamada genérica à API do Gemini (Plano Gratuito)
 */
async function callGeminiApi({ prompt, systemInstruction = '', jsonOutput = false }) {
  const apiKey = getStoredApiKey();

  if (!apiKey) {
    throw new Error('Chave da API Gemini não configurada.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (jsonOutput) {
    payload.generationConfig = {
      responseMimeType: 'application/json'
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error?.message || `Erro HTTP ${response.status}`;
    throw new Error(`Gemini API: ${msg}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const textResponse = candidate?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('Resposta vazia da API Gemini.');
  }

  return textResponse;
}

/**
 * Gera uma dica/recomendação diária de café (com fallback offline)
 */
export async function generateDailyCoffeeTip() {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    const randomIndex = Math.floor(Math.random() * FALLBACK_RECOMMENDATIONS.length);
    return {
      text: FALLBACK_RECOMMENDATIONS[randomIndex],
      isAiGenerated: false
    };
  }

  try {
    const prompt = 'Gere uma dica curta, inspiradora e profissional de café para o dia (máximo 25 palavras), destacando método de preparo, perfil sensorial ou curiosidade.';
    const systemInstruction = 'Você é um Barista e Sommelier de café especial altamente experiente. Responda em português de forma calorosa e técnica.';
    const text = await callGeminiApi({ prompt, systemInstruction });
    return { text: text.trim(), isAiGenerated: true };
  } catch (err) {
    console.warn('Fallback para recomendação estática:', err.message);
    const randomIndex = Math.floor(Math.random() * FALLBACK_RECOMMENDATIONS.length);
    return {
      text: FALLBACK_RECOMMENDATIONS[randomIndex],
      isAiGenerated: false,
      error: err.message
    };
  }
}

/**
 * Responde dúvidas no assistente Barista AI
 */
export async function askBaristaAI(userMessage, conversationHistory = []) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    return 'Por favor, configure sua Chave Gratuita da API Gemini nas configurações do app para conversar com o Barista AI!';
  }

  const systemInstruction = `Você é o Barista AI oficial do App Coffee Experience, um assistente especialista em cafés especiais, métodos de extração (V60, Aeropress, Prensa Francesa, Espresso, Melitta, Kalita, Cold Brew), moagens, torras e harmonizações. 
Responda em Português do Brasil de forma amigável, clara e concisa (máximo 150 palavras por resposta). Use marcação markdown simples como negrito para destacar informações importantes.`;

  let fullPrompt = userMessage;
  if (conversationHistory.length > 0) {
    const historyText = conversationHistory
      .slice(-4)
      .map(msg => `${msg.sender === 'user' ? 'Usuário' : 'Barista'}: ${msg.text}`)
      .join('\n');
    fullPrompt = `Histórico de conversa recente:\n${historyText}\n\nNova Pergunta do Usuário: ${userMessage}`;
  }

  try {
    return await callGeminiApi({ prompt: fullPrompt, systemInstruction });
  } catch (err) {
    return `Ops, ocorreu um erro ao consultar o Barista AI: ${err.message}. Verifique se a sua API Key do Gemini está correta.`;
  }
}

/**
 * Gera Ficha Sensorial estruturada em JSON para cadastros de café
 */
export async function generateCuppingNotes({ name, origin, roast }) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('Chave da API Gemini necessária para gerar a Ficha Sensorial.');
  }

  const prompt = `Gere um perfil sensorial profissional para o seguinte café:
Nome/Tipo: ${name || 'Café Arábica Especial'}
Origem: ${origin || 'Sul de Minas / Brasil'}
Tipo de Torra: ${roast || 'Média'}

Retorne EXATAMENTE um JSON com as seguintes chaves:
- "aroma": frase curta descrevendo o aroma (ex: "Notas de caramelo e jasmim")
- "acidez": "Baixa", "Média-Baixa", "Média", "Média-Alta" ou "Vibrante"
- "corpo": "Leve", "Médio" ou "Encorpado/Aveludado"
- "notasDegustacao": lista com 3 a 4 notas sensoriais (ex: ["Chocolate amargo", "Nozes", "Laranja cítrica"])
- "descricaoCompleta": parágrafo conciso (2 a 3 frases) descrevendo a experiência de degustação.`;

  const systemInstruction = 'Você é um Q-Grader certificado especialista em classificação sensorial de cafés especiais. Responda estritamente em JSON.';

  const rawJson = await callGeminiApi({ prompt, systemInstruction, jsonOutput: true });
  return JSON.parse(rawJson);
}
