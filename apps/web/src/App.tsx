import { IonContent, IonPage } from '@ionic/react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { AppHeader } from './components/AppHeader';
import { useAutoSync } from './hooks/useAutoSync';
import { AddTxPage } from './pages/AddTxPage';
import { DashboardPage } from './pages/DashboardPage';
import { HouseholdPage } from './pages/HouseholdPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { useAuthStore } from './store/auth';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function ShellLayout() {
  useAutoSync();

  return (
    <IonPage>
      <AppHeader />
      <IonContent fullscreen className="screen-content">
        <div className="content-wrap">
          <Outlet />
        </div>
      </IonContent>
    </IonPage>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <ShellLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/add" element={<AddTxPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/household" element={<HouseholdPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
