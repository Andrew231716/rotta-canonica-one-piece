"""v30.1 — Wanted Filtra/Ordina readability + dossier clearance above fixed nav."""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8771/'
VIEWPORTS = ((320, 568), (375, 667), (390, 844), (430, 932))


def go_wanted(page):
    page.goto(URL, wait_until='networkidle', timeout=20000)
    page.wait_for_timeout(400)
    tile = page.locator('.tool-tile[data-tab="characters"]')
    if tile.count() and tile.first.is_visible():
        tile.first.click()
    else:
        page.locator('.mobile-nav [data-tab="more"]').click()
        page.wait_for_timeout(200)
        page.locator('.tool-tile[data-tab="characters"], .more-menu [data-tab="characters"]').first.click()
    page.wait_for_selector('#character-filter', timeout=10000)


def main():
    chrome = '/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else None
    kwargs = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    if chrome:
        kwargs['executable_path'] = chrome
    with sync_playwright() as pw:
        browser = pw.chromium.launch(**kwargs)
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True)
            go_wanted(page)
            page.locator('#character-filter').scroll_into_view_if_needed()
            metrics = page.evaluate(
                """() => {
                  const label = document.querySelector('.wanted-toolbar .character-filter-label');
                  const sel = document.querySelector('#character-filter');
                  const sort = document.querySelector('#character-sort');
                  const meta = document.querySelector('.wanted-meta');
                  const stats = document.querySelector('.wanted-stats span');
                  const lcs = getComputedStyle(label);
                  const scs = getComputedStyle(sel);
                  return {
                    labelH: label.getBoundingClientRect().height,
                    overflow: lcs.overflow,
                    filterH: sel.getBoundingClientRect().height,
                    filterW: sel.getBoundingClientRect().width,
                    filterFs: parseFloat(scs.fontSize),
                    filterPadRight: parseFloat(scs.paddingRight),
                    filterText: sel.options[sel.selectedIndex].text,
                    sortText: sort.options[sort.selectedIndex].text,
                    metaFs: parseFloat(getComputedStyle(meta).fontSize),
                    statsFs: parseFloat(getComputedStyle(stats).fontSize),
                  };
                }"""
            )
            assert metrics['labelH'] > 50, f'{width}: filter label still clipped ({metrics["labelH"]}px)'
            assert metrics['overflow'] == 'visible', f'{width}: filter label overflow={metrics["overflow"]}'
            assert metrics['filterH'] >= 40, f'{width}: select height {metrics["filterH"]}'
            assert metrics['filterW'] >= 120, f'{width}: select width {metrics["filterW"]}'
            assert metrics['filterFs'] >= 12, f'{width}: select font {metrics["filterFs"]}'
            assert metrics['filterPadRight'] >= 28, f'{width}: arrow padding {metrics["filterPadRight"]}'
            assert metrics['filterText'], f'{width}: empty filter value'
            assert metrics['sortText'], f'{width}: empty sort value'
            assert metrics['metaFs'] >= 11.5, f'{width}: meta font {metrics["metaFs"]}'
            assert metrics['statsFs'] >= 11.5, f'{width}: stats font {metrics["statsFs"]}'

            page.select_option('#character-filter', 'crew')
            page.wait_for_timeout(120)
            crew = page.evaluate('() => [...document.querySelectorAll(".wanted-poster:not([hidden])")].length')
            assert crew >= 1, f'{width}: crew filter empty'
            page.select_option('#character-filter', 'all')
            page.fill('.character-search input', 'luffy')
            page.wait_for_timeout(120)
            found = page.evaluate('() => [...document.querySelectorAll(".wanted-poster:not([hidden])")].length')
            assert found == 1, f'{width}: wanted search failed ({found})'
            page.fill('.character-search input', '')

            page.locator('.wanted-poster:not(.is-locked) .wanted-open').first.click()
            page.wait_for_selector('.wanted-dossier', timeout=5000)
            page.evaluate(
                """() => {
                  const m = document.querySelector('.modal-layer .modal');
                  if (m) m.scrollTop = m.scrollHeight;
                }"""
            )
            page.wait_for_timeout(120)
            dossier = page.evaluate(
                """() => {
                  const nav = document.querySelector('.mobile-nav').getBoundingClientRect();
                  const closeBtn = document.querySelector('.wanted-dossier .modal-buttons .button');
                  const actions = [...document.querySelectorAll('.wanted-dossier-actions .button')];
                  const cr = closeBtn.getBoundingClientRect();
                  return {
                    label: actions[0]?.textContent.trim(),
                    closeOverlap: Math.max(0, cr.bottom - nav.top),
                    actionOverlaps: actions.map(b => Math.max(0, b.getBoundingClientRect().bottom - nav.top)),
                    closeInView: cr.top >= 0 && cr.bottom <= innerHeight,
                  };
                }"""
            )
            assert dossier['label'] == '☆ Salva in archivio', f'{width}: label={dossier["label"]}'
            assert dossier['closeOverlap'] <= 0.5, f'{width}: close overlaps nav by {dossier["closeOverlap"]}'
            assert all(o <= 0.5 for o in dossier['actionOverlaps']), f'{width}: action under nav {dossier["actionOverlaps"]}'
            assert dossier['closeInView'], f'{width}: close button out of viewport'

            page.locator('[data-action="modal-cancel"]').click()
            page.wait_for_timeout(100)
            assert page.locator('.modal-layer').count() == 0
            page.locator('.wanted-poster:not(.is-locked) .wanted-open').first.click()
            page.wait_for_selector('.wanted-dossier')
            page.locator('[data-action="modal-cancel"]').click()
            print(f'OK {width}x{height}')
            page.close()
        browser.close()
    print('v30.1 Wanted/Dossier checks passed')


if __name__ == '__main__':
    main()
