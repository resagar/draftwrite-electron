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
      'ATXHeading1/HeaderMark SetextHeading1/HeaderMark': tags.heading1,
      'ATXHeading2/HeaderMark SetextHeading2/HeaderMark': tags.heading2,
      'ATXHeading3/HeaderMark': tags.heading3,
      'ATXHeading4/HeaderMark': tags.heading4,
      'ATXHeading5/HeaderMark': tags.heading5,
      'ATXHeading6/HeaderMark': tags.heading6,
      ListMark: markdownMarkerTags.list,
      TaskMarker: markdownMarkerTags.list,
      EmphasisMark: markdownMarkerTags.emphasis,
      CodeMark: markdownMarkerTags.code,
      LinkMark: markdownMarkerTags.link,
      QuoteMark: markdownMarkerTags.quote
    })
  ]
}
