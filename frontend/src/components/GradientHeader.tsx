import { Footnote, Title } from '@vkontakte/vkui';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function GradientHeader({ title, subtitle, children }: Props) {
  return (
    <div className="nfo-gradient-header">
      <Title level="2" style={{ color: '#fff' }}>{title}</Title>
      {subtitle && <Footnote style={{ color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{subtitle}</Footnote>}
      {children}
    </div>
  );
}
