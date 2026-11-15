"""Dependency-free public artifact validation, copied into the clean publishing repository."""
import argparse
import hashlib
import json
import re
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from urllib.parse import urlsplit

ASSETS = {'.nojekyll', 'index.html', 'events.html', 'event.html', 'companies.html',
          'company.html', 'about.html', 'style.css', 'app.mjs', 'model.mjs', 'icon.svg'}
EVENT_KEYS = {'id','title','summary','company_ids','category','tags','latest_disclosure_date',
              'latest_stage','participants','purpose_type','purpose','impact','impact_basis','progress'}
INDEX_KEYS = {'id','title','summary','company_ids','category','tags','latest_disclosure_date','latest_stage','years'}
PROGRESS_KEYS = {'id','stage','fact','disclosure_date','event_date','event_date_raw','date_precision','planned','sources'}
SOURCE_KEYS = {'title','publisher','url','publication_date','excerpt','locator'}
CATEGORIES = {'M&A','Partnership','Supply Chain Resilience','Manufacturing'}
SECRET = re.compile(r'(?:gh[pousr]_[A-Za-z0-9_]{25,}|github_pat_[A-Za-z0-9_]{25,}|sk-(?:proj-)?[A-Za-z0-9_-]{25,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)')
PRIVATE = re.compile(r'/Users/|/private/tmp/|[A-Z]:\\Users\\|PRIVATE_(?:TOKEN|FACT|STAGE)|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(root):
    root = Path(root).resolve()
    require(root.is_dir(), 'Public directory missing')
    require(not any(p.is_symlink() for p in root.rglob('*')), 'Symlinks forbidden in public artifacts')
    manifest = json.loads((root/'manifest.json').read_text())
    require(set(manifest) == {'schema_version','dataset_version','generated_at','data_as_of','event_count','files'}, 'Unexpected manifest field')
    require(manifest['schema_version']==1 and re.fullmatch('[0-9a-f]{20}',manifest['dataset_version']), 'Invalid schema/version')
    cutoff = date.fromisoformat(manifest['data_as_of'])
    generated = datetime.fromisoformat(manifest['generated_at'])
    require(cutoff <= datetime.now(ZoneInfo('Asia/Shanghai')).date() and generated.tzinfo is not None, 'Invalid manifest dates')
    expected = ASSETS | {'manifest.json'}
    payloads = {}
    for key, item in manifest['files'].items():
        require(re.fullmatch(r'(?:companies|events-index|coverage|redirects)\.json|events/[1-9][0-9]*\.json',key), 'Unexpected data filename')
        require(set(item)=={'path','sha256'} and item['path']==f'data/{manifest["dataset_version"]}/{key}', 'Invalid data path')
        p=root/item['path']
        blob=p.read_bytes()
        require(hashlib.sha256(blob).hexdigest()==item['sha256'], 'Data checksum mismatch')
        expected.add(item['path'])
        payloads[key]=json.loads(blob)
    actual={str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()}
    require(actual==expected, 'Unexpected/missing files in public artifact')
    for p in root.rglob('*'):
        if not p.is_file():continue
        text=p.read_text(encoding='utf-8')
        require(not SECRET.search(text), f'Credential-shaped content in {p.relative_to(root)}; value omitted')
        require(not PRIVATE.search(text), f'Private path/contact/fixture in {p.relative_to(root)}; value omitted')
        if p.suffix=='.html':
            for link in re.findall(r'(?:src|href)="([^"]+)"',text):
                require(not link.startswith(('/', 'http:', 'https:')), 'HTML has root/external asset dependency')
                target=link.split('#')[0].split('?')[0]
                if target:require((p.parent/target).is_file(), 'Broken HTML resource/link')
    companies=payloads['companies.json']
    require(len(companies)==19, 'Expected fixed 19 companies')
    company_ids={c['id'] for c in companies}
    require(len(company_ids)==len(companies), 'Duplicate company ID')
    for c in companies:
        require(set(c)=={'id','name','group','aliases'} and c['group'] in {'China','International'}, 'Invalid company fields')
    index=payloads['events-index.json']
    require(len(index)==manifest['event_count'] and len({e['id'] for e in index})==len(index), 'Event count/duplicate ID mismatch')
    for item in index:
        require(set(item)==INDEX_KEYS, 'Unexpected index field')
        event=payloads[f'events/{item["id"]}.json']
        require(set(event)==EVENT_KEYS, 'Unexpected event field')
        require(event['category'] in CATEGORIES and set(event['company_ids'])<=company_ids, 'Invalid category/company')
        require(event['progress'] and set(event['tags'])<=CATEGORIES and event['category'] not in event['tags'], 'Invalid progress/tags')
        for key in INDEX_KEYS-{'years'}:require(event[key]==item[key], 'Index differs from detail')
        require(set(item['years'])=={p['disclosure_date'][:4] for p in event['progress']}, 'Year statistics mismatch')
        require(event['latest_disclosure_date']==max(p['disclosure_date'] for p in event['progress']), 'Latest date mismatch')
        for participant in event['participants']:
            require(set(participant)=={'company_id','name','role'} and participant['company_id'] in company_ids, 'Unexpected participant data')
        require(len({p['id'] for p in event['progress']})==len(event['progress']), 'Duplicate progress ID')
        for p in event['progress']:
            require(set(p)==PROGRESS_KEYS and p['sources'], 'Unexpected progress field/no source')
            require(date.fromisoformat(p['disclosure_date'])<=cutoff, 'Progress after data cutoff')
            require(p['date_precision'] in {'day','month','year','unknown'} and type(p['planned']) is bool, 'Invalid progress date/type')
            if p['event_date']:
                require(date.fromisoformat(p['event_date'])<=cutoff or p['planned'], 'Unmarked future stage')
            for s in p['sources']:
                require(set(s)==SOURCE_KEYS and 0<len(s['excerpt'])<=800, 'Unexpected source field/excerpt')
                u=urlsplit(s['url'])
                require(u.scheme in {'http','https'} and u.hostname and not u.username and not u.password, 'Unsafe source URL')
    require(set(payloads)=={'companies.json','events-index.json','coverage.json','redirects.json'}|{f'events/{e["id"]}.json' for e in index}, 'Orphan data/detail file')
    require({'summary','complete','schema_version'} <= set(payloads['coverage.json']) <= {'summary','complete','schema_version','reviewed_at'} and payloads['coverage.json']['complete'] is False, 'Invalid coverage fields')
    if payloads['coverage.json'].get('reviewed_at'):
        require(date.fromisoformat(payloads['coverage.json']['reviewed_at'])<=datetime.now(ZoneInfo('Asia/Shanghai')).date(), 'Future review date')
    redirects=payloads['redirects.json'];ids={e['id'] for e in index}
    require(all(old not in ids and target in ids and re.fullmatch('[1-9][0-9]*',old) for old,target in redirects.items()), 'Unsafe redirect')
    return {'files':len(actual),'events':len(index),'companies':len(companies),'dataset_version':manifest['dataset_version'],'data_as_of':manifest['data_as_of']}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('directory',type=Path)
    args=parser.parse_args()
    print(json.dumps(validate(args.directory),ensure_ascii=False))
