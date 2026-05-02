import { Fragment, useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import overviewMarkdown from "../../../docs/TRADEVAULT_ARENA_OVERVIEW.md?raw";

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: { title: string; details: string[] }[] }
  | { type: "code"; code: string; language: string }
  | { type: "table"; rows: string[][] };

export function DocsPage() {
  const blocks = useMemo(() => parseMarkdown(overviewMarkdown), []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <section className="tv-panel p-5 sm:p-6">
        <p className="tv-kicker">Documentation</p>
        <h1 className="text-2xl font-semibold text-[var(--text)]">TradeVault Arena Overview</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Product, architecture, keeper model, user flows, limitations, and roadmap for the
          current TradeVault Arena MVP.
        </p>
      </section>

      <article className="tv-panel p-5 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-5">{blocks.map(renderBlock)}</div>
      </article>
    </motion.div>
  );
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      index += 1;
      const code: string[] = [];
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", code: code.join("\n"), language });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        const row = (lines[index] ?? "")
          .trim()
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        rows.push(row);
        index += 1;
      }
      const normalizedRows = rows.filter((row) =>
        !row.every((cell) => /^:?-{3,}:?$/.test(cell)),
      );
      if (normalizedRows.length) {
        blocks.push({ type: "table", rows: normalizedRows });
      }
      continue;
    }

    if (/^- /.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const next = (lines[index] ?? "").trim();
        if (!/^- /.test(next)) break;
        items.push(next.replace(/^- /, "").trim());
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: { title: string; details: string[] }[] = [];
      while (index < lines.length) {
        const current = (lines[index] ?? "").trim();
        const match = current.match(/^\d+\.\s+(.*)$/);
        if (!match) break;

        const nextItem = { title: match[1].trim(), details: [] as string[] };
        index += 1;

        while (index < lines.length) {
          const detailLine = lines[index] ?? "";
          const detailTrimmed = detailLine.trim();
          if (!detailTrimmed) {
            index += 1;
            break;
          }
          if (/^\d+\.\s+/.test(detailTrimmed)) break;
          if (/^(#{1,6})\s+/.test(detailTrimmed) || detailTrimmed.startsWith("```") || detailTrimmed.startsWith("|")) {
            break;
          }
          if (/^-\s+/.test(detailTrimmed)) {
            break;
          }

          if (/^\s+[-*]\s+/.test(detailLine)) {
            nextItem.details.push(detailTrimmed.replace(/^[-*]\s+/, "").trim());
            index += 1;
            continue;
          }

          if (/^\s+/.test(detailLine)) {
            nextItem.details.push(detailTrimmed);
            index += 1;
            continue;
          }

          break;
        }

        items.push(nextItem);
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraph: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index] ?? "";
      const nextTrimmed = next.trim();
      if (!nextTrimmed) {
        index += 1;
        break;
      }
      if (
        nextTrimmed.startsWith("```")
        || /^(#{1,6})\s+/.test(nextTrimmed)
        || nextTrimmed.startsWith("|")
        || /^- /.test(nextTrimmed)
        || /^\d+\.\s+/.test(nextTrimmed)
      ) {
        break;
      }
      paragraph.push(nextTrimmed);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderBlock(block: MarkdownBlock, index: number) {
  switch (block.type) {
    case "heading": {
      if (block.level === 1) {
        return (
          <h1 key={index} className="text-3xl font-semibold tracking-[-0.03em] text-[var(--text)]">
            {block.text}
          </h1>
        );
      }

      if (block.level === 2) {
        return (
          <h2
            key={index}
            className="border-b border-[var(--border-soft)] pb-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]"
          >
            {block.text}
          </h2>
        );
      }

      return (
        <h3 key={index} className="pt-2 text-lg font-semibold text-[var(--text)]">
          {block.text}
        </h3>
      );
    }

    case "paragraph":
      return (
        <p key={index} className="text-sm leading-7 text-[var(--muted)]">
          {renderInline(block.text)}
        </p>
      );

    case "unordered-list":
      return (
        <ul key={index} className="space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">
          {block.items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`} className="list-disc">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );

    case "ordered-list":
      return (
        <ol key={index} className="space-y-4 pl-5 text-sm leading-7 text-[var(--muted)]">
          {block.items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`} className="list-decimal">
              <div className="space-y-2">
                <p className="font-medium text-[var(--text)]">{renderInline(item.title)}</p>
                {item.details.length ? (
                  <ul className="space-y-1 pl-4">
                    {item.details.map((detail, detailIndex) => (
                      <li key={`${index}-${itemIndex}-${detailIndex}`} className="list-disc">
                        {renderInline(detail)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      );

    case "code":
      return (
        <div key={index} className="overflow-hidden rounded-[16px] border border-[var(--border-soft)] bg-[#030405]">
          {block.language ? (
            <div className="border-b border-[var(--border-soft)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              {block.language}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-[var(--text)]">
            <code>{block.code}</code>
          </pre>
        </div>
      );

    case "table": {
      const [header, ...body] = block.rows;
      return (
        <div key={index} className="overflow-x-auto rounded-[16px] border border-[var(--border-soft)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[rgba(57,255,136,0.06)] text-[var(--text)]">
              <tr>
                {header.map((cell, cellIndex) => (
                  <th key={`${index}-head-${cellIndex}`} className="border-b border-[var(--border-soft)] px-4 py-3 font-semibold">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={`${index}-row-${rowIndex}`} className="text-[var(--muted)]">
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-cell-${rowIndex}-${cellIndex}`} className="border-t border-[var(--border-soft)] px-4 py-3 align-top leading-6">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded bg-[rgba(57,255,136,0.08)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--text)]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${match.index}-strong`} className="font-semibold text-[var(--text)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${match.index}-link`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--primary)] underline decoration-[rgba(57,255,136,0.35)] underline-offset-4"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
