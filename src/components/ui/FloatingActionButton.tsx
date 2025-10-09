import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  isOpen: boolean;
  className?: string;
}

export function FloatingActionButton({ onClick, isOpen, className }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
        "w-14 h-14 rounded-full",
        "bg-transparent hover:bg-primary/20",
        "hover:shadow-glow",
        "transition-all duration-200 ease-in-out",
        "flex items-center justify-center",
        "hover:scale-105",
        isOpen && "rotate-45 scale-110",
        className
      )}
    >
      <img 
        src="/lovable-uploads/c5bbb6c4-149e-41f8-9e68-1580ee1afdf8.png" 
        alt="Quick Actions"
        className={cn(
          "w-13 h-13 object-contain",
          "transition-transform duration-200",
          isOpen && "rotate-45"
        )}
      />
    </button>
  );
}