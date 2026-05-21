import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { matchTitle } from '@/config/pageTitles';
import { useHeaderAnnouncement } from '@/lib/headerAnnouncements';

export const HeaderPageContext = () => {
  const { pathname } = useLocation();
  const announcement = useHeaderAnnouncement();
  const page = matchTitle(pathname);
  const Icon = page.icon;
  const label = `${page.first} ${page.second}`.toLowerCase();

  return (
    <div className="h-5 flex items-center justify-center pointer-events-none">
      <AnimatePresence mode="wait" initial={false}>
        {!announcement && (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <Icon className="w-3 h-3 text-primary/70" />
            <span>{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
