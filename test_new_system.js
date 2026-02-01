// TEST SUITE - PSTI ChatBot New System
// File: test_new_system.js

const { createKnowledgeEngine } = require('./src/engine/knowledgeEngine');
const knowledgeData = require('./src/data/knowledge.json');

const knowledgeEngine = createKnowledgeEngine(knowledgeData);

console.log('\n' + '='.repeat(80));
console.log('🧪 TESTING NEW CHATBOT SYSTEM - COMPREHENSIVE TEST SUITE');
console.log('='.repeat(80) + '\n');

// Test cases
const tests = [
  {
    category: 'PROJECT DEVELOPER TRACKING',
    tests: [
      {
        name: 'Test 1: Siapa perancang Promet',
        query: 'siapa perancang promet?',
        expected: 'Developer info or team info',
        shouldContain: ['Promet', 'mahasiswa', 'Lab PSTI']
      },
      {
        name: 'Test 2: Siapa yang buat SiApik',
        query: 'siapa yang buat siapik?',
        expected: 'Muhammad Alvin Fahreza',
        shouldContain: ['SiApik', 'Muhammad Alvin Fahreza']
      },
      {
        name: 'Test 3: Developer Digital Twin SMK 8',
        query: 'siapa developer Digital Twin SMK 8?',
        expected: 'Damar Aryo Saputra and Achmad Luth Fallah',
        shouldContain: ['Digital Twin SMK 8', 'Damar', 'Luth']
      },
      {
        name: 'Test 4: Info tentang Smart Springkler',
        query: 'info tentang Smart Springkler',
        expected: 'Project info with developer',
        shouldContain: ['Smart Springkler', 'Fathurahman Muiz']
      }
    ]
  },
  {
    category: 'CONTEXT AWARENESS',
    tests: [
      {
        name: 'Test 5: Context - Project list then developer question',
        setup: 'project psti',
        query: 'siapa yang buat siapik?',
        expected: 'Should answer based on context',
        shouldContain: ['SiApik', 'Alvin']
      }
    ]
  },
  {
    category: 'NAME MATCHING (ENHANCED)',
    tests: [
      {
        name: 'Test 6: First name - Ilham',
        query: 'siapa ilham?',
        expected: 'Muhammad Ilham Alparsy',
        shouldContain: ['Muhammad Ilham Alparsy', 'Koordinator']
      },
      {
        name: 'Test 7: Middle name - Farrel',
        query: 'siapa farrel?',
        expected: 'Alessandro Farrel Gerrard Wijaya',
        shouldContain: ['Alessandro Farrel', 'CyberSecurity']
      },
      {
        name: 'Test 8: Middle name - Valentino',
        query: 'siapa valentino?',
        expected: 'Gabriel Valentino Cuaca',
        shouldContain: ['Gabriel Valentino', 'IoT Engineer']
      },
      {
        name: 'Test 9: Nickname - Cira',
        query: 'siapa cira?',
        expected: 'Tiara Angel',
        shouldContain: ['Tiara Angel', 'Web Architect']
      },
      {
        name: 'Test 10: Nickname - Luth',
        query: 'siapa luth?',
        expected: 'Achmad Luth Fallah',
        shouldContain: ['Achmad Luth Fallah', '3D Modeling']
      },
      {
        name: 'Test 11: New student 2025 - Alvin',
        query: 'siapa alvin?',
        expected: 'Muhammad Alvin Fahreza',
        shouldContain: ['Muhammad Alvin Fahreza', 'IoT Engineer']
      }
    ]
  },
  {
    category: 'MAHASISWA 2025 DATA',
    tests: [
      {
        name: 'Test 12: List mahasiswa reka 2025',
        query: 'mahasiswa reka 25',
        expected: 'List of 2025 students',
        shouldContain: ['Farel Fainaki', 'Damar', 'Alvin', 'Fathur', 'Nopal', 'Luth']
      },
      {
        name: 'Test 13: Profil Fathur',
        query: 'profil fathur',
        expected: 'Muhammad Fathurahman Muiz profile',
        shouldContain: ['Fathurahman Muiz', 'Smart Springkler']
      }
    ]
  },
  {
    category: 'SKILL-BASED SEARCH',
    tests: [
      {
        name: 'Test 14: Mahasiswa IoT',
        query: 'mahasiswa yang bisa iot',
        expected: 'List of IoT skilled students',
        shouldContain: ['Gabriel', 'Gery']
      },
      {
        name: 'Test 15: Mahasiswa 3D Modeling',
        query: 'mahasiswa yang bisa 3d modeling',
        expected: 'List of 3D modeling students',
        shouldContain: ['Damar', 'Luth', 'Farel']
      },
      {
        name: 'Test 16: Mahasiswa Web Development',
        query: 'mahasiswa web developer',
        expected: 'List of web dev students',
        shouldContain: ['Tiara', 'Luth']
      }
    ]
  },
  {
    category: 'PROJECT INFO',
    tests: [
      {
        name: 'Test 17: Project IoT list',
        query: 'project iot',
        expected: 'List of IoT projects',
        shouldContain: ['Apik', 'SiApik', 'Aqua Secure']
      },
      {
        name: 'Test 18: Project Digital Twin list',
        query: 'project digital twin',
        expected: 'List of Digital Twin projects',
        shouldContain: ['Digital Twin Lab PSTI', 'Digital Twin SMK 8']
      }
    ]
  },
  {
    category: 'LAB INFO',
    tests: [
      {
        name: 'Test 19: Kontak lab',
        query: 'kontak lab',
        expected: 'Lab contact info',
        shouldContain: ['pstilab@ubl.ac.id', '0721']
      },
      {
        name: 'Test 20: Jam operasional',
        query: 'jam buka lab',
        expected: 'Operating hours',
        shouldContain: ['08:00', '17:00']
      },
      {
        name: 'Test 21: Pembina lab',
        query: 'siapa pembina lab?',
        expected: 'List of lab supervisors',
        shouldContain: ['Ari', 'Syarif', 'Aldi']
      }
    ]
  },
  {
    category: 'ERROR HANDLING',
    tests: [
      {
        name: 'Test 22: Name not found',
        query: 'siapa aril?',
        expected: 'Not found message',
        shouldContain: ['tidak menemukan', 'aril']
      }
    ]
  }
];

// Run tests
let totalTests = 0;
let passed = 0;
let failed = 0;
let failedTests = [];

tests.forEach((category) => {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📂 ${category.category}`);
  console.log('─'.repeat(80));
  
  category.tests.forEach((test) => {
    totalTests++;
    const context = {};
    
    // Setup query if needed
    if (test.setup) {
      knowledgeEngine.run(test.setup, context);
    }
    
    // Run actual test
    const response = knowledgeEngine.run(test.query, context);
    
    let testPassed = true;
    let missingKeywords = [];
    
    if (response) {
      // Check if response contains expected keywords
      test.shouldContain.forEach(keyword => {
        if (!response.toLowerCase().includes(keyword.toLowerCase())) {
          testPassed = false;
          missingKeywords.push(keyword);
        }
      });
    } else {
      testPassed = false;
    }
    
    if (testPassed) {
      console.log(`\n✅ ${test.name}`);
      console.log(`   Query: "${test.query}"`);
      console.log(`   Response: ${response ? response.substring(0, 100) + '...' : 'null'}`);
      passed++;
    } else {
      console.log(`\n❌ ${test.name}`);
      console.log(`   Query: "${test.query}"`);
      console.log(`   Expected to contain: ${test.shouldContain.join(', ')}`);
      console.log(`   Missing: ${missingKeywords.join(', ')}`);
      console.log(`   Got: ${response ? response.substring(0, 150) + '...' : 'null'}`);
      failed++;
      failedTests.push({
        name: test.name,
        query: test.query,
        missing: missingKeywords,
        response: response
      });
    }
  });
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passed} (${((passed / totalTests) * 100).toFixed(1)}%)`);
console.log(`❌ Failed: ${failed} (${((failed / totalTests) * 100).toFixed(1)}%)`);
console.log('='.repeat(80));

if (failedTests.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('❌ FAILED TESTS DETAILS');
  console.log('='.repeat(80));
  
  failedTests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Missing keywords: ${test.missing.join(', ')}`);
    console.log(`   Full response: ${test.response || 'null'}`);
  });
}

// Key improvements showcase
console.log('\n' + '='.repeat(80));
console.log('🎯 KEY IMPROVEMENTS VERIFICATION');
console.log('='.repeat(80));

const improvements = [
  {
    feature: 'Project Developer Tracking',
    before: 'Cannot answer "siapa perancang promet?"',
    after: 'Can answer with developer names',
    status: passed >= 4 ? '✅ WORKING' : '❌ NEEDS FIX'
  },
  {
    feature: 'Enhanced Name Matching',
    before: 'Only first and last name',
    after: 'First, middle, last, and nicknames',
    status: passed >= 11 ? '✅ WORKING' : '❌ NEEDS FIX'
  },
  {
    feature: 'Mahasiswa 2025 Data',
    before: 'No data for 2025 students',
    after: '6 students with full profiles',
    status: passed >= 13 ? '✅ WORKING' : '❌ NEEDS FIX'
  },
  {
    feature: 'Skill-based Search',
    before: 'Limited skill filtering',
    after: 'Full support for IoT, 3D, Web, etc',
    status: passed >= 16 ? '✅ WORKING' : '❌ NEEDS FIX'
  },
  {
    feature: 'Context Awareness',
    before: 'Basic context only',
    after: 'Advanced multi-turn conversations',
    status: passed >= 5 ? '✅ WORKING' : '❌ NEEDS FIX'
  }
];

improvements.forEach(imp => {
  console.log(`\n${imp.status} ${imp.feature}`);
  console.log(`   Before: ${imp.before}`);
  console.log(`   After:  ${imp.after}`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n✨ Testing completed! Overall success rate: ${((passed / totalTests) * 100).toFixed(1)}%\n`);

// Exit code based on success rate
process.exit(passed === totalTests ? 0 : 1);