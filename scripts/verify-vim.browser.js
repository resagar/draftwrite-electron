/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI evaluates this function as its entry point. */
// Run only against an isolated Electron profile: this creates and edits documents.
async function verifyVim(page) {
  const main = page
    .context()
    .pages()
    .find(
      (candidate) => candidate.url().startsWith('file:') && !candidate.url().endsWith('#settings')
    )
  if (!main) throw new Error('Attach to an isolated Electron application')
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const errors = []
  main.on('pageerror', (error) => errors.push(error.message))
  for (const auxiliary of main
    .context()
    .pages()
    .filter((candidate) => candidate !== main))
    await auxiliary.close()
  const ids = await main.evaluate(async () => {
    const unwrap = (result) => {
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    }
    const stories = unwrap(await window.draftwrite.story.list())
    const story =
      stories.find((item) => item.topic === 'Vim verification') ??
      unwrap(
        await window.draftwrite.story.create({
          topic: 'Vim verification',
          titles: [],
          tags: [],
          text: 'alpha beta gamma\nsecond line\nthird line'
        })
      )
    const articles = unwrap(await window.draftwrite.article.list())
    const article =
      articles.find((item) => item.title === 'Vim article') ??
      unwrap(
        await window.draftwrite.article.create({
          storyID: story.id,
          title: 'Vim article',
          subtitle: '',
          target: '',
          text: 'Article text'
        })
      )
    const posts = unwrap(await window.draftwrite.post.list())
    const post =
      posts.find((item) => item.topic === 'Vim post') ??
      unwrap(
        await window.draftwrite.post.create({
          topic: 'Vim post',
          text: 'Post text',
          state: 'pending',
          scheduledAt: null,
          storyID: null,
          articleID: null
        })
      )
    unwrap(
      await window.draftwrite.settings.patch({ context: 'editor', changes: { vimMode: false } })
    )
    return { story: story.id, article: article.id, post: post.id }
  })
  await main.reload()
  await main.getByRole('button', { name: 'Stories', exact: true }).click()
  await main
    .getByRole('listbox')
    .getByRole('option', { name: /Vim verification/ })
    .click()
  const pending = main.context().waitForEvent('page')
  await main.getByRole('button', { name: 'Settings', exact: true }).click()
  let settings = await pending
  await settings.getByRole('heading', { name: 'Typography' }).waitFor()
  const toggle = () => settings.getByRole('checkbox', { name: 'Vim mode', exact: true })
  const mode = (value) => main.getByLabel(`Vim mode: ${value}`, { exact: true })
  const enabled = async (value) => {
    if ((await toggle().isChecked()) !== value) await toggle().click()
    await settings.waitForFunction(
      (expected) =>
        document.querySelector('[aria-describedby="vim-mode-description"]').checked === expected,
      value
    )
    if (value) await mode('Normal').waitFor()
    else await main.locator('[aria-label^="Vim mode:"]').waitFor({ state: 'hidden' })
  }
  const text = () => main.locator('.cm-content').innerText()
  const focus = async () => {
    await main.bringToFront()
    await main.locator('.cm-content').focus()
  }
  const setText = async (value) => {
    await enabled(false)
    await focus()
    await main.locator('.cm-content').fill(value)
    await enabled(true)
    await focus()
    await main.keyboard.type('gg0')
  }
  const command = async (value) => {
    await focus()
    await main.keyboard.type(':')
    const input = main.locator('.cm-vim-panel input')
    await input.fill(value)
    await input.press('Enter')
  }
  check(!(await toggle().isChecked()), 'Vim should start disabled')
  await setText('alpha beta gamma\nsecond line\nthird line')
  await main.keyboard.type('w')
  check((await main.locator('footer').innerText()).includes('Col 7'), 'w did not advance to beta')
  await main.keyboard.type('b')
  check((await main.locator('footer').innerText()).includes('Col 1'), 'b did not return to alpha')
  await main.keyboard.type('dd')
  check((await text()) === 'second line\nthird line', 'dd did not remove exactly one line')
  await main.keyboard.type('u')
  check((await text()) === 'alpha beta gamma\nsecond line\nthird line', 'u did not undo dd')
  await main.keyboard.press('Control+r')
  check((await text()) === 'second line\nthird line', 'Ctrl+R did not redo dd')
  await setText('alpha beta gamma')
  await main.keyboard.type('ciw')
  await mode('Insert').waitFor()
  await main.keyboard.type('delta')
  await main.keyboard.press('Escape')
  check((await text()) === 'delta beta gamma', 'ciw did not replace the word')
  await main.keyboard.type('w.')
  check((await text()) === 'delta delta gamma', 'dot did not repeat the word change')
  await main.keyboard.type('gg0vw')
  await mode('Visual').waitFor()
  check(
    (await main.evaluate(() => window.getSelection().toString())).length > 0,
    'Visual did not select text'
  )
  await main.keyboard.press('Escape')
  await setText('alpha beta alpha gamma alpha')
  await main.keyboard.type('/')
  const search = main.locator('.cm-vim-panel input')
  await search.fill('alpha')
  await search.press('Enter')
  check(
    (await main.locator('footer').innerText()).includes('Col 12'),
    'Search did not find the next alpha'
  )
  await main.keyboard.type('n')
  check((await main.locator('footer').innerText()).includes('Col 24'), 'n did not advance search')
  await main.keyboard.type('N')
  check((await main.locator('footer').innerText()).includes('Col 12'), 'N did not reverse search')
  await main.keyboard.press('Escape')
  await main.keyboard.press('Control+n')
  check(
    (await main
      .getByRole('listbox')
      .getByRole('option', { name: /Vim verification/ })
      .getAttribute('aria-selected')) === 'true',
    'Vim Ctrl+N also opened a new document'
  )
  // Toggle while a native selection is present; compare the DOM and selection after settling.
  await enabled(false)
  await main.locator('.cm-content').fill('selection and undo')
  await focus()
  await main.keyboard.press('Home')
  await main.keyboard.press('Shift+ArrowRight')
  await main.keyboard.press('Shift+ArrowRight')
  const selected = await main.evaluate(() => window.getSelection().toString())
  check(selected === 'se', 'Selection fixture was not established')
  await main.evaluate(() => {
    window.vimEditorBefore = document.querySelector('.cm-editor')
  })
  await enabled(true)
  await focus()
  check(
    await main.evaluate(() => window.vimEditorBefore === document.querySelector('.cm-editor')),
    'Activation recreated the editor'
  )
  check(
    (await main.evaluate(() => window.getSelection().toString())) === selected,
    'Activation changed the selection'
  )
  await enabled(false)
  await focus()
  check(
    (await main.evaluate(() => window.getSelection().toString())) === selected,
    'Deactivation changed the selection'
  )
  await main.keyboard.press('ArrowRight')
  await main.keyboard.type('X')
  const edited = await text()
  await enabled(true)
  await enabled(false)
  await focus()
  await main.keyboard.press('Control+z')
  check(
    (await text()) === 'selection and undo' && edited !== 'selection and undo',
    'Toggle discarded undo history'
  )
  // Scroll checks must use a real layout engine, not jsdom.
  const long = Array.from(
    { length: 140 },
    (_, index) => `Paragraph ${index}: alpha beta gamma`
  ).join('\n')
  await main.locator('.cm-content').fill(long)
  await main.evaluate(() => {
    document.querySelector('.cm-scroller').scrollTop = 700
  })
  await main.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  const beforeScroll = await main.locator('.cm-scroller').evaluate((element) => element.scrollTop)
  check(beforeScroll > 600, 'Scroll fixture failed')
  await enabled(true)
  await main.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  check(
    Math.abs(
      (await main.locator('.cm-scroller').evaluate((element) => element.scrollTop)) - beforeScroll
    ) < 1,
    'Activation moved scroll'
  )
  await enabled(false)
  check(
    Math.abs(
      (await main.locator('.cm-scroller').evaluate((element) => element.scrollTop)) - beforeScroll
    ) < 1,
    'Deactivation moved scroll'
  )
  // Each entity uses the same editor and the active native save action.
  for (const entity of [
    { library: 'Stories', name: /Vim verification/, kind: 'story', id: ids.story },
    { library: 'Articles', name: /Vim article/, kind: 'article', id: ids.article },
    { library: 'Posts', name: /Vim post/, kind: 'post', id: ids.post }
  ]) {
    await main.getByRole('button', { name: entity.library, exact: true }).click()
    await main.getByRole('listbox').getByRole('option', { name: entity.name }).click()
    await enabled(true)
    await mode('Normal').waitFor()
    await setText(`${entity.kind} saved with Vim`)
    await main.getByRole('button', { name: 'Split', exact: true }).click()
    await command('w')
    await main.getByText('Saved', { exact: true }).waitFor()
    const stored = await main.evaluate(async ({ kind, id }) => {
      const result = await window.draftwrite[kind].get(id)
      if (!result.ok) throw new Error(result.error.message)
      return result.value.text
    }, entity)
    check(stored === `${entity.kind} saved with Vim`, `${entity.kind} :w did not persist text`)
    check(
      (await main
        .getByRole('region', { name: 'Preview', exact: true })
        .getByText(`${entity.kind} saved with Vim`, { exact: true })
        .count()) > 0,
      `${entity.kind} preview is stale`
    )
    await focus()
    await main.keyboard.type('i')
    await mode('Insert').waitFor()
    await main.keyboard.type('Auto ')
    await main.keyboard.press('Escape')
    await main.getByText('Saved', { exact: true }).waitFor()
    const autosaved = await main.evaluate(async ({ kind, id }) => {
      const result = await window.draftwrite[kind].get(id)
      if (!result.ok) throw new Error(result.error.message)
      return result.value.text
    }, entity)
    check(
      autosaved === `Auto ${entity.kind} saved with Vim`,
      `${entity.kind} modal edit was not autosaved`
    )
    await main.keyboard.type('i')
    await mode('Insert').waitFor()
  }
  // Insert in the previous document must not leak into a different document.
  await main.getByRole('button', { name: 'Stories', exact: true }).click()
  await main
    .getByRole('listbox')
    .getByRole('option', { name: /Vim verification/ })
    .click()
  await mode('Normal').waitFor()
  // Outside Text, Ctrl+N retains the application action.
  await main.getByRole('textbox', { name: 'Topic', exact: true }).focus()
  await main.keyboard.press('Control+n')
  await main.getByRole('button', { name: 'Discard', exact: true }).waitFor()
  await focus()
  await main.keyboard.type('i')
  await main.keyboard.type('An incomplete Vim draft')
  await main.keyboard.press('Escape')
  await command('w')
  await main.getByText('Not saved yet', { exact: true }).waitFor()
  for (const ex of ['q', 'q!', 'wq']) {
    await command(ex)
    await main
      .getByText('Vim close commands are not available. Use the document controls.')
      .waitFor()
    check((await text()) === 'An incomplete Vim draft', `:${ex} changed the incomplete draft`)
    check(!main.isClosed(), `:${ex} closed the application`)
  }
  // Failed preference persistence retains the effective session value across reopen.
  await main.evaluate(() => {
    window.vimOriginalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'draftwrite.typography') throw new Error('Simulated full storage')
      return window.vimOriginalSetItem.call(this, key, value)
    }
  })
  await enabled(false)
  await settings.getByText(/Changes apply for this session but could not be saved/).waitFor()
  await settings.close()
  const reopening = main.context().waitForEvent('page')
  await main.getByRole('button', { name: 'Settings', exact: true }).click()
  settings = await reopening
  await settings.getByRole('heading', { name: 'Typography' }).waitFor()
  check(!(await toggle().isChecked()), 'Reopened Settings lost session preference')
  await main.evaluate(() => {
    Storage.prototype.setItem = window.vimOriginalSetItem
  })
  await enabled(true)
  check(
    await main.evaluate(
      () => JSON.parse(localStorage.getItem('draftwrite.typography')).editor.vimMode === true
    ),
    'Vim preference was not persisted'
  )
  check(errors.length === 0, `Renderer errors: ${errors.join('; ')}`)
  return {
    commands: 'w/b, dd, ciw, Visual, /, n/N, dot, u, Ctrl+R, :w, :q, :q!, :wq',
    entities: ['Story', 'Article', 'Post'],
    liveToggle: true,
    selection: true,
    undo: true,
    scroll: true,
    shortcutPriority: true,
    storageFailure: true,
    errors
  }
}
