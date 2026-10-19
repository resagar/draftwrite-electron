export type Deferred = {
  promise: Promise<void>
  resolve: () => void
}

export function createDeferred(): Deferred {
  let resolveDeferred: (() => void) | undefined

  const promise = new Promise<void>((resolve) => {
    resolveDeferred = resolve
  })

  if (resolveDeferred === undefined) {
    throw new Error('deferred resolve was not captured')
  }

  return { promise, resolve: resolveDeferred }
}
