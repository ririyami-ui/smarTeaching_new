const fs = require("fs");
let c = fs.readFileSync("src/utils/pdfGenerator.js", "utf8");

// Fix duplicate columns
c = c.replace("  const attDetailColumns = [\"Tanggal\", \"Mata Pelajaran\", \"Status\", \"Keterangan\"];\n  const attDetailColumns = [\"Tanggal\", \"Mata Pelajaran\", \"Status\", \"Keterangan\"];", "  const attDetailColumns = [\"Tanggal\", \"Mata Pelajaran\", \"Status\", \"Keterangan\"];");

// Fix the rows - find the attDetailRows block and replace
const oldRows = `  const attDetailRows = attendance.map(a => [
    moment(a.date).format('DD/MM/YY'),
    a.subjectName || '-',
    a.status
  ]);`;

const newRows = `  const attDetailRows = attendance.map(a => [
    moment(a.date).format('DD/MM/YY'),
    a.subjectName || '-',
    a.status === 'A' ? 'Alpa' : (a.status === 'S' ? 'Sakit' : (a.status === 'I' ? 'Ijin' : 'Hadir')),
    a.status === 'A' ? 'Poin: 5 (Alpa)' : '-'
  ]);`;

const count = c.split(oldRows).length - 1;
console.log("oldRows matches: " + count);
if (count > 0) {
    c = c.split(oldRows).join(newRows);
}

fs.writeFileSync("src/utils/pdfGenerator.js", c, "utf8");
console.log("Done");
