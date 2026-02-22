import { useState, useRef, useEffect } from 'react';

export function useNotificationDropdown() {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsAnchorRef = useRef(null);

  useEffect(() => {
    if (!showNotifications) return;

    const handlePointerDown = (event) => {
      const anchor = notificationsAnchorRef.current;
      if (!anchor?.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleScrollOrWheel = (event) => {
      const anchor = notificationsAnchorRef.current;
      if (anchor && !anchor.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    window.addEventListener('scroll', handleScrollOrWheel, true);
    window.addEventListener('wheel', handleScrollOrWheel, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      window.removeEventListener('scroll', handleScrollOrWheel, true);
      window.removeEventListener('wheel', handleScrollOrWheel, true);
    };
  }, [showNotifications]);

  return { showNotifications, setShowNotifications, notificationsAnchorRef };
}
