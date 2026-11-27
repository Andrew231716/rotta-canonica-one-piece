"""v30.3 — atlas tablet/desktop clipping & density refinements.

Asserts pin/media/label stay inside the stage on tablet/desktop viewports
without changing island coordinates or hiding labels.
"""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8783/'
VIEWPORTS = (
    (320, 568),
    (390, 844),
    (430, 932),
    (768, 1024),
    (820, 1180),
    (920, 1024),
    (1024, 768),
    (1180, 820),
    (1280, 800),
)
TAP_FIRSTS = ('1', '385', '1086')


def go_map(page, width):
    page.goto(URL, wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(250)
    if width <= 920:
        page.locator('.mobile-nav [data-tab="map"]').click()
    else:
        page.locator('.nav-button[data-tab="map"]').click()
    page.wait_for_selector('.gl-atlas-stage', timeout=12000)
    page.locator('.gl-atlas-stage').scroll_into_view_if_needed()
    page.wait_for_timeout(180)


def unlock_spoiler(page, width):
    if width <= 920:
        page.locator('.mobile-nav [data-tab="more"]').click()
        page.wait_for_timeout(120)
        page.locator('.tool-tile[data-tab="settings"]').click()
    else:
        page.locator('.nav-button[data-tab="settings"]').click()
    page.wait_for_selector('.setting-item [data-action="spoiler-toggle"]', timeout=8000)
    btn = page.locator('.setting-item [data-action="spoiler-toggle"]').first
    if 'Disattiva' in btn.inner_text():
        btn.click()
        page.wait_for_timeout(200)
    if width <= 920:
        page.locator('.mobile-nav [data-tab="map"]').click()
    else:
        page.locator('.nav-button[data-tab="map"]').click()
    page.wait_for_selector('.gl-atlas-stage')
    page.locator('.gl-atlas-stage').scroll_into_view_if_needed()
    page.wait_for_timeout(200)


def measure(page):
    return page.evaluate(
        """() => {
          const stage = document.querySelector('.gl-atlas-stage');
          const sr = stage.getBoundingClientRect();
          const eps = 1.25;
          const islands = [...document.querySelectorAll('.gl-island')].map((el, i) => {
            const pin = el.querySelector('.gl-island-pin').getBoundingClientRect();
            const med = el.querySelector('.gl-island-media').getBoundingClientRect();
            const labEl = el.querySelector('.gl-island-label');
            const lab = labEl && getComputedStyle(labEl).display !== 'none'
              ? labEl.getBoundingClientRect() : null;
            const bad = {};
            const check = (key, overflow) => { if (overflow > eps) bad[key] = +overflow.toFixed(1); };
            check('pinR', pin.right - sr.right); check('pinL', sr.left - pin.left);
            check('pinB', pin.bottom - sr.bottom); check('pinT', sr.top - pin.top);
            check('medR', med.right - sr.right); check('medL', sr.left - med.left);
            check('medB', med.bottom - sr.bottom); check('medT', sr.top - med.top);
            if (lab) {
              check('labR', lab.right - sr.right); check('labL', sr.left - lab.left);
              check('labB', lab.bottom - sr.bottom); check('labT', sr.top - lab.top);
            }
            return { n: i + 1, first: Number(el.dataset.first), bad, labelVisible: !!lab };
          });
          const compass = document.querySelector('.gl-atlas-compass');
          const ccs = compass ? getComputedStyle(compass) : null;
          return {
            stageH: Math.round(sr.height),
            overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            compassDisplay: ccs?.display || null,
            breadcrumb: (document.querySelector('.breadcrumb')?.textContent || '').replace(/\\s+/g, ' ').trim(),
            islands,
            clipped: islands.filter(i => Object.keys(i.bad).length),
          };
        }"""
    )


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
                has_touch=width <= 920,
            )
            go_map(page, width)
            unlock_spoiler(page, width)
            data = measure(page)

            assert 'MAPPA SAGHE' in data['breadcrumb']
            assert not data['overflowX'], f'{width}x{height}: horizontal overflow'
            assert not data['clipped'], f'{width}x{height}: clipped {data["clipped"]}'
            if width <= 920:
                assert data['compassDisplay'] == 'none'
            else:
                assert data['compassDisplay'] != 'none'
            if width <= 430:
                assert all(not i['labelVisible'] for i in data['islands'])
            else:
                assert all(i['labelVisible'] for i in data['islands'])
            if 431 <= width <= 920:
                assert data['stageH'] >= 380, f'tablet stage too short: {data["stageH"]}'

            for first in TAP_FIRSTS:
                page.locator(f'.gl-island[data-first="{first}"] .gl-island-pin').click(timeout=5000)
                page.wait_for_timeout(160)
                state = page.evaluate(
                    """(f) => ({
                      selected: document.querySelector('.gl-island.is-selected')?.dataset.first,
                      rail: document.querySelector('.gl-atlas-rail-item.is-selected')?.dataset.first,
                      panel: document.querySelector('#atlas-panel h3')?.textContent?.trim() || ''
                    })""",
                    first,
                )
                assert state['selected'] == first and state['rail'] == first and state['panel'], (
                    f'{width}x{height}: tap {first} desync {state}'
                )

            print(f'OK {width}x{height} stageH={data["stageH"]} clipped=0 taps=1/6/11')
            page.close()
        browser.close()
    print('v30.3 atlas tablet/desktop checks passed')


if __name__ == '__main__':
    main()
