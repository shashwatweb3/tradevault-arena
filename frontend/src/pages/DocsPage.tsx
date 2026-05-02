import { useEffect, useId, useMemo, useRef, useState, type AnchorHTMLAttributes, type DetailedHTMLProps, type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import overviewMarkdown from "../../../docs/TRADEVAULT_ARENA_OVERVIEW.md?raw";

type DocSection = {
  id: string;
  title: string;
  body: string;
};

type DocContent = {
  title: string;
  pitch: string;
  badges: string[];
  sections: DocSection[];
};

let mermaidInitialized = false;
let mermaidLoader: Promise<typeof import("mermaid").default> | null = null;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export function DocsPage() {
  const documentModel = useMemo(() => parseDocContent(overviewMarkdown), []);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]"
    >
      <div className="space-y-6">
        <HeroCard title={documentModel.title} pitch={documentModel.pitch} badges={documentModel.badges} />

        {documentModel.sections.map((section) => (
          <motion.section
            key={section.id}
            id={section.id}
            variants={fadeUp}
            className="tv-panel overflow-hidden"
          >
            <div className="border-b border-[var(--border-soft)] px-5 py-4 sm:px-6">
              <p className="tv-kicker">Documentation</p>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[26px]">
                {section.title}
              </h2>
            </div>
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <DocsMarkdown markdown={section.body} />
            </div>
          </motion.section>
        ))}
      </div>

      <aside className="hidden xl:block">
        <motion.div variants={fadeUp} className="sticky top-24 tv-panel p-4">
          <p className="tv-kicker">Navigation</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">On this page</h2>
          <nav className="mt-4 space-y-2">
            {documentModel.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex rounded-[14px] border border-transparent px-3 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[rgba(57,255,136,0.06)] hover:text-[var(--text)]"
              >
                <span className="mr-3 mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--muted-dark)] transition group-hover:bg-[var(--primary)]" />
                <span>{section.title}</span>
              </a>
            ))}
          </nav>
        </motion.div>
      </aside>
    </motion.div>
  );
}

function HeroCard({ title, pitch, badges }: { title: string; pitch: string; badges: string[] }) {
  return (
    <motion.section variants={fadeUp} className="tv-panel overflow-hidden p-5 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(57,255,136,0.7),transparent)]" />
      <p className="tv-kicker">Product Documentation</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="inline-flex rounded-full border border-[rgba(57,255,136,0.18)] bg-[rgba(57,255,136,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]"
          >
            {badge}
          </span>
        ))}
      </div>
      <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-[15px]">
        {pitch}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Trading Model" value="Synthetic BTC/USD" />
        <StatCard label="Settlement" value="On-chain" />
        <StatCard label="Price Resolution" value="Keeper-based" />
      </div>
    </motion.section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.02)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-dark)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function DocsMarkdown({ markdown }: { markdown: string }) {
  const components = useMemo(() => createMarkdownComponents(), []);

  return (
    <div className="docs-markdown max-w-none space-y-4 text-sm leading-7 text-[var(--muted)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderId = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const diagramLayout = useMemo(() => getDiagramLayout(code), [code]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const mermaid = await getMermaid();
        const result = await mermaid.render(`tradevault-mermaid-${renderId}`, code);
        if (cancelled) return;
        setSvg(result.svg);
        setError(null);
        requestAnimationFrame(() => {
          if (!cancelled && containerRef.current && result.bindFunctions) {
            result.bindFunctions(containerRef.current);
          }
        });
      } catch (renderError) {
        if (cancelled) return;
        setError(renderError instanceof Error ? renderError.message : "Failed to render Mermaid diagram.");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [code, renderId]);

  if (error) {
    return (
      <div className="overflow-hidden rounded-[18px] border border-[rgba(255,77,77,0.22)] bg-[#050708]">
        <div className="border-b border-[rgba(255,77,77,0.16)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--warning)]">
          Mermaid render fallback
        </div>
        <p className="px-4 pt-3 text-xs text-[var(--muted)]">{error}</p>
        <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-[var(--text)]">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      className="overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(57,255,136,0.05),rgba(3,5,6,0.35))]"
    >
      <div className="border-b border-[var(--border-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
        Diagram
      </div>
      <div className="overflow-x-auto p-3 sm:p-4">
        {svg ? (
          <div
            ref={containerRef}
            className={diagramLayout.wrapperClassName}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className={`flex min-h-[220px] ${diagramLayout.loadingClassName} items-center justify-center rounded-[12px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.02)] text-sm text-[var(--muted)]`}>
            Rendering diagram...
          </div>
        )}
      </div>
    </motion.div>
  );
}

function createMarkdownComponents() {
  return {
    h1: ({ children }: BlockProps) => (
      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">{children}</h1>
    ),
    h2: ({ children }: BlockProps) => (
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">{children}</h2>
    ),
    h3: ({ children }: BlockProps) => (
      <h3 className="pt-2 text-lg font-semibold text-[var(--text)]">{children}</h3>
    ),
    p: ({ children }: BlockProps) => <p className="text-sm leading-7 text-[var(--muted)]">{children}</p>,
    ul: ({ children }: BlockProps) => <ul className="space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">{children}</ul>,
    ol: ({ children }: BlockProps) => <ol className="space-y-3 pl-5 text-sm leading-7 text-[var(--muted)]">{children}</ol>,
    li: ({ children }: BlockProps) => <li className="list-disc marker:text-[var(--primary)]">{children}</li>,
    a: ({ children, href, ...props }: LinkProps) => (
      <a
        {...props}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--primary)] underline decoration-[rgba(57,255,136,0.35)] underline-offset-4 transition hover:text-[var(--primary-strong)]"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }: BlockProps) => (
      <div className="rounded-[18px] border-l-4 border-[var(--primary)] bg-[rgba(57,255,136,0.08)] px-4 py-4 text-sm leading-7 text-[var(--text)]">
        {children}
      </div>
    ),
    table: ({ children }: BlockProps) => (
      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.02)] text-left text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: BlockProps) => (
      <thead className="bg-[rgba(57,255,136,0.06)] text-[var(--text)]">{children}</thead>
    ),
    th: ({ children }: BlockProps) => (
      <th className="border-b border-[var(--border-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]">
        {children}
      </th>
    ),
    td: ({ children }: BlockProps) => (
      <td className="border-t border-[var(--border-soft)] px-4 py-3 align-top leading-6 text-[var(--muted)]">
        {children}
      </td>
    ),
    pre: ({ children }: BlockProps) => <>{children}</>,
    code: ({ className, children, ...props }: CodeProps) => {
      const content = String(children).replace(/\n$/, "");
      const language = className?.replace("language-", "") ?? "";
      const isBlock = Boolean(className) || content.includes("\n");

      if (!isBlock) {
        return (
          <code
            {...props}
            className="rounded bg-[rgba(57,255,136,0.08)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--text)]"
          >
            {children}
          </code>
        );
      }

      if (language === "mermaid") {
        return <MermaidBlock code={content} />;
      }

      return (
        <div className="overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[#030405]">
          {language ? (
            <div className="border-b border-[var(--border-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {language}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-[var(--text)]">
            <code>{content}</code>
          </pre>
        </div>
      );
    },
    details: ({ children, ...props }: DetailsProps) => (
      <details
        {...props}
        className="group overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.02)]"
      >
        {children}
      </details>
    ),
    summary: ({ children, ...props }: SummaryProps) => (
      <summary
        {...props}
        className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--text)] marker:hidden"
      >
        {children}
      </summary>
    ),
  } as const;
}

function parseDocContent(markdown: string): DocContent {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const title = (lines.find((line) => line.startsWith("# ")) ?? "# Documentation").replace(/^# /, "").trim();

  let pitch = "";
  let badges: string[] = [];
  const sections: DocSection[] = [];

  let index = lines.findIndex((line) => line.startsWith("# "));
  if (index === -1) index = 0;
  index += 1;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      index += 1;
      continue;
    }
    if (!pitch) {
      pitch = line;
      index += 1;
      continue;
    }
    if (!badges.length && line.includes("`")) {
      badges = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
      index += 1;
      continue;
    }
    break;
  }

  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("## ")) {
      if (currentTitle) {
        sections.push({
          id: slugify(currentTitle),
          title: currentTitle,
          body: currentLines.join("\n").trim(),
        });
      }
      currentTitle = line.replace(/^## /, "").trim();
      currentLines = [];
      continue;
    }

    if (currentTitle) {
      currentLines.push(line);
    }
  }

  if (currentTitle) {
    sections.push({
      id: slugify(currentTitle),
      title: currentTitle,
      body: currentLines.join("\n").trim(),
    });
  }

  return { title, pitch, badges, sections };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDiagramLayout(code: string) {
  const normalized = code.trim().toLowerCase();

  if (normalized.startsWith("sequencediagram")) {
    return {
      wrapperClassName:
        "mx-auto min-w-[520px] max-w-[980px] [&_svg]:h-auto [&_svg]:w-full [&_svg]:min-w-[520px] [&_svg]:max-w-[980px]",
      loadingClassName: "min-w-[520px]",
    };
  }

  if (normalized.startsWith("flowchart") || normalized.startsWith("statediagram")) {
    return {
      wrapperClassName:
        "mx-auto w-full min-w-[280px] max-w-[860px] [&_svg]:h-auto [&_svg]:w-full [&_svg]:min-w-[280px] [&_svg]:max-w-[860px]",
      loadingClassName: "min-w-[280px]",
    };
  }

  return {
    wrapperClassName:
      "mx-auto w-full min-w-[320px] max-w-[900px] [&_svg]:h-auto [&_svg]:w-full [&_svg]:min-w-[320px] [&_svg]:max-w-[900px]",
    loadingClassName: "min-w-[320px]",
  };
}

async function getMermaid() {
  if (!mermaidLoader) {
    mermaidLoader = import("mermaid").then((module) => module.default);
  }

  const mermaid = await mermaidLoader;

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      themeVariables: {
        background: "#030506",
        primaryColor: "#0B0F12",
        primaryTextColor: "#F4FFF8",
        primaryBorderColor: "#39FF88",
        lineColor: "#39FF88",
        secondaryColor: "#11171A",
        tertiaryColor: "#070A0C",
        mainBkg: "#0B0F12",
        secondBkg: "#11171A",
        tertiaryBkg: "#070A0C",
        textColor: "#F4FFF8",
        nodeBorder: "#39FF88",
        clusterBkg: "#070A0C",
        clusterBorder: "#39FF88",
        edgeLabelBackground: "#070A0C",
        actorBkg: "#0B0F12",
        actorBorder: "#39FF88",
        actorTextColor: "#F4FFF8",
        labelBoxBkgColor: "#0B0F12",
        labelBoxBorderColor: "#39FF88",
        labelTextColor: "#F4FFF8",
      },
    });
    mermaidInitialized = true;
  }

  return mermaid;
}

type BlockProps = {
  children?: ReactNode;
};

type LinkProps = BlockProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string };
type CodeProps = BlockProps & { className?: string };
type DetailsProps = DetailedHTMLProps<HTMLAttributes<HTMLDetailsElement>, HTMLDetailsElement>;
type SummaryProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
