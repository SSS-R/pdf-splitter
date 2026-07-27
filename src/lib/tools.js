/** Single source of truth for the toolkit: home grid, nav, and SEO copy all read this. */
export const TOOLS = [
  {
    path: '/split',
    name: 'Split',
    icon: 'scissors',
    desc: 'Pull page ranges into separate PDFs.',
    eyebrow: 'Tool 01',
    blurb:
      'Pull page ranges into separate files. The document is parsed in memory — nothing is sent anywhere.',
  },
  {
    path: '/merge',
    name: 'Merge',
    icon: 'merge',
    desc: 'Combine documents in the order you choose.',
    eyebrow: 'Tool 02',
    blurb: 'Combine documents in the order you choose. Everything happens on your device.',
  },
  {
    path: '/compress',
    name: 'Compress',
    icon: 'compress',
    desc: 'Shrink oversized files — honestly.',
    eyebrow: 'Tool 03',
    blurb:
      'Shrink oversized PDFs. When we can’t help much, we say so — no fake progress bars, no meaningless “optimized”.',
  },
  {
    path: '/reorder',
    name: 'Reorder',
    icon: 'reorder',
    desc: 'Move, rotate and delete pages.',
    eyebrow: 'Tool 04',
    blurb: 'Move pages into a new sequence, rotate them, or drop the ones you don’t need.',
  },
  {
    path: '/images-to-pdf',
    name: 'Images → PDF',
    icon: 'images',
    desc: 'Turn scans and photos into one PDF.',
    eyebrow: 'Tool 05',
    blurb:
      'Turn scans and photos into a single PDF. Photos are rotated upright and downscaled so the file stays sane.',
  },
];
