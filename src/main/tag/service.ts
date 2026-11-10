import type { TagRepository } from './repository'
import { validateTagColor, validateTagName } from './model'

export type TagService = TagRepository

export function newTagService(repo: TagRepository): TagService {
  return {
    list: () => repo.list(),
    async setColor(name, color) {
      validateTagName(name)
      validateTagColor(color)
      await repo.setColor(name, color)
    },
    async impact(name) {
      validateTagName(name)
      return repo.impact(name)
    },
    async deleteEverywhere(name) {
      validateTagName(name)
      await repo.deleteEverywhere(name)
    }
  }
}
