import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment'; // Need to import moment for formatting dates

export const generateAttendanceRecapPDF = (data, schoolName, startDate, endDate, teacherName, selectedClass) => {
  const doc = new jsPDF();

  // Set font and size for headers
  doc.setFontSize(16);
  doc.text(`REKAP KEHADIRAN ${schoolName ? `(${schoolName})` : ''}`, 14, 20);

  doc.setFontSize(12);
  doc.text(`Dari tanggal: ${startDate} sampai tanggal ${endDate}`, 14, 30);
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

  // Add signature
  const finalY = doc.autoTable.previous.finalY; // Get the Y position after the table
  doc.setFontSize(12);
  doc.text("Guru Mata Pelajaran", doc.internal.pageSize.width - 60, finalY + 20, { align: "right" });
  doc.text(`(${teacherName})`, doc.internal.pageSize.width - 60, finalY + 30, { align: "right" });

  // Save the PDF
  doc.save(`Rekap_Kehadiran_${startDate}_${endDate}.pdf`);
};

export const generateJurnalRecapPDF = (jurnalData, startDate, endDate, teacherName, userProfile) => {
  const doc = new jsPDF('landscape'); // Set landscape orientation

  // Header
  doc.setFontSize(16);
  doc.text("JURNAL MENGAJAR", doc.internal.pageSize.width / 2, 20, { align: "center" });

  // Sub-header
  doc.setFontSize(12);
  doc.text(`Periode tanggal: ${startDate} sampai tanggal: ${endDate}`, doc.internal.pageSize.width / 2, 30, { align: "center" });

  // Prepare table data
  const tableColumn = ["Tanggal", "Kelas", "Mata Pelajaran", "Materi", "Tujuan Pembelajaran", "Kegiatan Pembelajaran", "Hambatan", "Tindak Lanjut"];
  const tableRows = [];

  jurnalData.forEach(jurnal => {
    const rowData = [
      moment(jurnal.date).format('DD MMMM YYYY'),
      jurnal.className,
      jurnal.subjectName,
      jurnal.material,
      jurnal.learningObjectives,
      jurnal.learningActivities,
      jurnal.challenges || '-',
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
      // Adjust column widths if necessary
      0: { cellWidth: 25 }, // Tanggal
      1: { cellWidth: 20 }, // Kelas
      2: { cellWidth: 30 }, // Mata Pelajaran
      3: { cellWidth: 40 }, // Materi
      4: { cellWidth: 40 }, // Tujuan Pembelajaran
      5: { cellWidth: 40 }, // Kegiatan Pembelajaran
      6: { cellWidth: 30 }, // Hambatan
      7: { cellWidth: 30 }, // Tindak Lanjut
    },
  });

  // Footer
  const finalY = doc.autoTable.previous.finalY; // Get the Y position after the table
  doc.setFontSize(10);

  // Determine subject for "Guru Mapel"
  const subjectForFooter = jurnalData.length > 0 ? jurnalData[0].subjectName : "Mata Pelajaran";

  doc.text(`Guru Mapel ${subjectForFooter}`, doc.internal.pageSize.width - 50, finalY + 20, { align: "right" });
  doc.text(teacherName, doc.internal.pageSize.width - 50, finalY + 30, { align: "right" });

  // Check for NIP in userProfile
  const nip = userProfile?.nip || '....................'; // Use userProfile.nip if available, otherwise placeholder
  doc.text(`NIP. ${nip}`, doc.internal.pageSize.width - 50, finalY + 40, { align: "right" });

  // Save the PDF
  doc.save(`Jurnal_Mengajar_${startDate}_${endDate}.pdf`);
};

export const generateNilaiRecapPDF = (nilaiData, schoolName, startDate, endDate, teacherName, selectedClass, selectedSubject, userProfile) => {
  const doc = new jsPDF('landscape');

  // Header
  doc.setFontSize(16);
  doc.text(`REKAPITULASI NILAI ${schoolName ? `(${schoolName})` : ''}`, doc.internal.pageSize.width / 2, 20, { align: "center" });

  // Sub-header
  doc.setFontSize(12);
  doc.text(`Periode tanggal: ${startDate} sampai tanggal: ${endDate}`, doc.internal.pageSize.width / 2, 30, { align: "center" });
  doc.text(`Kelas: ${selectedClass}`, 14, 40);
  doc.text(`Mata Pelajaran: ${selectedSubject}`, 14, 50);


  // Prepare table data
  const tableColumn = ["No. Absen", "NIS", "Nama Siswa", "Rata-rata NH", "Rata-rata Formatif", "Rata-rata Sumatif", "Nilai Akhir (NA)"];
  const tableRows = [];

  nilaiData.forEach(item => {
    const rowData = [
      item.absen,
      item.nis,
      item.name,
      item.NH_avg,
      item.Formatif_avg,
      item.Sumatif_avg,
      item.NA,
    ];
    tableRows.push(rowData);
  });

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

  // Footer
  const finalY = doc.autoTable.previous.finalY;
  doc.setFontSize(10);
  doc.text(`Guru Mata Pelajaran`, doc.internal.pageSize.width - 50, finalY + 20, { align: "right" });
  doc.text(teacherName, doc.internal.pageSize.width - 50, finalY + 30, { align: "right" });
  const nip = userProfile?.nip || '....................';
  doc.text(`NIP. ${nip}`, doc.internal.pageSize.width - 50, finalY + 40, { align: "right" });

  // Save the PDF
  doc.save(`Rekap_Nilai_${selectedClass}_${selectedSubject}_${startDate}_${endDate}.pdf`);
};

export const generateViolationRecapPDF = (data, schoolName, startDate, endDate, teacherName, selectedClass, userProfile) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.text(`CATATAN PELANGGARAN SISWA`, doc.internal.pageSize.width / 2, 20, { align: "center" });

  // Sub-header
  doc.setFontSize(12);
  doc.text(`Dari tanggal: ${startDate} sampai ${endDate}`, 20, 30);
  doc.text(`Sekolah: ${schoolName}`, 20, 40);
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

  // Footer
  const finalY = doc.autoTable.previous.finalY;
  doc.setFontSize(10);
  doc.text(`Guru Mata Pelajaran`, doc.internal.pageSize.width - 60, finalY + 25, { align: "right" });
  doc.text(teacherName, doc.internal.pageSize.width - 60, finalY + 35, { align: "right" });
  const nip = userProfile?.nip || '....................';
  doc.text(`NIP. ${nip}`, doc.internal.pageSize.width - 60, finalY + 45, { align: "right" });

  // Save the PDF
  doc.save(`Rekap_Pelanggaran_${selectedClass}_${startDate}_${endDate}.pdf`);
};

