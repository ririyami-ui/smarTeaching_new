const fs = require("fs");
let c = fs.readFileSync("src/utils/pdfGenerator.js","utf8");
const bad = '  ]);\n\n  doc.autoTable({\n  const attDetailColumns = ["Tanggal"';
const good = '  ]);\n\n  doc.autoTable({\n    head: [attDetailColumns],\n    body: attDetailRows.length > 0 ? attDetailRows : [["-","Tidak ada data kehadiran","-","-"]],';
c = c.replace(bad, good);
fs.writeFileSync("src/utils/pdfGenerator.js",c,"utf8");
console.log("Fixed duplicate and empty rows");
