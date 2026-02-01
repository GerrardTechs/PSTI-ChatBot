// knowledgeEngine.js - Fixed Context Priority

function createKnowledgeEngine(knowledge) {
  const reka24 = knowledge.mahasiswa_reka["2024"] || [];
  const reka25 = knowledge.mahasiswa_reka["2025"] || [];
  const projects = knowledge.projects || [];
  const allStudents = [...reka24, ...reka25];

  // Helper: Find student by name (fuzzy match)
  function findStudentByName(message) {
    const msg = message.toLowerCase();
    
    // Try exact match first
    for (const student of allStudents) {
      const namaLower = student.nama.toLowerCase();
      
      // Check full name
      if (msg.includes(namaLower)) {
        return student;
      }
      
      // Check ALL parts of the name (first, middle, last)
      const nameParts = namaLower.split(' ');
      for (const part of nameParts) {
        // Skip very short name parts (like "Al", "De", etc)
        if (part.length >= 3 && msg.includes(part)) {
          return student;
        }
      }
      
      // Check panggilan
      if (student.panggilan && msg.includes(student.panggilan.toLowerCase())) {
        return student;
      }
    }
    
    return null;
  }

  // Helper: Find project by name (fuzzy match)
  function findProjectByName(message) {
    const msg = message.toLowerCase();
    
    for (const project of projects) {
      const namaLower = project.nama.toLowerCase();
      
      // Remove spaces and dashes for better matching
      const cleanMsg = msg.replace(/[\s-]/g, '');
      const cleanNama = namaLower.replace(/[\s-]/g, '');
      
      if (cleanMsg.includes(cleanNama) || cleanNama.includes(cleanMsg)) {
        return project;
      }
    }
    
    return null;
  }

  function run(message, context = {}) {
    if (!message) return null;
    const msg = message.toLowerCase();

    // =========================
    // PRIORITY 1: CHECK NEW STUDENT/PROJECT MENTION
    // =========================
    
    // Check if asking about specific student by name
    // This must be checked FIRST before using context
    const mentionedStudent = findStudentByName(msg);
    
    // Handle "siapa [nama]" questions
    if (msg.includes('siapa')) {
      if (mentionedStudent) {
        // Student found - Set NEW context
        context.lastMentionedStudent = mentionedStudent;
        
        let response = `📋 Profil ${mentionedStudent.nama}:\n\n`;
        if (mentionedStudent.nim) response += `📌 NIM: ${mentionedStudent.nim}\n`;
        if (mentionedStudent.role) response += `👨‍💻 Role: ${mentionedStudent.role}\n`;
        if (mentionedStudent.panggilan) response += `📛 Panggilan: ${mentionedStudent.panggilan}\n`;
        if (mentionedStudent.skills && mentionedStudent.skills.length > 0) {
          response += `💡 Skills: ${mentionedStudent.skills.join(', ')}\n`;
        }
        if (mentionedStudent.deskripsi) response += `\n📝 ${mentionedStudent.deskripsi}`;
        
        return response;
      } else {
        // Check if question is about a person (nama tidak ditemukan)
        // Exclude generic questions like "siapa saja", "siapa aja"
        if (!msg.includes('aja') && !msg.includes('saja') && !msg.includes('anggota') && !msg.includes('mahasiswa')) {
          // Extract potential name from question
          const words = msg.split(' ').filter(w => w.length > 2 && !['siapa', 'yang', 'itu', 'dia'].includes(w));
          
          if (words.length > 0) {
            // Likely asking about a specific person not in database
            return `Maaf, saya tidak menemukan data tentang "${words[0]}" di database mahasiswa Lab PSTI. Mungkin nama yang Anda maksud adalah salah satu dari mahasiswa Reka Inovasi? Ketik "mahasiswa reka 24" atau "mahasiswa reka 25" untuk melihat daftar lengkapnya.`;
          }
        }
      }
    }
    
    // Handle "profil [nama]" questions  
    if (mentionedStudent && msg.includes('profil')) {
      // Set NEW context
      context.lastMentionedStudent = mentionedStudent;
      
      let response = `📋 Profil ${mentionedStudent.nama}:\n\n`;
      if (mentionedStudent.nim) response += `📌 NIM: ${mentionedStudent.nim}\n`;
      if (mentionedStudent.role) response += `👨‍💻 Role: ${mentionedStudent.role}\n`;
      if (mentionedStudent.panggilan) response += `📛 Panggilan: ${mentionedStudent.panggilan}\n`;
      if (mentionedStudent.skills && mentionedStudent.skills.length > 0) {
        response += `💡 Skills: ${mentionedStudent.skills.join(', ')}\n`;
      }
      if (mentionedStudent.deskripsi) response += `\n📝 ${mentionedStudent.deskripsi}`;
      
      return response;
    }
    
    // Check if asking about specific project
    const mentionedProject = findProjectByName(msg);
    if (mentionedProject && (msg.includes('apa') || msg.includes('tentang'))) {
      // Set NEW context
      context.lastMentionedProject = mentionedProject;
      
      return `📱 ${mentionedProject.nama}\n\n` +
             `📂 Kategori: ${mentionedProject.kategori}\n` +
             `📝 Deskripsi: ${mentionedProject.deskripsi}\n\n` +
             `Project ini dikembangkan oleh tim mahasiswa Lab PSTI.`;
    }

    // =========================
    // PRIORITY 2: CONTEXTUAL QUESTIONS (using old context)
    // =========================
    
    // Context: Last mentioned student (only for follow-up questions without new name)
    if (context.lastMentionedStudent && !mentionedStudent) {
      // Only trigger for generic questions like "dia ngapain?", "skill dia?"
      if ((msg.includes('dia') || msg.includes('profil')) && !msg.includes('siapa')) {
        const student = context.lastMentionedStudent;
        let response = `📋 Profil ${student.nama}:\n\n`;
        if (student.nim) response += `📌 NIM: ${student.nim}\n`;
        if (student.role) response += `👨‍💻 Role: ${student.role}\n`;
        if (student.panggilan) response += `📛 Panggilan: ${student.panggilan}\n`;
        if (student.skills && student.skills.length > 0) {
          response += `💡 Skills: ${student.skills.join(', ')}\n`;
        }
        if (student.deskripsi) response += `\n📝 ${student.deskripsi}`;
        
        return response;
      }
    }

    // Context: Last mentioned project (only for follow-up questions without new project name)
    if (context.lastMentionedProject && !mentionedProject) {
      if (msg.includes('siapa') && (msg.includes('pembuat') || msg.includes('perancang') || msg.includes('developer'))) {
        const project = context.lastMentionedProject;
        return `Project ${project.nama} dikembangkan oleh tim mahasiswa Lab PSTI. Untuk info lebih detail tentang tim developer, silakan hubungi admin Lab PSTI.`;
      }
    }

    // =========================
    // RULE-BASED: BEASISWA
    // =========================
    if (msg.includes('beasiswa')) {
      // Jika tanya tentang mahasiswa beasiswa
      if (msg.includes('siapa') || msg.includes('mahasiswa') || msg.includes('anak')) {
        const list = allStudents.map(m => `• ${m.nama}`);
        return list.length 
          ? `Mahasiswa Beasiswa Reka Inovasi di Lab PSTI:\n${list.join('\n')}`
          : 'Belum ada data mahasiswa beasiswa.';
      }
      
      // Jika tanya cara dapetin beasiswa
      if (msg.includes('cara') || msg.includes('dapetin') || msg.includes('info') || msg.includes('gimana')) {
        return 'Beasiswa Reka Inovasi bersifat pengajuan. Mahasiswa baru dapat mengajukan setelah diterima di UBL melalui Jalur Madani';
      }
    
       // Jika tanya beasiswa reka 
       if (msg.includes('reka') || msg.includes('inovas') || msg.includes('info')) {
        return 'Beasiswa Reka Inovasi adalah program beasiswa UBL untuk mahasiswa yang bergabung di Pusat Studi Teknologi Informasi! Ada yang ingin kamu tanyakan mengenai Beasiswa ini?';
      }
      
      // General question tentang beasiswa
      return 'Bermacam-macam beasiswa yang ada di Universitas Bandar Lampung, Ada Sosial, Yayasan, KIP dan salah satu yang paling menarik ialah Beasiswa Reka Inovasi! Ada yang ingin kamu tanyakan mengenai Beasiswa Reka Inovasi?😊';
    }

    // =========================
    // RULE-BASED: Mahasiswa / Skill
    // =========================
    if (msg.includes('iot') && !msg.includes('project')) {
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
      
      // Set context that we just listed projects
      context.lastMentionedContext = 'project_list';
      
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
    if ((msg.includes('siapa') && msg.includes('anggota')) || 
        (msg.includes('profil') && msg.includes('mahasiswa'))) {
      const list = allStudents.map(m => `• ${m.nama}`);
      
      // Set context
      context.lastMentionedContext = 'student_list';
      
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