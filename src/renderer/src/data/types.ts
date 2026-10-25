// The shape the interface works with. It is deliberately not the generated one:
// the bindings describe Go slices as nullable, because Go marshals a nil slice
// as null, and the interface should not have to keep asking whether a list
// exists. `data/normalise.ts` is the only place that translation happens.

export type Story = {
  ID: string
  Topic: string
  Titles: string[]
  Tags: string[]
  Text: string
  CreatedAt: string
  UpdatedAt: string
}

export type Article = {
  ID: string
  StoryID: string
  Title: string
  Subtitle: string
  Target: string
  Text: string
  CreatedAt: string
  UpdatedAt: string
}

export type PostState = 'pending' | 'scheduled' | 'published'

export type Post = {
  ID: string
  Topic: string
  Text: string
  State: PostState
  ScheduledAt: string | null
  CreatedAt: string
  UpdatedAt: string
}
