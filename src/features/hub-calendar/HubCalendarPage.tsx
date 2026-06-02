import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { BottomNavBar } from '@/components/BottomNavBar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FEATURES } from '@/config/features';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { EventFilterPills } from './components/EventFilterPills';
import { ViewToggle } from './components/ViewToggle';
import { DayView } from './components/DayView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { EventDetailsSheet } from './components/EventDetailsSheet';
import type { CalendarEvent, CalendarView } from './types';

function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

export default function HubCalendarPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as CalendarView) || 'week';
  const filter = params.get('filter') || 'all';
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!FEATURES.HUB_CALENDAR_ENABLED) navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const { from, to, title } = useMemo(() => {
    if (view === 'day') {
      const s = new Date(cursor); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(e.getDate() + 1);
      return { from: s, to: e, title: s.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) };
    }
    if (view === 'week') {
      const s = startOfWeek(cursor);
      const e = new Date(s); e.setDate(e.getDate() + 7);
      return { from: s, to: e, title: `Week of ${s.toLocaleDateString([], { month: 'short', day: 'numeric' })}` };
    }
    const s = startOfMonth(cursor);
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
    return { from: s, to: e, title: s.toLocaleDateString([], { month: 'long', year: 'numeric' }) };
  }, [cursor, view]);

  const { data: events = [], isLoading } = useCalendarEvents(from, to);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.event_type === filter)),
    [events, filter],
  );

  const shift = (delta: number) => {
    const next = new Date(cursor);
    if (view === 'day') next.setDate(next.getDate() + delta);
    else if (view === 'week') next.setDate(next.getDate() + 7 * delta);
    else next.setMonth(next.getMonth() + delta);
    setCursor(next);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <ViewToggle
            view={view}
            onChange={(v) => { params.set('view', v); setParams(params, { replace: true }); }}
          />
        </div>

        <EventFilterPills
          active={filter}
          onChange={(id) => { params.set('filter', id); setParams(params, { replace: true }); }}
        />

        <div className="flex items-center justify-between my-3">
          <Button size="icon" variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="text-sm font-semibold tracking-wide">{title}</div>
          <Button size="icon" variant="ghost" onClick={() => shift(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : view === 'day' ? (
          <DayView date={cursor} events={filtered} onEventClick={setSelected} />
        ) : view === 'week' ? (
          <WeekView weekStart={startOfWeek(cursor)} events={filtered} onEventClick={setSelected} />
        ) : (
          <MonthView monthStart={startOfMonth(cursor)} events={filtered} onEventClick={setSelected} />
        )}
      </main>

      <EventDetailsSheet event={selected} onClose={() => setSelected(null)} />
      <BottomNavBar />
    </div>
  );
}
