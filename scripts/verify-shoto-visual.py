"""Check visible sprite bounds without changing source pixels.

Run with `npm run test:visual`; Pillow is also used by the asset preparation scripts.
These geometric checks complement, but do not replace, artistic review in-game.
"""
from pathlib import Path
import json
import unittest
from statistics import median

from PIL import Image

SPRITES = Path(__file__).resolve().parents[1] / 'src/assets/sprites/characters/shoto'
ACTIONS = ('idle-normal', 'rake-enter', 'enter-walk', 'light-punch', 'alternate-punch',
           'launcher-punch', 'crouch', 'crouch-uppercut', 'crouch-heavy-kick', 'jump',
           'air-heavy-kick', 'flying-kick', 'tomato-throw', 'ippon', 'ippon-victim', 'windmill-4',
           'heavy-punch-2', 'heavy-punch-3', 'power-punch', 'victory-exit', 'taunt', 'rake-ultimate-start', 'rake-ultimate-spin')


def bounds(name):
    image = Image.open(SPRITES / f'{name}.png').convert('RGBA')
    frames = json.loads((SPRITES / f'{name}.atlas.json').read_text())['frames']
    assert len(frames) == 6, f'{name}: expected six frames'
    result = []
    for index in range(6):
        rect = frames[str(index)]['frame']
        x, y, w, h = (rect[key] for key in ('x', 'y', 'w', 'h'))
        assert 0 <= x and 0 <= y and x + w <= image.width and y + h <= image.height, f'{name}:{index} outside atlas'
        alpha = image.crop((x, y, x + w, y + h)).getchannel('A')
        box = alpha.getbbox()
        assert box is not None, f'{name}:{index} blank'
        assert box[0] > 0 and box[1] > 0 and box[2] < w and box[3] < h, f'{name}:{index} clipped'
        result.append(box)
    return result


class SpriteVisualChecks(unittest.TestCase):
    def test_authored_frames_have_content_and_are_not_clipped(self):
        for name in ACTIONS:
            with self.subTest(sheet=name):
                self.assertEqual(len(bounds(name)), 6)

    def test_standing_animations_remain_anchored_to_floor(self):
        for name in ('idle-normal', 'rake-enter', 'light-punch', 'alternate-punch', 'launcher-punch'):
            with self.subTest(sheet=name):
                bottoms = [b[3] for b in bounds(name)]
                self.assertLessEqual(max(bottoms) - min(bottoms), 8)
                self.assertTrue(all(890 <= bottom <= 910 for bottom in bottoms))

    def test_idle_support_foot_does_not_drift_horizontally(self):
        image = Image.open(SPRITES / 'idle-normal.png').convert('RGBA')
        positions = []
        for index in range(6):
            x, y = (index % 3) * 1024, (index // 3) * 1024
            alpha = image.crop((x, y + 850, x + 512, y + 900)).getchannel('A')
            pixels = alpha.load()
            xs = [column for row in range(alpha.height) for column in range(alpha.width) if pixels[column, row] > 128]
            self.assertTrue(xs, f'idle-normal:{index} has no support foot')
            positions.append(median(xs))
        self.assertLessEqual(max(positions) - min(positions), 3)

    def test_rake_shaft_remains_fixed_in_idle(self):
        image = Image.open(SPRITES / 'idle.png').convert('RGBA')
        positions = []
        for index in range(6):
            shaft = image.crop((index * 480, 400, index * 480 + 200, 460)).getchannel('A')
            xs = [x for y in range(shaft.height) for x in range(shaft.width) if shaft.getpixel((x, y)) > 128]
            self.assertTrue(xs, f'idle:{index} has no rake shaft')
            positions.append(median(xs))
        self.assertLessEqual(max(positions) - min(positions), 2)

    def test_strong_punch_recovery_matches_idle_height(self):
        idle = bounds('idle-normal')[0]
        recovery = bounds('launcher-punch')[5]
        idle_height = idle[3] - idle[1]
        recovery_height = recovery[3] - recovery[1]
        self.assertAlmostEqual(recovery_height / idle_height, 1, delta=0.06)

    def test_light_punch_stance_matches_idle_proportions(self):
        idle = bounds('idle-normal')[0]
        punch = bounds('light-punch')[0]
        self.assertLessEqual(punch[3] - punch[1], (idle[3] - idle[1]) * 1.02)
        self.assertLessEqual(punch[2] - punch[0], idle[2] - idle[0])
        self.assertGreater(punch[3] - punch[1], (idle[3] - idle[1]) * 0.9)

    def test_tucked_jump_frames_are_shorter_than_standing(self):
        idle_height = bounds('idle-normal')[0][3] - bounds('idle-normal')[0][1]
        for index in (2, 3, 4):
            frame = bounds('jump')[index]
            self.assertLess(frame[3] - frame[1], idle_height * 0.8)


if __name__ == '__main__':
    unittest.main(verbosity=2)
