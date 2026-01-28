const stopwords = [
  'nya','aja','dong','sih','kok','lah','tuh',
  'apa','ada','yang','di','ke','dari','untuk'
];

function preprocess(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => !stopwords.includes(w))
    .join(' ');
}

module.exports = { preprocess };
