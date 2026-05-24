import { BarberGlobeCard } from './BarberGlobeCard';
import { useLandingData, PublicBarber } from './useLandingData';

interface Props {
  onPinClick: (b: PublicBarber) => void;
}

export const BottomGlobeSection = ({ onPinClick }: Props) => {
  const { topBarbers } = useLandingData();
  return (
    <section className="flex-none px-4 pb-3 h-[280px]">
      <BarberGlobeCard barbers={topBarbers} onPinClick={onPinClick} />
    </section>
  );
};

export default BottomGlobeSection;
