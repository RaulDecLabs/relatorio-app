const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const localAppData = process.env.LOCALAPPDATA;
const ghDesktopDir = path.join(localAppData, 'GitHubDesktop');

if (!fs.existsSync(ghDesktopDir)) {
  console.log('GitHub Desktop not found');
  process.exit(1);
}

const apps = fs.readdirSync(ghDesktopDir).filter(d => d.startsWith('app-'));
if (apps.length === 0) {
  console.log('No app- directory found in GitHubDesktop');
  process.exit(1);
}

const gitPath = path.join(ghDesktopDir, apps[0], 'resources', 'app', 'git', 'cmd', 'git.exe');
if (fs.existsSync(gitPath)) {
  console.log('Git found:', gitPath);
  try {
    execSync(`"${gitPath}" add .`, { stdio: 'inherit' });
    execSync(`"${gitPath}" commit -m "UI: Adiciona Nectar CRM"`, { stdio: 'inherit' });
    execSync(`"${gitPath}" push origin master`, { stdio: 'inherit' });
    console.log('Commit and push successful!');
  } catch (err) {
    console.error('Git command failed:', err.message);
  }
} else {
  console.log('Git executable not found at', gitPath);
}
