const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

/**
 * Custom loader supaya tfjs (browser version) bisa load model dari disk di Node
 */
async function loadModelFromDisk(modelDir) {
  const modelJsonPath = path.join(modelDir, 'model.json');
  const weightsPath = path.join(modelDir, 'weights.bin');

  const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
  const weightData = fs.readFileSync(weightsPath);

  const handler = tf.io.fromMemory(modelJson, weightData.buffer);

  const model = await tf.loadLayersModel(handler);
  return model;
}

module.exports = { loadModelFromDisk };
