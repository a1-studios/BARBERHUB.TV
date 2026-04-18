import { useState, useRef, useEffect } from 'react';
import { Bell, Calendar, Swords, CheckCheck, X, Clock, Ban, AlertTriangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { AcceptChallengeModal } from '@/components/battles/AcceptChallengeModal';
import { supabase } from '@/integrations/supabase/client';

const notificationIconMap: Record<string, React.ReactNode> = {
  new_appointment: <Calendar className="h-4 w-4 text-primary" />,
  appointment_accepted: <CheckCheck className="h-4 w-4 text-green-500" />,
  appointment_confirmed: <CheckCheck className="h-4 w-4 text-green-500" />,
  appointment_denied: <Ban className="h-4 w-4 text-destructive" />,
  appointment_declined: <Ban className="h-4 w-4 text-destructive" />,
  appointment_completed: <CheckCheck className="h-4 w-4 text-cyan" />,
  appointment_cancelled: <X className="h-4 w-4 text-muted-foreground" />,
  no_show: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  battle_invite: <Swords className="h-4 w-4 text-primary" />,
  battle_result: <Swords className="h-4 w-4 text-cyan" />,
  challenge_received: <Swords className="h-4 w-4 text-primary" />,
  challenge_accepted: <Swords className="h-4 w-4 text-primary" />,
  review_prompt: <Star className="h-4 w-4 text-yellow-500" />,
};

function getIcon(type: string) {
  return notificationIconMap[type] ?? <Bell className="h-4 w-4 text-muted-foreground" />;
}

interface NotificationPanelProps {
  embedded?: boolean;
  onClose?: () => void;
}

export function NotificationPanel({ embedded, onClose }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [acceptChallenge, setAcceptChallenge] = useState<any | null>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications();

  // Standalone mode: own open/close with outside click
  useEffect(() => {
    if (embedded) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', esc);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open, embedded]);

  const closeSelf = () => {
    if (embedded && onClose) onClose();
    if (!embedded) setOpen(false);
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) markAsRead(n.id);

    // Direct challenge → load full challenge row + open Accept modal
    if (n.type === 'challenge_received' && n.data?.challenge_id) {
      const { data: ch } = await supabase
        .from('open_challenges')
        .select('id, challenger_username, title, stake_amount, pot_total, expires_at')
        .eq('id', n.data.challenge_id)
        .maybeSingle();
      if (ch) {
        setAcceptChallenge(ch);
        closeSelf();
        return;
      }
    }

    // Challenge accepted → jump straight into the split-screen contender room
    if (n.type === 'challenge_accepted' && n.data?.battle_id) {
      navigate(`/battle/${n.data.battle_id}/contender`);
      closeSelf();
      return;
    }

    if (n.data?.battle_id) {
      navigate(`/battles/${n.data.battle_id}`);
    } else if (n.data?.appointment_id) {
      const reviewTypes = ['appointment_completed', 'review_prompt'];
      const action = reviewTypes.includes(n.type) ? '&action=review' : '';
      navigate(`/profile?appointment_id=${n.data.appointment_id}${action}`);
    }
    closeSelf();
  };

  const renderList = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-primary/5">
        <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-muted-foreground hover:text-foreground"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <ScrollArea className="max-h-[320px]">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                !n.read && 'bg-primary/5'
              )}
            >
              <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-tight', !n.read ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />}
            </button>
          ))
        )}
      </ScrollArea>
    </>
  );

  const challengeModal = acceptChallenge ? (
    <AcceptChallengeModal
      challenge={acceptChallenge}
      isOpen={!!acceptChallenge}
      onClose={() => setAcceptChallenge(null)}
    />
  ) : null;

  // Embedded mode: just render the list directly
  if (embedded) {
    return (
      <>
        {renderList()}
        {challengeModal}
      </>
    );
  }

  // Standalone mode (fallback, not used in current header)
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-primary/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-scale-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-scale-in">
          {renderList()}
        </div>
      )}
      {challengeModal}
    </div>
  );
}
