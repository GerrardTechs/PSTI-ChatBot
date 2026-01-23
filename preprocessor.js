/**
 * PREPROCESSING BAHASA INDONESIA - PSTI CHATBOT
 * Utilities untuk preprocessing text Bahasa Indonesia (ringan, tanpa library external)
 * 
 * Fitur:
 * - Normalisasi informal text
 * - Slang word mapping
 * - Spell correction sederhana
 * - Stop words removal (optional)
 */

class IndonesianPreprocessor {
  constructor() {
    // Slang/informal -> formal mapping (common untuk chatbot)
    this.slangDict = {
      // Greetings & common words
      'hai': 'halo',
      'hei': 'halo',
      'hi': 'halo',
      'hey': 'halo',
      'gan': 'teman',
      'sis': 'saudara',
      'bro': 'saudara',
      
      // Question words
      'gmn': 'bagaimana',
      'gimana': 'bagaimana',
      'gmana': 'bagaimana',
      'knp': 'kenapa',
      'knapa': 'kenapa',
      'klo': 'kalau',
      'kalo': 'kalau',
      
      // Common abbreviations
      'gak': 'tidak',
      'ga': 'tidak',
      'gk': 'tidak',
      'ngga': 'tidak',
      'nggak': 'tidak',
      'udah': 'sudah',
      'udh': 'sudah',
      'blm': 'belum',
      'blom': 'belum',
      'emang': 'memang',
      'emg': 'memang',
      'yg': 'yang',
      'org': 'orang',
      'brp': 'berapa',
      'brapa': 'berapa',
      'mau': 'ingin',
      'mo': 'ingin',
      
      // Pronouns
      'gue': 'saya',
      'gw': 'saya',
      'ane': 'saya',
      'ente': 'anda',
      'lo': 'kamu',
      'lu': 'kamu',
      
      // Lab/tech specific
      'lab': 'laboratorium',
      'fak': 'fakultas',
      'univ': 'universitas',
      'kampus': 'universitas',
      'dosen': 'dosen',
      'mhs': 'mahasiswa',
      'maba': 'mahasiswa baru',
      'skripsi': 'tugas akhir',
      
      // Time
      'skrg': 'sekarang',
      'skrang': 'sekarang',
      'nanti': 'nanti',
      'bsk': 'besok',
      'besok': 'besok',
      
      // Common typos
      'terimakasih': 'terima kasih',
      'makasi': 'terima kasih',
      'makasih': 'terima kasih',
      'thx': 'terima kasih',
      'thanks': 'terima kasih',
      'bye': 'sampai jumpa',
      'dadah': 'sampai jumpa'
    };
    
    // Stop words (untuk removal jika dibutuhkan)
    this.stopWords = new Set([
      'yang', 'dan', 'di', 'dari', 'ke', 'pada', 'untuk',
      'dengan', 'adalah', 'ini', 'itu', 'atau', 'juga',
      'akan', 'telah', 'sudah', 'ada', 'bisa', 'dapat'
    ]);
  }

  /**
   * Basic normalization
   */
  normalize(text) {
    return text
      .toLowerCase()
      .trim()
      // Normalize repeated characters (haloo -> halo)
      .replace(/([a-z])\1{2,}/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Remove email
      .replace(/[\w.-]+@[\w.-]+\.\w+/gi, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ');
  }

  /**
   * Remove special characters (keep alphanumeric + space)
   */
  removeSpecialChars(text, keepNumbers = true) {
    if (keepNumbers) {
      return text.replace(/[^a-z0-9\s]/g, ' ');
    } else {
      return text.replace(/[^a-z\s]/g, ' ');
    }
  }

  /**
   * Normalize numbers to token
   */
  normalizeNumbers(text, token = 'NUM') {
    return text.replace(/\d+/g, token);
  }

  /**
   * Replace slang words dengan formal
   */
  replaceSlang(text) {
    const words = text.split(' ');
    const replaced = words.map(word => {
      return this.slangDict[word] || word;
    });
    return replaced.join(' ');
  }

  /**
   * Remove stop words (optional, bisa menurunkan akurasi jika konteks penting)
   */
  removeStopWords(text) {
    const words = text.split(' ');
    const filtered = words.filter(word => !this.stopWords.has(word));
    return filtered.join(' ');
  }

  /**
   * Full preprocessing pipeline
   */
  preprocess(text, options = {}) {
    const {
      replaceSlang = true,
      removeStopWords = false,
      normalizeNumbers = true,
      keepNumbers = false
    } = options;
    
    // Step 1: Basic normalization
    let processed = this.normalize(text);
    
    // Step 2: Replace slang
    if (replaceSlang) {
      processed = this.replaceSlang(processed);
    }
    
    // Step 3: Remove special chars
    processed = this.removeSpecialChars(processed, keepNumbers);
    
    // Step 4: Normalize numbers
    if (normalizeNumbers && !keepNumbers) {
      processed = this.normalizeNumbers(processed);
    }
    
    // Step 5: Remove stop words (optional)
    if (removeStopWords) {
      processed = this.removeStopWords(processed);
    }
    
    // Final cleanup
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  /**
   * Add custom slang mapping
   */
  addSlangMapping(slang, formal) {
    this.slangDict[slang] = formal;
  }

  /**
   * Batch add slang mappings
   */
  addSlangMappings(mappings) {
    Object.entries(mappings).forEach(([slang, formal]) => {
      this.slangDict[slang] = formal;
    });
  }

  /**
   * Get preprocessing statistics
   */
  getStats(text) {
    const original = text;
    const normalized = this.normalize(text);
    const withoutSlang = this.replaceSlang(normalized);
    const final = this.preprocess(text);
    
    const originalWords = original.split(' ').filter(w => w.length > 0);
    const finalWords = final.split(' ').filter(w => w.length > 0);
    
    const slangWordsFound = originalWords.filter(word => 
      this.slangDict[word.toLowerCase()]
    );
    
    return {
      original: {
        text: original,
        wordCount: originalWords.length
      },
      final: {
        text: final,
        wordCount: finalWords.length
      },
      slangWordsReplaced: slangWordsFound.length,
      slangWords: slangWordsFound,
      reduction: originalWords.length - finalWords.length
    };
  }
}

/**
 * TESTING & VALIDATION
 */
function testPreprocessor() {
  const preprocessor = new IndonesianPreprocessor();
  
  const testCases = [
    'Halooo gan, gimana caranya daftar beasiswa di lab PSTI???',
    'gmn sih cara akses lab nya? jam brp buka?',
    'gue mau tau info ttg projek reka inovasi dong',
    'makasih banyak yaa infonya sangat membantu!!!',
    'Lab PSTI itu apa sih? lokasinya dimana???',
    'Udah ada belum pengumuman beasiswa 2025?',
    'Kalo mau kontak lab PSTI hubungi kemana?'
  ];
  
  console.log('PREPROCESSING TEST RESULTS');
  console.log('='.repeat(80));
  
  testCases.forEach((text, idx) => {
    const stats = preprocessor.getStats(text);
    
    console.log(`\n${idx + 1}. Original:`);
    console.log(`   "${stats.original.text}"`);
    console.log(`   Processed:`);
    console.log(`   "${stats.final.text}"`);
    console.log(`   Stats: ${stats.original.wordCount} words -> ${stats.final.wordCount} words`);
    
    if (stats.slangWordsReplaced > 0) {
      console.log(`   Slang replaced: ${stats.slangWords.join(', ')}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IndonesianPreprocessor };
}

// Run test if called directly
if (require.main === module) {
  testPreprocessor();
}
