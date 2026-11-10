import type { TagColor, TagImpact, TagMetadata } from '../../shared/tags'

export interface TagRepository {
  list(): Promise<TagMetadata[]>
  setColor(name: string, color: TagColor): Promise<void>
  impact(name: string): Promise<TagImpact>
  deleteEverywhere(name: string): Promise<void>
}
