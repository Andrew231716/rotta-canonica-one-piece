"""v30.2 validation hardening — hitboxes, no-force taps, contrast, motion.

Fails when selection would be ambiguous. Coordinate tweaks only if a real
hitbox defect is demonstrated (see islands 06–07 separation in features.js).
"""
from __future__ import annotations

import json
import re
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
REPORT_PATH = Path('/tmp/v302-hardening-report.json')
TAP_INDICES = (0, 5, 10)  # islands 1, 6, 11


def go_map(page, width):
    page.goto(URL, wait_until='networkidle', timeout=25000)
    page.wait_for_timeout(300)
    if width <= 920:
        page.locator('.mobile-nav [data-tab="map"]').click()
    else:
        page.locator('.nav-button[data-tab="map"], [data-tab="map"]').first.click()
    page.wait_for_selector('.gl-atlas-stage', timeout=10000)
    page.locator('.gl-atlas-stage').scroll_into_view_if_needed()
    page.wait_for_timeout(200)


def parse_rgb(color: str):
    m = re.match(r'rgba?\((\d+),\s*(\d+),\s*(\d+)', color or '')
    if not m:
        return None
    return tuple(int(m.group(i)) for i in range(1, 4))


def rel_luminance(rgb):
    def chan(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (chan(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg, bg):
    l1, l2 = rel_luminance(fg), rel_luminance(bg)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def rect_intersection(a, b):
    x1 = max(a['x'], b['x'])
    y1 = max(a['y'], b['y'])
    x2 = min(a['x'] + a['w'], b['x'] + b['w'])
    y2 = min(a['y'] + a['h'], b['y'] + b['h'])
    ow, oh = x2 - x1, y2 - y1
    if ow <= 0 or oh <= 0:
        return None
    return {'x': x1, 'y': y1, 'w': ow, 'h': oh, 'area': ow * oh}


def point_in_rect(x, y, r):
    return r['x'] <= x <= r['x'] + r['w'] and r['y'] <= y <= r['y'] + r['h']


def collect_islands(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('.gl-island')].map((el, i) => {
          const r = el.getBoundingClientRect();
          const pin = el.querySelector('.gl-island-pin');
          const pr = pin ? pin.getBoundingClientRect() : r;
          const cx = pr.x + pr.width / 2, cy = pr.y + pr.height / 2;
          const hit = document.elementFromPoint(cx, cy);
          const island = hit && hit.closest('.gl-island');
          return {
            i, n: i + 1, first: Number(el.dataset.first),
            x: r.x, y: r.y, w: r.width, h: r.height,
            pin: {x: pr.x, y: pr.y, w: pr.width, h: pr.height},
            cx, cy,
            centerHitFirst: island ? Number(island.dataset.first) : null,
            disabled: el.getAttribute('aria-disabled') === 'true',
            fogged: el.classList.contains('fogged'),
          };
        })"""
    )


def analyze_overlaps(page, islands, compact):
    """Report full-box overlaps; ambiguity judged on pin rects / pin centers.

    On tablet/desktop labels make article boxes large and intentionally overlap;
    the interactive target is the pin (+ compact 44×44 button on phones).
    """
    pairs = []
    for a in range(len(islands)):
        for b in range(a + 1, len(islands)):
            A, B = islands[a], islands[b]
            box_inter = rect_intersection(A, B)
            pin_inter = rect_intersection(A['pin'], B['pin'])
            if not box_inter and not pin_inter:
                continue
            # Ambiguity uses pin geometry (and full box on compact where box≈pin target)
            target_a = A if compact else A['pin']
            target_b = B if compact else B['pin']
            a_center_in_b = point_in_rect(A['cx'], A['cy'], target_b)
            b_center_in_a = point_in_rect(B['cx'], B['cy'], target_a)
            wrong_center = (
                (A['centerHitFirst'] is not None and A['centerHitFirst'] != A['first'])
                or (B['centerHitFirst'] is not None and B['centerHitFirst'] != B['first'])
            )
            ambiguous = a_center_in_b or b_center_in_a or wrong_center
            smaller_box = min(A['w'] * A['h'], B['w'] * B['h']) if box_inter else 0
            pairs.append(
                {
                    'a': A['n'],
                    'b': B['n'],
                    'firstA': A['first'],
                    'firstB': B['first'],
                    'boxOverlapArea': round(box_inter['area'], 1) if box_inter else 0,
                    'boxPctOfSmaller': round(100 * box_inter['area'] / smaller_box, 1) if box_inter and smaller_box else 0,
                    'pinOverlapArea': round(pin_inter['area'], 1) if pin_inter else 0,
                    'aCenterInB': a_center_in_b,
                    'bCenterInA': b_center_in_a,
                    'centerHitA': A['centerHitFirst'],
                    'centerHitB': B['centerHitFirst'],
                    'pinCenterDist': round(((A['cx'] - B['cx']) ** 2 + (A['cy'] - B['cy']) ** 2) ** 0.5, 1),
                    'ambiguous': ambiguous,
                }
            )
    return pairs


def measure_title_contrast(page):
    return page.evaluate(
        """() => {
          const title = document.querySelector('.gl-atlas-top strong');
          const band = document.querySelector('.gl-atlas-top');
          if (!title || !band) return { ok: false, reason: 'missing nodes' };
          const tr = title.getBoundingClientRect();
          const br = band.getBoundingClientRect();
          const tcs = getComputedStyle(title);
          const fg = tcs.color;
          const bgImage = getComputedStyle(band).backgroundImage;
          const samples = [];
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.floor(br.width));
            canvas.height = Math.max(1, Math.floor(br.height));
            const ctx = canvas.getContext('2d');
            // Reconstruct the published band gradient from interactive-atlas-v28.css
            const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
            grad.addColorStop(0, 'rgba(7,30,43,0.82)');
            grad.addColorStop(0.55, 'rgba(11,58,79,0.62)');
            grad.addColorStop(1, 'rgba(7,30,43,0.55)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const localX = Math.min(canvas.width - 1, Math.max(0, Math.floor(tr.left + tr.width / 2 - br.left)));
            const localY = Math.min(canvas.height - 1, Math.max(0, Math.floor(tr.top + tr.height / 2 - br.top)));
            const pix = ctx.getImageData(localX, localY, 1, 1).data;
            samples.push({x: 'canvas-under-title', rgb: [pix[0], pix[1], pix[2]], alpha: pix[3] / 255});
            // Worst-case: composite band over light parchment board (#FBF6EC)
            const a = pix[3] / 255;
            const parchment = [251, 246, 236];
            const comp = [0,1,2].map(i => Math.round(pix[i] * a + parchment[i] * (1 - a)));
            samples.push({x: 'band-over-parchment', rgb: comp, alpha: 1});
          } catch (e) {
            samples.push({x: 'canvas-error', error: String(e)});
          }
          return {
            ok: true,
            fg,
            fontSize: tcs.fontSize,
            bgImage: bgImage.slice(0, 160),
            samples,
            titleBox: {w: tr.width, h: tr.height},
            limitation: 'Contrast samples the CSS band gradient reconstruction; the ocean photo under the board is not composited into the canvas sample.'
          };
        }"""
    )


def animation_state(page):
    return page.evaluate(
        """() => {
          const pick = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            return {
              animationName: cs.animationName,
              animationDuration: cs.animationDuration,
              display: cs.display,
            };
          };
          return {
            level: document.documentElement.dataset.animationLevel || null,
            reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
            sea: pick('.gl-atlas-sea'),
            dash: pick('.gl-atlas-route-dash'),
            dial: pick('.gl-atlas-dial, .gl-atlas-voyage .gl-atlas-dial'),
            compassImg: pick('.gl-atlas-compass img'),
            youAreHere: pick('.gl-island.you-are-here'),
          };
        }"""
    )


def assert_motion_off(state, label):
    def is_none(anim):
        if not anim:
            return True
        name = (anim.get('animationName') or 'none').strip().lower()
        dur = (anim.get('animationDuration') or '').strip()
        return name in ('none', '') or dur.startswith('0s') or dur == '0'

    for key in ('sea', 'dash', 'dial', 'compassImg', 'youAreHere'):
        assert is_none(state.get(key)), f'{label}: {key} still animating → {state.get(key)}'


def tap_island_no_force(page, isl, width):
    loc = page.locator(f'.gl-island[data-first="{isl["first"]}"]')
    loc.scroll_into_view_if_needed()
    page.wait_for_timeout(80)
    pin = loc.locator('.gl-island-pin')
    try:
        if pin.count():
            pin.first.click(timeout=5000)
        else:
            loc.click(timeout=5000)
    except Exception as exc:
        raise AssertionError(
            f'{width}: no-force click failed on island {isl["n"]} (first={isl["first"]}): {exc}'
        ) from exc
    page.wait_for_timeout(180)
    return page.evaluate(
        """() => ({
          selected: document.querySelector('.gl-island.is-selected')?.dataset.first || null,
          rail: document.querySelector('.gl-atlas-rail-item.is-selected')?.dataset.first || null,
          panel: document.querySelector('#atlas-panel h3')?.textContent?.trim() || '',
        })"""
    )


def run_viewport(browser, width, height, report):
    page = browser.new_page(
        viewport={'width': width, 'height': height},
        is_mobile=width <= 430,
        has_touch=width <= 430,
    )
    entry = {'viewport': f'{width}x{height}', 'ok': True}
    try:
        go_map(page, width)

        metrics = page.evaluate(
            """() => {
              const bc = document.querySelector('.breadcrumb');
              const tag = document.querySelector('.top-actions .tiny-tag');
              const compass = document.querySelector('.gl-atlas-compass');
              const ccs = compass ? getComputedStyle(compass) : null;
              return {
                breadcrumbText: (bc?.textContent || '').replace(/\\s+/g, ' ').trim(),
                breadcrumbTruncated: bc ? bc.scrollWidth > bc.clientWidth + 1 : null,
                tagText: (tag?.textContent || '').replace(/\\s+/g, ' ').trim(),
                docOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                compassDisplay: ccs?.display,
                compassOpacity: ccs ? parseFloat(ccs.opacity) : null,
                compassRect: compass && ccs.display !== 'none'
                  ? (() => { const r = compass.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()
                  : null,
                mobileNav: document.querySelector('.mobile-nav')
                  ? getComputedStyle(document.querySelector('.mobile-nav')).position
                  : null,
              };
            }"""
        )

        assert 'MAPPA SAGHE' in metrics['breadcrumbText']
        assert 'MAPPA DELLE SAGHE' not in metrics['breadcrumbText']
        assert 'GRANDE ROTTA' not in metrics['breadcrumbText']
        if width <= 390:
            assert not metrics['breadcrumbTruncated']
        assert 'ARCHIVIO' in metrics['tagText']
        assert not metrics['docOverflowX']
        if width <= 920:
            assert metrics['mobileNav'] == 'fixed'

        islands = collect_islands(page)
        assert len(islands) == 11
        entry['islands'] = [
            {
                'n': i['n'],
                'first': i['first'],
                'box': [round(i[k], 1) for k in ('x', 'y', 'w', 'h')],
                'centerHit': i['centerHitFirst'],
            }
            for i in islands
        ]

        compact = width <= 430
        if compact:
            for isl in islands:
                assert isl['w'] >= 43 and isl['h'] >= 43, (
                    f'island {isl["n"]} getBoundingClientRect {isl["w"]}x{isl["h"]}'
                )
                assert isl['centerHitFirst'] == isl['first'], (
                    f'island {isl["n"]} pin-center elementFromPoint → {isl["centerHitFirst"]} (expected {isl["first"]})'
                )
        else:
            for isl in islands:
                assert isl['centerHitFirst'] == isl['first'], (
                    f'island {isl["n"]} pin-center elementFromPoint → {isl["centerHitFirst"]} (expected {isl["first"]})'
                )

        overlaps = analyze_overlaps(page, islands, compact=compact)
        entry['overlaps'] = overlaps
        ambiguous = [p for p in overlaps if p['ambiguous']]
        entry['ambiguousOverlaps'] = ambiguous
        entry['overlapCount'] = len(overlaps)
        entry['boxOverlapPairs'] = [
            {'a': p['a'], 'b': p['b'], 'area': p['boxOverlapArea'], 'pct': p['boxPctOfSmaller']}
            for p in overlaps
            if p['boxOverlapArea'] > 0
        ]
        if ambiguous:
            raise AssertionError(f'ambiguous hitbox pairs: {ambiguous}')

        if width <= 920:
            assert metrics['compassDisplay'] == 'none'
        else:
            assert metrics['compassDisplay'] != 'none'
            assert metrics['compassOpacity'] <= 0.35
            cr = metrics['compassRect']
            # Compass is pointer-events:none; only pin hit targets must stay clear.
            for isl in islands:
                inter = rect_intersection(cr, isl['pin'])
                assert not inter or inter['area'] <= 40, (
                    f'compass overlaps island {isl["n"]} pin area={inter["area"]}'
                )

        contrast_info = measure_title_contrast(page)
        fg = parse_rgb(contrast_info.get('fg', ''))
        ratios = []
        for sample in contrast_info.get('samples') or []:
            rgb = sample.get('rgb')
            if fg and rgb and len(rgb) >= 3:
                ratios.append(
                    {
                        'sample': sample['x'],
                        'bg': list(rgb[:3]),
                        'ratio': round(contrast_ratio(fg, rgb[:3]), 2),
                    }
                )
        best = max((r['ratio'] for r in ratios), default=0)
        entry['contrast'] = {
            'fg': contrast_info.get('fg'),
            'ratios': ratios,
            'best': best,
            'limitation': contrast_info.get('limitation'),
        }
        assert best >= 4.5, f'title contrast best={best} < 4.5; {ratios}'

        tap_results = []
        # Reveal locked islands via the normal settings control (session only) so
        # islands 6 and 11 can be tapped without force=True. Does not change app logic.
        need_unlock = any(
            islands[idx]['fogged'] or islands[idx]['disabled'] for idx in TAP_INDICES
        )
        if need_unlock:
            if width <= 920:
                page.locator('.mobile-nav [data-tab="more"]').click()
                page.wait_for_timeout(120)
                page.locator('.tool-tile[data-tab="settings"]').click()
            else:
                page.locator('.nav-button[data-tab="settings"]').click()
            page.wait_for_selector('[data-action="spoiler-toggle"]', timeout=8000)
            page.locator('.setting-item [data-action="spoiler-toggle"], [data-action="spoiler-toggle"]').first.click()
            page.wait_for_timeout(200)
            if width <= 920:
                page.locator('.mobile-nav [data-tab="map"]').click()
            else:
                page.locator('.nav-button[data-tab="map"]').click()
            page.wait_for_selector('.gl-atlas-stage')
            page.locator('.gl-atlas-stage').scroll_into_view_if_needed()
            page.wait_for_timeout(200)
            islands = collect_islands(page)
            entry['spoilerDisabledForTaps'] = True

        for idx in TAP_INDICES:
            isl = islands[idx]
            if isl['fogged'] or isl['disabled']:
                tap_results.append({'n': isl['n'], 'skipped': 'still-fogged-after-spoiler-off'})
                continue
            state = tap_island_no_force(page, isl, width)
            ok = (
                state['selected'] == str(isl['first'])
                and state['rail'] == str(isl['first'])
                and bool(state['panel'])
            )
            tap_results.append({'n': isl['n'], 'first': isl['first'], 'state': state, 'ok': ok})
            assert ok, f'no-force tap island {isl["n"]} desync: {state}'
        entry['taps'] = tap_results
        tapped = [t for t in tap_results if t.get('ok')]
        assert len(tapped) == 3, f'expected no-force taps on islands 1/6/11, got {tap_results}'

        page.locator('.gl-atlas-rail-item').first.click()
        page.wait_for_timeout(120)
        assert page.locator('.gl-island.is-selected').count() == 1

        print(
            f'OK {width}x{height} overlaps={len(overlaps)} ambiguous=0 '
            f'bestContrast={best} taps={[t.get("n") for t in tap_results if t.get("ok")]}'
        )
    except Exception as exc:
        entry['ok'] = False
        entry['error'] = str(exc)
        print(f'FAIL {width}x{height}: {exc}')
        raise
    finally:
        report['viewports'].append(entry)
        page.close()


def run_motion_suite(browser, report):
    page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    page.emulate_media(reduced_motion='reduce')
    go_map(page, 390)
    state = animation_state(page)
    assert state['reduced'] is True
    assert_motion_off(state, 'prefers-reduced-motion')
    report['motion'] = {'reducedMotion': state}
    page.close()
    print('OK prefers-reduced-motion:reduce')

    page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    page.goto(URL, wait_until='networkidle', timeout=25000)
    page.wait_for_timeout(250)
    page.locator('.mobile-nav [data-tab="more"]').click()
    page.wait_for_timeout(150)
    page.locator('.tool-tile[data-tab="settings"]').click()
    page.wait_for_selector('#visual-motion', timeout=8000)
    page.select_option('#visual-motion', 'off')
    page.wait_for_timeout(350)
    page.locator('.mobile-nav [data-tab="map"]').click()
    page.wait_for_selector('.gl-atlas-stage')
    page.locator('.gl-atlas-stage').scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    state_off = animation_state(page)
    assert state_off['level'] == 'off', f'animationLevel not off: {state_off["level"]}'
    assert_motion_off(state_off, 'animationLevel=off')
    report['motion']['animationLevelOff'] = state_off
    page.close()
    print('OK animationLevel=off')


def main():
    chrome = '/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else None
    kwargs = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    if chrome:
        kwargs['executable_path'] = chrome
    report = {'viewports': [], 'motion': {}, 'passed': False}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(**kwargs)
        for width, height in VIEWPORTS:
            run_viewport(browser, width, height, report)
        run_motion_suite(browser, report)
        browser.close()
    report['passed'] = all(v.get('ok') for v in report['viewports'])
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print('Wrote', REPORT_PATH)
    print('v30.2 hardening checks passed')


if __name__ == '__main__':
    main()
