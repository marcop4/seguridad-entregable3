const fs = require('fs');

const files = ['server.ts', 'src/middleware/authMiddleware.ts', 'src/routes/admin.routes.ts', 'src/routes/auth.routes.ts'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    // The issue is I output \` instead of ` inside template strings.
    // Replace \` with `
    content = content.replace(/\\\`/g, '\`');
    fs.writeFileSync(f, content);
  }
});
