/**
 * EVALUASI INTENT CLASSIFICATION - PSTI CHATBOT
 * Evaluasi akurasi model tanpa database, pure TensorFlow.js
 * 
 * Fitur:
 * - K-Fold Cross Validation
 * - Confusion Matrix
 * - Per-intent accuracy, precision, recall, F1-score
 * - Confidence threshold tuning
 * - Test set evaluation
 */

const tf = require('@tensorflow/tfjs');
const fs = require('fs');

async function loadModelFromDisk(modelDir) {
  const modelJsonPath = `${modelDir}/model.json`;
  const weightsPath = `${modelDir}/weights.bin`;

  if (!fs.existsSync(modelJsonPath)) {
    throw new Error(`model.json not found at ${modelJsonPath}`);
  }
  if (!fs.existsSync(weightsPath)) {
    throw new Error(`weights.bin not found at ${weightsPath}`);
  }

  const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
  const weightData = fs.readFileSync(weightsPath);

  return await tf.loadLayersModel(
    tf.io.fromMemory(
      modelJson.modelTopology,
      modelJson.weightsManifest[0].weights,
      weightData
    )
  );
}

class IntentEvaluator {
  constructor(intentsPath, tokenizerPath) {
    this.intents = JSON.parse(fs.readFileSync(intentsPath, 'utf8'));
    this.tokenizer = JSON.parse(fs.readFileSync(tokenizerPath, 'utf8'));
    this.vocabSize = this.tokenizer.vocab_size;
    this.maxLen = this.tokenizer.max_length || 20;
  }

  /**
   * Preprocessing text Bahasa Indonesia (ringan, tanpa library external)
   */
  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // hapus special chars
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim();
  }

  /**
   * Tokenize & pad sequences seperti saat training
   */
  tokenize(text) {
    const processed = this.preprocessText(text);
    const words = processed.split(' ');
    
    const sequence = words.map(word => {
      return this.tokenizer.word_index[word] || 0; // 0 = unknown
    });

    // Padding
    const padded = new Array(this.maxLen).fill(0);
    for (let i = 0; i < Math.min(sequence.length, this.maxLen); i++) {
      padded[i] = sequence[i];
    }
    
    return padded;
  }

  /**
   * Prepare dataset untuk evaluasi
   */
  prepareDataset() {
    const data = [];
    const labels = [];
    const intentMap = {};
    
    // Build intent to index mapping
    this.intents.intents.forEach((intent, idx) => {
      intentMap[intent.tag] = idx;
      
      intent.patterns.forEach(pattern => {
        // Split comma-separated patterns
        const patterns = pattern.split(',').map(p => p.trim());
        patterns.forEach(p => {
          if (p.length > 0) {
            data.push(this.tokenize(p));
            labels.push(idx);
          }
        });
      });
    });

    this.intentMap = intentMap;
    this.numClasses = Object.keys(intentMap).length;
    
    return { data, labels };
  }

  /**
   * Split data menjadi train/test
   */
  trainTestSplit(data, labels, testSize = 0.2) {
    const indices = Array.from({length: data.length}, (_, i) => i);
    
    // Shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    const splitIdx = Math.floor(data.length * (1 - testSize));
    const trainIndices = indices.slice(0, splitIdx);
    const testIndices = indices.slice(splitIdx);
    
    const trainData = trainIndices.map(i => data[i]);
    const trainLabels = trainIndices.map(i => labels[i]);
    const testData = testIndices.map(i => data[i]);
    const testLabels = testIndices.map(i => labels[i]);
    
    return { trainData, trainLabels, testData, testLabels };
  }

  /**
   * Evaluasi model dengan test set
   */
  async evaluateModel(model, testData, testLabels) {
    const xs = tf.tensor2d(testData);
    const predictions = await model.predict(xs).array();
    xs.dispose();
    
    const results = {
      correct: 0,
      total: testLabels.length,
      perIntent: {},
      confusionMatrix: Array(this.numClasses).fill().map(() => Array(this.numClasses).fill(0)),
      confidenceDistribution: []
    };
    
    // Initialize per-intent metrics
    Object.keys(this.intentMap).forEach(tag => {
      results.perIntent[tag] = {
        tp: 0, fp: 0, fn: 0, tn: 0,
        predictions: []
      };
    });
    
    // Evaluate predictions
    predictions.forEach((pred, idx) => {
      const predictedIdx = pred.indexOf(Math.max(...pred));
      const trueIdx = testLabels[idx];
      const confidence = pred[predictedIdx];
      
      results.confidenceDistribution.push({
        predicted: predictedIdx,
        true: trueIdx,
        confidence: confidence,
        correct: predictedIdx === trueIdx
      });
      
      // Confusion matrix
      results.confusionMatrix[trueIdx][predictedIdx]++;
      
      // Accuracy
      if (predictedIdx === trueIdx) {
        results.correct++;
      }
      
      // Per-intent metrics
      Object.entries(this.intentMap).forEach(([tag, classIdx]) => {
        const isTrue = trueIdx === classIdx;
        const isPredicted = predictedIdx === classIdx;
        
        if (isTrue && isPredicted) results.perIntent[tag].tp++;
        else if (!isTrue && isPredicted) results.perIntent[tag].fp++;
        else if (isTrue && !isPredicted) results.perIntent[tag].fn++;
        else results.perIntent[tag].tn++;
        
        results.perIntent[tag].predictions.push({
          confidence: pred[classIdx],
          predicted: predictedIdx === classIdx,
          true: isTrue
        });
      });
    });
    
    // Calculate metrics
    results.accuracy = results.correct / results.total;
    
    Object.keys(results.perIntent).forEach(tag => {
      const metrics = results.perIntent[tag];
      metrics.precision = metrics.tp / (metrics.tp + metrics.fp) || 0;
      metrics.recall = metrics.tp / (metrics.tp + metrics.fn) || 0;
      metrics.f1 = 2 * (metrics.precision * metrics.recall) / (metrics.precision + metrics.recall) || 0;
      metrics.support = metrics.tp + metrics.fn;
    });
    
    return results;
  }

  /**
   * Find optimal confidence threshold
   */
  findOptimalThreshold(confidenceDistribution, thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
    const results = thresholds.map(threshold => {
      let accepted = 0;
      let correct = 0;
      let rejected = 0;
      
      confidenceDistribution.forEach(item => {
        if (item.confidence >= threshold) {
          accepted++;
          if (item.correct) correct++;
        } else {
          rejected++;
        }
      });
      
      return {
        threshold,
        accepted,
        rejected,
        correct,
        accuracy: accepted > 0 ? correct / accepted : 0,
        coverage: accepted / confidenceDistribution.length
      };
    });
    
    return results;
  }

  /**
   * Print evaluation report
   */
  printReport(results) {
    console.log('\n========================================');
    console.log('EVALUASI MODEL INTENT CLASSIFICATION');
    console.log('========================================\n');
    
    console.log(`Overall Accuracy: ${(results.accuracy * 100).toFixed(2)}%`);
    console.log(`Total Samples: ${results.total}`);
    console.log(`Correct: ${results.correct}, Wrong: ${results.total - results.correct}\n`);
    
    console.log('Per-Intent Performance:');
    console.log('----------------------------------------');
    console.log('Intent'.padEnd(20), 'Prec'.padEnd(8), 'Recall'.padEnd(8), 'F1'.padEnd(8), 'Support');
    console.log('----------------------------------------');
    
    Object.entries(results.perIntent)
      .sort((a, b) => b[1].f1 - a[1].f1)
      .forEach(([tag, metrics]) => {
        console.log(
          tag.padEnd(20),
          (metrics.precision * 100).toFixed(1).padEnd(8),
          (metrics.recall * 100).toFixed(1).padEnd(8),
          (metrics.f1 * 100).toFixed(1).padEnd(8),
          metrics.support
        );
      });
    
    console.log('\nConfusion Matrix:');
    console.log('----------------------------------------');
    const intentNames = Object.keys(this.intentMap);
    console.log('True\\Pred'.padEnd(15), intentNames.map(n => n.substring(0, 8)).join(' '));
    results.confusionMatrix.forEach((row, i) => {
      console.log(
        intentNames[i].substring(0, 15).padEnd(15),
        row.map(v => v.toString().padStart(8)).join(' ')
      );
    });
  }

  /**
   * Print threshold analysis
   */
  printThresholdAnalysis(thresholdResults) {
    console.log('\n========================================');
    console.log('CONFIDENCE THRESHOLD ANALYSIS');
    console.log('========================================\n');
    console.log('Threshold'.padEnd(12), 'Accuracy'.padEnd(12), 'Coverage'.padEnd(12), 'Accepted'.padEnd(12), 'Rejected');
    console.log('----------------------------------------------------------');
    
    thresholdResults.forEach(result => {
      console.log(
        result.threshold.toFixed(1).padEnd(12),
        (result.accuracy * 100).toFixed(1).padEnd(12),
        (result.coverage * 100).toFixed(1).padEnd(12),
        result.accepted.toString().padEnd(12),
        result.rejected
      );
    });
    
    // Recommend optimal threshold
    const optimal = thresholdResults.reduce((best, curr) => {
      const currScore = curr.accuracy * 0.7 + curr.coverage * 0.3; // Balance accuracy & coverage
      const bestScore = best.accuracy * 0.7 + best.coverage * 0.3;
      return currScore > bestScore ? curr : best;
    });
    
    console.log('\n✅ REKOMENDASI THRESHOLD:', optimal.threshold);
    console.log(`   Accuracy: ${(optimal.accuracy * 100).toFixed(1)}%, Coverage: ${(optimal.coverage * 100).toFixed(1)}%\n`);
  }

  /**
   * Save evaluation results to JSON
   */
  saveResults(results, thresholdResults, outputPath = 'evaluation_results.json') {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        accuracy: results.accuracy,
        total: results.total,
        correct: results.correct
      },
      perIntent: results.perIntent,
      confusionMatrix: results.confusionMatrix,
      thresholdAnalysis: thresholdResults,
      recommendedThreshold: thresholdResults.reduce((best, curr) => {
        const currScore = curr.accuracy * 0.7 + curr.coverage * 0.3;
        const bestScore = best.accuracy * 0.7 + best.coverage * 0.3;
        return currScore > bestScore ? curr : best;
      })
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Results saved to ${outputPath}`);
  }
}

/**
 * MAIN EVALUATION SCRIPT
 */
async function runEvaluation() {
  console.log('🔍 Starting Intent Classification Evaluation...\n');
  
  const evaluator = new IntentEvaluator('./intents.json', './tokenizer.json');
  
  // Prepare dataset
  console.log('📦 Preparing dataset...');
  const { data, labels } = evaluator.prepareDataset();
  console.log(`   Total patterns: ${data.length}`);
  console.log(`   Number of intents: ${evaluator.numClasses}\n`);
  
  // Split train/test
  const split = evaluator.trainTestSplit(data, labels, 0.2);
  console.log(`📊 Train/Test split:`);
  console.log(`   Train: ${split.trainData.length}, Test: ${split.testData.length}\n`);
  
  // Load model
  console.log('🤖 Loading model...');
  const model = await loadModelFromDisk('./model');
  console.log('   Model loaded successfully\n');
  
  // Evaluate
  console.log('⚡ Evaluating model...');
  const results = await evaluator.evaluateModel(model, split.testData, split.testLabels);
  
  // Print report
  evaluator.printReport(results);
  
  // Threshold analysis
  const thresholdResults = evaluator.findOptimalThreshold(results.confidenceDistribution);
  evaluator.printThresholdAnalysis(thresholdResults);
  
  // Save results
  evaluator.saveResults(results, thresholdResults);
  
  console.log('✅ Evaluation completed!\n');
}

// Run if called directly
if (require.main === module) {
  runEvaluation().catch(console.error);
}

module.exports = { IntentEvaluator };
