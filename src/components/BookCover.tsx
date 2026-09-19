import { useMemo, useState } from 'react';
import type { Book } from '../types';

interface BookCoverProps {
  book?: Pick<Book, 'title' | 'author' | 'category' | 'coverAccent' | 'coverEmoji'>;
  title?: string;
  author?: string;
  category?: string;
  accent?: string;
  emoji?: string;
  size?: 'mini' | 'card' | 'detail';
  className?: string;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);
}

function wrapTitle(value: string, maxCharacters = 18): string[] {
  const words = value.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    if ((line + ' ' + word).trim().length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

interface CoverPalette {
  base: string;
  deep: string;
  ink: string;
  paper: string;
  accent: string;
  font: string;
}

const COVER_PALETTES: CoverPalette[] = [
  { base: '#102a43', deep: '#071827', ink: '#f8fafc', paper: '#dbeafe', accent: '#7dd3fc', font: 'Georgia,serif' },
  { base: '#174235', deep: '#09251f', ink: '#fffdf5', paper: '#f5e9c8', accent: '#d4a373', font: 'Georgia,serif' },
  { base: '#762f3c', deep: '#351622', ink: '#fff8e7', paper: '#f7d488', accent: '#e8b86d', font: 'Georgia,serif' },
  { base: '#c35f22', deep: '#542216', ink: '#fffaf0', paper: '#fde68a', accent: '#172554', font: 'Arial,sans-serif' },
  { base: '#4c2a68', deep: '#21152f', ink: '#fff', paper: '#e9d5ff', accent: '#f0abfc', font: 'Arial,sans-serif' },
  { base: '#087f83', deep: '#073e4a', ink: '#f3fffb', paper: '#ccfbf1', accent: '#111827', font: 'Arial,sans-serif' },
  { base: '#8f3030', deep: '#421b25', ink: '#fff5e6', paper: '#fed7aa', accent: '#fbbf24', font: 'Georgia,serif' },
  { base: '#d9a514', deep: '#644b0d', ink: '#111827', paper: '#fef3c7', accent: '#172554', font: 'Arial,sans-serif' },
  { base: '#1f2937', deep: '#050608', ink: '#f8fafc', paper: '#cbd5e1', accent: '#94a3b8', font: 'Arial,sans-serif' },
  { base: '#60a5c8', deep: '#1e3a5f', ink: '#f8fafc', paper: '#dbeafe', accent: '#374151', font: 'Georgia,serif' },
  { base: '#285943', deep: '#102d25', ink: '#f7fee7', paper: '#dcfce7', accent: '#bef264', font: 'Arial,sans-serif' },
  { base: '#825b3d', deep: '#342319', ink: '#fff7ed', paper: '#fef3c7', accent: '#f5d0a9', font: 'Georgia,serif' },
];

function hashValue(value: string): number {
  return value.split('').reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
}

function getPalette(category: string, title: string, accent: string): CoverPalette {
  const categoryIndex: Record<string, number> = {
    'Artificial Intelligence': 4,
    'Machine Learning': 9,
    'Data Science': 7,
    Programming: 0,
    Database: 11,
    Networking: 5,
    'Cyber Security': 8,
    'Web Development': 3,
    'Computer Science': 2,
    Mathematics: 10,
    Business: 1,
  };
  const palette = COVER_PALETTES[categoryIndex[category] ?? hashValue(title) % COVER_PALETTES.length];
  return { ...palette, accent: palette.accent || accent };
}

function createSubjectArt(category: string, palette: CoverPalette, variant: number, emoji: string): string {
  const stroke = palette.paper;
  if (category.includes('Artificial') || category.includes('Machine')) {
    const nodes = [
      [390, 280, 18], [500, 230, 11], [470, 345, 15], [350, 390, 10], [545, 410, 16],
    ];
    return `<g opacity=".92" fill="${stroke}" stroke="${palette.accent}" stroke-width="4">${nodes.map(([x, y, r]) => `<line x1="390" y1="280" x2="${x}" y2="${y}" opacity=".55"/><circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}<circle cx="390" cy="280" r="28" fill="none"/><text x="390" y="292" text-anchor="middle" font-size="25" fill="${palette.accent}" stroke="none">${escapeXml(emoji)}</text></g>`;
  }
  if (category.includes('Data') || category.includes('Business')) {
    return `<g fill="none" stroke="${stroke}" stroke-width="8" opacity=".9"><path d="M350 390V300M420 390V250M490 390V325M560 390V210"/><path d="M330 420L390 350 445 370 510 285 570 310" stroke="${palette.accent}" stroke-width="6"/><circle cx="390" cy="350" r="8" fill="${palette.accent}"/><circle cx="510" cy="285" r="8" fill="${palette.accent}"/></g>`;
  }
  if (category.includes('Database')) {
    return `<g fill="none" stroke="${stroke}" stroke-width="6" opacity=".92"><ellipse cx="455" cy="260" rx="102" ry="30"/><path d="M353 260V405C353 450 557 450 557 405V260"/><path d="M353 330C353 375 557 375 557 330"/><path d="M353 400C353 445 557 445 557 400"/><circle cx="455" cy="260" r="15" fill="${palette.accent}" stroke="none"/></g>`;
  }
  if (category.includes('Web')) {
    return `<g opacity=".94"><rect x="338" y="225" width="238" height="166" rx="14" fill="${palette.deep}" stroke="${stroke}" stroke-width="5"/><circle cx="365" cy="252" r="7" fill="${palette.accent}"/><circle cx="389" cy="252" r="7" fill="${stroke}"/><path d="M364 306H545M364 336H488M364 366H520" stroke="${palette.accent}" stroke-width="9" stroke-linecap="round"/><path d="M450 445L500 405 535 438" fill="none" stroke="${stroke}" stroke-width="8"/></g>`;
  }
  if (category.includes('Cyber')) {
    return `<g opacity=".95"><path d="M460 205L555 245V330C555 408 510 452 460 478 410 452 365 408 365 330V245Z" fill="none" stroke="${stroke}" stroke-width="8"/><path d="M414 337L445 368 512 292" fill="none" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M340 250H300M620 250H580M340 410H300M620 410H580" stroke="${palette.accent}" stroke-width="5"/></g>`;
  }
  if (category.includes('Network')) {
    return `<g fill="${stroke}" stroke="${palette.accent}" stroke-width="5" opacity=".94"><path d="M370 300L470 240 545 340 420 420 370 300Z" fill="none"/><circle cx="370" cy="300" r="18"/><circle cx="470" cy="240" r="18"/><circle cx="545" cy="340" r="18"/><circle cx="420" cy="420" r="18"/></g>`;
  }
  if (category.includes('Programming') || category.includes('Computer')) {
    return `<g opacity=".95"><rect x="330" y="230" width="250" height="180" rx="14" fill="${palette.deep}" stroke="${stroke}" stroke-width="5"/><text x="360" y="285" fill="${palette.accent}" font-size="28" font-family="monospace">&lt;/&gt;</text><path d="M360 325H540M360 355H500M360 385H525" stroke="${stroke}" stroke-width="8" stroke-linecap="round"/></g>`;
  }
  return `<g opacity=".92"><circle cx="460" cy="320" r="112" fill="none" stroke="${stroke}" stroke-width="5"/><path d="M350 320H570M460 210V430M382 242L538 398M538 242L382 398" stroke="${palette.accent}" stroke-width="4"/><text x="460" y="342" text-anchor="middle" font-size="62" fill="${stroke}">${escapeXml(emoji)}</text></g>`;
}

function createCoverImage(title: string, author: string, category: string, accent: string, emoji: string): string {
  const palette = getPalette(category, title, accent);
  const variant = hashValue(title) % 3;
  const titleLines = wrapTitle(title, variant === 1 ? 16 : 19).map((line, index) => `<tspan x="48" dy="${index === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`).join('');
  const shortCategory = category.length > 22 ? `${category.slice(0, 20)}...` : category;
  const subtitle = variant === 0 ? 'A practical guide for curious minds' : variant === 1 ? 'Concepts, systems and practice' : 'Foundations for the digital age';
  const art = createSubjectArt(category, palette, variant, emoji);
  const titleY = variant === 2 ? 190 : 500;
  const artTransform = variant === 2 ? 'translate(0 300)' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840">
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.base}"/><stop offset="1" stop-color="${palette.deep}"/></linearGradient>
      <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity=".2"/><stop offset=".16" stop-color="#fff" stop-opacity="0"/><stop offset=".84" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
      <pattern id="grain" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="4" r=".8" fill="#fff" opacity=".08"/><circle cx="11" cy="13" r=".6" fill="#000" opacity=".1"/></pattern>
    </defs>
    <rect width="600" height="840" fill="url(#paper)"/>
    <rect width="600" height="840" fill="url(#grain)"/>
    <rect x="26" y="26" width="548" height="788" fill="none" stroke="${palette.paper}" stroke-opacity=".45" stroke-width="2"/>
    <path d="M38 110H562" stroke="${palette.accent}" stroke-width="4"/>
    <text x="48" y="82" fill="${palette.paper}" font-size="15" font-family="Arial,sans-serif" font-weight="700" letter-spacing="3">LIBRASMART PRESS</text>
    <text x="48" y="112" fill="${palette.paper}" opacity=".72" font-size="12" font-family="Arial,sans-serif" letter-spacing="2">${escapeXml(shortCategory.toUpperCase())} / VOL. 01</text>
    <g transform="${artTransform}">${art}</g>
    <text x="48" y="${titleY}" fill="${palette.ink}" font-size="${variant === 1 ? 34 : 39}" font-family="${palette.font}" font-weight="700">${titleLines}</text>
    <text x="48" y="${titleY + 132}" fill="${palette.paper}" opacity=".82" font-size="15" font-family="Arial,sans-serif" letter-spacing="1">${escapeXml(subtitle)}</text>
    <path d="M48 ${titleY + 165}H205" stroke="${palette.accent}" stroke-width="5"/>
    <text x="48" y="${titleY + 210}" fill="${palette.ink}" font-size="19" font-family="${palette.font}">${escapeXml(author)}</text>
    <text x="48" y="778" fill="${palette.paper}" opacity=".76" font-size="12" font-family="Arial,sans-serif" letter-spacing="2">SMART LIBRARY COLLECTION</text>
    <rect width="600" height="840" fill="url(#edge)"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function BookCover({ book, title, author, category, accent, emoji, size = 'card', className = '' }: BookCoverProps) {
  const resolvedTitle = book?.title ?? title ?? 'Library title';
  const resolvedAuthor = book?.author ?? author ?? 'LibraSmart Library';
  const resolvedCategory = book?.category ?? category ?? 'Library collection';
  const resolvedAccent = book?.coverAccent ?? accent ?? '#334155';
  const resolvedEmoji = book?.coverEmoji ?? emoji ?? '📚';
  const [hasError, setHasError] = useState(false);
  const image = useMemo(
    () => createCoverImage(resolvedTitle, resolvedAuthor, resolvedCategory, resolvedAccent, resolvedEmoji),
    [resolvedAccent, resolvedAuthor, resolvedCategory, resolvedEmoji, resolvedTitle]
  );

  return (
    <div className={`book-cover-frame ${size} ${className}`}>
      {hasError ? (
        <div className="book-cover-fallback">
          <span>📚</span>
          <strong>LibraSmart</strong>
          <small>{resolvedTitle}</small>
        </div>
      ) : (
        <img src={image} alt={`${resolvedTitle} book cover`} onError={() => setHasError(true)} />
      )}
    </div>
  );
}
