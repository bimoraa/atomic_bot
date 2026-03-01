const fs = require('fs');
const path = require('path');

const directory = './components';

const mappings = {
  '@/components/transcript-message': '@/components/features/transcript/transcript-message',
  '@/components/user-dialog': '@/components/features/users/user-dialog',
  '@/components/ASCIIText': '@/components/animations/ASCIIText',
  '@/components/Aurora': '@/components/animations/Aurora',
  '@/components/ChromaGrid': '@/components/animations/ChromaGrid',
  '@/components/CountUp': '@/components/animations/CountUp',
  '@/components/DarkVeil': '@/components/animations/DarkVeil',
  '@/components/GridScan': '@/components/animations/GridScan',
  '@/components/LightRays': '@/components/animations/LightRays',
  '@/components/ShinyText': '@/components/animations/ShinyText',
  '@/components/Dock': '@/components/layout/Dock',
  '@/components/GooeyNav': '@/components/layout/GooeyNav',
  '@/components/PillNav': '@/components/layout/PillNav',
  '@/components/bypass-topbar': '@/components/layout/bypass-topbar',
  '@/components/bypass-floating-dock': '@/components/layout/bypass-floating-dock',
  '@/components/dashboard-sidebar': '@/components/layout/dashboard-sidebar',
  '@/components/manage-floating-dock': '@/components/layout/manage-floating-dock'
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [oldPath, newPath] of Object.entries(mappings)) {
        // use regex to match the old path with optional quotes and semicolons
        const regex = new RegExp(`['"]${oldPath}['"]`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `'${newPath}'`);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in: ${fullPath}`);
      }
    }
  }
}

walkDir(directory);
console.log('Finished updating app/');

// Also update page.tsx or anything in root if necessary
// layout.tsx, not-found.tsx, etc.
