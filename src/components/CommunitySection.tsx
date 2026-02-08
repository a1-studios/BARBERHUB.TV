import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Heart, Flame, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const ROTATION_MS = 4000;

const CommunitySection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: barberProfiles, isLoading } = useQuery({
    queryKey: ["public-barber-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_creator_profiles");
      if (error) throw error;
      return data;
    },
  });

  const { data: barberDetails } = useQuery({
    queryKey: ["barber-profiles-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barber_profiles")
        .select("user_id, name, specialty, location, country_code");
      if (error) throw error;
      return data;
    },
    enabled: !!barberProfiles?.length,
  });

  const topBarbers =
    barberProfiles
      ?.map((profile) => {
        const detail = barberDetails?.find((b) => b.user_id === profile.user_id);
        return {
          id: profile.user_id,
          name: profile.display_name || detail?.name || "Unknown",
          location: detail?.location || detail?.country_code || "—",
          votes: profile.like_count || 0,
          followers: profile.follower_count || 0,
          specialty: detail?.specialty || "General",
          avatar: profile.avatar_url || "",
          bb: profile.subscription_count * 10 || 0,
        };
      })
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 10)
      .map((b, i) => ({ ...b, rank: i + 1 })) || [];

  // Auto-rotate
  useEffect(() => {
    if (topBarbers.length === 0) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % topBarbers.length);
    }, ROTATION_MS);
    return () => clearInterval(timer);
  }, [topBarbers.length]);

  if (isLoading || !topBarbers.length) return null;

  const barber = topBarbers[activeIndex];
  const nextBarber = topBarbers[(activeIndex + 1) % topBarbers.length];

  return (
    <section id="community" className="py-6">
      <div className="container mx-auto px-4">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black uppercase tracking-wider">
              Top Barbers
            </h3>
            <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary">
              LIVE
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {activeIndex + 1}/{topBarbers.length}
          </span>
        </div>

        {/* Spotlight Card */}
        <div className="relative overflow-hidden rounded-xl border border-primary/10 bg-gradient-to-r from-background via-muted/30 to-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={barber.id}
              initial={{ opacity: 0, x: 60, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -60, filter: "blur(8px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex items-center gap-4 p-4 sm:p-5"
            >
              {/* Rank */}
              <div className="shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${
                    barber.rank === 1
                      ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                      : barber.rank === 2
                        ? "bg-muted text-foreground border border-foreground/20"
                        : barber.rank === 3
                          ? "bg-muted text-foreground border border-primary/20"
                          : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {barber.rank === 1 ? (
                    <Crown className="w-5 h-5" />
                  ) : (
                    `#${barber.rank}`
                  )}
                </div>
              </div>

              {/* Avatar */}
              <Avatar className="w-14 h-14 ring-2 ring-primary/30 shrink-0">
                <AvatarImage src={barber.avatar} alt={barber.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {barber.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base truncate">{barber.name}</h4>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {barber.specialty}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {barber.location}
                </p>
              </div>

              {/* Stats row */}
              <div className="hidden sm:flex items-center gap-5 shrink-0">
                <div className="text-center">
                  <div className="text-lg font-black text-primary">{barber.votes}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Votes
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-primary/80">
                    {barber.followers >= 1000
                      ? `${(barber.followers / 1000).toFixed(1)}K`
                      : barber.followers}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Fans
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-primary">{barber.bb}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    BB
                  </div>
                </div>
              </div>

              {/* Next hint */}
              <div className="shrink-0 flex items-center gap-1 text-muted-foreground/50">
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom progress bar */}
          <motion.div
            key={`progress-${activeIndex}`}
            className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/60 via-primary/40 to-primary/60 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: ROTATION_MS / 1000, ease: "linear" }}
          />
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
