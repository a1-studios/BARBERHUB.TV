import { useState } from 'react';
import { Scissors } from 'lucide-react';
import { HaircutAdvisorModal } from './HaircutAdvisorModal';

export const HaircutAdvisorSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <HaircutAdvisorModal 
      isOpen={isModalOpen} 
      onClose={() => setIsModalOpen(false)} 
    />
  );
};