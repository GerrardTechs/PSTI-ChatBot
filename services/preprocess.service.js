const { IndonesianPreprocessor } = require('../preprocessor');

const preprocessor = new IndonesianPreprocessor();

function preprocessText(text) {
  return preprocessor.preprocess(text, {
    replaceSlang: true,
    normalizeNumbers: true
  });
}

function tokenizeText(text, tokenizer) {
  const processed = preprocessText(text);

  const words = processed.split(' ');
  const maxLen = tokenizer.max_length;

  const sequence = words.map(word => {
    return tokenizer.word_index[word] || 0;
  });

  const padded = new Array(maxLen).fill(0);
  for (let i = 0; i < Math.min(sequence.length, maxLen); i++) {
    padded[i] = sequence[i];
  }

  return { tokens: padded, processedText: processed };
}

module.exports = { tokenizeText };
