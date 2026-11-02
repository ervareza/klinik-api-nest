import { assertIfMatch, toEtag } from './etag.util';

const statusOf = (fn: () => void) => {
  try {
    fn();
    return 0;
  } catch (e) {
    return (e as { getStatus(): number }).getStatus();
  }
};

describe('etag.util', () => {
  it('[UNIT-03] membentuk ETag dari versi', () => expect(toEtag(3)).toBe('"3"'));
  it('[UNIT-04] If-Match kosong menghasilkan 428', () => expect(statusOf(() => assertIfMatch(undefined, 1))).toBe(428));
  it('[UNIT-05] If-Match lama menghasilkan 412', () => expect(statusOf(() => assertIfMatch('"1"', 2))).toBe(412));
  it('[UNIT-06] If-Match cocok lolos', () => expect(statusOf(() => assertIfMatch('"2"', 2))).toBe(0));
});
