const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'dist');
const targetDir = path.join(__dirname, '..', 'dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);

  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyRecursive(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

// Clear target dist first
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true });
}

// Copy react-viewer/dist to root dist
copyRecursive(sourceDir, targetDir);
console.log('✓ Copied dist folder to root');
