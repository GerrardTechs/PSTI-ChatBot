const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- Short-Term Memory (per session) ----
const sessionMemory = {};

function addToSTM(sessionId, role, message) {
  if (!sessionMemory[sessionId]) sessionMemory[sessionId] = [];
  sessionMemory[sessionId].push({ role, message });

  if (sessionMemory[sessionId].length > 6) sessionMemory[sessionId].shift();
}

function getSTM(sessionId) {
  return sessionMemory[sessionId] || [];
}

// ---- Long-Term Memory (persistent JSON) ----
const memoryFile = path.join(__dirname, 'long_term_memory.json');
let LTM = {};
if (fs.existsSync(memoryFile)) {
  LTM = JSON.parse(fs.readFileSync(memoryFile));
}

function saveLTM() {
  fs.writeFileSync(memoryFile, JSON.stringify(LTM, null, 2));
}

// ---- Memory Tagging Otomatis ----
function tagMemory(userId, message, intent, confidence) {
  if (!LTM[userId]) LTM[userId] = { facts: [], history: [] };

  if (confidence >= 0.8) {
    const keywords = ['lab', 'booking', 'kelas', 'jadwal', 'PSTI', 'beasiswa', 'skill'];
    for (const kw of keywords) {
      if (message.toLowerCase().includes(kw) && !LTM[userId].facts.includes(kw)) {
        LTM[userId].facts.push(kw);
      }
    }
    LTM[userId].history.push({ message, intent, timestamp: new Date() });
    saveLTM();
  }
}

// ---- Semantic Memory Search (OpenAI embeddings) ----
async function embedText(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

async function semanticSearch(query, topN = 3) {
  if (!LTM) return [];
  const queryEmbedding = await embedText(query);
  
  const results = [];
  for (const [userId, data] of Object.entries(LTM)) {
    for (const entry of data.history) {
      if (!entry.embedding) continue;
      // cosine similarity
      const sim = cosineSimilarity(queryEmbedding, entry.embedding);
      results.push({ userId, message: entry.message, intent: entry.intent, similarity: sim });
    }
  }
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topN);
}

// ---- Cosine similarity helper ----
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { addToSTM, getSTM, LTM, tagMemory, embedText, semanticSearch, saveLTM };
