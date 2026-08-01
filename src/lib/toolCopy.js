/**
 * Long-form copy for each tool page.
 *
 * This is the SEO payload. Prerendering (scripts/prerender.js) bakes it into
 * the static HTML, so it is what a crawler reads -- a tool page with only a
 * dropzone on it has nothing to rank.
 *
 * Two rules for anything added here:
 *   1. It has to be useful to a person who is not a search engine. Filler
 *      written for crawlers reads as filler to humans too, and the entire pitch
 *      of this site is that it doesn't lie to you.
 *   2. Limitations go in, not just capabilities. "We can't do X" is the most
 *      trust-building sentence on the page, and it is also what people search
 *      for when a competitor silently mangled their file.
 *
 * FAQ entries additionally emit schema.org FAQPage JSON-LD (see ToolCopy.jsx).
 */

export const TOOL_COPY = {
  '/split': {
    sections: [
      {
        heading: 'How splitting works here',
        body: [
          'You pick page ranges; each range becomes its own PDF. Type them the way you would say them out loud — `1-5` for the first five pages, `8` for a single page, `12-end` when you do not want to count to the last page yourself. Add as many ranges as you need and you get one file back per range.',
          'When you drop a file in, it is read into memory as an ArrayBuffer and parsed by pdf-lib inside the browser tab. Splitting copies the pages you asked for into a fresh document and hands it back as a download. The original file on your disk is never modified.',
        ],
      },
      {
        heading: 'Why splitting a PDF offline matters',
        body: [
          'Most "split PDF online" tools upload your document to a server, split it there, and delete it later — you are asked to trust a privacy policy. For a signed contract, a medical letter, or a bank statement, that is a bad trade for something your own computer can do in a fraction of a second.',
          'This page sends nothing. Open devtools, watch the Network tab, and split a file: the request count stays at zero. That is the whole claim, and it is designed to be checked rather than believed.',
        ],
      },
      {
        heading: 'Limitations worth knowing',
        body: [
          'Password-protected PDFs are rejected rather than silently mangled. If a document is encrypted, you will be told so and nothing will be attempted.',
          'A range that matches no pages is reported by name instead of being quietly dropped — if you ask for `50-60` in a 20-page document, the page says so rather than handing you a suspiciously short list of results.',
          'Very large documents are limited by your device\'s memory, not by an upload cap. A file that would time out on a server-based tool will usually work here; a several-hundred-megabyte scan on an old phone may not.',
        ],
      },
    ],
    faq: [
      {
        q: 'Does this really work without uploading my PDF?',
        a: 'Yes. All parsing and page copying happens in your browser tab using pdf-lib. You can verify it: open your browser\'s developer tools, switch to the Network tab, and split a file. No request is made.',
      },
      {
        q: 'What page range formats can I use?',
        a: 'Single pages (`7`), ranges (`1-5`), and open-ended ranges (`12-end`). You can add multiple ranges, and each one produces a separate PDF.',
      },
      {
        q: 'Will splitting reduce the quality of my PDF?',
        a: 'No. Pages are copied into the new document as-is. Nothing is re-encoded, re-compressed, or rasterised, so text stays selectable and images keep their original quality.',
      },
      {
        q: 'Is there a file size limit?',
        a: 'There is no imposed limit, because nothing is uploaded. The practical ceiling is your device\'s available memory.',
      },
    ],
  },

  '/merge': {
    sections: [
      {
        heading: 'How merging works here',
        body: [
          'Add two or more PDFs and they are combined into a single document in the order shown. Reorder the list before merging and the output follows that order exactly — page one of the first file becomes page one of the result.',
          'Each document is parsed in the browser and its pages are copied into one new PDF. Nothing is uploaded, so a merge of confidential documents stays entirely on your machine.',
        ],
      },
      {
        heading: 'Why merge PDFs without uploading',
        body: [
          'Merging is the operation where privacy leaks hurt most, because you are usually combining several sensitive documents at once — an invoice set, a scanned ID alongside a signed form, a full application pack. Uploading that bundle to a stranger\'s server multiplies the exposure of every file in it.',
          'Doing it locally removes the question entirely. There is no server to trust, no retention window to read about, and no upload to interrupt if your connection drops halfway through.',
        ],
      },
      {
        heading: 'Limitations worth knowing',
        body: [
          'Pages are copied faithfully, but document-level extras do not always survive: bookmarks, form-field values, and attachments belong to the original document structure and may not carry across a merge. If a PDF contains a filled form you need to keep, flatten it before merging.',
          'Encrypted PDFs are rejected with a clear message rather than partially processed.',
          'The free tier merges up to three files at once. Batch merging of larger sets is the planned Pro feature — the limit is a product decision, not a technical one, and it is stated up front rather than discovered at the download step.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I choose the order of the merged files?',
        a: 'Yes. The list order is the output order — rearrange the files before merging and the result follows exactly.',
      },
      {
        q: 'How many PDFs can I merge at once?',
        a: 'Three at a time on the free tier. That limit exists for the paid tier, not because of a technical constraint, and it is shown before you start rather than after.',
      },
      {
        q: 'Do bookmarks and form fields survive a merge?',
        a: 'Pages always do. Document-level features such as bookmarks, interactive form values, and attachments may not carry across, because they are properties of the original file structure. Flatten filled forms first if you need to preserve their contents.',
      },
      {
        q: 'Are my files uploaded anywhere?',
        a: 'No. Every document is read and combined inside your browser. The Network tab stays empty while you work.',
      },
    ],
  },

  '/compress': {
    sections: [
      {
        heading: 'What actually makes a PDF smaller',
        body: [
          'In almost every oversized PDF, the weight is images — usually photographs or scans embedded at far higher resolution than the page needs. Text, vectors, and fonts are tiny by comparison. So this tool goes after the images: it finds embedded JPEGs, re-encodes them at a lower quality through a canvas, and puts them back.',
          'What it deliberately does not do is rasterise pages. A number of "compressors" reach their impressive percentages by rendering each page to a flat picture. The file does get smaller, and it also stops being a real document: text is no longer selectable, no longer searchable, and no longer readable by a screen reader. That trade is never made here.',
        ],
      },
      {
        heading: 'Honest results, including "no"',
        body: [
          'Some PDFs cannot be meaningfully compressed, and this page will tell you so instead of inventing a number. A text-only document is already small. A scan stored as CCITT, JBIG2, or JPEG 2000 uses encodings this tool does not re-encode, so there is nothing for it to work on.',
          'When that happens you get told there is little to compress, rather than a fake progress bar and a file that is 2% smaller with the word "optimized" next to it.',
        ],
      },
      {
        heading: 'Why compressing without upload is different',
        body: [
          'Compression is the PDF operation most likely to be done on a large, personal document — a passport scan, a portfolio, a set of medical records too big to email. Those are exactly the files worth not handing to a third party.',
          'Because the work happens in your browser, file size is limited by your device rather than by an upload cap, and nothing leaves the tab. Large documents are processed in steps so the interface keeps responding while it works.',
        ],
      },
    ],
    faq: [
      {
        q: 'Will compressing make my text blurry?',
        a: 'No. Pages are never flattened into images. Only embedded photographs and scans are re-encoded, so text and vector graphics keep their original sharpness and stay selectable.',
      },
      {
        q: 'Why did my PDF barely get smaller?',
        a: 'Most likely it contains little or no re-encodable image data. Text-heavy documents are already compact, and scans stored as CCITT, JBIG2, or JPEG 2000 are not re-encoded by this tool. The page tells you when this is the case instead of reporting a meaningless result.',
      },
      {
        q: 'Is compression lossy?',
        a: 'For images, yes — that is how the size reduction happens. Text, fonts, and vector content are untouched and remain lossless.',
      },
      {
        q: 'Does my file get uploaded to compress it?',
        a: 'No. The re-encoding runs in your browser using canvas. Nothing is transmitted.',
      },
    ],
  },

  '/reorder': {
    sections: [
      {
        heading: 'Rearrange, rotate, and delete pages',
        body: [
          'Move pages into the sequence you want, rotate the ones that came out of the scanner sideways, and drop the pages you do not need. The result is written as a new PDF when you are done — the file on your disk is never edited in place.',
          'Deletion works by omission: the new document is built from the pages you kept, in the order you kept them. Nothing is stripped out of your original.',
        ],
      },
      {
        heading: 'Rotation is metadata, not re-rendering',
        body: [
          'Rotating a page changes the rotation value recorded in the PDF rather than redrawing the page. That means rotation is lossless and instant — no re-encoding, no quality drop, no increase in file size. A page rotated here looks identical to the original, just the right way up.',
        ],
      },
      {
        heading: 'Why do this locally',
        body: [
          'Page order and orientation problems usually show up on freshly scanned paperwork: contracts, forms, identity documents, anything that went through a feeder tray in the wrong direction. That is a category of document most people would rather not upload anywhere.',
          'Everything on this page happens in the browser tab. There is no upload step, so there is no window in which the document exists on someone else\'s machine.',
        ],
      },
    ],
    faq: [
      {
        q: 'Does rotating a page reduce its quality?',
        a: 'No. Rotation updates the page\'s rotation property in the PDF rather than re-rendering it, so the result is lossless and the file size is unchanged.',
      },
      {
        q: 'Can I delete several pages at once?',
        a: 'Yes. Remove any pages you do not want and the new document is built from the remaining ones, in the order you arranged them.',
      },
      {
        q: 'Is my original file modified?',
        a: 'Never. A new PDF is generated and offered as a download; the file on your disk is left exactly as it was.',
      },
    ],
  },

  '/images-to-pdf': {
    sections: [
      {
        heading: 'Turn photos and scans into one PDF',
        body: [
          'Add JPEGs and PNGs in any mix and they become a single PDF, one image per page, in the order you arrange them. It is the quickest way to turn a handful of phone photos of a document into something you can actually send to an office.',
          'Each image is decoded in the browser with `createImageBitmap` and drawn into a page sized to fit it, so pages keep the proportions of the original photograph rather than being stretched to a fixed paper size.',
        ],
      },
      {
        heading: 'Orientation and file size are handled for you',
        body: [
          'Phone cameras record orientation as EXIF metadata rather than rotating the pixels, which is why photos so often appear sideways in tools that ignore it. Images here are decoded upright, so a photo that looks correct in your gallery looks correct in the PDF.',
          'Large photographs are also downscaled before being embedded. A modern phone produces 12-megapixel images, and putting a dozen of them into a document unmodified yields a PDF too large to email. Scaling to a sensible page resolution keeps the output usable while staying visually indistinguishable at normal viewing size.',
        ],
      },
      {
        heading: 'Why convert images to PDF offline',
        body: [
          'The photos people convert to PDF are overwhelmingly documents: receipts, signed pages, ID cards, prescriptions, proof-of-address letters. Uploading them to a conversion site to save a few seconds is a poor exchange.',
          'This runs entirely in your browser, so the images never leave your device, and it works the same on a phone as on a laptop.',
        ],
      },
    ],
    faq: [
      {
        q: 'Why are my photos sideways in other converters?',
        a: 'Because they ignore EXIF orientation, which is how phone cameras record which way up a photo is. Images here are decoded upright, so they appear the same way they do in your photo gallery.',
      },
      {
        q: 'Can I mix JPEG and PNG files?',
        a: 'Yes. Both formats can be combined in the same document, in whatever order you arrange them.',
      },
      {
        q: 'Why is my PDF smaller than the original photos?',
        a: 'Large images are downscaled to a sensible page resolution before being embedded. Without that step, a dozen 12-megapixel phone photos would produce a file too large to send by email.',
      },
      {
        q: 'Does each image become its own page?',
        a: 'Yes. One image per page, sized to the image\'s own proportions rather than forced onto a fixed paper size.',
      },
    ],
  },
};

TOOL_COPY['/edit'] = {
  sections: [
    {
      heading: 'How editing PDF text actually works',
      body: [
        'Click any line of text on the page and retype it. The original run is covered with a patch matching the background behind it, and your replacement is drawn on top in the closest available font at the same size and position.',
        'That is genuinely how online PDF editors work, including the paid ones — and it is worth understanding why, because it explains the rough edges. A PDF is a page-description format, not a document format. It stores glyphs at fixed coordinates; it has no paragraphs, no lines and no concept of text flow. There is nothing to re-flow when a word gets longer, so editors paint over the old text and draw new text in its place.',
      ],
    },
    {
      heading: 'Why editing without uploading matters here',
      body: [
        'Every other online PDF editor uploads your document to a server, edits it there, and asks you to trust a retention policy — commonly "deleted after a couple of hours". Most also cap the free tier by file size, page count, or tasks per hour.',
        'The documents people actually need to edit are the worst possible candidates for that: forms with your name and address, scanned identity documents, contracts, university paperwork, medical letters. This tool never uploads any of it. Open your browser\'s Network tab and edit a file — the request count stays at zero, and there is no limit on how many times you do it.',
      ],
    },
    {
      heading: 'Honest limitations — please read these',
      body: [
        'Replacements are covered, not deleted. This is the most important thing on this page, and it applies to pictures as much as to words. The originals remain inside the file — text can be recovered by selecting and copying the page, and a replaced image can be pulled out by any PDF extraction tool. Every cover-and-replace editor works this way, including the paid ones. Do not use it to hide an address, a name, a salary, an ID number or a face — for that you need true redaction, which removes the underlying content, and we have not shipped it yet. When we do, it will say so plainly.',
        'Fonts are matched, not preserved. PDFs usually embed only the glyphs a document already uses, so the original font often physically cannot render a character you type. Replacement text is drawn in the closest standard font (Helvetica, Times or Courier, matched for bold and italic). On body text this is usually hard to spot; on a distinctive display font it will be visible.',
        'Editing is line by line, and long replacements do not re-wrap. Type more than the original line held and the text will run on rather than flowing to the next line, because the file contains no information about where lines are allowed to break.',
        'Backgrounds are sampled, not reconstructed. The cover patch takes the most common colour immediately above and below the text. On plain paper that is invisible. Over a photograph, gradient or table rule, the patch will show.',
        'Only Latin characters can be typed. The built-in fonts are WinAnsi-encoded, so Bengali, Arabic, Chinese and similar scripts cannot be written — the editor tells you which characters it cannot handle instead of silently dropping them.',
        'Scanned pages have no text to edit. A scan is a picture of text; there is nothing to select. You can still add new text on top, but changing the scanned words themselves would need OCR, which this tool does not do.',
      ],
    },
  ],
  faq: [
    {
      q: 'Can I replace a photo inside the PDF, or paste one in?',
      a: 'Yes — both, and they are Pro features. Click "Replace image" and pick any picture on the page to swap it, or "Add image" to place a new one, or simply paste from the clipboard with Ctrl+V. Images are decoded and downscaled on your device first, so a phone photo does not add megabytes to the file. Editing and adding text stay free.',
    },
    {
      q: 'Is my PDF uploaded when I edit it?',
      a: 'No. Rendering, text extraction and rewriting all happen in your browser. You can confirm it in your browser\'s Network tab: editing a document sends no requests.',
    },
    {
      q: 'If I replace text, is the original really gone?',
      a: 'No — and this matters. The old text is painted over, not removed, so it stays inside the file and can still be recovered by copying the page or opening it with a tool that reads PDF text. This is true of every cover-and-replace editor. Do not use it to hide sensitive information; that requires true redaction, which removes the underlying content.',
    },
    {
      q: 'Why does my edited text look slightly different from the rest?',
      a: 'Because the original font usually cannot be reused. PDFs embed only the glyphs the document already contains, so replacement text is drawn in the closest standard font instead. On ordinary body text the difference is usually subtle; on unusual fonts it is noticeable.',
    },
    {
      q: 'Can I edit a scanned PDF?',
      a: 'You can add new text on top of it, but you cannot change the scanned words. A scan is an image of text with no text layer to select. Editing it would require OCR, which this tool deliberately does not attempt.',
    },
    {
      q: 'Why can\'t I type in Bengali, Arabic or Chinese?',
      a: 'The built-in PDF fonts only cover Latin characters. Writing other scripts needs a matching font embedded in the file, which is not something this tool can do — so it tells you which characters it cannot write rather than producing a broken document.',
    },
    {
      q: 'Is there a limit on file size or number of edits?',
      a: 'No. Because nothing is uploaded there is no server cost to ration — no page cap, no size cap, no tasks-per-hour limit. The practical ceiling is your device\'s memory.',
    },
  ],
};

export const copyFor = (path) => TOOL_COPY[path] || null;
