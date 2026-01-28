// knowledgeEngine.js (Hybrid Full + ML Natural)

function createKnowledgeEngine(knowledge) {
  const reka24 = knowledge.mahasiswa_reka["2024"] || [];
  const reka25 = knowledge.mahasiswa_reka["2025"] || [];
  const projects = knowledge.projects || [];
  const allStudents = [...reka24, ...reka25];

  function run(message) {
    if (!message) return null;
    const msg = message.toLowerCase();

    // =========================
    // RULE-BASED: Mahasiswa / Skill
    // =========================
    if (msg.includes('iot')) {
      const list = allStudents
        .filter(m => m.skills?.some(s => s.toLowerCase().includes('iot')))
        .map(p => `• ${p.nama}`);
      return list.length ? `Mahasiswa dengan skill IoT:\n${list.join('\n')}` : 'Tidak ada mahasiswa dengan skill IoT.';
    }

    if (msg.includes('cybersecurity') || msg.includes('cyber security')) {
      const list = allStudents
        .filter(m => m.skills?.some(s => s.toLowerCase().includes('cybersecurity')))
        .map(p => `• ${p.nama}`);
      return list.length ? `Mahasiswa dengan skill CyberSecurity:\n${list.join('\n')}` : 'Tidak ada mahasiswa dengan skill CyberSecurity.';
    }

    if (msg.includes('reka') && msg.includes('24')) {
      const list = reka24.map(m => `• ${m.nama}`);
      return list.length ? `Mahasiswa Reka 2024:\n${list.join('\n')}` : 'Tidak ada mahasiswa Reka 2024.';
    }

    if (msg.includes('reka') && msg.includes('25')) {
      const list = reka25.map(m => `• ${m.nama}`);
      return list.length ? `Mahasiswa Reka 2025:\n${list.join('\n')}` : 'Tidak ada mahasiswa Reka 2025.';
    }

    if (msg.includes('project') || msg.includes('projek')) {
      const list = projects.map(p => `• ${p.nama}`);
      return list.length ? `Daftar project:\n${list.join('\n')}` : 'Tidak ada projek saat ini.';
    }

    if (msg.includes('projek') && msg.includes('iot')) {
      const list = projects.filter(p => p.kategori.toLowerCase() === 'iot').map(p => `• ${p.nama}`);
      return list.length ? `Project IoT:\n${list.join('\n')}` : 'Tidak ada project IoT saat ini.';
    }

    // =========================
    // RULE-BASED: Pertanyaan dasar / umum
    // =========================
    if (msg.includes('fasilitas') && msg.includes('lab')) {
      return 'Lab PSTI memiliki 40 PC, perangkat IoT, VR/AR, 3D Printer, dan alat pendukung riset lainnya.';
    }

    if ((msg.includes('jam') && msg.includes('buka')) || msg.includes('operasional')) {
      return 'Lab PSTI buka Senin–Jumat 08:00–17:00, Sabtu 08:00–14:00, Minggu tutup.';
    }

    if (msg.includes('kontak') || msg.includes('hubungi')) {
      return 'Kontak Lab PSTI: Email: pstilab@ubl.ac.id | Telp: (0721) 123456';
    }

    if (msg.includes('lokasi') || msg.includes('alamat')) {
      return 'Lab PSTI berada di Gedung C Lantai 3, Universitas Bandar Lampung, Lampung, Indonesia.';
    }

    // =========================
    // RULE-BASED: Pertanyaan natural / santai
    // =========================
    if ((msg.includes('siapa') && msg.includes('anggota')) || msg.includes('mahasiswa')) {
      const list = allStudents.map(m => `• ${m.nama}`);
      return list.length ? `Berikut daftar mahasiswa Lab PSTI:\n${list.join('\n')}` : 'Tidak ada data mahasiswa.';
    }

    // =========================
    // Fallback
    // Return null agar ML bisa menangani
    // =========================
    return null;
  }

  return { run };
}

module.exports = { createKnowledgeEngine };
