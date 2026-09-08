import { THEMES, type Theme } from './index';

/**
 * WCAG 2.1 contrast, guarding the palettes.
 *
 * These tokens carry real content at 11-12px: checklist item numbers, ICAO type
 * codes, speed units, section counts and the meta lines under each aircraft. The
 * night palette was the worst offender before this existed, which is backwards
 * for the theme meant to be read in the dark.
 */
const channel = (value: number) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};

export const contrastRatio = (a: string, b: string) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Tokens used for words. Borders and the leader dots are decorative. */
const FOREGROUNDS = ['text', 'textDim', 'textFaint', 'accent', 'ok', 'caution', 'warning'] as const;
/** Every background those words can land on. */
const SURFACES = ['bg', 'chrome', 'surface'] as const;

const AA_BODY_TEXT = 4.5;

describe('theme contrast', () => {
  for (const [name, theme] of Object.entries(THEMES) as [string, Theme][]) {
    describe(name, () => {
      for (const foreground of FOREGROUNDS) {
        it(`${foreground} is readable on every surface`, () => {
          // Collected rather than asserted one at a time, so a failure names the
          // surface and the ratio instead of just saying a number was too small.
          const failures = SURFACES.map((surface) => ({
            surface,
            ratio: Number(contrastRatio(theme[foreground], theme[surface]).toFixed(2)),
          })).filter((result) => result.ratio < AA_BODY_TEXT);

          expect(failures).toEqual([]);
        });
      }

      // Three levels of emphasis are useless if two of them look the same.
      it('keeps its three text levels distinguishable', () => {
        const strong = contrastRatio(theme.text, theme.bg);
        const dim = contrastRatio(theme.textDim, theme.bg);
        const faint = contrastRatio(theme.textFaint, theme.bg);
        expect(strong).toBeGreaterThan(dim);
        expect(dim).toBeGreaterThan(faint);
      });
    });
  }
});
