/**
 * Slogan that orbits around the 3D globe.
 * Uses SVG textPath on a circle, spinning via CSS keyframes.
 * pointer-events: none so it never blocks globe dragging.
 */
export const OrbitingSlogan = () => {
  const text = "WHERE  ★  BARBERS  ★  BECOME  ★  LEGENDS  ★  ";
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        style={{ animation: "orbit-spin 32s linear infinite", transformOrigin: "center" }}
      >
        <defs>
          <path
            id="orbit-circle"
            d="M 200,200 m -178,0 a 178,178 0 1,1 356,0 a 178,178 0 1,1 -356,0"
          />
        </defs>
        <text
          fill="#ffffff"
          style={{
            fontWeight: 900,
            fontSize: "20px",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            filter: "drop-shadow(0 0 8px rgba(0,0,0,0.9))",
          }}
        >
          <textPath href="#orbit-circle" startOffset="0">
            {text}{text}
          </textPath>
        </text>
      </svg>
      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OrbitingSlogan;
