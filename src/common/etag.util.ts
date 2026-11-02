import { ProblemException } from './problem.exception';

export const toEtag = (version: number): string => `"${version}"`;

/**
 * Validasi header If-Match terhadap versi data saat ini.
 * Header wajib ada (428) dan harus cocok (412) agar tidak terjadi lost update.
 */
export function assertIfMatch(ifMatch: string | undefined, currentVersion: number): void {
  if (!ifMatch) {
    throw new ProblemException(
      428,
      'PRECONDITION_REQUIRED',
      'Header If-Match wajib dikirim',
      'Ambil ETag terbaru lewat GET, lalu kirim sebagai header If-Match.',
    );
  }
  if (ifMatch !== '*' && ifMatch !== toEtag(currentVersion)) {
    throw versionConflict();
  }
}

export const versionConflict = () =>
  new ProblemException(
    412,
    'VERSION_CONFLICT',
    'Versi data sudah berubah',
    'Data telah diubah pengguna lain. Ambil data terbaru lalu ulangi perubahan.',
  );
