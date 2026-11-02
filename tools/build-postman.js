// Membangun Postman Collection v2.1 Klinik REST API. Jalankan: node tools/build-postman.js
const fs = require('fs');

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
const FUTURE = '2035-06-15';

const patient = {
  medicalRecordNumber: 'RM-000100',
  nik: '3273010000000100',
  fullName: 'Budi Hartono',
  birthDate: '1992-08-17',
  gender: 'MALE',
  phone: '+6281200000100',
  address: 'Jl. Riau No. 7, Bandung',
};
const doctor = { licenseNumber: 'SIP-2024-0100', fullName: 'dr. Rina Kartika', specialty: 'UMUM', dailyQuota: 15 };

const status = (code) => `pm.test('Status ${code}', () => pm.response.to.have.status(${code}));`;
const fast = "pm.test('Waktu respons di bawah 1 detik', () => pm.expect(pm.response.responseTime).to.be.below(1000));";
const isJson = "pm.test('Content-Type JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));";
const problem = (code) => [
  "pm.test('Format Problem Details', () => {",
  "  pm.expect(pm.response.headers.get('Content-Type')).to.include('application/problem+json');",
  "  pm.expect(pm.response.json()).to.include.keys('type', 'title', 'status', 'detail', 'instance', 'code');",
  '});',
  `pm.test('Kode error ${code}', () => pm.expect(pm.response.json().code).to.eql('${code}'));`,
].join('\n');

/** ok(name, ...) untuk skenario berhasil, err(name, ...) untuk skenario error. */
const ok = (name, method, path, docs, code, opts = {}) => ({ ...opts, name, method, path, docs, tests: [status(code), fast, ...(code === 204 ? [] : [isJson]), ...(opts.tests ?? [])] });
const err = (name, method, path, docs, code, errCode, opts = {}) => ({ ...opts, name, method, path, docs, tests: [status(code), problem(errCode), ...(opts.tests ?? [])] });

const folders = [
  {
    name: '1. Pasien - CRUD',
    description: 'Siklus lengkap resource pasien: daftar, tambah, detail, ganti seluruh data, ubah sebagian, dan hapus. PUT dan PATCH wajib mengirim header If-Match berisi ETag terbaru.',
    items: [
      ok('Daftar pasien (filter, sorting, pagination)', 'GET', '/patients?gender=FEMALE&sortBy=fullName&sortOrder=asc&page=1&limit=2', 'Mengambil pasien perempuan, diurutkan menurut nama, dua data per halaman.', 200, {
        tests: ["pm.test('Meta pagination sesuai', () => {\n  const { meta } = pm.response.json();\n  pm.expect(meta.page).to.eql(1);\n  pm.expect(meta.limit).to.eql(2);\n});"],
      }),
      ok('Tambah pasien', 'POST', '/patients', 'Mendaftarkan pasien baru. Respons memuat header Location dan ETag.', 201, {
        body: patient,
        tests: ["pm.test('Header Location dan ETag ada', () => {\n  pm.response.to.have.header('Location');\n  pm.response.to.have.header('ETag');\n});\npm.collectionVariables.set('patientId', pm.response.json().id);"],
      }),
      ok('Detail pasien', 'GET', '/patients/{{patientId}}', 'Membaca satu pasien dan menyimpan ETag untuk perubahan berikutnya.', 200, {
        tests: ["pm.test('Data sesuai', () => pm.expect(pm.response.json().medicalRecordNumber).to.eql('RM-000100'));\npm.collectionVariables.set('etag', pm.response.headers.get('ETag'));"],
      }),
      ok('Ganti seluruh data pasien', 'PUT', '/patients/{{patientId}}', 'Mengganti seluruh representasi pasien. Versi data naik menjadi 2.', 200, {
        headers: { 'If-Match': '{{etag}}' },
        body: { ...patient, fullName: 'Budi Hartono Saputra' },
        tests: ["pm.test('Versi naik menjadi 2', () => pm.expect(pm.response.json().version).to.eql(2));\npm.collectionVariables.set('etag', pm.response.headers.get('ETag'));"],
      }),
      ok('Ubah sebagian data pasien', 'PATCH', '/patients/{{patientId}}', 'Hanya nomor telepon yang berubah; field lain tetap.', 200, {
        headers: { 'If-Match': '{{etag}}' },
        body: { phone: '+6281200000199' },
        tests: ["pm.test('Hanya telepon berubah', () => {\n  const body = pm.response.json();\n  pm.expect(body.phone).to.eql('+6281200000199');\n  pm.expect(body.fullName).to.eql('Budi Hartono Saputra');\n  pm.expect(body.version).to.eql(3);\n});"],
      }),
      ok('Hapus pasien', 'DELETE', '/patients/{{patientId}}', 'Menghapus pasien tanpa riwayat janji temu. Respons 204 tanpa body.', 204, {
        tests: ["pm.test('Body kosong', () => pm.expect(pm.response.text()).to.eql(''));"],
      }),
    ],
  },
  {
    name: '2. Dokter - CRUD',
    description: 'CRUD dokter. Daftar dokter boleh di-cache karena bukan data sensitif.',
    items: [
      ok('Daftar dokter aktif', 'GET', '/doctors?isActive=true&sortBy=fullName&sortOrder=asc', 'Filter dokter aktif. Respons memakai Cache-Control public, max-age=60.', 200, {
        tests: ["pm.test('Boleh di-cache 60 detik', () => pm.expect(pm.response.headers.get('Cache-Control')).to.eql('public, max-age=60'));"],
      }),
      ok('Tambah dokter', 'POST', '/doctors', 'Menambah dokter baru dengan nomor SIP unik.', 201, {
        body: doctor,
        tests: ["pm.collectionVariables.set('doctorId', pm.response.json().id);"],
      }),
      ok('Detail dokter', 'GET', '/doctors/{{doctorId}}', 'Membaca satu dokter.', 200),
      ok('Ganti seluruh data dokter', 'PUT', '/doctors/{{doctorId}}', 'Mengganti data dokter, termasuk kuota harian.', 200, {
        body: { ...doctor, dailyQuota: 25 },
        tests: ["pm.test('Kuota berubah', () => pm.expect(pm.response.json().dailyQuota).to.eql(25));"],
      }),
      ok('Hapus dokter', 'DELETE', '/doctors/{{doctorId}}', 'Menghapus dokter tanpa riwayat janji temu.', 204),
    ],
  },
  {
    name: '3. Janji Temu - Transaksi',
    description: 'Pemesanan berjalan dalam transaksi database. Dokter id 3 memiliki kuota 2 pasien per hari: pesanan ketiga di-ROLLBACK.',
    items: [
      ok('Pesan janji temu (COMMIT)', 'POST', '/appointments', 'Pesanan pertama. Server menentukan nomor antrean.', 201, {
        body: { patientId: 1, doctorId: 3, appointmentDate: FUTURE, complaint: 'Anak demam dua hari' },
        tests: ["pm.test('Antrean nomor 1', () => pm.expect(pm.response.json().queueNumber).to.eql(1));\npm.collectionVariables.set('appointmentId', pm.response.json().id);"],
      }),
      ok('Pesan janji temu kedua (COMMIT)', 'POST', '/appointments', 'Pesanan kedua mengisi kuota terakhir.', 201, {
        body: { patientId: 2, doctorId: 3, appointmentDate: FUTURE, complaint: 'Anak batuk pilek' },
        tests: ["pm.test('Antrean nomor 2', () => pm.expect(pm.response.json().queueNumber).to.eql(2));"],
      }),
      err('Kuota penuh (ROLLBACK)', 'POST', '/appointments', 'Pesanan ketiga sempat di-insert, lalu dibatalkan karena kuota terlampaui.', 409, 'QUOTA_FULL', {
        body: { patientId: 3, doctorId: 3, appointmentDate: FUTURE, complaint: 'Anak sakit perut' },
      }),
      ok('Bukti rollback: hanya 2 janji', 'GET', `/appointments?doctorId=3&dateFrom=${FUTURE}&dateTo=${FUTURE}&sortBy=queueNumber&sortOrder=asc`, 'Membuktikan pesanan ketiga tidak tersimpan.', 200, {
        tests: ["pm.test('Total 2 janji', () => pm.expect(pm.response.json().meta.totalItems).to.eql(2));"],
      }),
      ok('Pasien hadir (CHECKED_IN)', 'PATCH', '/appointments/{{appointmentId}}', 'Mengubah status janji temu.', 200, {
        body: { status: 'CHECKED_IN' },
        tests: ["pm.test('Status berubah', () => pm.expect(pm.response.json().status).to.eql('CHECKED_IN'));"],
      }),
      err('Transisi status tidak sah', 'PATCH', '/appointments/1', 'SCHEDULED tidak boleh langsung menjadi COMPLETED.', 409, 'INVALID_STATUS_TRANSITION', {
        body: { status: 'COMPLETED' },
      }),
    ],
  },
  {
    name: '4. Error 400 - Validasi Gagal',
    description: 'Input tidak valid ditolak dengan format Problem Details.',
    items: [
      err('Banyak field tidak valid', 'POST', '/patients', 'Respons menyebutkan kesalahan untuk tiap field.', 400, 'VALIDATION_ERROR', {
        body: { medicalRecordNumber: 'ABC', nik: '123', fullName: 'A', birthDate: '12-03-1990', gender: 'OTHER', phone: 'abc' },
        tests: ["pm.test('Daftar error per field', () => pm.expect(pm.response.json().errors).to.be.an('array').that.is.not.empty);"],
      }),
      err('JSON rusak', 'POST', '/patients', 'Body bukan JSON yang valid menghasilkan 400, bukan 500.', 400, 'INVALID_JSON', { raw: '{"nik":' }),
      err('ID bukan angka', 'GET', '/patients/abc', 'ID harus bilangan bulat positif.', 400, 'INVALID_ID'),
      err('Parameter query di luar batas', 'GET', '/patients?limit=101&sortBy=password', 'limit maksimal 100 dan sortBy dibatasi daftar putih.', 400, 'VALIDATION_ERROR'),
    ],
  },
  {
    name: '5. Error 404 - Tidak Ditemukan',
    description: 'Resource yang diminta tidak ada.',
    items: [
      err('Pasien tidak ada', 'GET', '/patients/99999', 'ID tidak terdaftar.', 404, 'PATIENT_NOT_FOUND'),
      err('Dokter tidak ada', 'GET', '/doctors/99999', 'ID tidak terdaftar.', 404, 'DOCTOR_NOT_FOUND'),
      err('Janji temu tidak ada', 'GET', '/appointments/99999', 'ID tidak terdaftar.', 404, 'APPOINTMENT_NOT_FOUND'),
    ],
  },
  {
    name: '6. Error 409 - Konflik Data',
    description: 'Permintaan bentrok dengan data yang sudah ada.',
    items: [
      err('Nomor rekam medis duplikat', 'POST', '/patients', 'Constraint UNIQUE pada medical_record_number.', 409, 'MEDICAL_RECORD_NUMBER_EXISTS', {
        body: { ...patient, medicalRecordNumber: 'RM-000001' },
      }),
      err('NIK duplikat', 'POST', '/patients', 'Constraint UNIQUE pada nik.', 409, 'NIK_EXISTS', {
        body: { ...patient, nik: '3273011203900001' },
      }),
      err('Hapus pasien yang punya janji', 'DELETE', '/patients/1', 'Foreign key RESTRICT mencegah riwayat terlepas.', 409, 'PATIENT_HAS_APPOINTMENTS'),
    ],
  },
  {
    name: '7. ETag dan Konkurensi',
    description: 'If-Match mencegah lost update; If-None-Match menghemat transfer data.',
    items: [
      ok('Baca ETag pasien', 'GET', '/patients/5', 'Mengambil ETag terbaru.', 200, {
        tests: ["pm.collectionVariables.set('etag5', pm.response.headers.get('ETag'));"],
      }),
      {
        name: 'Data belum berubah (304)', method: 'GET', path: '/patients/5', docs: 'ETag masih cocok, server menjawab tanpa body.',
        // Postman secara bawaan mengirim Cache-Control: no-cache, yang membuat server wajib mengirim ulang data
        headers: { 'If-None-Match': '{{etag5}}', 'Cache-Control': 'max-age=0' }, tests: [status(304)],
      },
      err('ETag lama (412)', 'PATCH', '/patients/5', 'Versi di klien berbeda dari server, perubahan ditolak.', 412, 'VERSION_CONFLICT', {
        headers: { 'If-Match': '"99"' }, body: { phone: '+6281200000155' },
      }),
      err('Tanpa If-Match (428)', 'PATCH', '/patients/5', 'Header If-Match wajib untuk perubahan data pasien.', 428, 'PRECONDITION_REQUIRED', {
        body: { phone: '+6281200000155' },
      }),
    ],
  },
];

function toItem(t) {
  const [pathname, query = ''] = t.path.split('?');
  const baseHeaders = t.body !== undefined || t.raw !== undefined ? JSON_HEADERS : { Accept: 'application/json' };
  const header = Object.entries({ ...baseHeaders, ...(t.headers ?? {}) }).map(([key, value]) => ({ key, value }));
  const rawBody = t.raw ?? (t.body !== undefined ? JSON.stringify(t.body, null, 2) : undefined);
  return {
    name: t.name,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: t.tests.join('\n').split('\n') } }],
    request: {
      method: t.method,
      description: t.docs,
      header,
      url: {
        raw: `{{baseUrl}}${t.path}`,
        host: ['{{baseUrl}}'],
        path: pathname.split('/').filter(Boolean),
        query: query.split('&').filter(Boolean).map((q) => ({ key: q.split('=')[0], value: q.split('=')[1] })),
      },
      ...(rawBody !== undefined ? { body: { mode: 'raw', raw: rawBody, options: { raw: { language: 'json' } } } } : {}),
    },
  };
}

const collection = {
  info: {
    name: 'Klinik REST API',
    description: 'Tugas API Development dan Microservices - Ervareza Naurian Novantila (24.01.53.0018).\n\nPengujian pasien, dokter, dan janji temu. Jalankan `npm run seed` sebelum menjalankan seluruh collection.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: ['patientId', 'doctorId', 'appointmentId', 'etag', 'etag5'].reduce(
    (vars, key) => [...vars, { key, value: '' }],
    [{ key: 'baseUrl', value: 'http://localhost:3000/api/v1' }],
  ),
  item: folders.map((f) => ({ name: f.name, description: f.description, item: f.items.map(toItem) })),
};

fs.writeFileSync('postman/klinik-api.postman_collection.json', JSON.stringify(collection, null, 2));
console.log(`${folders.length} folder, ${folders.reduce((n, f) => n + f.items.length, 0)} request`);
