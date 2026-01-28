const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const { preprocess } = require('../nlp/preprocess');

const vocab = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../model/vocab.json'))
);

const labels = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../model/labels.json'))
);

let model;

// ===== Load model sekali saat server start =====
async function loadModel() {
    const modelJson = JSON.parse(
      fs.readFileSync('./model/model.json', 'utf8')
    );
  
    const weightData = fs.readFileSync('./model/weights.bin');
  
    const handler = tf.io.fromMemory(
      modelJson,
      weightData.buffer
    );
  
    model = await tf.loadLayersModel(handler);
    console.log('✅ ML Intent Model Loaded (memory)');
  }
  

// ===== BoW =====
function textToBow(text) {
  const words = preprocess(text).split(' ');
  const vec = new Array(vocab.length).fill(0);

  words.forEach(w => {
    const idx = vocab.indexOf(w);
    if (idx !== -1) vec[idx] += 1;
  });

  return vec;
}

// ===== Predict =====
function predictIntent(text) {
  const bow = textToBow(text);
  const input = tf.tensor2d([bow]);

  const pred = model.predict(input);
  const scores = pred.dataSync();

  input.dispose();
  pred.dispose();

  const maxIdx = scores.indexOf(Math.max(...scores));

  return {
    tag: labels[maxIdx],
    confidence: scores[maxIdx]
  };
}

module.exports = {
  predictIntent,
  loadModel
};
