/**
 * TESTING UTILITIES - PSTI CHATBOT
 * Comprehensive testing untuk validasi backend chatbot
 * 
 * Features:
 * - Test cases untuk setiap intent
 * - Out-of-scope detection testing
 * - Typo/variation handling
 * - Batch testing
 * - Performance benchmarking
 */

const axios = require('axios');
const fs = require('fs');

class ChatbotTester {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.testResults = [];
  }

  /**
   * Test cases untuk setiap intent
   */
  getTestCases() {
    return {
      greeting: [
        'halo',
        'hai chatbot',
        'selamat pagi',
        'hi',
        'assalamualaikum',
        'halooo',
        'hey'
      ],
      goodbye: [
        'bye',
        'sampai jumpa',
        'dadah',
        'goodbye',
        'see you',
        'byee'
      ],
      thanks: [
        'terima kasih',
        'makasih',
        'thanks',
        'thx',
        'terima kasih banyak',
        'makasi ya'
      ],
      about_psti: [
        'apa itu lab PSTI?',
        'PSTI itu apa?',
        'lab PSTI apaan?',
        'ceritain tentang PSTI',
        'info lab PSTI dong',
        'PSTI singkatan dari apa?'
      ],
      'about_Reka&PSTI': [
        'apa hubungannya PSTI dengan reka inovasi?',
        'hubungan PSTI dan beasiswa reka inovasi',
        'kenapa ada beasiswa di PSTI?',
        'gimana PSTI bisa kasih beasiswa?'
      ],
      about_Skill: [
        'skill apa yang bisa dipelajari?',
        'bisa belajar apa di PSTI?',
        'skill apa aja yang bisa didapat?',
        'mau belajar apa di sini?'
      ],
      info_beasiswa: [
        'gimana cara daftar beasiswa?',
        'cara dapetin beasiswa reka inovasi',
        'syarat beasiswa apa aja?',
        'kapan buka pendaftaran beasiswa?',
        'info beasiswa dong'
      ],
      about_projek: [
        'projek apa aja yang udah dibuat?',
        'ada projek apa di lab?',
        'contoh projek reka inovasi',
        'mau lihat hasil projek'
      ],
      fasilitas_lab: [
        'fasilitas apa aja yang ada di lab?',
        'apa aja fasilitas PSTI?',
        'alat apa yang tersedia?',
        'ada fasilitas apa?'
      ],
      aturan_lab: [
        'aturan lab apa aja?',
        'peraturan di PSTI gimana?',
        'boleh ngapain aja di lab?',
        'ada aturan khusus gak?'
      ],
      kontak_lab: [
        'kontak lab PSTI',
        'mau hubungi lab gimana?',
        'nomor telepon PSTI',
        'email lab apa?',
        'cara kontak lab'
      ],
      jam_operasional: [
        'jam buka lab berapa?',
        'kapan lab buka?',
        'jam operasional PSTI',
        'lab tutup jam berapa?',
        'buka hari apa aja?'
      ],
      lokasi_lab: [
        'dimana lokasi lab?',
        'lab PSTI ada dimana?',
        'alamat lab',
        'cara ke lab PSTI',
        'lokasinya dimana?'
      ],
      syarat_akses: [
        'syarat akses lab apa?',
        'siapa yang boleh masuk lab?',
        'bisa akses lab gimana?',
        'perlu KTM gak?'
      ],
      out_of_scope: [
        'siapa presiden Indonesia?',
        'berapa 2 + 2?',
        'cuaca hari ini',
        'resep nasi goreng',
        'cara naik gunung',
        'download film dimana?',
        'harga HP terbaru'
      ]
    };
  }

  /**
   * Test typo & variation handling
   */
  getTypoTestCases() {
    return [
      { input: 'hallo lab psti', expected_intent: 'greeting' },
      { input: 'gmn cara dftar beasiswa', expected_intent: 'info_beasiswa' },
      { input: 'dmna loksi lab', expected_intent: 'lokasi_lab' },
      { input: 'jam operasinal lab', expected_intent: 'jam_operasional' },
      { input: 'kontak labnya dmna', expected_intent: 'kontak_lab' },
      { input: 'mksh bnyak', expected_intent: 'thanks' }
    ];
  }

  /**
   * Send single request to chatbot
   */
  async sendMessage(message) {
    try {
      const response = await axios.post(`${this.serverUrl}/chat`, {
        message: message
      });
      return response.data;
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * Test single intent
   */
  async testIntent(intentTag, testCases) {
    console.log(`\nTesting intent: ${intentTag}`);
    console.log('-'.repeat(60));
    
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const response = await this.sendMessage(testCase);
        
        const correct = response.intent === intentTag;
        const result = {
          input: testCase,
          expected: intentTag,
          predicted: response.intent,
          confidence: response.confidence,
          correct: correct,
          confidenceLevel: response.confidenceLevel
        };
        
        results.push(result);
        
        const status = correct ? '✅' : '❌';
        const conf = (response.confidence * 100).toFixed(1);
        console.log(`${status} "${testCase}" -> ${response.intent} (${conf}%)`);
        
      } catch (error) {
        console.log(`❌ "${testCase}" -> ERROR: ${error.message}`);
        results.push({
          input: testCase,
          expected: intentTag,
          error: error.message
        });
      }
    }
    
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = (correctCount / results.length * 100).toFixed(1);
    
    console.log(`\nAccuracy for ${intentTag}: ${accuracy}% (${correctCount}/${results.length})`);
    
    return {
      intent: intentTag,
      results: results,
      accuracy: accuracy,
      correctCount: correctCount,
      totalCount: results.length
    };
  }

  /**
   * Test all intents
   */
  async testAllIntents() {
    console.log('='.repeat(80));
    console.log('TESTING ALL INTENTS');
    console.log('='.repeat(80));
    
    const testCases = this.getTestCases();
    const intentResults = [];
    
    for (const [intentTag, cases] of Object.entries(testCases)) {
      const result = await this.testIntent(intentTag, cases);
      intentResults.push(result);
      
      // Small delay between intents
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return intentResults;
  }

  /**
   * Test typo handling
   */
  async testTypoHandling() {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING TYPO HANDLING');
    console.log('='.repeat(80));
    
    const typoCases = this.getTypoTestCases();
    const results = [];
    
    for (const testCase of typoCases) {
      try {
        const response = await this.sendMessage(testCase.input);
        
        const correct = response.intent === testCase.expected_intent;
        const result = {
          input: testCase.input,
          expected: testCase.expected_intent,
          predicted: response.intent,
          confidence: response.confidence,
          correct: correct
        };
        
        results.push(result);
        
        const status = correct ? '✅' : '❌';
        const conf = (response.confidence * 100).toFixed(1);
        console.log(`${status} "${testCase.input}"`);
        console.log(`   Expected: ${testCase.expected_intent}, Got: ${response.intent} (${conf}%)`);
        
      } catch (error) {
        console.log(`❌ "${testCase.input}" -> ERROR`);
      }
    }
    
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = (correctCount / results.length * 100).toFixed(1);
    
    console.log(`\nTypo handling accuracy: ${accuracy}% (${correctCount}/${results.length})`);
    
    return {
      accuracy: accuracy,
      results: results
    };
  }

  /**
   * Test out-of-scope detection
   */
  async testOutOfScope() {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING OUT-OF-SCOPE DETECTION');
    console.log('='.repeat(80));
    
    const testCases = this.getTestCases().out_of_scope;
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const response = await this.sendMessage(testCase);
        
        // Out-of-scope should have low confidence or fallback
        const properlyHandled = response.confidenceLevel === 'low' || response.fallbackUsed;
        
        results.push({
          input: testCase,
          confidence: response.confidence,
          confidenceLevel: response.confidenceLevel,
          fallbackUsed: response.fallbackUsed,
          properlyHandled: properlyHandled
        });
        
        const status = properlyHandled ? '✅' : '⚠️';
        const conf = (response.confidence * 100).toFixed(1);
        console.log(`${status} "${testCase}" -> ${response.confidenceLevel} (${conf}%)`);
        
      } catch (error) {
        console.log(`❌ "${testCase}" -> ERROR`);
      }
    }
    
    const properlyHandledCount = results.filter(r => r.properlyHandled).length;
    const rate = (properlyHandledCount / results.length * 100).toFixed(1);
    
    console.log(`\nOut-of-scope detection rate: ${rate}% (${properlyHandledCount}/${results.length})`);
    
    return {
      detectionRate: rate,
      results: results
    };
  }

  /**
   * Performance benchmark
   */
  async benchmarkPerformance(numRequests = 100) {
    console.log('\n' + '='.repeat(80));
    console.log(`PERFORMANCE BENCHMARK (${numRequests} requests)`);
    console.log('='.repeat(80));
    
    const testCases = this.getTestCases();
    const allCases = Object.values(testCases).flat();
    
    const responseTimes = [];
    let successCount = 0;
    
    const startTime = Date.now();
    
    for (let i = 0; i < numRequests; i++) {
      const testCase = allCases[Math.floor(Math.random() * allCases.length)];
      
      try {
        const reqStart = Date.now();
        await this.sendMessage(testCase);
        const reqTime = Date.now() - reqStart;
        
        responseTimes.push(reqTime);
        successCount++;
        
      } catch (error) {
        // Ignore errors for benchmark
      }
      
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\rProgress: ${i + 1}/${numRequests}`);
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n');
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Success rate: ${(successCount / numRequests * 100).toFixed(1)}%`);
    console.log(`Average response time: ${(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)}ms`);
    console.log(`Min response time: ${Math.min(...responseTimes)}ms`);
    console.log(`Max response time: ${Math.max(...responseTimes)}ms`);
    console.log(`Throughput: ${(numRequests / (totalTime / 1000)).toFixed(1)} req/s`);
    
    return {
      totalTime,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      throughput: numRequests / (totalTime / 1000),
      successRate: successCount / numRequests
    };
  }

  /**
   * Generate test report
   */
  generateReport(intentResults, typoResults, outOfScopeResults, benchmarkResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIntents: intentResults.length,
        overallAccuracy: (
          intentResults.reduce((sum, r) => sum + parseFloat(r.accuracy), 0) / 
          intentResults.length
        ).toFixed(1),
        typoHandlingAccuracy: typoResults.accuracy,
        outOfScopeDetectionRate: outOfScopeResults.detectionRate,
        averageResponseTime: benchmarkResults.averageResponseTime,
        throughput: benchmarkResults.throughput
      },
      intentResults: intentResults,
      typoResults: typoResults,
      outOfScopeResults: outOfScopeResults,
      benchmarkResults: benchmarkResults
    };
    
    return report;
  }

  /**
   * Print summary report
   */
  printSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n📊 Overall Results:`);
    console.log(`   Overall Accuracy: ${report.summary.overallAccuracy}%`);
    console.log(`   Typo Handling: ${report.summary.typoHandlingAccuracy}%`);
    console.log(`   Out-of-Scope Detection: ${report.summary.outOfScopeDetectionRate}%`);
    console.log(`   Avg Response Time: ${report.summary.averageResponseTime.toFixed(1)}ms`);
    console.log(`   Throughput: ${report.summary.throughput.toFixed(1)} req/s`);
    
    console.log(`\n📈 Intent Performance:`);
    report.intentResults
      .sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy))
      .forEach(result => {
        const emoji = parseFloat(result.accuracy) >= 80 ? '✅' : parseFloat(result.accuracy) >= 60 ? '⚠️' : '❌';
        console.log(`   ${emoji} ${result.intent}: ${result.accuracy}% (${result.correctCount}/${result.totalCount})`);
      });
  }

  /**
   * Save report to file
   */
  saveReport(report, filepath = './test_report.json') {
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to ${filepath}`);
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting comprehensive chatbot testing...\n');
    
    try {
      // Check server health
      await axios.get(`${this.serverUrl}/health`);
      console.log('✅ Server is healthy\n');
      
    } catch (error) {
      console.error('❌ Server is not accessible. Please start the server first.');
      return;
    }
    
    // Run tests
    const intentResults = await this.testAllIntents();
    const typoResults = await this.testTypoHandling();
    const outOfScopeResults = await this.testOutOfScope();
    const benchmarkResults = await this.benchmarkPerformance(50);
    
    // Generate report
    const report = this.generateReport(intentResults, typoResults, outOfScopeResults, benchmarkResults);
    
    // Print summary
    this.printSummary(report);
    
    // Save report
    this.saveReport(report);
    
    console.log('\n✅ Testing completed!');
    
    return report;
  }
}

/**
 * MAIN
 */
async function main() {
  const serverUrl = process.argv[2] || 'http://localhost:3000';
  
  const tester = new ChatbotTester(serverUrl);
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ChatbotTester };
