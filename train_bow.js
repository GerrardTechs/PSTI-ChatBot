// train_bow.js
const fs = require('fs');
const { preprocess } = require('./src/nlp/preprocess');

const intents = JSON.parse(
  fs.readFileSync('./src/data/intents.json')
).intents;

// pastikan folder model ada
if (!fs.existsSync('./model')) {
  fs.mkdirSync('./model');
}

let vocab = new Set();
let documents = [];

// ================= BUILD VOCAB & DOCUMENTS =================
intents.forEach(intent => {
  intent.patterns.forEach(pattern => {
    const words = preprocess(pattern).split(' ');

    words.forEach(w => vocab.add(w));

    documents.push({
      tag: intent.tag,
      words
    });
  });
});

vocab = Array.from(vocab);
fs.writeFileSync('./model/vocab.json', JSON.stringify(vocab, null, 2));

// ================= HELPER =================
function wordsToBow(words) {
  const bow = new Array(vocab.length).fill(0);
  words.forEach(w => {
    const idx = vocab.indexOf(w);
    if (idx !== -1) bow[idx] += 1;
  });
  return bow;
}

// ================= BUILD DOC VECTORS =================
let docVectors = [];

documents.forEach(doc => {
  const bow = wordsToBow(doc.words);

  docVectors.push({
    tag: doc.tag,
    vector: bow
  });
});

fs.writeFileSync(
  './model/doc_vectors.json',
  JSON.stringify(docVectors, null, 2)
);

console.log('✅ Training BoW selesai!');
console.log(`📚 Vocab: ${vocab.length}`);
console.log(`🧾 Total patterns: ${docVectors.length}`);
