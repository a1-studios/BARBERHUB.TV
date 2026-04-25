import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

export type GateStep =
  | 'INITIAL'
  | 'IDENTIFY'
  | 'ENGAGE'
  | 'REWARD'
  | 'FINALIZE'
  | 'SUCCESS';

export interface GateState {
  step: GateStep;
  email: string;
  role: 'barber' | 'fan' | null;
  prizeId: string | null;
  prizeLabel: string | null;
  prizeBb: number;
  prizeColor: string | null;
  prizeType: string | null;
  durationMonths: number;
  fingerprint: string;
  ts: number;
}

const STORAGE_KEY = 'gate_state';
const COMPLETED_KEY = 'gate_completed';
const STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const defaultState = (): GateState => ({
  step: 'INITIAL',
  email: '',
  role: null,
  prizeId: null,
  prizeLabel: null,
  prizeBb: 0,
  prizeColor: null,
  prizeType: null,
  durationMonths: 0,
  fingerprint: getDeviceFingerprint(),
  ts: Date.now(),
});

const loadState = (): GateState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as GateState;
    if (Date.now() - (parsed.ts || 0) > STATE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return defaultState();
    }
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
};

export const isGateCompleted = (): boolean =>
  localStorage.getItem(COMPLETED_KEY) === '1';

export const markGateCompleted = (): void => {
  localStorage.setItem(COMPLETED_KEY, '1');
  localStorage.removeItem(STORAGE_KEY);
  // Best-effort server-side record so the same fingerprint/IP doesn't see the gate again.
  try {
    const fingerprint = getDeviceFingerprint();
    void supabase.functions.invoke('check-gate-eligibility', {
      body: { action: 'mark_completed', fingerprint },
    });
  } catch {
    /* ignore */
  }
};

export function useGateState() {
  const [state, setState] = useState<GateState>(() => loadState());

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, ts: Date.now() })
      );
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  const update = useCallback((patch: Partial<GateState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState());
  }, []);

  /**
   * Incremental lead capture.
   * - On INITIAL: insert {email, fingerprint}
   * - On IDENTIFY: update {role}
   * - On ENGAGE done: update {prize_id, prize_label, spins_used}
   * - On FINALIZE: update {converted: true}
   */
  const handleLeadUpdate = useCallback(
    async (
      phase: 'email' | 'role' | 'prize' | 'converted',
      payload: Partial<GateState> & { converted?: boolean }
    ) => {
      try {
        const email = (payload.email || state.email).trim().toLowerCase();
        const fingerprint = state.fingerprint;
        const role = payload.role || state.role || 'fan';

        if (phase === 'email' || phase === 'role') {
          // Upsert by email so role updates land on the same row
          await supabase
            .from('marketing_leads')
            .upsert(
              {
                email,
                role,
                device_fingerprint: fingerprint,
              },
              { onConflict: 'email' }
            );
          return;
        }

        if (phase === 'prize') {
          await supabase.rpc('update_marketing_lead_by_fingerprint', {
            p_fingerprint: fingerprint,
            p_prize_id: payload.prizeId || state.prizeId || undefined,
            p_prize_label: payload.prizeLabel || state.prizeLabel || undefined,
            p_spins_used: 1,
          });
          return;
        }

        if (phase === 'converted') {
          await supabase.rpc('update_marketing_lead_by_fingerprint', {
            p_fingerprint: fingerprint,
            p_converted: true,
          });
        }
      } catch (err) {
        // Lead capture is best-effort — never block the user flow
        console.warn('[GateState] Lead update failed:', err);
      }
    },
    [state.email, state.fingerprint, state.role, state.prizeId, state.prizeLabel]
  );

  return { state, update, reset, handleLeadUpdate };
}
