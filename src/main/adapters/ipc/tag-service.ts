import { isTagColor } from '../../../shared/tags'
import type { TagService } from '../../tag/service'
import { tagChannels, type IpcHandlerRegistry } from './contract'
import { toIpcResult } from './errors'
import { expectString } from './validate'

export function registerTagHandlers(registry: IpcHandlerRegistry, service: TagService): void {
  registry.handle(tagChannels.list, () => toIpcResult(() => service.list()))
  registry.handle(tagChannels.setColor, (_event, name, color) =>
    toIpcResult(async () => {
      if (!isTagColor(color)) throw new Error('Invalid tag color')
      await service.setColor(expectString(name, 'name'), color)
    })
  )
  registry.handle(tagChannels.impact, (_event, name) =>
    toIpcResult(() => service.impact(expectString(name, 'name')))
  )
  registry.handle(tagChannels.deleteEverywhere, (_event, name) =>
    toIpcResult(() => service.deleteEverywhere(expectString(name, 'name')))
  )
}
