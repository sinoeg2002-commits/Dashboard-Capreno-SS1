"""
Build a self-contained HTML "report card" for one demo entry, styled to match
the Dashboard Capreno SS1 palette. Meant to be screenshotted to JPG afterwards
(see monitoring/screenshot.js) for sharing in the WA group.

Usage:
    python3 make_report_html.py <payload.json> <output.html>

payload.json shape:
{
  "sheet": "Demo SS2",
  "detected_at": "2026-11-07T20:30:00Z",
  "fields": { ...canonical dict, see demo_schema.FIELD_MAP keys... },
  "photos": { "foto_fp_7": "/abs/path/local.jpg", "foto_cap_7": null, ... },
  "new_keys": ["fp_7_umum", "alasan_7", ...],   # optional: canonical keys that are NEW this round, highlighted
  "ai_visual": {                                # optional: per-HSA-point visual estimate (see below)
    "7 HSA": {"fp_pct": 15, "cap_pct": 5, "note": "..."},
    "14 HSA": {...}
  }
}

ai_visual estimates come from Claude's own vision when it looks at each new
photo pair while building the report (not a separate OCR library — reading
printed text isn't the point here, estimating weed-coverage % and crop
condition from the picture is). fp_pct/cap_pct are an eyeballed percentage of
the frame showing weed growth (lower = cleaner); note is a one-line
observation. Only include a point once both its photos have been looked at.
"""
import sys, json, html as _html, re, datetime
sys.path.insert(0, __import__("os").path.dirname(__file__))
import demo_schema as ds

NAVY = "#0A2A5E"; BLUE = "#2F6FBF"; ORANGE = "#F07016"; GREY = "#C9D1DE"; MUTED = "#5B6A85"
BG = "#F4F7FB"

def esc(s):
    return _html.escape(str(s)) if s is not None else ""

BULAN_ID = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

def fmt_val(key, v):
    """Human-friendly rendering for a field value, e.g. ISO date -> 'dd Mon yyyy'."""
    if isinstance(v, str) and re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", v):
        try:
            d = datetime.date.fromisoformat(v[:10])
            return f"{d.day} {BULAN_ID[d.month]} {d.year}"
        except ValueError:
            return v
    return v

def score_bar(label, fp, cap):
    def seg(v, color):
        if v in (None, ""):
            return f'<div class="seg empty">–</div>'
        try:
            n = float(v)
        except ValueError:
            return f'<div class="seg empty">{esc(v)}</div>'
        w = max(6, n / 4 * 100)
        return f'<div class="seg" style="width:{w:.0f}%;background:{color}">{esc(v)}</div>'
    return f'''<div class="srow">
      <div class="slabel">{esc(label)}</div>
      <div class="sbars">
        <div class="sbar">{seg(fp, BLUE)}</div>
        <div class="sbar">{seg(cap, ORANGE)}</div>
      </div>
    </div>'''

def build(payload):
    f = payload.get("fields", {})
    photos = payload.get("photos", {}) or {}
    new_keys = set(payload.get("new_keys", []) or [])
    sheet = payload.get("sheet", "")
    detected_at = payload.get("detected_at", "")

    nomor = f.get("nomor_demo", "-")
    petugas = f.get("petugas", "-")
    lokasi = f.get("lokasi", "-")
    kab = f.get("kab")

    def mark(key, text):
        if not text:
            return ""
        cls = " new" if key in new_keys else ""
        return f'<span class="fld{cls}">{esc(text)}</span>'

    info_rows = []
    def info(label, key):
        v = f.get(key)
        if not v:
            return
        info_rows.append(f'<div class="irow"><div class="ilabel">{esc(label)}</div><div class="ival">{mark(key, fmt_val(key, v))}</div></div>')
    info("Kabupaten", "kab")
    info("Petani", "petani")
    info("Herbisida FP", "herbisida_fp")
    info("Varietas jagung", "varietas")
    info("Pola tanam", "pola_tanam")
    info("Jenis olah tanah", "olah_tanah")
    info("Gulma sulit dikendalikan", "gulma_sulit")
    info("Timing aplikasi", "timing")
    info("Tanggal tanam", "tgl_tanam")
    info("Tanggal aplikasi", "tgl_aplikasi")

    score_blocks = []
    for label, fp_u, fp_k, fp_p, cap_u, cap_k, cap_p in ds.SCORE_ROWS:
        if not any(f.get(k) for k in (fp_u, fp_k, fp_p, cap_u, cap_k, cap_p)):
            continue
        any_new = any(k in new_keys for k in (fp_u, fp_k, fp_p, cap_u, cap_k, cap_p))
        rows = (
            score_bar("Gulma umum", f.get(fp_u), f.get(cap_u))
            + score_bar("Gulma khusus", f.get(fp_k), f.get(cap_k))
            + score_bar("Performa tanaman", f.get(fp_p), f.get(cap_p))
        )
        badge = ' <span class="badge">BARU</span>' if any_new else ""
        score_blocks.append(f'<div class="scard"><div class="shead">{esc(label)}{badge}</div>{rows}</div>')

    ai_visual = payload.get("ai_visual", {}) or {}
    # map "7 HSA" -> matching score-row keys, to flag a visual estimate that
    # disagrees sharply with the petugas's own 1-4 efficacy score
    score_by_label = {label: (fp_u, cap_u) for label, fp_u, _, _, cap_u, _, _ in ds.SCORE_ROWS}

    def ai_tier(pct):
        if pct is None:
            return None
        if pct < 10:
            return 4
        if pct < 25:
            return 3
        if pct < 50:
            return 2
        return 1

    def ai_row(label):
        est = ai_visual.get(label)
        if not est:
            return ""
        fp_pct, cap_pct, note = est.get("fp_pct"), est.get("cap_pct"), est.get("note")
        fp_u_key, cap_u_key = score_by_label.get(label, (None, None))
        rep_fp = f.get(fp_u_key) if fp_u_key else None
        rep_cap = f.get(cap_u_key) if cap_u_key else None
        mismatch = False
        try:
            if rep_fp is not None and ai_tier(fp_pct) is not None and abs(float(rep_fp) - ai_tier(fp_pct)) >= 2:
                mismatch = True
            if rep_cap is not None and ai_tier(cap_pct) is not None and abs(float(rep_cap) - ai_tier(cap_pct)) >= 2:
                mismatch = True
        except (TypeError, ValueError):
            pass
        pct_txt = lambda p: "–" if p is None else f"{p}%"
        cls = " ai-warn" if mismatch else ""
        flag = '<span class="ai-flag">⚠ berbeda dari skor petugas, perlu dicek ulang</span>' if mismatch else ""
        note_html = f'<span class="ai-note">{esc(note)}</span>' if note else ""
        return (
            f'<div class="ai-row{cls}"><span class="ai-lbl">Estimasi AI (visual)</span> '
            f'Tutupan gulma — FP ~{pct_txt(fp_pct)} · Capreno ~{pct_txt(cap_pct)}{note_html}{flag}</div>'
        )

    photo_blocks = []
    for label, fp_key, cap_key in ds.PHOTO_POINTS:
        fp_path = photos.get(fp_key)
        cap_path = photos.get(cap_key)
        if not fp_path and not cap_path:
            continue
        def cell(path, side, key):
            cls = " new" if key in new_keys else ""
            if path:
                return f'<div class="pcell{cls}"><img src="file://{esc(path)}"><div class="plabel">{side}</div></div>'
            return f'<div class="pcell empty"><div class="pplaceholder">Belum ada foto</div><div class="plabel">{side}</div></div>'
        photo_blocks.append(
            f'<div class="pgroup"><div class="plabelrow">{esc(label)}</div>'
            f'<div class="prow">{cell(fp_path, "Farmer Practice", fp_key)}{cell(cap_path, "Capreno", cap_key)}</div>'
            f'{ai_row(label)}</div>'
        )

    feedback_blocks = []
    for label, disukai_key, alasan_key in ds.FEEDBACK_POINTS:
        disukai = f.get(disukai_key)
        alasan = f.get(alasan_key)
        if not disukai and not alasan:
            continue
        cls = " new" if (disukai_key in new_keys or alasan_key in new_keys) else ""
        feedback_blocks.append(
            f'<div class="quote{cls}"><div class="qhead">{esc(label)}'
            + (f' · Plot disukai: <b>{esc(disukai)}</b>' if disukai else '')
            + '</div>'
            + (f'<div class="qbody">“{esc(alasan)}”</div>' if alasan else '')
            + '</div>'
        )
    komentar = f.get("komentar_21") or f.get("komentar_petani")
    if komentar:
        cls = " new" if ("komentar_21" in new_keys or "komentar_petani" in new_keys) else ""
        feedback_blocks.append(f'<div class="quote{cls}"><div class="qhead">Komentar</div><div class="qbody">“{esc(komentar)}”</div></div>')

    html = f'''<!doctype html>
<html><head><meta charset="utf-8"><style>
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background:{BG}; }}
  .card {{ width:860px; margin:0 auto; background:#fff; }}
  .hdr {{ background:linear-gradient(135deg,{NAVY},{BLUE}); color:#fff; padding:22px 28px; }}
  .hdr .tag {{ font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#BFD3F2; font-weight:700; }}
  .hdr h1 {{ margin:4px 0 2px; font-size:26px; }}
  .hdr .sub {{ font-size:13px; color:#DCE7F7; }}
  .body {{ padding:22px 28px 10px; }}
  .irow {{ display:flex; border-bottom:1px solid #EDF1F7; padding:6px 0; font-size:13px; }}
  .ilabel {{ width:190px; flex:none; color:{MUTED}; }}
  .ival {{ flex:1; color:#1D2B44; font-weight:600; }}
  .fld.new {{ background:#FFF1E4; border:1px solid {ORANGE}; border-radius:4px; padding:1px 6px; }}
  .sec {{ font-size:13px; font-weight:700; color:{NAVY}; margin:20px 0 8px; text-transform:uppercase; letter-spacing:.04em; }}
  .scard {{ border:1px solid #E1E7F0; border-radius:8px; padding:12px 14px; margin-bottom:10px; }}
  .shead {{ font-size:13px; font-weight:700; color:{NAVY}; margin-bottom:8px; }}
  .badge {{ background:{ORANGE}; color:#fff; font-size:9px; font-weight:700; padding:2px 7px; border-radius:9px; vertical-align:middle; }}
  .srow {{ display:flex; align-items:center; margin:5px 0; font-size:12px; }}
  .slabel {{ width:130px; flex:none; color:#34435C; }}
  .sbars {{ flex:1; display:flex; flex-direction:column; gap:3px; }}
  .sbar {{ height:18px; background:#F1F4F9; border-radius:3px; overflow:hidden; }}
  .seg {{ height:100%; display:flex; align-items:center; justify-content:flex-end; padding-right:6px; color:#fff; font-size:10px; font-weight:700; border-radius:3px; }}
  .seg.empty {{ background:#F1F4F9; color:{MUTED}; justify-content:center; }}
  .legend {{ font-size:10.5px; color:{MUTED}; margin:-2px 0 10px; }}
  .legend b.fp {{ color:{BLUE}; }} .legend b.cap {{ color:{ORANGE}; }}
  .pgroup {{ margin-bottom:14px; }}
  .plabelrow {{ font-size:12px; font-weight:700; color:{NAVY}; margin-bottom:6px; }}
  .prow {{ display:flex; gap:10px; }}
  .pcell {{ flex:1; border:1px solid #E1E7F0; border-radius:8px; overflow:hidden; background:#F8FAFC; }}
  .pcell.new {{ border:2px solid {ORANGE}; }}
  .pcell img {{ width:100%; height:160px; object-fit:cover; display:block; }}
  .pcell.empty {{ height:160px; display:flex; align-items:center; justify-content:center; }}
  .pplaceholder {{ color:{MUTED}; font-size:11px; }}
  .plabel {{ text-align:center; font-size:10.5px; color:{MUTED}; padding:5px; }}
  .ai-row {{ margin-top:6px; padding:6px 10px; background:#F4F7FB; border-left:3px solid {BLUE}; border-radius:3px; font-size:11px; line-height:1.5; color:#34435C; }}
  .ai-row.ai-warn {{ border-left-color:{ORANGE}; background:#FFF5EC; }}
  .ai-lbl {{ font-weight:700; color:{NAVY}; margin-right:5px; }}
  .ai-note {{ display:block; color:{MUTED}; font-style:italic; }}
  .ai-flag {{ display:inline-block; margin-top:2px; color:{ORANGE}; font-weight:700; }}
  .quote {{ background:#F8FAFC; border-left:3px solid {GREY}; border-radius:4px; padding:8px 12px; margin-bottom:8px; }}
  .quote.new {{ border-left:3px solid {ORANGE}; background:#FFF8F2; }}
  .qhead {{ font-size:11px; font-weight:700; color:{NAVY}; margin-bottom:3px; }}
  .qbody {{ font-size:12.5px; color:#34435C; font-style:italic; }}
  .ftr {{ padding:16px 28px 22px; font-size:10.5px; color:{MUTED}; border-top:1px solid #EDF1F7; margin-top:6px; }}
</style></head>
<body><div class="card">
  <div class="hdr">
    <div class="tag">Laporan Demo Komersial Capreno &middot; {esc(sheet)}</div>
    <h1>{esc(nomor)}</h1>
    <div class="sub">Petugas: <b>{esc(petugas)}</b> &middot; Lokasi: {esc(lokasi)}{(' &middot; ' + esc(kab)) if kab else ''}</div>
  </div>
  <div class="body">
    <div class="sec">Info dasar demo</div>
    {''.join(info_rows) if info_rows else '<div style="color:' + MUTED + ';font-size:12px">Belum ada data.</div>'}

    {'<div class="sec">Skor parameter (FP vs Capreno)</div><div class="legend"><b class="fp">■</b> Farmer Practice &nbsp; <b class="cap">■</b> Capreno &nbsp; &middot; &nbsp; skala 1-4</div>' + ''.join(score_blocks) if score_blocks else ''}

    {'<div class="sec">Foto dokumentasi</div>' + ''.join(photo_blocks) if photo_blocks else ''}

    {'<div class="sec">Feedback petugas / petani</div>' + ''.join(feedback_blocks) if feedback_blocks else ''}
  </div>
  <div class="ftr">Terdeteksi: {esc(detected_at)} &middot; Kotak oranye = data yang baru masuk pada pengecekan ini &middot; Dihasilkan otomatis oleh sistem monitoring Dashboard Capreno SS1.</div>
</div></body></html>'''
    return html


if __name__ == "__main__":
    payload_path, out_path = sys.argv[1], sys.argv[2]
    with open(payload_path, encoding="utf-8") as fh:
        payload = json.load(fh)
    html_out = build(payload)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html_out)
