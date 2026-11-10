"""Builds the Ashford Roads Decisions page from decisions.json.

Usage: python3 -X utf8 -I docs/decisions/build_decisions_page.py   (from possibilities-act1/)
Writes docs/decisions/decisions.html, published as the "Ashford Roads Decisions" artifact.
Ids come from the page and the place in it, so add new questions at the end of a page.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAGES = [("tone", "Tone"), ("world", "World"), ("story", "Act 1"), ("play", "Playing it"),
         ("rules", "Rules gaps"), ("look", "Look")]


def main() -> None:
    items = json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))
    labels = dict(PAGES)
    counts: dict[str, int] = {}
    out = []
    for d in items:
        page = d["page"]
        assert page in labels, f"unknown page {page!r} in {d['title']!r}"
        counts[page] = counts.get(page, 0) + 1
        out.append({"id": f"{page}-{counts[page]}", "page": page, "pageLabel": labels[page], "n": counts[page],
                    "code": "", "group": d.get("group", ""), "title": d["title"], "context": d.get("context", ""),
                    "recommended": d["recommended"], "alternatives": d.get("alternatives", [])})
    pages = [{"key": "all", "label": "All"}] + [{"key": k, "label": v} for k, v in PAGES]
    html = (HERE / "template.html").read_text(encoding="utf-8")
    data = json.dumps(out, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace("__DECISIONS__", data).replace("__PAGES__", json.dumps(pages, ensure_ascii=False))
    (HERE / "decisions.html").write_text(html, encoding="utf-8", newline="\n")
    print(f"{len(out)} decisions on {len(PAGES)} pages -> decisions.html")


if __name__ == "__main__":
    main()
