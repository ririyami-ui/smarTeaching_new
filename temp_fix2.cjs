const fs = require("fs");
let c = fs.readFileSync("src/components/DashboardLayout.tsx","utf8");
const oldIcon = "{React.cloneElement(item.icon, {size: 20,strokeWidth: isActive ? 2.5 : 1.8,className: `transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`})}";
const newIcon = "{React.cloneElement(item.icon, {size: 20,strokeWidth: isActive ? 2.5 : 1.6,fill: isActive ? 'currentColor' : 'none',className: `transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`})}";
const count = c.split(oldIcon).length - 1;
if (count > 0) { c = c.split(oldIcon).join(newIcon); console.log("replaced " + count + " times"); }
fs.writeFileSync("src/components/DashboardLayout.tsx",c,"utf8");
