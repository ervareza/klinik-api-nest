import { IdParamPipe } from './id-param.pipe';
import { ProblemException } from './problem.exception';

describe('IdParamPipe', () => {
  const pipe = new IdParamPipe();

  it('[UNIT-01] menerima bilangan bulat positif', () => {
    expect(pipe.transform('42')).toBe(42);
  });

  it.each(['abc', '0', '-1', '1.5', '', '2147483648'])('[UNIT-02] menolak ID tidak valid: "%s"', (value) => {
    expect(() => pipe.transform(value)).toThrow(ProblemException);
  });
});
