"""
Generate a PDF report for newly-detected demo data (Dashboard Capreno SS1 monitoring).

Usage:
    python3 make_new_data_pdf.py <output_pdf_path> <json_payload_path>

json_payload shape:
{
  "detected_at": "2026-11-07T20:30:00Z",
  "rows": [
    {"sheet": "Demo SS2", "nomor_demo": "01", "nama_petugas": "Della", "lokasi_demo": "Dono Arum"},
    ...
  ],
  "new_sheets": ["Demo NS (id ...)"]   # optional, list of newly-appeared spreadsheet titles
}
"""
import sys, json, datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def build(output_path, payload_path):
    with open(payload_path, encoding="utf-8") as f:
        payload = json.load(f)

    rows = payload.get("rows", [])
    new_sheets = payload.get("new_sheets", [])
    detected_at = payload.get("detected_at") or datetime.datetime.utcnow().isoformat() + "Z"

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], fontSize=16, spaceAfter=4)
    sub_style = ParagraphStyle("SubX", parent=styles["Normal"], textColor=colors.HexColor("#5B6A85"), fontSize=10, spaceAfter=14)
    h2 = ParagraphStyle("H2X", parent=styles["Heading2"], fontSize=12, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#0A2A5E"))

    story = []
    story.append(Paragraph("Laporan Data Baru - Dashboard Capreno SS1", title_style))
    story.append(Paragraph(f"Terdeteksi: {detected_at}", sub_style))

    if rows:
        story.append(Paragraph(f"Data demo baru ({len(rows)} entri)", h2))
        table_data = [["Sheet", "Nomor Demo", "Nama Petugas", "Lokasi Demo"]]
        for r in rows:
            table_data.append([
                r.get("sheet", ""),
                r.get("nomor_demo", "") or "-",
                r.get("nama_petugas", "") or "-",
                r.get("lokasi_demo", "") or "-",
            ])
        tbl = Table(table_data, colWidths=[28*mm, 28*mm, 38*mm, 70*mm], repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0A2A5E")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C3CFE0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F4F9")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(tbl)

    if new_sheets:
        story.append(Paragraph("Sheet baru terdeteksi", h2))
        for s in new_sheets:
            story.append(Paragraph(f"• {s}", styles["Normal"]))

    if not rows and not new_sheets:
        story.append(Paragraph("Tidak ada detail data untuk ditampilkan.", styles["Normal"]))

    story.append(Spacer(1, 16))
    story.append(Paragraph("Dihasilkan otomatis oleh sistem monitoring Dashboard Capreno SS1.", sub_style))

    doc = SimpleDocTemplate(output_path, pagesize=A4, title="Laporan Data Baru - Dashboard Capreno SS1")
    doc.build(story)

if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
