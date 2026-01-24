const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const stopwords = require('./stopwords');

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Initializing chatbot server...');

// ================= LOAD KNOWLEDGE =================
const knowledge = JSON.parse(
  fs.readFileSync('./knowledge/knowledge.json')
);

const reka24 = knowledge.mahasiswa_reka["2024"];
const reka25 = knowledge.mahasiswa_reka["2025"];
const projects = knowledge.projects;

const sessions = {};

let model, wordIndex, intentMap, intents, vocabSize;

// ================= PREPROCESS =================
function preprocess(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w && !stopwords.includes(w));
}

// ================= VALIDATOR (GERBANG UTAMA) =================
function isMeaningfulInput(words) {
  if (words.length === 0) return false;

  const known = words.filter(w => wordIndex[w] !== undefined);
  const noiseRatio = 1 - (known.length / words.length);

  // Jika lebih dari 60% kata adalah noise → tolak
  if (noiseRatio > 0.6) return false;

  return known.length >= 1;
}


// ================= TEXT → BoW =================
function textToBoW(text) {
  const vector = new Array(vocabSize).fill(0);
  const words = preprocess(text);

  words.forEach(w => {
    if (wordIndex[w] !== undefined) {
      vector[wordIndex[w]] += 1;
    }
  });

  return tf.tensor2d([vector]);
}

// ================= LOAD MODEL =================
async function loadModelManual() {
  const topology = JSON.parse(fs.readFileSync('./model/model.json'));
  const weightSpecs = JSON.parse(fs.readFileSync('./model/weightsSpecs.json'));
  const weightData = fs.readFileSync('./model/weights.bin');

  const handler = tf.io.fromMemory({
    modelTopology: topology,
    weightSpecs,
    weightData: weightData.buffer
  });

  return await tf.loadLayersModel(handler);
}

async function loadAssets() {
  model = await loadModelManual();

  const tokenizer = JSON.parse(fs.readFileSync('./tokenizer.json'));
  wordIndex = tokenizer.word_index;
  vocabSize = tokenizer.vocab_size;

  intentMap = JSON.parse(
    fs.readFileSync('./model/metadata.json')
  ).intentMap;

  intents = JSON.parse(fs.readFileSync('./intents.json'));

  console.log('✅ Assets loaded');
}

// ================= PREDICT =================
function predictIntent(text) {
  const input = textToBoW(text);
  const prediction = model.predict(input);
  const scores = prediction.dataSync();

  input.dispose();
  prediction.dispose();

  const maxIdx = scores.indexOf(Math.max(...scores));
  const confidence = scores[maxIdx];

  const tag = Object.keys(intentMap).find(
    key => intentMap[key] === maxIdx
  );

  return { tag, confidence };
}

function getResponse(tag) {
  const intent = intents.intents.find(i => i.tag === tag);
  if (!intent) return 'Maaf, saya tidak mengerti.';
  return intent.responses[0].split('|')[0];
}

// ================= PRONOUN RESOLVER =================
function resolvePronoun(words, session) {
  const pronouns = ['dia', 'nya', 'itu', 'tadi', 'mereka'];

  if (words.some(w => pronouns.includes(w)) && session.lastEntity) {
    return session.lastEntity;
  }

  return null;
}

// ================= KNOWLEDGE ENGINE (WORD BASED) =================
function handleKnowledge(words, session) {
  const entity = resolvePronoun(words, session);

  // ===== List mahasiswa
  if (words.includes('reka') && words.includes('24')) {
    session.context = 'mahasiswa';
    session.lastEntity = null;

    return (
      "Mahasiswa Reka 24:\n" +
      reka24.map(m => "• " + m.nama).join('\n')
    );
  }

  // ===== Skill IoT
  if (words.includes('iot')) {
    session.context = 'skill';

    const result = reka24.filter(m =>
      m.skills.some(s => s.toLowerCase().includes('iot'))
    );

    if (result.length === 0) return "Belum ada yang fokus IoT.";

    session.lastEntity = result[0];

    return "Yang jago IoT: " + result.map(r => r.nama).join(', ');
  }

  // ===== Detail orang dari pronoun
  if (entity) {
    return `${entity.nama} adalah ${entity.role}. Skill: ${entity.skills.join(', ')}`;
  }

  // ===== Project
  if (words.includes('project') || words.includes('projek')) {
    session.context = 'project';
    return projects.map(p => `• ${p.nama} (${p.kategori})`).join('\n');
  }

  return null;
}

// ================= API =================
app.post('/chat', (req, res) => {
  const { userId, message } = req.body;

  if (!sessions[userId]) {
    sessions[userId] = {
      context: null,
      lastEntity: null
    };
  }

  const session = sessions[userId];

  const words = preprocess(message);

  // ✅ VALIDATOR PALING AWAL
  if (!isMeaningfulInput(words)) {
    return res.json({
      response: "Maaf, saya tidak memahami apa yang kamu maksud. Bisa diulang dengan lebih jelas?"
    });
  }

  // ✅ KNOWLEDGE SETELAH VALID
  const knowledgeReply = handleKnowledge(words, session);
  if (knowledgeReply) {
    return res.json({
      from: 'knowledge',
      response: knowledgeReply
    });
  }

  // ✅ BARU MODEL
  const { tag, confidence } = predictIntent(message);

  if (confidence < 0.4) {
    return res.json({
      response: "Maaf, saya kurang memahami."
    });
  }

  res.json({
    from: 'model',
    intent: tag,
    confidence,
    response: getResponse(tag)
  });
});

// ================= START =================
loadAssets().then(() => {
  app.listen(3000, () =>
    console.log('🚀 Server running http://localhost:3000')
  );
});
