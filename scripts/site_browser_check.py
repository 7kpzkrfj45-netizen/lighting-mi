"""Dataset-independent desktop/mobile interaction and modest performance budgets."""
import argparse
import json
import os
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright


def check(url):
    base=url.rstrip('/')+'/'
    with sync_playwright() as p:
        browser=p.chromium.launch(**({'executable_path':os.environ['CHROME_PATH']} if os.environ.get('CHROME_PATH') else {}))
        page=browser.new_page();page.set_default_timeout(20000)
        errors=[];requests=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda r:requests.append((r.method,r.url)))
        page.goto(base);page.locator('#footer a').first.wait_for()
        assert not page.locator('[role=alert]').count(), 'Homepage data failure'
        render=page.evaluate('performance.now()')
        assert render<15000, 'First render exceeded 15 seconds (unthrottled smoke budget)'
        manifest=page.request.get(base+'manifest.json').json()
        page.goto(base+'events.html?period=all');page.locator('#footer a').first.wait_for()
        page.locator('input[name=q]').fill('maintenance-no-match-79d90')
        page.get_by_role('button',name='应用筛选').click()
        page.get_by_role('heading',name='暂无符合条件的事件').wait_for()
        page.goto(base+'events.html?period=all&view=table');page.locator('#footer a').first.wait_for()
        if manifest['event_count']:
            page.locator('.event-table tbody tr').first.locator('td').nth(1).locator('a').first.click()
            page.get_by_role('heading',name='阶段与进展').wait_for()
            assert page.locator('.source-card').count()>0
            page.reload();page.get_by_role('heading',name='事实摘要',exact=True).wait_for()
            page.get_by_role('link',name='返回事件库').click()
            page.locator('.event-table').wait_for()
        page.goto(base+'event.html?id=99999999')
        page.get_by_role('heading',name='记录不存在或已撤回').wait_for()
        for width in [360,390,1440]:
            page.set_viewport_size({'width':width,'height':900})
            for path in ['', 'events.html?period=all','companies.html','about.html']:
                page.goto(base+path);page.locator('#footer a').first.wait_for()
                assert not page.locator('[role=alert]').count()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,path)
        page.goto(base+'companies.html');page.locator('.company-card').first.wait_for()
        assert page.locator('.company-card').count()==19
        page.locator('.company-card').first.click();page.locator('#footer a').first.wait_for()
        assert not page.locator('[role=alert]').count()
        # Check deterministic data-failure state and recovery without editing production.
        page.route('**/events-index.json',lambda r:r.fulfill(status=200,body='[]',content_type='application/json'))
        page.goto(base);page.get_by_role('heading',name='暂时无法展示资料').wait_for() if manifest['event_count'] else None
        page.unroute('**/events-index.json');page.goto(base);page.locator('#footer a').first.wait_for()
        assert not errors, errors
        assert all(method=='GET' and urlsplit(target).netloc==urlsplit(base).netloc for method,target in requests)
        browser.close()
        return {'status':'ok','events':manifest['event_count'],'viewports':[360,390,1440],
                'first_render_ms':round(render),'page_errors':errors,'same_origin_get_only':True}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='https://7kpzkrfj45-netizen.github.io/lighting-mi/')
    print(json.dumps(check(parser.parse_args().url),ensure_ascii=False,indent=2))
