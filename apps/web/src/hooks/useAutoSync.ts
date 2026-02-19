import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../store/auth';
import { syncQueuedTransactions } from '../lib/sync';

export function useAutoSync() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      return;
    }

    const handleOnline = () => {
      void syncQueuedTransactions(queryClient);
    };

    window.addEventListener('online', handleOnline);
    void handleOnline();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [token, queryClient]);
}
