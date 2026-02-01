const express = require('express');
const cors = require('cors');

const { predictIntent, loadModel } = require('./src/engine/intentEngine');
const { createKnowledgeEngine } = require('./src/engine/knowledgeEngine');
const { 
  getSession, 
  setContext, 
  getContext, 
  addToHistory 
} = require('./src/engine/memory');

const intents = require('./src/data/intents.json').intents;
const knowledgeData = require('./src/data/knowledge.json');

const app = express();

// ===== CORS CONFIGURATION =====
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
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
    features: ['Knowledge Engine', 'ML Classification', 'Context Awareness'],
    endpoints: {
      chat: 'POST /chat',
      health: 'GET /health',
      apiChat: 'POST /api/chat (alias)'
    },
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
    
    // Validasi input
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        error: 'Message is required',
        response: 'Pesan tidak boleh kosong' 
      });
    }
    
    const session = getSession(userId);
    const msg = preprocessMessage(message);

    console.log('📩 Received:', message);

    // Add user message to history
    addToHistory(userId, 'user', message);

    // Get context from session
    const context = session.context || {};

    // ===== 1️⃣ KNOWLEDGE-BASED RESPONSE (with context) =====
    const ruleAnswer = knowledgeEngine.run(msg, context);
    if (ruleAnswer) {
      console.log('📤 Response from: KNOWLEDGE');
      
      // Add bot response to history
      addToHistory(userId, 'bot', ruleAnswer);
      
      return res.json({ 
        from: 'knowledge', 
        response: ruleAnswer,
        timestamp: new Date().toISOString()
      });
    }

    // ===== 2️⃣ ML-BASED RESPONSE =====
    const { tag, confidence } = predictIntent(msg);
    const intentObj = getIntentByTag(tag);

    if (!intentObj) {
      console.log('📤 Response from: FALLBACK');
      
      const fallbackResponse = 'Maaf, saya kurang memahami. Bisa diperjelas?';
      addToHistory(userId, 'bot', fallbackResponse);
      
      return res.json({
        from: 'ml',
        response: fallbackResponse,
        timestamp: new Date().toISOString()
      });
    }

    // ===== 3️⃣ MEMORY-BASED RESPONSE (Low Confidence) =====
    if (confidence < 0.55 && session.lastIntent) {
      const lastIntentObj = getIntentByTag(session.lastIntent);

      if (lastIntentObj && lastIntentObj.responses.length > 1) {
        session.lastResponseIndex =
          (session.lastResponseIndex + 1) % lastIntentObj.responses.length;

        console.log('📤 Response from: MEMORY');
        
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

    // ===== 4️⃣ NORMAL ML RESPONSE =====
    session.lastIntent = tag;
    session.lastResponseIndex = 0;

    console.log('📤 Response from: ML (Intent:', tag, '| Confidence:', confidence.toFixed(2), ')');
    
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
      response: 'Maaf, terjadi kesalahan pada server. Silakan coba lagi.',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ALIAS ENDPOINT =====
app.post('/api/chat', (req, res) => {
  req.url = '/chat';
  app._router.handle(req, res);
});

// ===== CLEAR CONTEXT ENDPOINT (optional) =====
app.post('/clear-context', (req, res) => {
  const { userId = 'web-user' } = req.body;
  const session = getSession(userId);
  session.context = {};
  session.conversationHistory = [];
  
  res.json({
    success: true,
    message: 'Context cleared'
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan`,
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /health',
      chat: 'POST /chat',
      apiChat: 'POST /api/chat',
      clearContext: 'POST /clear-context'
    }
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

loadModel().then(() => {
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 PSTI ChatBot Backend Server - Context Aware');
    console.log('='.repeat(60));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
    console.log(`💬 API Chat (alias): http://localhost:${PORT}/api/chat`);
    console.log(`🧹 Clear context: http://localhost:${PORT}/clear-context`);
    console.log(`🌐 Frontend URL: http://localhost:3001`);
    console.log(`🤖 Model: Loaded successfully`);
    console.log(`✨ Features: Knowledge Engine + ML + Context Awareness`);
    console.log('='.repeat(60) + '\n');
    console.log('✅ Server is ready to accept requests!');
    console.log('📝 Logs akan muncul di bawah ini...\n');
  });
}).catch(err => {
  console.error('❌ Failed to load model:', err);
  process.exit(1);
});

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server gracefully...');
  process.exit(0);
});