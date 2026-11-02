import { Test } from '@nestjs/testing';
import { Patient } from './patient.entity';
import { PatientsRepository } from './patients.repository';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let service: PatientsService;
  const repo = {
    findById: jest.fn(),
    findPage: jest.fn(),
    insert: jest.fn(),
    updateIfVersion: jest.fn(),
    deleteById: jest.fn(),
  };
  const stored = { id: 1, version: 2, fullName: 'Siti' } as Patient;

  beforeEach(async () => {
    jest.resetAllMocks();
    // Dependency injection: repository nyata diganti mock lewat container Nest
    const moduleRef = await Test.createTestingModule({
      providers: [PatientsService, { provide: PatientsRepository, useValue: repo }],
    }).compile();
    service = moduleRef.get(PatientsService);
  });

  it('[UNIT-16] get melempar 404 bila pasien tidak ada', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.get(9)).rejects.toMatchObject({ code: 'PATIENT_NOT_FOUND' });
  });

  it('[UNIT-17] patch tanpa If-Match ditolak 428 dan tidak menyentuh database', async () => {
    repo.findById.mockResolvedValue(stored);
    await expect(service.patch(1, { fullName: 'Baru' })).rejects.toMatchObject({ code: 'PRECONDITION_REQUIRED' });
    expect(repo.updateIfVersion).not.toHaveBeenCalled();
  });

  it('[UNIT-18] patch memakai versi terbaca untuk update atomik', async () => {
    repo.findById.mockResolvedValue(stored);
    repo.updateIfVersion.mockResolvedValue(true);
    await service.patch(1, { fullName: 'Baru' }, '"2"');
    expect(repo.updateIfVersion).toHaveBeenCalledWith(1, 2, { fullName: 'Baru' });
  });

  it('[UNIT-19] update kalah balapan (affected 0) menghasilkan 412', async () => {
    repo.findById.mockResolvedValue(stored);
    repo.updateIfVersion.mockResolvedValue(false);
    await expect(service.patch(1, { fullName: 'Baru' }, '"2"')).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('[UNIT-20] body patch kosong ditolak', async () => {
    await expect(service.patch(1, {}, '"2"')).rejects.toMatchObject({ code: 'EMPTY_PATCH' });
  });

  it('[UNIT-21] tanggal lahir masa depan ditolak', async () => {
    await expect(service.patch(1, { birthDate: '2999-01-01' }, '"2"')).rejects.toMatchObject({ code: 'BIRTH_DATE_IN_FUTURE' });
  });
});
