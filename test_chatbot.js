const axios = require('axios');

const SERVER = 'http://localhost:3000';

const sessions = [
  { sessionId: 'sess1', userId: 'user1' },
  { sessionId: 'sess2', userId: 'user2' }
];

const messages = [
  "apa itu Lab PSTI?",
  "kapan jam operasional lab?",
  "bisa kasih info tentang lab PSTI ga?",
  "lab buka jam berapa ya?",
  "berapa lama proyek di lab biasanya selesai?",
  "apa skill unik yang bisa dipelajari di PSTI selain coding?"
];

async function testChatbot() {
  console.log("🔍 Memulai testing chatbot PSTI...\n");

  for (const session of sessions) {
    console.log(`--- Session: ${session.sessionId} | User: ${session.userId} ---\n`);
    for (const msg of messages) {
      try {
        const resp = await axios.post(`${SERVER}/chat`, {
          sessionId: session.sessionId,
          userId: session.userId,
          message: msg
        });
        console.log(`> User: ${msg}`);
        console.log(`Bot: ${resp.data.message}\n`);
      } catch (err) {
        console.log(`> User: ${msg}`);
        console.log("Error:", err.response?.data || err.message, "\n");
      }
    }
  }
}

testChatbot();
