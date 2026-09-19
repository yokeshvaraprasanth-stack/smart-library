const PALETTE = [
  { bg: '#2563eb', icon: '🐍' }, // Programming
  { bg: '#7c3aed', icon: '🤖' }, // Artificial Intelligence
  { bg: '#0891b2', icon: '📊' }, // Data Science
  { bg: '#334155', icon: '🗄️' }, // Database
  { bg: '#0d9488', icon: '🌐' }, // Networking
  { bg: '#b45309', icon: '💻' }, // Operating Systems
  { bg: '#be185d', icon: '🧠' }, // Machine Learning
  { bg: '#15803d', icon: '🖥️' }, // Web Development
];

const CATEGORY_INDEX: Record<string, number> = {
  Programming: 0,
  'Artificial Intelligence': 1,
  'Data Science': 2,
  Database: 3,
  Networking: 4,
  'Operating Systems': 5,
  'Machine Learning': 6,
  'Web Development': 7,
};

export function categoryStyle(category: string): { bg: string; icon: string } {
  const idx = CATEGORY_INDEX[category];
  if (idx !== undefined) return PALETTE[idx];
  // Fallback: hash the string for any custom category the librarian adds.
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
