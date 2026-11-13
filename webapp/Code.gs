/**
 * Dashboard Capreno - Demo Input Web App
 * Replacement for the AppSheet-based data entry tool (10-account cap,
 * limited branding). Single Apps Script project serving all 6 territory
 * spreadsheets; petugas log in with the same User_ID/PIN already stored in
 * each sheet's "Users" tab, and only ever see/edit their own demos (Admins
 * see/edit everyone's demos in their own territory).
 *
 * See Schema.gs for the field list + territory config, Auth.gs for the
 * session/login logic.
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Input Data Demo Capreno')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---------------------------------------------------------------------
// Public API (called from the client via google.script.run). Every
// function except login() takes a session token as its first argument
// and re-validates it server-side — never trust anything else the client
// claims about who it is.
// ---------------------------------------------------------------------

function apiLogin(username, pin) {
  return login_(username, pin);
}

function apiLoginForTerritory(username, pin, territoryKey) {
  return loginForTerritory_(username, pin, territoryKey);
}

function apiLogout(token) {
  logout_(token);
  return true;
}

function apiGetSchema(token) {
  var sess = requireSession_(token);
  return {
    sections: SECTIONS,
    fields: FIELD_SCHEMA.filter(function (f) { return f.section !== 'system'; }),
    territoryLabel: TERRITORIES[sess.territory].label,
    petugas: sess.petugas,
    role: sess.role
  };
}

function apiListMyDemos(token) {
  var sess = requireSession_(token);
  var ss = SpreadsheetApp.openById(TERRITORIES[sess.territory].spreadsheetId);
  var sheet = ss.getSheetByName('Demo');
  var idx = resolveHeaderIndex_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var lastCol = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var out = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var rid = idx.id ? row[idx.id.col] : '';
    var nomor = idx.nomor_demo ? row[idx.nomor_demo.col] : '';
    if (!rid && !nomor) break; // first fully blank row = end of data
    if (!rowBelongsToSession_(row, idx, sess)) continue;

    var statusBySection = {};
    SECTIONS.forEach(function (sec) {
      statusBySection[sec.key] = sectionHasData_(row, idx, sec.key);
    });

    out.push({
      id: rid || ('nomor:' + nomor),
      nomorDemo: nomor,
      petani: idx.nama_petani ? row[idx.nama_petani.col] : '',
      lokasi: idx.lokasi_demo ? row[idx.lokasi_demo.col] : '',
      petugas: idx.petugas ? row[idx.petugas.col] : '',
      tglAplikasi: idx.tgl_aplikasi ? formatDate_(row[idx.tgl_aplikasi.col]) : '',
      status: statusBySection
    });
  }
  // newest first
  out.sort(function (a, b) { return (b.tglAplikasi || '').localeCompare(a.tglAplikasi || ''); });
  return out;
}

function apiGetDemoDetail(token, id) {
  var sess = requireSession_(token);
  var found = findRow_(sess.territory, id);
  if (!found) throw new Error('Demo tidak ditemukan.');
  if (!rowBelongsToSession_(found.row, found.idx, sess)) {
    throw new Error('Kamu tidak punya akses ke data demo ini.');
  }
  var out = {};
  FIELD_SCHEMA.forEach(function (f) {
    if (f.section === 'system') return;
    var col = found.idx[f.key];
    out[f.key] = col ? valueFor_(f, found.row[col.col]) : null;
    out['_available_' + f.key] = !!col; // field exists in this territory's sheet?
  });
  return out;
}

function apiCreateDemo(token, payload) {
  var sess = requireSession_(token);
  var ss = SpreadsheetApp.openById(TERRITORIES[sess.territory].spreadsheetId);
  var sheet = ss.getSheetByName('Demo');
  var idx = resolveHeaderIndex_(sheet);
  var lastCol = sheet.getLastColumn();

  var newId = generateRowId_();
  var rowArray = new Array(lastCol).fill('');

  // Only accept fields from the 'setup' and 'h0' sections on creation.
  FIELD_SCHEMA.forEach(function (f) {
    if (f.section !== 'setup' && f.section !== 'h0') return;
    var col = idx[f.key];
    if (!col) return; // field not present in this territory, skip
    if (payload.hasOwnProperty(f.key)) {
      rowArray[col.col] = writeValueFor_(f, payload[f.key]);
    }
  });

  if (idx.id) rowArray[idx.id.col] = newId;
  if (idx.petugas) rowArray[idx.petugas.col] = sess.petugas; // stamped from session, never from client
  if (idx.user_email) rowArray[idx.user_email.col] = sess.email;

  sheet.appendRow(rowArray);
  return { id: newId };
}

function apiSaveSection(token, id, section, payload) {
  var sess = requireSession_(token);
  var found = findRow_(sess.territory, id);
  if (!found) throw new Error('Demo tidak ditemukan.');
  if (!rowBelongsToSession_(found.row, found.idx, sess)) {
    throw new Error('Kamu tidak punya akses untuk mengubah data demo ini.');
  }
  var fieldsInSection = FIELD_SCHEMA.filter(function (f) { return f.section === section; });
  if (!fieldsInSection.length) throw new Error('Bagian data tidak dikenal: ' + section);

  var sheetRow = found.rowNumber; // 1-based sheet row
  var sheet = found.sheet;
  fieldsInSection.forEach(function (f) {
    var col = found.idx[f.key];
    if (!col) return; // not available in this territory
    if (!payload.hasOwnProperty(f.key)) return;
    sheet.getRange(sheetRow, col.col + 1).setValue(writeValueFor_(f, payload[f.key]));
  });
  return { ok: true };
}

/**
 * Upload a photo (base64 data URL content, no "data:...;base64," prefix)
 * into this territory's Demo_Images folder, named to match the existing
 * convention "<rowId>.<description>.<HHMMSS>.jpg". Returns the Drive file
 * id; the client then passes that id back as the value for a 'photo' field
 * when calling apiCreateDemo / apiSaveSection.
 */
function apiUploadPhoto(token, rowId, description, base64Data, mimeType) {
  var sess = requireSession_(token);
  var folder = territoryImagesFolder_(sess.territory);
  var bytes = Utilities.base64Decode(base64Data);
  var ext = (mimeType && mimeType.indexOf('png') !== -1) ? 'png' : 'jpg';
  var hhmmss = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HHmmss');
  var filename = rowId + '.' + description + '.' + hhmmss + '.' + ext;
  var blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', filename);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { fileId: file.getId(), url: 'https://drive.google.com/uc?export=view&id=' + file.getId() };
}

// ---------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------

function rowBelongsToSession_(row, idx, sess) {
  if (sess.role === 'Admin') return true;
  var emailMatch = idx.user_email && row[idx.user_email.col] &&
    String(row[idx.user_email.col]).trim().toLowerCase() === sess.email.toLowerCase();
  var petugasMatch = idx.petugas && row[idx.petugas.col] &&
    String(row[idx.petugas.col]).trim().toLowerCase() === sess.petugas.toLowerCase();
  return !!(emailMatch || petugasMatch);
}

function sectionHasData_(row, idx, sectionKey) {
  var fields = FIELD_SCHEMA.filter(function (f) { return f.section === sectionKey; });
  for (var i = 0; i < fields.length; i++) {
    var col = idx[fields[i].key];
    if (col && row[col.col] !== '' && row[col.col] !== null && row[col.col] !== undefined) return true;
  }
  return false;
}

function findRow_(territoryKey, id) {
  var ss = SpreadsheetApp.openById(TERRITORIES[territoryKey].spreadsheetId);
  var sheet = ss.getSheetByName('Demo');
  var idx = resolveHeaderIndex_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var lastCol = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // Legacy rows with no real ID are addressed as "nomor:<Nomor Demo>" (see
  // apiListMyDemos) — match those by nomor_demo with a blank id column.
  var legacyPrefix = 'nomor:';
  if (String(id).indexOf(legacyPrefix) === 0) {
    var wantNomor = String(id).slice(legacyPrefix.length);
    if (!idx.nomor_demo) return null;
    for (var r2 = 0; r2 < values.length; r2++) {
      var hasId = idx.id && values[r2][idx.id.col];
      if (!hasId && String(values[r2][idx.nomor_demo.col]) === wantNomor) {
        return { row: values[r2], rowNumber: r2 + 2, sheet: sheet, idx: idx };
      }
    }
    return null;
  }

  if (!idx.id) return null;
  for (var r = 0; r < values.length; r++) {
    if (String(values[r][idx.id.col]) === String(id)) {
      return { row: values[r], rowNumber: r + 2, sheet: sheet, idx: idx };
    }
  }
  return null;
}

function valueFor_(field, raw) {
  if (field.type === 'photo') {
    if (!raw) return null;
    var m = String(raw).match(/id=([A-Za-z0-9_-]{10,})/);
    return m ? m[1] : null; // bare Drive file id, or null if blank/unresolved
  }
  if (field.type === 'date' && raw instanceof Date) {
    return Utilities.formatDate(raw, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  return raw;
}

function writeValueFor_(field, clientValue) {
  if (field.type === 'photo') {
    if (!clientValue) return '';
    // clientValue is the Drive file id returned by apiUploadPhoto
    return 'https://drive.google.com/uc?export=view&id=' + clientValue;
  }
  if (field.type === 'date' && clientValue) {
    return new Date(clientValue + 'T00:00:00');
  }
  if (field.type === 'score' || field.type === 'number') {
    if (clientValue === '' || clientValue === null || clientValue === undefined) return '';
    var n = Number(clientValue);
    return isNaN(n) ? '' : n;
  }
  return clientValue === null || clientValue === undefined ? '' : clientValue;
}

function formatDate_(raw) {
  if (raw instanceof Date) return Utilities.formatDate(raw, 'Asia/Jakarta', 'yyyy-MM-dd');
  return raw || '';
}

/**
 * Find (or create) the "Demo_Images" folder next to this territory's
 * spreadsheet, matching the existing "Demo_Images/<file>" convention seen
 * in the raw sheet data. Resolved dynamically (not hardcoded) so it stays
 * correct even if a territory's folder structure changes.
 */
function territoryImagesFolder_(territoryKey) {
  var ssFile = DriveApp.getFileById(TERRITORIES[territoryKey].spreadsheetId);
  var parents = ssFile.getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var existing = parent.getFoldersByName('Demo_Images');
  if (existing.hasNext()) return existing.next();
  return parent.createFolder('Demo_Images');
}
