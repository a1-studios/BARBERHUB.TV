import { ReactNode, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ImperativePanelGroupHandle } from 'react-resizable-panels';
import { useIsMobile } from '@/hooks/use-mobile';
import { GripHorizontal, GripVertical } from 'lucide-react';

interface DraggableBattleSplitProps {
  panelOne: ReactNode;
  panelTwo: ReactNode;
  className?: string;
}

/**
 * Two-panel split with a draggable divider for battle viewing.
 * Mobile: vertical stack with horizontal grab handle.
 * Desktop: side-by-side with vertical grab handle.
 * Double-tap/click the handle to reset to 50/50.
 */
export const DraggableBattleSplit = ({ panelOne, panelTwo, className }: DraggableBattleSplitProps) => {
  const isMobile = useIsMobile();
  const groupRef = useRef<ImperativePanelGroupHandle>(null);

  const resetSplit = () => {
    groupRef.current?.setLayout([50, 50]);
  };

  return (
    <ResizablePanelGroup
      ref={groupRef}
      direction={isMobile ? 'vertical' : 'horizontal'}
      className={className ?? 'h-full w-full'}
    >
      <ResizablePanel defaultSize={50} minSize={15} className="relative">
        {panelOne}
      </ResizablePanel>

      <ResizableHandle
        onDoubleClick={resetSplit}
        className={
          isMobile
            ? 'h-2 bg-white/20 hover:bg-white/40 active:bg-white/60 transition-colors relative flex items-center justify-center after:absolute after:inset-x-0 after:-top-3 after:-bottom-3 after:content-[""]'
            : 'w-2 bg-white/20 hover:bg-white/40 active:bg-white/60 transition-colors relative flex items-center justify-center after:absolute after:inset-y-0 after:-left-3 after:-right-3 after:content-[""]'
        }
      >
        <div className="z-10 flex items-center justify-center bg-white/90 rounded-full shadow-lg pointer-events-none"
          style={isMobile ? { width: 44, height: 18 } : { width: 18, height: 44 }}
        >
          {isMobile ? (
            <GripHorizontal className="h-3.5 w-3.5 text-black" />
          ) : (
            <GripVertical className="h-3.5 w-3.5 text-black" />
          )}
        </div>
      </ResizableHandle>

      <ResizablePanel defaultSize={50} minSize={15} className="relative">
        {panelTwo}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
