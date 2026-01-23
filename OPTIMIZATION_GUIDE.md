# 🤖 PSTI Chatbot - Optimasi & Evaluasi Guide

## 📋 Overview

Sistem chatbot intent classification untuk Lab PSTI menggunakan:
- **Backend**: Node.js + Express.js
- **ML Framework**: TensorFlow.js (pure JS, tanpa native binding)
- **Model**: LSTM/Bidirectional LSTM
- **Dataset**: intents.json (16 intents)
- **Bahasa**: Indonesia (informal/santai)

## 🎯 Tujuan Optimasi

1. **Akurasi**: Meningkatkan akurasi prediksi intent (target >85%)
2. **Confidence**: Menentukan threshold optimal untuk fallback
3. **Preprocessing**: Handling Bahasa Indonesia informal/slang
4. **Robustness**: Handle typo, variasi input, out-of-scope
5. **Performance**: Response time <100ms, memory efficient

---

## 📁 File Structure

```
PSTI-CHATBOT/
├── intents.json                    # Dataset intent
├── tokenizer.json                  # Vocabulary & tokenizer config
├── model/
│   ├── model.json                  # Model architecture
│   ├── weights.bin                 # Model weights
│   └── metadata.json               # Intent mapping & config
├── logs/
│   └── requests.jsonl              # Request logs (auto-generated)
│
# === NEW OPTIMIZED FILES ===
├── train_optimized.js              # Training script dengan tuning
├── evaluate.js                     # Evaluasi & metrics
├── preprocessor.js                 # Indonesian preprocessing
├── server_optimized.js             # Optimized server
├── test.js                         # Testing utilities
│
# === OPTIONAL ===
├── models/                         # Models dari hyperparameter tuning
│   ├── baseline/
│   ├── deeper/
│   └── bidirectional/
├── evaluation_results.json         # Hasil evaluasi
├── tuning_results.json             # Hasil hyperparameter tuning
└── test_report.json                # Hasil testing
```

---

## 🚀 Quick Start

### 1. Setup Dependencies

```bash
npm install @tensorflow/tfjs express axios
```

### 2. Prepare Dataset

Pastikan `intents.json` sudah berformat:
```json
{
  "vocabulary": [...],
  "intents": [
    {
      "tag": "greeting",
      "patterns": ["halo,hai,selamat pagi"],
      "responses": ["Halo! Ada yang bisa dibantu?"]
    }
  ]
}
```

### 3. Training

```bash
# Single training dengan config optimal
node train_optimized.js

# Hyperparameter tuning (4 configs)
node train_optimized.js --tune
```

### 4. Evaluation

```bash
node evaluate.js
```

Output:
- Overall accuracy
- Per-intent metrics (precision, recall, F1)
- Confusion matrix
- Optimal confidence threshold
- Saved to `evaluation_results.json`

### 5. Start Server

```bash
node server_optimized.js
```

Server akan jalan di `http://localhost:3000`

### 6. Testing

```bash
node test.js
```

Output:
- Intent accuracy per tag
- Typo handling test
- Out-of-scope detection
- Performance benchmark
- Saved to `test_report.json`

---

## 🔬 Strategi Evaluasi

### A. Dataset Splitting

```javascript
// evaluate.js
trainTestSplit(data, labels, testSize = 0.2)
```

- 80% training, 20% testing
- Random shuffle
- Stratified jika possible

### B. Metrics

**Per-Intent:**
- Precision: TP / (TP + FP)
- Recall: TP / (TP + FN)
- F1-Score: 2 × (Precision × Recall) / (Precision + Recall)
- Support: Jumlah sample untuk intent tersebut

**Overall:**
- Accuracy: Correct / Total
- Confusion Matrix: True label vs Predicted label

**Confidence Analysis:**
- Distribution: Histogram confidence scores
- Threshold tuning: Test berbagai threshold (0.3 - 0.9)
- Optimal threshold: Balance accuracy & coverage

### C. Cara Menjalankan

```bash
node evaluate.js
```

**Output:**
```
========================================
EVALUASI MODEL INTENT CLASSIFICATION
========================================

Overall Accuracy: 87.5%
Total Samples: 80

Per-Intent Performance:
----------------------------------------
Intent              Prec    Recall  F1      Support
----------------------------------------
greeting            95.0    90.0    92.4    10
about_psti          88.9    100.0   94.1    8
...

CONFIDENCE THRESHOLD ANALYSIS
----------------------------------------
Threshold   Accuracy    Coverage    Accepted    Rejected
0.3         82.5        95.0        76          4
0.4         85.0        92.5        74          6
0.5         87.5        88.8        71          9
...

✅ REKOMENDASI THRESHOLD: 0.5
   Accuracy: 87.5%, Coverage: 88.8%
```

---

## 🧠 Optimasi LSTM

### A. Hyperparameters yang Dioptimasi

| Parameter | Baseline | Optimized | Range to Try |
|-----------|----------|-----------|--------------|
| `lstmUnits` | 64 | 128 | 64, 96, 128, 256 |
| `embeddingDim` | 32 | 64 | 32, 64, 96, 128 |
| `dropout` | 0.2 | 0.3 | 0.2, 0.3, 0.4, 0.5 |
| `recurrentDropout` | 0.0 | 0.2 | 0.0, 0.2, 0.3 |
| `learningRate` | 0.001 | 0.001 | 0.0005, 0.001, 0.002 |
| `batchSize` | 32 | 16 | 8, 16, 32 |
| `epochs` | 50 | 100 | 50, 100, 150 |

### B. Arsitektur Model

**Baseline:**
```
Embedding (vocab_size, 32)
  ↓
LSTM (64 units)
  ↓
Dense (64, relu)
  ↓
Dense (num_classes, softmax)
```

**Optimized:**
```
Embedding (vocab_size, 64, maskZero=true)
  ↓
SpatialDropout (0.2)
  ↓
Bidirectional LSTM (128 units, dropout=0.3, recurrentDropout=0.2)
  ↓
Dense (64, relu, L2 regularization)
  ↓
Dropout (0.3)
  ↓
Dense (num_classes, softmax)
```

### C. Training Features

**Early Stopping:**
- Monitor validation loss
- Patience: 15 epochs
- Saves best model

**Class Weights:**
- Automatically calculated
- Handles imbalanced data
- Weight = total_samples / (num_classes × class_samples)

**Regularization:**
- Dropout layers
- Recurrent dropout
- L2 kernel regularization (0.01)

### D. Hyperparameter Tuning

```bash
node train_optimized.js --tune
```

Akan menjalankan 4 konfigurasi:
1. **baseline**: Model ringan
2. **deeper**: Model lebih dalam
3. **regularized**: Regularisasi tinggi
4. **bidirectional**: BiLSTM

Output:
```
HYPERPARAMETER TUNING RESULTS
==============================================

Ranked by validation accuracy:

1. bidirectional
   Val Accuracy: 88.50%
   Val Loss: 0.3245
   Train Accuracy: 92.30%
   Epochs: 78

2. deeper
   Val Accuracy: 86.20%
   ...
```

**Models disimpan di**: `./models/baseline/`, `./models/deeper/`, dll.

---

## 📝 Preprocessing Bahasa Indonesia

### A. Pipeline

```javascript
// preprocessor.js
const preprocessor = new IndonesianPreprocessor();

const text = "Halooo gan, gimana caranya daftar beasiswa???";
const processed = preprocessor.preprocess(text);
// Output: "halo teman bagaimana cara daftar beasiswa"
```

### B. Fitur Preprocessing

**1. Normalization:**
- Lowercase
- Remove repeated chars (halooo → halo)
- Remove URLs & emails
- Normalize whitespace

**2. Slang Replacement:**
- Map informal → formal
- 50+ common slang words
- Custom mapping support

Contoh mapping:
```javascript
{
  'gmn': 'bagaimana',
  'gak': 'tidak',
  'mau': 'ingin',
  'gue': 'saya',
  'lab': 'laboratorium'
}
```

**3. Special Chars Removal:**
- Keep alphanumeric + space
- Optional: keep numbers

**4. Number Normalization:**
- Replace digits with "NUM" token
- Reduces vocabulary size

**5. Stop Words (Optional):**
- Remove common words (yang, dan, di, dll)
- **Warning**: Bisa menurunkan akurasi jika konteks penting

### C. Custom Slang Mapping

```javascript
const preprocessor = new IndonesianPreprocessor();

// Add single mapping
preprocessor.addSlangMapping('wkwk', 'haha');

// Add batch mappings
preprocessor.addSlangMappings({
  'wkwk': 'haha',
  'anjir': 'wow',
  'gils': 'gila'
});
```

### D. Testing Preprocessing

```bash
node preprocessor.js
```

Output:
```
PREPROCESSING TEST RESULTS
================================================================================

1. Original:
   "Halooo gan, gimana caranya daftar beasiswa???"
   Processed:
   "halo teman bagaimana cara daftar beasiswa"
   Stats: 5 words -> 6 words
   Slang replaced: gan, gimana
```

### E. Best Practices

**✅ DO:**
- Enable slang replacement untuk bahasa santai
- Normalize repeated characters
- Keep numbers jika relevan (jam operasional, dll)

**❌ DON'T:**
- Remove stop words (bisa hilangkan konteks)
- Over-normalize (bisa hilangkan makna)
- Hardcode custom rules tanpa testing

---

## 🎚️ Confidence Threshold & Fallback

### A. Three-Level Confidence System

```javascript
// server_optimized.js
highConfidenceThreshold: 0.7    // Direct response
mediumConfidenceThreshold: 0.4  // Response + warning
// < 0.4                         // Fallback
```

**High Confidence (≥ 0.7):**
- Langsung berikan response
- User puas dengan jawaban

**Medium Confidence (0.4 - 0.7):**
- Berikan response + disclaimer
- "Saya tidak sepenuhnya yakin..."

**Low Confidence (< 0.4):**
- Fallback response
- Suggest possible intents
- Minta clarification

### B. Fallback Strategies

**Level 1: Clarification**
```
"Maaf, saya kurang memahami pertanyaan Anda. 
Bisakah Anda menjelaskan dengan kata lain?"
```

**Level 2: Suggestions**
```
"Mungkin Anda mencari informasi tentang:
- Informasi Lab PSTI
- Jam operasional
- Kontak laboratorium"
```

**Level 3: Menu**
```
"Atau ketik 'menu' untuk melihat topik yang bisa saya bantu."
```

### C. Second-Best Intent

```javascript
enableSecondBest: true
secondBestThreshold: 0.3
```

Jika confidence rendah tapi second-best ≥ 0.3:
```
"Apakah Anda menanyakan tentang [TOP_INTENT]?
Atau mungkin Anda mencari informasi tentang [SECOND_BEST]?"
```

### D. Tuning Threshold

**Manual:**
```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "highConfidenceThreshold": 0.75,
    "mediumConfidenceThreshold": 0.45
  }'
```

**Optimal dari Evaluasi:**
```bash
node evaluate.js
# Output akan merekomendasikan threshold optimal
```

**Criteria:**
- Balance accuracy (0.7) & coverage (0.3)
- Score = accuracy × 0.7 + coverage × 0.3

### E. Monitoring Confidence

```bash
curl http://localhost:3000/analytics
```

Output:
```json
{
  "totalRequests": 245,
  "averageConfidence": 0.72,
  "confidenceLevels": {
    "high": 180,
    "medium": 45,
    "low": 20
  },
  "fallbackRate": 0.082
}
```

**Target Metrics:**
- Average confidence: >0.65
- High confidence rate: >70%
- Fallback rate: <15%

---

## 🧪 Testing & Validation

### A. Test Categories

**1. Intent Accuracy Test**
- Test setiap intent dengan 5-7 variations
- Measure per-intent accuracy
- Target: >80% per intent

**2. Typo Handling Test**
- Common typos & misspellings
- Bahasa Indonesia variations
- Target: >70% accuracy

**3. Out-of-Scope Detection**
- Questions unrelated to PSTI
- Should trigger low confidence/fallback
- Target: >85% detection rate

**4. Performance Benchmark**
- Response time (target: <100ms avg)
- Throughput (target: >50 req/s)
- Memory usage

### B. Running Tests

```bash
# Full test suite
node test.js

# Custom server URL
node test.js http://localhost:3000
```

### C. Test Output

```
🧪 Starting comprehensive chatbot testing...

Testing intent: greeting
------------------------------------------------------------
✅ "halo" -> greeting (95.2%)
✅ "hai chatbot" -> greeting (92.8%)
✅ "selamat pagi" -> greeting (89.3%)
...

Accuracy for greeting: 94.3% (6/7)

...

TESTING OUT-OF-SCOPE DETECTION
================================================================================
✅ "siapa presiden Indonesia?" -> low (15.3%)
✅ "berapa 2 + 2?" -> low (8.7%)
⚠️ "cuaca hari ini" -> medium (45.2%)
...

Out-of-scope detection rate: 85.7% (6/7)

PERFORMANCE BENCHMARK (50 requests)
================================================================================
Progress: 50/50

Total time: 2341ms
Success rate: 100.0%
Average response time: 43.2ms
Min response time: 38ms
Max response time: 67ms
Throughput: 21.4 req/s

TEST SUMMARY
================================================================================

📊 Overall Results:
   Overall Accuracy: 87.3%
   Typo Handling: 75.0%
   Out-of-Scope Detection: 85.7%
   Avg Response Time: 43.2ms
   Throughput: 21.4 req/s

📈 Intent Performance:
   ✅ greeting: 94.3% (6/7)
   ✅ about_psti: 91.7% (5/6)
   ✅ lokasi_lab: 88.2% (6/7)
   ⚠️ about_projek: 66.7% (4/6)
   ...
```

### D. Interpreting Results

**Good Performance:**
- Overall accuracy >85%
- All intents >80%
- Low confidence properly handled
- Response time <100ms

**Need Improvement:**
- Any intent <70% → Add more training data
- High fallback rate (>20%) → Lower threshold or add data
- Slow response (>150ms) → Model too complex

---

## ✅ Checklist Backend Siap Uji Akademik

### 1. Model Quality

- [ ] Overall accuracy ≥85%
- [ ] All intents accuracy ≥70%
- [ ] Confusion matrix analyzed
- [ ] No severe overfitting (train-val gap <10%)
- [ ] Model architecture documented

### 2. Evaluation & Metrics

- [ ] Train/test split implemented
- [ ] Cross-validation considered
- [ ] Precision, recall, F1 calculated per intent
- [ ] Confidence distribution analyzed
- [ ] Optimal threshold determined
- [ ] Results saved to JSON

### 3. Preprocessing

- [ ] Indonesian slang handling
- [ ] Typo tolerance tested
- [ ] Input variations tested
- [ ] Preprocessing pipeline documented
- [ ] Statistics logged

### 4. Backend System

- [ ] Server starts without errors
- [ ] All endpoints functional:
  - [ ] POST /chat
  - [ ] GET /health
  - [ ] GET /analytics
  - [ ] POST /config
- [ ] Error handling implemented
- [ ] Logging enabled
- [ ] Response time monitored

### 5. Confidence & Fallback

- [ ] Three-level confidence system
- [ ] Thresholds tuned
- [ ] Fallback messages clear
- [ ] Second-best intent enabled
- [ ] Out-of-scope detection working

### 6. Testing

- [ ] All intents tested
- [ ] Typo handling validated
- [ ] Out-of-scope detection tested
- [ ] Performance benchmarked
- [ ] Test report generated

### 7. Documentation

- [ ] README.md complete
- [ ] API endpoints documented
- [ ] Model architecture explained
- [ ] Hyperparameters documented
- [ ] Training process documented
- [ ] Evaluation methodology explained

### 8. Code Quality

- [ ] Code commented
- [ ] Error handling comprehensive
- [ ] No hardcoded values (use config)
- [ ] Modular & reusable
- [ ] Dependencies listed in package.json

### 9. Academic Requirements

- [ ] Metodologi explained (supervised learning, LSTM)
- [ ] Dataset characteristics documented
- [ ] Evaluation metrics standard (P, R, F1)
- [ ] Results reproducible
- [ ] Limitations acknowledged
- [ ] Future work identified

### 10. Deployment Ready

- [ ] No native bindings (pure JS)
- [ ] No database required
- [ ] Lightweight (<100MB total)
- [ ] Portable (single folder)
- [ ] Config via environment/file

---

## 📊 Expected Results

### Baseline Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Overall Accuracy | >85% | 80-90% |
| Per-Intent Accuracy | >70% | 65-95% |
| Typo Handling | >70% | 60-80% |
| Out-of-Scope Detection | >85% | 80-95% |
| Avg Response Time | <100ms | 40-80ms |
| Throughput | >50 req/s | 20-60 req/s |
| Fallback Rate | <15% | 8-20% |

### After Optimization

| Metric | Expected Improvement |
|--------|---------------------|
| Overall Accuracy | +5-10% |
| Confidence Calibration | Better distribution |
| Response Time | -20-30% (caching) |
| Typo Tolerance | +10-15% |

---

## 🔧 Troubleshooting

### Problem: Low Accuracy (<70%)

**Solusi:**
1. Add more training data per intent (target: 15-20 patterns)
2. Increase model complexity (more LSTM units)
3. Improve preprocessing (better slang mapping)
4. Check data quality (duplikasi, noise)

### Problem: High Overfitting (train>95%, val<80%)

**Solusi:**
1. Increase dropout (0.3 → 0.4)
2. Add L2 regularization
3. Reduce model size
4. Add more training data
5. Data augmentation (paraphrase patterns)

### Problem: Slow Response Time (>150ms)

**Solusi:**
1. Reduce model size (smaller LSTM units)
2. Use simpler architecture
3. Batch predictions
4. Caching untuk frequent queries

### Problem: Poor Out-of-Scope Detection

**Solusi:**
1. Lower high confidence threshold (0.7 → 0.6)
2. Tune fallback thresholds
3. Add "unknown" intent dengan negative samples
4. Train on more diverse data

---

## 📚 References & Resources

### TensorFlow.js
- [Official Docs](https://js.tensorflow.org/)
- [LSTM Guide](https://js.tensorflow.org/api/latest/#layers.lstm)
- [Training Best Practices](https://www.tensorflow.org/js/guide/train_models)

### Intent Classification
- [Chatbot Intent Classification](https://towardsdatascience.com/intent-classification-demystifying-rasanlu-part-4-685fc02a54e0)
- [Confidence Calibration](https://machinelearningmastery.com/calibrated-prediction-probabilities/)

### Bahasa Indonesia NLP
- [Indonesian NLP Resources](https://github.com/kmkurn/id-nlp-resource)
- [Slang Normalization](https://www.semanticscholar.org/paper/Indonesian-Slang-to-Formal-Text-Normalization-Using)

---

## 🎓 Academic Notes

**Metodologi:**
- Supervised Learning
- Sequence Classification
- Recurrent Neural Networks (LSTM/BiLSTM)

**Evaluation:**
- Train/Test Split (80/20)
- Metrics: Accuracy, Precision, Recall, F1-Score
- Confusion Matrix Analysis

**Limitations:**
- Small dataset (16 intents, ~100 patterns)
- Limited to PSTI domain
- Bahasa Indonesia informal only
- No context/multi-turn support

**Future Work:**
- Context-aware responses
- Multi-turn conversation
- Entity extraction
- Integration dengan database
- Active learning untuk improve dataset

---

## 📞 Support

Untuk pertanyaan atau issue:
1. Check documentation ini
2. Run `node test.js` untuk diagnostics
3. Check `logs/requests.jsonl` untuk error logs
4. Review `evaluation_results.json` untuk metrics

**Common Commands:**
```bash
# Check server health
curl http://localhost:3000/health

# Send test message
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "halo"}'

# View analytics
curl http://localhost:3000/analytics

# Run full evaluation
node evaluate.js && node test.js
```

---

**Last Updated:** 2025
**Version:** 1.0
**Maintainer:** PSTI Team
