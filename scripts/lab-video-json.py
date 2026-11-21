"""Builds content/lab/videos/<id>.json from a Quarxel script and upload sheet.

  python3 scripts/lab-video-json.py <youtube>/script-press-enter.md <youtube>/channel/one-blink-upload.md content/lab/videos/one-blink.json
"""
import json, re, sys
script_path, upload_path, out_path = sys.argv[1:4]
script = open(script_path, encoding="utf-8").read()
upload = open(upload_path, encoding="utf-8").read()

# --- description block (YouTube text)
desc = re.search(r"<!-- description:start -->\n```\n(.*?)\n```", upload, re.S).group(1)
parts = desc.split("\nCHAPTERS\n")
intro = [p.strip() for p in parts[0].split("\n\n") if p.strip()]
rest = parts[1]
chap_txt, rest = rest.split("\n\nHOW THIS IS MADE\n")
chapters = []
for line in chap_txt.strip().splitlines():
    m = re.match(r"(\d\d):(\d\d) (.+)", line)
    chapters.append({"t": f"{m[1]}:{m[2]}", "s": int(m[1]) * 60 + int(m[2]), "title": m[3]})
how, rest = rest.split("\n\nNEXT\n")
how_made = [l for l in how.strip().splitlines() if l.strip()]
nxt, rest = rest.split("\n\nSOURCES\n")
src_txt = rest.split("\n\n#")[0]
groups, note = [], None
for block in src_txt.strip().split("\n\n"):
    lines = block.strip().splitlines()
    if len(lines) == 1 and "http" not in lines[0]:
        note = lines[0]; continue
    if not re.search(r": https?://", lines[0]):
        topic, items = lines[0], lines[1:]
    else:
        topic, items = None, lines
    entries = []
    for it in items:
        m = re.match(r"(.+?): (https?://\S+)$", it)
        if m: entries.append({"label": m[1], "url": m[2]})
    if topic is None and not entries:
        note = block.strip(); continue
    groups.append({"topic": topic, "items": entries})

# --- narration per scene
narration = []
for m in re.finditer(r"^## (S\d+[a-z]?) · (.+?)\n(.*?)(?=^## |\Z)", script, re.S | re.M):
    sid, head, body = m[1], m[2], m[3]
    hm = re.match(r"(.+?) \((.+)\)$", head)
    name, clock = (hm[1], hm[2]) if hm else (head, None)
    quote = []
    for line in body.splitlines():
        if line.startswith("**Visuals**") or line.startswith("**Sound"):
            break
        if line.startswith(">"):
            quote.append(line[1:].strip())
    paras = [p.strip() for p in "\n".join(quote).split("\n\n") if p.strip()]
    paras = [re.sub(r"\s*\n\s*", " ", p) for p in paras]
    if paras:
        narration.append({"id": sid, "name": name, "clock": clock, "paragraphs": paras})

# --- research (fact check section), generic markdown blocks
fc = script[script.index("## Fact check"):]
fc_title = fc.splitlines()[0][3:]
research = []
for sec in re.split(r"^### ", fc, flags=re.M)[1:]:
    title, _, body = sec.partition("\n")
    blocks, lines, i = [], body.strip("\n").splitlines(), 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.match(r"^\|[\s:|-]+\|$", lines[i].strip()):
                    rows.append([c.strip() for c in lines[i].strip().strip("|").split(" | ")])
                i += 1
            blocks.append({"type": "table", "head": rows[0], "rows": rows[1:]})
            continue
        if line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(lines[i][2:].strip()); i += 1
            blocks.append({"type": "list", "items": items})
            continue
        if line.strip():
            para = [line.strip()]; i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].startswith(("|", "- ")):
                para.append(lines[i].strip()); i += 1
            blocks.append({"type": "p", "text": " ".join(para)})
            continue
        i += 1
    research.append({"title": title.strip(), "blocks": blocks})

data = {
    "description": intro, "chapters": chapters, "howMade": how_made, "next": nxt.strip(),
    "sources": groups, "sourcesNote": note,
    "factCheckTitle": fc_title, "research": research, "narration": narration,
}
json.dump(data, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(chapters), "chapters,", sum(len(g["items"]) for g in groups), "sources,", len(narration), "scenes,",
      sum(len(s["blocks"]) for s in research), "research blocks in", len(research), "sections; note:", bool(note))
