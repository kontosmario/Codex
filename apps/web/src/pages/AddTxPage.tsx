import {
  IonButton,
  IonCard,
  IonCardContent,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonText,
  IonToast
} from '@ionic/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo, useState } from 'react';

import api from '../lib/api';
import { currentMonth } from '../lib/format';
import { createQueuedTransaction, enqueueTransaction } from '../lib/offlineQueue';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/auth';
import type {
  QueuedTransactionPayload,
  Scope,
  SummaryResponse,
  TransactionItem,
  TransactionType,
  TransactionsResponse
} from '../types';

function applyOptimisticSummary(summary: SummaryResponse, type: TransactionType, amount: number) {
  const next: SummaryResponse = {
    ...summary,
    spentBreakdown: {
      ...summary.spentBreakdown
    }
  };

  if (type === 'SAVING') {
    next.savingTotal += amount;
  } else {
    next.spentBreakdown[type] += amount;
  }

  next.spentTotal = next.spentBreakdown.FIXED + next.spentBreakdown.VARIABLE + next.spentBreakdown.EXTRA;
  next.netTotal = next.incomeTotal - next.spentTotal - next.savingTotal;
  next.progress = next.goalMonthly > 0 ? Math.min(100, (next.savingTotal / next.goalMonthly) * 100) : 0;

  return next;
}

export function AddTxPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('VARIABLE');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const payloadPreviewMonth = useMemo(() => {
    if (!date) return currentMonth();
    return date.slice(0, 7);
  }, [date]);

  const createMutation = useMutation({
    mutationFn: async (payload: QueuedTransactionPayload) => {
      const { data } = await api.post('/transactions', payload);
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactionsPrefix }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summaryPrefix })
      ]);
      setToastMessage('Movimiento guardado 😺');
    }
  });

  const addPendingToCache = (payload: QueuedTransactionPayload, localId: string) => {
    if (!user) {
      return;
    }

    const month = payload.date.slice(0, 7);

    const pendingItem: TransactionItem = {
      id: `pending-${localId}`,
      localId,
      pending: true,
      userId: user.id,
      type: payload.type,
      amount: payload.amount,
      description: payload.description,
      date: payload.date,
      createdAt: new Date().toISOString(),
      user: {
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar
      }
    };

    const scopes: Scope[] = ['personal', 'family'];

    for (const scope of scopes) {
      queryClient.setQueryData<TransactionsResponse>(queryKeys.transactions(month, scope), (current) => {
        if (!current) {
          return {
            month,
            scope,
            items: [pendingItem]
          };
        }

        return {
          ...current,
          items: [pendingItem, ...current.items.filter((row) => row.id !== pendingItem.id)]
        };
      });

      queryClient.setQueryData<SummaryResponse>(queryKeys.summary(month, scope), (current) => {
        if (!current) {
          return current;
        }

        return applyOptimisticSummary(current, payload.type, payload.amount);
      });
    }
  };

  const resetForm = () => {
    setAmount('');
    setType('VARIABLE');
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
  };

  const saveOffline = async (payload: QueuedTransactionPayload) => {
    if (!user) {
      return;
    }

    const queued = createQueuedTransaction({
      userId: user.id,
      payload
    });

    await enqueueTransaction(queued);
    addPendingToCache(payload, queued.localId);
    resetForm();
    setToastMessage('Sin señal, igual te guardo todo 🐾');
  };

  const handleSubmit = async () => {
    if (!user) {
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage('Ingresá un monto válido.');
      return;
    }

    const normalizedDate = new Date(`${date}T12:00:00.000Z`);
    if (Number.isNaN(normalizedDate.getTime())) {
      setErrorMessage('Fecha inválida.');
      return;
    }

    const payload: QueuedTransactionPayload = {
      type,
      amount: numericAmount,
      description: description.trim() || undefined,
      date: normalizedDate.toISOString()
    };

    setErrorMessage('');

    if (!navigator.onLine) {
      await saveOffline(payload);
      return;
    }

    try {
      await createMutation.mutateAsync(payload);
      resetForm();
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        await saveOffline(payload);
        return;
      }

      setErrorMessage('No pude guardar el movimiento. Probá de nuevo.');
    }
  };

  return (
    <div className="page-enter">
      <section className="card-stack">
        <h2>Agregar movimiento</h2>
        <IonCard className="glass-card">
          <IonCardContent>
            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Monto</IonLabel>
              <IonInput
                type="number"
                value={amount}
                inputmode="decimal"
                placeholder="0"
                onIonChange={(event) => setAmount(event.detail.value ?? '')}
              />
            </IonItem>

            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Tipo</IonLabel>
              <IonSelect value={type} onIonChange={(event) => setType(event.detail.value as TransactionType)}>
                <IonSelectOption value="FIXED">FIXED</IonSelectOption>
                <IonSelectOption value="VARIABLE">VARIABLE</IonSelectOption>
                <IonSelectOption value="EXTRA">EXTRA</IonSelectOption>
                <IonSelectOption value="SAVING">SAVING</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Descripción</IonLabel>
              <IonInput
                value={description}
                maxlength={280}
                placeholder="Comida, alquiler, ahorro..."
                onIonChange={(event) => setDescription(event.detail.value ?? '')}
              />
            </IonItem>

            <div className="month-row">
              <label htmlFor="tx-date">Fecha</label>
              <input
                id="tx-date"
                className="month-input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <p className="hint">Mes objetivo: {payloadPreviewMonth}</p>

            {errorMessage ? (
              <IonText color="danger">
                <p className="form-error">{errorMessage}</p>
              </IonText>
            ) : null}

            <IonButton expand="block" className="primary-btn" onClick={handleSubmit}>
              Guardar movimiento
            </IonButton>
          </IonCardContent>
        </IonCard>
      </section>

      <IonToast
        isOpen={Boolean(toastMessage)}
        message={toastMessage}
        duration={1800}
        onDidDismiss={() => setToastMessage('')}
      />
    </div>
  );
}
