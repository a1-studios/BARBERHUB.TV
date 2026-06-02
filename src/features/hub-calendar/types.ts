export type CalendarEventType =
  | 'appointment'
  | 'house_call'
  | 'sos'
  | 'chair_swap'
  | 'bounty';

export interface CalendarEvent {
  event_id: string;
  event_type: CalendarEventType | string;
  title: string;
  counterparty_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  metadata: Record<string, any>;
}

export type CalendarView = 'day' | 'week' | 'month';

export const EVENT_TYPE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  appointment: {
    label: 'Appointments',
    color: 'text-primary',
    bg: 'bg-primary/15',
    border: 'border-primary/40',
  },
  chair_swap: {
    label: 'Chair Swap',
    color: 'text-[hsl(187,80%,55%)]',
    bg: 'bg-[hsl(187,80%,40%)]/15',
    border: 'border-[hsl(187,80%,40%)]/40',
  },
  bounty: {
    label: 'Bounties',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/40',
  },
  house_call: {
    label: 'House Calls',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
  },
  sos: {
    label: 'SOS',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/40',
  },
};

export const FILTER_PILLS: { id: 'all' | CalendarEventType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'chair_swap', label: 'Chair Swap' },
  { id: 'bounty', label: 'Bounties' },
  { id: 'house_call', label: 'House Calls' },
  { id: 'sos', label: 'SOS' },
];
