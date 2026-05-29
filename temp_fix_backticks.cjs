const fs = require("fs");
let c = fs.readFileSync("src/utils/prompts/smarttyPrompts.js","utf8");

// Find SMARTTY_BRAIN content boundaries
const startIdx = c.indexOf("SMARTTY_BRAIN =");
const startBk = c.indexOf("`", startIdx);
const endBk = c.indexOf("`;", startIdx + 200); // closing backtick+semicolon

if (startBk < 0 || endBk < 0) { console.log("not found"); process.exit(1); }

let brain = c.substring(startBk, endBk + 1); // includes the backticks

// Replace triple backticks (code block markers) with placeholder
brain = brain.replace(/```/g, "___CODEBLOCK___");

// Replace any remaining single backtick (that are not the template delimiters)  
// But we need to keep the first and last backtick of the template!
// Strategy: remove the outermost backticks first, fix inner backticks, then re-wrap
let inner = brain.substring(1, brain.length - 1); // remove outer backticks
inner = inner.replace(/`/g, ""); // remove all remaining backticks
inner = inner.replace(/___CODEBLOCK___/g, ""); // remove code block markers

// Re-wrap in template literal
brain = "`" + inner + "`";

c = c.substring(0, startBk) + brain + c.substring(endBk + 1);
fs.writeFileSync("src/utils/prompts/smarttyPrompts.js",c,"utf8");
console.log("backtick fix done");
