import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
  dismissed_at?: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications (active only — hide soft-dismissed entries like accepted/declined challenges)
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id
  });

  // Update unread count
  useEffect(() => {
    if (notifications) {
      const count = notifications.filter(n => !n.read).length;
      setUnreadCount(count);
    }
  }, [notifications]);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('All notifications marked as read');
    }
  });

  // Real-time subscription — listen to BOTH inserts (new) and updates (dismissals)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Skip toast for already-dismissed inserts (defensive)
          if (newNotification.dismissed_at) {
            queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
            return;
          }

          const reviewTypes = ['appointment_completed', 'review_prompt'];

          // Type-aware action target — DO NOT auto-route challenge_received into the battle room
          let actionTarget: string | null = null;
          let actionLabel = 'View';
          let onClickOverride: (() => void) | null = null;

          if (newNotification.type === 'challenge_received') {
            // Suppress the toast — the global IncomingChallengeOverlay is the
            // single source of truth for this notification type. Just refresh
            // the bell so the unread count is accurate.
            queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
            return;
          } else if (newNotification.type === 'challenge_accepted' && newNotification.data?.battle_id) {
            actionTarget = `/battle/${newNotification.data.battle_id}/contender`;
          } else if (newNotification.data?.battle_id) {
            actionTarget = `/battles/${newNotification.data.battle_id}`;
          } else if (newNotification.data?.appointment_id) {
            actionTarget = `/profile?appointment_id=${newNotification.data.appointment_id}${reviewTypes.includes(newNotification.type) ? '&action=review' : ''}`;
          }

          toast(newNotification.title, {
            description: newNotification.message,
            action: (onClickOverride || actionTarget) ? {
              label: actionLabel,
              onClick: () => {
                if (onClickOverride) onClickOverride();
                else if (actionTarget) window.location.href = actionTarget;
              }
            } : undefined
          });

          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Dismissals / read-state changes — refresh silently so bell clears across tabs
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending
  };
};
