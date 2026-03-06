import React from "react";

interface AcesDynamicBadgeProps {
  name?: string;
  title?: string;
  level?: string;
  serial?: string;
  date?: string;
  color?: string;
  size?: number;
  className?: string;
}

export const AcesDynamicBadge: React.FC<AcesDynamicBadgeProps> = ({
  name = "ACES VERIFIED",
  title = "Assessment",
  level = "SILVER",
  serial = "000000",
  date = "01 JAN 2026",
  size = 220,
  className = "",
}) => {
  const normalizedLevel = level?.toUpperCase() || "SILVER";

  // Determine badge type label from the name prop
  let badgeLabel = "VERIFIED";
  if (name.toUpperCase().includes("CERTIFIED")) badgeLabel = "CERTIFIED";
  else if (name.toUpperCase().includes("RATED")) badgeLabel = "RATED";

  // Tier colors
  const tiers: Record<
    string,
    {
      ring1: string;
      ring2: string;
      banner: string;
      accent: string;
      label: string;
    }
  > = {
    BRONZE: {
      ring1: "#A05C27",
      ring2: "#6B3A16",
      banner: "#8B4513",
      accent: "#D4884A",
      label: "RATED",
    },
    SILVER: {
      ring1: "#909090",
      ring2: "#505050",
      banner: "#606060",
      accent: "#D0D0D0",
      label: "VERIFIED",
    },
    GOLD: {
      ring1: "#C8971F",
      ring2: "#7A5700",
      banner: "#9A7010",
      accent: "#F0CC55",
      label: "CERTIFIED",
    },
    EMERALD: {
      ring1: "#2A8A3A",
      ring2: "#0E5020",
      banner: "#1A6A2A",
      accent: "#5ED87A",
      label: "EXPERT",
    },
  };

  const theme = tiers[normalizedLevel] || tiers.SILVER;

  // Truncate serial to 8 chars and uppercase it
  const shortSerial = serial
    ? serial.replace(/-/g, "").slice(0, 8).toUpperCase()
    : "00000000";

  // Trim title to fit — max ~18 chars per line, split into max 2 lines
  const trimTitle = (text: string): [string, string] => {
    const upper = text.toUpperCase();
    if (upper.length <= 16) return [upper, ""];
    const words = upper.split(" ");
    let line1 = "";
    let line2 = "";
    for (const word of words) {
      if ((line1 + " " + word).trim().length <= 16) {
        line1 = (line1 + " " + word).trim();
      } else {
        line2 = (line2 + " " + word).trim();
      }
    }
    if (line2.length > 14) line2 = line2.slice(0, 13) + "…";
    return [line1, line2];
  };

  const [titleLine1, titleLine2] = trimTitle(title);

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 300 300"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Outer ring gradient */}
          <linearGradient
            id={`ring-${normalizedLevel}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset="40%" stopColor={theme.ring1} />
            <stop offset="100%" stopColor={theme.ring2} />
          </linearGradient>

          {/* Banner gradient */}
          <linearGradient
            id={`banner-${normalizedLevel}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={theme.ring1} />
            <stop offset="100%" stopColor={theme.ring2} />
          </linearGradient>

          {/* Shine */}
          <radialGradient id="shine" cx="38%" cy="32%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* Drop shadow */}
          <filter id="dshadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="3" result="blur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.45" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ClipPath to keep all content inside the circle */}
          <clipPath id="circle-clip">
            <circle cx="150" cy="150" r="132" />
          </clipPath>
        </defs>

        {/* Outer metallic ring */}
        <circle
          cx="150"
          cy="150"
          r="148"
          fill={`url(#ring-${normalizedLevel})`}
        />

        {/* Inner dark circle */}
        <circle cx="150" cy="150" r="136" fill="#111111" />

        {/* Dashed inner accent ring */}
        <circle
          cx="150"
          cy="150"
          r="126"
          fill="none"
          stroke={theme.accent}
          strokeWidth="1"
          strokeDasharray="8 4"
          opacity="0.35"
        />

        {/* Shine overlay */}
        <circle cx="150" cy="150" r="148" fill="url(#shine)" />

        {/* ── All text content, clipped to circle ── */}
        <g clipPath="url(#circle-clip)">
          {/* ACES label */}
          <text
            x="150"
            y="90"
            textAnchor="middle"
            fill="white"
            fontSize="26"
            fontWeight="800"
            letterSpacing="6"
            fontFamily="Inter, Arial, sans-serif"
          >
            ACES
          </text>

          {/* Badge label: VERIFIED / CERTIFIED / RATED */}
          <text
            x="150"
            y="142"
            textAnchor="middle"
            fill={theme.accent}
            fontSize="42"
            fontWeight="900"
            letterSpacing="2"
            fontFamily="Georgia, serif"
            filter="url(#dshadow)"
          >
            {badgeLabel}
          </text>

          {/* Divider line */}
          <rect
            x="90"
            y="155"
            width="120"
            height="1.5"
            fill={theme.accent}
            opacity="0.4"
            rx="1"
          />

          {/* Certificate title — line 1 */}
          <text
            x="150"
            y="177"
            textAnchor="middle"
            fill="rgba(255,255,255,0.88)"
            fontSize="15"
            fontWeight="600"
            letterSpacing="1.5"
            fontFamily="Inter, Arial, sans-serif"
          >
            {titleLine1}
          </text>

          {/* Certificate title — line 2 (if exists) */}
          {titleLine2 && (
            <text
              x="150"
              y="195"
              textAnchor="middle"
              fill="rgba(255,255,255,0.88)"
              fontSize="15"
              fontWeight="600"
              letterSpacing="1.5"
              fontFamily="Inter, Arial, sans-serif"
            >
              {titleLine2}
            </text>
          )}

          {/* Tier banner pill */}
          <rect
            x="90"
            y={titleLine2 ? 208 : 200}
            width="120"
            height="30"
            rx="15"
            fill={`url(#banner-${normalizedLevel})`}
            filter="url(#dshadow)"
          />
          <text
            x="150"
            y={titleLine2 ? 229 : 221}
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="900"
            letterSpacing="2"
            fontFamily="Inter, Arial, sans-serif"
          >
            {normalizedLevel}
          </text>

          {/* Serial and date — compact, below banner */}
          <text
            x="150"
            y={titleLine2 ? 252 : 244}
            textAnchor="middle"
            fill="rgba(255,255,255,0.42)"
            fontSize="10"
            fontWeight="600"
            letterSpacing="1.5"
            fontFamily="Inter, Arial, sans-serif"
          >
            SN: {shortSerial}
          </text>
          <text
            x="150"
            y={titleLine2 ? 265 : 257}
            textAnchor="middle"
            fill="rgba(255,255,255,0.42)"
            fontSize="10"
            fontWeight="600"
            letterSpacing="1.5"
            fontFamily="Inter, Arial, sans-serif"
          >
            {date}
          </text>
        </g>

        {/* Outer rim shine */}
        <circle
          cx="150"
          cy="150"
          r="149"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          opacity="0.22"
        />
      </svg>
    </div>
  );
};
