import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EducatorUpload } from './EducatorUpload';
import { Upload } from 'lucide-react';

interface UploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadDrawer({ isOpen, onClose }: UploadDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center justify-center gap-2 text-lg font-bold">
            <Upload className="w-5 h-5 text-primary" />
            Upload Content
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <EducatorUpload />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
