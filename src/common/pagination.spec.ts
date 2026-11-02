import { likePattern, paginate } from './pagination';

describe('pagination', () => {
  it('[UNIT-07] menghitung meta halaman', () => {
    expect(paginate([1, 2], 25, 2, 10).meta).toEqual({
      page: 2, limit: 10, totalItems: 25, totalPages: 3, hasNextPage: true, hasPrevPage: true,
    });
  });
  it('[UNIT-08] data kosong tetap punya satu halaman', () => {
    expect(paginate([], 0, 1, 10).meta.totalPages).toBe(1);
  });
  it('[UNIT-09] wildcard LIKE di-escape', () => {
    expect(likePattern('50%_a')).toBe('%50\\%\\_a%');
  });
});
