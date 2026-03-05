import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSponsorAds } from "@/hooks/useSponsorAds";
import { ArrowLeft, Eye, Heart, Play, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";

interface FeedItem {
  type: "video" | "sponsor" | "educator";
  id: string;
  // Video fields
  media_url?: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  barber_name?: string;
  creator_avatar?: string;
  // Sponsor fields
  name?: string;
  message?: string;
  logo_url?: string | null;
  link?: string | null;
}

const WatchFeed = () => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch battle submission videos
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

  // Fetch educator content (promoted to feed)
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

  const { data: sponsors = [] } = useSponsorAds(true);

  // Interleave: 5 battles, 3 educator, 1 social, 1 sponsor pattern
  const feed: FeedItem[] = [];
  let sponsorIdx = 0;
  let educatorIdx = 0;
  videos.forEach((video, i) => {
    feed.push(video);
    // After every 2 videos, insert educator content (30% layer)
    if ((i + 1) % 2 === 0 && educatorContent.length > 0) {
      feed.push(educatorContent[educatorIdx % educatorContent.length]);
      educatorIdx++;
    }
    // After every 3 videos, insert sponsor (10% layer)
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
  });

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

  // Extract YouTube video ID
  const getYouTubeId = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/);
    return match?.[1] || null;
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-4 pb-2 bg-gradient-to-b from-background/90 to-transparent">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-sm font-bold tracking-wider text-foreground uppercase">
          Watch
        </h1>
      </div>

      {/* Feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
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
            {item.type === "video" ? (
              <div className="relative w-full h-full bg-black">
                {/* YouTube embed or thumbnail fallback */}
                {getYouTubeId(item.media_url) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(item.media_url)}?autoplay=${activeIndex === idx ? 1 : 0}&mute=1&loop=1&controls=0&modestbranding=1&rel=0&playsinline=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: item.thumbnail_url
                        ? `url(${item.thumbnail_url})`
                        : "none",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white/80" />
                    </div>
                  </div>
                )}

                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <p className="text-white font-semibold text-sm">
                    {item.barber_name}
                  </p>
                  {item.title && (
                    <p className="text-white/70 text-xs mt-0.5 line-clamp-2">
                      {item.title}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Sponsor Card */
              <div className="w-full h-full flex items-center justify-center bg-card p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={activeIndex === idx ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4 }}
                  className="w-full max-w-sm text-center space-y-4"
                >
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Sponsored
                  </span>
                  {item.logo_url && (
                    <img
                      src={item.logo_url}
                      alt={item.name}
                      className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-primary/30"
                    />
                  )}
                  <h3 className="text-lg font-bold text-foreground">
                    {item.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wider"
                    >
                      LEARN MORE
                    </a>
                  )}
                </motion.div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchFeed;
