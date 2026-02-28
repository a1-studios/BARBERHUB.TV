import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface M4MQRCodeProps {
  barberUserId: string;
  size?: number;
}

export function M4MQRCode({ barberUserId, size = 150 }: M4MQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const verifyUrl = `${window.location.origin}/m4m/verify/${barberUserId}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, verifyUrl, {
        width: size,
        margin: 1,
        color: { dark: '#002D62', light: '#ffffff' },
      });
    }
  }, [verifyUrl, size]);

  return <canvas ref={canvasRef} />;
}
