export type JsTokenKind = 'keyword' | 'string' | 'punctuation' | 'plain';

export interface JsToken {
  readonly kind: JsTokenKind;
  readonly text: string;
}

const JS_TOKEN_PATTERN =
  /('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\b(import|const|await|new)\b|\bfrom\b(?=\s+['"])|([{}()[\].,;:])|(\n|\s+)/g;

/** Lightweight tokenizer for static demo snippets (no runtime eval). */
export function tokenizeJavaScript(source: string): readonly JsToken[] {
  const tokens: JsToken[] = [];
  let last = 0;

  for (const match of source.matchAll(JS_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) {
      tokens.push({ kind: 'plain', text: source.slice(last, index) });
    }

    const [full, str, keyword, punct, whitespace] = match;
    if (str) {
      tokens.push({ kind: 'string', text: str });
    } else if (keyword) {
      tokens.push({ kind: 'keyword', text: keyword });
    } else if (punct) {
      tokens.push({ kind: 'punctuation', text: punct });
    } else if (whitespace) {
      tokens.push({ kind: 'plain', text: whitespace });
    } else {
      tokens.push({ kind: 'plain', text: full });
    }

    last = index + full.length;
  }

  if (last < source.length) {
    tokens.push({ kind: 'plain', text: source.slice(last) });
  }

  return tokens;
}
