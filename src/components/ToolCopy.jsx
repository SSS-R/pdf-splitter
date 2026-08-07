import { copyFor } from '../lib/toolCopy.js';

/**
 * Long-form copy under each tool.
 *
 * Rendered as normal markup rather than tucked behind a toggle: collapsed
 * content is weighted less by search engines, and hiding the honest-limitations
 * section would defeat the point of writing it.
 *
 * Also emits FAQPage JSON-LD from the same source, so the questions can qualify
 * for rich results without the answers drifting from what the page says.
 */

/** Render `code spans` inside an otherwise plain string. */
function withCode(text, keyPrefix) {
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={`${keyPrefix}-${i}`}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9em',
          padding: '1px 5px',
          border: '1px solid var(--hairline)',
          background: 'var(--surface)',
        }}
      >
        {part}
      </code>
    ) : (
      part
    ),
  );
}

export default function ToolCopy({ path }) {
  const copy = copyFor(path);
  if (!copy) return null;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <section
      className="tool-copy"
      style={{
        marginTop: 64,
        paddingTop: 40,
        borderTop: 'var(--rule-width) solid var(--rule)',
      }}
    >
      {copy.sections.map((section) => (
        <div key={section.heading} className="tool-copy__block" style={{ marginBottom: 36 }}>
          <h2
            className="display display--sm"
            style={{ fontSize: 22, margin: '0 0 14px', textShadow: 'none' }}
          >
            {section.heading}
          </h2>
          {section.body.map((para, i) => (
            <p
              key={i}
              style={{
                margin: '0 0 14px',
                fontSize: 16,
                lineHeight: 1.65,
                color: 'var(--muted-strong)',
              }}
            >
              {withCode(para, `${section.heading}-${i}`)}
            </p>
          ))}
        </div>
      ))}

      <h2
        className="display display--sm tool-copy__block"
        style={{ fontSize: 22, margin: '0 0 20px', textShadow: 'none' }}
      >
        Common questions
      </h2>
      <dl style={{ margin: 0 }}>
        {copy.faq.map(({ q, a }) => (
          <div key={q} className="tool-copy__block" style={{ marginBottom: 22 }}>
            <dt style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>{q}</dt>
            <dd
              style={{
                margin: 0,
                fontSize: 16,
                lineHeight: 1.65,
                color: 'var(--muted-strong)',
              }}
            >
              {withCode(a, `faq-${q}`)}
            </dd>
          </div>
        ))}
      </dl>

      <script
        type="application/ld+json"
        // Own data, serialised at build time -- no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </section>
  );
}
