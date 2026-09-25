import { EventEmitter } from 'events';
import { NotificationItem } from './notifications';

// Barramento global em memória para SSE (Zero Custo)
class NotificationEventEmitter extends EventEmitter {}

export const notificationBus = new NotificationEventEmitter();
notificationBus.setMaxListeners(200);

export function broadcastNotificationToOrg(organizationId: string, notification: NotificationItem): void {
  notificationBus.emit(`notify:${organizationId}`, notification);
}

export function broadcastNotificationToUser(userId: string, notification: NotificationItem): void {
  notificationBus.emit(`notify:user:${userId}`, notification);
}
