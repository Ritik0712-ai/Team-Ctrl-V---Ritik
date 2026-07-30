'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import styles from './page.module.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setNotifications(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-read', { method: 'POST' });
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
      }))
    );
  };

  if (!user) return <PageSpinner />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Notifications</h1>
          <p className={styles.pageSubtitle}>
            {notifications.filter((n) => !n.is_read).length > 0
              ? `${notifications.filter((n) => !n.is_read).length} unread`
              : 'All caught up'}
          </p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className={styles.markReadBtn}>
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <PageSpinner />
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <Bell size={40} strokeWidth={1.5} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => (
            <Card key={n.id} className={`${styles.notifCard} ${!n.is_read ? styles.unread : ''}`}>
              <CardContent>
                <div className={styles.notifContent}>
                  <div className={styles.notifIcon}>
                    {n.title?.toUpperCase().includes('APPROVED') ||
                    n.title?.toUpperCase().includes('CONFIRMED') ? (
                      <CheckCircle size={18} />
                    ) : n.title?.toUpperCase().includes('REJECTED') ||
                      n.title?.toUpperCase().includes('CANCELLED') ? (
                      <Clock size={18} />
                    ) : (
                      <Bell size={18} />
                    )}
                  </div>
                  <div className={styles.notifBody}>
                    <p className={styles.notifMsg}>{n.message}</p>
                    <span className={styles.notifTime}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}