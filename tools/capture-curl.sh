#!/usr/bin/env bash
# Merekam request-response nyata ke evidence/curl. Jalankan pada database hasil seed dengan server aktif.
B=http://localhost:3000/api/v1
OUT=evidence/curl
mkdir -p "$OUT"
run() {
  n=$1; shift
  { printf '$ curl -i'; for a in "$@"; do printf " '%s'" "$a"; done; echo; curl -s -i "$@"; echo; } > "$OUT/$n.txt"
}
J='Content-Type: application/json'; A='Accept: application/json'
BODY='{"medicalRecordNumber":"RM-000100","nik":"3273010000000100","fullName":"Budi Hartono","birthDate":"1992-08-17","gender":"MALE","phone":"+6281200000100","address":"Jl. Riau No. 7, Bandung"}'
run 01-get-list -H "$A" "$B/patients?gender=FEMALE&sortBy=fullName&sortOrder=asc&page=1&limit=2"
run 02-get-item -H "$A" "$B/patients/1"
run 03-post -X POST "$B/patients" -H "$J" -H "$A" -d "$BODY"
run 04-put -X PUT "$B/patients/6" -H "$J" -H "$A" -H 'If-Match: "1"' -d "${BODY/Budi Hartono/Budi Hartono Saputra}"
run 05-patch -X PATCH "$B/patients/6" -H "$J" -H "$A" -H 'If-Match: "2"' -d '{"phone":"+6281200000199"}'
run 06-delete -X DELETE "$B/patients/6" -H "$A"
run 07-400-validation -X POST "$B/patients" -H "$J" -H "$A" -d '{"medicalRecordNumber":"ABC","nik":"123","fullName":"A","birthDate":"12-03-1990","gender":"OTHER","phone":"abc"}'
run 08-404 -H "$A" "$B/patients/99999"
run 09-304 -H 'If-None-Match: "1"' "$B/patients/1"
run 10-cache-doctors -H "$A" "$B/doctors?specialty=UMUM"
run 11-content-type-salah -X POST "$B/patients" -H 'Content-Type: text/plain' -H "$A" -d "$BODY"
run 12-json-rusak -X POST "$B/patients" -H "$J" -d '{"nik":'
run 13-409-duplikat -X POST "$B/patients" -H "$J" -H "$A" -d '{"medicalRecordNumber":"RM-000001","nik":"3273010000000200","fullName":"Duplikat RM","birthDate":"1992-08-17","gender":"MALE","phone":"+6281200000100"}'
run 14-412-versi -X PATCH "$B/patients/1" -H "$J" -H 'If-Match: "9"' -d '{"phone":"+6281200000199"}'
run 15-428-tanpa-ifmatch -X PATCH "$B/patients/1" -H "$J" -d '{"phone":"+6281200000199"}'
run 16-appt-1 -X POST "$B/appointments" -H "$J" -d '{"patientId":1,"doctorId":3,"appointmentDate":"2035-06-15","complaint":"Anak demam dua hari"}'
run 17-appt-2 -X POST "$B/appointments" -H "$J" -d '{"patientId":2,"doctorId":3,"appointmentDate":"2035-06-15","complaint":"Anak batuk pilek"}'
run 18-appt-kuota-penuh -X POST "$B/appointments" -H "$J" -d '{"patientId":3,"doctorId":3,"appointmentDate":"2035-06-15","complaint":"Anak sakit perut"}'
run 19-appt-after-rollback -H "$A" "$B/appointments?doctorId=3&dateFrom=2035-06-15&dateTo=2035-06-15&sortBy=queueNumber&sortOrder=asc"
run 20-page-invalid -H "$A" "$B/patients?limit=101&sortBy=password"
run 21-page2-doctors -H "$A" "$B/doctors?page=2&limit=2&sortBy=fullName&sortOrder=asc"
run 22-accept-xml -H 'Accept: application/xml' "$B/doctors/1"
