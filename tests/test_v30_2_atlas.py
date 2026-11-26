"""v30.2 — Grand Line atlas mobile polish: breadcrumb, island hitboxes, compass."""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8773/'
VIEWPORTS = (
    (320, 568),
    (375, 667),
    (390, 844),
    (430, 932),
    (768, 1024),
    (1024, 768),
    (1280, 800),
)


def go_map(page, width):
    page.goto(URL, wait_until='networkidle', timeout=25000)
    page.wait_for_timeout(350)
    if width <= 920:
        page.locator('.mobile-nav [data-tab="map"]').click()
    else:
        page.locator('.nav-button[data-tab="map"], [data-tab="map"]').first.click()
    page.wait_for_selector('.gl-atlas-stage', timeout=10000)
    page.wait_for_timeout(250)


def rects_overlap(a, b, min_area=1):
    x1 = max(a['x'], b['x'])
    y1 = max(a['y'], b['y'])
    x2 = min(a['x'] + a['w'], b['x'] + b['w'])
    y2 = min(a['y'] + a['h'], b['y'] + b['h'])
    ow = x2 - x1
    oh = y2 - y1
    if ow <= 0 or oh <= 0:
        return 0
    return ow * oh if ow * oh >= min_area else 0


def main():
    chrome = '/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else None
    kwargs = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    if chrome:
        kwargs['executable_path'] = chrome
    with sync_playwright() as pw:
        browser = pw.chromium.launch(**kwargs)
        for width, height in VIEWPORTS:
            page = browser.new_page(
                viewport={'width': width, 'height': height},
                is_mobile=width <= 430,
                has_touch=width <= 430,
            )
            # Reduced motion pass on one phone size
            if width == 390:
                page.emulate_media(reduced_motion='reduce')
            go_map(page, width)

            metrics = page.evaluate(
                """() => {
                  const islands=[...document.querySelectorAll('.gl-island')].map((el,i)=>{
                    const r=el.getBoundingClientRect();
                    return {
                      i, first: Number(el.dataset.first),
                      x:r.x, y:r.y, w:r.width, h:r.height,
                      disabled: el.getAttribute('aria-disabled')==='true',
                      fogged: el.classList.contains('fogged'),
                    };
                  });
                  const bc=document.querySelector('.breadcrumb');
                  const tag=document.querySelector('.top-actions .tiny-tag');
                  const compass=document.querySelector('.gl-atlas-compass');
                  const title=document.querySelector('.gl-atlas-top strong');
                  const tcs=getComputedStyle(title);
                  const ccs=compass?getComputedStyle(compass):null;
                  return {
                    islands,
                    breadcrumbText: (bc?.textContent||'').replace(/\\s+/g,' ').trim(),
                    breadcrumbTruncated: bc ? bc.scrollWidth > bc.clientWidth + 1 : null,
                    tagText: (tag?.textContent||'').replace(/\\s+/g,' ').trim(),
                    docOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                    compassDisplay: ccs?.display,
                    compassOpacity: ccs ? parseFloat(ccs.opacity) : null,
                    compassRect: compass && ccs.display!=='none' ? (()=>{const r=compass.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})() : null,
                    titleColor: tcs.color,
                    titleFs: tcs.fontSize,
                    navFixed: widthHard => true,
                    mobileNav: !!document.querySelector('.mobile-nav') && getComputedStyle(document.querySelector('.mobile-nav')).position,
                  };
                }"""
            )

            # Breadcrumb — map uses short contextual label (no "GRANDE ROTTA /" prefix)
            assert metrics['breadcrumbText'].endswith('MAPPA SAGHE') or metrics['breadcrumbText'] == 'MAPPA SAGHE' or 'MAPPA SAGHE' in metrics['breadcrumbText'], f'{width}: breadcrumb={metrics["breadcrumbText"]}'
            assert 'MAPPA DELLE SAGHE' not in metrics['breadcrumbText']
            assert 'GRANDE ROTTA' not in metrics['breadcrumbText'], f'{width}: map should use short breadcrumb'
            if width <= 390:
                assert not metrics['breadcrumbTruncated'], f'{width}: breadcrumb still truncated ({metrics["breadcrumbText"]})'
            assert 'ARCHIVIO' in metrics['tagText']

            # Overflow + nav
            assert not metrics['docOverflowX'], f'{width}: horizontal overflow'
            if width <= 920:
                assert metrics['mobileNav'] == 'fixed', f'{width}: bottom nav not fixed'

            islands = metrics['islands']
            assert len(islands) == 11, f'{width}: expected 11 islands'

            # Touch / hitboxes on compact phones (CSS box ≥44; allow tiny transform variance)
            if width <= 430:
                sizes = page.evaluate(
                    """() => [...document.querySelectorAll('.gl-island')].map(el=>{
                      const cs=getComputedStyle(el);
                      return {w:parseFloat(cs.width), h:parseFloat(cs.height), minH:parseFloat(cs.minHeight)};
                    })"""
                )
                for i, sz in enumerate(sizes):
                    assert sz['w'] >= 44 and sz['h'] >= 44 and sz['minH'] >= 44, f'{width}: island {i+1} css box {sz}'
                # Problematic overlap: >35% of the smaller box (ambiguous tap)
                bad = []
                for a in range(len(islands)):
                    for b in range(a + 1, len(islands)):
                        area = rects_overlap(islands[a], islands[b])
                        if area <= 0:
                            continue
                        smaller = min(islands[a]['w'] * islands[a]['h'], islands[b]['w'] * islands[b]['h'])
                        if smaller > 0 and area / smaller > 0.35:
                            bad.append((islands[a]['i'] + 1, islands[b]['i'] + 1, round(area), round(100 * area / smaller)))
                assert not bad, f'{width}: ambiguous island overlaps {bad}'

            # Compass rules: hidden through stacked mobile/tablet; decorative on desktop only
            if width <= 920:
                assert metrics['compassDisplay'] == 'none', f'{width}: compass should be hidden on stacked layout'
            else:
                assert metrics['compassDisplay'] != 'none'
                assert metrics['compassOpacity'] is not None and metrics['compassOpacity'] <= 0.35
                cr = metrics['compassRect']
                hits = []
                for isl in islands:
                    if rects_overlap(cr, isl) > 40:
                        hits.append(isl['i'] + 1)
                assert not hits, f'{width}: compass overlaps interactive islands {hits}'

            # Title readable (light foam on dark band)
            rgb = metrics['titleColor']
            assert '255' in rgb or '246' in rgb or 'rgb(255' in rgb, f'{width}: unexpected title color {rgb}'

            # Tap islands 1, 6, 11 (indices 0,5,10) when not fogged
            for idx in (0, 5, 10):
                isl = islands[idx]
                if isl['fogged'] or isl['disabled']:
                    continue
                page.locator(f'.gl-island[data-first="{isl["first"]}"]').click(force=True)
                page.wait_for_timeout(200)
                state = page.evaluate(
                    """(first) => ({
                      selected: document.querySelector('.gl-island.is-selected')?.dataset.first,
                      rail: document.querySelector('.gl-atlas-rail-item.is-selected')?.dataset.first,
                      panel: document.querySelector('#atlas-panel h3')?.textContent?.trim() || '',
                    })""",
                    str(isl['first']),
                )
                assert state['selected'] == str(isl['first']), f'{width}: map select {isl["first"]} got {state["selected"]}'
                assert state['rail'] == str(isl['first']), f'{width}: rail desync for {isl["first"]}'
                assert state['panel'], f'{width}: empty panel after tap {isl["first"]}'

            # Fogged islands stay non-interactive
            fogged = [i for i in islands if i['fogged'] or i['disabled']]
            for isl in fogged[:2]:
                page.locator(f'.gl-island[data-first="{isl["first"]}"]').click(force=True)
                page.wait_for_timeout(120)
                sel = page.evaluate('() => document.querySelector(".gl-island.is-selected")?.dataset.first')
                assert sel != str(isl['first']), f'{width}: fogged island {isl["first"]} became selected'

            # Rail still works
            page.locator('.gl-atlas-rail-item:not(.fogged)').first.click()
            page.wait_for_timeout(150)
            assert page.locator('.gl-island.is-selected').count() == 1

            print(f'OK {width}x{height}')
            page.close()
        browser.close()
    print('v30.2 atlas checks passed')


if __name__ == '__main__':
    main()
