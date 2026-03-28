import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSponsorAds } from "@/hooks/useSponsorAds";
import { ArrowLeft, Play, GraduationCap, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import SplitScreenBattle from "@/components/battles/SplitScreenBattle";

interface FeedItem {
  type: "video" | "sponsor" | "educator" | "platform" | "battle";
  id: string;
  media_url?: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  barber_name?: string;
  creator_avatar?: string;
  name?: string;
  message?: string;
  logo_url?: string | null;
  link?: string | null;
  // Battle-specific fields
  battle_id?: string;
  barber1_video?: string;
  barber2_video?: string;
  barber1_name?: string;
  barber1_location?: string;
  barber2_name?: string;
  barber2_location?: string;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const { data: videos = [] } = useQuery({
    queryKey: ["watch-feed-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("battle_submissions")
        .select("id, media_url, title, description, thumbnail_url, user_id")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      const userIds = [...new Set(data?.map((v) => v.user_id) || [])];
      let barberMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        profiles?.forEach((p) => {
          barberMap[p.user_id] = p.display_name || "Barber";
        });
      }

      return (data || []).map((v) => ({
        type: "video" as const,
        id: v.id,
        media_url: v.media_url,
        title: v.title,
        description: v.description,
        thumbnail_url: v.thumbnail_url,
        barber_name: barberMap[v.user_id] || "Barber",
      }));
    },
  });

  const { data: educatorContent = [] } = useQuery({
    queryKey: ["watch-feed-educator"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("build_universal_feed", {
        p_limit: 20,
        p_offset: 0,
      });
      if (error) throw error;
      return (data || [])
        .filter((item: any) => item.content_type === "course_teaser")
        .map((item: any) => ({
          type: "educator" as const,
          id: item.item_id,
          media_url: item.media_url,
          title: item.title,
          description: item.description,
          thumbnail_url: item.thumbnail_url,
          barber_name: item.creator_name || "Educator",
          creator_avatar: item.creator_avatar,
        }));
    },
  });

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

      // Collect barber profile IDs to resolve names/locations
      const barberProfileIds = [
        ...new Set(
          data.flatMap((b) => [b.barber1_id, b.barber2_id].filter(Boolean))
        ),
      ] as string[];

      let profileMap: Record<string, { name: string; location: string }> = {};
      if (barberProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("barber_profiles")
          .select("id, name, location, country_code")
          .in("id", barberProfileIds);
        profiles?.forEach((p) => {
          profileMap[p.id] = {
            name: p.name || "Barber",
            location: p.location || p.country_code || "",
          };
        });
      }

      return data.map((b) => ({
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

  const { data: sponsors = [] } = useSponsorAds(true);

  // Build feed with interleaving
  const feed: FeedItem[] = [];
  let sponsorIdx = 0;
  let educatorIdx = 0;
  let platformIdx = 0;
  let battleIdx = 0;

  if (videos.length === 0) {
    for (let i = 0; i < 20; i++) {
      feed.push({ ...PLATFORM_PROMOS[platformIdx % PLATFORM_PROMOS.length], id: `platform-loop-${i}` });
      platformIdx++;
      if ((i + 1) % 2 === 0 && educatorContent.length > 0) {
        feed.push(educatorContent[educatorIdx % educatorContent.length]);
        educatorIdx++;
      }
      if ((i + 1) % 3 === 0 && sponsors.length > 0) {
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
      // Interleave battles every 5 items
      if ((i + 1) % 5 === 0 && battleItems.length > 0) {
        feed.push(battleItems[battleIdx % battleItems.length]);
        battleIdx++;
      }
    }
  } else {
    videos.forEach((video, i) => {
      feed.push(video);
      if ((i + 1) % 2 === 0 && educatorContent.length > 0) {
        feed.push(educatorContent[educatorIdx % educatorContent.length]);
        educatorIdx++;
      }
      if ((i + 1) % 4 === 0) {
        feed.push({ ...PLATFORM_PROMOS[platformIdx % PLATFORM_PROMOS.length], id: `platform-${platformIdx}` });
        platformIdx++;
      }
      if ((i + 1) % 3 === 0 && sponsors.length > 0) {
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
      // Interleave battles every 5 videos
      if ((i + 1) % 5 === 0 && battleItems.length > 0) {
        feed.push(battleItems[battleIdx % battleItems.length]);
        battleIdx++;
      }
    });
  }

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

  const renderVideoItem = (item: FeedItem, idx: number) => (
    <div className="relative w-full h-full bg-black">
      {item.media_url && (item.media_url.includes('.mp4') || item.media_url.includes('.webm') || item.media_url.startsWith('http')) ? (
        <>
          <video
            ref={(el) => { if (el) videoRefs.current.set(item.id, el); }}
            src={item.media_url}
            className="absolute inset-0 w-full h-full object-contain"
            autoPlay={activeIndex === idx}
            muted
            playsInline
            loop
          />
        </>
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
        <div className="absolute top-16 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/80 backdrop-blur-sm">
          <GraduationCap className="w-3 h-3 text-primary-foreground" />
          <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">Masterclass</span>
        </div>
      )}
      {item.type === "platform" && (
        <div className="absolute top-16 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/80 backdrop-blur-sm border border-primary/30">
          <Flame className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Barber Battles Official</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <p className="text-white font-semibold text-sm">{item.barber_name}</p>
        {item.title && (
          <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{item.title}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-4 pb-2 bg-gradient-to-b from-background/90 to-transparent">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">Watch</h1>
      </div>

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
            ) : item.type === "video" || item.type === "educator" || item.type === "platform" ? (
              renderVideoItem(item, idx)
            ) : item.type === "sponsor" ? (
              <div className="w-full h-full flex items-center justify-center bg-card p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={activeIndex === idx ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4 }}
                  className="w-full max-w-sm text-center space-y-4"
                >
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Sponsored</span>
                  {item.logo_url && (
                    <img src={item.logo_url} alt={item.name} className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-primary/30" />
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
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchFeed;
