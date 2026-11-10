import { expect, it } from '@jest/globals'
import { shouldEnableAcrylic, shouldEnableTranslucentContent } from './window-appearance'

const wsl = {
  platform: 'linux',
  kernel: '6.6.87-microsoft-standard-WSL2',
  env: { DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-0' },
  args: []
}

it('enables translucency only in the validated WSLg/Xwayland environment', () => {
  expect(shouldEnableTranslucentContent(wsl)).toBe(true)
  expect(shouldEnableTranslucentContent({ ...wsl, platform: 'win32' })).toBe(false)
  expect(shouldEnableTranslucentContent({ ...wsl, platform: 'darwin' })).toBe(false)
  expect(shouldEnableTranslucentContent({ ...wsl, kernel: '6.6-generic' })).toBe(false)
  expect(shouldEnableTranslucentContent({ ...wsl, env: {} })).toBe(false)
  expect(shouldEnableTranslucentContent({ ...wsl, args: ['--ozone-platform=wayland'] })).toBe(false)
  expect(shouldEnableTranslucentContent({ ...wsl, args: ['--opaque-window'] })).toBe(false)
})

it.each([
  ['win32', '10.0.19045', false],
  ['win32', '10.0.22000', false],
  ['win32', '10.0.22621', true],
  ['win32', '10.0.26200', true],
  ['win32', 'invalid', false],
  ['linux', '10.0.26200', false],
  ['darwin', '24.0.0', false]
])('checks native Acrylic support on %s %s', (platform, kernel, expected) => {
  expect(shouldEnableAcrylic({ ...wsl, platform, kernel })).toBe(expected)
})

it('keeps the explicit opaque fallback on supported Windows versions', () => {
  expect(
    shouldEnableAcrylic({
      ...wsl,
      platform: 'win32',
      kernel: '10.0.26200',
      args: ['--opaque-window']
    })
  ).toBe(false)
})
