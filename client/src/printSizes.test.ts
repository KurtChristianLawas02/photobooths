import { describe, expect, it } from 'vitest';
import { PRINT_SIZES } from '@photobooth/shared';

describe('print size catalog', () => {
  it('contains the required portrait pixel dimensions', () => {
    expect(PRINT_SIZES['2x6']).toMatchObject({ widthPixels: 1200, heightPixels: 3600, aspectRatio: '1:3' });
    expect(PRINT_SIZES['4x6']).toMatchObject({ widthPixels: 2400, heightPixels: 3600, aspectRatio: '2:3' });
    expect(PRINT_SIZES['5x7']).toMatchObject({ widthPixels: 3000, heightPixels: 4200, aspectRatio: '5:7' });
    expect(PRINT_SIZES['6x8']).toMatchObject({ widthPixels: 3600, heightPixels: 4800, aspectRatio: '3:4' });
  });
});
