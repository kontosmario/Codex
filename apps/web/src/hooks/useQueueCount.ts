import { useCallback, useEffect, useState } from 'react';

import { countQueuedTransactions } from '../lib/offlineQueue';

export function useQueueCount(userId?: string) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }

    const total = await countQueuedTransactions(userId);
    setCount(total);
  }, [userId]);

  useEffect(() => {
    void refresh();

    const listener = () => {
      void refresh();
    };

    window.addEventListener('queue-updated', listener);

    const interval = window.setInterval(() => {
      void refresh();
    }, 6000);

    return () => {
      window.removeEventListener('queue-updated', listener);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { count, refresh };
}
