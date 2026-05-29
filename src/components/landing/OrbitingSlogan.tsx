/**
 * Tilted 3D halo ring of text orbiting the globe.
 * The SVG is tilted via CSS rotateX so the ring reads as an angel's halo;
 * SMIL animateTransform spins the text inside that tilted plane.
 */
export const OrbitingSlogan = () => {
  const text = "WHERE  ★  BARBERS  ★  BECOME  ★  LEGENDS  ★  ";
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
      style={{ perspective: "900px" }}
    >
      <svg
        viewBox="0 0 400 400"
        className="w-[115%] h-[115%]"
        style={{
          transform: "rotateX(70deg)",
          transformStyle: "preserve-3d",
          overflow: "visible",
        }}
      >
        <defs>
          <path
            id="orbit-circle"
            d="M 200,200 m -188,0 a 188,188 0 1,1 376,0 a 188,188 0 1,1 -376,0"
          />
        </defs>
        <g>
          <text
            fill="#ffffff"
            style={{
              fontWeight: 900,
              fontSize: "22px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              filter: "drop-shadow(0 0 10px rgba(0,0,0,0.95))",
            }}
          >
            <textPath href="#orbit-circle" startOffset="0">
              {text}{text}
            </textPath>
          </text>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 200 200"
            to="360 200 200"
            dur="28s"
            repeatCount="indefinite"
          />
        </g>
      </svg>
    </div>
  );
};

export default OrbitingSlogan;
