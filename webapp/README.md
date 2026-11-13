# Aplikasi Input Data Demo Capreno (pengganti AppSheet)

Satu aplikasi web untuk semua 6 wilayah (SS, SS1, SS2, EJ, SUL, Sul 2). Petugas
login dengan username/PIN yang **sama persis** dengan yang sudah ada di tab
"Users" tiap sheet (tidak perlu akun baru) — sistem otomatis mendeteksi
wilayah mana petugas itu terdaftar. Setiap petugas hanya bisa melihat dan
mengedit demo miliknya sendiri; akun ber-role **Admin** bisa melihat/mengedit
semua demo di wilayahnya.

Tidak ada batas jumlah akun (beda dari AppSheet versi gratis yang maksimal 10
akun per aplikasi) — gratis selama berjalan di Google Apps Script.

## Cara deploy (dilakukan sekali oleh pemilik akun Google yang punya akses edit ke ke-6 spreadsheet)

1. Buka **script.google.com** → **New project**.
2. Beri nama project, misalnya "Input Data Demo Capreno".
3. Hapus isi file `Code.gs` bawaan, lalu salin-tempel isi tiap file dari folder
   `webapp/` di repo ini ke project Apps Script, dengan nama file **persis sama**:
   - `Code.gs`
   - `Auth.gs`
   - `Schema.gs`
   - `Index.html` (File → New → HTML file, beri nama `Index`)
   - `Stylesheet.html` (HTML file, nama `Stylesheet`)
   - `ClientScript.html` (HTML file, nama `ClientScript`)
4. Buka **Project Settings** (ikon gerigi) → centang **"Show appsscript.json manifest file in editor"**.
   Lalu buka file `appsscript.json` yang muncul di sidebar dan ganti isinya
   dengan isi `webapp/appsscript.json` di repo ini.
5. Klik **Deploy** → **New deployment**.
   - Klik ikon gerigi di sebelah "Select type" → pilih **Web app**.
   - Description: bebas, misalnya "v1".
   - **Execute as**: `Me` (akun kamu sendiri — ini penting, supaya aplikasi
     selalu jalan pakai akses Google kamu ke ke-6 spreadsheet, bukan akses
     orang yang sedang login).
   - **Who has access**: `Anyone` (supaya petugas bisa buka link tanpa perlu
     akun Google — mereka login pakai username/PIN sendiri di dalam aplikasi).
   - Klik **Deploy**.
6. Google akan minta otorisasi ("This app isn't verified") — klik **Advanced**
   → **Go to Input Data Demo Capreno (unsafe)** → **Allow**. Ini normal untuk
   script pribadi yang belum didaftarkan ke Google (tidak perlu proses
   verifikasi apa pun untuk pemakaian internal seperti ini).
7. Setelah deploy selesai, kamu akan dapat **Web app URL**. Itulah link yang
   dibagikan ke semua petugas (ganti link AppSheet lama).

## Update setelah ada perubahan kode

Setiap kali ada perubahan di file-file ini (`webapp/*.gs`, `webapp/*.html`):
1. Salin ulang isi file yang berubah ke project Apps Script (timpa yang lama).
2. **Deploy** → **Manage deployments** → klik ikon pensil pada deployment yang
   aktif → ganti **Version** ke **New version** → **Deploy**.
   (Membuat deployment baru dari nol akan mengganti URL-nya — selalu pakai
   "Manage deployments" supaya link yang sudah dibagikan ke petugas tetap sama.)

## Yang perlu diperhatikan

- **Menambah/menghapus petugas**: tetap edit langsung tab "Users" di
  spreadsheet terkait (User_Email, User_ID, Role, PIN) — sama seperti
  sebelumnya saat pakai AppSheet, tidak ada perubahan di sana.
- **Foto**: diupload langsung ke folder "Demo_Images" di Drive (folder yang
  sama dipakai dashboard & sistem monitoring yang sudah ada), dengan nama
  file yang konsisten dengan konvensi lama, jadi semua fitur yang sudah ada
  (fallback pencarian foto, backfill AI, dsb) tetap kompatibel.
- **Field dropdown** (Herbisida FP, Varietas, Pola Tanam, dst.) untuk versi
  pertama ini dibuat sebagai isian teks bebas (bukan dropdown dengan daftar
  pilihan), karena daftar pilihan aslinya tersimpan di konfigurasi Google
  Form lama, bukan di sheet-nya — kalau mau dropdown beneran, kasih tahu
  daftar pilihannya dan saya tambahkan.
- **Field yang dihitung otomatis** (skor Win-Lose, Hari Aplikasi, Tanggal
  7/14/21 HSA, Persentase selisih hasil panen) sengaja TIDAK ditampilkan di
  form input — kolom itu tetap dihitung oleh spreadsheet seperti biasa.
- Setiap sheet wilayah punya sedikit perbedaan kolom (beberapa kolom di Demo
  Sul 2 memang tidak ada, misalnya Kabupaten dan Timing Aplikasi) — form akan
  otomatis menyembunyikan field yang memang tidak ada di sheet wilayah itu.
