/**
 * GitBook Structure & Content Validator
 * Verifies SUMMARY.md links, file presence, tag balance, and markdown integrity.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SUMMARY_PATH = path.join(ROOT_DIR, 'SUMMARY.md');

let errors = [];
let warnings = [];
let passedFiles = 0;

console.log('🔍 Starting GitBook structure and markdown validation...\n');

if (!fs.existsSync(SUMMARY_PATH)) {
  console.error('❌ FATAL: SUMMARY.md does not exist at ' + SUMMARY_PATH);
  process.exit(1);
}

const summaryContent = fs.readFileSync(SUMMARY_PATH, 'utf-8');
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
let match;
const linkedFiles = [];

while ((match = linkRegex.exec(summaryContent)) !== null) {
  const title = match[1];
  const relativePath = match[2];
  if (!relativePath.startsWith('http://') && !relativePath.startsWith('https://')) {
    linkedFiles.push({ title, relativePath });
  }
}

console.log(`📋 Found ${linkedFiles.length} linked chapters in SUMMARY.md.`);

linkedFiles.forEach(({ title, relativePath }) => {
  const fullPath = path.resolve(ROOT_DIR, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing File: [${title}] -> ${relativePath} does not exist.`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  if (content.trim().length === 0) {
    errors.push(`Empty File: ${relativePath} is completely empty.`);
    return;
  }

  // Check code blocks balance
  const codeBlockCount = (content.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    errors.push(`Unbalanced Code Blocks in ${relativePath}: Found ${codeBlockCount} \`\`\` delimiters.`);
  }

  // Remove fenced code blocks and inline code before checking live GitBook tags
  const contentWithoutCode = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '');

  // Check GitBook tag balance on live content
  const tagsToCheck = [
    { open: /\{%\s*hint\s+[^%]*%\}/g, close: /\{%\s*endhint\s*%\}/g, name: 'hint' },
    { open: /\{%\s*tabs\s*%\}/g, close: /\{%\s*endtabs\s*%\}/g, name: 'tabs' },
    { open: /\{%\s*tab\s+[^%]*%\}/g, close: /\{%\s*endtab\s*%\}/g, name: 'tab' },
    { open: /\{%\s*stepper\s*%\}/g, close: /\{%\s*endstepper\s*%\}/g, name: 'stepper' },
    { open: /\{%\s*step\s*%\}/g, close: /\{%\s*endstep\s*%\}/g, name: 'step' }
  ];

  tagsToCheck.forEach(({ open, close, name }) => {
    const openCount = (contentWithoutCode.match(open) || []).length;
    const closeCount = (contentWithoutCode.match(close) || []).length;
    if (openCount !== closeCount) {
      errors.push(`Mismatched GitBook tag {% ${name} %} in ${relativePath}: ${openCount} opened, ${closeCount} closed.`);
    }
  });

  passedFiles++;
});

console.log(`\n================ Validation Report ================`);
console.log(`Verified files: ${passedFiles} / ${linkedFiles.length}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.forEach(w => console.log('  - ' + w));
}

if (errors.length > 0) {
  console.error(`\n❌ Errors (${errors.length}):`);
  errors.forEach(e => console.error('  - ' + e));
  console.error('\nValidation FAILED. Please resolve the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All SUMMARY.md links, files, and GitBook tags are VALID!');
  process.exit(0);
}
