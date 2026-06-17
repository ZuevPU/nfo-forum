import { Div, Footnote, Title } from '@vkontakte/vkui';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  backToHome?: boolean;
  variant?: 'main' | 'default';
  actions?: ReactNode;
  children?: ReactNode;
}

export function GradientHeader({ title, subtitle, backToHome, variant = 'default', actions, children }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className={`nfo-gradient-header${variant === 'main' ? ' nfo-gradient-header--main' : ''}`}
      style={{ position: 'relative' }}
    >
      {actions && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>{actions}</div>
      )}
      <Title level="2" style={{ color: '#fff' }}>{title}</Title>
      {subtitle && <Footnote style={{ color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{subtitle}</Footnote>}
      {backToHome && (
        <Div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="nfo-admin-btn-outline"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)' }}
            onClick={() => navigate('/home')}
          >
            ← На главную
          </button>
        </Div>
      )}
      {children}
    </div>
  );
}
