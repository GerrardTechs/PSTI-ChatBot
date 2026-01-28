const fs = require('fs');
const { preprocess } = require('./preprocess');

const vocab = JSON.parse(
  fs.readFileSync('./model/vocab.json')
);

function textToBow(text) {
  const clean = preprocess(text);
  const words = clean.split(' ');

  const vector = new Array(vocab.length).fill(0);

  words.forEach(w => {
    const idx = vocab.indexOf(w);
    if (idx !== -1) vector[idx] += 1;
  });

  return vector;
}

module.exports = { textToBow };
