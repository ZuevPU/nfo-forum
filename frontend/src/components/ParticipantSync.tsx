import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { navBadgesFromHome, refreshParticipantSnapshot } from '../lib/participantSnapshot';

/** Keeps auth user + tab badges in sync when navigating between main screens. */
export function ParticipantSync() {
  const location = useLocation();
  const { status, syncUser } = useAuthContext();
  const { setNavBadges } = useLayout();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (location.pathname === '/home') return;

    void refreshParticipantSnapshot()
      .then((data) => {
        syncUser(data.user);
        setNavBadges(navBadgesFromHome(data));
      })
      .catch(console.error);
  }, [location.pathname, status, syncUser, setNavBadges]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshParticipantSnapshot()
        .then((data) => {
          syncUser(data.user);
          setNavBadges(navBadgesFromHome(data));
        })
        .catch(console.error);
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [status, syncUser, setNavBadges]);

  return null;
}
