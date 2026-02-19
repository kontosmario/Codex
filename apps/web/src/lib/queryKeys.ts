import type { Scope } from '../types';

export const queryKeys = {
  summaryPrefix: ['summary'] as const,
  transactionsPrefix: ['transactions'] as const,
  summary: (month: string, scope: Scope) => ['summary', month, scope] as const,
  transactions: (month: string, scope: Scope) => ['transactions', month, scope] as const,
  settings: ['settings'] as const,
  household: ['household'] as const
};
