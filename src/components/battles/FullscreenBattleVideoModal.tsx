import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Heart, ThumbsUp, DollarSign, Play } from "lucide-react";
import { BrandedVideoPlayer } from "@/components/BrandedVideoPlayer";

interface BattleSubmission {
  id: string;
  user_id: string;
  media_url?: string;
  title?: string;
  is_live_stream?: boolean;
  thumbnail_url?: string;
}

interface BarberData {
  id: string;
  user_id: string;
  name: string;
  country_code?: string;
  photo: string;
  videoUrl?: string;
  isLive?: boolean;
  submission?: BattleSubmission;
}

interface FullscreenBattleVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  barber1: BarberData;
  barber2: BarberData;
  percentages: { barber1: number; barber2: number };
  userVotedFor: string | null;
  onVote: (barberId: string) => void;
  onLike: (barberId: string) => void;
  onDonate: (barberId: string, barberName: string) => void;
  onFollow: (barberId: string) => void;
}

const getCountryFlag = (countryCode?: string) => {
  if (!countryCode) return "🌍";
  const code = countryCode.toUpperCase();
  return String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0)));
};

const renderVideoPlayer = (barber: BarberData) => {
  const videoSrc = barber.submission?.media_url || barber.videoUrl || null;
  const isLive = barber.submission?.is_live_stream || barber.isLive || false;
  const videoTitle = barber.submission?.title || `${barber.name}'s Stream`;

  return (
    <BrandedVideoPlayer
      src={videoSrc}
      isLive={isLive}
      title={videoTitle}
      autoPlay
      showBranding
    />
  );
};

export const FullscreenBattleVideoModal = ({
  isOpen, onClose, barber1, barber2, percentages, userVotedFor, onVote, onLike, onDonate, onFollow,
}: FullscreenBattleVideoModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] max-h-screen w-screen h-screen p-0 bg-black border-0" onEscapeKeyDown={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/70 hover:bg-black/90 rounded-full p-2 transition-colors">
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 h-full lg:h-screen overflow-y-auto lg:overflow-hidden gap-0">
          {/* Barber 1 */}
          <div className="relative h-screen lg:h-full flex flex-col bg-black">
            <div className="flex-1 relative">
              {renderVideoPlayer(barber1)}
              <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <span className="text-white font-bold text-lg">{percentages.barber1}%</span>
              </div>
            </div>
            <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-4 lg:p-6 space-y-3 lg:space-y-4">
              <div className="flex items-center gap-3">
                <img src={barber1.photo} alt={barber1.name} className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-primary" />
                <div>
                  <h3 className="text-white font-bold text-lg lg:text-xl">{barber1.name}</h3>
                  <span className="text-white/70 text-sm">{getCountryFlag(barber1.country_code)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:gap-3">
                <Button onClick={() => onFollow(barber1.user_id)} size="sm" className="flex-1 lg:flex-initial"><UserPlus className="w-4 h-4 mr-2" />Follow</Button>
                <Button onClick={() => onLike(barber1.user_id)} size="sm" variant="secondary" className="flex-1 lg:flex-initial"><Heart className="w-4 h-4 mr-2" />Like</Button>
                <Button onClick={() => onVote(barber1.user_id)} disabled={userVotedFor !== null} size="sm" variant={userVotedFor === barber1.user_id ? "secondary" : "default"} className="flex-1 lg:flex-initial"><ThumbsUp className="w-4 h-4 mr-2" />{userVotedFor === barber1.user_id ? "Voted" : "Vote"}</Button>
                <Button onClick={() => onDonate(barber1.user_id, barber1.name)} size="sm" variant="outline" className="flex-1 lg:flex-initial"><DollarSign className="w-4 h-4 mr-2" />Donate</Button>
              </div>
            </div>
          </div>

          {/* Barber 2 */}
          <div className="relative h-screen lg:h-full flex flex-col bg-black lg:border-l border-white/10">
            <div className="flex-1 relative">
              {renderVideoPlayer(barber2)}
              <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <span className="text-white font-bold text-lg">{percentages.barber2}%</span>
              </div>
            </div>
            <div className="bg-gradient-to-t from-black via-black/95 to-transparent p-4 lg:p-6 space-y-3 lg:space-y-4">
              <div className="flex items-center gap-3">
                <img src={barber2.photo} alt={barber2.name} className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-primary" />
                <div>
                  <h3 className="text-white font-bold text-lg lg:text-xl">{barber2.name}</h3>
                  <span className="text-white/70 text-sm">{getCountryFlag(barber2.country_code)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:gap-3">
                <Button onClick={() => onFollow(barber2.user_id)} size="sm" className="flex-1 lg:flex-initial"><UserPlus className="w-4 h-4 mr-2" />Follow</Button>
                <Button onClick={() => onLike(barber2.user_id)} size="sm" variant="secondary" className="flex-1 lg:flex-initial"><Heart className="w-4 h-4 mr-2" />Like</Button>
                <Button onClick={() => onVote(barber2.user_id)} disabled={userVotedFor !== null} size="sm" variant={userVotedFor === barber2.user_id ? "secondary" : "default"} className="flex-1 lg:flex-initial"><ThumbsUp className="w-4 h-4 mr-2" />{userVotedFor === barber2.user_id ? "Voted" : "Vote"}</Button>
                <Button onClick={() => onDonate(barber2.user_id, barber2.name)} size="sm" variant="outline" className="flex-1 lg:flex-initial"><DollarSign className="w-4 h-4 mr-2" />Donate</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
