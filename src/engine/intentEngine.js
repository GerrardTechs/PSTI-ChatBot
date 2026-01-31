const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const { preprocess } = require('../nlp/preprocess');

let model;
let vocab = [];
let labels = [];

// ⛔ PASTIKAN PATH KE /model (bukan src/engine/model)
const MODEL_DIR = path.join(__dirname, '../../model');

async function loadModel() {
  console.log('📦 Loading ML model...');

  const modelJson = JSON.parse(
    fs.readFileSync(path.join(MODEL_DIR, 'model.json'))
  );

  const weightSpecs = JSON.parse(
    fs.readFileSync(path.join(MODEL_DIR, 'weightsSpecs.json'))
  );

  const weightData = fs.readFileSync(
    path.join(MODEL_DIR, 'weights.bin')
  );

  vocab = JSON.parse(
    fs.readFileSync(path.join(MODEL_DIR, 'vocab.json'))
  );

  labels = JSON.parse(
    fs.readFileSync(path.join(MODEL_DIR, 'labels.json'))
  );

  model = await tf.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: modelJson,
      weightSpecs,
      weightData
    })
  );

  console.log('✅ Model, vocab, labels loaded from /model');
}

function textToBow(text) {
  const words = preprocess(text).split(' ');
  const vec = new Array(vocab.length).fill(0);

  words.forEach(w => {
    const idx = vocab.indexOf(w);
    if (idx !== -1) vec[idx] += 1;
  });

  return vec;
}

function predictIntent(text) {
  const bow = textToBow(text);
  const input = tf.tensor2d([bow]);
  const prediction = model.predict(input);
  const data = prediction.dataSync();

  let maxVal = Math.max(...data);
  let maxIdx = data.indexOf(maxVal);

  return {
    tag: labels[maxIdx],
    confidence: maxVal
  };
}

module.exports = { loadModel, predictIntent };
