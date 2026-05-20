export interface LegalDocumentSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface LegalDocument {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly lastUpdated: string;
  readonly sections: readonly LegalDocumentSection[];
}

export const LEGAL_DOCUMENT_IDS = [
  'terms',
  'privacy',
  'security',
  'cookies',
] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

export function isLegalDocumentId(id: string): id is LegalDocumentId {
  return (LEGAL_DOCUMENT_IDS as readonly string[]).includes(id);
}
