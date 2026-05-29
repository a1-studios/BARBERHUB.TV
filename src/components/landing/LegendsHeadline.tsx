/**
 * Display headline shown on the public landing.
 * Two-color logic: WHERE = orange, BARBERS = white, BECOME = orange, LEGENDS = white.
 */
export const LegendsHeadline = () => (
  <h1 className="text-center font-black uppercase leading-[0.95] tracking-tight text-[clamp(1.4rem,6.2vw,2.5rem)] md:text-[clamp(2rem,4vw,3rem)]">
    <span className="text-orange-500">where </span>
    <span className="text-white">Barbers</span>
    <br />
    <span className="text-orange-500">become </span>
    <span className="text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]">
      LEGENDS
    </span>
  </h1>
);

export default LegendsHeadline;
