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

export const LEGAL_DOCUMENTS = {
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    description:
      'These terms govern your use of the Oequ demo application and starter kit.',
    lastUpdated: 'May 16, 2026',
    sections: [
      {
        heading: '1. Agreement',
        paragraphs: [
          'By accessing or using this application, you agree to these Terms of Service. If you are using the product on behalf of an organization, you represent that you have authority to bind that organization.',
          'This demo environment is provided for evaluation and development purposes. Production deployments must replace placeholder policies with counsel-reviewed terms.',
        ],
      },
      {
        heading: '2. Accounts and access',
        paragraphs: [
          'You are responsible for safeguarding credentials associated with your account. Notify us promptly of any unauthorized access.',
          'We may suspend or terminate access that violates these terms, applicable law, or creates risk to other customers or platform integrity.',
        ],
      },
      {
        heading: '3. Acceptable use',
        paragraphs: [
          'You may not use the service to distribute malware, attempt unauthorized access, harass others, or process personal data without a lawful basis.',
          'Rate limits, security controls, and audit logging may be applied to protect the platform and other tenants.',
        ],
      },
      {
        heading: '4. Intellectual property',
        paragraphs: [
          'The starter kit, UI components, and documentation remain the property of their respective licensors. Your application code and customer data remain yours, subject to the license you choose for the OSS components.',
        ],
      },
      {
        heading: '5. Disclaimer and liability',
        paragraphs: [
          'The demo is provided “as is” without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from use of the demo.',
        ],
      },
      {
        heading: '6. Changes',
        paragraphs: [
          'We may update these terms by posting a revised version and updating the “Last updated” date. Continued use after changes constitutes acceptance.',
        ],
      },
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    description:
      'How we collect, use, and protect personal information in the Oequ demo.',
    lastUpdated: 'May 16, 2026',
    sections: [
      {
        heading: '1. Overview',
        paragraphs: [
          'This policy describes how personal data is handled when you use the Oequ SaaS starter demo. In production, you must publish a policy aligned with your jurisdictions, subprocessors, and data flows.',
        ],
      },
      {
        heading: '2. Data we process',
        paragraphs: [
          'Account data: name, email address, authentication identifiers, and session metadata.',
          'Workspace data: organization name, membership, billing metadata (in mock adapters), and settings you configure in the UI.',
          'Technical data: IP address, browser type, and diagnostic logs when error reporting is enabled.',
        ],
      },
      {
        heading: '3. How we use data',
        paragraphs: [
          'We use data to authenticate users, provide the application, secure tenants, improve reliability, and comply with legal obligations.',
          'We do not sell personal information. Marketing communications require separate consent where required by law.',
        ],
      },
      {
        heading: '4. Retention and deletion',
        paragraphs: [
          'Data is retained while your account is active and as needed for security, billing, and legal compliance. You may request deletion of your account; workspace data may require separate owner action.',
        ],
      },
      {
        heading: '5. Subprocessors',
        paragraphs: [
          'Production deployments commonly rely on infrastructure providers (hosting, database, email, payments). Maintain an up-to-date subprocessor list and data processing agreements.',
        ],
      },
      {
        heading: '6. Your rights',
        paragraphs: [
          'Depending on your location, you may have rights to access, correct, delete, or export personal data, and to object to certain processing. Contact privacy@example.com for requests (replace in production).',
        ],
      },
      {
        heading: '7. Contact',
        paragraphs: [
          'Questions about this policy: privacy@example.com. For security issues, see our Security page.',
        ],
      },
    ],
  },
  security: {
    id: 'security',
    title: 'Security',
    description:
      'Security practices embodied in the Oequ B2B SaaS starter architecture.',
    lastUpdated: 'May 16, 2026',
    sections: [
      {
        heading: 'Tenant isolation',
        paragraphs: [
          'The full-stack starter enforces multi-tenancy at the database layer using Row Level Security (RLS), not application-only filters. JWT claims carry organization context; policies reject cross-tenant reads and writes.',
        ],
      },
      {
        heading: 'Authentication',
        paragraphs: [
          'Use verified JWT claims (`getClaims`) for route guards. Reserve authoritative checks (`getUser`) for destructive operations. Support MFA, session revocation, and SSO in production roadmaps.',
        ],
      },
      {
        heading: 'Secrets and keys',
        paragraphs: [
          'Never expose service role keys to the client. Scope API keys to workspaces. Rotate credentials and store secrets in a managed vault.',
        ],
      },
      {
        heading: 'Reporting vulnerabilities',
        paragraphs: [
          'If you discover a security issue in the starter kit, report it responsibly to security@example.com with reproduction steps. Do not disclose publicly before coordination.',
        ],
      },
    ],
  },
  cookies: {
    id: 'cookies',
    title: 'Cookie Policy',
    description: 'How cookies and similar technologies are used in the demo.',
    lastUpdated: 'May 16, 2026',
    sections: [
      {
        heading: '1. What we use',
        paragraphs: [
          'Strictly necessary cookies maintain your session and security preferences (for example, authentication tokens and CSRF protection where applicable).',
          'Analytics or marketing cookies are not enabled in the default demo build.',
        ],
      },
      {
        heading: '2. Managing preferences',
        paragraphs: [
          'You can clear cookies via browser settings. Signing out invalidates the application session. Production apps may require a consent banner where local law mandates it.',
        ],
      },
    ],
  },
} as const satisfies Record<string, LegalDocument>;

export type LegalDocumentId = keyof typeof LEGAL_DOCUMENTS;

export function getLegalDocument(id: string): LegalDocument | null {
  return LEGAL_DOCUMENTS[id as LegalDocumentId] ?? null;
}
