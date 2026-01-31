const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const { preprocess } = require('./src/nlp/preprocess');

const intentsData = JSON.parse(
  fs.readFileSync('./src/data/intents.json')
);

const intents = intentsData.intents;

// ===== BUILD VOCAB OTOMATIS =====
let vocabSet = new Set();

intents.forEach(intent => {
  intent.patterns.forEach(p => {
    const words = preprocess(p).split(' ');
    words.forEach(w => vocabSet.add(w));
  });
});

const vocab = Array.from(vocabSet);
fs.writeFileSync('./model/vocab.json', JSON.stringify(vocab, null, 2));

console.log('✅ Vocab dibuat dari intents:', vocab.length);

// ===== Helper BoW =====
function textToBow(text) {
  const words = preprocess(text).split(' ');
  const vec = new Array(vocab.length).fill(0);

  words.forEach(w => {
    const idx = vocab.indexOf(w);
    if (idx !== -1) vec[idx] += 1;
  });

  return vec;
}

// ===== Build Dataset =====
let xs = [];
let ys = [];
let labels = intents.map(i => i.tag);

intents.forEach(intent => {
  intent.patterns.forEach(p => {
    xs.push(textToBow(p));

    const out = new Array(labels.length).fill(0);
    out[labels.indexOf(intent.tag)] = 1;
    ys.push(out);
  });
});

const xsTensor = tf.tensor2d(xs);
const ysTensor = tf.tensor2d(ys);

// ===== Model =====
const model = tf.sequential();
model.add(tf.layers.dense({
  inputShape: [vocab.length],
  units: 128,
  activation: 'relu'
}));
model.add(tf.layers.dropout({ rate: 0.3 }));
model.add(tf.layers.dense({
  units: labels.length,
  activation: 'softmax'
}));

model.compile({
  optimizer: 'adam',
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy']
});

(async () => {
  console.log('🚀 Training ML Intent Classifier...');
  await model.fit(xsTensor, ysTensor, {
    epochs: 500,
    shuffle: true,
    verbose: 1
  });

  const saveHandler = {
    save: async (artifacts) => {
      fs.writeFileSync('./model/model.json',
        JSON.stringify(artifacts.modelTopology));
      fs.writeFileSync('./model/weights.bin',
        Buffer.from(artifacts.weightData));
      fs.writeFileSync('./model/weightsSpecs.json',
        JSON.stringify(artifacts.weightSpecs));
      return { modelArtifactsInfo: {} };
    }
  };

  await model.save(saveHandler);
  fs.writeFileSync('./model/labels.json', JSON.stringify(labels));

  console.log('✅ MODEL + VOCAB + LABELS SINKRON TOTAL');
})();
