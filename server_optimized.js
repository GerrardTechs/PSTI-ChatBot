const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

console.log('🚀 Initializing chatbot server...');

const app = express();
app.use(cors());
app.use(express.json());

let model, wordIndex, intentMap, intents, vocabSize;

// ===== PREPROCESS (HARUS SAMA DENGAN TRAIN) =====
function preprocess(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== TEXT → BoW =====
function textToBoW(text) {
  const vector = new Array(vocabSize).fill(0);
  const words = preprocess(text).split(' ');

  words.forEach(w => {
    if (wordIndex[w] !== undefined) {
      vector[wordIndex[w]] += 1;
    }
  });

  return tf.tensor2d([vector]);
}

// ===== LOAD MODEL MANUAL =====
async function loadModelManual() {
  console.log('📦 Loading model properly...');

  const topology = JSON.parse(fs.readFileSync('./model/model.json'));
  const weightSpecs = JSON.parse(fs.readFileSync('./model/weightsSpecs.json'));
  const weightData = fs.readFileSync('./model/weights.bin');

  const handler = tf.io.fromMemory({
    modelTopology: topology,
    weightSpecs,
    weightData: weightData.buffer
  });

  const loadedModel = await tf.loadLayersModel(handler);
  console.log('✅ Model loaded!');
  return loadedModel;
}


// ===== LOAD SEMUA FILE =====
async function loadAssets() {
  model = await loadModelManual();

  console.log('📦 Loading tokenizer...');
  const tokenizer = JSON.parse(fs.readFileSync('./tokenizer.json'));
  wordIndex = tokenizer.word_index;
  vocabSize = tokenizer.vocab_size;

  console.log('📦 Loading metadata...');
  intentMap = JSON.parse(fs.readFileSync('./model/metadata.json')).intentMap;

  console.log('📦 Loading intents...');
  intents = JSON.parse(fs.readFileSync('./intents.json'));

  console.log('✅ All assets loaded');
}

// ===== PREDICT =====
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

// ===== RESPONSE =====
function getResponse(tag) {
  const intent = intents.intents.find(i => i.tag === tag);
  if (!intent) return 'Maaf, saya tidak mengerti.';

  const responses = intent.responses[0].split('|');
  return responses[Math.floor(Math.random() * responses.length)];
}

// ===== API =====
app.post('/chat', (req, res) => {
  const { message } = req.body;

  const { tag, confidence } = predictIntent(message);

  if (confidence < 0.4) {
    return res.json({
      response: 'Maaf, saya kurang memahami. Bisa diperjelas?',
      confidence
    });
  }

  res.json({
    intent: tag,
    confidence,
    response: getResponse(tag)
  });
});

// ===== START =====
loadAssets().then(() => {
  app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
  });
  app.get('/', (req, res) => {
    res.send('PSTI Chatbot API is running');
  });
  
});
