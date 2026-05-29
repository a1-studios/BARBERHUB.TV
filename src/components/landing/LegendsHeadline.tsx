/**
 * Display headline shown on the public landing.
 * "where Barbers become LEGENDS" — orange accent on "LEGENDS".
 */
export const LegendsHeadline = () => (
  <h1 className="text-center font-black uppercase leading-[0.95] tracking-tight text-[clamp(1.4rem,6.2vw,2.5rem)] md:text-[clamp(2rem,4vw,3rem)]">
    <span className="text-white">where Barbers become</span>
    <br />
    <span className="text-orange-500 drop-shadow-[0_0_18px_rgba(249,115,22,0.5)]">
      LEGENDS
    </span>
  </h1>
);

export default LegendsHeadline;
