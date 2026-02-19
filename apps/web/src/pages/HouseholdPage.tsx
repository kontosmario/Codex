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
import type { HouseholdSettings } from '../types';

export function HouseholdPage() {
  const queryClient = useQueryClient();

  const [householdSavingsGoalMonthly, setHouseholdSavingsGoalMonthly] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [toastMessage, setToastMessage] = useState('');

  const householdQuery = useQuery({
    queryKey: queryKeys.household,
    queryFn: async () => {
      const { data } = await api.get<{ household: HouseholdSettings }>('/household');
      return data.household;
    }
  });

  useEffect(() => {
    if (!householdQuery.data) {
      return;
    }

    setHouseholdSavingsGoalMonthly(String(householdQuery.data.householdSavingsGoalMonthly));
    setCurrency(householdQuery.data.currency);
  }, [householdQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        householdSavingsGoalMonthly: Number(householdSavingsGoalMonthly || 0),
        currency: currency.trim().toUpperCase()
      };

      const { data } = await api.put<{ household: HouseholdSettings }>('/household', payload);
      return data.household;
    },
    onSuccess: async () => {
      setToastMessage('Ajustes del hogar actualizados 🏠');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.household }),
        queryClient.invalidateQueries({ queryKey: queryKeys.summaryPrefix })
      ]);
    }
  });

  return (
    <div className="page-enter">
      <section className="card-stack">
        <h2>Ajustes del hogar</h2>

        <IonCard className="glass-card">
          <IonCardContent>
            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Meta mensual de ahorro familiar</IonLabel>
              <IonInput
                type="number"
                value={householdSavingsGoalMonthly}
                onIonChange={(event) => setHouseholdSavingsGoalMonthly(event.detail.value ?? '0')}
              />
            </IonItem>

            <IonItem lines="inset" className="glass-item">
              <IonLabel position="stacked">Moneda compartida</IonLabel>
              <IonInput value={currency} onIonChange={(event) => setCurrency(event.detail.value ?? 'USD')} />
            </IonItem>

            <IonButton expand="block" className="primary-btn" onClick={() => saveMutation.mutate()}>
              Guardar ajustes del hogar
            </IonButton>
          </IonCardContent>
        </IonCard>

        {householdQuery.isError || saveMutation.isError ? (
          <IonText color="danger">
            <p className="form-error">No pude guardar o leer los ajustes del hogar.</p>
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
