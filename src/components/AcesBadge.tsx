import React from "react";

interface AcesBadgeProps {
  badgeName?: string;
  level?: string;
  type?: string;
  serialNumber?: string;
  date?: string;
  color?: string;
  className?: string;
  size?: number;
}

export const AcesBadge: React.FC<AcesBadgeProps> = ({
  badgeName = "VERIFIED",
  level = "GOLD",
  className = "",
  size = 104,
}) => {
  // Determine the correct SVG background based on the badge type
  const getBadgeSVG = () => {
    const name = badgeName.toUpperCase();
    if (name.includes("CERTIFIED"))
      return "/assets/applicant/ACES-Certified.svg";
    if (name.includes("RATED")) return "/assets/applicant/ACES-Rated.svg";
    return "/assets/applicant/ACES-Verified.svg";
  };

  // Tier filter mapping (simulating material colors on base assets)
  const tierFilters: Record<string, string> = {
    BRONZE:
      "sepia(0.8) hue-rotate(-20deg) saturate(1.4) brightness(0.85) contrast(1.1)",
    SILVER: "grayscale(1) brightness(1.1) contrast(1.1)",
    GOLD: "none",
    EMERALD: "hue-rotate(65deg) saturate(2) brightness(0.85) contrast(1.1)",
  };

  const normalizedLevel = level?.toUpperCase() || "GOLD";
  const badgeFilter = tierFilters[normalizedLevel] || "none";

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: (size * 104) / 103,
      }}
    >
      <img
        src={getBadgeSVG()}
        className="absolute inset-0 w-full h-full object-contain"
        alt={`ACES ${badgeName} ${level}`}
        style={{
          filter: badgeFilter,
        }}
      />
    </div>
  );
};
