import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const THEME_CSS_PATH = path.join(SRC_ROOT, 'theme/theme.css');

const TOKEN_PREFIXES = ['--color-', '--viz-', '--shadow-'];

interface FileMatch {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function listSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
    } else if (/\.(css|ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Variable names defined in a CSS block, keyed by block selector. */
function parseThemeDefinitions(): Readonly<Record<string, ReadonlySet<string>>> {
  const css = fs.readFileSync(THEME_CSS_PATH, 'utf8');
  const definitions: Record<string, Set<string>> = {};
  // Innermost blocks only ([^{}]*), so blocks nested in @media still match.
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = block[1].trim().split('\n').pop()?.trim() ?? '';
    const names = new Set<string>();
    for (const definition of block[2].matchAll(/(--[a-z0-9-]+)\s*:/g)) {
      names.add(definition[1]);
    }
    const existing = definitions[selector] ?? new Set<string>();
    for (const name of names) existing.add(name);
    definitions[selector] = existing;
  }
  return definitions;
}

function isTokenName(name: string): boolean {
  return TOKEN_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * All token references in a file: any occurrence of a token-prefixed custom
 * property name that is not a definition (not followed by ':'). Template
 * literals like `var(--color-group-${n})` yield a name ending in '-', which
 * callers treat as a prefix that must match at least one defined token.
 */
function findTokenReferences(filePath: string): FileMatch[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const references: FileMatch[] = [];
  lines.forEach((lineText, index) => {
    for (const match of lineText.matchAll(/--[a-z][a-z0-9-]*/g)) {
      const name = match[0];
      if (!isTokenName(name)) continue;
      const rest = lineText.slice((match.index ?? 0) + name.length);
      if (/^\s*:[^:]/.test(rest)) continue; // definition, not a reference
      references.push({ file: filePath, line: index + 1, text: name });
    }
  });
  return references;
}

function formatMatches(matches: ReadonlyArray<FileMatch>): string {
  return matches
    .map((m) => `${path.relative(SRC_ROOT, m.file)}:${m.line} — ${m.text}`)
    .join('\n');
}

describe('colour tokens', () => {
  const definitions = parseThemeDefinitions();
  const rootTokens = definitions[':root'] ?? new Set<string>();
  const darkTokens = definitions["[data-theme='dark']"] ?? new Set<string>();
  const sourceFiles = listSourceFiles(SRC_ROOT);

  it('parses theme.css definitions', () => {
    expect(rootTokens.size).toBeGreaterThan(20);
    expect(darkTokens.size).toBeGreaterThan(10);
  });

  // Template literals (and prose like "--color-group-N") yield a name ending
  // in '-'; those pass if at least one defined token starts with the prefix.
  function isDefined(name: string): boolean {
    if (rootTokens.has(name)) return true;
    return name.endsWith('-') && [...rootTokens].some((defined) => defined.startsWith(name));
  }

  it('every referenced token is defined in theme.css :root', () => {
    const undefinedReferences: FileMatch[] = [];
    for (const file of sourceFiles) {
      if (file === THEME_CSS_PATH) continue;
      undefinedReferences.push(
        ...findTokenReferences(file).filter((reference) => !isDefined(reference.text)),
      );
    }
    expect(formatMatches(undefinedReferences)).toBe('');
  });

  it('theme.css itself only references tokens it defines', () => {
    const undefinedReferences = findTokenReferences(THEME_CSS_PATH).filter(
      (reference) => !isDefined(reference.text),
    );
    expect(formatMatches(undefinedReferences)).toBe('');
  });

  it('the dark theme only overrides tokens that exist in :root', () => {
    const orphans = [...darkTokens].filter((name) => !rootTokens.has(name));
    expect(orphans).toEqual([]);
  });

  it('CSS modules use tokens, not raw colours', () => {
    const rawColourPattern = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;
    const violations: FileMatch[] = [];
    for (const file of sourceFiles) {
      if (!file.endsWith('.module.css')) continue;
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((lineText, index) => {
        const match = lineText.match(rawColourPattern);
        if (match) {
          violations.push({ file, line: index + 1, text: match[0] });
        }
      });
    }
    expect(formatMatches(violations)).toBe('');
  });
});
