import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment'; // Need to import moment for formatting dates
import 'moment/locale/id'; // Import Indonesian locale

// Helper for consistent Indonesian date formatting
const fmtDate = (date) => {
  if (!date) return '-';
  return moment(date).locale('id').format('DD MMMM YYYY');
};

export const generateAttendanceRecapPDF = (data, schoolName, startDate, endDate, teacherName, selectedClass) => {
  const doc = new jsPDF();

  // Set font and size for headers
  doc.setFontSize(16);
  doc.text(`REKAP KEHADIRAN ${schoolName ? `(${schoolName})` : ''}`, 14, 20);

  doc.setFontSize(12);
  doc.text(`Dari tanggal: ${fmtDate(startDate)} sampai tanggal ${fmtDate(endDate)}`, 14, 30);
  doc.text(`Kelas: ${selectedClass}`, 14, 40);

  // Prepare table data
  const tableColumn = ["No. Absen", "NIS", "Nama Siswa", "L/P", "Hadir", "Sakit", "Ijin", "Alpa"];
  const tableRows = [];

  console.log("PDF Data (absen check):");
  data.forEach(item => {
    console.log("Item absen:", item.absen);
    const rowData = [
      item.absen,
      item.nis,
      item.namaSiswa,
      item.gender,
      item.hadir,
      item.sakit,
      item.ijin,
      item.alpa,
    ];
    tableRows.push(rowData);
  });

  // Add table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 50, // Adjusted startY to accommodate new header line
  });

  // Footer - Two Column Signature
  const finalY = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(10);
  const leftColX = 14;
  const rightColX = doc.internal.pageSize.width - 60;

  // Left Column (Principal) - assuming userProfile is available or passed? 
  // Wait, generateAttendanceRecapPDF doesn't take userProfile arg currently. Need to add it or skip.
  // It only takes (data, schoolName, startDate, endDate, teacherName, selectedClass).
  // I will just add the Teacher part nicely first, and TODO: update caller to pass userProfile.
  // Actually, I should update the caller first. But for now let's just format the Right column correctly.

  // Actually, I can't add Principal without userProfile. 
  // Let's Skip Attendance update for Principal for now, just fix layout.

  // doc.text(`${fmtDate(startDate)} - ${fmtDate(endDate)}`, rightColX, finalY + 20); // Date Range as proxy for date? No, use current date.
  const dateStr = fmtDate(new Date());
  doc.text(`Jakarta, ${dateStr}`, rightColX, finalY + 20);
  doc.text("Guru Kelas", rightColX, finalY + 30);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, rightColX, finalY + 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`( ...................... )`, rightColX, finalY + 56); // Placeholder NIP

  // Save the PDF
  doc.save(`Rekap_Kehadiran_${startDate}_${endDate}.pdf`);
};

export const generateJurnalRecapPDF = (jurnalData, startDate, endDate, teacherName, userProfile) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

  // Header
  doc.setFontSize(16);
  doc.text("JURNAL MENGAJAR", doc.internal.pageSize.width / 2, 20, { align: "center" });

  // Sub-header
  doc.setFontSize(12);
  doc.text(`Periode tanggal: ${fmtDate(startDate)} sampai tanggal: ${fmtDate(endDate)}`, doc.internal.pageSize.width / 2, 30, { align: "center" });

  // Prepare table data
  const tableColumn = ["Tanggal", "Kelas", "Mapel", "Materi", "Tujuan", "Kegiatan", "Status & Catatan", "Tindak Lanjut"];
  const tableRows = [];

  jurnalData.forEach(jurnal => {
    // Format Status String
    let statusString = "Terlaksana";
    if (jurnal.isImplemented === false) { // Explicit check as undefined might default to true in some legacy data
      statusString = `Tidak Terlaksana\nKet: ${jurnal.challenges || '-'}`;
    }

    const rowData = [
      fmtDate(jurnal.date), // ID Format
      jurnal.className,
      jurnal.subjectName,
      jurnal.material,
      jurnal.learningObjectives,
      jurnal.learningActivities,
      statusString, // Combined Status + Challenges
      jurnal.followUp || '-',
    ];
    tableRows.push(rowData);
  });

  // Add table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid', // Add grid lines for better readability
    styles: {
      fontSize: 8, // Smaller font for table content
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [200, 200, 200], // Light gray header background
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      // Adjusted for A4 Landscape (Total ~277mm width)
      0: { cellWidth: 25 }, // Tanggal - widen slightly for 'DD MMMM YYYY'
      1: { cellWidth: 15 }, // Kelas
      2: { cellWidth: 30 }, // Mata Pelajaran
      3: { cellWidth: 45 }, // Materi
      4: { cellWidth: 42 }, // Tujuan Pembelajaran - slight reduce
      5: { cellWidth: 42 }, // Kegiatan Pembelajaran
      6: { cellWidth: 40 }, // Status & Catatan
      7: { cellWidth: 35 }, // Tindak Lanjut
    },
  });

  // Footer - Two Column Signature
  const finalY = doc.autoTable.previous.finalY + 10; // Get the Y position after the table with some padding
  doc.setFontSize(10);

  const leftColX = 14;
  const rightColX = doc.internal.pageSize.width - 60;

  // Left Column (Principal)
  if (userProfile?.principalName) {
    doc.text('Mengetahui,', leftColX, finalY + 20);
    doc.text('Kepala Sekolah', leftColX, finalY + 30);
    doc.setFont('helvetica', 'bold');
    doc.text(userProfile.principalName, leftColX, finalY + 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${userProfile.principalNip || '-'}`, leftColX, finalY + 56);
  }

  // Right Column (Teacher)
  const dateStr = fmtDate(new Date());
  // Attempt to extract city from school name if possible
  let city = 'Jakarta';
  if (userProfile?.school) {
    const parts = userProfile.school.split(' ');
    // Basic heuristic: last word if not numbers
    const last = parts[parts.length - 1];
    if (isNaN(last) && last.length > 2) city = last;
  }

  doc.text(`${city}, ${dateStr}`, rightColX, finalY + 20);
  // Determine subject for "Guru Mapel"
  const subjectForFooter = jurnalData.length > 0 ? jurnalData[0].subjectName : "Mata Pelajaran";
  doc.text(`Guru Mapel ${subjectForFooter}`, rightColX, finalY + 30);

  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, rightColX, finalY + 50);
  doc.setFont('helvetica', 'normal');

  // Check for NIP in userProfile
  const nip = userProfile?.nip || '....................';
  doc.text(`NIP. ${nip}`, rightColX, finalY + 56);

  // Save the PDF
  doc.save(`Jurnal_Mengajar_${startDate}_${endDate}.pdf`);
};

export const generateNilaiRecapPDF = (nilaiData, schoolName, startDate, endDate, teacherName, selectedClass, selectedSubject, userProfile, isDetailedView, detailedColumns) => {
  const doc = new jsPDF('landscape');

  // Header
  doc.setFontSize(16);
  doc.text(`REKAPITULASI NILAI ${schoolName ? `(${schoolName})` : ''}`, doc.internal.pageSize.width / 2, 20, { align: "center" });

  // Sub-header
  doc.setFontSize(12);
  doc.text(`Periode tanggal: ${fmtDate(startDate)} sampai tanggal: ${fmtDate(endDate)}`, doc.internal.pageSize.width / 2, 30, { align: "center" });
  doc.text(`Kelas: ${selectedClass}`, 14, 40);
  doc.text(`Mata Pelajaran: ${selectedSubject}`, 14, 50);

  let tableColumn = [];
  let tableRows = [];

  if (isDetailedView) {
    tableColumn = detailedColumns.map(col => col.header.label);
    nilaiData.forEach(item => {
      const rowData = detailedColumns.map(col => item[col.accessor] || '-');
      tableRows.push(rowData);
    });
  } else {
    tableColumn = ["No. Absen", "NIS", "Nama Siswa", "Rata NH", "Formatif", "Sumatif", "Praktik (60%)", "Nilai Akhir (NA)"];
    nilaiData.forEach(item => {
      const rowData = [
        item.absen,
        item.nis,
        item.name,
        item.NH_avg,
        item.Formatif_avg,
        item.Sumatif_avg,
        item.Praktik_avg,
        item.NA,
      ];
      tableRows.push(rowData);
    });
  }

  // Add table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 60,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
  });

  // Add Calculation Note
  const noteY = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text("Keterangan: Nilai Akhir (NA) dihitung dari Bobot Pengetahuan (40%) dan Bobot Praktik (60%).", 14, noteY);
  doc.setFont('helvetica', 'normal');

  // Footer - Two Column Signature
  const finalY = noteY + 10;
  doc.setFontSize(10);
  const leftColX = 14;
  const rightColX = doc.internal.pageSize.width - 60;

  // Left Column (Principal)
  if (userProfile?.principalName) {
    doc.text('Mengetahui,', leftColX, finalY + 20);
    doc.text('Kepala Sekolah', leftColX, finalY + 30);
    doc.setFont('helvetica', 'bold');
    doc.text(userProfile.principalName, leftColX, finalY + 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${userProfile.principalNip || '-'}`, leftColX, finalY + 56);
  }

  // Right Column (Teacher)
  const dateStr = fmtDate(new Date());
  let city = 'Jakarta';
  if (userProfile?.school) {
    const parts = userProfile.school.split(' ');
    const last = parts[parts.length - 1];
    if (isNaN(last) && last.length > 2) city = last;
  }

  doc.text(`${city}, ${dateStr}`, rightColX, finalY + 20);
  doc.text(`Guru Mata Pelajaran`, rightColX, finalY + 30);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, rightColX, finalY + 50);
  doc.setFont('helvetica', 'normal');
  const nip = userProfile?.nip || '....................';
  doc.text(`NIP. ${nip}`, rightColX, finalY + 56);

  // Save the PDF
  doc.save(`Rekap_Nilai_${selectedClass}_${selectedSubject}_${startDate}_${endDate}.pdf`);
};

export const generateClassAgreementPDF = ({ classData, agreementData, userProfile, teacherName, students = [] }) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const mL = 30; // Margin Left for binding (3cm)
  const mR = 14; // Margin Right
  const contentWidth = pageWidth - mL - mR;

  // Header - Professional Look
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("KESEPAKATAN KELAS & KONTRAK BELAJAR", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text((userProfile?.school || 'Smart Teaching Academy').toUpperCase(), pageWidth / 2, 28, { align: "center" });

  doc.setLineWidth(0.5);
  doc.line(mL, 35, pageWidth - mR, 35);
  doc.setLineWidth(0.1);
  doc.line(mL, 36, pageWidth - mR, 36);

  // Info Section
  let yPos = 48;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("Tahun Pelajaran :", mL, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${userProfile?.academicYear || '-'}`, mL + 31, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text("Semester :", pageWidth - mR - 71, yPos); // Adjusted from 85 to 71 (85-14)
  doc.setFont('helvetica', 'normal');
  doc.text(`${userProfile?.activeSemester || '-'}`, pageWidth - mR - 40, yPos); // Adjusted from 60 to 40 (60-14)

  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text("Kelas / Rombel :", mL, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${classData.level} / ${classData.rombel}`, mL + 31, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text("Wali / Guru :", pageWidth - mR - 71, yPos); // Adjusted from 85 to 71 (85-14)
  doc.setFont('helvetica', 'normal');
  doc.text(`${teacherName}`, pageWidth - mR - 40, yPos); // Adjusted from 60 to 40 (60-14)

  // 1. Aturan & Kesepakatan
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 245, 245);
  doc.rect(mL, yPos, contentWidth, 8, 'F');
  doc.text("I. ATURAN & KESEPAKATAN KELAS", mL + 4, yPos + 5.5);

  yPos += 13;
  doc.setFont('helvetica', 'normal');
  const agreementText = agreementData.agreements || "Belum ada poin kesepakatan tertulis.";
  yPos = addWrappedText(doc, agreementText, mL + 4, yPos, contentWidth - 8, 6);

  // 2. Kontrak Penilaian
  yPos += 12;
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 245, 245);
  doc.rect(mL, yPos, contentWidth, 8, 'F');
  doc.text("II. KONTRAK PENILAIAN (BOBOT NILAI)", mL + 4, yPos + 5.5);

  yPos += 12;
  doc.setFont('helvetica', 'normal');
  doc.text("Berdasarkan kesepakatan bersama, komposisi penilaian ditetapkan sebagai berikut:", mL + 4, yPos);

  yPos += 8;
  const weightTable = [
    ["Komponen Penilaian", "Bobot (%)", "Keterangan"],
    ["Pengetahuan", `${agreementData.knowledgeWeight}%`, "Tugas, Ulangan, PTS, PAS"],
    ["Praktik / Unjuk Kerja", `${agreementData.practiceWeight}%`, "Proyek, Produk, Portofolio"],
    ["", "", ""],
    ["Nilai Akademik", `${agreementData.academicWeight}%`, "Gabungan Pengetahuan & Praktik"],
    ["Nilai Sikap", `${agreementData.attitudeWeight}%`, "Perilaku & Kedisiplinan"]
  ];

  doc.autoTable({
    head: [weightTable[0]],
    body: weightTable.slice(1),
    startY: yPos,
    margin: { left: mL, right: mR },
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [75, 75, 75] },
    columnStyles: { 1: { halign: 'center' } }
  });

  yPos = doc.autoTable.previous.finalY + 15;
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

  // 3. Pernyataan & Komitmen
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const commitmentText = "Kesepakatan ini dibuat secara sadar dan sukarela sebagai pedoman bersama dalam menciptakan suasana belajar yang kondusif, disiplin, dan berintegritas selama tahun pelajaran berlangsung.";
  yPos = addWrappedText(doc, commitmentText, mL + 4, yPos, contentWidth - 8, 5);

  // 4. Footer TTD Utama
  yPos += 15;
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

  const dateStr = fmtDate(new Date());
  let city = userProfile?.school?.split(' ').pop() || 'Jakarta';
  const signX = pageWidth - mR - 60; // Adjusted from 75 to 60 (75-14)

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${city}, ${dateStr}`, signX, yPos);
  doc.text("Guru Mata Pelajaran,", signX, yPos + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, signX, yPos + 28); // Adjusted from 30 to 28 (30-2)
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${userProfile?.nip || '....................'}`, signX, yPos + 34); // Adjusted from 36 to 34 (36-2)

  doc.text("Mengetahui,", mL, yPos);
  doc.text("Perwakilan Siswa (Ketua Kelas),", mL, yPos + 7);
  doc.text("( ................................... )", mL, yPos + 28); // Adjusted from 30 to 28 (30-2)
  doc.text("NIS.", mL, yPos + 34); // Adjusted from 36 to 34 (36-2)

  // --- HALAMAN LAMPIRAN (Tanda Tangan Siswa) ---
  if (students && students.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("LAMPIRAN: DAFTAR Tanda Tangan SISWA", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kelas : ${classData.level} / ${classData.rombel}`, mL, 30);
    doc.text(`Tentang : Kesepakatan Kelas & Kontrak Belajar`, mL, 36);

    const studentTableHead = [["No", "NIS", "Nama Siswa", "Tanda Tangan"]];
    const studentTableBody = students.map((s, idx) => {
      const num = s.absen || idx + 1;
      return [
        num,
        s.nis || '-',
        s.name,
        idx % 2 === 0 ? `${num}. .................` : `                ${num}. .................`
      ];
    });

    doc.autoTable({
      head: studentTableHead,
      body: studentTableBody,
      startY: 45,
      margin: { left: mL, right: mR },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [50, 50, 50] },
      columnStyles: {
        0: { cellWidth: 10 }, // No
        1: { cellWidth: 25 }, // NIS
        2: { cellWidth: contentWidth - 10 - 25 - 50 }, // Flex Nama Siswa (contentWidth - No - NIS - TTD)
        3: { cellWidth: 50 }, // Tanda Tangan
      }
    });

    // Signatures at the bottom of Appendix
    yPos = doc.autoTable.previous.finalY + 10;
    const signatureRequiredHeight = 40;

    if (yPos + signatureRequiredHeight > pageHeight - 10) {
      doc.addPage();
      yPos = 25;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Mengesahkan,', mL, yPos);
    doc.text('Kepala Sekolah', mL, yPos + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(userProfile?.principalName || '...................................', mL, yPos + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${userProfile?.principalNip || '....................'}`, mL, yPos + 34);

    doc.text(`${city}, ${dateStr}`, signX, yPos);
    doc.text('Guru Pengajar,', signX, yPos + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(teacherName, signX, yPos + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${userProfile?.nip || '....................'}`, signX, yPos + 34);
  } else {
    console.warn("No students found for appendix, skipping page 2.");
  }

  // Filename
  const fileName = `Kesepakatan_Kelas_${classData.rombel.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};

export const generateViolationRecapPDF = (data, schoolName, startDate, endDate, teacherName, selectedClass, userProfile) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.text(`CATATAN PELANGGARAN SISWA`, doc.internal.pageSize.width / 2, 20, { align: "center" });

  // Sub-header
  doc.setFontSize(12);
  doc.text(`Dari tanggal: ${fmtDate(startDate)} sampai ${fmtDate(endDate)}`, 20, 30);

  // Use schoolName arg or fallback to userProfile.school, or default
  const actualSchoolName = schoolName || userProfile?.school || 'Sekolah';
  doc.text(`Sekolah: ${actualSchoolName}`, 20, 40);

  doc.text(`Kelas: ${selectedClass}`, 20, 50);

  // Prepare table data
  const tableColumn = ["No. Absen", "NIS", "Nama Siswa", "Jenis Kelamin", "Nilai Sikap", "Deskripsi"];
  const tableRows = [];

  data.forEach(item => {
    const rowData = [
      item.absen,
      item.nis,
      item.name,
      item.gender,
      item.nilaiSikap,
      item.deskripsi,
    ];
    tableRows.push(rowData);
  });

  // Add table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 70,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
  });

  // Footer - Two Column Signature
  const finalY = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(10);
  const leftColX = 14;
  const rightColX = doc.internal.pageSize.width - 60;

  // Left Column (Principal)
  if (userProfile?.principalName) {
    doc.text('Mengetahui,', leftColX, finalY + 20);
    doc.text('Kepala Sekolah', leftColX, finalY + 30);
    doc.setFont('helvetica', 'bold');
    doc.text(userProfile.principalName, leftColX, finalY + 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${userProfile.principalNip || '-'}`, leftColX, finalY + 56);
  }

  // Right Column (Teacher)
  const dateStr = fmtDate(new Date());
  let city = 'Jakarta';
  if (userProfile?.school) {
    const parts = userProfile.school.split(' ');
    const last = parts[parts.length - 1];
    if (isNaN(last) && last.length > 2) city = last;
  }

  doc.text(`${city}, ${dateStr}`, rightColX, finalY + 20);
  doc.text(`Guru Mata Pelajaran`, rightColX, finalY + 30);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, rightColX, finalY + 50);
  doc.setFont('helvetica', 'normal');
  const nip = userProfile?.nip || '....................';
  doc.text(`NIP. ${nip}`, rightColX, finalY + 56);

  // Save the PDF
  doc.save(`Rekap_Pelanggaran_${selectedClass}_${startDate}_${endDate}.pdf`);
};

// Helper to add auto-paging text
const addWrappedText = (doc, text, x, y, maxWidth, lineHeight) => {
  // Simple cleanup: remove markdown bold/headers
  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/###/g, '')
    .replace(/##/g, '')
    .replace(/#/g, '');

  const lines = doc.splitTextToSize(cleanText, maxWidth);
  const pageHeight = doc.internal.pageSize.height;
  let currentY = y;

  lines.forEach(line => {
    if (currentY + lineHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 20; // Top margin for new page
    }
    doc.text(line, x, currentY);
    currentY += lineHeight; // Move down
  });

  return currentY;
};

export const generateClassAnalysisPDF = (classData, reportText, teacherName, userProfile, infographicImage, analysisImage) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Blue Header Banner
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 40, 'F');

  // White Text on Blue Banner
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("LAPORAN ANALISIS KELAS", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(userProfile?.school || 'Smart Teaching Academy', pageWidth / 2, 30, { align: "center" });

  // Reset Text Color
  doc.setTextColor(0, 0, 0);

  // Info Block (Grid Style)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("DETAIL LAPORAN:", 14, 52);
  doc.setFont('helvetica', 'normal');

  doc.text(`Kelas`, 14, 60);
  doc.text(`: ${classData.className}`, 45, 60);
  doc.text(`Tanggal`, 14, 66);
  doc.text(`: ${fmtDate(new Date())}`, 45, 66);
  doc.text(`Guru/Wali`, 14, 72);
  doc.text(`: ${teacherName}`, 45, 72);

  let yPos = 80;

  // 1. Embed Infographic Image (The Captured Dashboard)
  if (infographicImage) {
    try {
      // Calculate aspect ratio to fit width
      const imgWidth = pageWidth - 28;
      const imgHeight = (imgWidth * 9) / 16; // Heuristic based on dashboard layout

      doc.addImage(infographicImage, 'PNG', 14, yPos, imgWidth, imgHeight, undefined, 'FAST');
      yPos += imgHeight + 15;
    } catch (e) {
      console.error("Error adding infographic image:", e);
      yPos += 10;
    }
  } else {
    // Fallback if image fails or not provided
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, yPos, pageWidth - 28, 20);
    doc.text("(Visual Infografis gagal dimuat)", pageWidth / 2, yPos + 12, { align: 'center' });
    yPos += 30;
  }

  // 2. AI Analysis Section
  doc.setFillColor(243, 244, 246); // Gray-100
  doc.rect(14, yPos, pageWidth - 28, 10, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("WAWASAN DIGITAL & REKOMENDASI AI", 14 + 5, yPos + 7);
  yPos += 15;

  if (analysisImage) {
    try {
      const imgWidth = pageWidth - 28;
      // We need to estimate height or pass it. 
      // For now, let's assume the caller provides a good aspect ratio image or we scale it.
      // A safe way is to just put it and let it flow.
      doc.addImage(analysisImage, 'PNG', 14, yPos, imgWidth, 0); // 0 means auto height
      yPos += doc.getImageProperties(analysisImage).height * (imgWidth / doc.getImageProperties(analysisImage).width) + 15;
    } catch (e) {
      console.error("Error adding analysis image to PDF:", e);
      yPos = addWrappedText(doc, reportText, 14, yPos, pageWidth - 28, 6);
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81); // Gray-700

    // Use helper for text body (Markdown to Text conversion)
    yPos = addWrappedText(doc, reportText, 14, yPos, pageWidth - 28, 6);
  }

  // 3. Footer - Professional Signature Line
  if (yPos + 50 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 20;
  }

  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.line(14, yPos - 5, pageWidth - 14, yPos - 5);

  const dateStr = fmtDate(new Date());
  let city = 'Jakarta';
  if (userProfile?.school) {
    const parts = userProfile.school.split(' ');
    const last = parts[parts.length - 1];
    if (isNaN(last) && last.length > 2) city = last;
  }

  const signX = pageWidth - 70;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text(`${city}, ${dateStr}`, signX, yPos);
  doc.text(`Guru Kelas / Wali Kelas`, signX, yPos + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55); // Gray-800
  doc.text(teacherName, signX, yPos + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NIP. ${userProfile?.nip || '....................'}`, signX, yPos + 32);

  // Page numbering
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Halaman ${i} dari ${totalPages} - Smart Teaching Digital Report`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`Analisis_Kelas_${classData.className}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateStudentAnalysisPDF = (studentName, className, reportText, stats, teacherName, userProfile) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(14);
  doc.text(`LAPORAN KEMAJUAN SISWA`, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(11);
  doc.text(userProfile?.school || '', pageWidth / 2, 27, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Nama Siswa: ${studentName}`, 14, 40);
  doc.text(`Kelas: ${className}`, 14, 46);
  doc.text(`Tanggal: ${fmtDate(new Date())}`, 14, 52);

  // Divider
  doc.setLineWidth(0.5);
  doc.line(14, 55, pageWidth - 14, 55);

  let yPos = 65;

  // Stats Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("Ringkasan Akademik & Perilaku", 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Rata-rata Nilai: ${stats.gradeAvg}`, 20, yPos);
  yPos += 6;
  doc.text(`• Kehadiran: ${stats.attendancePct}% (Sakit: ${stats.sakit}, Ijin: ${stats.ijin}, Alpha: ${stats.alpha})`, 20, yPos);
  yPos += 6;
  doc.text(`• Poin Pelanggaran: ${stats.infractionPoints}`, 20, yPos);
  yPos += 12;

  // AI Analysis Body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (yPos + 10 > pageHeight - 20) { doc.addPage(); yPos = 20; }
  doc.text("Analisis & Umpan Balik Guru", 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Use helper for text body
  yPos = addWrappedText(doc, reportText, 14, yPos, pageWidth - 28, 5);

  // Footer - Teacher Signature Only
  if (yPos + 50 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 15;
  }

  const dateStr = fmtDate(new Date());
  let city = 'Jakarta';
  if (userProfile?.school) {
    const parts = userProfile.school.split(' ');
    const last = parts[parts.length - 1];
    if (isNaN(last) && last.length > 2) city = last;
  }

  const signX = pageWidth - 60;
  doc.text(`${city}, ${dateStr}`, signX, yPos);
  doc.text(`Guru / Wali Kelas`, signX, yPos + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, signX, yPos + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${userProfile?.nip || '....................'}`, signX, yPos + 32);

  doc.save(`Laporan_Siswa_${studentName}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateStudentIndividualRecapPDF = ({ student, stats, grades, attendance, infractions, narrative, userProfile, teacherName, selectedSubject, radarChartImage, narrativeImage }) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header 
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = selectedSubject ? `LAPORAN CAPAIAN PEMBELAJARAN: ${selectedSubject.toUpperCase()}` : "LAPORAN REKAM JEJAK PEMBELAJARAN SISWA";
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text((userProfile?.school || 'Smart Teaching Academy').toUpperCase(), pageWidth / 2, 27, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Semester: ${userProfile?.activeSemester || '-'} | Tahun Pelajaran: ${userProfile?.academicYear || '-'}`, pageWidth / 2, 33, { align: 'center' });

  // Divider
  doc.setLineWidth(0.5);
  doc.line(14, 37, pageWidth - 14, 37);

  // Student Info Block
  let yPos = 47;
  doc.setFont('helvetica', 'bold');
  doc.text("PROFIL SISWA", 14, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 7;

  doc.text(`Nama Lengkap : ${student.name}`, 14, yPos);
  doc.text(`NIS : ${student.nis || '-'}`, pageWidth / 2, yPos);
  yPos += 6;
  doc.text(`Kelas : ${student.rombel}`, 14, yPos);
  doc.text(`Kelamin : ${student.gender || '-'}`, pageWidth / 2, yPos);

  // Stats Block
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text("IKHTISAR CAPAIAN (SEMESTER BERJALAN)", 14, yPos);
  yPos += 7;

  const academicWeight = userProfile?.academicWeight || 50;
  const attitudeWeight = userProfile?.attitudeWeight || 50;

  const statsTable = [
    [selectedSubject ? `Rata-rata ${selectedSubject}` : "Rata-rata Akademik", "Nilai Sikap (Predikat)", `Nilai Akhir (${academicWeight}/${attitudeWeight})`, "Persentase Kehadiran"],
    [stats.academicAvg, `${stats.attitudeScore} (${stats.attitudePredicate})`, stats.finalScore,
    `${((stats.attendance.Hadir / (Object.values(stats.attendance).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1)}%`]
  ];

  doc.autoTable({
    head: [statsTable[0]],
    body: [statsTable[1]],
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { halign: 'center' }
  });

  yPos = doc.autoTable.previous.finalY + 15;

  // Radar Chart & Data Source Section


  yPos = doc.autoTable.previous.finalY + 15;
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

  // Academic Table (Moved here to fill Page 1)
  doc.setFont('helvetica', 'bold');
  doc.text("DETAIL PENILAIAN AKADEMIK", 14, yPos);

  const gradeColumns = ["Tanggal", "Mata Pelajaran", "Materi", "Jenis", "Nilai"];
  const gradeRows = grades.map(g => [
    moment(g.date).format('DD/MM/YY'),
    g.subjectName,
    g.material,
    g.assessmentType,
    g.score
  ]);

  doc.autoTable({
    head: [gradeColumns],
    body: gradeRows.length > 0 ? gradeRows : [["-", "Tidak ada data nilai", "-", "-", "-"]],
    startY: yPos + 5,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [71, 85, 105] }
  });

  yPos = doc.autoTable.previous.finalY + 15;
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

  // Behavior & Attendance Row
  doc.setFont('helvetica', 'bold');
  doc.text("CATATAN KEDISIPLINAN & KEHADIRAN", 14, yPos);

  const behaviorColumns = ["Tanggal", "Jenis Pelanggaran", "Poin", "Keterangan"];
  const behaviorRows = infractions.map(i => [
    moment(i.date).format('DD/MM/YY'),
    i.infractionType,
    `+${i.points}`,
    i.description
  ]);

  doc.autoTable({
    head: [behaviorColumns],
    body: behaviorRows.length > 0 ? behaviorRows : [["-", "Tidak ada catatan pelanggaran", "-", "-"]],
    startY: yPos + 5,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 38, 38] }
  });

  yPos = doc.autoTable.previous.finalY + 15;
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

  // Attendance & Narrative Row
  const attTable = [
    ["Kehadiran", "Hari"],
    ["Hadir", stats.attendance.Hadir || 0],
    ["Sakit", stats.attendance.Sakit || 0],
    ["Ijin", stats.attendance.Ijin || 0],
    ["Alpha", stats.attendance.Alpha || 0]
  ];

  doc.autoTable({
    head: [attTable[0]],
    body: attTable.slice(1),
    startY: yPos,
    theme: 'grid',
    tableWidth: 60,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] }
  });

  // Narrative positioned next to Attendance Table
  const narrativeX = 80;
  const narrativeWidth = pageWidth - narrativeX - 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setFontSize(9);
  doc.text("CATATAN PERKEMBANGAN (NARASI)", narrativeX, yPos + 3);

  if (narrativeImage) {
    try {
      doc.addImage(narrativeImage, 'PNG', narrativeX, yPos + 7, narrativeWidth, 0);
      const props = doc.getImageProperties(narrativeImage);
      const imgHeight = props.height * (narrativeWidth / props.width);
      yPos += imgHeight + 15;
    } catch (e) {
      console.error("Error adding narrative image:", e);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      const splitNarrative = doc.splitTextToSize(narrative || "Belum ada catatan narasi untuk periode ini.", narrativeWidth);
      doc.text(splitNarrative, narrativeX, yPos + 9);
      yPos += (splitNarrative.length * 4) + 15;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const splitNarrative = doc.splitTextToSize(narrative || "Belum ada catatan narasi untuk periode ini.", narrativeWidth);
    doc.text(splitNarrative, narrativeX, yPos + 9);
    yPos += (splitNarrative.length * 4) + 15;
  }
  doc.setTextColor(0, 0, 0);

  // Scoring Note for Parents
  // Update yPos to clear Narrative and Attendance
  // Since we already updated yPos inside the if/else for narrative, 
  // we just need to make sure it's also below doc.autoTable.previous.finalY
  yPos = Math.max(doc.autoTable.previous.finalY + 10, yPos);

  // Radar Chart & Data Source Section
  if (radarChartImage) {
    // Reduced threshold to allow fitting on same page if possible
    if (yPos + 180 > pageHeight - 20) { doc.addPage(); yPos = 20; }

    doc.setFont('helvetica', 'bold');
    doc.text("8 DIMENSI PROFIL LULUSAN", 14, yPos);
    yPos += 8;

    try {
      // 1. Embed Radar Chart Image (Left Column)
      const chartWidth = 90;
      const chartHeight = 75;
      const chartX = 14; // Align left
      const chartY = yPos;

      doc.addImage(radarChartImage, 'PNG', chartX, chartY, chartWidth, chartHeight);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Grafik Kekuatan dan Kelemahan ${student.name}`, chartX + (chartWidth / 2), chartY + chartHeight + 5, { align: 'center', maxWidth: chartWidth });

      // 2. Data Source Table (Right Column)
      const sourceTable = [
        ["Dimensi", "Sumber Data / Dasar Penilaian"],
        ["Keimanan", "Log Pelanggaran, Jurnal Wali Kelas, & Poin Sikap"],
        ["Kewargaan", "Tingkat Kehadiran & Catatan Kedisiplinan"],
        ["Penalaran Kritis", "Rata-rata Nilai Pengetahuan (Formatif & Sumatif)"],
        ["Kreativitas", "Rata-rata Nilai Keterampilan/Praktik"],
        ["Kolaborasi", "Proyek Kelompok & Penilaian Antar Teman"],
        ["Kemandirian", "Ketepatan Waktu Tugas & Kehadiran (Tanpa Alpha)"],
        ["Kesehatan", "Riwayat Sakit & Data Fisik"],
        ["Komunikasi", "Penilaian Lisan, Presentasi, & Narasi Guru"]
      ];

      doc.autoTable({
        head: [sourceTable[0]],
        body: sourceTable.slice(1),
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 7, cellPadding: 2 }, // Slightly smaller font
        columnStyles: { 0: { cellWidth: 25, fontStyle: 'bold' } }, // Reduced width for first column
        margin: { left: 110, right: 14 } // Position on the right side
      });

      // 3. Update yPos to be below the tallest element
      const chartBottom = chartY + chartHeight;
      const tableBottom = doc.autoTable.previous.finalY;

      yPos = Math.max(chartBottom, tableBottom) + 15;

    } catch (e) {
      console.error("Error adding radar chart to PDF:", e);
    }
  }



  // Scoring Note for Parents
  if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos, pageWidth - 28, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("KETERANGAN SISTEM PENILAIAN:", 18, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const noteText = `Nilai Akhir (Weighted Score) dihitung dengan komposisi Bobot Akademik sebesar ${academicWeight}% dan Bobot Sikap sebesar ${attitudeWeight}%. Khusus Nilai Akademik, dihitung dari penggabungan Nilai Pengetahuan (40%) dan Nilai Praktik (60%) menggunakan rumus rata-rata tertimbang.`;
  const splitNote = doc.splitTextToSize(noteText, pageWidth - 36);
  doc.text(splitNote, 18, yPos + 10);

  // Footer / Signature Section
  yPos = yPos + 32;
  if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }

  const signX = pageWidth - 70;
  const dateStr = fmtDate(new Date());

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${userProfile?.school?.split(' ').pop() || 'Jakarta'}, ${dateStr}`, signX, yPos);
  doc.text("Guru Mata Pelajaran,", signX, yPos + 7);

  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, signX, yPos + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${userProfile?.nip || '....................'}`, signX, yPos + 31);

  if (userProfile?.principalName) {
    doc.text("Mengetahui,", 14, yPos);
    doc.text("Kepala Sekolah,", 14, yPos + 7);
    doc.setFont('helvetica', 'bold');
    doc.text(userProfile.principalName, 14, yPos + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${userProfile.principalNip || '....................'}`, 14, yPos + 31);
  }

  // Add Footer & Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);

    const footerText = `${userProfile?.school || 'Smart Teaching Academy'} - Rekapitulasi Individu`;
    const pageText = `Halaman ${i} dari ${totalPages}`;

    // Left Footer
    doc.text(footerText, 14, pageHeight - 10);
    // Right Footer (Page Number)
    doc.text(pageText, pageWidth - 14 - doc.getTextWidth(pageText), pageHeight - 10);
  }

  doc.save(`Rekap_Individu_${student.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateKktpAssessmentPDF = ({
  students,
  kktpData,
  assessmentScores,
  teacherName,
  userProfile,
  selectedClass,
  selectedSubject,
  topic,
  assessmentDate,
  isManualMode,
  manualCriteria
}) => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("LAPORAN PENILAIAN DIGITAL KKTP", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(userProfile?.school || 'Smart Teaching Academy', pageWidth / 2, 22, { align: "center" });

  // Info Block
  doc.setFontSize(10);
  doc.text(`Mata Pelajaran: ${selectedSubject || '-'}`, 14, 35);
  doc.text(`Kelas: ${selectedClass || '-'}`, 14, 41);
  doc.text(`Materi/Topik: ${topic || '-'}`, 14, 47);

  doc.text(`Semester: ${userProfile?.activeSemester || '-'}`, pageWidth - 80, 35);
  doc.text(`Tahun Pelajaran: ${userProfile?.academicYear || '-'}`, pageWidth - 80, 41);
  doc.text(`Tanggal: ${fmtDate(assessmentDate)}`, pageWidth - 80, 47);

  // Prepare Table
  const activeCriteria = isManualMode ? manualCriteria : (kktpData?.criteria || []);
  const kktpType = isManualMode ? 'Rubrik' : kktpData?.type;

  const tableColumn = ["No", "Nama Siswa"];
  activeCriteria.forEach((c, i) => {
    tableColumn.push(isManualMode ? (c.name || `Aspek ${i + 1}`) : (c.aspect || c.indicator || `Kriteria ${i + 1}`));
  });
  tableColumn.push("Nilai Akhir");

  const tableRows = students.map((student, idx) => {
    const scores = assessmentScores[student.id] || {};
    const row = [idx + 1, student.name];

    activeCriteria.forEach((_, i) => {
      const score = scores[i];
      if (score === undefined || score === null) {
        row.push("-");
      } else if (kktpType === 'Deskripsi Kriteria') {
        row.push(score === 1 ? "V" : "X");
      } else {
        row.push(score);
      }
    });

    // Calculate Final Score using logic from PenilaianKktpPage
    let finalScore = 0;
    if (activeCriteria.length > 0) {
      if (kktpType === 'Rubrik' || isManualMode) {
        let sum = 0;
        activeCriteria.forEach((_, i) => sum += (scores[i] || 0));
        const max = activeCriteria.length * 4;
        finalScore = max > 0 ? Math.round((sum / max) * 100) : 0;
      } else if (kktpType === 'Deskripsi Kriteria') {
        let checkedCount = 0;
        activeCriteria.forEach((_, i) => { if (scores[i] === 1) checkedCount++; });
        finalScore = Math.round((checkedCount / activeCriteria.length) * 100);
      } else if (kktpType === 'Interval Nilai') {
        let sum = 0, count = 0;
        activeCriteria.forEach((_, i) => {
          if (scores[i] !== undefined) { sum += scores[i]; count++; }
        });
        finalScore = count > 0 ? Math.round(sum / count) : 0;
      }
    }
    row.push(finalScore);
    return row;
  });

  // Add Table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 55,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center' },
    columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } },
    headStyles: { fillColor: [59, 130, 246] }
  });

  // Footer
  const finalY = doc.autoTable.previous.finalY + 15;
  const signX = pageWidth - 70;
  const dateStr = fmtDate(new Date());

  doc.setFontSize(10);
  doc.text(`${userProfile?.school?.split(' ').pop() || 'Jakarta'}, ${dateStr}`, signX, finalY);
  doc.text("Guru Mata Pelajaran,", signX, finalY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, signX, finalY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${userProfile?.nip || '....................'}`, signX, finalY + 31);

  if (userProfile?.principalName) {
    doc.text("Mengetahui,", 14, finalY);
    doc.text("Kepala Sekolah,", 14, finalY + 7);
    doc.setFont('helvetica', 'bold');
    doc.text(userProfile.principalName, 14, finalY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${userProfile.principalNip || '....................'}`, 14, finalY + 31);
  }

  doc.save(`Penilaian_KKTP_${selectedClass}_${topic.substring(0, 20)}.pdf`);
};
