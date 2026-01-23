/**
 * CONFIDENCE THRESHOLD TUNING - PSTI CHATBOT
 * Interactive tool untuk mencari threshold optimal
 * 
 * Features:
 * - Visualisasi confidence distribution
 * - Grid search untuk optimal threshold
 * - Trade-off analysis (accuracy vs coverage)
 * - Real-time threshold adjustment testing
 */

const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const { IndonesianPreprocessor } = require('./preprocessor');

class ConfidenceThresholdTuner {
  constructor(modelPath, tokenizerPath, intentsPath) {
    this.modelPath = modelPath;
    this.tokenizerPath = tokenizerPath;
    this.intentsPath = intentsPath;
    this.preprocessor = new IndonesianPreprocessor();
  }

  /**
   * Initialize model and data
   */
  async initialize() {
    console.log('🔧 Initializing threshold tuner...\n');
    
    // Load model
    this.model = await tf.loadLayersModel(`file://${this.modelPath}`);
    console.log('✅ Model loaded');
    
    // Load tokenizer
    this.tokenizer = JSON.parse(fs.readFileSync(this.tokenizerPath, 'utf8'));
    console.log('✅ Tokenizer loaded');
    
    // Load intents
    this.intents = JSON.parse(fs.readFileSync(this.intentsPath, 'utf8'));
    console.log('✅ Intents loaded');
    
    // Load metadata if exists
    if (fs.existsSync('./model/metadata.json')) {
      this.metadata = JSON.parse(fs.readFileSync('./model/metadata.json', 'utf8'));
      console.log('✅ Metadata loaded\n');
    }
  }

  /**
   * Tokenize text
   */
  tokenize(text) {
    const processed = this.preprocessor.preprocess(text);
    const words = processed.split(' ');
    const maxLen = this.tokenizer.max_length;
    
    const sequence = words.map(word => this.tokenizer.word_index[word] || 0);
    const padded = new Array(maxLen).fill(0);
    
    for (let i = 0; i < Math.min(sequence.length, maxLen); i++) {
      padded[i] = sequence[i];
    }
    
    return padded;
  }

  /**
   * Get intent by index
   */
  getIntentByIndex(index) {
    if (this.metadata && this.metadata.intentMap) {
      for (const [tag, idx] of Object.entries(this.metadata.intentMap)) {
        if (idx === index) return tag;
      }
    }
    return this.intents.intents[index]?.tag || 'unknown';
  }

  /**
   * Prepare test dataset
   */
  prepareTestDataset() {
    const data = [];
    const labels = [];
    const texts = [];
    
    this.intents.intents.forEach((intent, idx) => {
      intent.patterns.forEach(pattern => {
        const patterns = pattern.split(',').map(p => p.trim());
        patterns.forEach(p => {
          if (p.length > 0) {
            texts.push(p);
            data.push(this.tokenize(p));
            labels.push(idx);
          }
        });
      });
    });
    
    return { data, labels, texts };
  }

  /**
   * Get confidence predictions for all test samples
   */
  async getPredictions(testData, testLabels) {
    const xs = tf.tensor2d(testData);
    const predictions = await this.model.predict(xs).array();
    xs.dispose();
    
    const results = [];
    
    predictions.forEach((pred, idx) => {
      const predictedIdx = pred.indexOf(Math.max(...pred));
      const confidence = pred[predictedIdx];
      const trueIdx = testLabels[idx];
      
      results.push({
        confidence: confidence,
        predictedIdx: predictedIdx,
        predictedIntent: this.getIntentByIndex(predictedIdx),
        trueIdx: trueIdx,
        trueIntent: this.getIntentByIndex(trueIdx),
        correct: predictedIdx === trueIdx,
        allScores: pred
      });
    });
    
    return results;
  }

  /**
   * Analyze confidence distribution
   */
  analyzeDistribution(predictions) {
    const bins = {
      '0.0-0.1': 0,
      '0.1-0.2': 0,
      '0.2-0.3': 0,
      '0.3-0.4': 0,
      '0.4-0.5': 0,
      '0.5-0.6': 0,
      '0.6-0.7': 0,
      '0.7-0.8': 0,
      '0.8-0.9': 0,
      '0.9-1.0': 0
    };
    
    const correctBins = { ...bins };
    const incorrectBins = { ...bins };
    
    predictions.forEach(pred => {
      const conf = pred.confidence;
      let bin;
      
      if (conf < 0.1) bin = '0.0-0.1';
      else if (conf < 0.2) bin = '0.1-0.2';
      else if (conf < 0.3) bin = '0.2-0.3';
      else if (conf < 0.4) bin = '0.3-0.4';
      else if (conf < 0.5) bin = '0.4-0.5';
      else if (conf < 0.6) bin = '0.5-0.6';
      else if (conf < 0.7) bin = '0.6-0.7';
      else if (conf < 0.8) bin = '0.7-0.8';
      else if (conf < 0.9) bin = '0.8-0.9';
      else bin = '0.9-1.0';
      
      bins[bin]++;
      
      if (pred.correct) {
        correctBins[bin]++;
      } else {
        incorrectBins[bin]++;
      }
    });
    
    return { bins, correctBins, incorrectBins };
  }

  /**
   * Grid search untuk optimal threshold
   */
  gridSearchThreshold(predictions, thresholds = null) {
    if (!thresholds) {
      // Generate thresholds dari 0.1 hingga 0.9 dengan step 0.05
      thresholds = [];
      for (let t = 0.1; t <= 0.95; t += 0.05) {
        thresholds.push(parseFloat(t.toFixed(2)));
      }
    }
    
    const results = thresholds.map(threshold => {
      let accepted = 0;
      let correct = 0;
      let rejected = 0;
      let falsePositives = 0;
      let falseNegatives = 0;
      
      predictions.forEach(pred => {
        if (pred.confidence >= threshold) {
          accepted++;
          if (pred.correct) {
            correct++;
          } else {
            falsePositives++;
          }
        } else {
          rejected++;
          if (pred.correct) {
            falseNegatives++;
          }
        }
      });
      
      const accuracy = accepted > 0 ? correct / accepted : 0;
      const coverage = accepted / predictions.length;
      const precision = accepted > 0 ? correct / accepted : 0;
      const recall = correct / predictions.length;
      const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      
      // Composite score: prioritize accuracy but maintain reasonable coverage
      // Formula: weighted harmonic mean
      const score = accuracy * 0.6 + coverage * 0.3 + f1 * 0.1;
      
      return {
        threshold,
        accepted,
        rejected,
        correct,
        falsePositives,
        falseNegatives,
        accuracy,
        coverage,
        precision,
        recall,
        f1,
        score
      };
    });
    
    return results;
  }

  /**
   * Find optimal threshold berdasarkan different objectives
   */
  findOptimalThreshold(gridResults) {
    // 1. Maximum F1 score
    const maxF1 = gridResults.reduce((best, curr) => 
      curr.f1 > best.f1 ? curr : best
    );
    
    // 2. Best accuracy with min 70% coverage
    const bestAccuracyWith70Coverage = gridResults
      .filter(r => r.coverage >= 0.7)
      .reduce((best, curr) => 
        curr.accuracy > best.accuracy ? curr : best,
        { accuracy: 0 }
      );
    
    // 3. Best balanced score
    const bestBalanced = gridResults.reduce((best, curr) => 
      curr.score > best.score ? curr : best
    );
    
    // 4. High precision (minimize false positives)
    const highPrecision = gridResults
      .filter(r => r.coverage >= 0.6)
      .reduce((best, curr) => 
        curr.precision > best.precision ? curr : best,
        { precision: 0 }
      );
    
    return {
      maxF1,
      bestAccuracyWith70Coverage,
      bestBalanced,
      highPrecision
    };
  }

  /**
   * Print confidence distribution histogram
   */
  printDistribution(distribution) {
    console.log('\n' + '='.repeat(80));
    console.log('CONFIDENCE DISTRIBUTION');
    console.log('='.repeat(80));
    
    console.log('\nRange'.padEnd(15), 'Total'.padEnd(10), 'Correct'.padEnd(10), 'Wrong'.padEnd(10), 'Histogram');
    console.log('-'.repeat(80));
    
    const maxCount = Math.max(...Object.values(distribution.bins));
    
    Object.entries(distribution.bins).forEach(([range, count]) => {
      const correct = distribution.correctBins[range];
      const incorrect = distribution.incorrectBins[range];
      const barLength = Math.round((count / maxCount) * 30);
      const bar = '█'.repeat(barLength);
      
      console.log(
        range.padEnd(15),
        count.toString().padEnd(10),
        correct.toString().padEnd(10),
        incorrect.toString().padEnd(10),
        bar
      );
    });
  }

  /**
   * Print grid search results
   */
  printGridResults(gridResults) {
    console.log('\n' + '='.repeat(80));
    console.log('THRESHOLD GRID SEARCH RESULTS');
    console.log('='.repeat(80));
    
    console.log('\nThreshold'.padEnd(12), 'Accuracy'.padEnd(12), 'Coverage'.padEnd(12), 
                'F1'.padEnd(12), 'Score'.padEnd(12), 'Status');
    console.log('-'.repeat(80));
    
    gridResults.forEach(result => {
      let status = '  ';
      if (result.accuracy >= 0.85 && result.coverage >= 0.7) status = '✅';
      else if (result.accuracy >= 0.75 && result.coverage >= 0.6) status = '⚠️';
      
      console.log(
        result.threshold.toFixed(2).padEnd(12),
        (result.accuracy * 100).toFixed(1).padEnd(12),
        (result.coverage * 100).toFixed(1).padEnd(12),
        (result.f1 * 100).toFixed(1).padEnd(12),
        result.score.toFixed(3).padEnd(12),
        status
      );
    });
  }

  /**
   * Print optimal thresholds
   */
  printOptimalThresholds(optimal) {
    console.log('\n' + '='.repeat(80));
    console.log('OPTIMAL THRESHOLD RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    console.log('\n1️⃣  BEST BALANCED (Recommended for production):');
    console.log(`   Threshold: ${optimal.bestBalanced.threshold}`);
    console.log(`   Accuracy: ${(optimal.bestBalanced.accuracy * 100).toFixed(1)}%`);
    console.log(`   Coverage: ${(optimal.bestBalanced.coverage * 100).toFixed(1)}%`);
    console.log(`   F1 Score: ${(optimal.bestBalanced.f1 * 100).toFixed(1)}%`);
    
    console.log('\n2️⃣  MAXIMUM F1 SCORE:');
    console.log(`   Threshold: ${optimal.maxF1.threshold}`);
    console.log(`   Accuracy: ${(optimal.maxF1.accuracy * 100).toFixed(1)}%`);
    console.log(`   Coverage: ${(optimal.maxF1.coverage * 100).toFixed(1)}%`);
    console.log(`   F1 Score: ${(optimal.maxF1.f1 * 100).toFixed(1)}%`);
    
    if (optimal.bestAccuracyWith70Coverage.accuracy > 0) {
      console.log('\n3️⃣  BEST ACCURACY (min 70% coverage):');
      console.log(`   Threshold: ${optimal.bestAccuracyWith70Coverage.threshold}`);
      console.log(`   Accuracy: ${(optimal.bestAccuracyWith70Coverage.accuracy * 100).toFixed(1)}%`);
      console.log(`   Coverage: ${(optimal.bestAccuracyWith70Coverage.coverage * 100).toFixed(1)}%`);
    }
    
    console.log('\n4️⃣  HIGH PRECISION (minimize false positives):');
    console.log(`   Threshold: ${optimal.highPrecision.threshold}`);
    console.log(`   Precision: ${(optimal.highPrecision.precision * 100).toFixed(1)}%`);
    console.log(`   Accuracy: ${(optimal.highPrecision.accuracy * 100).toFixed(1)}%`);
    console.log(`   Coverage: ${(optimal.highPrecision.coverage * 100).toFixed(1)}%`);
    
    console.log('\n💡 RECOMMENDATION:');
    console.log(`   Use threshold: ${optimal.bestBalanced.threshold}`);
    console.log(`   This provides the best balance between accuracy and coverage.`);
  }

  /**
   * Save results to file
   */
  saveResults(distribution, gridResults, optimal, predictions) {
    const output = {
      timestamp: new Date().toISOString(),
      distribution,
      gridResults,
      optimal,
      samplePredictions: predictions.slice(0, 20) // Save first 20 for inspection
    };
    
    fs.writeFileSync('./threshold_tuning_results.json', JSON.stringify(output, null, 2));
    console.log('\n💾 Results saved to threshold_tuning_results.json');
  }

  /**
   * Run complete threshold tuning
   */
  async run() {
    await this.initialize();
    
    console.log('📊 Preparing test dataset...');
    const { data, labels, texts } = this.prepareTestDataset();
    console.log(`   Total samples: ${data.length}\n`);
    
    console.log('🔮 Getting predictions...');
    const predictions = await this.getPredictions(data, labels);
    console.log('   ✅ Predictions complete\n');
    
    // Analyze distribution
    const distribution = this.analyzeDistribution(predictions);
    this.printDistribution(distribution);
    
    // Grid search
    console.log('\n🔍 Running grid search...');
    const gridResults = this.gridSearchThreshold(predictions);
    this.printGridResults(gridResults);
    
    // Find optimal
    const optimal = this.findOptimalThreshold(gridResults);
    this.printOptimalThresholds(optimal);
    
    // Save results
    this.saveResults(distribution, gridResults, optimal, predictions);
    
    console.log('\n✅ Threshold tuning completed!\n');
    
    return {
      distribution,
      gridResults,
      optimal,
      recommendations: {
        production: optimal.bestBalanced.threshold,
        highAccuracy: optimal.bestAccuracyWith70Coverage.threshold || optimal.maxF1.threshold,
        highPrecision: optimal.highPrecision.threshold
      }
    };
  }
}

/**
 * MAIN
 */
async function main() {
  const tuner = new ConfidenceThresholdTuner(
    './model/model.json',
    './tokenizer.json',
    './intents.json'
  );
  
  await tuner.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ConfidenceThresholdTuner };
