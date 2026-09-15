import { describe, expect, it } from 'vitest';
import { isValidTemplateDimensions } from '@photobooth/shared';

describe('template dimension validation', () => {
  it('accepts a valid portrait 4x6 template', () => {
    expect(isValidTemplateDimensions({
      physicalWidth: 4,
      physicalHeight: 6,
      widthPixels: 2400,
      heightPixels: 3600,
      dpi: 300,
      orientation: 'portrait',
      aspectRatio: '2:3',
    })).toBe(true);
  });

  it('rejects a landscape canvas declared as portrait', () => {
    expect(isValidTemplateDimensions({
      physicalWidth: 4,
      physicalHeight: 6,
      widthPixels: 3600,
      heightPixels: 2400,
      dpi: 300,
      orientation: 'portrait',
      aspectRatio: '2:3',
    })).toBe(false);
  });
});
