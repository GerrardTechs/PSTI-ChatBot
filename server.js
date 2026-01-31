const express = require('express');
const cors = require('cors');

const { predictIntent, loadModel } = require('./src/engine/intentEngine');
const { createKnowledgeEngine } = require('./src/engine/knowledgeEngine');
const { getSession } = require('./src/engine/memory');

const intents = require('./src/data/intents.json').intents;
const knowledgeData = require('./src/data/knowledge.json');

const app = express();
app.use(cors());
app.use(express.json());

const knowledgeEngine = createKnowledgeEngine(knowledgeData);

function getIntentByTag(tag) {
  return intents.find(i => i.tag === tag);
}

function preprocessMessage(message) {
  return message.toLowerCase().replace(/[?!.]/g, '').trim();
}

// ===== ROOT CHECK =====
app.get('/', (req, res) => {
  res.send(`
    <h2>🚀 PSTI Chatbot Server Running</h2>
    <p>Gunakan endpoint <b>POST /chat</b> untuk mengirim pesan.</p>
    <p>Gunakan <b>GET /health</b> untuk cek status model.</p>
  `);
});

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    model: 'loaded',
    time: new Date()
  });
});


app.post('/chat', (req, res) => {
  try {
    const { userId = 'web-user', message } = req.body;
    const session = getSession(userId);
    const msg = preprocessMessage(message);

    // ===== 1️⃣ KNOWLEDGE =====
    const ruleAnswer = knowledgeEngine.run(msg);
    if (ruleAnswer) {
      return res.json({ from: 'knowledge', response: ruleAnswer });
    }

    // ===== 2️⃣ ML =====
    const { tag, confidence } = predictIntent(msg);
    const intentObj = getIntentByTag(tag);

    if (!intentObj) {
      return res.json({
        from: 'ml',
        response: 'Maaf, saya kurang memahami. Bisa diperjelas?'
      });
    }

    // ===== 3️⃣ MEMORY BERDASARKAN CONFIDENCE =====
    if (confidence < 0.55 && session.lastIntent) {
      const lastIntentObj = getIntentByTag(session.lastIntent);

      if (lastIntentObj && lastIntentObj.responses.length > 1) {
        session.lastResponseIndex =
          (session.lastResponseIndex + 1) % lastIntentObj.responses.length;

        return res.json({
          from: 'memory',
          intent: session.lastIntent,
          response: lastIntentObj.responses[session.lastResponseIndex]
        });
      }
    }

    // ===== 4️⃣ NORMAL RESPONSE =====
    session.lastIntent = tag;
    session.lastResponseIndex = 0;

    return res.json({
      from: 'ml',
      intent: tag,
      confidence,
      response: intentObj.responses[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

loadModel().then(() => {
  app.listen(3000, () =>
    console.log('🚀 Server running at http://localhost:3000')
  );
});
