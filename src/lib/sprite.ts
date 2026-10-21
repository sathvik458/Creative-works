import type { CharacterLook, Expression } from "@/content/schema";

/**
 * Placeholder character art: a parametric, flat "visual novel" bust drawn as
 * an SVG string, so the app is fully playable without final illustrations.
 * Swap in real art per character via `sprites` in the story JSON.
 */

const DEFAULT_LOOK: CharacterLook = {
  hair: "#3b2a26",
  hairStyle: "short",
  skin: "#f6d3b8",
  outfit: "#5b7bd5",
  accent: "#ffffff",
};

const INK = "#2b2340";

function shade(hex: string, amt: number): string {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function backHair(look: CharacterLook): string {
  const h = look.hair;
  switch (look.hairStyle) {
    case "long":
      return `<path d="M62 150 C52 260 60 360 92 420 L208 420 C240 360 248 260 238 150 Z" fill="${shade(h, -12)}"/>`;
    case "bob":
      return `<path d="M64 140 C56 200 62 240 84 262 L216 262 C238 240 244 200 236 140 Z" fill="${shade(h, -12)}"/>`;
    default:
      return "";
  }
}

function frontHair(look: CharacterLook): string {
  const h = look.hair;
  switch (look.hairStyle) {
    case "spiky":
      return `<path d="M70 150 L66 104 L92 116 L96 70 L124 98 L146 56 L166 96 L196 66 L200 110 L228 100 L232 150 C214 122 186 112 150 112 C114 112 86 124 70 150 Z" fill="${h}"/>
      <path d="M74 152 C80 170 84 186 80 204 L70 196 Z M226 152 C220 170 216 186 220 204 L230 196 Z" fill="${h}"/>`;
    case "bob":
      return `<path d="M66 168 C60 96 104 66 150 66 C196 66 240 96 234 168 C222 140 206 126 196 124 C180 140 150 146 120 140 C108 138 96 132 92 126 C82 134 72 150 66 168 Z" fill="${h}"/>
      <path d="M66 160 C64 200 70 236 84 258 L94 252 C86 224 84 196 88 168 Z M234 160 C236 200 230 236 216 258 L206 252 C214 224 216 196 212 168 Z" fill="${h}"/>`;
    case "long":
      return `<path d="M66 172 C58 98 104 64 150 64 C198 64 242 98 234 172 C226 150 214 134 200 126 C190 146 170 150 150 140 C140 150 116 152 102 140 C90 148 74 160 66 172 Z" fill="${h}"/>
      <path d="M66 166 C62 214 66 258 76 296 L90 290 C84 254 82 214 86 176 Z M234 166 C238 214 234 258 224 296 L210 290 C216 254 218 214 214 176 Z" fill="${h}"/>`;
    case "cap":
      return `<path d="M74 170 C70 150 74 134 84 126 L92 176 Z M226 170 C230 150 226 134 216 126 L208 176 Z" fill="${h}"/>
      <path d="M72 128 C72 80 108 54 150 54 C192 54 228 80 228 128 Z" fill="${look.outfit}"/>
      <rect x="72" y="112" width="156" height="18" fill="${look.accent}"/>
      <circle cx="150" cy="92" r="11" fill="${look.accent}"/>
      <path d="M64 128 L236 128 C236 140 222 146 150 146 C78 146 64 140 64 128 Z" fill="${shade(look.outfit, -30)}"/>`;
    case "short":
    default:
      return `<path d="M68 164 C60 96 104 64 150 64 C196 64 240 96 232 164 C224 138 206 122 186 118 C170 132 136 136 112 124 C94 132 76 146 68 164 Z" fill="${h}"/>`;
  }
}

function eyes(expression: Expression): string {
  const L = 118;
  const R = 182;
  const Y = 182;
  const brow = (dy1: number, dy2: number) =>
    `<path d="M${L - 18} ${Y - 30 + dy1} Q${L} ${Y - 38 + dy1} ${L + 18} ${Y - 30 + dy2}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
     <path d="M${R - 18} ${Y - 30 + dy2} Q${R} ${Y - 38 + dy1} ${R + 18} ${Y - 30 + dy1}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const open = (x: number, rx = 13, ry = 17) =>
    `<ellipse cx="${x}" cy="${Y}" rx="${rx}" ry="${ry}" fill="${INK}"/>
     <ellipse cx="${x + 4}" cy="${Y - 6}" rx="${rx * 0.38}" ry="${ry * 0.34}" fill="#fff"/>
     <circle cx="${x - 4}" cy="${Y + 7}" r="2.6" fill="#fff" opacity=".8"/>`;

  switch (expression) {
    case "happy":
      return `${brow(-2, -2)}
        <path d="M${L - 14} ${Y + 4} Q${L} ${Y - 14} ${L + 14} ${Y + 4}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M${R - 14} ${Y + 4} Q${R} ${Y - 14} ${R + 14} ${Y + 4}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    case "surprised":
      return `${brow(-10, -10)}
        <circle cx="${L}" cy="${Y}" r="15" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="${L}" cy="${Y}" r="6" fill="${INK}"/>
        <circle cx="${R}" cy="${Y}" r="15" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="${R}" cy="${Y}" r="6" fill="${INK}"/>`;
    case "confused":
      return `<path d="M${L - 18} ${Y - 34} Q${L} ${Y - 30} ${L + 18} ${Y - 24}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M${R - 18} ${Y - 30} Q${R} ${Y - 42} ${R + 18} ${Y - 36}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${open(L, 12, 15)}
        <path d="M${R - 13} ${Y + 2} L${R + 13} ${Y - 2}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
        <path d="M232 132 C226 146 226 154 232 158 C238 154 238 146 232 132 Z" fill="#9fd8ff" stroke="#5aa9e6" stroke-width="2"/>`;
    case "sad":
      return `<path d="M${L - 18} ${Y - 26} Q${L} ${Y - 34} ${L + 18} ${Y - 38}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M${R - 18} ${Y - 38} Q${R} ${Y - 34} ${R + 18} ${Y - 26}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${open(L, 12, 14)}${open(R, 12, 14)}`;
    case "smile":
      return `${brow(-3, -3)}${open(L, 13, 15)}${open(R, 13, 15)}
        <path d="M${L - 13} ${Y + 15} Q${L} ${Y + 10} ${L + 13} ${Y + 15}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
        <path d="M${R - 13} ${Y + 15} Q${R} ${Y + 10} ${R + 13} ${Y + 15}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
    case "neutral":
    default:
      return `${brow(0, 0)}${open(L)}${open(R)}`;
  }
}

function mouth(expression: Expression): string {
  const X = 150;
  const Y = 228;
  switch (expression) {
    case "happy":
      return `<path d="M${X - 18} ${Y - 4} Q${X} ${Y + 22} ${X + 18} ${Y - 4} Z" fill="#c2405a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M${X - 9} ${Y + 8} Q${X} ${Y + 4} ${X + 9} ${Y + 8} Q${X} ${Y + 14} ${X - 9} ${Y + 8}" fill="#ff8fa3"/>`;
    case "smile":
      return `<path d="M${X - 17} ${Y - 3} Q${X} ${Y + 15} ${X + 17} ${Y - 3}" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case "surprised":
      return `<ellipse cx="${X}" cy="${Y + 4}" rx="9" ry="12" fill="#c2405a" stroke="${INK}" stroke-width="4"/>`;
    case "confused":
      return `<path d="M${X - 16} ${Y + 2} Q${X - 8} ${Y - 6} ${X} ${Y + 2} Q${X + 8} ${Y + 10} ${X + 16} ${Y + 2}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "sad":
      return `<path d="M${X - 13} ${Y + 6} Q${X} ${Y - 6} ${X + 13} ${Y + 6}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "neutral":
    default:
      return `<path d="M${X - 12} ${Y} Q${X} ${Y + 8} ${X + 12} ${Y}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
}

export function spriteSvg(lookIn: Partial<CharacterLook> | undefined, expression: Expression = "neutral"): string {
  const look: CharacterLook = { ...DEFAULT_LOOK, ...(lookIn ?? {}) };
  const blush = expression === "happy" || expression === "surprised" || expression === "smile";
  const outfitDark = shade(look.outfit, -26);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 440" width="300" height="440" preserveAspectRatio="xMidYMax meet">
  ${backHair(look)}
  <path d="M40 440 C40 352 76 300 150 300 C224 300 260 352 260 440 Z" fill="${look.outfit}"/>
  <path d="M40 440 C40 380 56 340 92 318 L104 440 Z M260 440 C260 380 244 340 208 318 L196 440 Z" fill="${outfitDark}" opacity=".55"/>
  <path d="M120 300 L150 352 L180 300 Z" fill="${look.accent}"/>
  <rect x="132" y="252" width="36" height="56" rx="14" fill="${shade(look.skin, -16)}"/>
  <path d="M132 300 L150 330 L168 300 Z" fill="${shade(look.skin, -6)}"/>
  <circle cx="150" cy="378" r="6" fill="${look.accent}"/><circle cx="150" cy="410" r="6" fill="${look.accent}"/>
  <ellipse cx="66" cy="190" rx="12" ry="18" fill="${shade(look.skin, -10)}"/>
  <ellipse cx="234" cy="190" rx="12" ry="18" fill="${shade(look.skin, -10)}"/>
  <path d="M68 150 C68 92 104 70 150 70 C196 70 232 92 232 150 C232 222 196 268 150 268 C104 268 68 222 68 150 Z" fill="${look.skin}"/>
  ${blush ? `<ellipse cx="104" cy="214" rx="16" ry="8" fill="#ff8fa3" opacity=".45"/><ellipse cx="196" cy="214" rx="16" ry="8" fill="#ff8fa3" opacity=".45"/>` : ""}
  ${eyes(expression)}
  <g class="sprite-mouth-rest">${mouth(expression)}</g>
  <g class="sprite-mouth-speaking" display="none" aria-hidden="true">
    <ellipse cx="150" cy="231" rx="13" ry="9" fill="#8e3048" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="150" cy="235" rx="7" ry="3" fill="#ff8fa3"/>
  </g>
  ${frontHair(look)}
</svg>`;
}

export function spriteDataUrl(look: Partial<CharacterLook> | undefined, expression: Expression = "neutral"): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(spriteSvg(look, expression))}`;
}
