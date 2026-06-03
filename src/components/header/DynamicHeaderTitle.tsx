import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { matchTitle } from '@/config/pageTitles';
import { useHeaderAnnouncement } from '@/lib/headerAnnouncements';
import { useFitText } from '@/hooks/useFitText';

export const DynamicHeaderTitle = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const announcement = useHeaderAnnouncement();

  const page = matchTitle(pathname);
  const active = announcement
    ? { first: announcement.first, second: announcement.second }
    : { first: page.first, second: page.second };

  const key = announcement
    ? `a:${announcement.first}|${announcement.second}`
    : `p:${pathname}`;

  const fitRef = useFitText<HTMLDivElement>([key]);

  return (
    <button
      onClick={() => navigate('/')}
      className="absolute left-1/2 -translate-x-1/2 hover:opacity-90 transition-opacity"
      style={{ maxWidth: 'min(70vw, 360px)' }}
      aria-label="Go home"
    >
      <div ref={fitRef} className="overflow-hidden w-full flex items-center justify-center h-7 sm:h-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={key}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="inline-block whitespace-nowrap text-xl sm:text-2xl font-bold tracking-tight"
          >
            <span className="text-white">{active.first}</span>
            <span className="text-primary">{active.second ? `-${active.second}` : ''}</span>
          </motion.span>
        </AnimatePresence>
      </div>
    </button>
  );
};
