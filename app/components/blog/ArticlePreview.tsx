import { type BlogArticle } from '@/app/content/blog';

const TreePreview = () => <pre className="text-[10px] leading-5 text-violet-300">/apps{`\n`}├─ web{`\n`}└─ api{`\n\n`}/packages{`\n`}├─ ui{`\n`}├─ config{`\n`}├─ db{`\n`}└─ utils</pre>;

const ChartPreview = () => <div className="relative h-full p-5 font-sans"><p className="text-[8px] font-semibold">Requests</p><p className="mt-1 text-xl font-semibold">28.6K <span className="text-[8px] text-success">+12.3%</span></p><svg className="absolute inset-x-3 bottom-4 h-16 w-[calc(100%-1.5rem)] text-primary/40" viewBox="0 0 240 70" fill="none" aria-hidden="true"><path d="M0 53L14 47L28 50L42 38L56 47L70 27L84 44L98 42L112 50L126 35L140 42L154 31L168 44L182 37L196 43L210 22L224 31L240 13" stroke="currentColor" strokeWidth="2" /></svg></div>;

const CodePreview = () => <pre className="p-5 text-[9px] leading-5 text-violet-200">1  const getData = cache(async (id: string) =&gt; {'{'}{`\n`}2    const data = await db.user.findUnique({'{'}{`\n`}3      where: {'{'} id {'}'}{`\n`}4    {'}'}){`\n`}5    return data{`\n`}6  {'}'})</pre>;

const ArchitecturePreview = () => <div className="grid h-full grid-cols-2 grid-rows-2 gap-4 p-5 text-center font-mono text-[8px] text-muted"><span className="rounded border border-border bg-background p-3">Next.js</span><span className="rounded border border-border bg-background p-3">Node.js</span><span className="rounded border border-border bg-background p-3">PostgreSQL</span><span className="rounded border border-border bg-background p-3">Redis</span></div>;

const TerminalPreview = () => <pre className="p-5 text-[10px] leading-6 text-code-foreground"><span className="text-amber-300">$</span> docker compose up -d{`\n`}<span className="text-success">✓</span> Container api&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-success">Started</span>{`\n`}<span className="text-success">✓</span> Container web&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-success">Started</span>{`\n`}<span className="text-success">✓</span> Container db&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-success">Healthy</span></pre>;

const previews = { tree: TreePreview, chart: ChartPreview, code: CodePreview, architecture: ArchitecturePreview, terminal: TerminalPreview };

export const ArticlePreview = ({ preview }: Pick<BlogArticle, 'preview'>) => {
  const Preview = previews[preview];
  const isDarkPreview = preview === 'tree' || preview === 'code' || preview === 'terminal';
  return <div className={`aspect-[1.62/1] overflow-hidden rounded-md border border-border-subtle ${isDarkPreview ? 'bg-code-background' : 'bg-surface'}`}><Preview /></div>;
};
