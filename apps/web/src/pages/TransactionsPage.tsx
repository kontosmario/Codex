import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonItem,
  IonLabel,
  IonList,
  IonText
} from '@ionic/react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import api from '../lib/api';
import { currentMonth, formatCurrency, formatShortDate } from '../lib/format';
import { queryKeys } from '../lib/queryKeys';
import { ScopeToggle } from '../components/ScopeToggle';
import { useAuthStore } from '../store/auth';
import type { TransactionItem, TransactionsResponse } from '../types';

export function TransactionsPage() {
  const [month, setMonth] = useState(currentMonth());
  const scope = useAuthStore((state) => state.scope);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions(month, scope),
    queryFn: async () => {
      const { data } = await api.get<TransactionsResponse>('/transactions', {
        params: { month, scope }
      });
      return data;
    },
    placeholderData: keepPreviousData
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions(month, scope) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summary(month, scope) })
      ]);
    }
  });

  const rows = transactionsQuery.data?.items ?? [];

  return (
    <div className="page-enter">
      <section className="card-stack">
        <h2>Movimientos</h2>

        <div className="month-row">
          <label htmlFor="month-transactions">Mes</label>
          <input
            id="month-transactions"
            className="month-input"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>

        <ScopeToggle />

        <IonCard className="glass-card">
          <IonCardContent>
            {rows.length === 0 ? (
              <p>No hay movimientos todavía 😺</p>
            ) : (
              <IonList inset={false} lines="full" className="tx-list">
                {rows.map((tx: TransactionItem) => {
                  const canDelete = tx.userId === user?.id && !tx.pending;
                  return (
                    <IonItem key={tx.id} className="tx-item">
                      <IonLabel>
                        <p className="tx-top-line">
                          <span className="tx-type">{tx.type}</span>
                          <span className="tx-amount">{formatCurrency(tx.amount, 'USD')}</span>
                        </p>
                        <p>{tx.description || 'Sin descripción'}</p>
                        <p>
                          {formatShortDate(tx.date)}
                          {scope === 'family' && tx.user ? ` · ${tx.user.avatar} ${tx.user.displayName}` : ''}
                        </p>
                        {tx.pending ? <IonChip color="warning">Pendiente 🐾</IonChip> : null}
                      </IonLabel>

                      {canDelete ? (
                        <IonButton
                          fill="clear"
                          color="danger"
                          onClick={() => deleteMutation.mutate(tx.id)}
                          slot="end"
                        >
                          Borrar
                        </IonButton>
                      ) : null}
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        {transactionsQuery.isError ? (
          <IonText color="danger">
            <p className="form-error">No pude cargar movimientos del mes.</p>
          </IonText>
        ) : null}
      </section>
    </div>
  );
}
