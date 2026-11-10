type Tagged = { Tags?: string[] }

// Writes and global deletion share a queue, including writes from an editor
// that unmounted while its last IPC request was still in flight.
export class TagMutations {
  private queue: Promise<unknown> = Promise.resolve()
  private deleted: string[] = []
  private listeners = new Set<(name: string) => void>()

  get revision(): number {
    return this.deleted.length
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation)
    this.queue = result.catch(() => {})
    return result
  }

  reconcile<T extends Tagged>(draft: T, revision: number): T {
    if (!draft.Tags || revision === this.revision) return draft
    const removed = new Set(this.deleted.slice(revision))
    return { ...draft, Tags: draft.Tags.filter((tag) => !removed.has(tag)) }
  }

  async delete(name: string, operation: () => Promise<void>): Promise<void> {
    await this.run(async () => {
      await operation()
      this.deleted.push(name)
      for (const listener of this.listeners) listener(name)
    })
  }

  subscribe(listener: (name: string) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
