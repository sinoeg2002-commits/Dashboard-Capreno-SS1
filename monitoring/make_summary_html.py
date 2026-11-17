"""
Build a single-page HTML "rollup" summary covering many demo rows at once
(e.g. a mass score update across one territory), styled to match the
Dashboard Capreno SS1 palette. Different from make_report_html.py, which
renders one detailed card per demo row — this renders a compact table across
many rows, meant for a quick WA-shareable overview rather than a per-demo
report.

Usage:
    python3 make_summary_html.py <payload.json> <output.html>

payload.json shape:
{
  "title": "Ringkasan Update Demo SUL — 7 HSA",
  "subtitle": "Demo SUL · update massal 7HSA dari 7 petugas",
  "generated_at": "2026-11-17T20:30:00Z",
  "rows": [
    {
      "petugas": "Nizam", "nomor_demo": "Maros 01", "lokasi": "Tompobulu",
      "fp": [2, 2, 3], "cap": [3, 3, 3], "disukai": "Plot Capreno",
      "has_14hsa": false
    }, ...
  ],
  "excluded": [
    {"petugas": "Yayang", "nomor_demo": "", "note": "belum ada skor 7HSA"}
  ]
}
"fp"/"cap" are [umum, khusus, performa] on the 1-4 scale, may contain null.
"""
import sys, json, html as _html, datetime
sys.path.insert(0, __import__("os").path.dirname(__file__))

NAVY = "#0A2A5E"; BLUE = "#2F6FBF"; ORANGE = "#F07016"; GREY = "#C9D1DE"; MUTED = "#5B6A85"
BG = "#F4F7FB"

def esc(s):
    return _html.escape(str(s)) if s is not None else ""

BULAN_ID = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

def fmt_date(v):
    if not v:
        return ""
    try:
        d = datetime.date.fromisoformat(v[:10])
        return f"{d.day} {BULAN_ID[d.month]} {d.year}"
    except ValueError:
        return v

def chip(v, color):
    if v in (None, ""):
        return f'<span class="chip empty">–</span>'
    return f'<span class="chip" style="background:{color}">{esc(v)}</span>'

def triad(vals, color):
    return "".join(chip(v, color) for v in (vals or [None, None, None]))

def build(payload):
    title = payload.get("title", "Ringkasan Update Demo")
    subtitle = payload.get("subtitle", "")
    generated_at = fmt_date(payload.get("generated_at", "")) or payload.get("generated_at", "")
    rows = payload.get("rows", []) or []
    excluded = payload.get("excluded", []) or []

    # group by petugas, preserving first-seen order
    groups = {}
    order = []
    for r in rows:
        p = r.get("petugas") or "(tanpa nama)"
        if p not in groups:
            groups[p] = []
            order.append(p)
        groups[p].append(r)

    body_blocks = []
    for p in order:
        rs = groups[p]
        trs = []
        for r in rs:
            nomor = r.get("nomor_demo") or "(tanpa nomor)"
            lokasi = r.get("lokasi") or "–"
            disukai = r.get("disukai") or "–"
            disukai_cls = ""
            if disukai == "Plot Capreno":
                disukai_cls = "disukai-cap"
            elif disukai == "Plot FP":
                disukai_cls = "disukai-fp"
            badge14 = ' <span class="badge14">+14HSA</span>' if r.get("has_14hsa") else ""
            trs.append(f'''<tr>
              <td class="c-nomor">{esc(nomor)}{badge14}<div class="c-lokasi">{esc(lokasi)}</div></td>
              <td class="c-scores">{triad(r.get("fp"), BLUE)}</td>
              <td class="c-scores">{triad(r.get("cap"), ORANGE)}</td>
              <td class="c-disukai {disukai_cls}">{esc(disukai)}</td>
            </tr>''')
        body_blocks.append(f'''
        <div class="pgroup">
          <div class="phead">{esc(p)} <span class="pcount">({len(rs)} demo)</span></div>
          <table>
            <thead><tr><th>Nomor Demo &middot; Lokasi</th><th>FP<br><span class="sub-th">umum/khusus/performa</span></th><th>Capreno<br><span class="sub-th">umum/khusus/performa</span></th><th>Disukai</th></tr></thead>
            <tbody>{"".join(trs)}</tbody>
          </table>
        </div>''')

    excluded_html = ""
    if excluded:
        items = "".join(
            f'<li>{esc(e.get("petugas",""))} – {esc(e.get("nomor_demo") or "(tanpa nomor)")}: {esc(e.get("note",""))}</li>'
            for e in excluded
        )
        excluded_html = f'''<div class="excl"><div class="excl-head">Tidak termasuk ringkasan ini ({len(excluded)} demo)</div><ul>{items}</ul></div>'''

    html = f'''<!doctype html>
<html><head><meta charset="utf-8"><style>
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background:{BG}; }}
  .card {{ width:900px; margin:0 auto; background:#fff; }}
  .hdr {{ background:linear-gradient(135deg,{NAVY},{BLUE}); color:#fff; padding:24px 30px; }}
  .hdr .tag {{ font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#BFD3F2; font-weight:700; }}
  .hdr h1 {{ margin:4px 0 2px; font-size:24px; }}
  .hdr .sub {{ font-size:13px; color:#DCE7F7; }}
  .body {{ padding:22px 30px 10px; }}
  .legend {{ font-size:11px; color:{MUTED}; margin-bottom:18px; }}
  .legend .chip {{ margin-right:2px; }}
  .pgroup {{ margin-bottom:20px; }}
  .phead {{ font-size:14px; font-weight:700; color:{NAVY}; margin-bottom:8px; padding-bottom:4px; border-bottom:2px solid {NAVY}; }}
  .pcount {{ font-weight:400; color:{MUTED}; font-size:12px; }}
  table {{ width:100%; border-collapse:collapse; font-size:12px; }}
  th {{ text-align:left; color:{MUTED}; font-weight:700; font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; padding:6px 8px; border-bottom:1px solid #E1E7F0; }}
  .sub-th {{ text-transform:none; font-weight:400; letter-spacing:0; }}
  td {{ padding:7px 8px; border-bottom:1px solid #EDF1F7; vertical-align:top; }}
  .c-nomor {{ font-weight:700; color:#1D2B44; width:260px; }}
  .c-lokasi {{ font-weight:400; color:{MUTED}; font-size:11px; margin-top:1px; }}
  .c-scores {{ white-space:nowrap; }}
  .c-disukai {{ font-weight:700; white-space:nowrap; }}
  .disukai-cap {{ color:{ORANGE}; }}
  .disukai-fp {{ color:{BLUE}; }}
  .chip {{ display:inline-block; min-width:18px; text-align:center; color:#fff; font-size:11px; font-weight:700; border-radius:4px; padding:2px 6px; margin-right:3px; }}
  .chip.empty {{ background:#F1F4F9; color:{MUTED}; }}
  .badge14 {{ background:{NAVY}; color:#fff; font-size:9px; font-weight:700; padding:1px 6px; border-radius:8px; vertical-align:middle; }}
  .excl {{ margin-top:10px; padding:12px 14px; background:#F8FAFC; border-left:3px solid {GREY}; border-radius:4px; font-size:11.5px; color:{MUTED}; }}
  .excl-head {{ font-weight:700; color:{NAVY}; margin-bottom:4px; }}
  .excl ul {{ margin:0; padding-left:18px; }}
  .ftr {{ padding:16px 30px 22px; font-size:10.5px; color:{MUTED}; border-top:1px solid #EDF1F7; margin-top:10px; }}
</style></head>
<body><div class="card">
  <div class="hdr">
    <div class="tag">Ringkasan Monitoring &middot; Dashboard Capreno SS1</div>
    <h1>{esc(title)}</h1>
    <div class="sub">{esc(subtitle)}</div>
  </div>
  <div class="body">
    <div class="legend"><span class="chip" style="background:{BLUE}">1-4</span> FP (Farmer Practice) &nbsp; <span class="chip" style="background:{ORANGE}">1-4</span> Capreno &nbsp; &middot; &nbsp; urutan: umum / khusus / performa tanaman</div>
    {"".join(body_blocks)}
    {excluded_html}
  </div>
  <div class="ftr">Dihasilkan: {esc(generated_at)} &middot; Ringkasan otomatis oleh sistem monitoring Dashboard Capreno SS1 &middot; untuk detail per demo, minta laporan JPG individual.</div>
</div></body></html>'''
    return html


if __name__ == "__main__":
    payload_path, out_path = sys.argv[1], sys.argv[2]
    with open(payload_path, encoding="utf-8") as fh:
        payload = json.load(fh)
    html_out = build(payload)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html_out)
