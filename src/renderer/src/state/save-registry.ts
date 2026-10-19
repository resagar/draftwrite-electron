type SaveHandler = () => Promise<void>

let handler: SaveHandler | null = null

export function registerSave(next: SaveHandler | null): void {
  handler = next
}

export async function requestSave(): Promise<void> {
  if (handler === null) {
    return
  }

  await handler()
}
