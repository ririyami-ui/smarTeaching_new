const fs = require("fs");
let c = fs.readFileSync("src/utils/pdfGenerator.js", "utf8");
// Broad match for the empty table body placeholder to avoid newline issues
c = c.replace(/body: attDetailRows\.length > 0 \? attDetailRows : \[\[" -", "Tidak ada data kehadiran", " -"\]\]/, 
              'body: attDetailRows.length > 0 ? attDetailRows : [["-", "Tidak ada data kehadiran", "-", "-"]]');
fs.writeFileSync("src/utils/pdfGenerator.js", c, "utf8");
console.log("Empty body placeholder fixed");
