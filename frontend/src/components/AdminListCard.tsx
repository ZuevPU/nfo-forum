import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

export function AdminListCard({ title, meta, badge, children, actions }: Props) {
  return (
    <div className="nfo-admin-list-card">
      {badge ? <div className="nfo-admin-list-badge">{badge}</div> : null}
      <div className="nfo-admin-list-title">{title}</div>
      {meta ? <div className="nfo-admin-list-meta">{meta}</div> : null}
      {children}
      {actions ? <div className="nfo-admin-actions">{actions}</div> : null}
    </div>
  );
}
