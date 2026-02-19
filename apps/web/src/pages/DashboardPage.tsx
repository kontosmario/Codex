import {
  IonCard,
  IonCardContent,
  IonProgressBar,
  IonSkeletonText,
  IonText
} from '@ionic/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { ScopeToggle } from '../components/ScopeToggle';
import { formatCurrency, currentMonth } from '../lib/format';
import api from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/auth';
import type { SummaryResponse } from '../types';

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const scope = useAuthStore((state) => state.scope);

  const summaryQuery = useQuery({
    queryKey: queryKeys.summary(month, scope),
    queryFn: async () => {
      const { data } = await api.get<SummaryResponse>('/summary', {
        params: { month, scope }
      });
      return data;
    },
    placeholderData: keepPreviousData
  });

  const summary = summaryQuery.data;

  return (
    <div className="page-enter">
      <section className="card-stack">
        <h2>Resumen mensual</h2>
        <div className="month-row">
          <label htmlFor="month-dashboard">Mes</label>
          <input
            id="month-dashboard"
            className="month-input"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
        <ScopeToggle />

        {summaryQuery.isLoading && !summary ? (
          <IonCard className="glass-card">
            <IonCardContent>
              <IonSkeletonText animated style={{ width: '40%', height: 24 }} />
              <IonSkeletonText animated style={{ width: '100%', height: 16 }} />
              <IonSkeletonText animated style={{ width: '100%', height: 16 }} />
              <IonSkeletonText animated style={{ width: '100%', height: 16 }} />
            </IonCardContent>
          </IonCard>
        ) : null}

        {summary ? (
          <>
            <IonCard className="glass-card">
              <IonCardContent>
                <p className="eyebrow">Ingresos</p>
                <h3>{formatCurrency(summary.incomeTotal, summary.currency)}</h3>
                <p>
                  Gastos: <strong>{formatCurrency(summary.spentTotal, summary.currency)}</strong>
                </p>
                <p>
                  Ahorro: <strong>{formatCurrency(summary.savingTotal, summary.currency)}</strong>
                </p>
                <p>
                  Neto: <strong>{formatCurrency(summary.netTotal, summary.currency)}</strong>
                </p>
              </IonCardContent>
            </IonCard>

            <IonCard className="glass-card">
              <IonCardContent>
                <p className="eyebrow">Desglose de gastos</p>
                <p>Fijos: {formatCurrency(summary.spentBreakdown.FIXED, summary.currency)}</p>
                <p>Variables: {formatCurrency(summary.spentBreakdown.VARIABLE, summary.currency)}</p>
                <p>Extras: {formatCurrency(summary.spentBreakdown.EXTRA, summary.currency)}</p>
              </IonCardContent>
            </IonCard>

            <IonCard className="glass-card">
              <IonCardContent>
                <p className="eyebrow">Meta de ahorro</p>
                <p>
                  {formatCurrency(summary.savingTotal, summary.currency)} /{' '}
                  {formatCurrency(summary.goalMonthly, summary.currency)}
                </p>
                <IonProgressBar value={summary.progress / 100} />
                <p className="hint">{summary.progress.toFixed(1)}% completo</p>
              </IonCardContent>
            </IonCard>

            {summary.incomeTotal === 0 && summary.spentTotal === 0 && summary.savingTotal === 0 ? (
              <IonCard className="glass-card">
                <IonCardContent>
                  <p>No hay movimientos todavía 😺</p>
                </IonCardContent>
              </IonCard>
            ) : null}
          </>
        ) : null}

        {summaryQuery.isError ? (
          <IonText color="danger">
            <p className="form-error">No pude cargar el resumen del mes.</p>
          </IonText>
        ) : null}
      </section>
    </div>
  );
}
