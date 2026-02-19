import type { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

import api from './api';
import { countQueuedTransactions, listQueuedTransactions, removeQueuedTransaction } from './offlineQueue';
import { queryKeys } from './queryKeys';
import { useAuthStore } from '../store/auth';

export async function syncQueuedTransactions(queryClient?: QueryClient) {
  const user = useAuthStore.getState().user;

  if (!user) {
    return { synced: 0, remaining: 0 };
  }

  if (!navigator.onLine) {
    const remaining = await countQueuedTransactions(user.id);
    return { synced: 0, remaining };
  }

  const queue = (await listQueuedTransactions(user.id)).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  let synced = 0;

  for (const item of queue) {
    try {
      await api.post('/transactions', item.payload, {
        meta: {
          offlineReplay: true,
          idempotencyKey: item.idempotencyKey
        }
      } as never);
      await removeQueuedTransaction(item.localId);
      synced += 1;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        break;
      }

      if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
        await removeQueuedTransaction(item.localId);
        continue;
      }

      break;
    }
  }

  const remaining = await countQueuedTransactions(user.id);

  if (queryClient && synced > 0) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactionsPrefix }),
      queryClient.invalidateQueries({ queryKey: queryKeys.summaryPrefix })
    ]);
  }

  return { synced, remaining };
}
