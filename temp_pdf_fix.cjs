const fs = require("fs");
let c = fs.readFileSync("src/utils/pdfGenerator.js", "utf8");

// 1. Bigger and Clearer Profil Siswa
const profileOld = `  doc.setFontSize(9);
  doc.text("PROFIL SISWA", 18, yPos + 1);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPos += 7;

  doc.text(\`Nama Lengkap: \${student.name} \`, 14, yPos);
  doc.text(\`NIS: \${student.nis || '-'} \`, pageWidth / 2, yPos);
  yPos += 6;
  doc.text(\`Kelas: \${student.rombel} \`, 14, yPos);
  doc.text(\`Kelamin: \${student.gender || '-'} \`, pageWidth / 2, yPos);`;

const profileNew = `  doc.setFontSize(10);
  doc.text("PROFIL SISWA", 18, yPos + 1);
  doc.setTextColor(31, 41, 55); // Slate 800 - Clearer/Modern
  yPos += 8;

  doc.setFontSize(11); // Bigger font for profile values
  doc.setFont('helvetica', 'bold');
  doc.text(\`Nama: \${student.name}\`, 14, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(\`NIS: \${student.nis || '-'}\`, pageWidth / 2, yPos);
  yPos += 7;
  doc.text(\`Kelas: \${student.rombel}\`, 14, yPos);
  doc.text(\`Jenis Kelamin: \${student.gender || '-'}\`, pageWidth / 2, yPos);`;

c = c.replace(profileOld, profileNew);

// 2. Attendance Table with Keterangan
const attOld = `  const attDetailColumns = ["Tanggal", "Mata Pelajaran", "Status"];
  const attDetailRows = attendance.map(a => [
    moment(a.date).format('DD/MM/YY'),
    a.subjectName || '-',
    a.status
  ]);`;

const attNew = `  const attDetailColumns = ["Tanggal", "Mata Pelajaran", "Status", "Keterangan"];
  const attDetailRows = attendance.map(a => [
    moment(a.date).format('DD/MM/YY'),
    a.subjectName || '-',
    a.status === 'A' ? 'Alpa' : (a.status === 'S' ? 'Sakit' : (a.status === 'I' ? 'Ijin' : 'Hadir')),
    a.status === 'A' ? 'Poin Pelanggaran: 10' : '-'
  ]);`;

c = c.replace(attOld, attNew);

// 3. Brighter font in header
c = c.replace('doc.setTextColor(0, 0, 0);', 'doc.setTextColor(31, 41, 55);'); // General body text

fs.writeFileSync("src/utils/pdfGenerator.js", c, "utf8");
console.log("PDF Layout updated successfully");
