const fs = require("fs");
let c = fs.readFileSync("src/utils/pdfGenerator.js", "utf8");

// Fix duplicate column lines
c = c.replace(/attDetailColumns = \["Tanggal".*Keterangan"\];\s*attDetailColumns = \["Tanggal".*Keterangan"\];/, 'attDetailColumns = ["Tanggal", "Mata Pelajaran", "Status", "Keterangan"];');

// Replace the actual rows (without const)
const oldRows = 'attDetailRows = attendance.map(a => [\r\n    moment(a.date).format(\'DD/MM/YY\'),\r\n    a.subjectName || \'-\',\r\n    a.status\r\n  ]);';

const newRows = 'attDetailRows = attendance.map(a => [\r\n    moment(a.date).format(\'DD/MM/YY\'),\r\n    a.subjectName || \'-\',\r\n    a.status === \'A\' ? \'Alpa\' : (a.status === \'S\' ? \'Sakit\' : (a.status === \'I\' ? \'Ijin\' : \'Hadir\')),\r\n    a.status === \'A\' ? \'Poin: 5 (Alpa)\' : \'-\'\r\n  ]);';

console.log("matches before:", c.split(oldRows).length - 1);
if (c.indexOf(oldRows) >= 0) {
    c = c.split(oldRows).join(newRows);
}

fs.writeFileSync("src/utils/pdfGenerator.js", c, "utf8");
console.log("Done");
