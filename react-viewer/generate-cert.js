const selfsigned = require('selfsigned');
const fs = require('fs');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { 
  days: 365,
  keySize: 4096,
  algorithm: 'sha256'
});

fs.writeFileSync('cert.pem', pems.cert);
fs.writeFileSync('key.pem', pems.private);

console.log('SSL certificates generated successfully!');
console.log('cert.pem and key.pem created in the project root.');


