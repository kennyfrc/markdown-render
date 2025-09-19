# Typeface & Background Presets Plan (Inter/Geist/Tailwind Prose Inspired)

## Context & Goal
- Current CLI outputs HTML with a single system font stack and static background palette tuned only for light/dark themes.
- Communities around Inter (popular default in Figma per DesignGrapes, 2023) and Geist (Vercel’s modern sans/mono pairing) emphasise clean UI aesthetics with accessible typography.
- Tailwind CSS Typography ("prose") users lean on curated type scales, color variants (e.g., `prose-slate`, `prose-invert`), and HTML-level modifiers for fine control (Tailwind CSS blog v0.5 release).
- Objective: offer user-selectable presets that encapsulate these communities’ styling idioms (fonts, colors, backgrounds) while keeping a unified rendering pipeline and minimal complexity.

## Problem & Root Cause
- Hardcoded CSS prevents adoption of Inter/Geist stacks or prose-like treatments without editing source.
- Theme logic lacks abstraction to express multiple background/typography combinations; no CLI surface to toggle them.

## Proposed Solution Overview
- Introduce data-driven “style presets” representing Inter UI, Geist UI, and Tailwind Prose-inspired themes (with optional background variants).
- Extend CLI to select presets (`--style`) and list available presets (`--list-styles`).
- Generate CSS dynamically: combine base layout styles with preset-specific font imports, typography scales, and background layers (e.g., neutral slate, soft gradients, dark invert).

## Detailed Plan
1. **Preset Data Model**
   - Create `src/presets.ts` exporting `StylePreset` objects with fields:
     ```ts
     interface StylePreset {
       id: string;
       label: string;
       fontImports: string[]; // e.g., Google Fonts or Geist CDN links
       fontFamily: string; // CSS value for body text
       headingFontFamily?: string; // optional distinct heading family
       monoFontFamily?: string; // optional for code blocks
       typography: {
         baseSize: string;
         lineHeight: string;
         headingTightness: number;
         proseColor: { light: string; dark: string };
         linkColor: { light: string; dark: string };
       };
       background: {
         light: string; // CSS background declarations
         dark: string;
       };
       extraCSS?: string; // custom rules (e.g., rounded images, underline links)
     }
     ```
   - Populate presets:
     - `inter-ui`: Inter variable font (link via fonts.googleapis.com), neutral slate background, Tailwind `prose-slate` inspired colors.
     - `geist-ui`: Geist Sans + Geist Mono via Vercel package (link to CDN), gradient accent akin to Vercel docs (dark neutral background for dark mode).
     - `tailwind-prose`: Inter/Georgia pairing with typography modifiers (e.g., underline headings, softened image radius) referencing Tailwind’s prose customization examples; include `prose-invert` color mappings.
     - Optionally `mono-docs`: Geist Mono body for code-heavy docs.

2. **CLI Argument Extensions**
   - Update `parseArguments` to accept `--style <id>`; default to `inter-ui` (closest to mainstream UI usage).
   - Add `--list-styles` flag that prints `id`, `label`, and short description then exits.
   - Remove legacy theme-only shortcuts in favor of `--theme` still controlling light/dark/auto overlay.
   - Validate style id, providing actionable error with list hint.

3. **CSS Rendering Pipeline**
   - Modify `renderHtmlDocument` to:
     - Invoke `resolvePreset(styleId)`.
     - Collect `fontImports` and embed as `<link rel="stylesheet">` strings or `<style>@import</style>` before main `<style>` block.
     - Pass preset to `buildStyles(theme, preset)`; adjust signature accordingly.
   - Update `buildStyles` to:
     - Set `:root` base variables from preset’s typography (base font, heading font, colors).
     - Inject preset background via `body` (using CSS custom properties to switch for dark mode when theme=auto or dark).
     - Append `extraCSS` raw string if provided (e.g., `.prose a` custom colors) to mimic Tailwind modifiers.
     - Ensure code blocks use `monoFontFamily` if available.

4. **Template Adjustments**
   - Add Mustache placeholders in `template/document.mustache`:
     - `{{{fontImports}}}` inside `<head>` before `<style>`.
     - `class="preset-{{presetId}}"` on `<body>` for debugging/styling.
   - Provide default empty strings to avoid altering existing functionality.

5. **Data Flow**
   - `main` obtains `styleId` from parsed args.
   - `resolvePreset` returns preset; errors handled early with message.
   - `renderHtmlDocument` builds `fontImports`, `styles`, `presetId` for template context.
   - Template renders final HTML; browser loads fonts/gradients accordingly.

6. **Documentation & UX**
   - Update README:
     - Add section “Styling presets” listing each `--style` option, fonts/background inspiration, and sample commands (e.g., `mdr README.md --style geist-ui --theme dark`).
     - Note dependency on remote fonts (Inter via Google Fonts, Geist via CDN) and advise offline fallback.
   - Document `--list-styles` output for quick discovery.

7. **Testing & Verification**
   - Automated: `npm run build`, `npm run typecheck`.
   - CLI smoke tests:
     - `node dist/markdown-render.js README.md --stdout --list-styles` (ensure listing).
     - `node dist/markdown-render.js README.md --stdout --style inter-ui | grep "fonts.googleapis"` (font import presence).
     - `node dist/markdown-render.js README.md --stdout --style geist-ui --theme dark | grep "background"` to verify gradient/dark overrides.
   - Manual: open generated HTML for each preset in light/dark to validate fonts load (check network) and backgrounds align with design references.
   - Edge: invalid style id triggers error; `--stdout` should still produce HTML with embedded CSS when fonts unreachable.

8. **Potential Impacts**
   - Additional HTTP requests to font CDNs; consider caching or future option for local bundling.
   - Larger CSS may affect `stdout` consumers; mitigate by keeping extraCSS concise.
   - Need to ensure gradient backgrounds maintain readability with prose colors.

9. **Backup Approach**
- If external font imports problematic, fall back to self-hosted Inter (via npm `@fontsource/inter`) and provide instructions to link local Geist clone; degrade gracefully to system fonts when imports disabled.

## Research Sources
- DesignGrapes, *The 7 Must-Have Fonts That Will Rule UI/UX Design in 2024* (Inter popularity in Figma/UX community).
- Vercel, *geist-font* README (usage patterns and Tailwind integration for Geist Sans/Mono).
- Tailwind CSS Blog, *Tailwind CSS Typography v0.5* (dark mode support, color scales, element modifiers for prose customization).

## Mermaid Diagram Support (Add-on)
- Preprocess fenced \`\`\`mermaid code blocks into `<pre class="mermaid">…</pre>` before Markdown parsing while HTML-escaping diagram definitions.
- Inject Mermaid.js via jsDelivr CDN only when such blocks are detected, along with an inline initializer (`mermaid.initialize({ startOnLoad: true })`).
- Document in README that no extra flags are required; diagrams render automatically in the browser.
