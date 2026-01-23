# 🤖 PSTI Chatbot - Optimized Version

Chatbot intent classification untuk Lab PSTI menggunakan **LSTM + TensorFlow.js murni** (tanpa native bindings, tanpa database).

## 🎯 Features

✅ **Model Optimization**
- Bidirectional LSTM dengan regularisasi
- Hyperparameter tuning otomatis
- Early stopping & class weights

✅ **Evaluation System**
- Train/test split dengan cross-validation
- Per-intent metrics (Precision, Recall, F1)
- Confusion matrix & confidence analysis
- Optimal threshold finder

✅ **Indonesian Preprocessing**
- Slang normalization (50+ mappings)
- Typo tolerance
- Number normalization
- Customizable pipeline

✅ **Smart Fallback**
- Three-level confidence system (high/medium/low)
- Dynamic threshold tuning
- Second-best intent suggestion
- Out-of-scope detection

✅ **Comprehensive Testing**
- Intent accuracy testing
- Typo handling validation
- Out-of-scope detection
- Performance benchmarking

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Prepare Dataset

Pastikan `intents.json` tersedia dengan format:
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

### 3. Train Model

```bash
# Single training
npm run train

# Hyperparameter tuning (4 configs)
npm run train:tune
```

### 4. Evaluate Model

```bash
npm run evaluate
```

Output:
- Overall accuracy
- Per-intent performance
- Confusion matrix
- **Optimal confidence threshold**
- Saved to `evaluation_results.json`

### 5. Run Tests

```bash
npm run test
```

Tests:
- Intent accuracy (all intents)
- Typo handling
- Out-of-scope detection
- Performance benchmark

### 6. Start Server

```bash
npm start
```

Server running at `http://localhost:3000`

## 📡 API Endpoints

### POST /chat
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "halo lab PSTI"}'
```

Response:
```json
{
  "message": "Halo! Selamat datang di Chatbot Beasiswa Reka Inovasi PSTI UBL",
  "intent": "greeting",
  "confidence": 0.952,
  "confidenceLevel": "high",
  "fallbackUsed": false
}
```

### GET /health
```bash
curl http://localhost:3000/health
```

### GET /analytics
```bash
curl http://localhost:3000/analytics
```

Response:
```json
{
  "totalRequests": 245,
  "averageConfidence": 0.72,
  "confidenceLevels": {
    "high": 180,
    "medium": 45,
    "low": 20
  },
  "fallbackRate": 0.082,
  "topIntents": [...]
}
```

### POST /config (Update thresholds)
```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{
    "highConfidenceThreshold": 0.75,
    "mediumConfidenceThreshold": 0.45
  }'
```

## 📊 Expected Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Overall Accuracy | >85% | 80-90% |
| Per-Intent Accuracy | >70% | 65-95% |
| Typo Handling | >70% | 60-80% |
| Out-of-Scope Detection | >85% | 80-95% |
| Avg Response Time | <100ms | 40-80ms |

## 🔧 Configuration

Edit dalam file atau via API:

```javascript
// server_optimized.js
const server = new ChatbotServer({
  port: 3000,
  highConfidenceThreshold: 0.7,     // Direct response
  mediumConfidenceThreshold: 0.4,   // Response + warning
  secondBestThreshold: 0.3,         // Show alternatives
  enableSecondBest: true,
  enableLogging: true
});
```

## 📁 File Structure

```
├── intents.json                 # Dataset
├── tokenizer.json               # Vocabulary
├── model/                       # Trained model
│   ├── model.json
│   ├── weights.bin
│   └── metadata.json
├── train_optimized.js           # Training script
├── evaluate.js                  # Evaluation
├── preprocessor.js              # Indonesian preprocessing
├── server_optimized.js          # Optimized server
├── test.js                      # Testing suite
├── OPTIMIZATION_GUIDE.md        # Full documentation
└── package.json
```

## 📚 Documentation

Baca **[OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)** untuk:
- Detailed explanation setiap component
- Hyperparameter tuning guide
- Preprocessing best practices
- Confidence threshold tuning
- Troubleshooting
- Academic notes

## 🎓 Academic Checklist

- [x] Supervised learning methodology
- [x] Train/test split evaluation
- [x] Standard metrics (P, R, F1, accuracy)
- [x] Confusion matrix analysis
- [x] Confidence calibration
- [x] Reproducible results
- [x] Documentation complete
- [x] No external dependencies (pure JS)
- [x] Lightweight & portable

## 🧪 Testing Commands

```bash
# Full pipeline
npm run full-pipeline

# Individual tests
npm run train
npm run evaluate
npm run test
npm run test:preprocessor

# Development mode
npm run dev
```

## 📈 Monitoring

**View Logs:**
```bash
tail -f logs/requests.jsonl
```

**View Results:**
```bash
cat evaluation_results.json
cat test_report.json
cat tuning_results.json
```

## 🔍 Troubleshooting

### Low Accuracy (<70%)
1. Add more training data
2. Increase LSTM units
3. Improve slang mapping
4. Run hyperparameter tuning: `npm run train:tune`

### Slow Response (>150ms)
1. Reduce model complexity
2. Use smaller LSTM units
3. Implement caching

### Poor Out-of-Scope Detection
1. Lower thresholds
2. Add "unknown" intent
3. Train on diverse data

See [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) for detailed solutions.

## 📞 Support

**Check Health:**
```bash
curl http://localhost:3000/health
```

**Test Message:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**Run Diagnostics:**
```bash
npm run evaluate && npm run test
```

## 🎯 Next Steps

1. **Evaluate baseline:**
   ```bash
   npm run evaluate
   ```

2. **Tune hyperparameters:**
   ```bash
   npm run train:tune
   ```

3. **Select best model** dari `tuning_results.json`

4. **Test thoroughly:**
   ```bash
   npm run test
   ```

5. **Deploy** dengan confidence threshold optimal

## 📝 License

MIT

## 👥 Contributors

PSTI Team - Universitas Bandar Lampung

---

**Ready untuk ujian akademik!** ✅

Semua metrics, evaluasi, dan dokumentasi sudah lengkap dan sesuai standar academic research.
# PSTI-ChatBot
