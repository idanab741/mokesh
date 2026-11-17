#!/usr/bin/env python3
"""Builds the English deck (mokesh-vercel/packs/en.js) from the original cards plus tools/en-cards/*.txt.

Source line: Target|aliases(comma)|difficulty(1-3)|trap words(comma)|clues separated by ~
A line starting with "# " sets the category for the lines below it ("# Target" lines are comments).
Original cards (the 396 cards before this tool) are kept as they are, in the same order, so card numbers stay stable.
New cards get the next ids. Run: python3 tools/en-cards/build.py [--check]
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PACK = os.path.join(ROOT, 'mokesh-vercel', 'packs', 'en.js')
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'base.json')
STOP = set('a an the and or of to in on at for with by from is are was were be been it its it\'s this that these those you your they them their he she his her we our as if not no but so than then very can could would should will just also often usually sometimes into out up down over under about after before when where what who how which one two some any most more many much all every each other another may might like used use made make has have had do does did get got there here only even still while because'.split())

def words(text):
    return [w for w in re.findall(r"[a-z0-9'&.-]+", text.lower()) if len(w) >= 3 and w not in STOP]

def load_base():
    if os.path.exists(BASE):
        return json.load(open(BASE, encoding='utf-8'))
    t = open(PACK, encoding='utf-8').read()
    cards = json.loads(t[t.index('=[') + 1:].rstrip().rstrip(';'))
    base = cards
    json.dump(base, open(BASE, 'w', encoding='utf-8'), ensure_ascii=False)
    return base

def main():
    base = load_base()
    seen = {c['target'].lower() for c in base}
    out, problems, n = list(base), [], max(int(c['id'].split('-')[1]) for c in base)
    for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '*.txt'))):
        cat = None
        for ln, line in enumerate(open(f, encoding='utf-8'), 1):
            line = line.strip()
            if not line:
                continue
            if line.startswith('#'):
                if not line.startswith('# Target'):
                    cat = line[1:].strip()
                continue
            parts = line.split('|')
            where = f'{os.path.basename(f)}:{ln}'
            if len(parts) != 5:
                problems.append(f'{where}: expected 5 fields'); continue
            target, aliases, diff, opts, clues = (p.strip() for p in parts)
            aliases = [a.strip() for a in aliases.split(',') if a.strip() and a.strip().lower() != target.lower()]
            opts = [o.strip() for o in opts.split(',') if o.strip()]
            clues = [c.strip() for c in clues.split('~') if c.strip()]
            if target.lower() in seen:
                problems.append(f'{where}: duplicate "{target}"'); continue
            if diff not in ('1', '2', '3'):
                problems.append(f'{where}: difficulty must be 1-3')
            if len(opts) < 6:
                problems.append(f'{where}: needs at least 6 trap words')
            if len(clues) < 4:
                problems.append(f'{where}: needs at least 4 clues')
            tl = target.lower()
            for c in clues:
                if tl in c.lower():
                    problems.append(f'{where}: clue gives away the answer: {c}')
            seen.add(tl)
            keys = []
            for w in [o.lower() for o in opts] + [a.lower() for a in aliases] + [w for c in clues for w in words(c)]:
                if w != tl and w not in keys and w not in tl.split():
                    keys.append(w)
            n += 1
            out.append({'id': f'en-{n:03d}', 'target': target, 'category': cat or 'General', 'difficulty': int(diff) if diff in '123' else 2,
                        'options': opts, 'aliases': aliases, 'clues': clues, 'keys': keys[:30]})
    if problems:
        print('\n'.join(problems)); sys.exit(1)
    if '--check' in sys.argv:
        print(f'ok: {len(out)} cards ({len(out) - len(base)} new)'); return
    body = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    open(PACK, 'w', encoding='utf-8').write(f'// Mokesh! — English deck ({len(out)} cards). Built by tools/en-cards/build.py\n'
                                            f'window.MOKESH_PACKS=window.MOKESH_PACKS||{{}};window.MOKESH_PACKS.en={body};\n')
    print(f'wrote {len(out)} cards ({len(out) - len(base)} new)')

main()
