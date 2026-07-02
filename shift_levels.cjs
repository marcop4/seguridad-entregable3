const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const filesToProcess = [];
walkDir('./src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
    filesToProcess.push(filePath);
  }
});

filesToProcess.push('./server.ts');

filesToProcess.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // We need to do replacements safely. 
  // We'll replace 5 -> 4, 4 -> 3, 3 -> 2 in multiple passes, 
  // but if we do 5->4, then 4->3, the original 5 becomes 3! 
  // So we must use a temporary placeholder.

  const replaceMap = [
    // Backend privileges
    { from: /requirePrivilege\(5\)/g, to: 'requirePrivilege(__4__)' },
    { from: /requirePrivilege\(4\)/g, to: 'requirePrivilege(__3__)' },
    { from: /requirePrivilege\(3\)/g, to: 'requirePrivilege(__2__)' },
    { from: /requirePrivilege\(2\)/g, to: 'requirePrivilege(__1__)' },

    // Frontend levels
    { from: /\.level === 5/g, to: '.level === __4__' },
    { from: /\.level >= 5/g, to: '.level >= __4__' },
    { from: /\.level < 5/g, to: '.level < __4__' },
    
    { from: /\.level === 4/g, to: '.level === __3__' },
    { from: /\.level >= 4/g, to: '.level >= __3__' },
    { from: /\.level < 4/g, to: '.level < __3__' },
    
    { from: /\.level === 3/g, to: '.level === __2__' },
    { from: /\.level >= 3/g, to: '.level >= __2__' },
    { from: /\.level < 3/g, to: '.level < __2__' },

    { from: /\.level === 2/g, to: '.level === __99__' }, // Old support
  ];

  replaceMap.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  // Now replace placeholders with actual numbers
  content = content.replace(/__4__/g, '4');
  content = content.replace(/__3__/g, '3');
  content = content.replace(/__2__/g, '2');
  content = content.replace(/__1__/g, '1');
  content = content.replace(/__99__/g, '99'); // Obsolete

  // Also fix string representations like "Nivel 5" -> "Nivel 4"
  // Wait, let's just do it manually for strings to avoid breaking things unexpectedly.
  // Actually, let's fix known strings:
  content = content.replace(/Nivel 5/g, 'Nivel __4__');
  content = content.replace(/Nivel 4/g, 'Nivel __3__');
  content = content.replace(/Nivel 3/g, 'Nivel __2__');
  content = content.replace(/Nivel 2/g, 'Nivel __99__');
  
  content = content.replace(/__4__/g, '4');
  content = content.replace(/__3__/g, '3');
  content = content.replace(/__2__/g, '2');
  content = content.replace(/__99__/g, '99');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated: ' + file);
  }
});

