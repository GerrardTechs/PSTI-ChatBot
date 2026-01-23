/**
 * OPTIMIZED SERVER - PSTI CHATBOT
 * Express server dengan confidence tuning, fallback strategies, dan monitoring
 * 
 * Features:
 * - Dynamic confidence threshold
 * - Multi-level fallback responses
 * - Request logging & analytics
 * - Batch prediction support
 * - Health check endpoint
 */

const express = require('express');
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const { IndonesianPreprocessor } = require('./preprocessor');

class ChatbotServer {
  constructor(config = {}) {
    this.app = express();
    this.preprocessor = new IndonesianPreprocessor();
    
    // Configuration
    this.config = {
      port: config.port || 3000,
      modelPath: config.modelPath || './model/model.json',
      tokenizerPath: config.tokenizerPath || './tokenizer.json',
      intentsPath: config.intentsPath || './intents.json',
      metadataPath: config.metadataPath || './model/metadata.json',
      
      // Confidence thresholds
      highConfidenceThreshold: config.highConfidenceThreshold || 0.7,
      mediumConfidenceThreshold: config.mediumConfidenceThreshold || 0.4,
      
      // Fallback behavior
      enableSecondBest: config.enableSecondBest !== false,
      secondBestThreshold: config.secondBestThreshold || 0.3,
      
      // Logging
      enableLogging: config.enableLogging !== false,
      logFilePath: config.logFilePath || './logs/requests.jsonl',
      
      ...config
    };
    
    // Initialize
    this.model = null;
    this.tokenizer = null;
    this.intents = null;
    this.metadata = null;
    this.requestLog = [];
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });
    
    // Request logging middleware
    if (this.config.enableLogging) {
      this.app.use((req, res, next) => {
        req.startTime = Date.now();
        next();
      });
    }
  }

  /**
   * Load model, tokenizer, and intents
   */
  async initialize() {
    console.log('🚀 Initializing chatbot server...\n');
    
    try {
      // Load model
      console.log('📦 Loading model...');
      this.model = await tf.loadLayersModel(`file://${this.config.modelPath}`);
      console.log('   ✅ Model loaded');
      
      // Load tokenizer
      console.log('📚 Loading tokenizer...');
      this.tokenizer = JSON.parse(fs.readFileSync(this.config.tokenizerPath, 'utf8'));
      console.log('   ✅ Tokenizer loaded');
      
      // Load intents
      console.log('💬 Loading intents...');
      this.intents = JSON.parse(fs.readFileSync(this.config.intentsPath, 'utf8'));
      console.log('   ✅ Intents loaded');
      
      // Load metadata
      if (fs.existsSync(this.config.metadataPath)) {
        this.metadata = JSON.parse(fs.readFileSync(this.config.metadataPath, 'utf8'));
        console.log('   ✅ Metadata loaded');
      }
      
      // Create logs directory
      if (this.config.enableLogging) {
        const logDir = this.config.logFilePath.substring(0, this.config.logFilePath.lastIndexOf('/'));
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      }
      
      console.log('\n✅ Server initialized successfully!\n');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess & tokenize text
   */
  tokenize(text) {
    const processed = this.preprocessor.preprocess(text, {
      replaceSlang: true,
      normalizeNumbers: true
    });
    
    const words = processed.split(' ');
    const maxLen = this.tokenizer.max_length;
    
    const sequence = words.map(word => {
      return this.tokenizer.word_index[word] || 0;
    });
    
    // Padding
    const padded = new Array(maxLen).fill(0);
    for (let i = 0; i < Math.min(sequence.length, maxLen); i++) {
      padded[i] = sequence[i];
    }
    
    return { tokens: padded, processedText: processed };
  }

  /**
   * Predict intent with confidence scores
   */
  async predict(text) {
    const { tokens, processedText } = this.tokenize(text);
    
    // Create tensor
    const inputTensor = tf.tensor2d([tokens]);
    
    // Predict
    const prediction = await this.model.predict(inputTensor).array();
    inputTensor.dispose();
    
    // Get all predictions with confidences
    const predictions = prediction[0].map((confidence, idx) => ({
      intent: this.getIntentByIndex(idx),
      confidence: confidence,
      index: idx
    }));
    
    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    return {
      text: text,
      processedText: processedText,
      predictions: predictions,
      topIntent: predictions[0],
      secondBest: predictions[1]
    };
  }

  /**
   * Get intent tag by index
   */
  getIntentByIndex(index) {
    if (this.metadata && this.metadata.intentMap) {
      const intentMap = this.metadata.intentMap;
      for (const [tag, idx] of Object.entries(intentMap)) {
        if (idx === index) return tag;
      }
    }
    
    // Fallback: use intents array order
    return this.intents.intents[index]?.tag || 'unknown';
  }

  /**
   * Get response for intent
   */
  getResponse(intentTag) {
    const intent = this.intents.intents.find(i => i.tag === intentTag);
    
    if (intent && intent.responses && intent.responses.length > 0) {
      // Random response
      const randomIdx = Math.floor(Math.random() * intent.responses.length);
      return intent.responses[randomIdx];
    }
    
    return null;
  }

  /**
   * Generate response with confidence-based fallback
   */
  generateResponse(predictionResult) {
    const { topIntent, secondBest, text, processedText } = predictionResult;
    
    let response = {
      intent: topIntent.intent,
      confidence: topIntent.confidence,
      confidenceLevel: 'high',
      fallbackUsed: false
    };
    
    // HIGH CONFIDENCE
    if (topIntent.confidence >= this.config.highConfidenceThreshold) {
      const intentResponse = this.getResponse(topIntent.intent);
      
      if (intentResponse) {
        response.message = intentResponse;
        response.confidenceLevel = 'high';
      } else {
        // Intent recognized but no response available
        response.message = 'Maaf, saya mengerti pertanyaan Anda tapi belum ada respons yang tersedia.';
        response.fallbackUsed = true;
        response.fallbackReason = 'no_response_available';
      }
    }
    // MEDIUM CONFIDENCE
    else if (topIntent.confidence >= this.config.mediumConfidenceThreshold) {
      const intentResponse = this.getResponse(topIntent.intent);
      
      if (intentResponse) {
        response.message = `${intentResponse}\n\n(Catatan: Saya tidak sepenuhnya yakin dengan jawaban ini. Confidence: ${(topIntent.confidence * 100).toFixed(1)}%)`;
        response.confidenceLevel = 'medium';
      } else {
        response.message = this.getMediumConfidenceFallback(topIntent, secondBest);
        response.fallbackUsed = true;
        response.fallbackReason = 'medium_confidence';
      }
    }
    // LOW CONFIDENCE
    else {
      response.message = this.getLowConfidenceFallback(topIntent, secondBest);
      response.confidenceLevel = 'low';
      response.fallbackUsed = true;
      response.fallbackReason = 'low_confidence';
      
      // Include second best if enabled
      if (this.config.enableSecondBest && secondBest.confidence >= this.config.secondBestThreshold) {
        response.secondBestIntent = secondBest.intent;
        response.secondBestConfidence = secondBest.confidence;
      }
    }
    
    return response;
  }

  /**
   * Fallback untuk medium confidence
   */
  getMediumConfidenceFallback(topIntent, secondBest) {
    const messages = [
      `Apakah Anda menanyakan tentang ${this.getIntentDescription(topIntent.intent)}?`,
      `Saya kurang yakin, tapi mungkin Anda ingin tahu tentang ${this.getIntentDescription(topIntent.intent)}?`
    ];
    
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    
    if (this.config.enableSecondBest && secondBest.confidence >= this.config.secondBestThreshold) {
      return `${randomMsg}\n\nAtau mungkin Anda mencari informasi tentang ${this.getIntentDescription(secondBest.intent)}?`;
    }
    
    return randomMsg;
  }

  /**
   * Fallback untuk low confidence
   */
  getLowConfidenceFallback(topIntent, secondBest) {
    const fallbackMessages = [
      'Maaf, saya kurang memahami pertanyaan Anda. Bisakah Anda menjelaskan dengan kata lain?',
      'Saya belum mengerti pertanyaan Anda. Coba tanyakan dengan cara berbeda ya!',
      'Mohon maaf, saya belum bisa menjawab pertanyaan tersebut. Bisa dijelaskan lebih detail?'
    ];
    
    let message = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    // Suggest possible intents
    if (this.config.enableSecondBest) {
      const suggestions = [topIntent, secondBest]
        .filter(p => p.confidence >= 0.2)
        .slice(0, 2)
        .map(p => this.getIntentDescription(p.intent))
        .filter(Boolean);
      
      if (suggestions.length > 0) {
        message += `\n\nMungkin Anda mencari informasi tentang:\n- ${suggestions.join('\n- ')}`;
      }
    }
    
    message += '\n\nAtau ketik "menu" untuk melihat topik yang bisa saya bantu.';
    
    return message;
  }

  /**
   * Get human-readable intent description
   */
  getIntentDescription(intentTag) {
    const descriptions = {
      'greeting': 'sapaan dan perkenalan',
      'goodbye': 'penutup percakapan',
      'thanks': 'ucapan terima kasih',
      'about_psti': 'informasi Lab PSTI',
      'about_Reka&PSTI': 'hubungan PSTI dengan Reka Inovasi',
      'about_Skill': 'skill yang bisa dipelajari',
      'about_mhsreka24': 'mahasiswa beasiswa 2024',
      'about_mhsreka25': 'mahasiswa beasiswa 2025',
      'info_beasiswa': 'informasi beasiswa',
      'about_projek': 'proyek-proyek yang ada',
      'fasilitas_lab': 'fasilitas laboratorium',
      'aturan_lab': 'aturan laboratorium',
      'kontak_lab': 'kontak laboratorium',
      'jam_operasional': 'jam operasional',
      'lokasi_lab': 'lokasi laboratorium',
      'syarat_akses': 'syarat akses lab'
    };
    
    return descriptions[intentTag] || intentTag;
  }

  /**
   * Log request
   */
  logRequest(req, result, responseTime) {
    if (!this.config.enableLogging) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      input: result.text,
      processedInput: result.processedText,
      intent: result.topIntent.intent,
      confidence: result.topIntent.confidence,
      confidenceLevel: result.confidenceLevel,
      fallbackUsed: result.fallbackUsed,
      responseTime: responseTime,
      ip: req.ip
    };
    
    // In-memory log (últimos 1000)
    this.requestLog.push(logEntry);
    if (this.requestLog.length > 1000) {
      this.requestLog.shift();
    }
    
    // Append to file (JSONL format)
    fs.appendFileSync(
      this.config.logFilePath,
      JSON.stringify(logEntry) + '\n'
    );
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        model: this.model ? 'loaded' : 'not_loaded',
        timestamp: new Date().toISOString()
      });
    });

    // Chat endpoint
    this.app.post('/chat', async (req, res) => {
      try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Please provide a "message" field'
          });
        }
        
        // Predict
        const predictionResult = await this.predict(message);
        
        // Generate response
        const response = this.generateResponse(predictionResult);
        
        // Log
        const responseTime = Date.now() - req.startTime;
        this.logRequest(req, { ...predictionResult, ...response }, responseTime);
        
        res.json({
          message: response.message,
          intent: response.intent,
          confidence: response.confidence,
          confidenceLevel: response.confidenceLevel,
          fallbackUsed: response.fallbackUsed,
          ...(response.secondBestIntent && {
            secondBest: {
              intent: response.secondBestIntent,
              confidence: response.secondBestConfidence
            }
          })
        });
        
      } catch (error) {
        console.error('Error in /chat:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: 'Maaf, terjadi kesalahan. Silakan coba lagi.'
        });
      }
    });

    // Batch prediction
    this.app.post('/batch-predict', async (req, res) => {
      try {
        const { messages } = req.body;
        
        if (!Array.isArray(messages)) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Please provide a "messages" array'
          });
        }
        
        const results = await Promise.all(
          messages.map(async (message) => {
            const predictionResult = await this.predict(message);
            const response = this.generateResponse(predictionResult);
            return {
              input: message,
              ...response
            };
          })
        );
        
        res.json({ results });
        
      } catch (error) {
        console.error('Error in /batch-predict:', error);
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    });

    // Analytics endpoint
    this.app.get('/analytics', (req, res) => {
      const stats = this.getAnalytics();
      res.json(stats);
    });

    // Configuration endpoint
    this.app.get('/config', (req, res) => {
      res.json({
        highConfidenceThreshold: this.config.highConfidenceThreshold,
        mediumConfidenceThreshold: this.config.mediumConfidenceThreshold,
        secondBestThreshold: this.config.secondBestThreshold,
        enableSecondBest: this.config.enableSecondBest
      });
    });

    // Update configuration
    this.app.post('/config', (req, res) => {
      const updates = req.body;
      
      if (updates.highConfidenceThreshold !== undefined) {
        this.config.highConfidenceThreshold = updates.highConfidenceThreshold;
      }
      if (updates.mediumConfidenceThreshold !== undefined) {
        this.config.mediumConfidenceThreshold = updates.mediumConfidenceThreshold;
      }
      if (updates.secondBestThreshold !== undefined) {
        this.config.secondBestThreshold = updates.secondBestThreshold;
      }
      
      res.json({
        message: 'Configuration updated',
        config: {
          highConfidenceThreshold: this.config.highConfidenceThreshold,
          mediumConfidenceThreshold: this.config.mediumConfidenceThreshold,
          secondBestThreshold: this.config.secondBestThreshold
        }
      });
    });
  }

  /**
   * Get analytics from request logs
   */
  getAnalytics() {
    if (this.requestLog.length === 0) {
      return { message: 'No data available' };
    }
    
    const totalRequests = this.requestLog.length;
    const intentCounts = {};
    Levels = { high: 0, medium: 0, low: 0 };
    const fallbackCount = this.requestLog.filter(r => r.fallbackUsed).length;
    let totalConfidence = 0;
    let totalResponseTime = 0;
    
    this.requestLog.forEach(log => {
      intentCounts[log.intent] = (intentCounts[log.intent] || 0) + 1;
      confidenceLevels[log.confidenceLevel]++;
      totalConfidence += log.confidence;
      totalResponseTime += log.responseTime;
    });
    
    return {
      totalRequests,
      averageConfidence: totalConfidence / totalRequests,
      averageResponseTime: totalResponseTime / totalRequests,
      confidenceLevels,
      fallbackRate: fallbackCount / totalRequests,
      intentDistribution: intentCounts,
      topIntents: Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count, percentage: (count / totalRequests * 100).toFixed(1) }))
    };
  }

  /**
   * Start server
   */
  async start() {
    await this.initialize();
    
    this.app.listen(this.config.port, () => {
      console.log(`🚀 Chatbot server running on port ${this.config.port}`);
      console.log(`   Health check: http://localhost:${this.config.port}/health`);
      console.log(`   Chat endpoint: http://localhost:${this.config.port}/chat`);
      console.log(`   Analytics: http://localhost:${this.config.port}/analytics`);
      console.log(`\n   Confidence thresholds:`);
      console.log(`   - High: ${this.config.highConfidenceThreshold}`);
      console.log(`   - Medium: ${this.config.mediumConfidenceThreshold}`);
      console.log(`   - Second best: ${this.config.secondBestThreshold}`);
    });
  }
}

/**
 * MAIN
 */
if (require.main === module) {
  const server = new ChatbotServer({
    port: process.env.PORT || 3000,
    highConfidenceThreshold: 0.7,
    mediumConfidenceThreshold: 0.4,
    secondBestThreshold: 0.3
  });
  
  server.start().catch(console.error);
}

module.exports = { ChatbotServer };
