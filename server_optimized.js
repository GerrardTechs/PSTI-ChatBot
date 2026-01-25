const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const stopwords = require('./stopwords');

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Knowledge Composer Chatbot Starting...');

// ================= LOAD KNOWLEDGE =================
const knowledge = JSON.parse(
  fs.readFileSync('./knowledge/knowledge.json')
);

const reka24 = knowledge.mahasiswa_reka["2024"];
const reka25 = knowledge.mahasiswa_reka["2025"];
const projects = knowledge.projects;

const allStudents = [...reka24, ...reka25];

// ================= SESSION MEMORY =================
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

// ================= MEANINGFUL CHECK =================
function isMeaningfulInput(words) {
  const msg = words.join(' ');

  const knowledgeKeywords = [
    'iot','project','projek','reka','mahasiswa',
    'psti','lab','skill','siapa','apa'
  ];

  // Kalau ada kata penting → pasti bermakna
  if (knowledgeKeywords.some(k => msg.includes(k))) {
    return true;
  }

  // Kalau tidak ada huruf jelas / cuma random
  if (words.length < 2) return false;

  return true;
}

// ================= MODEL =================
function textToBoW(text) {
  const vector = new Array(vocabSize).fill(0);
  preprocess(text).forEach(w => {
    if (wordIndex[w] !== undefined) {
      vector[wordIndex[w]] += 1;
    }
  });
  return tf.tensor2d([vector]);
}

async function loadModel() {
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
  model = await loadModel();

  const tokenizer = JSON.parse(fs.readFileSync('./tokenizer.json'));
  wordIndex = tokenizer.word_index;
  vocabSize = tokenizer.vocab_size;

  intentMap = JSON.parse(
    fs.readFileSync('./model/metadata.json')
  ).intentMap;

  intents = JSON.parse(fs.readFileSync('./intents.json'));

  console.log('✅ Assets Loaded');
}

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

// ================= PRONOUN RESOLVER =================
function resolvePronoun(message, session) {
  const pronouns = ['dia', 'nya', 'yang tadi', 'itu', 'mereka'];
  if (pronouns.some(p => message.includes(p)) && session.lastEntity) {
    return session.lastEntity;
  }
  return null;
}

// ================= KNOWLEDGE COMPOSERS =================
function composeIoTStory(session) {
  const iotPeople = allStudents.filter(m =>
    m.skills?.some(s => s.toLowerCase().includes('iot'))
  );

  const relatedProjects = projects
    .filter(p => p.kategori.toLowerCase().includes('iot'))
    .map(p => p.nama);

  let text = "Di mahasiswa Reka Inovasi, ada beberapa yang fokus di IoT 👇\n\n";

  iotPeople.forEach(p => {
    text += `• ${p.nama} — ${p.role || 'Aktif di proyek IoT'}\n`;
  });

  text += `\nMereka terlibat di proyek seperti: ${relatedProjects.join(', ')}.\n`;
  text += "\nMau tahu detail proyek atau orangnya? Tinggal tanya aja ya 😊";

  session.context = 'iot_story';
  return text;
}

function composeProjectStory(session) {
  let text = "Berikut beberapa project unggulan Lab PSTI 🚀\n\n";

  projects.forEach(p => {
    text += `• ${p.nama} (${p.kategori}) — ${p.deskripsi}\n`;
  });

  text += "\nProject ini dikerjakan oleh mahasiswa Reka Inovasi dari berbagai angkatan.";
  session.context = 'project_story';

  return text;
}

function composeMahasiswaStory(angkatan, session) {
  const data = angkatan === '24' ? reka24 : reka25;

  let text = `Mahasiswa Reka Inovasi angkatan ${angkatan} 👇\n\n`;
  data.forEach(m => {
    text += `• ${m.nama} — ${m.role || 'Aktif di Lab PSTI'}\n`;
  });

  text += "\nMau tahu skill atau project mereka? Tinggal tanya ya 😊";
  session.context = 'mahasiswa_story';

  return text;
}

// ================= KNOWLEDGE ENGINE =================
function knowledgeEngine(message, session) {
  const msg = message.toLowerCase();

  const entity = resolvePronoun(msg, session);
  if (entity) {
    return `${entity.nama} adalah ${entity.role}. Skill: ${entity.skills.join(', ')}`;
  }

  if (msg.includes('iot')) {
    return composeIoTStory(session);
  }

  if (msg.includes('project') || msg.includes('projek')) {
    return composeProjectStory(session);
  }

  if (msg.includes('reka') && msg.includes('24')) {
    return composeMahasiswaStory('24', session);
  }

  if (msg.includes('reka') && msg.includes('25')) {
    return composeMahasiswaStory('25', session);
  }

  return null;
}

// ================= INTENT RESPONSE =================
function getResponse(tag) {
  const intent = intents.intents.find(i => i.tag === tag);
  if (!intent) return 'Maaf, saya tidak mengerti.';
  return intent.responses[0].split('|')[0];
}

// ================= API =================
app.post('/chat', (req, res) => {
  const { userId, message } = req.body;

  if (!sessions[userId]) {
    sessions[userId] = { context: null, lastEntity: null };
  }

  const session = sessions[userId];

  const words = preprocess(message);

  // 🚫 Garbage filter dulu
  if (!isMeaningfulInput(words)) {
    return res.json({
      response: "Maaf, saya tidak memahami apa yang kamu maksud. Bisa diulang?"
    });
  }

  // 🧠 Knowledge Composer dulu
  const knowledgeReply = knowledgeEngine(message, session);
  if (knowledgeReply) {
    return res.json({
      from: 'knowledge',
      response: knowledgeReply
    });
  }

  // 🤖 Fallback ke model
  const { tag, confidence } = predictIntent(message);

  if (confidence < 0.4) {
    return res.json({
      response: "Maaf, saya kurang memahami. Bisa diperjelas?"
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
