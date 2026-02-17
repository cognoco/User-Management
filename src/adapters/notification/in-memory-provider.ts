import { randomUUID } from 'crypto';
import type { INotificationDataProvider } from '@/core/notification/INotificationDataProvider';
import {
  Notification,
  NotificationChannel,
  NotificationCategory,
  NotificationDeliveryStatus,
  NotificationFilter,
  NotificationPreferences,
  NotificationPriority,
  NotificationResult,
  NotificationStatus,
  NotificationTemplate,
  NotificationTemplateList,
  NotificationTemplateQuery,
  NotificationBatch,
  NotificationPayload,
} from '@/core/notification/models';

function defaultPreferences(): NotificationPreferences {
  return {
    email: true,
    push: true,
    sms: false,
    inApp: true,
    marketing: false,
    categories: {
      system: true,
      security: true,
      account: true,
      promotional: false,
      updates: true,
      activity: true,
      team: true,
    },
  };
}

function applyTemplate(str: string, data: Record<string, any>): string {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (data[k] ?? ''));
}

export class InMemoryNotificationProvider implements INotificationDataProvider {
  private notifications = new Map<string, Notification>();
  private userMap = new Map<string, Set<string>>();
  private templates = new Map<string, NotificationTemplate>();
  private preferences = new Map<string, NotificationPreferences>();
  private devices = new Map<string, Set<string>>();

  private getUserSet(userId: string): Set<string> {
    if (!this.userMap.has(userId)) {
      this.userMap.set(userId, new Set());
    }
    return this.userMap.get(userId)!;
  }

  async createNotification(userId: string, payload: NotificationPayload): Promise<NotificationResult> {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId,
      channel: payload.channel,
      title: payload.title,
      message: payload.message,
      actionUrl: payload.actionUrl,
      actionLabel: payload.actionLabel,
      priority: payload.priority ?? NotificationPriority.DEFAULT,
      category: payload.category ?? NotificationCategory.SYSTEM,
      status: NotificationStatus.SENT,
      isRead: false,
      createdAt: new Date().toISOString(),
      data: payload.data,
    };
    this.notifications.set(id, notification);
    this.getUserSet(userId).add(id);
    return { success: true, notificationId: id };
  }

  async createBulkNotifications(userIds: string[], payload: NotificationPayload) {
    const results = [] as { userId: string; notificationId?: string; error?: string }[];
    for (const uid of userIds) {
      const res = await this.createNotification(uid, payload);
      results.push({ userId: uid, notificationId: res.notificationId, error: res.error });
    }
    return { success: results.every(r => !r.error), results };
  }

  async scheduleNotification(userId: string, payload: NotificationPayload, scheduledTime: string | Date): Promise<NotificationResult> {
    const res = await this.createNotification(userId, payload);
    if (res.notificationId) {
      const n = this.notifications.get(res.notificationId)!;
      n.status = NotificationStatus.SCHEDULED;
      n.scheduledFor = typeof scheduledTime === 'string' ? scheduledTime : scheduledTime.toISOString();
      this.notifications.set(n.id, n);
    }
    return res;
  }

  async getNotification(id: string): Promise<Notification | null> {
    return this.notifications.get(id) || null;
  }

  async cancelScheduledNotification(id: string): Promise<{ success: boolean; error?: string }> {
    const n = this.notifications.get(id);
    if (!n) return { success: false, error: 'Not found' };
    if (n.status !== NotificationStatus.SCHEDULED) {
      return { success: false, error: 'Not scheduled' };
    }
    n.status = NotificationStatus.CANCELLED;
    this.notifications.set(id, n);
    return { success: true };
  }

  async createTemplate(template: NotificationTemplate): Promise<{ success: boolean; templateId?: string; error?: string }> {
    const id = template.id || randomUUID();
    this.templates.set(id, { ...template, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return { success: true, templateId: id };
  }

  async updateTemplate(templateId: string, update: Partial<NotificationTemplate>): Promise<{ success: boolean; template?: NotificationTemplate; error?: string }> {
    const existing = this.templates.get(templateId);
    if (!existing) return { success: false, error: 'Template not found' };
    const updated = { ...existing, ...update, id: templateId, updatedAt: new Date().toISOString() };
    this.templates.set(templateId, updated);
    return { success: true, template: updated };
  }

  async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    const existed = this.templates.delete(templateId);
    return { success: existed, error: existed ? undefined : 'Template not found' };
  }

  async listTemplates(query?: NotificationTemplateQuery): Promise<NotificationTemplateList> {
    const templates = Array.from(this.templates.values());
    const page = query?.page ?? 1;
    const limit = query?.limit ?? templates.length;
    const start = (page - 1) * limit;
    const items = templates.slice(start, start + limit);
    return {
      templates: items,
      total: templates.length,
      page,
      limit,
      totalPages: Math.ceil(templates.length / limit),
    };
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async sendTemplatedNotification(userId: string, templateId: string, data: Record<string, any>): Promise<NotificationResult> {
    const template = this.templates.get(templateId);
    if (!template) return { success: false, error: 'Template not found' };
    const payload: NotificationPayload = {
      channel: template.channel,
      title: applyTemplate(template.titleTemplate, data),
      message: applyTemplate(template.messageTemplate, data),
      actionUrl: template.actionUrlTemplate ? applyTemplate(template.actionUrlTemplate, data) : undefined,
      actionLabel: template.actionLabelTemplate ? applyTemplate(template.actionLabelTemplate, data) : undefined,
      priority: template.priority,
      category: template.category,
      data,
    };
    return this.createNotification(userId, payload);
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    if (!this.preferences.has(userId)) {
      this.preferences.set(userId, defaultPreferences());
    }
    return this.preferences.get(userId)!;
  }

  async updateUserPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...prefs, categories: { ...current.categories, ...(prefs.categories || {}) } };
    this.preferences.set(userId, updated);
    return updated;
  }

  async getUserNotifications(userId: string, filter: NotificationFilter = {}): Promise<NotificationBatch> {
    const ids = Array.from(this.getUserSet(userId));
    let items = ids.map(id => this.notifications.get(id)!).filter(Boolean);
    if (filter.channel) items = items.filter(n => n.channel === filter.channel);
    if (filter.category) items = items.filter(n => n.category === filter.category);
    if (typeof filter.isRead === 'boolean') items = items.filter(n => n.isRead === filter.isRead);
    if (filter.status) items = items.filter(n => n.status === filter.status);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    return {
      notifications: paged,
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit),
      unreadCount: items.filter(n => !n.isRead).length,
    };
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    const n = this.notifications.get(notificationId);
    if (!n) return { success: false, error: 'Not found' };
    n.isRead = true;
    n.readAt = new Date().toISOString();
    this.notifications.set(notificationId, n);
    return { success: true };
  }

  async markAllAsRead(userId: string, filter: NotificationFilter = {}): Promise<{ success: boolean; count?: number; error?: string }> {
    const batch = await this.getUserNotifications(userId, filter);
    batch.notifications.forEach(n => {
      n.isRead = true;
      n.readAt = new Date().toISOString();
      this.notifications.set(n.id, n);
    });
    return { success: true, count: batch.notifications.length };
  }

  async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    const notif = this.notifications.get(notificationId);
    if (!notif) return { success: false, error: 'Not found' };
    this.notifications.delete(notificationId);
    const set = this.userMap.get(notif.userId);
    if (set) set.delete(notificationId);
    return { success: true };
  }

  async getDeliveryStatus(notificationId: string): Promise<NotificationDeliveryStatus> {
    const notif = this.notifications.get(notificationId);
    if (!notif) {
      return { notificationId, status: NotificationStatus.FAILED, createdAt: new Date().toISOString() };
    }
    return {
      notificationId,
      status: notif.status,
      createdAt: notif.createdAt,
      sentAt: notif.sentAt,
      deliveredAt: notif.deliveredAt,
      readAt: notif.readAt,
      // error, attempts, nextRetry are not in Notification interface
    };
  }

  async registerDevice(userId: string, deviceToken: string): Promise<{ success: boolean; error?: string }> {
    if (!this.devices.has(userId)) this.devices.set(userId, new Set());
    this.devices.get(userId)!.add(deviceToken);
    return { success: true };
  }

  async unregisterDevice(userId: string, deviceToken: string): Promise<{ success: boolean; error?: string }> {
    const set = this.devices.get(userId);
    if (!set) return { success: false, error: 'Device not registered' };
    const res = set.delete(deviceToken);
    return { success: res, error: res ? undefined : 'Device not registered' };
  }

  async isChannelEnabled(userId: string, channel: NotificationChannel): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId);
    switch (channel) {
      case NotificationChannel.EMAIL:
        return prefs.email;
      case NotificationChannel.PUSH:
        return prefs.push;
      case NotificationChannel.SMS:
        return prefs.sms;
      case NotificationChannel.IN_APP:
        return prefs.inApp;
      case NotificationChannel.MARKETING:
        return prefs.marketing;
      default:
        return false;
    }
  }
}

export default InMemoryNotificationProvider;
