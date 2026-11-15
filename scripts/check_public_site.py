"""Free stdlib availability, complete snapshot and freshness check. No Agent/AI calls."""
import argparse
import json
import tempfile
import time
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
try:
    from .validate_pages_release import ASSETS, validate
except ImportError:
    from validate_pages_release import ASSETS, validate

MAX_FILE = 8 * 1024 * 1024


def check(base, expected_version=None, max_age_days=7, strict_freshness=False):
    base = base.rstrip('/')+'/'
    parts = urlsplit(base)
    if parts.scheme not in {'http','https'} or parts.username or parts.password:
        raise ValueError('Invalid public URL')
    started = time.monotonic()
    total = 0

    def fetch(relative):
        nonlocal total
        url = urljoin(base, relative)
        if not url.startswith(base) or urlsplit(url).netloc != parts.netloc:
            raise ValueError('Unsafe manifest path')
        with urlopen(Request(url, headers={'User-Agent':'LightingMI-maintenance/1','Cache-Control':'no-cache'}), timeout=30) as r:
            if r.status != 200 or r.url.split('?')[0] != url: raise ValueError('Unexpected response/redirect')
            blob = r.read(MAX_FILE+1)
            if len(blob)>MAX_FILE: raise ValueError('Public file exceeds 8 MiB budget')
            total += len(blob)
            if total > 32*1024*1024: raise ValueError('Snapshot exceeds 32 MiB budget')
            return blob

    with tempfile.TemporaryDirectory() as name:
        root = Path(name).resolve()
        blob = fetch('manifest.json'); manifest = json.loads(blob)
        if expected_version and manifest['dataset_version'] != expected_version:
            raise ValueError('Deployed version is not expected version; retry after Pages completes')
        (root/'manifest.json').write_bytes(blob)
        for asset in sorted(ASSETS): (root/asset).write_bytes(fetch(asset))
        if len(manifest['files']) > 10000: raise ValueError('Manifest too large')
        for entry in manifest['files'].values():
            relative = entry['path']
            if not isinstance(relative,str) or '\\' in relative or '..' in relative.split('/') or relative.startswith('/'):
                raise ValueError('Unsafe manifest path')
            target = root/relative
            if not target.resolve().is_relative_to(root): raise ValueError('Unsafe destination')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(fetch(relative))
        report = validate(root)
        cutoff = date.fromisoformat(manifest['data_as_of'])
        generated = datetime.fromisoformat(manifest['generated_at'])
        if generated.tzinfo is None or generated > datetime.now(timezone.utc):
            raise ValueError('Invalid generated timestamp')
        age = (datetime.now(ZoneInfo('Asia/Shanghai')).date()-cutoff).days
        if age<0: raise ValueError('Future data cutoff')
        warnings = []
        if age>max_age_days: warnings.append(f'资料截至日期距今 {age} 天；请检查采集、待审和同步状态，不能直接推断网站故障')
        if strict_freshness and warnings: raise ValueError(warnings[0])
        report.update(status='ok', data_age_days=age, warnings=warnings,
                      downloaded_bytes=total, elapsed_seconds=round(time.monotonic()-started,2))
        return report


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--url',default='https://7kpzkrfj45-netizen.github.io/lighting-mi/')
    p.add_argument('--expected-version');p.add_argument('--max-age-days',type=int,default=7)
    p.add_argument('--strict-freshness',action='store_true')
    a=p.parse_args()
    print(json.dumps(check(a.url,a.expected_version,a.max_age_days,a.strict_freshness),ensure_ascii=False,indent=2))
