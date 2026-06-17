import { useEffect, useState } from 'react';
import { fetchNfoDayConfig, type NfoDayConfig } from '../api/reflection';
import { PanelLayout } from '../components/PanelLayout';
import { NfoDaySection } from '../components/NfoDaySection';

export function NfoDayPanel() {
  const [config, setConfig] = useState<NfoDayConfig | null>(null);

  useEffect(() => {
    fetchNfoDayConfig()
      .then(setConfig)
      .catch(console.error);
  }, []);

  return (
    <PanelLayout
      id="nfo-day"
      title={config?.panelTitle ?? 'Каким было НФО сегодня?'}
      subtitle={config?.panelSubtitle ?? 'Вечерняя рефлексия'}
      useGradient
      backToHome
    >
      <NfoDaySection />
    </PanelLayout>
  );
}
