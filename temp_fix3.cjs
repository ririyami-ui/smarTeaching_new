const fs = require("fs");
let c = fs.readFileSync("src/components/DashboardLayout.tsx","utf8");
let oldBlock = "                    {React.cloneElement(item.icon, {\n                      size: 20,\n                      strokeWidth: isActive ? 2.5 : 1.8,\n                      className: `transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`\n                    })}\n                    {isActive && (\n                      <div className=\"absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.9)]\" />\n                    )}";
let newBlock = "                    {React.cloneElement(item.icon, {\n                      size: 20,\n                      strokeWidth: isActive ? 2.5 : 1.6,\n                      fill: isActive ? 'currentColor' : 'none',\n                      className: `transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`\n                    })}\n                    {isActive && (\n                      <div className=\"absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.9)]\" />\n                    )}";
let count = c.split(oldBlock).length - 1;
console.log("matches: " + count);
if (count > 0) { c = c.split(oldBlock).join(newBlock); }
fs.writeFileSync("src/components/DashboardLayout.tsx",c,"utf8");
