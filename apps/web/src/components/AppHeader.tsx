import {
  IonButton,
  IonButtons,
  IonChip,
  IonHeader,
  IonLabel,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useQueueCount } from '../hooks/useQueueCount';
import { useAuthStore } from '../store/auth';

const navItems = [
  { path: '/dashboard', label: 'Resumen' },
  { path: '/transactions', label: 'Movimientos' },
  { path: '/add', label: 'Agregar' },
  { path: '/settings', label: 'Ajustes' },
  { path: '/household', label: 'Casa' }
];

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { count } = useQueueCount(user?.id);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <IonHeader translucent>
      <IonToolbar className="glass-toolbar">
        <IonTitle>
          Family Budget Cats <span className="header-cat">🐾</span>
        </IonTitle>
        <IonButtons slot="end">
          {!isOnline && (
            <IonChip color="warning" className="offline-chip">
              <IonLabel>Offline 😿</IonLabel>
            </IonChip>
          )}
          {count > 0 && (
            <IonChip color="medium" className="pending-chip">
              <IonLabel>{count} Pendiente 🐾</IonLabel>
            </IonChip>
          )}
          <IonButton onClick={handleLogout}>Salir</IonButton>
        </IonButtons>
      </IonToolbar>
      <IonToolbar className="nav-toolbar">
        <div className="nav-scroll">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <IonButton
                key={item.path}
                fill={isActive ? 'solid' : 'clear'}
                size="small"
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </IonButton>
            );
          })}
        </div>
      </IonToolbar>
    </IonHeader>
  );
}
