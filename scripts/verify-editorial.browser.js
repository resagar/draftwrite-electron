/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type -- Playwright CLI entry point. */
// Attach only to Electron launched with isolated XDG_CONFIG_HOME and XDG_DATA_HOME.
async function verifyEditorial(page) {
  const check = (ok, message) => {
    if (!ok) throw new Error(message)
  }
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const stamp = String(Date.now())
  const ids = await page.evaluate(async (stamp) => {
    const unwrap = (result) => {
      if (!result.ok) throw Error(result.error.message)
      return result.value
    }
    const api = window.draftwrite
    const existing = unwrap(await api.story.list())
    if (existing.some((story) => !story.topic.startsWith('Editorial verification')))
      throw Error('Use an isolated verification data directory')
    const story = unwrap(
      await api.story.create({
        topic: 'Editorial verification source ' + stamp,
        titles: [],
        tags: [],
        text: 'Source material'
      })
    )
    const article = unwrap(
      await api.article.create({
        storyID: story.id,
        title: 'Editorial verification article ' + stamp,
        subtitle: 'A careful opening',
        target: 'Make a useful argument',
        text: 'First paragraph.\n\nSecond paragraph.'
      })
    )
    const post = unwrap(
      await api.post.create({
        topic: 'Editorial verification post ' + stamp,
        text: 'First paragraph.\n\nSecond paragraph.',
        state: 'pending',
        scheduledAt: null,
        storyID: null,
        articleID: null
      })
    )
    unwrap(
      await api.post.update({
        ...post,
        state: 'scheduled',
        scheduledAt: '2027-01-01T12:00:00.000Z'
      })
    )
    return { article: article.id, post: post.id }
  }, stamp)
  await page.reload()
  await page.setViewportSize({ width: 1440, height: 1000 })
  const read = async (kind) =>
    page.evaluate(
      async ({ kind, id }) => {
        const result = await window.draftwrite.editorial.execute({
          kind,
          pieceId: id,
          action: { type: 'read' }
        })
        if (!result.ok) throw Error(result.error.message)
        return result.value.workspace
      },
      { kind, id: ids[kind] }
    )
  const open = async (kind) => {
    await page
      .getByRole('button', { name: kind === 'article' ? 'Articles' : 'Posts', exact: true })
      .click()
    await page
      .getByRole('option', { name: new RegExp('Editorial verification ' + kind + ' ' + stamp) })
      .click()
    await page.getByRole('button', { name: 'Versions and review', exact: true }).click()
    await page.getByRole('combobox', { name: 'Variant', exact: true }).waitFor()
  }
  const version = async (impact, description, pane) => {
    await (
      pane
        ? pane.getByRole('button', { name: 'Save this variant', exact: true })
        : page.getByRole('button', { name: 'Save version', exact: true })
    ).click()
    await page.getByLabel('Change impact').selectOption(impact)
    await page.getByLabel('Change description').fill(description)
    await page.getByRole('button', { name: 'Save editorial version', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Save editorial version', exact: true })
      .waitFor({ state: 'hidden' })
  }
  const selectVariant = async (name) => {
    const option = page
      .getByRole('combobox', { name: 'Variant', exact: true })
      .locator('option')
      .filter({ hasText: name })
      .first()
    await page
      .getByRole('combobox', { name: 'Variant', exact: true })
      .selectOption(await option.getAttribute('value'))
  }
  await open('article')
  check((await read('article')).versions.length === 0, 'New article invented historical versions')
  await version('minor', 'First complete draft')
  const text = page.getByRole('textbox', { name: 'Article text', exact: true })
  await text.click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('Shift+End')
  await page.getByRole('button', { name: 'Annotate selection', exact: true }).click()
  const note = page.getByRole('dialog', { name: 'Review note', exact: true })
  await note.waitFor()
  check((await note.getAttribute('aria-modal')) === 'false', 'Annotation became modal')
  await page.getByLabel('Review observation').fill('Strengthen this opening with a concrete scene.')
  const geometry = []
  for (const width of [1440, 1000]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.waitForFunction(() => {
      const panel = document.querySelector('.editorial-popover')
      const line = document.querySelector('.cm-content .cm-line')
      if (!panel || !line) return false
      const range = document.createRange()
      range.selectNodeContents(line)
      const text = range.getBoundingClientRect()
      const box = panel.getBoundingClientRect()
      const left = Math.max(8, Math.min(text.right, window.innerWidth - box.width - 8))
      return Math.abs(box.left - left) < 4
    })
    const box = await note.boundingBox()
    check(
      box && box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 1000,
      'Popover escaped viewport'
    )
    check(
      await page
        .locator('.editorial-workspace')
        .evaluate((element) => getComputedStyle(element).opacity === '1'),
      'Document dimmed behind note'
    )
    geometry.push({ width, note: box })
    await page.screenshot({ path: '/tmp/editorial-note-' + width + '.png' })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await note.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Open paragraph note', exact: true }).click()
  await note.waitFor()
  check(
    (await page.getByLabel('Review observation').inputValue()) ===
      'Strengthen this opening with a concrete scene.',
    'Saved note could not be reopened'
  )
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await text.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.getByRole('button', { name: 'Annotate selection', exact: true }).click()
  await page.getByLabel('Review observation').fill('Keep the original closing concern.')
  await text.fill('Short.')
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await note.waitFor({ state: 'hidden' })
  const changedWhileAnnotating = await read('article')
  check(
    changedWhileAnnotating.variants[0].notes.at(-1).anchor.detached,
    'Changed paragraph was silently reassigned during note composition'
  )
  await text.fill('First paragraph.\n\nSecond paragraph.')
  await version('patch', 'Review opening')
  await page.getByRole('button', { name: 'New variant', exact: true }).click()
  await page.getByLabel('Variant name').fill('Narrative')
  const base = (await read('article')).variants[0].headId
  await page.getByLabel('Start from').selectOption(base)
  await page.getByRole('button', { name: 'Create variant', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Create variant', exact: true })
    .waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Parallel', exact: true }).click()
  const mainPane = page.getByRole('region', { name: 'Main draft', exact: true })
  const branchPane = page.getByRole('region', { name: 'Narrative draft', exact: true })
  await mainPane
    .getByRole('textbox', { name: 'Article text', exact: true })
    .fill('Technical paragraph.\n\nSecond paragraph.')
  await branchPane
    .getByRole('textbox', { name: 'Article text', exact: true })
    .fill('Narrative paragraph.\n\nBranch ending.')
  const focusedBranch = await branchPane
    .getByRole('textbox', { name: 'Article text', exact: true })
    .elementHandle()
  const originalMain = await mainPane
    .getByRole('textbox', { name: 'Article text', exact: true })
    .elementHandle()
  await page.waitForFunction(async (id) => {
    const result = await window.draftwrite.editorial.execute({
      kind: 'article',
      pieceId: id,
      action: { type: 'read' }
    })
    return (
      result.ok &&
      result.value.workspace.variants[0].content.text ===
        'Technical paragraph.\n\nSecond paragraph.' &&
      result.value.workspace.variants[1].content.text === 'Narrative paragraph.\n\nBranch ending.'
    )
  }, ids.article)
  check(
    await focusedBranch.evaluate(
      (element) => element.isConnected && element === document.activeElement
    ),
    'Parallel autosave replaced the editor or moved focus'
  )
  check(
    await originalMain.evaluate((element) => element.isConnected),
    'Parallel autosave remounted the other editor'
  )
  await version('major', 'Technical opening', mainPane)
  await version('minor', 'Narrative opening and ending', branchPane)
  let article = await read('article')
  check(
    article.variants[0].content.text === 'Technical paragraph.\n\nSecond paragraph.',
    'Parallel main draft overwritten'
  )
  check(
    article.variants[1].content.text === 'Narrative paragraph.\n\nBranch ending.',
    'Parallel branch draft overwritten'
  )
  await page.screenshot({ path: '/tmp/editorial-parallel.png' })
  await page.getByRole('button', { name: 'Compare', exact: true }).click()
  await page.getByLabel('Compare from').selectOption(article.variants[0].headId)
  await page.getByLabel('Compare to').selectOption(article.variants[1].headId)
  check(
    (await page.locator('.editorial-comparison del').count()) > 0 &&
      (await page.locator('.editorial-comparison ins').count()) > 0,
    'Differences not rendered'
  )
  await page.screenshot({ path: '/tmp/editorial-comparison.png' })
  await page.getByRole('button', { name: 'Integrate', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Source version', exact: true })
    .selectOption(article.variants[1].headId)
  await page.getByRole('button', { name: 'Review changes', exact: true }).click()
  const chunks = page.locator('.editorial-integration-chunk')
  await chunks.first().waitFor()
  for (const chunk of await chunks.all()) await chunk.getByRole('checkbox').check()
  for (const result of await page.getByRole('textbox', { name: 'Result', exact: true }).all())
    await result.fill('Combined')
  for (const confirm of await page
    .getByRole('button', { name: 'Confirm result', exact: true })
    .all())
    await confirm.click()
  await page.getByRole('button', { name: 'Apply selected changes', exact: true }).click()
  await page
    .getByRole('button', { name: 'Apply selected changes', exact: true })
    .waitFor({ state: 'hidden' })
  article = await read('article')
  check(
    article.variants[0].content.text === 'Combined paragraph.\n\nBranch ending.',
    'Integration result is wrong'
  )
  check(article.versions.length === 4, 'Integration created an automatic version')
  await page.getByRole('button', { name: 'Write', exact: true }).click()
  await version('patch', 'Integrated result')
  await page.getByRole('button', { name: 'History', exact: true }).click()
  const initial = page
    .locator('.editorial-history article')
    .filter({ hasText: 'First complete draft' })
    .first()
  await initial.getByRole('button', { name: 'Recover content', exact: true }).click()
  await page.waitForFunction(async (id) => {
    const reply = await window.draftwrite.editorial.execute({
      kind: 'article',
      pieceId: id,
      action: { type: 'read' }
    })
    return (
      reply.ok &&
      reply.value.workspace.variants[0].content.text === 'First paragraph.\n\nSecond paragraph.'
    )
  }, ids.article)
  check((await read('article')).variants[0].number === '1.0.1', 'Recovery reset version numbering')
  await selectVariant('Narrative')
  await page.getByRole('button', { name: 'Make independent', exact: true }).click()
  await page
    .getByLabel('Independent article title')
    .fill('Editorial verification independent article ' + stamp)
  await page.getByRole('button', { name: 'Create independent piece', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Create independent piece', exact: true })
    .waitFor({ state: 'hidden' })
  check((await read('article')).variants[1].archived, 'Conversion did not archive the source')
  check(
    (await page.locator('.editorial-pane .cm-content').getAttribute('contenteditable')) === 'false',
    'Archived variant is still editable'
  )
  await page.getByRole('button', { name: /^Notes/ }).click()
  await page
    .getByRole('button', { name: 'Strengthen this opening with a concrete scene.', exact: true })
    .click()
  check(
    (await page.getByLabel('Review observation').getAttribute('readonly')) !== null,
    'Archived note is editable'
  )
  check(
    await page
      .getByRole('dialog', { name: 'Review note', exact: true })
      .getByText('First paragraph.', { exact: true })
      .isVisible(),
    'Detached original quotation is hidden'
  )
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Back to writing', exact: true }).click()
  await open('post')
  await page.getByRole('button', { name: 'Add general note', exact: true }).click()
  await page.getByLabel('Review observation').fill('Check the closing line before sharing.')
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await page.getByRole('dialog', { name: 'Review note', exact: true }).waitFor({ state: 'hidden' })
  await version('major', 'First Post draft')
  await page
    .getByRole('textbox', { name: 'Article text', exact: true })
    .fill('A completely restructured post.')
  await version('major', 'Restructured before first publication')
  await page.getByRole('button', { name: 'Record publication', exact: true }).click()
  await page.getByLabel('Publication date').fill('2026-11-04')
  await page.getByLabel('Link (optional)').fill('https://example.com/memorable-post')
  await page.getByLabel('Record publication anyway').check()
  await page.getByRole('button', { name: 'Record publication', exact: true }).last().click()
  await page
    .getByRole('dialog', { name: 'Record publication', exact: true })
    .waitFor({ state: 'hidden' })
  const post = await read('post')
  check(
    post.versions.at(-1).number === '2.0.0' &&
      post.publications[0].versionId === post.versions.at(-1).id,
    'Publication did not reference 2.0.0'
  )
  const actual = await page.evaluate(
    async (id) => (await window.draftwrite.post.get(id)).value,
    ids.post
  )
  check(
    actual.state === 'scheduled' && actual.scheduledAt === '2027-01-01T12:00:00.000Z',
    'Publication changed Post scheduling'
  )
  await page.reload()
  check((await read('post')).publications.length === 1, 'Publication history lost on reload')
  check(errors.length === 0, 'Renderer errors: ' + errors.join('; '))
  return {
    article: ids.article,
    post: ids.post,
    geometry,
    checks: [
      'manual versions',
      'nonmodal paragraph notes',
      'inherited notes',
      'isolated parallel autosave',
      'word differences',
      'conflict resolution',
      'restoration',
      'Article conversion',
      'Post publication at 2.0.0',
      'reopen persistence'
    ],
    rendererErrors: errors
  }
}
