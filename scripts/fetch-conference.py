#!/usr/bin/env python3
"""Fetch General Conference talk -> scripture citations from the BYU Scripture
Citation Index (scriptures.byu.edu) into a raw JSON cache.

    python3 scripts/fetch-conference.py RAW_OUT.json

Step 1 lists every session (gc_ajax/<year>/<A|O>) for talk ids, speakers,
titles and church-site URLs. Step 2 fetches each talk (talks_ajax/<id>) and
keeps only the scripture citation strings. Run scripts/build-conference.mjs
afterwards to turn the raw cache into data/conference/<slug>.json.
Requests are throttled (4 at a time) to be polite to the BYU server.
"""
import html, json, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = 'https://scriptures.byu.edu'
OUT = sys.argv[1]


def get(path, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(BASE + path, timeout=40) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # network blip: back off and retry
            if i == tries - 1:
                print('FAIL', path, e, file=sys.stderr)
                return ''
            time.sleep(2 ** i)


def text(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def session(ys):
    year, s = ys
    page = get(f'/citation_index/gc_ajax/{year}/{s}')
    talks = []
    for m in re.finditer(r"getTalk\('(\d+)'\);\">\s*<div class=\"speaker\">(.*?)</div>.*?<div class=\"talktitle[^\"]*\">(.*?)</div>(.*?)</li>", page, re.S):
        tid, speaker, title, rest = m.groups()
        u = re.search(r"watchTalk\('\d+', '([^']+)'\)", rest)
        talks.append({'id': int(tid), 'y': year, 's': s, 'sp': text(speaker), 'ti': text(title),
                      'u': html.unescape(u.group(1)) if u else None})
    return talks


def talk(t):
    page = get(f"/content/talks_ajax/{t['id']}")
    cites = re.findall(r'onclick="gs\(\d+\)">(.*?)</a>', page, re.S)
    t['c'] = [text(c) for c in cites]
    return t


def main():
    sessions = [(y, s) for y in range(1942, 2027) for s in ('A', 'O')]
    with ThreadPoolExecutor(4) as ex:
        talks = [t for ts in ex.map(session, sessions) for t in ts]
    seen, uniq = set(), []
    for t in talks:
        if t['id'] not in seen:
            seen.add(t['id']); uniq.append(t)
    print(len(uniq), 'talks listed', file=sys.stderr)
    done = []
    with ThreadPoolExecutor(4) as ex:
        for i, t in enumerate(ex.map(talk, uniq)):
            done.append(t)
            if i % 250 == 0:
                print(i, 'talks fetched', file=sys.stderr)
    with open(OUT, 'w') as f:
        json.dump(done, f)
    print('wrote', OUT, len(done), file=sys.stderr)


if __name__ == '__main__':
    main()
