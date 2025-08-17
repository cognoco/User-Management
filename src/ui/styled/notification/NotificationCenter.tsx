import React, { useState } from 'react';
import { Bell, Check, RefreshCw, Info, ShieldAlert, Settings, MessageSquare, KeyRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/primitives/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Button } from '@/ui/primitives/button';
import { Badge } from '@/ui/primitives/badge';
import { ScrollArea } from '@/ui/primitives/scroll-area';
import { Separator } from '@/ui/primitives/separator';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { NotificationCenter as HeadlessNotificationCenter } from '@/ui/headless/notification/NotificationCenter';
import type { Notification } from '@/core/notification/models';

const getIconForCategory = (category: string): React.ReactElement => {
  switch (category) {
    case 'sso':
      return <KeyRound className="h-4 w-4 text-indigo-500" />;
    case 'security':
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    case 'system':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'account':
      return <Settings className="h-4 w-4 text-yellow-500" />;
    case 'activity':
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

const NotificationItem: React.FC<{ notification: Notification; onMarkAsRead: (id: string) => void; }> = ({ notification, onMarkAsRead }) => {
  const formattedDate = formatDistanceToNow(new Date(notification.createdAt || notification.created_at), { addSuffix: true });
  return (
    <div className={`p-3 hover:bg-gray-50 transition-colors ${notification.isRead ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5">
            {getIconForCategory((notification as unknown as { category: string }).category)}
          </div>
          <div>
            <p className={`text-sm font-medium ${notification.isRead ? '' : 'font-semibold'}`}>{notification.title}</p>
            <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
            {(notification as unknown as { action?: { url?: string; label?: string } }).action && (
              <div className="mt-2">
                {(notification as unknown as { action: { url?: string; label?: string } }).action.url ? (
                  <Link href={(notification as unknown as { action: { url: string } }).action.url}>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-500">
                      {(notification as unknown as { action: { label: string } }).action.label}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-500">
                    {(notification as any).action.label}
                  </Button>
                )}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1">{formattedDate}</p>
          </div>
        </div>
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
            <span className="sr-only">Mark as read</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HeadlessNotificationCenter
      render={({ notifications, isLoading, unreadCount, activeTab, setActiveTab, markAsRead, markAllAsRead, fetchNotifications }) => {
        const filtered = activeTab === 'all'
          ? notifications
          : activeTab === 'unread'
            ? notifications.filter(n => !n.isRead)
            : activeTab === 'security'
              ? notifications.filter(n => (n as any).category === 'security')
              : activeTab === 'account'
                ? notifications.filter(n => (n as any).category === 'account')
                : activeTab === 'sso'
                  ? notifications.filter(n => (n as any).category === 'sso')
                  : notifications;

        return (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between p-3 border-b">
                <h2 className="font-semibold text-sm">Notifications</h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchNotifications} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="sr-only">Refresh</span>
                  </Button>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                      Mark all as read
                    </Button>
                  )}
                </div>
              </div>
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex justify-start p-1 w-full h-10 bg-muted/5">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
                  <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
                  <TabsTrigger value="account" className="text-xs">Account</TabsTrigger>
                  <TabsTrigger value="sso" className="text-xs">SSO Events</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab} className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <Bell className="h-8 w-8 mb-2 text-muted-foreground/50" />
                        <p className="text-sm">No notifications</p>
                        <p className="text-xs mb-3">You&apos;re all caught up!</p>
                        <Link href="/settings/notifications">
                          <Button variant="link" size="sm" className="text-xs">
                            Update notification settings
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <>
                        {filtered.map((notification) => (
                          <React.Fragment key={notification.id}>
                            <NotificationItem notification={notification} onMarkAsRead={markAsRead} />
                            <Separator />
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              <div className="p-2 border-t text-center">
                <Link href="/settings/notifications">
                  <Button variant="ghost" size="sm" className="text-xs w-full">
                    Manage notification settings
                  </Button>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
};

export default NotificationCenter;
