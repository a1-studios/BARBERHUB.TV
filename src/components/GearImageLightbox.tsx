import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  startIndex?: number;
  productName: string;
  onClose: () => void;
}

export const GearImageLightbox = ({ images, startIndex = 0, productName, onClose }: Props) => {
  const [idx, setIdx] = useState(startIndex);
  const total = images.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + total) % total);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % total);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [total, onClose]);

  if (total === 0) return null;

  const next = () => setIdx((i) => (i + 1) % total);
  const prev = () => setIdx((i) => (i - 1 + total) % total);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold || info.velocity.x < -400) next();
    else if (info.offset.x > threshold || info.velocity.x > 400) prev();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center select-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <span className="text-xs font-semibold text-white/80 tabular-nums">
          {idx + 1} / {total}
        </span>
        <span className="text-xs font-bold text-white truncate max-w-[60%] text-center">
          {productName}
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Desktop arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous"
            className="hidden md:flex absolute left-4 z-10 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="hidden md:flex absolute right-4 z-10 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Swipeable image */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={idx}
            src={images[idx]}
            alt={`${productName} ${idx + 1}`}
            className="max-h-[85vh] max-w-[92vw] object-contain touch-pan-y"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            drag={total > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-orange-500" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
};

export default GearImageLightbox;
