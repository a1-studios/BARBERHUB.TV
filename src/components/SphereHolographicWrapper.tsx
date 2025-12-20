import React from 'react';

interface SphereHolographicWrapperProps {
  children: React.ReactNode;
  size?: number;
}

export const SphereHolographicWrapper: React.FC<SphereHolographicWrapperProps> = ({
  children,
  size = 650
}) => {
  return (
    <div className="relative w-full flex justify-center items-center">
      {/* Outer energy ring - rotating */}
      <div 
        className="absolute rounded-full animate-spin-slow pointer-events-none"
        style={{
          width: size + 120,
          height: size + 120,
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            hsl(24 100% 52% / 0.4) 45deg,
            transparent 90deg,
            hsl(187 100% 50% / 0.3) 135deg,
            transparent 180deg,
            hsl(24 100% 52% / 0.4) 225deg,
            transparent 270deg,
            hsl(187 100% 50% / 0.3) 315deg,
            transparent 360deg
          )`,
          mask: `radial-gradient(circle, transparent ${size/2 + 30}px, black ${size/2 + 35}px, black ${size/2 + 55}px, transparent ${size/2 + 60}px)`,
          WebkitMask: `radial-gradient(circle, transparent ${size/2 + 30}px, black ${size/2 + 35}px, black ${size/2 + 55}px, transparent ${size/2 + 60}px)`,
        }}
      />

      {/* Inner holographic glow ring */}
      <div 
        className="absolute rounded-full animate-pulse-glow pointer-events-none"
        style={{
          width: size + 60,
          height: size + 60,
          background: `radial-gradient(circle at 30% 20%, hsl(24 100% 52% / 0.15), transparent 50%),
                       radial-gradient(circle at 70% 80%, hsl(187 100% 50% / 0.15), transparent 50%)`,
          boxShadow: `
            inset 0 0 60px hsl(24 100% 52% / 0.1),
            0 0 40px hsl(24 100% 52% / 0.1),
            0 0 80px hsl(187 100% 50% / 0.05)
          `,
        }}
      />

      {/* Scanning line effect - vertical */}
      <div 
        className="absolute pointer-events-none overflow-hidden rounded-full"
        style={{
          width: size + 40,
          height: size + 40,
        }}
      >
        <div 
          className="absolute w-full animate-scan-vertical"
          style={{
            height: '2px',
            background: `linear-gradient(90deg, 
              transparent 0%, 
              hsl(187 100% 50% / 0.6) 20%, 
              hsl(187 100% 50% / 0.9) 50%, 
              hsl(187 100% 50% / 0.6) 80%, 
              transparent 100%
            )`,
            boxShadow: `0 0 20px hsl(187 100% 50% / 0.5), 0 0 40px hsl(187 100% 50% / 0.3)`,
          }}
        />
      </div>

      {/* Energy particles floating */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float-particle"
            style={{
              width: 4 + Math.random() * 4,
              height: 4 + Math.random() * 4,
              left: `${15 + Math.random() * 70}%`,
              top: `${15 + Math.random() * 70}%`,
              background: i % 2 === 0 
                ? 'hsl(24 100% 52% / 0.8)' 
                : 'hsl(187 100% 50% / 0.8)',
              boxShadow: i % 2 === 0 
                ? '0 0 10px hsl(24 100% 52% / 0.6)' 
                : '0 0 10px hsl(187 100% 50% / 0.6)',
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Corner accent highlights - CoD style */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: size * 0.4,
          height: 2,
          background: `linear-gradient(90deg, transparent, hsl(24 100% 52% / 0.8), transparent)`,
          boxShadow: '0 0 15px hsl(24 100% 52% / 0.5)',
        }}
      />
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: size * 0.4,
          height: 2,
          background: `linear-gradient(90deg, transparent, hsl(187 100% 50% / 0.8), transparent)`,
          boxShadow: '0 0 15px hsl(187 100% 50% / 0.5)',
        }}
      />

      {/* Hexagonal grid overlay - subtle */}
      <div 
        className="absolute rounded-full pointer-events-none opacity-20"
        style={{
          width: size + 20,
          height: size + 20,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ff6b00' fill-opacity='0.3'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          mask: `radial-gradient(circle, black 0%, black ${size/2 - 20}px, transparent ${size/2 + 10}px)`,
          WebkitMask: `radial-gradient(circle, black 0%, black ${size/2 - 20}px, transparent ${size/2 + 10}px)`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes scan-vertical {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes float-particle {
          0%, 100% { 
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.8;
          }
          25% { 
            transform: translateY(-20px) translateX(10px) scale(1.2);
            opacity: 1;
          }
          50% { 
            transform: translateY(-10px) translateX(-10px) scale(0.8);
            opacity: 0.6;
          }
          75% { 
            transform: translateY(-30px) translateX(5px) scale(1.1);
            opacity: 0.9;
          }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .animate-scan-vertical {
          animation: scan-vertical 4s ease-in-out infinite;
        }
        .animate-float-particle {
          animation: float-particle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
