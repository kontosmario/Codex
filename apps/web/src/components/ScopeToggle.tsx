import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';

import { useAuthStore } from '../store/auth';

export function ScopeToggle() {
  const scope = useAuthStore((state) => state.scope);
  const setScope = useAuthStore((state) => state.setScope);

  return (
    <IonSegment
      value={scope}
      onIonChange={(event) => setScope(event.detail.value as 'personal' | 'family')}
      className="scope-segment"
    >
      <IonSegmentButton value="personal">
        <IonLabel>Personal</IonLabel>
      </IonSegmentButton>
      <IonSegmentButton value="family">
        <IonLabel>Family</IonLabel>
      </IonSegmentButton>
    </IonSegment>
  );
}
