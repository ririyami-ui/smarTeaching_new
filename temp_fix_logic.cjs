const fs = require("fs");
let c = fs.readFileSync("src/utils/pdfGenerator.js", "utf8");

const oldCode = `  const attDetailRows = attendance.map(a => [
    moment(a.date).format('DD/MM/YY'),
    a.subjectName || '-',
    a.status === 'A' ? 'Alpa' : (a.status === 'S' ? 'Sakit' : (a.status === 'I' ? 'Ijin' : 'Hadir')),
    a.status === 'A' ? 'Poin: 5 (Alpa)' : '-'
  ]);`;

const newCode = `  const attDetailRows = attendance.map(a => {
    const s = (a.status || '').toString().trim().toUpperCase();
    let displayStatus = 'Hadir';
    let keterangan = '-';

    if (s === 'A' || s === 'ALPA' || s === 'ALPHA') {
      displayStatus = 'Alpa';
      keterangan = 'Poin: 5 (Alpa)';
    } else if (s === 'S' || s === 'SAKIT') {
      displayStatus = 'Sakit';
    } else if (s === 'I' || s === 'IJIN' || s === 'IZIN') {
      displayStatus = 'Ijin';
    }

    return [
      moment(a.date).format('DD/MM/YY'),
      a.subjectName || '-',
      displayStatus,
      keterangan
    ];
  });`;

if (c.indexOf("attDetailRows = attendance.map") >= 0) {
    // Find the whole block from 'const attDetailRows' to the closing ']);'
    const start = c.indexOf("const attDetailRows");
    const end = c.indexOf("]);", start) + 3;
    c = c.substring(0, start) + newCode + c.substring(end);
    fs.writeFileSync("src/utils/pdfGenerator.js", c, "utf8");
    console.log("Attendance mapping logic improved (Safe & Universal)");
} else {
    console.log("Pattern not found");
}
