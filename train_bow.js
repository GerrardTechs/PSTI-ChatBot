/**
 * TRAIN BoW (Bag of Words) - PSTI Chatbot
 * Arsitektur: BoW + Dense
 * Pure tfjs, NO tfjs-node
 */

const tf = require('@tensorflow/tfjs');
const fs = require('fs');

class BoWTrainer {
  constructor(intentsPath) {
    this.intents = JSON.parse(fs.readFileSync(intentsPath, 'utf8'));
    this.vocab = new Set();
    this.wordIndex = {};
    this.intentMap = {};
    this.model = null;
  }

  preprocess(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildVocabulary() {
    console.log('📚 Building vocabulary...');
    this.intents.intents.forEach(intent => {
      intent.patterns.forEach(p => {
        p.split(',').forEach(text => {
          const words = this.preprocess(text).split(' ');
          words.forEach(w => this.vocab.add(w));
        });
      });
    });

    Array.from(this.vocab).forEach((word, i) => {
      this.wordIndex[word] = i;
    });

    console.log(`✅ Vocabulary size: ${this.vocab.size}`);
  }

  textToBoW(text) {
    const vector = new Array(this.vocab.size).fill(0);
    const words = this.preprocess(text).split(' ');
    words.forEach(w => {
      if (this.wordIndex[w] !== undefined) {
        vector[this.wordIndex[w]] += 1;
      }
    });
    return vector;
  }

  prepareData() {
    console.log('📊 Preparing dataset...');
    const xs = [];
    const ys = [];

    this.intents.intents.forEach((intent, idx) => {
      this.intentMap[intent.tag] = idx;

      intent.patterns.forEach(p => {
        p.split(',').forEach(text => {
          xs.push(this.textToBoW(text));
          ys.push(idx);
        });
      });
    });

    const xTensor = tf.tensor2d(xs);
    const yTensor = tf.oneHot(
      tf.tensor1d(ys, 'int32'),
      this.intents.intents.length
    );

    console.log(`   Samples: ${xs.length}`);
    console.log(`   Intents: ${this.intents.intents.length}`);

    return { xTensor, yTensor };
  }

  buildModel(inputSize, outputSize) {
    console.log('🧠 Building model...');
    const model = tf.sequential();

    model.add(tf.layers.dense({
      inputShape: [inputSize],
      units: 128,
      activation: 'relu'
    }));

    model.add(tf.layers.dropout({ rate: 0.3 }));

    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));

    model.add(tf.layers.dense({
      units: outputSize,
      activation: 'softmax'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async train() {
    this.buildVocabulary();
    const { xTensor, yTensor } = this.prepareData();

    this.model = this.buildModel(this.vocab.size, this.intents.intents.length);

    console.log('🚀 Training...\n');

    await this.model.fit(xTensor, yTensor, {
      epochs: 200,
      batchSize: 8,
      shuffle: true,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (e, logs) => {
          console.log(
            `Epoch ${e + 1} | loss=${logs.loss.toFixed(4)} acc=${(logs.acc * 100).toFixed(1)}%`
          );
        }
      }
    });
  }

  async save(modelPath = './model') {
    if (!fs.existsSync(modelPath)) {
      fs.mkdirSync(modelPath, { recursive: true });
    }
  
    console.log('💾 Saving model with proper IOHandler...');
  
    const saveHandler = {
      save: async (artifacts) => {
        // simpan model.json persis seperti tfjs mau
        fs.writeFileSync(
          `${modelPath}/model.json`,
          JSON.stringify(artifacts.modelTopology, null, 2)
        );
  
        fs.writeFileSync(
          `${modelPath}/weights.bin`,
          Buffer.from(artifacts.weightData)
        );
  
        fs.writeFileSync(
          `${modelPath}/weightsSpecs.json`,
          JSON.stringify(artifacts.weightSpecs, null, 2)
        );
  
        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: 'JSON',
            weightDataBytes: artifacts.weightData.byteLength
          }
        };
      }
    };
  
    await this.model.save(saveHandler);
  
    // tokenizer
    fs.writeFileSync(
      './tokenizer.json',
      JSON.stringify({
        word_index: this.wordIndex,
        vocab_size: this.vocab.size
      }, null, 2)
    );
  
    // metadata
    fs.writeFileSync(
      `${modelPath}/metadata.json`,
      JSON.stringify({
        intentMap: this.intentMap,
        numClasses: this.intents.intents.length
      }, null, 2)
    );
  
    console.log('✅ Model saved correctly!');
  }
  
}

async function main() {
  const trainer = new BoWTrainer('./intents.json');
  await trainer.train();
  await trainer.save();
}

main();
