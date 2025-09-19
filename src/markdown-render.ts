#!/usr/bin/env node

import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {basename, extname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import Mustache from 'mustache';
import {marked} from 'marked';
import open from 'open';

type ThemePreference = 'auto' | 'light' | 'dark';

interface ParsedArgs {
  positional: string[];
  flags: Set<'--no-open' | '--stdout'>;
  theme: ThemePreference;
  showHelp: boolean;
}

interface HtmlDocumentInput {
  title: string;
  body: string;
  theme: ThemePreference;
}

interface Palette {
  light: ThemePalette;
  dark: ThemePalette;
}

interface ThemePalette {
  background: string;
  foreground: string;
  codeBackground: string;
  codeForeground: string;
  border: string;
  link: string;
  linkHover: string;
}

const HELP_TEXT = `Usage: markdown-render <markdown-file> [options]

Options:
  -h, --help            Show this help message and exit.
  --no-open             Generate the HTML file but skip launching the browser.
  --stdout              Print the generated HTML to standard output.
  --theme <mode>        Override auto detection with "light" or "dark".
  --light               Shortcut for "--theme light".
  --dark                Shortcut for "--theme dark".
`;

const TEMPLATE_PATH = fileURLToPath(new URL('../template/document.mustache', import.meta.url));

let templateCache: Promise<string> | undefined;

async function main(): Promise<void> {
  let parsedArgs: ParsedArgs;
  try {
    parsedArgs = parseArguments(process.argv.slice(2));
  } catch (error) {
    emitError((error as Error).message);
    process.exitCode = 1;
    return;
  }

  if (parsedArgs.showHelp) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (parsedArgs.positional.length !== 1) {
    emitError('Please provide exactly one markdown file.');
    process.stdout.write(HELP_TEXT);
    process.exitCode = 1;
    return;
  }

  const markdownPath = resolve(parsedArgs.positional[0]);

  let markdownContent: string;
  try {
    markdownContent = await readFile(markdownPath, 'utf8');
  } catch (error) {
    emitError(`Unable to read "${markdownPath}". ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }

  const htmlBody = await marked.parse(markdownContent);
  const title = deriveTitle(markdownContent, markdownPath);
  const htmlDocument = await renderHtmlDocument({title, body: htmlBody, theme: parsedArgs.theme});

  if (parsedArgs.flags.has('--stdout')) {
    process.stdout.write(htmlDocument);
    return;
  }

  const outputPath = await writeToTempFile(htmlDocument, markdownPath);
  process.stdout.write(`Generated HTML: ${outputPath}\n`);

  const shouldOpenBrowser = !parsedArgs.flags.has('--no-open') && !process.env.MARKDOWN_RENDER_NO_OPEN;
  if (!shouldOpenBrowser) {
    return;
  }

  try {
    await open(outputPath);
  } catch (error) {
    emitWarning(`Failed to open browser. ${(error as Error).message}`);
  }
}

async function renderHtmlDocument({title, body, theme}: HtmlDocumentInput): Promise<string> {
  const template = await loadTemplate();
  const palette = getPalette(theme);
  const colorScheme = theme === 'auto' ? 'light dark' : theme;
  const styles = buildStyles(theme, palette, colorScheme);

  return Mustache.render(template, {
    title,
    body,
    styles,
    colorScheme
  });
}

const SHARED_STYLES = `    body {
      margin: 0 auto;
      max-width: 56rem;
      padding: 3rem 1rem 4rem;
      background: var(--bg);
      color: var(--fg);
    }
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.3;
      margin-top: 2.4rem;
      margin-bottom: 1rem;
      font-weight: 650;
    }
    h1 { font-size: 2.5rem; }
    h2 { font-size: 2rem; }
    h3 { font-size: 1.5rem; }
    h4 { font-size: 1.25rem; }
    p, li {
      margin-top: 0.75rem;
      margin-bottom: 0.75rem;
      font-size: 1rem;
    }
    a {
      color: var(--link);
      text-decoration: underline;
      text-decoration-thickness: 2px;
    }
    a:hover, a:focus {
      color: var(--link-hover);
    }
    pre {
      background: var(--code-bg);
      color: var(--code-fg);
      padding: 1rem;
      overflow: auto;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      background: var(--code-bg);
      color: var(--code-fg);
      padding: 0.15rem 0.35rem;
      border-radius: 0.35rem;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      margin: 1.5rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid var(--border);
      background: var(--code-bg);
      color: var(--fg);
      border-radius: 0 0.5rem 0.5rem 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.5rem 0;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    img, video {
      max-width: 100%;
      height: auto;
      border-radius: 0.4rem;
    }
`;

function getPalette(theme: ThemePreference): Palette {
  const lightPalette: ThemePalette = {
    background: '#ffffff',
    foreground: '#1f2933',
    codeBackground: '#f1f5f9',
    codeForeground: '#0f172a',
    border: '#cbd5f5',
    link: '#2563eb',
    linkHover: '#1d4ed8'
  };

  const darkPalette: ThemePalette = {
    background: '#0f172a',
    foreground: '#e2e8f0',
    codeBackground: '#1e293b',
    codeForeground: '#e2e8f0',
    border: '#334155',
    link: '#93c5fd',
    linkHover: '#bfdbfe'
  };

  if (theme === 'light') {
    return {light: lightPalette, dark: lightPalette};
  }

  if (theme === 'dark') {
    return {light: darkPalette, dark: darkPalette};
  }

  return {light: lightPalette, dark: darkPalette};
}

function buildStyles(theme: ThemePreference, palette: Palette, colorScheme: string): string {
  const rootBlock = `    :root {
      color-scheme: ${colorScheme};
      --bg: ${palette.light.background};
      --fg: ${palette.light.foreground};
      --code-bg: ${palette.light.codeBackground};
      --code-fg: ${palette.light.codeForeground};
      --border: ${palette.light.border};
      --link: ${palette.light.link};
      --link-hover: ${palette.light.linkHover};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
    }
`;

  const darkBlock = theme === 'auto'
    ? `    @media (prefers-color-scheme: dark) {
      :root {
        --bg: ${palette.dark.background};
        --fg: ${palette.dark.foreground};
        --code-bg: ${palette.dark.codeBackground};
        --code-fg: ${palette.dark.codeForeground};
        --border: ${palette.dark.border};
        --link: ${palette.dark.link};
        --link-hover: ${palette.dark.linkHover};
      }
    }
`
    : '';

  return [rootBlock, darkBlock, SHARED_STYLES].filter((chunk) => chunk.length > 0).join('\n');
}

function deriveTitle(markdownContent: string, sourcePath: string): string {
  const match = markdownContent.match(/^\s*#\s+(.+)$/m);
  if (match?.[1]) {
    return match[1].trim();
  }

  const baseName = basename(sourcePath, extname(sourcePath));
  return baseName || 'Markdown Preview';
}

async function writeToTempFile(htmlDocument: string, sourcePath: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'markdown-render-'));
  const baseName = basename(sourcePath, extname(sourcePath)) || 'preview';
  const outputPath = join(tempDir, `${baseName}.html`);
  await writeFile(outputPath, htmlDocument, 'utf8');
  return outputPath;
}

function loadTemplate(): Promise<string> {
  if (!templateCache) {
    templateCache = readFile(TEMPLATE_PATH, 'utf8');
  }

  return templateCache;
}

function parseArguments(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Set<'--no-open' | '--stdout'>();
  let theme: ThemePreference = 'auto';
  let showHelp = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '-h' || token === '--help') {
      showHelp = true;
      continue;
    }

    if (token === '--no-open' || token === '--stdout') {
      flags.add(token);
      continue;
    }

    if (token === '--dark') {
      theme = 'dark';
      continue;
    }

    if (token === '--light') {
      theme = 'light';
      continue;
    }

    if (token.startsWith('--theme=')) {
      theme = parseTheme(token.split('=')[1] ?? '');
      continue;
    }

    if (token === '--theme') {
      const next = args[index + 1];
      if (!next) {
        throw new Error('Missing value for --theme. Expected "light" or "dark".');
      }
      theme = parseTheme(next);
      index += 1;
      continue;
    }

    if (token.startsWith('--')) {
      throw new Error(`Unknown option: ${token}`);
    }

    positional.push(token);
  }

  return {positional, flags, theme, showHelp};
}

function parseTheme(raw: string): ThemePreference {
  const normalized = raw.toLowerCase();

  if (normalized === 'light' || normalized === 'dark') {
    return normalized;
  }

  if (normalized === 'auto' || normalized === '') {
    return 'auto';
  }

  throw new Error('Invalid theme value. Use "light", "dark", or "auto".');
}

function emitError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

function emitWarning(message: string): void {
  process.stderr.write(`Warning: ${message}\n`);
}

main().catch((error: unknown) => {
  const err = error as Error;
  emitError(`Unexpected error: ${err.message}`);
  if (process.env.DEBUG) {
    process.stderr.write(`${err.stack ?? ''}\n`);
  }
  process.exitCode = 1;
});
