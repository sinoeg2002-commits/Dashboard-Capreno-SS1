"""
Shared schema/extraction helpers for the Dashboard Capreno SS1 "Demo" sheets.

Every territory spreadsheet (Demo SS, SS1, SS2, EJ, SUL, Sul 2) shares the same
Google Form-generated column headers in its "Demo" tab. This module maps those
long, inconsistent headers to short canonical keys so other scripts (baseline
builder, diff, report generator) don't each re-derive the mapping.
"""
import re, hashlib, json

# canonical_key -> exact header text (as seen in the "Demo" tab, row 1)
FIELD_MAP = {
    "petugas": "Nama Petugas",
    "nomor_demo": "Nomor Demo (ID-SS-nama DR-no urut demo mulai 01, 02, dst)",
    "id": "ID",
    "kab": "Kabupaten",
    "lokasi": "Lokasi Demo",
    "koordinat": "Koordinat Lokasi Demo",
    "petani": "Nama Petani",
    "hp_petani": "No HP Petani",
    "herbisida_fp": "Herbisida FP (jika tidak ada di daftar, ketikkan nama produk dan klik + )",
    "varietas": "Varietas Jagung yang ditanam (jika tidak ada di daftar, ketikkan nama varietas baru dan klik + )",
    "olah_tanah": "Jenis olah tanah di lahan demo (jika tidak ada di daftar, ketikkan jenis olah tanah baru dan klik + )",
    "pola_tanam": "Pola tanam di area lahan demo (jika tidak ada di daftar, ketikkan pola tanam baru dan klik + )",
    "gulma_sulit": "Gulma utama yang sulit dikendalikan di area ini adalah (jika tidak ada di daftar, ketikkan nama gulma baru dan klik + )",
    "timing": "Timing aplikasi",
    "tgl_tanam": "Tanggal Tanam",
    "tgl_aplikasi": "Tanggal Aplikasi",

    "fp_7_umum": "Plot Farmer Practice 7HSA. Efikasi ke gulma umum",
    "fp_7_khusus": "Plot Farmer Practice 7HSA. Efikasi ke Gulma yang sulit dikendalikan",
    "fp_7_performa": "Plot Farmer Practice 7HSA. Performa tanaman",
    "cap_7_umum": "Plot Capreno7HSA.Efikasi ke gulma umum",
    "cap_7_khusus": "Plot Capreno 7HSA.Efikasi ke Gulma yang sulit dikendalikan",
    "cap_7_performa": "Plot Capreno 7HSA.Performa tanaman",
    "disukai_7": "Plot yang disukai 7HSA",
    "alasan_7": "Plot tersebut disukai karena (7HSA)",
    "foto_fp_7": "linkFotoFP7HSA",
    "foto_cap_7": "linkFotoCapreno7HSA",

    "fp_14_umum": "Plot Farmer Practice 14HSA. Efikasi ke gulma umum",
    "fp_14_khusus": "Plot Farmer Practice 14HSA. Efikasi ke Gulma yang sulit dikendalikan",
    "fp_14_performa": "Plot Farmer Practice 14HSA. Performa tanaman",
    "cap_14_umum": "Plot Capreno 14HSA. Efikasi ke gulma umum",
    "cap_14_khusus": "Plot Capreno 14HSA. Efikasi ke Gulma yang sulit dikendalikan",
    "cap_14_performa": "Plot Capreno 14HSA. Performa tanaman",
    "disukai_14": "Plot yang disukai (14HSA)",
    "alasan_14": "Plot tersebut disukai karena (14HSA)",
    "foto_fp_14": "linkFotoFP14HSA",
    "foto_cap_14": "linkFotoCapreno14HSA",

    "fp_21_umum": "Plot Farmer Practice 21HSA. Efikasi ke gulma umum",
    "fp_21_khusus": "Plot Farmer Practice 21HSA. Efikasi ke gulma yang sulit dikendalikan",
    "fp_21_performa": "Plot Farmer Practice 21HSA. Performa tanaman",
    "cap_21_umum": "Plot Capreno 21HSA. Efikasi ke gulma umum",
    "cap_21_khusus": "Plot Capreno 21HSA. Efikasi ke Gulma yang sulit dikendalikan",
    "cap_21_performa": "Plot Capreno.Performa tanaman2",
    "disukai_21": "Plot yang disukai 21HSA",
    "alasan_21": "Plot tersebut disukai karena (21HSA)",
    "komentar_21": "Komentar Petugas / petani 21HSA",
    "foto_fp_21": "linkFotoFP21HSA",
    "foto_cap_21": "linkFotoCapreno21HSA",

    "foto_fp_0": "linkFotoFP0HSA",
    "foto_cap_0": "linkFotoCapreno0HSA",

    "komentar_petani": "Komentar Petani",
}

HEADER_TO_KEY = {v: k for k, v in FIELD_MAP.items()}

SCORE_ROWS = [
    ("7 HSA", "fp_7_umum", "fp_7_khusus", "fp_7_performa", "cap_7_umum", "cap_7_khusus", "cap_7_performa"),
    ("14 HSA", "fp_14_umum", "fp_14_khusus", "fp_14_performa", "cap_14_umum", "cap_14_khusus", "cap_14_performa"),
    ("21 HSA", "fp_21_umum", "fp_21_khusus", "fp_21_performa", "cap_21_umum", "cap_21_khusus", "cap_21_performa"),
]
PHOTO_POINTS = [
    ("0 HSA", "foto_fp_0", "foto_cap_0"),
    ("7 HSA", "foto_fp_7", "foto_cap_7"),
    ("14 HSA", "foto_fp_14", "foto_cap_14"),
    ("21 HSA", "foto_fp_21", "foto_cap_21"),
]
FEEDBACK_POINTS = [
    ("7 HSA", "disukai_7", "alasan_7"),
    ("14 HSA", "disukai_14", "alasan_14"),
    ("21 HSA", "disukai_21", "alasan_21"),
]


def extract_rows(ws):
    """Given an openpyxl worksheet (the 'Demo' tab), return {id: {header: value, ...}}.
    Keeps only non-empty cells. Stops at the first fully-blank row (no Nomor Demo, no ID).
    Keyed by the row's 'ID' column; falls back to 'Nomor Demo' text if ID is blank."""
    headers = [c.value for c in ws[1]]
    nomor_col = headers.index(FIELD_MAP["nomor_demo"]) if FIELD_MAP["nomor_demo"] in headers else None
    id_col = headers.index(FIELD_MAP["id"]) if FIELD_MAP["id"] in headers else None
    out = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        nomor = row[nomor_col] if nomor_col is not None else None
        rid = row[id_col] if id_col is not None else None
        if not nomor and not rid:
            break
        key = str(rid) if rid else f"nomor:{nomor}"
        d = {}
        for h, v in zip(headers, row):
            if h is None or v in (None, ""):
                continue
            if hasattr(v, "isoformat"):
                v = v.isoformat()
            d[h] = v
        out[key] = d
    return out


def canon(row_dict):
    """Map a {header: value} row dict to {canonical_key: value} using FIELD_MAP."""
    return {k: row_dict[h] for k, h in FIELD_MAP.items() if h in row_dict}


def row_hash(row_dict):
    """Stable sha256 of a full {header: value} row dict (every non-empty cell,
    not just canonical ones), used to detect ANY field-level change cheaply
    without storing the full (verbose) row text in the baseline."""
    norm = json.dumps(row_dict, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def compact_row(row_dict):
    """What actually gets stored in the baseline per row: the short canonical
    fields (for building notifications/reports) plus a hash of the FULL raw
    row (to detect a change in any of the ~90 raw columns, even ones we don't
    keep verbatim, like 40HSA blind-assessment or 60HST/harvest fields)."""
    c = canon(row_dict)
    c["_hash"] = row_hash(row_dict)
    return c


def drive_id_from_foto_link(link):
    """Extract a Drive file id from a 'linkFotoXXX' value like
    'https://drive.google.com/uc?export=view&id=FILE_ID'. Returns None if blank/placeholder."""
    if not link:
        return None
    m = re.search(r"id=([A-Za-z0-9_-]{10,})", link)
    return m.group(1) if m else None
