/** Single source of truth for the toolkit: home grid, nav, and SEO copy all read this. */
export const TOOLS = [
  {
    path: '/split',
    name: 'Split',
    icon: 'scissors',
    desc: 'Pull page ranges into separate PDFs.',
    blurb:
      'Pull page ranges into separate files. The document is parsed in memory — nothing is sent anywhere.',
  },
  {
    path: '/merge',
    name: 'Merge',
    icon: 'merge',
    desc: 'Combine documents in the order you choose.',
    blurb: 'Combine documents in the order you choose. Everything happens on your device.',
  },
  {
    path: '/compress',
    name: 'Compress',
    icon: 'compress',
    desc: 'Shrink oversized files — honestly.',
    blurb:
      'Shrink oversized PDFs. When we can’t help much, we say so — no fake progress bars, no meaningless “optimized”.',
  },
  {
    path: '/reorder',
    name: 'Reorder',
    icon: 'reorder',
    desc: 'Move, rotate and delete pages.',
    blurb: 'Move pages into a new sequence, rotate them, or drop the ones you don’t need.',
  },
  {
    path: '/images-to-pdf',
    name: 'Images → PDF',
    icon: 'images',
    desc: 'Turn scans and photos into one PDF.',
    blurb:
      'Turn scans and photos into a single PDF. Photos are rotated upright and downscaled so the file stays sane.',
  },
  {
    path: '/edit',
    name: 'Edit text',
    icon: 'doc',
    desc: 'Change words already in the PDF.',
    blurb:
      'Click any line and retype it. The old text is covered and redrawn in a matched font — everything happens on your device, so the document is never uploaded.',
  },
  {
    path: '/pdf-to-docx',
    name: 'PDF → Word',
    icon: 'doc',
    desc: 'Get the text out as an editable .docx.',
    blurb:
      'Pull the text, headings and paragraphs out of a PDF into an editable Word document. Layout and tables do not survive — the format cannot carry them.',
  },
];