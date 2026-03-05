import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { SponsorDealBoard } from './SponsorDealBoard';
import { Briefcase } from 'lucide-react';

interface DealsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DealsDrawer({ isOpen, onClose }: DealsDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center justify-center gap-2 text-lg font-bold">
            <Briefcase className="w-5 h-5 text-green-400" />
            Sponsor Deals
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <SponsorDealBoard />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
