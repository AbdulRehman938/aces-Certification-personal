export interface BadgePdfOptions {
  organizationName: string;
  certificateName: string;
  badgeLabel?: "RATED" | "VERIFIED" | "CERTIFIED";
  level?: "BRONZE" | "SILVER" | "GOLD" | "EMERALD";
  score?: number | null;
  serialNumber?: string;
  assessmentType?: string;
  issuedDate?: string;
  auditorName?: string;
  auditorEmail?: string;
  auditorRole?: string;
  reviewerName?: string;
  reviewerEmail?: string;
  reviewerRole?: string;
  auditPeriodStart?: string;
  auditPeriodEnd?: string;
  validUntil?: string;
  auditStandard?: string;
  verificationFindings?: string[];
  assuranceFirmName?: string;
  assuranceFirmWebsite?: string;
  auditSummary?: string;
}

async function makeQrDataUrl(text: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(text, { width: 100, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  } catch {
    return null;
  }
}

async function getBadgeDataUrl(level: string, badgeLabel: string, title: string, serial: string, date: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const size = 400;
    const normalizedLevel = level?.toUpperCase() || "SILVER";
    const tiers: Record<string, { ring1: string; ring2: string; accent: string }> = {
      BRONZE: { ring1: "#A05C27", ring2: "#6B3A16", accent: "#D4884A" },
      SILVER: { ring1: "#909090", ring2: "#505050", accent: "#D0D0D0" },
      GOLD:   { ring1: "#C8971F", ring2: "#7A5700", accent: "#F0CC55" },
      EMERALD:{ ring1: "#2A8A3A", ring2: "#0E5020", accent: "#5ED87A" },
    };
    const theme = tiers[normalizedLevel] || tiers.SILVER;
    const shortSerial = serial.replace(/-/g, "").slice(0, 8).toUpperCase();
    const upper = title.toUpperCase();
    const words = upper.split(" ");
    let l1 = "", l2 = "";
    for (const w of words) {
      if ((l1 + " " + w).trim().length <= 16) l1 = (l1 + " " + w).trim();
      else l2 = (l2 + " " + w).trim();
    }
    if (l2.length > 14) l2 = l2.slice(0, 13) + "…";
    const has2 = !!l2;
    const bY = has2 ? 208 : 200, bTY = has2 ? 229 : 221, snY = has2 ? 252 : 244, dY = has2 ? 265 : 257;

    const svg = `<svg viewBox="0 0 300 300" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.accent}"/>
          <stop offset="40%" stop-color="${theme.ring1}"/>
          <stop offset="100%" stop-color="${theme.ring2}"/>
        </linearGradient>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${theme.ring1}"/>
          <stop offset="100%" stop-color="${theme.ring2}"/>
        </linearGradient>
        <radialGradient id="sh" cx="38%" cy="32%" r="55%">
          <stop offset="0%" stop-color="white" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
        <filter id="ds"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dy="3" result="b"/><feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="cc"><circle cx="150" cy="150" r="132"/></clipPath>
      </defs>
      <circle cx="150" cy="150" r="148" fill="url(#rg)"/>
      <circle cx="150" cy="150" r="136" fill="#1a1a1a"/>
      <circle cx="150" cy="150" r="126" fill="none" stroke="${theme.accent}" stroke-width="1" stroke-dasharray="8 4" opacity="0.4"/>
      <circle cx="150" cy="150" r="148" fill="url(#sh)"/>
      <g clip-path="url(#cc)">
        <text x="150" y="90" text-anchor="middle" fill="white" font-size="28" font-weight="800" letter-spacing="7" font-family="Arial, sans-serif">ACES</text>
        <text x="150" y="145" text-anchor="middle" fill="${theme.accent}" font-size="44" font-weight="900" letter-spacing="2" font-family="Georgia, serif" filter="url(#ds)">${badgeLabel}</text>
        <rect x="85" y="157" width="130" height="1.5" fill="${theme.accent}" opacity="0.5" rx="1"/>
        <text x="150" y="178" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="14" font-weight="600" letter-spacing="2" font-family="Arial, sans-serif">${l1}</text>
        ${has2 ? `<text x="150" y="196" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="14" font-weight="600" letter-spacing="2" font-family="Arial, sans-serif">${l2}</text>` : ""}
        <rect x="85" y="${bY}" width="130" height="30" rx="15" fill="url(#bg)" filter="url(#ds)"/>
        <text x="150" y="${bTY}" text-anchor="middle" fill="white" font-size="16" font-weight="900" letter-spacing="3" font-family="Arial, sans-serif">${normalizedLevel}</text>
        <text x="150" y="${snY}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10" font-weight="600" letter-spacing="2" font-family="Arial, sans-serif">SN: ${shortSerial}</text>
        <text x="150" y="${dY}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10" font-weight="600" letter-spacing="2" font-family="Arial, sans-serif">${date}</text>
      </g>
      <circle cx="150" cy="150" r="149" fill="none" stroke="white" stroke-width="0.5" opacity="0.2"/>
    </svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  } catch { return null; }
}

export async function downloadBadgePdf(options: BadgePdfOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const W = 148;
  const H = 210;
  const CX = W / 2;
  const PL = 12;
  const PR = W - 12;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.4);
  doc.roundedRect(3, 3, W - 6, H - 6, 3, 3);
  const hr = (y: number, x1 = PL, x2 = PR) => {
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.25);
    doc.line(x1, y, x2, y);
  };

  const check = (x: number, y: number) => {
    doc.setFillColor(34, 160, 60);
    doc.circle(x, y, 2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.45);
    doc.line(x - 1, y + 0.2, x - 0.2, y + 1);
    doc.line(x - 0.2, y + 1, x + 1.1, y - 0.8);
  };

  let y = 9;

  const serial = (options.serialNumber || "00000000").replace(/-/g, "").slice(0, 8).toUpperCase();
  const displaySerial = `ACES${serial.slice(0, 6)}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(displaySerial, CX, y, { align: "center" });
  y += 2;

  const level = options.level || "GOLD";
  const badgeLabel = options.badgeLabel || "CERTIFIED";
  const certTitle = options.certificateName || "Assessment";
  const issuedDate = options.issuedDate ||
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  const badgeMM = 52;
  const badgePng = await getBadgeDataUrl(level, badgeLabel, certTitle, serial, issuedDate);
  if (badgePng) {
    doc.addImage(badgePng, "PNG", CX - badgeMM / 2, y, badgeMM, badgeMM);
    y += badgeMM + 3;
  } else {
    y += 6;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("Certified & Verified", CX, y, { align: "center" });
  y += 5.5;

  const desc = `This organization has been assessed, verified, and certified by ACES Certification Platform as meeting the ACES standards for ${certTitle}.`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  const descLines = doc.splitTextToSize(desc, W - 26);
  doc.text(descLines, CX, y, { align: "center" });
  y += descLines.length * 3.5 + 4;

  hr(y); y += 4;

  const labelX = PL + 1;
  const valueX = 52;
  const rowH = 5.8;

  interface InfoRow { label: string; value: string }
  const auditPeriod = options.auditPeriodStart && options.auditPeriodEnd
    ? `${options.auditPeriodStart} – ${options.auditPeriodEnd}`
    : options.auditPeriodStart || options.auditPeriodEnd || "N/A";

  const rows: InfoRow[] = [
    { label: "Organization",           value: options.organizationName || "N/A" },
    { label: "Scope",                   value: certTitle },
    { label: "Valid Until",             value: options.validUntil || issuedDate },
    { label: "Audit & Review Period",   value: auditPeriod },
    { label: "Audit Standard",          value: options.auditStandard || "ACES-STD v1.0" },
  ];

  for (const row of rows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(140, 140, 140);
    const labelLines = doc.splitTextToSize(row.label, valueX - labelX - 2);
    doc.text(labelLines, labelX, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(20, 20, 20);
    const valLines = doc.splitTextToSize(row.value, PR - valueX);
    doc.text(valLines, valueX, y);

    const linesUsed = Math.max(labelLines.length, valLines.length);
    y += linesUsed * rowH;
  }

  y += 1;
  hr(y); y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text("Assurance & Verification Details", labelX, y);
  y += 5;

  const findings = options.verificationFindings?.length ? options.verificationFindings : [
    "All primary findings were Satisfactorily addressed.",
    `Full compliance with labor rights, diversity, and inclusion in ${options.organizationName || "the organization"}.`,
    "No high-risk or moderate-risk non-conformities found.",
  ];

  for (const f of findings) {
    check(labelX + 2, y - 0.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(55, 55, 55);
    const fLines = doc.splitTextToSize(f, PR - labelX - 9);
    doc.text(fLines, labelX + 7, y);
    y += fLines.length * 3.5 + 2;
  }

  y += 1;
  hr(y); y += 5;

  const colMid = W * 0.56;
  const firmBoxX = colMid + 2;
  const firmBoxW = PR - firmBoxX;
  const firmBoxH = 22;

  // Left: heading + text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text("Limited Assurance", labelX, y);

  const assuranceText = options.auditSummary ||
    "This certificate was subject to a limited assurance process encompassing interviews, document reviews, and on-site audits.";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const assLines = doc.splitTextToSize(assuranceText, colMid - labelX - 4);
  doc.text(assLines, labelX, y + 4.5);

  const boxY = y - 2;
  doc.setFillColor(237, 248, 241);
  doc.setDrawColor(34, 160, 60);
  doc.setLineWidth(0.6);
  doc.roundedRect(firmBoxX, boxY, firmBoxW, firmBoxH, 2.5, 2.5, "FD");

  const iconX = firmBoxX + 5;
  const iconY = boxY + 7;
  doc.setFillColor(34, 160, 60);
  doc.circle(iconX, iconY, 3.5, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.55);
  doc.line(iconX - 1.2, iconY + 0.2, iconX - 0.2, iconY + 1.3);
  doc.line(iconX - 0.2, iconY + 1.3, iconX + 1.5, iconY - 1);

  const firmTextX = firmBoxX + 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(options.assuranceFirmName || "GRC Audits", firmTextX, boxY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Accredited Third-Party Auditor", firmTextX, boxY + 10);

  doc.setTextColor(10, 80, 180);
  doc.setFontSize(5.5);
  doc.text(options.assuranceFirmWebsite || "www.grc-audits.com", firmTextX, boxY + 14.5);

  y += Math.max(assLines.length * 3.3 + 5, firmBoxH + 2);
  y += 4;

  hr(y); y += 3.5;

  const disclaimer = `To our limited assurance engagement, we have verified that ${options.organizationName || "this organization"} has complied with the ACES ${certTitle} standard 1.2, based on a comprehensive review covering labor rights, diversity, inclusion, and non-discrimination policies.`;
  doc.setFont("times", "italic");
  doc.setFontSize(5.8);
  doc.setTextColor(110, 110, 110);
  const dLines = doc.splitTextToSize(disclaimer, W - 24);
  doc.text(dLines, CX, y, { align: "center" });
  y += dLines.length * 3.2 + 5;

  hr(y); y += 6;

  const sigW = 42;
  const sig1X = PL;
  const sig2X = PR - sigW;
  const qrSize = 20;
  const qrX = CX - qrSize / 2;

  const aud = options.auditorName || "ACES Auditor";
  const audWords = aud.split(" ");
  const audSig = audWords.length >= 2
    ? `${audWords[0].charAt(0)}. ${audWords.slice(1).join(" ")}`
    : aud;

  doc.setFont("times", "bolditalic");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(audSig, sig1X, y - 1, { maxWidth: sigW - 2 });

  doc.setDrawColor(140, 140, 140);
  doc.setLineWidth(0.4);
  doc.line(sig1X, y + 2, sig1X + sigW, y + 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(20, 20, 20);
  doc.text(aud, sig1X, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(110, 110, 110);
  doc.text(options.auditorRole || "Lead ESG Auditor", sig1X, y + 10);

  if (options.auditorEmail) {
    doc.setTextColor(10, 80, 180);
    doc.setFontSize(5.5);
    doc.text(options.auditorEmail, sig1X, y + 14);
  }

  const rev = options.reviewerName || "ACES Reviewer";
  const revWords = rev.split(" ");
  const revSig = revWords.length >= 2
    ? `${revWords[0].charAt(0)}. ${revWords.slice(1).join(" ")}`
    : rev;

  doc.setFont("times", "bolditalic");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(revSig, sig2X, y - 1, { maxWidth: sigW - 2 });

  doc.setDrawColor(140, 140, 140);
  doc.setLineWidth(0.4);
  doc.line(sig2X, y + 2, sig2X + sigW, y + 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(20, 20, 20);
  doc.text(rev, sig2X, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(110, 110, 110);
  doc.text(options.reviewerRole || "Senior ESG Reviewer", sig2X, y + 10);

  if (options.reviewerEmail) {
    doc.setTextColor(10, 80, 180);
    doc.setFontSize(5.5);
    doc.text(options.reviewerEmail, sig2X, y + 14);
  }

  // -- QR Code (center)
  const verifyUrl = `https://verify.acescert.org/${displaySerial}`;
  const qrDataUrl = await makeQrDataUrl(verifyUrl);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", qrX, y - 3, qrSize, qrSize);
  }

  y += 22;

  hr(y); y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(110, 110, 110);
  doc.text(`Scan or visit verify.acescert.org/${displaySerial} to verify this certificate.`, CX, y, { align: "center" });
  y += 5;

  const icons: [string, [number, number, number]][] = [
    ["in", [0, 119, 181]],
    ["𝕏", [30, 30, 30]],
    ["f", [24, 119, 242]],
  ];
  const iconD = 6;
  const gap = 3;
  const totalW = icons.length * iconD + (icons.length - 1) * gap;
  let ix = CX - totalW / 2;
  for (const [label, color] of icons) {
    doc.setFillColor(...color);
    doc.roundedRect(ix, y, iconD, iconD, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text(label, ix + iconD / 2, y + iconD / 2 + 1.2, { align: "center" });
    ix += iconD + gap;
  }

  doc.save(`ACES-Certificate-${displaySerial}.pdf`);
}
