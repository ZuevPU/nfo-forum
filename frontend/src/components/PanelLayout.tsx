import { Div, Panel, PanelHeader, Placeholder, Spinner } from '@vkontakte/vkui';
import type { ReactNode } from 'react';
import { GradientHeader } from './GradientHeader';
import { PanelTitle } from './PanelTitle';

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  useGradient?: boolean;
  backToHome?: boolean;
  headerChildren?: ReactNode;
  children: ReactNode;
}

export function PanelLayout({
  id,
  title,
  subtitle,
  loading,
  error,
  useGradient = false,
  backToHome,
  headerChildren,
  children,
}: Props) {
  return (
    <Panel id={id}>
      {useGradient ? (
        <GradientHeader title={title} subtitle={subtitle} backToHome={backToHome}>
          {headerChildren}
        </GradientHeader>
      ) : (
        <PanelHeader>
          <PanelTitle title={title} subtitle={subtitle} />
        </PanelHeader>
      )}
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      ) : error ? (
        <Placeholder>{error}</Placeholder>
      ) : (
        <div className="nfo-bg">{children}</div>
      )}
    </Panel>
  );
}
