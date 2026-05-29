/**
 * Display headline shown on the public landing.
 * "where Barbers become legends" — orange accent on "Barbers".
 */
export const LegendsHeadline = () => (
  <h1 className="text-center font-black uppercase leading-[0.95] tracking-tight text-[clamp(2rem,9vw,3.5rem)]">
    <span className="text-white">where </span>
    <span className="text-orange-500 drop-shadow-[0_0_18px_rgba(249,115,22,0.45)]">Barbers</span>
    <span className="text-white"> become</span>
    <br />
    <span className="text-white">legends</span>
  </h1>
);

export default LegendsHeadline;
