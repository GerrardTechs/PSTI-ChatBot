const express = require('express');
const cors = require('cors');

const { predictIntent, loadModel } = require('./src/engine/intentEngine');
const { createKnowledgeEngine } = require('./src/engine/knowledgeEngine');
const {
  getSession,
  addToHistory
} = require('./src/engine/memory');

const intents = require('./src/data/intents.json').intents;
const knowledgeData = require('./src/data/knowledge.json');

const app = express();

// ===== CORS CONFIGURATION =====
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());

// ===== REQUEST LOGGING =====
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

const knowledgeEngine = createKnowledgeEngine(knowledgeData);

function getIntentByTag(tag) {
  return intents.find(i => i.tag === tag);
}

function preprocessMessage(message) {
  return message.toLowerCase().replace(/[?!.]/g, '').trim();
}

// ===== ROOT CHECK =====
app.get('/', (req, res) => {
  res.json({
    name: 'PSTI Chatbot API - Context Aware',
    version: '3.2.0',
    status: 'running',
    message: 'Backend is running successfully! ✅'
  });
});

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    model: 'loaded',
    time: new Date(),
    uptime: process.uptime()
  });
});

// ===== MAIN CHAT ENDPOINT =====
app.post('/chat', (req, res) => {
  try {
    const { userId = 'web-user', message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required',
        response: 'Pesan tidak boleh kosong'
      });
    }

    const session = getSession(userId);
    const msg = preprocessMessage(message);

    addToHistory(userId, 'user', message);

    const context = session.context || {};

    // 1️⃣ KNOWLEDGE
    const ruleAnswer = knowledgeEngine.run(msg, context);
    if (ruleAnswer) {
      addToHistory(userId, 'bot', ruleAnswer);
      return res.json({
        from: 'knowledge',
        response: ruleAnswer,
        timestamp: new Date().toISOString()
      });
    }

    // 2️⃣ ML
    const { tag, confidence } = predictIntent(msg);
    const intentObj = getIntentByTag(tag);

    if (!intentObj) {
      const fallback = 'Maaf, saya kurang memahami. Bisa diperjelas?';
      addToHistory(userId, 'bot', fallback);
      return res.json({
        from: 'ml',
        response: fallback,
        timestamp: new Date().toISOString()
      });
    }

    // 3️⃣ MEMORY
    if (confidence < 0.55 && session.lastIntent) {
      const lastIntentObj = getIntentByTag(session.lastIntent);
      if (lastIntentObj && lastIntentObj.responses.length > 1) {
        session.lastResponseIndex =
          (session.lastResponseIndex + 1) % lastIntentObj.responses.length;

        const memoryResponse = lastIntentObj.responses[session.lastResponseIndex];
        addToHistory(userId, 'bot', memoryResponse);

        return res.json({
          from: 'memory',
          intent: session.lastIntent,
          response: memoryResponse,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 4️⃣ NORMAL ML
    session.lastIntent = tag;
    session.lastResponseIndex = 0;

    const mlResponse = intentObj.responses[0];
    addToHistory(userId, 'bot', mlResponse);

    return res.json({
      from: 'ml',
      intent: tag,
      confidence,
      response: mlResponse,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({
      error: 'Server error',
      response: 'Maaf, terjadi kesalahan pada server.'
    });
  }
});

// ===== ALIAS =====
app.post('/api/chat', (req, res) => {
  req.url = '/chat';
  app._router.handle(req, res);
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan`
  });
});

// ===== LOAD MODEL SEKALI SAJA (PENTING UNTUK VERCEL) =====
let modelLoaded = false;

async function init() {
  if (!modelLoaded) {
    await loadModel();
    console.log('✅ Model loaded for Vercel');
    modelLoaded = true;
  }
}

init();

// ===== EXPORT UNTUK VERCEL =====
module.exports = app;
