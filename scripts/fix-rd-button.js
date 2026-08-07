import fs from 'fs';
let c = fs.readFileSync('src/routes/_authenticated/reports.tsx', 'utf8');

const regex = /<Button[\s\S]*?onClick=\{\(\) => setActiveTab\("rd"\)\}[\s\S]*?<\/Button>/g;
c = c.replace(regex, '');

fs.writeFileSync('src/routes/_authenticated/reports.tsx', c);
console.log("Limpeza concluída.");
