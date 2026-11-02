// Membangun Postman Collection v2.1 CRUD Klinik; dijalankan sekali lalu hasilnya di-commit.
const fs = require('fs');
const json = { 'Content-Type': 'application/json', Accept: 'application/json' };
const newPatient = { medicalRecordNumber: 'RM-000100', nik: '3273010000000100', fullName: 'Pasien Postman', birthDate: '1992-08-17', gender: 'MALE', phone: '+6281200000100', address: 'Jl. Uji No. 1' };
const dup = { ...newPatient };
const steps = [
  ['Pasien - GET daftar + filter', 'GET', '/patients?gender=FEMALE&sortBy=fullName&sortOrder=asc&page=1&limit=2', null, {}, 200, "pm.test('meta pagination', () => pm.expect(pm.response.json().meta.limit).to.eql(2));"],
  ['Pasien - POST tambah', 'POST', '/patients', newPatient, {}, 201, "pm.collectionVariables.set('patientId', pm.response.json().id); pm.test('ETag ada', () => pm.response.to.have.header('ETag'));"],
  ['Pasien - GET detail', 'GET', '/patients/{{patientId}}', null, {}, 200, "pm.collectionVariables.set('etag', pm.response.headers.get('ETag'));"],
  ['Pasien - PUT ganti seluruh data', 'PUT', '/patients/{{patientId}}', { ...newPatient, fullName: 'Pasien Postman Diubah' }, { 'If-Match': '{{etag}}' }, 200, "pm.collectionVariables.set('etag', pm.response.headers.get('ETag'));"],
  ['Pasien - PATCH telepon', 'PATCH', '/patients/{{patientId}}', { phone: '+6281200000199' }, { 'If-Match': '{{etag}}' }, 200, "pm.test('versi 3', () => pm.expect(pm.response.json().version).to.eql(3));"],
  ['Error 412 - ETag lama', 'PATCH', '/patients/{{patientId}}', { phone: '+6281200000188' }, { 'If-Match': '"1"' }, 412, "pm.test('code', () => pm.expect(pm.response.json().code).to.eql('VERSION_CONFLICT'));"],
  ['Error 428 - tanpa If-Match', 'PATCH', '/patients/{{patientId}}', { phone: '+6281200000188' }, {}, 428, ''],
  ['Error 400 - NIK tidak valid', 'POST', '/patients', { ...newPatient, nik: '123' }, {}, 400, "pm.test('code', () => pm.expect(pm.response.json().code).to.eql('VALIDATION_ERROR'));"],
  ['Error 409 - NIK duplikat', 'POST', '/patients', dup, {}, 409, "pm.test('code', () => pm.expect(pm.response.json().code).to.eql('MEDICAL_RECORD_NUMBER_EXISTS'));"],
  ['Error 404 - pasien tidak ada', 'GET', '/patients/99999', null, {}, 404, ''],
  ['Pasien - DELETE', 'DELETE', '/patients/{{patientId}}', null, {}, 204, ''],
  ['Dokter - GET daftar', 'GET', '/doctors?isActive=true', null, {}, 200, ''],
  ['Janji temu - POST pesan', 'POST', '/appointments', { patientId: 3, doctorId: 3, appointmentDate: '2035-06-15', complaint: 'Anak demam dua hari' }, {}, 201, "pm.collectionVariables.set('appointmentId', pm.response.json().id);"],
  ['Janji temu - POST pesan kuota terakhir', 'POST', '/appointments', { patientId: 4, doctorId: 3, appointmentDate: '2035-06-15', complaint: 'Anak batuk pilek' }, {}, 201, ''],
  ['Error 409 - kuota penuh (rollback)', 'POST', '/appointments', { patientId: 5, doctorId: 3, appointmentDate: '2035-06-15', complaint: 'Anak sakit perut' }, {}, 409, "pm.test('code', () => pm.expect(pm.response.json().code).to.eql('QUOTA_FULL'));"],
  ['Janji temu - PATCH check-in', 'PATCH', '/appointments/{{appointmentId}}', { status: 'CHECKED_IN' }, {}, 200, ''],
  ['Janji temu - GET filter status', 'GET', '/appointments?status=CHECKED_IN', null, {}, 200, ''],
];
const item = steps.map(([name, method, path, body, headers, status, extra]) => ({
  name,
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: [`pm.test('status ${status}', () => pm.response.to.have.status(${status}));`, extra].filter(Boolean) } }],
  request: {
    method,
    header: Object.entries({ ...(body ? json : { Accept: 'application/json' }), ...headers }).map(([key, value]) => ({ key, value })),
    url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.split('?')[0].split('/').filter(Boolean), query: (path.split('?')[1] || '').split('&').filter(Boolean).map((q) => ({ key: q.split('=')[0], value: q.split('=')[1] })) },
    ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}),
  },
}));
fs.writeFileSync('postman/klinik-api.postman_collection.json', JSON.stringify({
  info: { name: 'Klinik REST API', description: 'CRUD pasien, dokter, janji temu. Jalankan pada database hasil seed.', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://localhost:3000/api/v1' }, { key: 'patientId', value: '' }, { key: 'etag', value: '' }, { key: 'appointmentId', value: '' }],
  item,
}, null, 2));
