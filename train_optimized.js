/**
 * FIXED OPTIMIZED LSTM TRAINING - PSTI CHATBOT
 * Fixed version dengan proper tensor handling untuk Windows
 */

const tf = require('@tensorflow/tfjs');
const fs = require('fs');

class OptimizedLSTMTrainer {
  constructor(intentsPath, config = {}) {
    this.intents = JSON.parse(fs.readFileSync(intentsPath, 'utf8'));
    
    this.config = {
      maxLen: config.maxLen || 20,
      embeddingDim: config.embeddingDim || 64,
      lstmUnits: config.lstmUnits || 128,
      dropout: config.dropout || 0.3,
      recurrentDropout: config.recurrentDropout || 0.2,
      learningRate: config.learningRate || 0.001,
      batchSize: config.batchSize || 16,
      epochs: config.epochs || 100,
      validationSplit: config.validationSplit || 0.2,
      earlyStoppingPatience: config.earlyStoppingPatience || 15,
      useBidirectional: config.useBidirectional !== false,
      ...config
    };
    
    this.tokenizer = null;
    this.model = null;
  }

  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/([a-z])\1{2,}/g, '$1$1')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\d+/g, 'NUM')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildTokenizer() {
    const vocabulary = new Set();
    const wordFreq = {};
    
    this.intents.intents.forEach(intent => {
      intent.patterns.forEach(pattern => {
        const patterns = pattern.split(',').map(p => p.trim());
        patterns.forEach(p => {
          const processed = this.preprocessText(p);
          const words = processed.split(' ');
          
          words.forEach(word => {
            if (word.length > 0) {
              vocabulary.add(word);
              wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
          });
        });
      });
    });
    
    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
    
    const wordIndex = {};
    sortedWords.forEach((word, idx) => {
      wordIndex[word] = idx + 1;
    });
    
    this.tokenizer = {
      word_index: wordIndex,
      vocab_size: sortedWords.length + 1,
      max_length: this.config.maxLen,
      vocabulary: sortedWords
    };
    
    console.log(`📚 Vocabulary size: ${this.tokenizer.vocab_size}`);
    console.log(`📝 Top 10 words:`, sortedWords.slice(0, 10));
  }

  tokenize(text) {
    const processed = this.preprocessText(text);
    const words = processed.split(' ');
    
    const sequence = words.map(word => {
      return this.tokenizer.word_index[word] || 0;
    });
    
    const padded = new Array(this.config.maxLen).fill(0);
    for (let i = 0; i < Math.min(sequence.length, this.config.maxLen); i++) {
      padded[i] = sequence[i];
    }
    
    return padded;
  }

  prepareData() {
    const data = [];
    const labels = [];
    const intentMap = {};
    const intentCounts = {};
    
    this.intents.intents.forEach((intent, idx) => {
      intentMap[intent.tag] = idx;
      intentCounts[idx] = 0;
      
      intent.patterns.forEach(pattern => {
        const patterns = pattern.split(',').map(p => p.trim());
        patterns.forEach(p => {
          if (p.length > 0) {
            data.push(this.tokenize(p));
            labels.push(idx);
            intentCounts[idx]++;
          }
        });
      });
    });
    
    this.intentMap = intentMap;
    this.numClasses = Object.keys(intentMap).length;
    
    const totalSamples = data.length;
    this.classWeights = {};
    Object.entries(intentCounts).forEach(([classIdx, count]) => {
      this.classWeights[classIdx] = totalSamples / (this.numClasses * count);
    });
    
    console.log(`\n📊 Dataset statistics:`);
    console.log(`   Total samples: ${totalSamples}`);
    console.log(`   Number of intents: ${this.numClasses}`);
    console.log(`   Samples per intent:`, intentCounts);
    
    return { data, labels };
  }

  buildModel() {
    const model = tf.sequential();
    
    model.add(tf.layers.embedding({
      inputDim: this.tokenizer.vocab_size,
      outputDim: this.config.embeddingDim,
      inputLength: this.config.maxLen,
      maskZero: true
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    const lstmLayer = tf.layers.lstm({
      units: this.config.lstmUnits,
      returnSequences: false,
      dropout: this.config.dropout,
      recurrentDropout: this.config.recurrentDropout
    });
    
    if (this.config.useBidirectional) {
      model.add(tf.layers.bidirectional({
        layer: lstmLayer,
        mergeMode: 'concat'
      }));
    } else {
      model.add(lstmLayer);
    }
    
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dropout({ rate: 0.3 }));
    
    model.add(tf.layers.dense({
      units: this.numClasses,
      activation: 'softmax'
    }));
    
    const optimizer = tf.train.adam(this.config.learningRate);
    
    model.compile({
      optimizer: optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    this.model = model;
    
    console.log('\n🧠 Model Architecture:');
    model.summary();
    
    return model;
  }

  createCallbacks() {
    let bestValLoss = Infinity;
    let patience = 0;
    
    const earlyStoppingCallback = {
      onEpochEnd: async (epoch, logs) => {
        const loss = logs.loss.toFixed(4);
        const acc = (logs.acc * 100).toFixed(1);
        const valLoss = logs.val_loss.toFixed(4);
        const valAcc = (logs.val_acc * 100).toFixed(1);
        
        console.log(
          `Epoch ${(epoch + 1).toString().padStart(3)}: ` +
          `loss=${loss} acc=${acc}% | ` +
          `val_loss=${valLoss} val_acc=${valAcc}%`
        );
        
        if (logs.val_loss < bestValLoss) {
          bestValLoss = logs.val_loss;
          patience = 0;
          console.log(`   ✅ New best validation loss!`);
        } else {
          patience++;
          if (patience >= this.config.earlyStoppingPatience) {
            console.log(`\n⏹️  Early stopping at epoch ${epoch + 1}`);
            this.model.stopTraining = true;
          }
        }
      }
    };
    
    return [earlyStoppingCallback];
  }

  async train() {
    console.log('\n🚀 Starting training...\n');
    console.log('Hyperparameters:', JSON.stringify(this.config, null, 2));
    
    this.buildTokenizer();
    const { data, labels } = this.prepareData();
    
    // FIXED: Properly convert to tensors with explicit float32 dtype
    console.log('\n🔧 Creating tensors...');
    const xs = tf.tensor2d(data, [data.length, this.config.maxLen], 'int32');
    const ys = tf.oneHot(
      tf.tensor1d(labels, 'int32'),
      this.numClasses
    ).toFloat();
    
    
    console.log(`   Input shape: [${xs.shape}]`);
    console.log(`   Label shape: [${ys.shape}]`);
    
    this.buildModel();
    
    console.log('\n⚡ Training model...\n');
    const callbacks = this.createCallbacks();

    console.log('\n🔍 Tensor dtypes check:');
console.log('xs dtype:', xs.dtype); // int32
console.log('ys dtype:', ys.dtype); // int32
console.log('ys shape:', ys.shape); // [samples, numClasses]

    
    const history = await this.model.fit(xs, ys, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationSplit: this.config.validationSplit,
      shuffle: true,
      verbose: 0,
      callbacks: callbacks
    });

    xs.dispose();
    ys.dispose();
    
    console.log('\n✅ Training completed!');
    
    const finalLoss = history.history.loss[history.history.loss.length - 1];
    const finalAcc = history.history.acc[history.history.acc.length - 1];
    const finalValLoss = history.history.val_loss[history.history.val_loss.length - 1];
    const finalValAcc = history.history.val_acc[history.history.val_acc.length - 1];
    
    console.log('\n📊 Final Metrics:');
    console.log(`   Training - Loss: ${finalLoss.toFixed(4)}, Accuracy: ${(finalAcc * 100).toFixed(1)}%`);
    console.log(`   Validation - Loss: ${finalValLoss.toFixed(4)}, Accuracy: ${(finalValAcc * 100).toFixed(1)}%`);
    
    return history;
  }

  async save(modelPath = './model', tokenizerPath = './tokenizer.json') {
    if (!fs.existsSync(modelPath)) {
      fs.mkdirSync(modelPath, { recursive: true });
    }
  
    const artifacts = await this.model.save(
      tf.io.withSaveHandler(async (artifacts) => artifacts)
    );
  
    fs.writeFileSync(
      `${modelPath}/model.json`,
      JSON.stringify({
        modelTopology: artifacts.modelTopology,
        format: artifacts.format,
        generatedBy: artifacts.generatedBy,
        convertedBy: artifacts.convertedBy,
        weightsManifest: [{
          paths: ['weights.bin'],
          weights: artifacts.weightSpecs
        }]
      }, null, 2)
    );
  
    fs.writeFileSync(
      `${modelPath}/weights.bin`,
      Buffer.from(artifacts.weightData)
    );
  
    console.log(`\n💾 Model saved to ${modelPath}`);
  
    // Tokenizer
    fs.writeFileSync(tokenizerPath, JSON.stringify(this.tokenizer, null, 2));
    console.log(`💾 Tokenizer saved to ${tokenizerPath}`);
  
    // Metadata
    fs.writeFileSync(
      `${modelPath}/metadata.json`,
      JSON.stringify({
        intentMap: this.intentMap,
        numClasses: this.numClasses,
        config: this.config,
        trainedAt: new Date().toISOString()
      }, null, 2)
    );
  
    console.log(`💾 Metadata saved`);
  }
  
  
}

async function main() {
  try {
    // Check if intents.json exists
    if (!fs.existsSync('./intents.json')) {
      console.error('❌ Error: intents.json not found!');
      console.log('Please make sure intents.json is in the current directory.');
      process.exit(1);
    }
    
    const trainer = new OptimizedLSTMTrainer('./intents.json', {
      lstmUnits: 128,
      embeddingDim: 64,
      dropout: 0.3,
      recurrentDropout: 0.2,
      learningRate: 0.001,
      batchSize: 16,
      epochs: 100,
      useBidirectional: true,
      earlyStoppingPatience: 15
    });
    
    await trainer.train();
    await trainer.save();
    
    console.log('\n✅ All done! You can now run:');
    console.log('   node evaluate.js    - to evaluate the model');
    console.log('   node server_optimized.js - to start the server\n');
    
  } catch (error) {
    console.error('\n❌ Training failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { OptimizedLSTMTrainer };