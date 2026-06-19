// Writes the released version into .claude-plugin/plugin.json so Claude Code
// installs detect the new version. Invoked by semantic-release (prepareCmd).
const fs = require('fs');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/set-plugin-version.js <version>');
  process.exit(1);
}

const file = '.claude-plugin/plugin.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
json.version = version;
fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
console.log(`plugin.json version -> ${version}`);
