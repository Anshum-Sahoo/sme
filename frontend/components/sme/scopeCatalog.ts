export interface DataScopeCategory {
  title: string;
  description: string;
  tag: string;
  access: string;
}

const CATALOG: Record<string, DataScopeCategory> = {
  BANK_TRANSACTIONS_12_MONTHS: {
    title: 'Bank Account Statements (Past 12 Months)',
    description:
      'Cash flow analysis, average monthly balance & debit patterns across operational accounts.',
    tag: 'bank_transactions',
    access: 'Read only',
  },
  bank_transactions: {
    title: 'Bank Account Statements (Past 12 Months)',
    description:
      'Cash flow analysis, average monthly balance & debit patterns across operational accounts.',
    tag: 'bank_transactions',
    access: 'Read only',
  },
  GST_RETURNS: {
    title: 'GST Filing History (GSTR-1 & GSTR-3B)',
    description:
      'Official tax filing turnover reconciliation, B2B invoicing validation, and tax compliance records.',
    tag: 'gst_returns',
    access: '24 Mo. Rec',
  },
  gst_returns: {
    title: 'GST Filing History (GSTR-1 & GSTR-3B)',
    description:
      'Official tax filing turnover reconciliation, B2B invoicing validation, and tax compliance records.',
    tag: 'gst_returns',
    access: '24 Mo. Rec',
  },
  bureau_credit_profile: {
    title: 'Commercial Credit Bureau Report',
    description: 'Active credit lines, repayment timeliness, and legal lien registry check.',
    tag: 'bureau_credit_profile',
    access: 'Full Snapshot',
  },
  COMMERCIAL_CREDIT_BUREAU: {
    title: 'Commercial Credit Bureau Report',
    description: 'Active credit lines, repayment timeliness, and legal lien registry check.',
    tag: 'bureau_credit_profile',
    access: 'Full Snapshot',
  },
};

function humanizeScopeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveScopeCategory(scopeKey: string): DataScopeCategory {
  const known = CATALOG[scopeKey];
  if (known) return known;
  return {
    title: humanizeScopeKey(scopeKey),
    description: 'Requested financial record category for this consent.',
    tag: scopeKey.toLowerCase(),
    access: 'Read only',
  };
}
