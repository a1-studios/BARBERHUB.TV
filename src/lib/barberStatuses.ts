export type BarberStatus = 'licensed' | 'unlicensed' | 'student' | 'beginner' | 'aspiring';

export const BARBER_STATUSES: { id: BarberStatus; label: string; desc: string; aspiring?: boolean }[] = [
  { id: 'licensed',   label: 'Licensed Pro',   desc: 'Active license' },
  { id: 'unlicensed', label: 'Unlicensed Pro', desc: 'Cuts professionally' },
  { id: 'student',    label: 'Student',        desc: 'In barber school' },
  { id: 'beginner',   label: 'Beginner',       desc: 'Just getting started' },
  { id: 'aspiring',   label: 'Aspiring',       desc: 'Thinking about it', aspiring: true },
];

/** Map onboarding barber_status enum -> profiles.sub_category for aggregate stats. */
export const STATUS_TO_SUB_CATEGORY: Record<BarberStatus, string> = {
  licensed: 'licensed_pro',
  unlicensed: 'unlicensed_pro',
  student: 'student',
  beginner: 'beginner',
  aspiring: 'aspiring',
};
