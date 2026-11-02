import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Patient } from '../patients/patient.entity';
import dataSource from './data-source';

async function seed() {
  await dataSource.initialize();
  await dataSource.query('TRUNCATE appointments, patients, doctors RESTART IDENTITY CASCADE');

  const doctors = await dataSource.getRepository(Doctor).save([
    { licenseNumber: 'SIP-2024-0001', fullName: 'dr. Hendra Wijaya', specialty: 'UMUM', dailyQuota: 20 },
    { licenseNumber: 'SIP-2024-0002', fullName: 'drg. Maya Safitri', specialty: 'GIGI', dailyQuota: 10 },
    { licenseNumber: 'SIP-2024-0003', fullName: 'dr. Budi Santoso, Sp.A', specialty: 'ANAK', dailyQuota: 2 },
    { licenseNumber: 'SIP-2024-0004', fullName: 'dr. Dian Kusuma, Sp.PD', specialty: 'PENYAKIT_DALAM', dailyQuota: 15, isActive: false },
  ] as Doctor[]);

  const patients = await dataSource.getRepository(Patient).save([
    { medicalRecordNumber: 'RM-000001', nik: '3273011203900001', fullName: 'Siti Rahmawati', birthDate: '1990-03-12', gender: 'FEMALE', phone: '+6281234567001', address: 'Jl. Merdeka No. 10, Bandung' },
    { medicalRecordNumber: 'RM-000002', nik: '3273012505850002', fullName: 'Agus Setiawan', birthDate: '1985-05-25', gender: 'MALE', phone: '+6281234567002', address: 'Jl. Asia Afrika No. 5, Bandung' },
    { medicalRecordNumber: 'RM-000003', nik: '3273010707000003', fullName: 'Dewi Lestari', birthDate: '2000-07-07', gender: 'FEMALE', phone: '+6281234567003', address: null },
    { medicalRecordNumber: 'RM-000004', nik: '3273011111950004', fullName: 'Rizky Ramadhan', birthDate: '1995-11-11', gender: 'MALE', phone: '+6281234567004', address: 'Jl. Dago No. 21, Bandung' },
    { medicalRecordNumber: 'RM-000005', nik: '3273010101150005', fullName: 'Anisa Putri', birthDate: '2015-01-01', gender: 'FEMALE', phone: '+6281234567005', address: null },
  ] as Patient[]);

  await dataSource.getRepository(Appointment).save([
    { patientId: patients[0].id, doctorId: doctors[0].id, appointmentDate: '2030-01-15', queueNumber: 1, complaint: 'Demam dan batuk sejak tiga hari lalu' },
    { patientId: patients[1].id, doctorId: doctors[0].id, appointmentDate: '2030-01-15', queueNumber: 2, complaint: 'Kontrol tekanan darah' },
    { patientId: patients[3].id, doctorId: doctors[1].id, appointmentDate: '2030-01-16', queueNumber: 1, complaint: 'Sakit gigi geraham kiri' },
  ] as Appointment[]);

  await dataSource.destroy();
  console.log('Seed selesai: 4 dokter, 5 pasien, 3 janji temu');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
