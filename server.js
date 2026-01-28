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

// ===== INIT ENGINES =====
const knowledgeEngine = createKnowledgeEngine(knowledgeData);

console.log('🚀 PSTI ML Chatbot Starting...');

// ===== HELPERS =====
function getResponse(tag) {
  const intent = intents.find(i => i.tag === tag);
  return intent ? intent.responses[0] : null;
}

function preprocessMessage(message) {
  return message.toLowerCase().replace(/[?!.]/g, '').trim();
}

// ===== ROUTES =====

// ✅ Simple GET / to check server
app.get('/', (req, res) => {
  res.send('<h2>🚀 PSTI Chatbot Server Running</h2><p>Gunakan POST /chat untuk ngobrol dengan chatbot.</p>');
});

// ===== POST /chat =====
app.post('/chat', (req, res) => {
  const { userId, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const session = getSession(userId);
  const msg = preprocessMessage(message);

  // 1️⃣ Rule-based knowledge engine
  const ruleAnswer = knowledgeEngine.run(msg);
  if (ruleAnswer) return res.json({ from: 'knowledge', response: ruleAnswer });

  // 2️⃣ ML fallback
  const { tag, confidence } = predictIntent(msg);
  const response = getResponse(tag);

  // 3️⃣ Low confidence → soft conversational fallback
  if (!response) {
    return res.json({ from: 'ml', response: 'Maaf, saya kurang memahami. Bisa diperjelas?' });
  }

  if (confidence < 0.6) {
    // Conversational fallback untuk beberapa intent
    const conversationalFallbackTags = ['info_beasiswa', 'about_Skill', 'about_Reka&PSTI'];
    if (conversationalFallbackTags.includes(tag)) {
      return res.json({
        from: 'ml',
        intent: tag,
        confidence,
        response: `Iya? Mau tanya lebih spesifik soal ${tag.replace(/_/g,' ')}? 😊`
      });
    }
    return res.json({
      from: 'ml',
      intent: tag,
      confidence,
      response: `Saya kurang yakin, tapi kemungkinan jawaban ini: ${response}`
    });
  }

  // 4️⃣ ML confident
  session.lastIntent = tag;
  res.json({
    from: 'ml',
    intent: tag,
    confidence,
    response
  });
});

// ===== START SERVER =====
loadModel().then(() => {
  app.listen(3000, () =>
    console.log('🚀 Server running at http://localhost:3000')
  );
});
