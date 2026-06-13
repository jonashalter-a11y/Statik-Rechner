const db = require('./db');
const { exportActiveVerifications } = require('./verification-export');

const files = exportActiveVerifications(db);

console.log(`Exportiert: ${files.length} Nachweis-Datei(en)`);
files.forEach(file => console.log(file));
