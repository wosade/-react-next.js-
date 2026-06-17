/**
 * 将 src/**/*.module.less 编译为 *.module.css
 * 将 src/styles/globals.less 编译为 styles/globals.css
 */
const less = require('less');
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src');

function findLessFiles(dir, pattern) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...findLessFiles(full, pattern));
    } else if (entry.isFile() && entry.name.endsWith(pattern)) {
      results.push(full);
    }
  }
  return results;
}

async function compile(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const dir = path.dirname(file);

  try {
    const result = await less.render(content, {
      filename: file,
      paths: [dir, path.resolve(srcDir, 'styles')],
    });
    const outFile = file.replace(/\.less$/, '.css');
    fs.writeFileSync(outFile, result.css, 'utf-8');
    console.log(`  ✓ ${path.relative(srcDir, file)}`);
  } catch (err) {
    console.error(`  ✗ ${path.relative(srcDir, file)}: ${err.message}`);
  }
}

async function main() {
  console.log('Compiling LESS files...\n');

  // 编译 globals.less
  const globalsLess = path.resolve(srcDir, 'styles', 'globals.less');
  if (fs.existsSync(globalsLess)) await compile(globalsLess);

  // 编译所有 *.module.less
  const modules = findLessFiles(srcDir, '.module.less');
  for (const f of modules) await compile(f);

  console.log(`\nDone! Compiled ${1 + modules.length} files.`);
}

main().catch(console.error);
