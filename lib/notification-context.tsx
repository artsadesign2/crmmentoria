'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationItem, INITIAL_NOTIFICATIONS, NotificationSector, NotificationType } from './notifications';

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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rocket_club_notifications');
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load notifications from localStorage');
    }
  }, []);

  const saveNotifications = (items: NotificationItem[]) => {
    setNotifications(items);
    try {
      localStorage.setItem('rocket_club_notifications', JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const removeNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const addNotification = (item: {
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
    saveNotifications([newNotif, ...notifications]);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        removeNotification,
        addNotification,
        clearAll,
      }}
    >
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
