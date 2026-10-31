/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI evaluates this JavaScript function as its entry point. */
// Run via playwright-cli run-code against an isolated Electron profile or the built renderer.
async function verifyTypography(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  await page.setViewportSize({ width: 1280, height: 800 })
  const desktop = page.url().startsWith('file:')
  if (desktop) {
    check(
      await page.evaluate(
        async () =>
          (await navigator.permissions.query({ name: 'clipboard-write' })).state === 'granted'
      ),
      'Font permissions broke the existing copy action'
    )
  }
  const story = {
    id: 'typography-check',
    topic: 'Typography verification',
    titles: [],
    tags: [],
    text:
      '# Heading\n\nA paragraph with `inline code` and *emphasis*.\n\n## Subheading\n\n```\ncode block\n```\n\n' +
      Array.from(
        { length: 140 },
        (_, index) => `Paragraph ${index}: writing and reading should remain comfortable.\n`
      ).join('\n'),
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-10-30T10:00:00Z'
  }
  if (desktop) {
    await page.evaluate(async (input) => {
      const result = await window.draftwrite.story.list()
      if (!result.ok) throw new Error('Cannot read the isolated test database')
      if (!result.value.some((value) => value.topic === input.topic)) {
        const created = await window.draftwrite.story.create(input)
        if (!created.ok) throw new Error(created.error.message)
      }
    }, story)
  } else {
    await page.context().grantPermissions(['local-fonts'], { origin: 'http://127.0.0.1:4173' })
    await page.addInitScript((story) => {
      const ok = async (value) => ({ ok: true, value })
      window.draftwrite = {
        story: {
          list: () => ok([story]),
          create: ok,
          update: ok,
          get: () => ok(story),
          delete: () => ok(undefined)
        },
        article: { list: () => ok([]) },
        post: { list: () => ok([]) }
      }
    }, story)
    await page.goto('http://127.0.0.1:4173')
  }
  await page.evaluate(() => {
    localStorage.removeItem('draftwrite.typography')
    localStorage.removeItem('draftwrite.panel.sidebar')
  })
  await page.reload()
  await page.getByRole('option', { name: /Typography verification/ }).click()
  await page.getByRole('button', { name: 'Split', exact: true }).click()
  await page.locator('.cm-content').waitFor()
  const initialButtonHeight = await page
    .getByRole('button', { name: 'Split', exact: true })
    .evaluate((element) => element.getBoundingClientRect().height)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByText('Loading system fonts…').waitFor({ state: 'hidden' })
  check(
    (await page.getByText(/System fonts could not be loaded/).count()) === 0,
    'Real system font enumeration failed'
  )
  const systemFont = await page
    .locator('#preview-font optgroup[label="System"] option')
    .first()
    .getAttribute('value')
  check(!!systemFont, 'No system families were listed')
  const loaded = await page.evaluate(async () => {
    const names = ['Neon', 'Argon', 'Xenon', 'Radon', 'Krypton']
    return Promise.all(
      names.map(async (name) => (await document.fonts.load(`16px "Monaspace ${name}"`)).length > 0)
    )
  })
  check(loaded.every(Boolean), 'At least one bundled Monaspace family did not load')
  await page.getByLabel('Editor font', { exact: true }).selectOption('Monaspace Neon')
  await page.getByLabel('Editor font size (px)', { exact: true }).fill('24')
  await page.getByLabel('Preview font', { exact: true }).selectOption(systemFont)
  await page.getByLabel('Preview font size (px)', { exact: true }).fill('20')
  await page.getByLabel('Interface font', { exact: true }).selectOption('Monaspace Argon')
  await page.getByLabel('Interface scale (%)', { exact: true }).fill('150')
  await page.getByRole('button', { name: 'Back to writing' }).click()
  await page.evaluate(() => document.fonts.ready)
  const measured = await page.evaluate(() => {
    const zoom = Number(getComputedStyle(document.querySelector('.app-shell')).zoom)
    const size = (selector) =>
      Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize) * zoom
    return {
      editor: size('.cm-content'),
      preview: size('[aria-label="Preview"] article p'),
      h1: size('[aria-label="Preview"] h1'),
      h2: size('[aria-label="Preview"] h2'),
      code: size('[aria-label="Preview"] code'),
      codeFont: getComputedStyle(document.querySelector('[aria-label="Preview"] code')).fontFamily,
      editorFont: getComputedStyle(document.querySelector('.cm-scroller')).fontFamily,
      previewFont: getComputedStyle(document.querySelector('[aria-label="Preview"] p')).fontFamily,
      rootWidth: document.querySelector('.app-shell').getBoundingClientRect().width,
      viewport: innerWidth
    }
  })
  const near = (actual, expected) => Math.abs(actual - expected) < 0.1
  check(near(measured.editor, 24), `Editor size changed with UI scale: ${measured.editor}`)
  check(near(measured.preview, 20), `Preview size changed with UI scale: ${measured.preview}`)
  check(near(measured.h1, 30) && near(measured.h2, 22.5), 'Heading proportions were lost')
  check(
    near(measured.code, 20) && measured.codeFont.includes('Fira Code'),
    'Code lost its monospaced size or family'
  )
  check(
    measured.editorFont.includes('Monaspace Neon') && measured.previewFont.includes(systemFont),
    'Selected fonts were not applied'
  )
  check(near(measured.rootWidth, measured.viewport), 'UI scaling overflows the window')
  check(
    await page
      .locator('header')
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily.includes('Monaspace Argon')),
    'Interface font did not apply'
  )
  const scaledButtonHeight = await page
    .getByRole('button', { name: 'Split', exact: true })
    .evaluate((element) => element.getBoundingClientRect().height)
  check(near(scaledButtonHeight / initialButtonHeight, 1.5), 'UI controls did not scale')
  const separator = page.getByRole('separator', { name: 'Resize sidebar', exact: true })
  const handle = await separator.boundingBox()
  const sidebar = page.getByRole('complementary', { name: 'Library' })
  const widthBeforeDrag = await sidebar.evaluate((element) => element.getBoundingClientRect().width)
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 + 30, handle.y + handle.height / 2)
  await page.mouse.up()
  await page.waitForFunction(
    (before) =>
      document.querySelector('[aria-label="Library"]').getBoundingClientRect().width > before + 20,
    widthBeforeDrag
  )
  const widthAfterDrag = await sidebar.evaluate((element) => element.getBoundingClientRect().width)
  check(
    Math.abs(widthAfterDrag - widthBeforeDrag - 30) <= 2,
    `Scaled resize does not follow the pointer: ${widthAfterDrag - widthBeforeDrag}`
  )
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('ArrowRight')
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  await page.evaluate(() => {
    document.querySelector('.cm-scroller').scrollTop = 700
  })
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  await page.evaluate(() => {
    window.typographyEditor = document.querySelector('.cm-editor')
  })
  const scrollBefore = await page.locator('.cm-scroller').evaluate((element) => element.scrollTop)
  check(scrollBefore > 600, 'The editor must be scrolled before testing Settings navigation')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByText('Loading system fonts…').waitFor({ state: 'hidden' })
  await page.screenshot({ path: '/tmp/draftwrite-typography-desktop.png' })
  await page.getByRole('button', { name: 'Back to writing' }).click()
  check(
    await page.evaluate(() => document.querySelector('.cm-editor') === window.typographyEditor),
    'Editor was remounted'
  )
  const scrollAfter = await page.locator('.cm-scroller').evaluate((element) => element.scrollTop)
  check(
    Math.abs(scrollAfter - scrollBefore) <= 1,
    `Editor scroll changed: ${scrollBefore} to ${scrollAfter}`
  )
  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByText('Loading system fonts…').waitFor({ state: 'hidden' })
  check(
    (await page.getByLabel('Editor font', { exact: true }).inputValue()) === 'Monaspace Neon',
    'Editor family did not persist'
  )
  check(
    (await page.getByLabel('Preview font', { exact: true }).inputValue()) === systemFont,
    'System font did not persist'
  )
  check(
    (await page.getByLabel('Editor font size (px)').inputValue()) === '24',
    'Editor size did not persist'
  )
  check(
    (await page.getByLabel('Interface scale (%)').inputValue()) === '150',
    'Interface scale did not persist'
  )
  for (const scale of ['80', '150']) {
    await page.getByLabel('Interface scale (%)').fill(scale)
    for (const size of ['10', '40']) {
      await page.getByLabel('Editor font size (px)').fill(size)
      await page.getByLabel('Preview font size (px)').fill(size)
      await page.getByRole('button', { name: 'Back to writing' }).click()
      await page.getByRole('option', { name: /Typography verification/ }).click()
      const sizes = await page.evaluate(() => [
        Number.parseFloat(getComputedStyle(document.querySelector('.cm-content')).fontSize),
        Number.parseFloat(
          getComputedStyle(document.querySelector('[aria-label="Preview"] p')).fontSize
        )
      ])
      check(
        sizes.every((actual) => near(actual, Number(size))),
        `Reading sizes changed at scale ${scale}`
      )
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await page.getByText('Loading system fonts…').waitFor({ state: 'hidden' })
    }
    await page.setViewportSize({ width: 900, height: 600 })
    await page.getByRole('button', { name: 'Restore interface defaults' }).scrollIntoViewIfNeeded()
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Settings overflow at a supported window size'
    )
  }
  await page.screenshot({ path: '/tmp/draftwrite-typography-small.png' })
  await page.keyboard.press('Tab')
  check(
    await page.evaluate(() => document.activeElement !== document.body),
    'Keyboard focus is not available'
  )
  check(errors.length === 0, `Browser errors: ${errors.join('; ')}`)
  return {
    status: 'passed',
    runtime: desktop ? 'Electron' : 'Chromium',
    loadedMonaspaceFamilies: loaded.length,
    systemFont,
    measured,
    scrollBefore,
    scrollAfter
  }
}
