import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSponsorAds } from "@/hooks/useSponsorAds";
import { ArrowLeft, Play, GraduationCap, Flame, Volume2, VolumeX, Heart, Share2, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import SplitScreenBattle from "@/components/battles/SplitScreenBattle";
import { parseSpecialties, getSpecialtyDisplay } from "@/config/specialtyTags";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DonationModal } from "@/components/DonationModal";
import { useUserRole } from "@/hooks/useUserRole";
import { CloudflareStreamPlayer } from "@/components/CloudflareStreamPlayer";

interface FeedItem {
  type: "video" | "sponsor" | "educator" | "platform" | "battle";
  id: string;
  media_url?: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  barber_name?: string;
  creator_avatar?: string;
  specialty?: string | null;
  name?: string;
  message?: string;
  logo_url?: string | null;
  link?: string | null;
  battle_id?: string;
  barber1_video?: string;
  barber2_video?: string;
  barber1_name?: string;
  barber1_location?: string;
  barber2_name?: string;
  barber2_location?: string;
  barber_user_id?: string;
  cloudflare_stream_uid?: string | null;
}

const PLATFORM_PROMOS: FeedItem[] = [
  {
    type: "platform",
    id: "platform-promo-1",
    media_url: "/videos/promo-hero.mp4",
    title: "The Arena Awaits",
    barber_name: "Barber Battles Official",
  },
];

const WatchFeed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetVideoBarber = searchParams.get('video');
  const { isFan } = useUserRole();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [donationTarget, setDonationTarget] = useState<{ userId: string; name: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // 1. Barber profile featured videos
  const { data: profileVideos = [] } = useQuery({
    queryKey: ["watch-feed-profile-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_barber_profiles")
        .select("barber_id, barber_name, display_name, featured_video_id, avatar_url, country_code, user_id")
        .not("featured_video_id", "is", null)
        .order("barber_updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      const filtered = (data || []).filter((b) => b.featured_video_id && b.featured_video_id.startsWith("http"));
      const barberIds = filtered.map((b) => b.barber_id).filter(Boolean) as string[];
      let specMap: Record<string, string | null> = {};
      if (barberIds.length > 0) {
        const { data: bps } = await supabase.from("barber_profiles").select("id, specialty").in("id", barberIds);
        bps?.forEach((p) => { specMap[p.id] = p.specialty; });
      }
      return filtered.map((b) => ({
        type: "video" as const,
        id: `profile-${b.barber_id}`,
        media_url: b.featured_video_id!,
        barber_name: b.display_name || b.barber_name || "Barber",
        creator_avatar: b.avatar_url,
        specialty: specMap[b.barber_id] ?? null,
        barber_user_id: b.user_id,
      }));
    },
  });

  // 2. Creator content
  const { data: creatorVideos = [] } = useQuery({
    queryKey: ["watch-feed-creator-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_content")
        .select("id, title, description, media_url, thumbnail_url, content_type, creator_id, created_at")
        .eq("status", "published")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || [])
        .filter((c) => c.media_url && c.media_url.startsWith("http"))
        .map((c) => ({
          type: (c.content_type === "course_teaser" ? "educator" : "video") as "educator" | "video",
          id: `creator-${c.id}`,
          media_url: c.media_url!,
          title: c.title,
          description: c.description,
          thumbnail_url: c.thumbnail_url,
          barber_name: "Creator",
          specialty: null,
          barber_user_id: c.creator_id,
        }));
    },
  });

  // 3. Creations (portfolio uploads)
  const { data: creationVideos = [] } = useQuery({
    queryKey: ["watch-feed-creations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creations")
        .select("id, title, description, media_url, thumbnail_url, barber_id, created_at")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      const barberIds = [...new Set((data || []).map((c) => c.barber_id).filter(Boolean))] as string[];
      let barberMap: Record<string, { name: string; specialty: string | null; user_id: string }> = {};
      if (barberIds.length > 0) {
        const { data: profiles } = await supabase
          .from("barber_profiles")
          .select("id, name, specialty, user_id")
          .in("id", barberIds);
        profiles?.forEach((p) => {
          barberMap[p.id] = { name: p.name || "Barber", specialty: p.specialty, user_id: p.user_id };
        });
      }

      return (data || [])
        .filter((c) => c.media_url?.startsWith("http"))
        .map((c) => ({
          type: "video" as const,
          id: `creation-${c.id}`,
          media_url: c.media_url,
          title: c.title,
          description: c.description,
          thumbnail_url: c.thumbnail_url,
          barber_name: barberMap[c.barber_id]?.name || "Barber",
          specialty: barberMap[c.barber_id]?.specialty ?? null,
          barber_user_id: barberMap[c.barber_id]?.user_id,
        }));
    },
  });

  // 4. Battle submissions
  const { data: submissionVideos = [] } = useQuery({
    queryKey: ["watch-feed-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("battle_submissions")
        .select("id, title, description, media_url, thumbnail_url, user_id, created_at")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || [])
        .filter((s) => s.media_url?.startsWith("http"))
        .map((s) => ({
          type: "video" as const,
          id: `submission-${s.id}`,
          media_url: s.media_url,
          title: s.title,
          description: s.description,
          thumbnail_url: s.thumbnail_url,
          barber_name: "Competitor",
          specialty: null,
          barber_user_id: s.user_id,
        }));
    },
  });

  // 5. VS Battles (split-screen)
  const { data: battleItems = [] } = useQuery({
    queryKey: ["watch-feed-battles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("battles")
        .select("id, barber_1_video_url, barber_2_video_url, barber1_id, barber2_id, title, category")
        .not("barber_1_video_url", "is", null)
        .not("barber_2_video_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const barberProfileIds = [...new Set(data.flatMap((b) => [b.barber1_id, b.barber2_id].filter(Boolean)))] as string[];
      let profileMap: Record<string, { name: string; location: string }> = {};
      if (barberProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("barber_profiles")
          .select("id, name, location, country_code")
          .in("id", barberProfileIds);
        profiles?.forEach((p) => {
          profileMap[p.id] = { name: p.name || "Barber", location: p.location || p.country_code || "" };
        });
      }

      return data
        .filter((b) => b.barber_1_video_url?.startsWith("http") && b.barber_2_video_url?.startsWith("http"))
        .map((b) => ({
          type: "battle" as const,
          id: `battle-${b.id}`,
          battle_id: b.id,
          title: b.title,
          barber1_video: b.barber_1_video_url!,
          barber2_video: b.barber_2_video_url!,
          barber1_name: profileMap[b.barber1_id!]?.name || "Barber 1",
          barber1_location: profileMap[b.barber1_id!]?.location || "",
          barber2_name: profileMap[b.barber2_id!]?.name || "Barber 2",
          barber2_location: profileMap[b.barber2_id!]?.location || "",
        }));
    },
  });

  // 6. Sponsors
  const { data: sponsors = [] } = useSponsorAds(true);

  // ─── Build unified feed ───
  const allContent: FeedItem[] = [...profileVideos, ...creatorVideos, ...creationVideos, ...submissionVideos]
    .filter(item => !(isFan && item.type === 'educator'));

  const feed: FeedItem[] = [];
  let sponsorIdx = 0;
  let battleIdx = 0;
  let platformIdx = 0;

  const contentPool = allContent.length > 0 ? allContent : Array.from({ length: 8 }, (_, i) => ({
    ...PLATFORM_PROMOS[0],
    id: `platform-fill-${i}`,
    type: "platform" as const,
  }));

  let contentIdx = 0;
  let loopPass = 0;
  while (feed.length < Math.max(20, contentPool.length + 10)) {
    const item = contentPool[contentIdx % contentPool.length];
    feed.push({ ...item, id: loopPass > 0 ? `${item.id}-loop-${loopPass}` : item.id });
    contentIdx++;

    if (contentIdx % 3 === 0 && sponsors.length > 0) {
      const sponsor = sponsors[sponsorIdx % sponsors.length];
      feed.push({
        type: "sponsor",
        id: `sponsor-${sponsor.id}-${sponsorIdx}`,
        name: sponsor.name,
        message: sponsor.message,
        logo_url: sponsor.logo_url,
        link: sponsor.link,
      });
      sponsorIdx++;
    }

    if (contentIdx % 6 === 0 && battleItems.length > 0) {
      feed.push({ ...battleItems[battleIdx % battleItems.length], id: `battle-feed-${battleIdx}` });
      battleIdx++;
    }

    if (allContent.length > 0 && contentIdx % 8 === 0) {
      feed.push({ ...PLATFORM_PROMOS[platformIdx % PLATFORM_PROMOS.length], id: `platform-${platformIdx}` });
      platformIdx++;
    }

    if (contentIdx % contentPool.length === 0) loopPass++;
    if (loopPass > 3) break;
  }

  // If ?video= param is set, find the matching feed item and jump to it
  const [hasJumped, setHasJumped] = useState(false);
  useEffect(() => {
    if (targetVideoBarber && feed.length > 0 && !hasJumped) {
      const decodedTarget = decodeURIComponent(targetVideoBarber);
      const idx = feed.findIndex(f => f.media_url === decodedTarget);
      if (idx >= 0) {
        setActiveIndex(idx);
        setHasJumped(true);
        // Scroll to the item
        setTimeout(() => {
          const container = containerRef.current;
          if (container) {
            const target = container.querySelector(`[data-index="${idx}"]`);
            target?.scrollIntoView({ behavior: 'instant' });
          }
        }, 100);
      }
    }
  }, [targetVideoBarber, feed.length, hasJumped]);

  // Snap scrolling observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [feed.length]);

  // Auto-play/pause videos + sync muted state
  useEffect(() => {
    videoRefs.current.forEach((video, key) => {
      const idx = feed.findIndex((f) => f.id === key);
      video.muted = isMuted;
      if (idx === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex, feed.length, isMuted]);

  const renderSpecialtyPills = (specialty: string | null | undefined) => {
    if (!specialty) return null;
    const ids = parseSpecialties(specialty);
    if (ids.length === 0) return null;
    return (
      <div className="flex gap-1.5 flex-wrap mt-1">
        {ids.map((id) => {
          const tag = getSpecialtyDisplay(id);
          if (!tag) return null;
          return (
            <span
              key={id}
              className="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-[10px] text-white/90 border border-white/10"
            >
              {tag.emoji} {tag.label}
            </span>
          );
        })}
      </div>
    );
  };

  const handleShare = async (item: FeedItem) => {
    const url = window.location.origin + "/watch";
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title || item.barber_name || "Check this out", url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const renderActionStack = (item: FeedItem) => {
    if (item.type === "sponsor" || item.type === "battle") return null;
    return (
      <div className="absolute right-3 bottom-28 flex flex-col gap-5 items-center z-30">
        {/* Creator avatar → profile */}
        <button
          onClick={() => item.barber_user_id && navigate(`/barber/${item.barber_user_id}`)}
          className="drop-shadow-lg"
        >
          <Avatar className="h-10 w-10 border-2 border-white/80">
            {item.creator_avatar ? (
              <AvatarImage src={item.creator_avatar} />
            ) : null}
            <AvatarFallback className="bg-black/40 text-white text-xs">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Donate */}
        <button
          onClick={() => item.barber_user_id && setDonationTarget({ userId: item.barber_user_id, name: item.barber_name || "Barber" })}
          className="text-white drop-shadow-lg active:scale-90 transition-transform"
        >
          <Heart className="w-7 h-7" />
        </button>

        {/* Share */}
        <button
          onClick={() => handleShare(item)}
          className="text-white drop-shadow-lg active:scale-90 transition-transform"
        >
          <Share2 className="w-6 h-6" />
        </button>

        {/* Mute toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-white drop-shadow-lg active:scale-90 transition-transform"
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>
    );
  };

  const renderVideoItem = (item: FeedItem, idx: number) => (
    <div className="relative w-full h-full bg-black">
      {/* Small pill watermark at top-center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none px-3 py-1 rounded-full border border-white/30 bg-black/20 backdrop-blur-sm">
        <span className="text-[10px] font-black tracking-[0.2em] uppercase">
          <span className="text-white/40">BARBER</span>
          <span className="text-primary/50">-HUB</span>
        </span>
      </div>

      {item.cloudflare_stream_uid ? (
        <div className="absolute inset-0 w-full h-full">
          {(() => {
            const { CloudflareStreamPlayer } = require('@/components/CloudflareStreamPlayer');
            return (
              <CloudflareStreamPlayer
                streamUid={item.cloudflare_stream_uid}
                fallbackUrl={item.media_url}
                autoPlay={activeIndex === idx}
                muted={isMuted}
                loop
                controls={false}
                className="w-full h-full"
              />
            );
          })()}
        </div>
      ) : item.media_url && (item.media_url.includes(".mp4") || item.media_url.includes(".webm") || item.media_url.startsWith("http")) ? (
        <video
          ref={(el) => { if (el) videoRefs.current.set(item.id, el); }}
          src={item.media_url}
          className="absolute inset-0 w-full h-full object-contain"
          autoPlay={activeIndex === idx}
          muted
          loop
          playsInline
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: item.thumbnail_url || item.media_url
              ? `url(${item.thumbnail_url || item.media_url})`
              : "none",
          }}
        >
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Play className="w-12 h-12 text-white/80" />
          </div>
        </div>
      )}

      {item.type === "educator" && (
        <div className="absolute top-4 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/80 backdrop-blur-sm">
          <GraduationCap className="w-3 h-3 text-primary-foreground" />
          <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">Masterclass</span>
        </div>
      )}
      {item.type === "platform" && (
        <div className="absolute top-4 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/80 backdrop-blur-sm border border-primary/30">
          <Flame className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Official</span>
        </div>
      )}

      {/* Right-side action stack */}
      {renderActionStack(item)}

      {/* Creator info + specialty pills */}
      <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {renderSpecialtyPills(item.specialty)}
        <p className="text-white font-semibold text-sm mt-1">{item.barber_name}</p>
        {item.title && (
          <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{item.title}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Minimal back button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/30 backdrop-blur-sm border border-white/10"
      >
        <ArrowLeft className="w-4 h-4 text-white" />
      </button>

      <div ref={containerRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {feed.length === 0 && (
          <div className="h-screen flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No content yet — check back soon!</p>
          </div>
        )}
        {feed.map((item, idx) => (
          <div
            key={item.id}
            data-index={idx}
            className="h-screen w-full snap-start snap-always relative flex items-center justify-center"
          >
            {item.type === "battle" ? (
              <SplitScreenBattle
                barber1_video={item.barber1_video!}
                barber2_video={item.barber2_video!}
                barber1_name={item.barber1_name!}
                barber1_location={item.barber1_location!}
                barber2_name={item.barber2_name!}
                barber2_location={item.barber2_location!}
                isActive={activeIndex === idx}
                battleId={item.battle_id!}
              />
            ) : item.type === "sponsor" ? (
              <div className="w-full h-full flex items-center justify-center bg-card p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={activeIndex === idx ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4 }}
                  className="w-full max-w-sm text-center space-y-4"
                >
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Powered by</span>
                  {item.logo_url && (
                    <img src={item.logo_url} alt={item.name} className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-primary/30" />
                  )}
                  <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wider">
                      LEARN MORE
                    </a>
                  )}
                </motion.div>
              </div>
            ) : (
              renderVideoItem(item, idx)
            )}
          </div>
        ))}
      </div>

      {/* Donation Modal */}
      {donationTarget && (
        <DonationModal
          creatorId={donationTarget.userId}
          creatorName={donationTarget.name}
          isOpen={!!donationTarget}
          onClose={() => setDonationTarget(null)}
        />
      )}
    </div>
  );
};

export default WatchFeed;
