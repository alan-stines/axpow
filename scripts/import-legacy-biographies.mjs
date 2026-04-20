import fs from 'node:fs/promises';
import path from 'node:path';

const [, , sourcePathArg] = process.argv;

if (!sourcePathArg) {
  console.error('Usage: node ./scripts/import-legacy-biographies.mjs <source-file>');
  process.exit(1);
}

const projectRoot = process.cwd();
const targetDir = path.join(projectRoot, 'content', 'biographies');

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cleanTitle(line) {
  return line.replace(/^#\s+/, '').trim();
}

function toDate(value) {
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return '';
  const [, m, d, y] = match;
  const yearNum = Number(y.length === 2 ? `20${y}` : y);
  return `${String(yearNum).padStart(4, '0')}-${String(Number(m)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
}

function firstExcerpt(lines) {
  for (const line of lines) {
    const text = line.trim();
    if (!text || text.startsWith('#') || text === '---') continue;
    if (text.length > 220) return `${text.slice(0, 217)}...`;
    return text;
  }
  return 'Legacy story imported from the original AXPOW site.';
}

async function run() {
  await fs.mkdir(targetDir, { recursive: true });
  const raw = await fs.readFile(sourcePathArg, 'utf8');
  const lines = raw.split(/\r?\n/);

  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (current) sections.push(current);
      current = { title: cleanTitle(line), lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  const skipTitles = new Set([
    'Partner Websites',
    'Keeping the Legacy Alive for Future Generations'
  ]);

  let created = 0;
  for (const section of sections) {
    if (skipTitles.has(section.title)) continue;

    const title = section.title;
    const slug = slugify(title);
    const existingPath = path.join(targetDir, `${slug}.md`);

    try {
      await fs.access(existingPath);
      continue;
    } catch {
      // File does not exist; continue.
    }

    const postedLine = section.lines.find((line) => /^posted\s+/i.test(line.trim())) || '';
    const posted = postedLine ? toDate(postedLine.trim()) : '';
    const excerpt = firstExcerpt(section.lines);

    const bodyLines = section.lines
      .filter((line) => !/^posted\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(line.trim()))
      .filter((line) => line.trim() !== '---');

    const markdown = [
      '---',
      `title: ${title}`,
      posted ? `posted: ${posted}` : '',
      `excerpt: ${excerpt.replace(/\r?\n/g, ' ')}`,
      `slug: ${slug}`,
      '---',
      '',
      ...bodyLines
    ]
      .filter(Boolean)
      .join('\n')
      .trimEnd() + '\n';

    await fs.writeFile(existingPath, markdown, 'utf8');
    created += 1;
  }

  console.log(`Imported ${created} new markdown file(s).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
