"""
Archive a generated petugas report (the HTML built by make_report_html.py) as
plain Markdown text, using the `markitdown` library. Saved alongside the JPG
so each report has a searchable/greppable text counterpart (not the image).

We convert the HTML (not the final JPG) because the HTML already carries the
exact structured text we generated — converting it is lossless, whereas
OCR'ing our own rendered screenshot would be lossy and pointless (we already
know what's on it). The JPG stays the shareable artifact for WA; the .md is
the archive/search artifact.

Usage:
    python3 make_report_markdown.py <report.html> <output.md>
"""
import sys
from markitdown import MarkItDown


def build(html_path):
    md = MarkItDown()
    result = md.convert(html_path)
    return result.text_content


if __name__ == "__main__":
    html_path, out_path = sys.argv[1], sys.argv[2]
    text = build(html_path)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(text)
