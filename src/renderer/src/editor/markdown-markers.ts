import { Tag, styleTags, tags } from '@lezer/highlight'

export const markdownMarkerTags = {
  heading: Tag.define(tags.processingInstruction),
  list: Tag.define(tags.processingInstruction),
  emphasis: Tag.define(tags.processingInstruction),
  code: Tag.define(tags.processingInstruction),
  link: Tag.define(tags.processingInstruction),
  quote: Tag.define(tags.processingInstruction)
}

export const markdownMarkerStyles = {
  props: [
    styleTags({
      HeaderMark: markdownMarkerTags.heading,
      ListMark: markdownMarkerTags.list,
      TaskMarker: markdownMarkerTags.list,
      EmphasisMark: markdownMarkerTags.emphasis,
      CodeMark: markdownMarkerTags.code,
      LinkMark: markdownMarkerTags.link,
      QuoteMark: markdownMarkerTags.quote
    })
  ]
}
