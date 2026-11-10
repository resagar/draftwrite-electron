type AppearanceEnvironment = {
  platform: string
  kernel: string
  env: NodeJS.ProcessEnv
  args: string[]
}

/** Enable only the WSLg/Xwayland combination validated by the native probe. */
export function shouldEnableTranslucentContent({
  platform,
  kernel,
  env,
  args
}: AppearanceEnvironment): boolean {
  return (
    platform === 'linux' &&
    /microsoft/i.test(kernel) &&
    Boolean(env.DISPLAY && env.WAYLAND_DISPLAY) &&
    env.ELECTRON_OZONE_PLATFORM_HINT !== 'wayland' &&
    !args.includes('--ozone-platform=wayland') &&
    !args.includes('--opaque-window')
  )
}

/** Windows 11 22H2 introduced the system backdrop used by Acrylic. */
export function shouldEnableAcrylic({ platform, kernel, args }: AppearanceEnvironment): boolean {
  const build = Number(kernel.split('.')[2])
  return platform === 'win32' && build >= 22621 && !args.includes('--opaque-window')
}
