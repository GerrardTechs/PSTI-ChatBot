// server_live.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ===== Mock responses lokal =====
const mockResponses = {
  "tentang_psti": "Lab PSTI adalah laboratorium riset dan praktikum TI.",
  "jam_operasional": "Lab buka Senin-Jumat 08:00-17:00.",
  "fasilitas_lab": "Fasilitas lab: 40 PC, IoT, VR/AR, 3D printer.",
  "skill_unik": "Selain coding, kamu bisa belajar IoT, AR/VR, dan 3D modeling.",
  "durasi_proyek": "Durasi proyek bervariasi, biasanya 1-4 minggu tergantung kompleksitas."
};

// ===== Setup OpenAI =====
let openai;
if(process.env.OPENAI_API_KEY){
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  openai = new OpenAIApi(configuration);
}

// ===== Fungsi untuk generate response =====
async function generateResponse(intent, userMessage){
  // Jika OpenAI ready
  if(openai){
    try{
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Kamu adalah chatbot Lab PSTI." },
          { role: "user", content: userMessage }
        ],
        max_tokens: 200
      });
      return completion.data.choices[0].message.content;
    } catch(e){
      console.error("OpenAI Error:", e.message);
      // Jika quota habis, fallback ke mock
      if(e.code === 'insufficient_quota' || e.status === 429){
        return mockResponses[intent] || "Maaf, saya belum tahu jawaban untuk itu.";
      }
      return "Terjadi kesalahan pada server";
    }
  } else {
    // Fallback ke mock jika OpenAI tidak dikonfigurasi
    return mockResponses[intent] || "Maaf, saya belum tahu jawaban untuk itu.";
  }
}

// ===== API Endpoint =====
app.post('/chat', async (req, res) => {
  const { intent, message } = req.body;
  if(!intent || !message){
    return res.status(400).json({ error: "Parameter 'intent' dan 'message' wajib diisi" });
  }

  const response = await generateResponse(intent, message);
  res.json({ response });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`PSTI Chatbot DEVELOPMENT server running on port ${PORT}`);
});
