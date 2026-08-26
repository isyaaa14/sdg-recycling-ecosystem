import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Icon from './icons/Icon';
import styles from './NotificationBell.module.css';

export const NOTIFICATIONS_REFRESH_EVENT = 'sdg:notifications-refresh';

export function requestNotificationsRefresh() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
}

function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      // Keep last known state; bell is optional UX.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 45000);
    const onRefresh = () => load();
    const onFocus = () => load();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    load().finally(() => setLoading(false));

    const onPointer = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, load]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.bellBtn} ${open ? styles.bellBtnOpen : ''}`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={16} />
        {unreadCount > 0 ? (
          <span className={styles.count}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHead}>
            <strong>Notifications</strong>
            {unreadCount > 0 ? (
              <button type="button" className={styles.markAll} onClick={markAll}>
                Mark all read
              </button>
            ) : null}
          </div>

          <div className={styles.list}>
            {loading && items.length === 0 ? (
              <p className={styles.empty}>Loading…</p>
            ) : null}
            {!loading && items.length === 0 ? (
              <p className={styles.empty}>No notifications yet.</p>
            ) : null}
            {items.map((item) => {
              const content = (
                <>
                  <span className={styles.itemTitle}>{item.title}</span>
                  {item.body ? (
                    <span className={styles.itemBody}>{item.body}</span>
                  ) : null}
                  <span className={styles.itemWhen}>{formatWhen(item.createdAt)}</span>
                </>
              );

              return (
                <div
                  key={item.id}
                  className={`${styles.item} ${item.read ? '' : styles.unread}`}
                >
                  {item.link ? (
                    <Link
                      to={item.link}
                      className={styles.itemLink}
                      onClick={() => {
                        if (!item.read) markRead(item.id);
                        setOpen(false);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={styles.itemLink}
                      onClick={() => {
                        if (!item.read) markRead(item.id);
                      }}
                    >
                      {content}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
