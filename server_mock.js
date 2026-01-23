// server_mock.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ===== Mock responses =====
const mockResponses = {
  "tentang_psti": "Lab PSTI adalah laboratorium riset dan praktikum TI.",
  "jam_operasional": "Lab buka Senin-Jumat 08:00-17:00.",
  "fasilitas_lab": "Fasilitas lab: 40 PC, IoT, VR/AR, 3D printer.",
  "skill_unik": "Selain coding, kamu bisa belajar IoT, AR/VR, dan 3D modeling.",
  "durasi_proyek": "Durasi proyek bervariasi, biasanya 1-4 minggu tergantung kompleksitas."
};

// ===== Simple intent detection =====
function detectIntent(message){
  const text = message.toLowerCase();

  if(text.includes("apa itu") || text.includes("tentang") || text.includes("psti")){
    return "tentang_psti";
  }
  if(text.includes("jam") || text.includes("buka") || text.includes("operasional")){
    return "jam_operasional";
  }
  if(text.includes("fasilitas") || text.includes("ada apa") || text.includes("peralatan")){
    return "fasilitas_lab";
  }
  if(text.includes("skill") || text.includes("unik") || text.includes("belajar apa")){
    return "skill_unik";
  }
  if(text.includes("durasi") || text.includes("lama") || text.includes("proyek")){
    return "durasi_proyek";
  }
  // fallback
  return null;
}

// ===== API Endpoint =====
app.post('/chat', (req, res) => {
  const { message } = req.body;
  if(!message){
    return res.status(400).json({ error: "Parameter 'message' wajib diisi" });
  }

  const intent = detectIntent(message);
  const response = intent ? mockResponses[intent] : "Maaf, saya belum tahu jawaban untuk itu.";

  res.json({ response });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`PSTI Chatbot MOCK server running on port ${PORT}`);
});
