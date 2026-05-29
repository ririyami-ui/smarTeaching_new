const fs = require("fs");
let c = fs.readFileSync("src/utils/pdfGenerator.js","utf8");

// Remove all but the FIRST occurrence of "const attDetailColumns"
const first = c.indexOf("attDetailColumns");
let second = c.indexOf("attDetailColumns", first + 5);
while (second >= 0) {
    const lineStart = c.lastIndexOf("\n", second);
    const lineEnd = c.indexOf("\n", second);
    if (lineStart >= 0 && lineEnd > lineStart) {
        c = c.substring(0, lineStart) + c.substring(lineEnd);
    }
    second = c.indexOf("attDetailColumns", first + 5);
}

fs.writeFileSync("src/utils/pdfGenerator.js",c,"utf8");
console.log("All duplicate attDetailColumns removed");
