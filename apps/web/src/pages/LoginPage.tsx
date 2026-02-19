import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText
} from '@ionic/react';
import { useMutation } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';

import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { LoginResponse } from '../types';

export function LoginPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('mario@home.local');
  const [password, setPassword] = useState('Mario1234!');
  const [errorMessage, setErrorMessage] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email,
        password
      });
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      navigate('/dashboard', { replace: true });
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setErrorMessage('Credenciales inválidas 😿');
        return;
      }

      setErrorMessage('No pude iniciar sesión. Intentá de nuevo.');
    }
  });

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <IonPage>
      <IonContent fullscreen className="login-screen">
        <div className="login-wrap">
          <IonCard className="glass-card login-card">
            <IonCardContent>
              <h1>Family Budget Cats</h1>
              <p>Entrá y cuidamos tus números con guantes de gato 🐾</p>

              <IonItem lines="inset" className="glass-item">
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  type="email"
                  value={email}
                  onIonChange={(event) => setEmail(event.detail.value ?? '')}
                  autocomplete="email"
                />
              </IonItem>

              <IonItem lines="inset" className="glass-item">
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput
                  type="password"
                  value={password}
                  onIonChange={(event) => setPassword(event.detail.value ?? '')}
                  autocomplete="current-password"
                />
              </IonItem>

              {errorMessage ? (
                <IonText color="danger">
                  <p className="form-error">{errorMessage}</p>
                </IonText>
              ) : null}

              <IonButton
                expand="block"
                className="primary-btn"
                onClick={() => {
                  setErrorMessage('');
                  loginMutation.mutate();
                }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}
