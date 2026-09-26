export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (a, b) => a + Math.random() * (b - a);
/** Nombre au format français (virgule décimale). */
export const fmt = n => String(n).replace('.', ',');
