'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { NotificationItem, INITIAL_NOTIFICATIONS, NotificationSector, NotificationType } from './notifications';
import { toast } from './toast-context';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (item: {
    sector: NotificationSector;
    type: NotificationType;
    title: string;
    message: string;
    link: string;
    actionText?: string;
  }) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function getSessionUser(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)rocket_session=([^;]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  try {
    return localStorage.getItem('rocket_active_user_id');
  } catch {}
  return null;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // 1. Carrega notificações salvas no localStorage
  useEffect(() => {
    try {
      const user = getSessionUser();
      const userKey = user ? `rocket_club_notifications_${user}` : 'rocket_club_notifications';
      const saved = localStorage.getItem(userKey) || localStorage.getItem('rocket_club_notifications');
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load notifications from localStorage');
    }
  }, []);

  const saveNotifications = useCallback((items: NotificationItem[]) => {
    setNotifications(items);
    try {
      const user = getSessionUser();
      if (user) {
        localStorage.setItem(`rocket_club_notifications_${user}`, JSON.stringify(items));
      }
      localStorage.setItem('rocket_club_notifications', JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  }, []);

  // 2. Conexão SSE em tempo real (100% Zero Custo / Server-Sent Events nativo)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimer: NodeJS.Timeout | null = null;

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/notifications/stream');

        eventSource.addEventListener('notification', (event) => {
          try {
            const newNotif: NotificationItem = JSON.parse(event.data);
            setNotifications((prev) => {
              const updated = [newNotif, ...prev.filter((n) => n.id !== newNotif.id)];
              try {
                localStorage.setItem('rocket_club_notifications', JSON.stringify(updated));
              } catch {}
              return updated;
            });

            // Feedback visual com Toast
            toast.info(newNotif.title, newNotif.message);
          } catch (err) {
            console.warn('[SSE] Falha ao processar payload da notificação:', err);
          }
        });

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          // Tenta reconectar suavemente após 10 segundos
          retryTimer = setTimeout(connectSSE, 10000);
        };
      } catch (err) {
        console.warn('[SSE] Conexão indisponível:', err);
      }
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      try {
        const user = getSessionUser();
        if (user) localStorage.setItem(`rocket_club_notifications_${user}`, JSON.stringify(updated));
        localStorage.setItem('rocket_club_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        const user = getSessionUser();
        if (user) localStorage.setItem(`rocket_club_notifications_${user}`, JSON.stringify(updated));
        localStorage.setItem('rocket_club_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        const user = getSessionUser();
        if (user) localStorage.setItem(`rocket_club_notifications_${user}`, JSON.stringify(updated));
        localStorage.setItem('rocket_club_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const addNotification = useCallback((item: {
    sector: NotificationSector;
    type: NotificationType;
    title: string;
    message: string;
    link: string;
    actionText?: string;
  }) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      ...item,
      createdAt: 'Agora mesmo',
      read: false,
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      try {
        const user = getSessionUser();
        if (user) localStorage.setItem(`rocket_club_notifications_${user}`, JSON.stringify(updated));
        localStorage.setItem('rocket_club_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    try {
      const user = getSessionUser();
      if (user) localStorage.setItem(`rocket_club_notifications_${user}`, JSON.stringify([]));
      localStorage.setItem('rocket_club_notifications', JSON.stringify([]));
    } catch {}
  }, []);

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
    clearAll,
  }), [notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, addNotification, clearAll]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
