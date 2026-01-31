const { loadModel, predictIntent } = require('./src/engine/intentEngine');

(async () => {
  await loadModel();

  const tests = [
    "halo",
    "apa itu psti",
    "reka",
    "lab psti",
    "dimana lab psti",
    "beasiswa"
  ];

  for (let t of tests) {
    const res = predictIntent(t);
    console.log(`\nInput: ${t}`);
    console.log(res);
  }
})();
