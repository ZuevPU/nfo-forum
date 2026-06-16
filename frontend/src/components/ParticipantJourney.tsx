import { useState } from 'react';
import { PARTICIPANT_JOURNEY } from '../constants/participantJourney';

export function ParticipantJourney() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="nfo-journey-wrap">
      <button
        type="button"
        className="nfo-journey-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="nfo-journey-toggle-title">🗺️ Путь участника</span>
        <span className="nfo-journey-toggle-hint">{expanded ? 'Свернуть' : 'Показать расписание дня'}</span>
      </button>

      {expanded && (
        <>
          <div className="nfo-journey-legend">
            <div className="nfo-journey-leg-item">
              <span className="nfo-journey-leg-dot nfo-journey-leg-dot--active" />
              ⚡ Бот активен
            </div>
            <div className="nfo-journey-leg-item">
              <span className="nfo-journey-leg-dot nfo-journey-leg-dot--silent" />
              — Бот молчит
            </div>
          </div>

          <div className="nfo-timeline">
            {PARTICIPANT_JOURNEY.map((item) => (
              <div key={`${item.time}-${item.title}`} className="nfo-titem">
                <div className="nfo-t-left">
                  <div className="nfo-t-time">{item.time}</div>
                  <div className={`nfo-t-icon ${item.iconClass}`}>{item.emoji}</div>
                  {!item.isLast && <div className="nfo-t-line" />}
                </div>
                <div className="nfo-t-right">
                  <div className={`nfo-t-card${item.status === 'silent' ? ' silent' : ''}`}>
                    <div className="nfo-t-title">{item.title}</div>
                    <div className={`nfo-t-status${item.status === 'silent' ? ' silent-s' : ' active'}`}>
                      {item.status === 'active' ? '⚡ Бот активен' : '— Бот молчит'}
                    </div>
                    <div className="nfo-t-desc">{item.description}</div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="nfo-t-tags">
                        {item.tags.map((tag) => (
                          <span key={tag.label} className={`nfo-journey-tag nfo-journey-tag--${tag.variant}`}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
