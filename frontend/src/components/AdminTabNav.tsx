import { ADMIN_TAB_GROUPS, type AdminTab } from '../constants/adminTabs';

interface Props {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
  badges?: Partial<Record<AdminTab, number>>;
}

export function AdminTabNav({ activeTab, onChange, badges }: Props) {
  return (
    <div className="nfo-admin-nav-sticky">
      <div className="nfo-admin-nav">
        {ADMIN_TAB_GROUPS.map((group) => (
          <div key={group.label} className="nfo-admin-nav-group">
            <div className="nfo-sec-title">{group.label}</div>
            <div className="nfo-admin-tabs">
              {group.tabs.map(({ id, label }) => {
                const count = badges?.[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={`nfo-admin-tab${activeTab === id ? ' active' : ''}`}
                    onClick={() => onChange(id)}
                    aria-current={activeTab === id ? 'page' : undefined}
                  >
                    {label}
                    {count != null && count > 0 ? (
                      <span className="nfo-admin-tab-badge">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
