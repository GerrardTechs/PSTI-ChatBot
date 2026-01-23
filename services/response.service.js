function getResponse(intents, intentTag) {
  const intent = intents.intents.find(i => i.tag === intentTag);

  if (intent && intent.responses?.length) {
    const randomIdx = Math.floor(Math.random() * intent.responses.length);
    return intent.responses[randomIdx];
  }

  return null;
}

function getIntentDescription(intentTag) {
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

module.exports = { getResponse, getIntentDescription };
