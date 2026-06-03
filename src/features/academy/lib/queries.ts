import { supabase } from '@/integrations/supabase/client';

export type AcademyCategory = 'Technique' | 'Business' | 'Colour' | 'Design' | 'LiveOps' | 'Mindset';

export const ACADEMY_CATEGORIES: AcademyCategory[] = [
  'Technique', 'Business', 'Colour', 'Design', 'LiveOps', 'Mindset',
];

export interface AcademyCourse {
  id: string;
  educator_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  price_bb: number | null;
  xp_required: number | null;
  tier_required: string | null;
  total_lessons: number | null;
  total_xp: number | null;
  is_published: boolean | null;
  is_featured: boolean | null;
}

export interface AcademyLesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  cloudflare_stream_uid: string | null;
  r2_video_key: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  xp_reward: number | null;
  is_free_preview: boolean | null;
}

export interface AcademyProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed: boolean | null;
  progress_pct: number | null;
  xp_earned: number | null;
  completed_at: string | null;
}

export async function fetchCourses(category?: string) {
  let q = supabase
    .from('academy_courses')
    .select('*')
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true });
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as AcademyCourse[];
}

export async function fetchFeaturedCourses() {
  const { data, error } = await supabase
    .from('academy_courses')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(4);
  if (error) throw error;
  return (data || []) as AcademyCourse[];
}

export async function fetchCourse(courseId: string) {
  const { data, error } = await supabase
    .from('academy_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();
  if (error) throw error;
  return data as AcademyCourse | null;
}

export async function fetchLessons(courseId: string) {
  const { data, error } = await supabase
    .from('academy_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as AcademyLesson[];
}

export async function fetchLesson(lessonId: string) {
  const { data, error } = await supabase
    .from('academy_lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return data as AcademyLesson | null;
}

export async function fetchCourseProgress(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from('academy_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (error) throw error;
  return (data || []) as AcademyProgress[];
}

export async function fetchEducatorName(educatorId: string) {
  const [{ data: barber }, { data: profile }] = await Promise.all([
    supabase.from('barber_profiles').select('name').eq('user_id', educatorId).maybeSingle(),
    supabase.from('profiles').select('display_name, avatar_url').eq('user_id', educatorId).maybeSingle(),
  ]);
  return {
    name: (barber as any)?.name || (profile as any)?.display_name || 'Educator',
    avatar_url: (profile as any)?.avatar_url || null,
  };
}

export async function fetchUserXp(userId: string): Promise<{ xp_total: number; xp_level: number }> {
  const { data } = await supabase
    .from('barber_profiles')
    .select('xp_total, xp_level')
    .eq('user_id', userId)
    .maybeSingle();
  return {
    xp_total: (data as any)?.xp_total ?? 0,
    xp_level: (data as any)?.xp_level ?? 1,
  };
}

/** XP needed for next level. Linear curve: level * 500. */
export function xpForLevel(level: number) {
  return level * 500;
}
