import {
  IonButton,
  IonCard,
  IonCardContent,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonToast
} from '@ionic/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import api from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { syncQueuedTransactions } from '../lib/sync';
import { useAuthStore } from '../store/auth';
import { useQueueCount } from '../hooks/useQueueCount';
import type { UserSettings } from '../types';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { count, refresh } = useQueueCount(user?.id);

  const [salaryMonthly, setSalaryMonthly] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [userSavingsGoalMonthly, setUserSavingsGoalMonthly] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      const { data } = await api.get<{ settings: UserSettings }>('/settings');
      return data.settings;
    }
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setSalaryMonthly(String(settingsQuery.data.salaryMonthly));
    setCurrency(settingsQuery.data.currency);
    setUserSavingsGoalMonthly(
      settingsQuery.data.userSavingsGoalMonthly === null ? '' : String(settingsQuery.data.userSavingsGoalMonthly)
    );
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        salaryMonthly: Number(salaryMonthly || 0),
        currency: currency.trim().toUpperCase(),
        userSavingsGoalMonthly: userSavingsGoalMonthly ? Number(userSavingsGoalMonthly) : null
      };

      const { data } = await api.put<{ settings: UserSettings }>('/settings', payload);
      return data.settings;
    },
    onSuccess: async () => {
      setToastMessage('Ajustes personales guardados 😺');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summaryPrefix })
      ]);
    }
  });

  const handleSync = async () => {
    const result = await syncQueuedTransactions(queryClient);
    await refresh();

    if (result.synced > 0) {
      setToastMessage(`Sincronizados ${result.synced} movimiento(s)`);
      return;
    }

    if (!navigator.onLine) {
      setToastMessage('Sin conexión. Reintento pendiente 🐾');
      return;
    }

    setToastMessage('No había pendientes para sincronizar');
  };

  return (
    <div className="page-enter">
      <section className="card-stack">
        <h2>Ajustes personales</h2>

        <IonCard className="glass-card">
          <IonCardContent>
            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Salario mensual</IonLabel>
              <IonInput
                type="number"
                value={salaryMonthly}
                onIonChange={(event) => setSalaryMonthly(event.detail.value ?? '0')}
              />
            </IonItem>

            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Moneda</IonLabel>
              <IonInput value={currency} onIonChange={(event) => setCurrency(event.detail.value ?? 'USD')} />
            </IonItem>

            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Meta de ahorro personal (opcional)</IonLabel>
              <IonInput
                type="number"
                value={userSavingsGoalMonthly}
                onIonChange={(event) => setUserSavingsGoalMonthly(event.detail.value ?? '')}
              />
            </IonItem>

            <IonButton expand="block" className="primary-btn" onClick={() => saveMutation.mutate()}>
              Guardar ajustes
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard className="glass-card">
          <IonCardContent>
            <p>Pendientes offline: {count}</p>
            <IonButton expand="block" fill="outline" onClick={handleSync}>
              Sync 🐾
            </IonButton>
            {!navigator.onLine ? <p className="hint">Sin señal, igual te guardo todo 🐾</p> : null}
          </IonCardContent>
        </IonCard>

        {settingsQuery.isError || saveMutation.isError ? (
          <IonText color="danger">
            <p className="form-error">No pude guardar o leer tus ajustes.</p>
          </IonText>
        ) : null}
      </section>

      <IonToast
        isOpen={Boolean(toastMessage)}
        message={toastMessage}
        duration={2000}
        onDidDismiss={() => setToastMessage('')}
      />
    </div>
  );
}
