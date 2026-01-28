// evaluate.js
const fs = require('fs');
const { preprocess } = require('./src/nlp/preprocess');
const { predictIntent } = require('./src/engine/intentEngine');

const intents = JSON.parse(
  fs.readFileSync('./src/data/intents.json')
).intents;

let tests = [];

// ================= BUILD TEST DATASET =================
intents.forEach(intent => {
  intent.patterns.forEach(p => {
    tests.push({
      text: p,
      expected: intent.tag
    });
  });
});

// ================= EVALUATION =================
function evaluate(threshold) {
  let correct = 0;
  let rejected = 0;

  tests.forEach(test => {
    const { tag, confidence } = predictIntent(test.text);

    if (confidence < threshold) {
      rejected++;
      return;
    }

    if (tag === test.expected) {
      correct++;
    }
  });

  const accuracy = (correct / (tests.length - rejected)) * 100 || 0;
  const coverage = ((tests.length - rejected) / tests.length) * 100;

  return { accuracy, coverage, correct, rejected };
}

// ================= RUN MULTI THRESHOLD =================
console.log('Threshold | Accuracy | Coverage | Correct | Rejected');
console.log('------------------------------------------------------');

for (let t = 0.1; t <= 0.9; t += 0.1) {
  const r = evaluate(parseFloat(t.toFixed(1)));

  console.log(
    `${t.toFixed(1)}\t   ${r.accuracy.toFixed(1)}%\t    ${r.coverage.toFixed(1)}%\t   ${r.correct}\t   ${r.rejected}`
  );
}
