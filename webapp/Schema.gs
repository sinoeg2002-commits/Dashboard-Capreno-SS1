/**
 * Shared schema for the Dashboard Capreno demo-input web app.
 * One Apps Script project serves all 6 territory spreadsheets; this file
 * defines which spreadsheet each territory maps to, and a canonical field
 * list with per-territory header aliases (since each territory's "Demo"
 * sheet has slightly different column names/casing, being independently
 * created from a Google Form in each territory).
 */

// ---- Territories --------------------------------------------------------
// label: shown to petugas after login (which territory they belong to).
// spreadsheetId: the Google Sheet this territory's Demo/Users tabs live in.
var TERRITORIES = {
  ss:   { label: 'Demo SS',     spreadsheetId: '1r-zQjPc_zq8gK0rKVzeFcnZIcGDYuRA3TjtXcyjGH6g' },
  ss1:  { label: 'Demo SS1',    spreadsheetId: '10LvebAU0WOKW6waN9wTY76G3L0-oFHVHRdbTRY7nt7I' },
  ss2:  { label: 'Demo SS2',    spreadsheetId: '1sJGHBPkl02KQR9TnIwAHyoKbHLSyuGN6Dy1tWgSeYBQ' },
  ej:   { label: 'Demo EJ',     spreadsheetId: '1oI4O-T3OHCrnIdLQAK_JjQAMpYc-4xf5m3OPN1XrDK0' },
  sul:  { label: 'Demo SUL',    spreadsheetId: '13FCZTPcuPSsZPdd2feFqVZKPUlA2dfbQhOLxSoG2HmM' },
  sul2: { label: 'Demo Sul 2',  spreadsheetId: '1kNqo2Nikrhxx7wFO7QcDnpc2DNGgWEhBUr2PHxwZpXY' }
};

function normalizeHeader_(s) {
  return (s === null || s === undefined ? '' : String(s)).trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Canonical field list. Each entry:
 *   key: stable internal name used everywhere in the app/payloads
 *   label: Indonesian label shown in the UI
 *   section: which screen/group this field belongs to (see SECTIONS below)
 *   type: 'text' | 'textarea' | 'number' | 'score' (1-4) | 'date' | 'select' | 'photo' | 'coords'
 *   options: for type 'select'
 *   headers: list of candidate header strings (normalized match) to find this
 *            column in a given territory's "Demo" sheet. The FIRST entry is
 *            used as the header text when a brand-new column must ever be
 *            created (should not normally happen).
 *   computed: true if this column is derived (Win-Lose scores, Hari aplikasi,
 *             Tanggal 7/14/21HSA, Persentase selisih hasil panen, etc.) and
 *             must never be shown as an input or written by this app.
 */
var FIELD_SCHEMA = [
  // ---------------- Setup / identitas (filled once, at creation) --------
  { key: 'kabupaten', label: 'Kabupaten', section: 'setup', type: 'text', headers: ['Kabupaten'] },
  { key: 'nomor_demo', label: 'Nomor Demo', section: 'setup', type: 'text', required: true,
    headers: ['Nomor Demo (ID-SS-nama DR-no urut demo mulai 01, 02, dst)'] },
  { key: 'nama_petani', label: 'Nama Petani', section: 'setup', type: 'text', required: true, headers: ['Nama Petani'] },
  { key: 'hp_petani', label: 'No HP Petani', section: 'setup', type: 'text', headers: ['No HP Petani'] },
  { key: 'lokasi_demo', label: 'Lokasi Demo', section: 'setup', type: 'text', required: true, headers: ['Lokasi Demo'] },
  { key: 'koordinat', label: 'Koordinat Lokasi Demo', section: 'setup', type: 'coords', headers: ['Koordinat Lokasi Demo'] },
  { key: 'foto_gulma_sulit', label: 'Foto Gulma yang Sulit Dikendalikan', section: 'setup', type: 'photo',
    headers: ['Foto Gulma yang sulit dikendalikan'] },
  { key: 'gulma_sulit', label: 'Gulma Utama yang Sulit Dikendalikan', section: 'setup', type: 'text',
    headers: ['Gulma utama yang sulit dikendalikan di area ini adalah (jika tidak ada di daftar, ketikkan nama gulma baru dan klik + )'] },
  { key: 'olah_tanah', label: 'Jenis Olah Tanah', section: 'setup', type: 'text',
    headers: ['Jenis olah tanah di lahan demo (jika tidak ada di daftar, ketikkan jenis olah tanah baru dan klik + )'] },
  { key: 'pola_tanam', label: 'Pola Tanam', section: 'setup', type: 'text',
    headers: ['Pola tanam di area lahan demo (jika tidak ada di daftar, ketikkan pola tanam baru dan klik + )'] },
  { key: 'herbisida_fp', label: 'Herbisida FP (Pembanding)', section: 'setup', type: 'text',
    headers: ['Herbisida FP (jika tidak ada di daftar, ketikkan nama produk dan klik + )'] },
  { key: 'varietas', label: 'Varietas Jagung', section: 'setup', type: 'text',
    headers: ['Varietas Jagung yang ditanam (jika tidak ada di daftar, ketikkan nama varietas baru dan klik + )'] },
  { key: 'timing', label: 'Timing Aplikasi (HST saat semprot)', section: 'setup', type: 'text', headers: ['Timing aplikasi'] },
  { key: 'tgl_tanam', label: 'Tanggal Tanam', section: 'setup', type: 'date', headers: ['Tanggal Tanam'] },
  { key: 'tgl_aplikasi', label: 'Tanggal Aplikasi', section: 'setup', type: 'date', required: true, headers: ['Tanggal Aplikasi'] },
  { key: 'jml_tank', label: 'Jumlah Tank / Hektar', section: 'setup', type: 'number', headers: ['Jumlah Tank per hektar dan kebutuhan produk per tank.'] },
  { key: 'takaran_capreno', label: 'Takaran Capreno / Tank (ml)', section: 'setup', type: 'number', headers: ['Takaran Capreno/tank (ml)'] },
  { key: 'takaran_atrazin', label: 'Takaran Atrazin / Tank (ml)', section: 'setup', type: 'number', headers: ['Takaran Atrazin/tank (ml)'] },
  { key: 'takaran_adjuvant', label: 'Takaran Adjuvant / Tank (ml)', section: 'setup', type: 'number', headers: ['Takaran Adjuvant/tank (ml)'] },
  { key: 'takaran_capreno_real', label: 'Takaran Capreno Real (ml/tank)', section: 'setup', type: 'number', headers: ['Takaran Capreno real (ml/tank)'] },
  { key: 'luasan_plot', label: 'Luasan Plot Capreno (m2)', section: 'setup', type: 'number', headers: ['Luasan plot Capreno (m2)'] },

  // ---------------- 0 HSA ------------------------------------------------
  { key: 'fase_daun_gulma', label: 'Fase Daun Gulma Saat Aplikasi', section: 'h0', type: 'text', headers: ['Fase daun gulma rumputan saat aplikasi'] },
  { key: 'foto_fp_0', label: 'Foto Plot FP (0 HSA)', section: 'h0', type: 'photo', headers: ['linkFotoFP0HSA'] },
  { key: 'foto_cap_0', label: 'Foto Plot Capreno (0 HSA)', section: 'h0', type: 'photo', headers: ['linkFotoCapreno0HSA'] },

  // ---------------- 7 HSA -------------------------------------------------
  { key: 'fp_7_umum', label: 'FP - Efikasi Gulma Umum', section: 'h7', type: 'score', headers: ['Plot Farmer Practice 7HSA. Efikasi ke gulma umum'] },
  { key: 'fp_7_khusus', label: 'FP - Efikasi Gulma Sulit Dikendalikan', section: 'h7', type: 'score', headers: ['Plot Farmer Practice 7HSA. Efikasi ke Gulma yang sulit dikendalikan'] },
  { key: 'fp_7_performa', label: 'FP - Performa Tanaman', section: 'h7', type: 'score', headers: ['Plot Farmer Practice 7HSA. Performa tanaman'] },
  { key: 'foto_fp_7', label: 'Foto Plot FP (7 HSA)', section: 'h7', type: 'photo', headers: ['linkFotoFP7HSA'] },
  { key: 'cap_7_umum', label: 'Capreno - Efikasi Gulma Umum', section: 'h7', type: 'score', headers: ['Plot Capreno7HSA.Efikasi ke gulma umum'] },
  { key: 'cap_7_khusus', label: 'Capreno - Efikasi Gulma Sulit Dikendalikan', section: 'h7', type: 'score', headers: ['Plot Capreno 7HSA.Efikasi ke Gulma yang sulit dikendalikan'] },
  { key: 'cap_7_performa', label: 'Capreno - Performa Tanaman', section: 'h7', type: 'score', headers: ['Plot Capreno 7HSA.Performa tanaman'] },
  { key: 'foto_cap_7', label: 'Foto Plot Capreno (7 HSA)', section: 'h7', type: 'photo', headers: ['linkFotoCapreno7HSA'] },
  { key: 'disukai_7', label: 'Plot yang Disukai (7 HSA)', section: 'h7', type: 'select', options: ['Plot FP', 'Plot Capreno', 'Sama'], headers: ['Plot yang disukai 7HSA'] },
  { key: 'alasan_7', label: 'Alasan Disukai (7 HSA)', section: 'h7', type: 'textarea', headers: ['Plot tersebut disukai karena (7HSA)'] },
  { key: 'lebih_baik_7', label: 'Lebih Baik untuk Gulma Sulit? (7 HSA)', section: 'h7', type: 'text',
    headers: ['Apakah produk herbi Bayer ini lebih baik untuk gulma-gulma yang selama ini sulit dikendalikan? (Eleusine indica, Roettboellia, Cyperus rotundus dst.) 7HSA'] },

  // ---------------- 14 HSA -------------------------------------------------
  { key: 'fp_14_umum', label: 'FP - Efikasi Gulma Umum', section: 'h14', type: 'score', headers: ['Plot Farmer Practice 14HSA. Efikasi ke gulma umum'] },
  { key: 'fp_14_khusus', label: 'FP - Efikasi Gulma Sulit Dikendalikan', section: 'h14', type: 'score', headers: ['Plot Farmer Practice 14HSA. Efikasi ke Gulma yang sulit dikendalikan'] },
  { key: 'fp_14_performa', label: 'FP - Performa Tanaman', section: 'h14', type: 'score', headers: ['Plot Farmer Practice 14HSA. Performa tanaman'] },
  { key: 'foto_fp_14', label: 'Foto Plot FP (14 HSA)', section: 'h14', type: 'photo', headers: ['linkFotoFP14HSA'] },
  { key: 'cap_14_umum', label: 'Capreno - Efikasi Gulma Umum', section: 'h14', type: 'score', headers: ['Plot Capreno 14HSA. Efikasi ke gulma umum'] },
  { key: 'cap_14_khusus', label: 'Capreno - Efikasi Gulma Sulit Dikendalikan', section: 'h14', type: 'score', headers: ['Plot Capreno 14HSA. Efikasi ke Gulma yang sulit dikendalikan'] },
  { key: 'cap_14_performa', label: 'Capreno - Performa Tanaman', section: 'h14', type: 'score', headers: ['Plot Capreno 14HSA. Performa tanaman'] },
  { key: 'foto_cap_14', label: 'Foto Plot Capreno (14 HSA)', section: 'h14', type: 'photo', headers: ['linkFotoCapreno14HSA'] },
  { key: 'disukai_14', label: 'Plot yang Disukai (14 HSA)', section: 'h14', type: 'select', options: ['Plot FP', 'Plot Capreno', 'Sama'], headers: ['Plot yang disukai (14HSA)'] },
  { key: 'alasan_14', label: 'Alasan Disukai (14 HSA)', section: 'h14', type: 'textarea', headers: ['Plot tersebut disukai karena (14HSA)'] },
  { key: 'lebih_baik_14', label: 'Lebih Baik untuk Gulma Sulit? (14 HSA)', section: 'h14', type: 'text',
    headers: ['Apakah produk herbi Bayer ini lebih baik untuk gulma-gulma yang selama ini sulit dikendalikan? (Eleusine indica, Roettboellia, Cyperus rotundus) 14HSA'] },

  // ---------------- 21 HSA -------------------------------------------------
  { key: 'fp_21_umum', label: 'FP - Efikasi Gulma Umum', section: 'h21', type: 'score', headers: ['Plot Farmer Practice 21HSA. Efikasi ke gulma umum'] },
  { key: 'fp_21_khusus', label: 'FP - Efikasi Gulma Sulit Dikendalikan', section: 'h21', type: 'score', headers: ['Plot Farmer Practice 21HSA. Efikasi ke gulma yang sulit dikendalikan'] },
  { key: 'fp_21_performa', label: 'FP - Performa Tanaman', section: 'h21', type: 'score', headers: ['Plot Farmer Practice 21HSA. Performa tanaman'] },
  { key: 'foto_fp_21', label: 'Foto Plot FP (21 HSA)', section: 'h21', type: 'photo', headers: ['linkFotoFP21HSA'] },
  { key: 'cap_21_umum', label: 'Capreno - Efikasi Gulma Umum', section: 'h21', type: 'score', headers: ['Plot Capreno 21HSA. Efikasi ke gulma umum'] },
  { key: 'cap_21_khusus', label: 'Capreno - Efikasi Gulma Sulit Dikendalikan', section: 'h21', type: 'score', headers: ['Plot Capreno 21HSA. Efikasi ke Gulma yang sulit dikendalikan'] },
  { key: 'cap_21_performa', label: 'Capreno - Performa Tanaman', section: 'h21', type: 'score',
    headers: ['Plot Capreno.Performa tanaman2', 'Plot Capreno 21.Performa tanaman2'] },
  { key: 'foto_cap_21', label: 'Foto Plot Capreno (21 HSA)', section: 'h21', type: 'photo', headers: ['linkFotoCapreno21HSA'] },
  { key: 'komentar_21', label: 'Komentar Petugas / Petani (21 HSA)', section: 'h21', type: 'textarea', headers: ['Komentar Petugas / petani 21HSA'] },
  { key: 'disukai_21', label: 'Plot yang Disukai (21 HSA)', section: 'h21', type: 'select', options: ['Plot FP', 'Plot Capreno', 'Sama'], headers: ['Plot yang disukai 21HSA'] },
  { key: 'alasan_21', label: 'Alasan Disukai (21 HSA)', section: 'h21', type: 'textarea', headers: ['Plot tersebut disukai karena (21HSA)'] },
  { key: 'lebih_baik_21', label: 'Lebih Baik untuk Gulma Sulit? (21 HSA)', section: 'h21', type: 'text',
    headers: ['Apakah produk herbi Bayer ini lebih baik untuk gulma-gulma yang selama ini sulit dikendalikan? (Eleusine indica, Roettboellia, Cyperus rotundus) 21HSA'] },

  // ---------------- Blind assessment (40-45 HST) ---------------------------
  { key: 'regrowth', label: 'Ada Gulma Re-growth? Jenisnya?', section: 'blind', type: 'text',
    headers: ['Adakah gulma yang tumbuh kembali (re-growth) di Plot FP dan Bayer? Kalau ada, apa jenis gulmanya?'] },
  { key: 'jml_petani_blind', label: 'Jumlah Petani Blind Assessment', section: 'blind', type: 'number', headers: ['Jumlah petani blind assessment'] },
  { key: 'fp_blind_kebersihan', label: 'FP - Total Skoring Kebersihan Gulma', section: 'blind', type: 'number', headers: ['FP - total skoring kebersihan gulma'] },
  { key: 'fp_blind_performa', label: 'FP - Total Skoring Performa Tanaman', section: 'blind', type: 'number', headers: ['FP - total skoring performa tanaman'] },
  { key: 'cap_blind_kebersihan', label: 'Capreno - Total Skoring Kebersihan Gulma', section: 'blind', type: 'number', headers: ['Capreno - total skoring kebersihan gulma'] },
  { key: 'cap_blind_performa', label: 'Capreno - Total Skoring Performa Tanaman', section: 'blind', type: 'number', headers: ['Capreno - total skoring performa tanaman'] },
  { key: 'komentar_petani', label: 'Komentar Petani', section: 'blind', type: 'textarea', headers: ['Komentar Petani'] },
  { key: 'foto_blind_1', label: 'Foto 1 Blind Assessment', section: 'blind', type: 'photo', headers: ['linkFotoFP40HSA'] },
  { key: 'foto_blind_2', label: 'Foto 2 Blind Assessment', section: 'blind', type: 'photo', headers: ['linkFotoCapreno40HSA'] },
  { key: 'video_testimoni', label: 'Link Video Testimoni', section: 'blind', type: 'text', headers: ['Video Testimoni'] },

  // ---------------- 60 HST -------------------------------------------------
  { key: 'susulan_fp', label: 'Petani Aplikasi Herbisida Lagi di Plot FP?', section: 'h60', type: 'select', options: ['Iya', 'Tidak'],
    headers: ['Apakah petani aplikasi herbisida lagi di plot FP di umur 60an HST?'] },
  { key: 'susulan_cap', label: 'Petani Aplikasi Herbisida Lagi di Plot Capreno?', section: 'h60', type: 'select', options: ['Iya', 'Tidak'],
    headers: ['Apakah petani aplikasi herbisida lagi di plot Capreno di umur 60an HST?'] },
  { key: 'foto_fp_60', label: 'Foto Plot FP (60 HST)', section: 'h60', type: 'photo', headers: ['Foto Plot FP 60HST'] },
  { key: 'foto_cap_60', label: 'Foto Plot Capreno (60 HST)', section: 'h60', type: 'photo', headers: ['Foto Plot Capreno 60HST'] },
  { key: 'disukai_60', label: 'Plot yang Disukai (60 HST)', section: 'h60', type: 'select', options: ['Plot FP', 'Plot Capreno', 'Sama'], headers: ['Plot yang disukai di 60HST'] },
  { key: 'alasan_60', label: 'Alasan Disukai (60 HST)', section: 'h60', type: 'textarea', headers: ['Plot tersebut disukai DI 60HST karena '] },
  { key: 'lebih_baik_60', label: 'Lebih Baik untuk Gulma Sulit? (60 HST)', section: 'h60', type: 'text',
    headers: ['Apakah produk herbi Bayer ini lebih baik untuk gulma-gulma yang selama ini sulit dikendalikan? (Eleusine indica, Roettboellia, Cyperus rotundus) 60HST'] },

  // ---------------- Berat panen ---------------------------------------------
  { key: 'panen_cap_kg', label: 'Berat Panen Plot Capreno (kg)', section: 'harvest', type: 'number', headers: ['Plot Capreno (kg)'] },
  { key: 'panen_fp_kg', label: 'Berat Panen Plot FP (kg)', section: 'harvest', type: 'number', headers: ['Plot FP (kg)'] },

  // ---------------- Identity columns (not user-editable directly) ----------
  { key: 'id', label: 'ID', section: 'system', type: 'text', headers: ['ID'] },
  { key: 'petugas', label: 'Nama Petugas', section: 'system', type: 'text', headers: ['Nama Petugas'] },
  { key: 'user_email', label: 'User_Email', section: 'system', type: 'text', headers: ['User_Email'] }
];

// Ordered section definitions for the UI (label + which "checkpoint" they represent).
var SECTIONS = [
  { key: 'setup', label: 'Info Dasar & Setup Demo' },
  { key: 'h0', label: '0 HSA (Saat Aplikasi)' },
  { key: 'h7', label: '7 HSA' },
  { key: 'h14', label: '14 HSA' },
  { key: 'h21', label: '21 HSA' },
  { key: 'blind', label: 'Blind Assessment (40-45 HST)' },
  { key: 'h60', label: '60 HST' },
  { key: 'harvest', label: 'Berat Panen' }
];

function fieldByKey_(key) {
  for (var i = 0; i < FIELD_SCHEMA.length; i++) {
    if (FIELD_SCHEMA[i].key === key) return FIELD_SCHEMA[i];
  }
  return null;
}

/**
 * Build a {canonicalKey: {colIndex0, header}} map for one territory's "Demo"
 * sheet by matching FIELD_SCHEMA[*].headers against the sheet's actual header
 * row (row 1), case/whitespace-insensitively. Fields with no match in this
 * territory are simply omitted from the returned map (caller must treat a
 * missing key as "field not available in this territory" and skip it, never
 * throw) — this is expected (e.g. Demo Sul 2 lacks Kabupaten/Timing aplikasi).
 */
function resolveHeaderIndex_(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var normToCol = {};
  for (var c = 0; c < headerRow.length; c++) {
    var n = normalizeHeader_(headerRow[c]);
    if (n && !(n in normToCol)) normToCol[n] = c; // first match wins if a header text repeats
  }
  var map = {};
  for (var i = 0; i < FIELD_SCHEMA.length; i++) {
    var f = FIELD_SCHEMA[i];
    for (var j = 0; j < f.headers.length; j++) {
      var n2 = normalizeHeader_(f.headers[j]);
      if (n2 in normToCol) {
        map[f.key] = { col: normToCol[n2], header: headerRow[normToCol[n2]] };
        break;
      }
    }
  }
  return map;
}

function generateRowId_() {
  // 8 hex chars, matching the existing convention used across all territory sheets.
  var bytes = [];
  for (var i = 0; i < 4; i++) bytes.push(Math.floor(Math.random() * 256));
  return bytes.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}
