import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const contentDir = path.join(projectRoot, 'content', 'biographies');
const outputDir = path.join(projectRoot, 'biographies');
const outputIndex = path.join(projectRoot, 'biographies.html');

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, body: raw };
  }

  const closingIdx = raw.indexOf('\n---', 3);
  if (closingIdx === -1) {
    return { frontmatter: {}, body: raw };
  }

  const fmRaw = raw.slice(3, closingIdx).trim();
  const body = raw.slice(closingIdx + 4).trimStart();
  const frontmatter = {};

  for (const line of fmRaw.split('\n')) {
    const [key, ...valueParts] = line.split(':');
    if (!key || valueParts.length === 0) continue;
    frontmatter[key.trim()] = valueParts.join(':').trim();
  }

  return { frontmatter, body };
}

function renderShell({ pageTitle, heading, content, backHref = 'biographies.html' }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="American Ex-Prisoners of War biography archive." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:wght@500;700&display=swap" rel="stylesheet">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="../style.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="container header-container">
        <div class="logo"><a href="../index.html">AXPOW</a></div>
        <nav class="main-nav">
          <ul class="nav-links">
            <li><a href="../index.html">Home</a></li>
            <li><a href="../history.html">History</a></li>
            <li><a href="../biographies.html" class="active">Biographies</a></li>
            <li><a href="../contact.html">Contact Us</a></li>
          </ul>
        </nav>
        <button class="mobile-menu-toggle" aria-label="Toggle Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
    <main>
      <section class="section-padding bg-alt">
        <div class="container biography-page">
          <p><a href="../${backHref}" class="link-animate">← Back to biographies</a></p>
          <h1 class="section-title">${heading}</h1>
          ${content}
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-col">
          <h3>AXPOW</h3>
          <p>National Headquarters<br>PO Box 3445<br>Arlington, TX 76007-3445</p>
        </div>
      </div>
    </footer>
    <script type="module" src="../main.js"></script>
  </body>
</html>`;
}

async function generate() {
  await fs.mkdir(outputDir, { recursive: true });

  const files = (await fs.readdir(contentDir)).filter((name) => name.endsWith('.md'));
  const items = [];

  for (const file of files) {
    const fullPath = path.join(contentDir, file);
    const raw = await fs.readFile(fullPath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const title = frontmatter.title || file.replace(/\.md$/, '');
    const slug = frontmatter.slug || slugify(title);
    const posted = frontmatter.posted || '';
    const excerpt = frontmatter.excerpt || '';
    const html = marked.parse(body);

    const articleHtml = renderShell({
      pageTitle: `${title} | AXPOW`,
      heading: title,
      content: `${posted ? `<p class="bio-meta">Posted ${posted}</p>` : ''}<article class="article-content">${html}</article>`
    });

    await fs.writeFile(path.join(outputDir, `${slug}.html`), articleHtml, 'utf8');
    items.push({ title, slug, posted, excerpt });
  }

  items.sort((a, b) => b.posted.localeCompare(a.posted));

  const cards = items
    .map(
      (item) => `<article class="card biography-card">
  <h3>${item.title}</h3>
  ${item.posted ? `<p class="bio-meta">Posted ${item.posted}</p>` : ''}
  ${item.excerpt ? `<p>${item.excerpt}</p>` : ''}
  <a class="link-animate" href="biographies/${item.slug}.html">Read story →</a>
</article>`
    )
    .join('\n');

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="AXPOW biography archive and stories." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:wght@500;700&display=swap" rel="stylesheet">
    <title>American Ex-Prisoners of War | Biographies</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="container header-container">
        <div class="logo"><a href="index.html">AXPOW</a></div>
        <nav class="main-nav">
          <ul class="nav-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="history.html">History</a></li>
            <li><a href="biographies.html" class="active">Biographies</a></li>
            <li><a href="contact.html">Contact Us</a></li>
          </ul>
        </nav>
        <button class="mobile-menu-toggle" aria-label="Toggle Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
    <main>
      <section class="section-padding bg-alt">
        <div class="container">
          <h1 class="section-title">Biographies & Stories</h1>
          <p>These pages are generated from Markdown files in <code>content/biographies</code> to simplify ongoing updates.</p>
          <div class="biography-grid">
            ${cards || '<p>No biography entries yet.</p>'}
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-col">
          <h3>AXPOW</h3>
          <p>National Headquarters<br>PO Box 3445<br>Arlington, TX 76007-3445</p>
        </div>
      </div>
    </footer>
    <script type="module" src="./main.js"></script>
  </body>
</html>`;

  await fs.writeFile(outputIndex, indexHtml, 'utf8');
  console.log(`Generated ${items.length} biography page(s).`);
}

generate().catch((error) => {
  console.error('Failed to generate biographies:', error);
  process.exitCode = 1;
});
