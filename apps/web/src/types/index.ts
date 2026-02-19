export type Scope = 'personal' | 'family';
export type TransactionType = 'FIXED' | 'VARIABLE' | 'EXTRA' | 'SAVING';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface UserSettings {
  id: string;
  userId: string;
  salaryMonthly: number;
  currency: string;
  userSavingsGoalMonthly: number | null;
}

export interface HouseholdSettings {
  id: number;
  householdSavingsGoalMonthly: number;
  currency: string;
}

export interface TransactionUser {
  id: string;
  displayName: string;
  avatar: string;
}

export interface TransactionItem {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string | null;
  date: string;
  createdAt: string;
  user: TransactionUser | null;
  pending?: boolean;
  localId?: string;
}

export interface TransactionsResponse {
  month: string;
  scope: Scope;
  items: TransactionItem[];
}

export interface SummaryResponse {
  month: string;
  scope: Scope;
  currency: string;
  incomeTotal: number;
  spentBreakdown: {
    FIXED: number;
    VARIABLE: number;
    EXTRA: number;
  };
  spentTotal: number;
  savingTotal: number;
  netTotal: number;
  goalMonthly: number;
  progress: number;
}

export interface QueuedTransactionPayload {
  type: TransactionType;
  amount: number;
  description?: string;
  date: string;
}

export interface QueuedTransaction {
  localId: string;
  userId: string;
  idempotencyKey: string;
  payload: QueuedTransactionPayload;
  createdAt: string;
}
