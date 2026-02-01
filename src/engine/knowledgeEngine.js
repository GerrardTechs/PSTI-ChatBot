// knowledgeEngine.js - Advanced Context-Aware Knowledge Engine

function createKnowledgeEngine(knowledge) {
  const reka24 = knowledge.mahasiswa_reka["2024"] || [];
  const reka25 = knowledge.mahasiswa_reka["2025"] || [];
  const projects = knowledge.projects || [];
  const pembina = knowledge.pembina_lab || [];
  const ketua_prodi = knowledge.ketua_prodi || {};
  const info_lab = knowledge.info_lab || {};
  const allStudents = [...reka24, ...reka25];

  // ============================
  // HELPER FUNCTIONS
  // ============================

  // Helper: Find student by name (fuzzy match)
  function findStudentByName(message) {
    const msg = message.toLowerCase();
    
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
      
      // Check panggilan/nickname
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
      
      // Check if project name is mentioned
      if (cleanMsg.includes(cleanNama) || cleanNama.includes(cleanMsg)) {
        return project;
      }
      
      // Also check without cleaning for exact matches
      if (msg.includes(namaLower)) {
        return project;
      }
    }
    
    return null;
  }

  // Helper: Generate student profile response
  function generateStudentProfile(student) {
    let response = `📋 Profil ${student.nama}:\n\n`;
    if (student.nim && student.nim !== "TBA") response += `📌 NIM: ${student.nim}\n`;
    if (student.role) response += `👨‍💻 Role: ${student.role}\n`;
    if (student.panggilan) response += `📛 Panggilan: ${student.panggilan}\n`;
    if (student.skills && student.skills.length > 0) {
      response += `💡 Skills: ${student.skills.join(', ')}\n`;
    }
    if (student.projects && student.projects.length > 0) {
      response += `🚀 Projects: ${student.projects.join(', ')}\n`;
    }
    if (student.deskripsi) response += `\n📝 ${student.deskripsi}`;
    
    return response;
  }

  // Helper: Generate project info response
  function generateProjectInfo(project) {
    let response = `🚀 ${project.nama}\n\n`;
    response += `📂 Kategori: ${project.kategori}\n`;
    response += `📝 Deskripsi: ${project.deskripsi}\n`;
    response += `📊 Status: ${project.status}\n`;
    
    if (project.developers && project.developers.length > 0) {
      response += `👨‍💻 Developer/Perancang: ${project.developers.join(', ')}\n`;
    } else {
      response += `👨‍💻 Developer: Tim mahasiswa Lab PSTI\n`;
    }
    
    if (project.teknologi && project.teknologi.length > 0) {
      response += `🛠️ Teknologi: ${project.teknologi.join(', ')}\n`;
    }
    
    return response;
  }

  // ============================
  // MAIN RUN FUNCTION
  // ============================

  function run(message, context = {}) {
    if (!message) return null;
    const msg = message.toLowerCase();

    // =========================
    // PRIORITY 1: PROJECT DEVELOPER/PERANCANG QUESTIONS
    // =========================
    
    // Check if asking about project developer/perancang
    if ((msg.includes('siapa') || msg.includes('developer') || msg.includes('perancang') || msg.includes('pembuat')) && 
        (msg.includes('project') || msg.includes('projek') || msg.includes('aplikasi') || msg.includes('sistem'))) {
      
      // Check if there's a project mention or context
      const mentionedProject = findProjectByName(msg);
      
      if (mentionedProject) {
        // Set context
        context.lastMentionedProject = mentionedProject;
        
        if (mentionedProject.developers && mentionedProject.developers.length > 0) {
          return `Project ${mentionedProject.nama} dikembangkan oleh ${mentionedProject.developers.join(' dan ')} dari Lab PSTI. ${mentionedProject.deskripsi}`;
        } else {
          return `Project ${mentionedProject.nama} dikembangkan oleh tim mahasiswa Lab PSTI. Untuk info lebih detail tentang tim developer, silakan hubungi admin Lab PSTI.`;
        }
      } 
      // Check if using context from previous question
      else if (context.lastMentionedProject) {
        const project = context.lastMentionedProject;
        if (project.developers && project.developers.length > 0) {
          return `Project ${project.nama} dikembangkan oleh ${project.developers.join(' dan ')} dari Lab PSTI.`;
        } else {
          return `Project ${project.nama} dikembangkan oleh tim mahasiswa Lab PSTI. Untuk info lebih detail, silakan hubungi admin Lab PSTI.`;
        }
      }
    }

    // =========================
    // PRIORITY 2: STUDENT PROFILE QUESTIONS
    // =========================
    
    const mentionedStudent = findStudentByName(msg);
    
    // Handle "siapa [nama]" questions
    if (msg.includes('siapa')) {
      if (mentionedStudent) {
        // Student found - Set NEW context
        context.lastMentionedStudent = mentionedStudent;
        return generateStudentProfile(mentionedStudent);
      } else {
        // Check if question is about a person (nama tidak ditemukan)
        // Exclude generic questions like "siapa saja", "siapa aja"
        if (!msg.includes('aja') && !msg.includes('saja') && 
            !msg.includes('anggota') && !msg.includes('mahasiswa') &&
            !msg.includes('pembina') && !msg.includes('developer') &&
            !msg.includes('perancang') && !msg.includes('pembuat')) {
          
          // Extract potential name from question
          const words = msg.split(' ').filter(w => 
            w.length > 2 && !['siapa', 'yang', 'itu', 'dia', 'nama'].includes(w)
          );
          
          if (words.length > 0) {
            return `Maaf, saya tidak menemukan data tentang "${words[0]}" di database mahasiswa Lab PSTI. Mungkin yang Anda maksud adalah salah satu dari mahasiswa Reka Inovasi? Ketik "mahasiswa reka 24" atau "mahasiswa reka 25" untuk melihat daftar lengkapnya.`;
          }
        }
      }
    }
    
    // Handle "profil [nama]" questions  
    if (mentionedStudent && msg.includes('profil')) {
      context.lastMentionedStudent = mentionedStudent;
      return generateStudentProfile(mentionedStudent);
    }

    // =========================
    // PRIORITY 3: PROJECT INFO QUESTIONS
    // =========================
    
    const mentionedProject = findProjectByName(msg);
    if (mentionedProject && (msg.includes('apa') || msg.includes('tentang') || msg.includes('info'))) {
      // Set NEW context
      context.lastMentionedProject = mentionedProject;
      return generateProjectInfo(mentionedProject);
    }

    // =========================
    // PRIORITY 4: CONTEXTUAL QUESTIONS (using previous context)
    // =========================
    
    // Context: Last mentioned student
    if (context.lastMentionedStudent && !mentionedStudent) {
      if ((msg.includes('dia') || msg.includes('profil') || msg.includes('skill') || msg.includes('project')) && 
          !msg.includes('siapa')) {
        const student = context.lastMentionedStudent;
        return generateStudentProfile(student);
      }
    }

    // Context: Last mentioned project
    if (context.lastMentionedProject && !mentionedProject) {
      if (msg.includes('siapa') && (msg.includes('pembuat') || msg.includes('perancang') || msg.includes('developer'))) {
        const project = context.lastMentionedProject;
        if (project.developers && project.developers.length > 0) {
          return `Project ${project.nama} dikembangkan oleh ${project.developers.join(' dan ')} dari Lab PSTI.`;
        } else {
          return `Project ${project.nama} dikembangkan oleh tim mahasiswa Lab PSTI. Untuk info lebih detail, silakan hubungi admin Lab PSTI.`;
        }
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
        return 'Beasiswa Reka Inovasi bersifat pengajuan. Mahasiswa baru dapat mengajukan setelah diterima di UBL melalui Jalur Madani dan telah menyelesaikan registrasi ulang. Jika disetujui, mahasiswa mengikuti Pre College 3 minggu di Pusat Studi/Lab terkait.';
      }
    
      // Jika tanya beasiswa reka 
      if (msg.includes('reka') || msg.includes('inovas')) {
        return 'Beasiswa Reka Inovasi adalah program beasiswa UBL untuk mahasiswa yang bergabung di Pusat Studi Teknologi Informasi! Ada yang ingin kamu tanyakan mengenai Beasiswa ini?';
      }
      
      // General question tentang beasiswa
      return 'Bermacam-macam beasiswa yang ada di Universitas Bandar Lampung, Ada Sosial, Yayasan, KIP dan salah satu yang paling menarik ialah Beasiswa Reka Inovasi! Ada yang ingin kamu tanyakan mengenai Beasiswa Reka Inovasi? 😊';
    }

    // =========================
    // RULE-BASED: MAHASISWA / SKILL
    // =========================
    if (msg.includes('iot') && !msg.includes('project') && !msg.includes('projek')) {
      const list = allStudents
        .filter(m => m.skills?.some(s => s.toLowerCase().includes('iot')))
        .map(p => `• ${p.nama} (${p.role})`);
      return list.length ? `Mahasiswa dengan skill IoT:\n${list.join('\n')}` : 'Tidak ada mahasiswa dengan skill IoT.';
    }

    if (msg.includes('cybersecurity') || msg.includes('cyber security')) {
      const list = allStudents
        .filter(m => m.skills?.some(s => s.toLowerCase().includes('cybersecurity')))
        .map(p => `• ${p.nama} (${p.role})`);
      return list.length ? `Mahasiswa dengan skill CyberSecurity:\n${list.join('\n')}` : 'Tidak ada mahasiswa dengan skill CyberSecurity.';
    }

    if (msg.includes('web') && (msg.includes('developer') || msg.includes('development'))) {
      const list = allStudents
        .filter(m => m.skills?.some(s => 
          s.toLowerCase().includes('web') || 
          s.toLowerCase().includes('frontend') || 
          s.toLowerCase().includes('backend')
        ))
        .map(p => `• ${p.nama} (${p.role})`);
      return list.length ? `Mahasiswa dengan skill Web Development:\n${list.join('\n')}` : 'Tidak ada mahasiswa dengan skill Web Development.';
    }

    if (msg.includes('3d') && msg.includes('modeling')) {
      const list = allStudents
        .filter(m => m.skills?.some(s => s.toLowerCase().includes('3d modeling')))
        .map(p => `• ${p.nama} (${p.role})`);
      return list.length ? `Mahasiswa dengan skill 3D Modeling:\n${list.join('\n')}` : 'Tidak ada mahasiswa dengan skill 3D Modeling.';
    }

    if (msg.includes('reka') && msg.includes('24')) {
      const list = reka24.map(m => `• ${m.nama} - ${m.role}`);
      return list.length ? `Mahasiswa Reka Inovasi 2024:\n${list.join('\n')}` : 'Tidak ada mahasiswa Reka 2024.';
    }

    if (msg.includes('reka') && msg.includes('25')) {
      const list = reka25.map(m => `• ${m.nama} - ${m.role}`);
      return list.length ? `Mahasiswa Reka Inovasi 2025:\n${list.join('\n')}` : 'Tidak ada mahasiswa Reka 2025.';
    }

    // =========================
    // RULE-BASED: PROJECTS
    // =========================
    if (msg.includes('project') || msg.includes('projek')) {
      // Filter by category if specified
      if (msg.includes('iot')) {
        const list = projects.filter(p => p.kategori.toLowerCase().includes('iot'))
          .map(p => `• ${p.nama} - ${p.deskripsi}`);
        return list.length ? `Project IoT:\n${list.join('\n')}` : 'Tidak ada project IoT.';
      }
      
      if (msg.includes('web')) {
        const list = projects.filter(p => p.kategori.toLowerCase().includes('web'))
          .map(p => `• ${p.nama} - ${p.deskripsi}`);
        return list.length ? `Project Web System:\n${list.join('\n')}` : 'Tidak ada project Web.';
      }
      
      if (msg.includes('digital twin')) {
        const list = projects.filter(p => p.kategori.toLowerCase().includes('digital twin'))
          .map(p => `• ${p.nama} - ${p.deskripsi}`);
        return list.length ? `Project Digital Twin:\n${list.join('\n')}` : 'Tidak ada project Digital Twin.';
      }
      
      // General project list
      const list = projects.map(p => `• ${p.nama} (${p.kategori})`);
      context.lastMentionedContext = 'project_list';
      return list.length ? `Daftar Project Lab PSTI:\n${list.join('\n')}\n\nKetik nama project untuk info lebih detail!` : 'Tidak ada project saat ini.';
    }

    // =========================
    // RULE-BASED: LAB INFO
    // =========================
    if (msg.includes('fasilitas') && msg.includes('lab')) {
      if (info_lab.fasilitas && info_lab.fasilitas.length > 0) {
        return `Fasilitas Lab PSTI:\n${info_lab.fasilitas.map(f => `• ${f}`).join('\n')}`;
      }
      return 'Lab PSTI memiliki 40 PC, perangkat IoT, VR/AR, 3D Printer, dan alat pendukung riset lainnya.';
    }

    if ((msg.includes('jam') && msg.includes('buka')) || msg.includes('operasional')) {
      if (info_lab.jam_operasional) {
        return `Jam Operasional Lab PSTI:\n• Senin-Jumat: ${info_lab.jam_operasional.senin_jumat}\n• Sabtu: ${info_lab.jam_operasional.sabtu}\n• Minggu: ${info_lab.jam_operasional.minggu}`;
      }
      return 'Lab PSTI buka Senin–Jumat 08:00–17:00, Sabtu 08:00–14:00, Minggu tutup.';
    }

    if (msg.includes('kontak') || msg.includes('hubungi')) {
      if (info_lab.kontak) {
        return `Kontak Lab PSTI:\n📧 Email: ${info_lab.kontak.email}\n📞 Telp: ${info_lab.kontak.telepon}`;
      }
      return 'Kontak Lab PSTI: Email: pstilab@ubl.ac.id | Telp: (0721) 123456';
    }

    if (msg.includes('lokasi') || msg.includes('alamat')) {
      return info_lab.lokasi || 'Lab PSTI berada di Gedung C Lantai 3, Universitas Bandar Lampung, Lampung, Indonesia.';
    }

    // =========================
    // RULE-BASED: PEMBINA & KETUA PRODI
    // =========================
    if (msg.includes('pembina') || msg.includes('kakak')) {
      const list = pembina.map(p => `• ${p.nama} - ${p.role}`);
      return list.length 
        ? `Pembina Lab PSTI:\n${list.join('\n')}\n\nKakak-kakak ini bertanggung jawab atas segala kegiatan yang berlangsung di Lab PSTI!`
        : 'Informasi pembina belum tersedia.';
    }

    if (msg.includes('ketua') && (msg.includes('prodi') || msg.includes('psti'))) {
      if (ketua_prodi.nama) {
        return `Ketua Program Studi PSTI adalah ${ketua_prodi.nama}. ${ketua_prodi.deskripsi || ''}`;
      }
      return 'Informasi ketua prodi belum tersedia.';
    }

    // =========================
    // RULE-BASED: GENERAL QUESTIONS
    // =========================
    if ((msg.includes('siapa') && msg.includes('anggota')) || 
        (msg.includes('profil') && msg.includes('mahasiswa'))) {
      const list = allStudents.map(m => `• ${m.nama} (${m.role})`);
      context.lastMentionedContext = 'student_list';
      return list.length ? `Mahasiswa Lab PSTI:\n${list.join('\n')}` : 'Tidak ada data mahasiswa.';
    }

    // =========================
    // FALLBACK - Return null untuk ML
    // =========================
    return null;
  }

  return { run };
}

module.exports = { createKnowledgeEngine };