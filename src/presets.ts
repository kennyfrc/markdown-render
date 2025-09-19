export interface ThemePalette {
  background: string;
  foreground: string;
  codeBackground: string;
  codeForeground: string;
  border: string;
  link: string;
  linkHover: string;
}

export interface StylePreset {
  id: string;
  label: string;
  description: string;
  fontImports: string[];
  fontFamily: string;
  headingFontFamily?: string;
  monoFontFamily?: string;
  palette: {
    light: ThemePalette;
    dark: ThemePalette;
  };
  extraCSS?: string;
}

const PRESETS: StylePreset[] = [
  {
    id: 'geist-prose',
    label: 'Geist Prose',
    description: 'Geist Sans & Mono with Tailwind prose-inspired colors',
    fontImports: [
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..800&family=Geist+Mono:wght@400..700&display=swap" rel="stylesheet">'
    ],
    fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingFontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    monoFontFamily: '"Geist Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    palette: {
      light: {
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        foreground: '#0f172a',
        codeBackground: '#e2e8f0',
        codeForeground: '#0f172a',
        border: '#cbd5f5',
        link: '#2563eb',
        linkHover: '#1d4ed8'
      },
      dark: {
        background: 'linear-gradient(160deg, #0b1120 0%, #111827 45%, #020617 100%)',
        foreground: '#e2e8f0',
        codeBackground: '#1e293b',
        codeForeground: '#e2e8f0',
        border: '#334155',
        link: '#93c5fd',
        linkHover: '#bfdbfe'
      }
    },
    extraCSS: `    h1, h2, h3, h4, h5, h6 {
      letter-spacing: -0.01em;
    }
    a {
      text-decoration: none;
    }
    a:hover, a:focus {
      text-decoration: underline;
    }
    img {
      border-radius: 0.75rem;
    }
    blockquote {
      border-left-width: 0.25rem;
    }
`
  },
  {
    id: 'inter-ui',
    label: 'Inter UI',
    description: 'Inter with neutral slate prose colors',
    fontImports: [
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">'
    ],
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingFontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    monoFontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    palette: {
      light: {
        background: '#f8fafc',
        foreground: '#0f172a',
        codeBackground: '#e2e8f0',
        codeForeground: '#0f172a',
        border: '#cbd5f5',
        link: '#2563eb',
        linkHover: '#1d4ed8'
      },
      dark: {
        background: '#020617',
        foreground: '#e2e8f0',
        codeBackground: '#1e293b',
        codeForeground: '#e2e8f0',
        border: '#334155',
        link: '#93c5fd',
        linkHover: '#bfdbfe'
      }
    },
    extraCSS: `    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-heading);
      font-weight: 600;
    }
`
  }
];

export function listPresets(): StylePreset[] {
  return PRESETS;
}

export function resolvePreset(id: string): StylePreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
