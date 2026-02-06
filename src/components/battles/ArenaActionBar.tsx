import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, UserPlus, UserCheck, User, Share2, ThumbsUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DonationModal } from "@/components/DonationModal";

interface ArenaActionBarProps {
  barber: {
    user_id: string;
    display_name?: string;
    name: string;
  };
  variant: "primary" | "cyan";
  showVote?: boolean;
  onVote?: () => void;
  hasVoted?: boolean;
}

export const ArenaActionBar = ({
  barber,
  variant,
  showVote = false,
  onVote,
  hasVoted = false,
}: ArenaActionBarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  // Check follow status
  const { data: isFollowing } = useQuery({
    queryKey: ["arena-follow", barber.user_id, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("creator_follows")
        .select("id")
        .eq("creator_id", barber.user_id)
        .eq("follower_id", user.id)
        .maybeSingle();
      return !error && !!data;
    },
    enabled: !!user?.id,
  });

  // Follow toggle
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (isFollowing) {
        const { error } = await supabase
          .from("creator_follows")
          .delete()
          .eq("creator_id", barber.user_id)
          .eq("follower_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("creator_follows")
          .insert({ creator_id: barber.user_id, follower_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arena-follow", barber.user_id, user?.id] });
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    },
    onError: () => toast.error("Failed to update follow"),
  });

  const handleShare = () => {
    const url = `${window.location.origin}/barber/${barber.user_id}`;
    if (navigator.share) {
      navigator.share({ title: barber.display_name || barber.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const iconClass = "w-5 h-5";
  const buttonBase = "p-2 transition-all active:scale-90 hover:text-white";

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/40 backdrop-blur-sm flex items-center justify-between px-3 z-10 rounded-b-lg">
        {/* Donate - primary business action */}
        <button
          onClick={() => {
            if (!user) { toast.error("Sign in to donate"); return; }
            setIsDonationOpen(true);
          }}
          className={`${buttonBase} text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.5)]`}
          aria-label="Donate"
        >
          <Heart className={iconClass} strokeWidth={1.5} />
        </button>

        {/* Follow */}
        <button
          onClick={() => {
            if (!user) { toast.error("Sign in to follow"); return; }
            followMutation.mutate();
          }}
          disabled={followMutation.isPending}
          className={`${buttonBase} ${isFollowing ? "text-cyan" : "text-white/70"}`}
          aria-label={isFollowing ? "Unfollow" : "Follow"}
        >
          {isFollowing ? (
            <UserCheck className={iconClass} strokeWidth={1.5} />
          ) : (
            <UserPlus className={iconClass} strokeWidth={1.5} />
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate(`/barber/${barber.user_id}`)}
          className={`${buttonBase} text-white/70`}
          aria-label="View profile"
        >
          <User className={iconClass} strokeWidth={1.5} />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className={`${buttonBase} text-white/70`}
          aria-label="Share"
        >
          <Share2 className={iconClass} strokeWidth={1.5} />
        </button>

        {/* Vote (conditional) */}
        {showVote && (
          <button
            onClick={() => {
              if (hasVoted) return;
              onVote?.();
            }}
            disabled={hasVoted}
            className={`${buttonBase} ${
              hasVoted
                ? "text-white/30"
                : variant === "primary"
                ? "text-primary"
                : "text-cyan"
            }`}
            aria-label="Vote"
          >
            <ThumbsUp
              className={iconClass}
              strokeWidth={1.5}
              fill={hasVoted ? "currentColor" : "none"}
            />
          </button>
        )}
      </div>

      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
        creatorId={barber.user_id}
        creatorName={barber.display_name || barber.name}
      />
    </>
  );
};
