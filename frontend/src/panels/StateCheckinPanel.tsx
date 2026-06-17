import { PanelLayout } from '../components/PanelLayout';
import { CheckinSection } from '../components/CheckinSection';
import { useState } from 'react';
import { fetchCheckinStatus, type CheckinStatus } from '../api/state';
import { useEffect } from 'react';

export function StateCheckinPanel() {
  const [status, setStatus] = useState<CheckinStatus | null>(null);

  useEffect(() => {
    fetchCheckinStatus()
      .then((r) => setStatus(r.status))
      .catch(console.error);
  }, []);

  return (
    <PanelLayout
      id="checkin"
      title={status?.title ?? 'Как ты сейчас?'}
      subtitle={status?.subtitle ?? '30 секунд'}
      useGradient
      backToHome
    >
      <CheckinSection showHistory />
    </PanelLayout>
  );
}
