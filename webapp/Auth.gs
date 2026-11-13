/**
 * Login/session handling. Reuses the same "Users" tab (User_Email, User_ID,
 * Role, PIN) that already exists in every territory spreadsheet (it's what
 * AppSheet itself reads for login) — petugas keep their existing username
 * and PIN, nothing to re-issue.
 *
 * Sessions are opaque tokens stored server-side in CacheService (max 6h
 * lifetime); the client only ever holds the token, never trusts its own
 * claim of territory/role for anything — every API call re-validates
 * against the cached session.
 */

var SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 hours (CacheService's own max)

/**
 * Find every (territory, user row) match for this username+PIN. Some
 * shared/admin accounts (e.g. the central admin login) exist with the same
 * PIN in several territory sheets, so this can legitimately return more
 * than one match — callers must let the person pick which territory they
 * mean rather than silently taking the first one.
 */
function findLoginMatches_(username, pin) {
  username = String(username || '').trim();
  pin = String(pin || '').trim();
  if (!username || !pin) throw new Error('Masukkan username dan password.');

  var matches = [];
  var territoryKeys = Object.keys(TERRITORIES);
  for (var t = 0; t < territoryKeys.length; t++) {
    var key = territoryKeys[t];
    var ss = SpreadsheetApp.openById(TERRITORIES[key].spreadsheetId);
    var usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) continue;
    var lastRow = usersSheet.getLastRow();
    if (lastRow < 2) continue;
    var values = usersSheet.getRange(2, 1, lastRow - 1, 4).getValues(); // User_Email, User_ID, Role, PIN

    for (var r = 0; r < values.length; r++) {
      var email = String(values[r][0] || '').trim();
      var userId = String(values[r][1] || '').trim();
      var role = String(values[r][2] || 'User').trim() || 'User';
      var storedPin = String(values[r][3] || '').trim();
      if (!email && !userId) continue;

      var usernameMatches = username.toLowerCase() === email.toLowerCase() ||
        username.toLowerCase() === userId.toLowerCase();
      if (!usernameMatches) continue;

      var pinMatches = pin === storedPin ||
        pin.replace(/^0+/, '') === storedPin.replace(/^0+/, ''); // tolerate lost leading zeros
      if (!pinMatches) continue;

      matches.push({ territory: key, email: email, petugas: userId, role: role });
      break; // only the first matching row per territory matters
    }
  }
  return matches;
}

function createSession_(match) {
  var token = Utilities.getUuid();
  var session = {
    token: token,
    territory: match.territory,
    email: match.email,
    petugas: match.petugas,
    role: match.role
  };
  CacheService.getScriptCache().put(token, JSON.stringify(session), SESSION_TTL_SECONDS);
  return {
    token: token,
    territoryLabel: TERRITORIES[match.territory].label,
    petugas: match.petugas,
    role: match.role
  };
}

function login_(username, pin) {
  var matches = findLoginMatches_(username, pin);
  if (!matches.length) throw new Error('Username atau password salah.');
  if (matches.length === 1) return createSession_(matches[0]);
  return {
    needsTerritoryChoice: true,
    options: matches.map(function (m) { return { territory: m.territory, label: TERRITORIES[m.territory].label }; })
  };
}

/** Second step when login_() returned needsTerritoryChoice: re-validates
 * username+PIN (never trusts the client's territory choice blindly) and
 * creates the session for that specific territory. */
function loginForTerritory_(username, pin, territoryKey) {
  var matches = findLoginMatches_(username, pin);
  var chosen = matches.filter(function (m) { return m.territory === territoryKey; })[0];
  if (!chosen) throw new Error('Username atau password salah.');
  return createSession_(chosen);
}

function requireSession_(token) {
  if (!token) throw new Error('Sesi tidak ditemukan, silakan login ulang.');
  var raw = CacheService.getScriptCache().get(token);
  if (!raw) throw new Error('Sesi sudah berakhir, silakan login ulang.');
  return JSON.parse(raw);
}

function logout_(token) {
  if (token) CacheService.getScriptCache().remove(token);
}
