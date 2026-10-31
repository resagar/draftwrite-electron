/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI evaluates this function as its entry point. */
// Attach to an isolated Electron profile; this creates data and changes preferences.
async function verifyTypography(page) {
  const context = page.context()
  const main = context
    .pages()
    .find(
      (candidate) => candidate.url().startsWith('file:') && !candidate.url().endsWith('#settings')
    )
  if (!main) throw new Error('Attach this verification to an isolated Electron application')
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const near = (actual, expected) => Math.abs(actual - expected) < 0.2
  const errors = []
  for (const auxiliary of context.pages().filter((candidate) => candidate !== main))
    await auxiliary.close()
  main.on('pageerror', (error) => errors.push(error.message))
  await main.setViewportSize({ width: 1280, height: 800 })
  await main.evaluate(async () => {
    const story = {
      id: '',
      topic: 'Typography verification',
      titles: [],
      tags: [],
      text:
        '# Heading\n\nA paragraph with `inline code` and *emphasis*.\n\n## Subheading\n\n```\ncode block\n```\n\n' +
        Array.from(
          { length: 140 },
          (_, index) => `Paragraph ${index}: writing and reading should remain comfortable.\n`
        ).join('\n'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const listed = await window.draftwrite.story.list()
    if (!listed.ok) throw new Error('Cannot read the isolated test database')
    if (!listed.value.some((value) => value.topic === story.topic)) {
      const created = await window.draftwrite.story.create(story)
      if (!created.ok) throw new Error(created.error.message)
    }
  })
  await main.reload()
  await main.getByRole('option', { name: /Typography verification/ }).click()
  await main.getByRole('button', { name: 'Split', exact: true }).click()
  await main.evaluate(async () => {
    for (const [name, changes] of Object.entries({
      editor: { font: 'Fira Code', size: 16, lineHeight: 2 },
      preview: { font: 'Inter', size: 16, lineHeight: 2 },
      interface: { font: 'Inter', size: 100 }
    })) {
      const result = await window.draftwrite.settings.patch({ context: name, changes })
      if (!result.ok) throw new Error(result.error.message)
    }
  })
  const settle = async () => {
    await main.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    )
  }
  await settle()
  const baseControlHeight = await main
    .getByRole('button', { name: 'Split', exact: true })
    .evaluate((element) => element.getBoundingClientRect().height)
  await main.evaluate(() => {
    window.typographyEditor = document.querySelector('.cm-editor')
    document.querySelector('.cm-scroller').scrollTop = 700
  })
  await settle()
  const scrollBefore = await main.locator('.cm-scroller').evaluate((element) => element.scrollTop)
  check(scrollBefore > 600, 'Editor must be scrolled before testing window navigation')
  const open = async () => {
    let settings = context.pages().find((candidate) => candidate.url().endsWith('#settings'))
    const pending = settings ? null : context.waitForEvent('page')
    await main.getByRole('button', { name: 'Settings', exact: true }).click()
    if (pending) settings = await pending
    await settings.getByRole('heading', { name: 'Typography' }).waitFor()
    if (pending)
      check(
        await settings.locator('h1').evaluate((heading) => heading === document.activeElement),
        'Settings did not focus its heading after loading'
      )
    check(
      (await settings.title()) === 'Settings — DraftWrite',
      'Settings has the wrong native title'
    )
    await settings.getByText('Loading system fonts…').waitFor({ state: 'hidden' })
    return settings
  }
  let settings = await open()
  settings.on('pageerror', (error) => errors.push(error.message))
  check(context.pages().length === 2, 'Settings did not open in a second window')
  check(
    await main.getByRole('region', { name: 'Story editor' }).isVisible(),
    'Settings hid the workspace'
  )
  check(
    (await main.locator('.cm-scroller').evaluate((element) => element.scrollTop)) === scrollBefore,
    'Opening Settings moved the editor scroll'
  )
  const same = await open()
  check(same === settings && context.pages().length === 2, 'Repeated opening duplicated Settings')
  check(
    (await settings.locator('.cm-editor').count()) === 0 &&
      (await settings.getByRole('complementary', { name: 'Library' }).count()) === 0,
    'Settings mounted another writing workspace'
  )
  const loaded = await settings.evaluate(async () =>
    Promise.all(
      ['Neon', 'Argon', 'Xenon', 'Radon', 'Krypton'].map(
        async (name) => (await document.fonts.load(`16px "Monaspace ${name}"`)).length > 0
      )
    )
  )
  check(loaded.every(Boolean), 'A bundled Monaspace family failed to load')
  check(
    (await settings.getByText(/System fonts could not be loaded/).count()) === 0,
    'System font access failed in Settings'
  )
  const systemFont = await settings
    .locator('#preview-font optgroup[label="System"] option')
    .first()
    .getAttribute('value')
  check(!!systemFont, 'The native settings window has no system fonts')
  await main.bringToFront()
  await main.locator('.cm-content').focus()
  await main.keyboard.press('Control+End')
  await main.keyboard.type(' Edited with Settings open.')
  check(
    await main
      .locator('.cm-content')
      .innerText()
      .then((text) => text.includes('Edited with Settings open.')),
    'Main window is not editable while Settings is open'
  )
  await settings.getByLabel('Editor font', { exact: true }).selectOption('Monaspace Neon')
  await settings.getByLabel('Preview font', { exact: true }).selectOption(systemFont)
  await settings.getByLabel('Preview font size (px)', { exact: true }).fill('20')
  await settings.getByLabel('Editor line height', { exact: true }).fill('1.5')
  await settings.getByLabel('Preview line height', { exact: true }).fill('1.25')
  await settings.getByLabel('Interface scale (%)', { exact: true }).fill('150')
  await settings.getByLabel('Interface font', { exact: true }).selectOption('Monaspace Argon')
  await main.waitForFunction(
    () =>
      document.documentElement.style.getPropertyValue('--preview-line-height') === '1.25' &&
      document.documentElement.style.getPropertyValue('--ui-scale') === '1.5'
  )
  await settle()
  check(
    await main
      .locator('header')
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily.includes('Monaspace Argon')),
    'Interface font did not reach the main window'
  )
  check(
    await settings
      .locator('.settings-screen')
      .evaluate((element) => getComputedStyle(element).fontFamily.includes('Monaspace Argon')),
    'Interface font did not apply to Settings'
  )
  const scaledControlHeight = await main
    .getByRole('button', { name: 'Split', exact: true })
    .evaluate((element) => element.getBoundingClientRect().height)
  check(near(scaledControlHeight / baseControlHeight, 1.5), 'Interface controls did not scale')
  const measured = await main.evaluate(() => {
    const style = (selector) => getComputedStyle(document.querySelector(selector))
    return {
      editor: parseFloat(style('.cm-content').fontSize),
      editorLine: parseFloat(style('.cm-line').lineHeight),
      gutterLine: parseFloat(style('.cm-gutters').lineHeight),
      preview: parseFloat(style('[aria-label="Preview"] p').fontSize),
      previewLine: parseFloat(style('[aria-label="Preview"] p').lineHeight),
      headingSize: parseFloat(style('[aria-label="Preview"] h1').fontSize),
      codeLine: parseFloat(style('[aria-label="Preview"] pre').lineHeight),
      editorFont: style('.cm-scroller').fontFamily,
      previewFont: style('[aria-label="Preview"] p').fontFamily,
      codeFont: style('[aria-label="Preview"] code').fontFamily
    }
  })
  check(
    near(measured.editor, 16) && near(measured.editorLine, 24) && near(measured.gutterLine, 24),
    'Editor line height or gutter alignment is wrong'
  )
  check(
    near(measured.preview, 20) && near(measured.previewLine, 25) && near(measured.codeLine, 25),
    'Preview line height is wrong'
  )
  check(
    near(measured.headingSize, 30) && measured.codeFont.includes('Fira Code'),
    'Heading proportions or monospaced code changed'
  )
  check(
    measured.editorFont.includes('Monaspace Neon') && measured.previewFont.includes(systemFont),
    'Fonts did not synchronize to the writing window'
  )
  check(
    await main.evaluate(() => document.querySelector('.cm-editor') === window.typographyEditor),
    'Changing typography remounted the editor'
  )
  await main.evaluate(() => {
    document.querySelector('.cm-scroller').scrollTop = 700
  })
  await settle()
  const sync = await main.evaluate(() => {
    const editor = document.querySelector('.cm-scroller'),
      preview = document.querySelector('[aria-label="Preview"]')
    const top = editor.getBoundingClientRect().top
    const line = Array.from(document.querySelectorAll('.cm-lineNumbers .cm-gutterElement')).find(
      (element) =>
        element.getBoundingClientRect().bottom > top + 1 && /^\d+$/.test(element.textContent)
    )
    const previewTop = preview.getBoundingClientRect().top
    const markers = Array.from(preview.querySelectorAll('[data-source-line]'))
    const marker =
      markers.filter((element) => element.getBoundingClientRect().top <= previewTop + 1).at(-1) ??
      markers[0]
    return {
      editor: Number(line?.textContent),
      preview: Number(marker?.getAttribute('data-source-line'))
    }
  })
  check(
    Math.abs(sync.editor - sync.preview) <= 3,
    `Line synchronization lost its geometry: ${JSON.stringify(sync)}`
  )
  await main.evaluate(() => {
    window.typographyWrite = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('Test storage failure')
    }
  })
  await settings.getByLabel('Editor line height', { exact: true }).fill('1.6')
  await settings.getByText(/could not be saved/).waitFor()
  await main.waitForFunction(
    () => document.documentElement.style.getPropertyValue('--editor-line-height') === '1.6'
  )
  let closed = settings.waitForEvent('close')
  await settings
    .getByRole('button', { name: 'Close settings', exact: true })
    .click()
    .catch((error) => {
      if (!settings.isClosed()) throw error
    })
  await closed
  settings = await open()
  check(
    (await settings.getByLabel('Editor line height', { exact: true }).inputValue()) === '1.6',
    'Reopening lost a session choice after failed persistence'
  )
  await main.evaluate(() => {
    Storage.prototype.setItem = window.typographyWrite
    delete window.typographyWrite
  })
  await settings.getByLabel('Editor line height', { exact: true }).fill('1.5')
  await settings.getByText(/could not be saved/).waitFor({ state: 'hidden' })
  const invalid = await settings.evaluate(async () =>
    window.draftwrite.settings.patch({ context: 'editor', changes: { lineHeight: 0 } })
  )
  check(
    !invalid.ok && invalid.error.code === 'errInvalidPayload',
    'Invalid IPC updates were accepted'
  )
  await settings.evaluate(async () => {
    const results = await Promise.all([
      window.draftwrite.settings.patch({ context: 'editor', changes: { size: 18 } }),
      window.draftwrite.settings.patch({ context: 'editor', changes: { lineHeight: 1.7 } }),
      window.draftwrite.settings.patch({ context: 'editor', changes: { font: 'Monaspace Argon' } })
    ])
    if (results.some((result) => !result.ok)) throw new Error('Concurrent updates failed')
  })
  await main.waitForFunction(
    () =>
      document.documentElement.style.getPropertyValue('--editor-size') === '18px' &&
      document.documentElement.style.getPropertyValue('--editor-line-height') === '1.7' &&
      document.documentElement.style.getPropertyValue('--editor-font').includes('Monaspace Argon')
  )
  await settings.getByRole('button', { name: 'Restore editor defaults', exact: true }).click()
  await main.waitForFunction(
    () => document.documentElement.style.getPropertyValue('--editor-line-height') === '2'
  )
  check(
    (await settings.getByLabel('Preview line height', { exact: true }).inputValue()) === '1.25',
    'Restoring editor changed preview'
  )
  for (const scale of ['80', '150']) {
    await settings.getByLabel('Interface scale (%)', { exact: true }).fill(scale)
    for (const value of ['1', '3']) {
      await settings.getByLabel('Editor line height', { exact: true }).fill(value)
      await settings.getByLabel('Preview line height', { exact: true }).fill(value)
      await main.waitForFunction(
        (height) =>
          getComputedStyle(document.querySelector('.cm-content')).lineHeight ===
          `${16 * Number(height)}px`,
        value
      )
      for (const size of ['10', '40']) {
        await settings.getByLabel('Editor font size (px)', { exact: true }).fill(size)
        await settings.getByLabel('Preview font size (px)', { exact: true }).fill(size)
        await main.waitForFunction(
          ({ size, height }) => {
            const editor = getComputedStyle(document.querySelector('.cm-content'))
            const preview = getComputedStyle(document.querySelector('[aria-label="Preview"] p'))
            return (
              Math.abs(parseFloat(editor.fontSize) - Number(size)) < 0.1 &&
              Math.abs(parseFloat(editor.lineHeight) - Number(size) * Number(height)) < 0.1 &&
              Math.abs(parseFloat(preview.fontSize) - Number(size)) < 0.1
            )
          },
          { size, height: value }
        )
      }
      await settings.getByLabel('Editor font size (px)', { exact: true }).fill('16')
      await settings.getByLabel('Preview font size (px)', { exact: true }).fill('20')
    }
  }
  await settings.getByLabel('Editor line height', { exact: true }).fill('1.5')
  await settings.getByLabel('Preview line height', { exact: true }).fill('1.25')
  await settings.getByLabel('Editor font', { exact: true }).selectOption('Monaspace Neon')
  await settings.getByLabel('Interface font', { exact: true }).selectOption('Inter')
  await settings.setViewportSize({ width: 800, height: 760 })
  await settings.evaluate(() => {
    document.querySelector('.settings-screen').scrollTop = 0
  })
  await settings.screenshot({ path: '/tmp/draftwrite-settings-window.png' })
  await settings.setViewportSize({ width: 560, height: 480 })
  await settings
    .getByRole('button', { name: 'Restore interface defaults', exact: true })
    .scrollIntoViewIfNeeded()
  check(
    await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Settings overflow at its minimum size'
  )
  await settings.screenshot({ path: '/tmp/draftwrite-settings-window-small.png' })
  await settings.keyboard.press('Tab')
  check(
    await settings.evaluate(() => document.activeElement !== document.body),
    'Settings cannot be used with the keyboard'
  )
  await main.waitForFunction(
    () => JSON.parse(localStorage.getItem('draftwrite.typography')).editor.lineHeight === 1.5
  )
  closed = settings.waitForEvent('close')
  await settings.close()
  await closed
  check(context.pages().length === 1, 'Closing Settings closed or duplicated the main window')
  settings = await open()
  check(
    (await settings.getByLabel('Editor line height', { exact: true }).inputValue()) === '1.5',
    'Native close/reopen lost saved settings'
  )
  check(
    await main.evaluate(
      async () =>
        (await navigator.permissions.query({ name: 'clipboard-write' })).state === 'granted'
    ),
    'Settings broke clipboard permissions'
  )
  check(errors.length === 0, `Renderer errors: ${errors.join('; ')}`)
  return {
    status: 'passed',
    windows: context.pages().length,
    loadedMonaspaceFamilies: loaded.length,
    systemFont,
    scrollBefore,
    measured,
    sync
  }
}
