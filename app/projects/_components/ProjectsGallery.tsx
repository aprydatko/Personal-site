'use client';

import { ArrowDown, ArrowUpRight, ChevronDown, Rocket } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Category = 'All' | 'Web Apps' | 'E-commerce' | 'Dashboard' | 'API' | 'Tools';
type SortOrder = 'newest' | 'featured';

type Project = {
  name: string;
  category: Exclude<Category, 'All'>;
  label: string;
  description: string;
  stack: string[];
  visual: 'analytics' | 'commerce' | 'dashboard' | 'code' | 'snippet';
};

const categories: Category[] = ['All', 'Web Apps', 'E-commerce', 'Dashboard', 'API', 'Tools'];
const projects: Project[] = [
  { name: 'Nexora', category: 'Web Apps', label: 'WEB APP', description: 'AI-powered analytics platform for business intelligence and reporting.', stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Chart.js'], visual: 'analytics' },
  { name: 'Velox Store', category: 'E-commerce', label: 'E-COMMERCE', description: 'Modern e-commerce built for speed and conversion.', stack: ['Next.js', 'Stripe', 'PostgreSQL', 'Tailwind CSS', 'Resend'], visual: 'commerce' },
  { name: 'Gravit', category: 'Dashboard', label: 'WEB APP', description: 'Project management tool for distributed teams.', stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Socket.io'], visual: 'dashboard' },
  { name: 'Auth Service', category: 'API', label: 'API / BACKEND', description: 'Authentication service with JWT, refresh tokens and permissions.', stack: ['Node.js', 'Fastify', 'PostgreSQL', 'Redis', 'JWT'], visual: 'code' },
  { name: 'Snippet Pro', category: 'Tools', label: 'TOOL', description: 'Developer tool to organize and share code snippets.', stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Prisma', 'PostgreSQL'], visual: 'snippet' },
];

const ProjectVisual = ({ type }: { type: Project['visual'] }) => {
  if (type === 'analytics') return <div className="project-visual visual-analytics"><span className="visual-brand">◉ NEXORA</span><div className="analytics-side">Overview<br />Analytics<br />Reports<br />Projects<br />Users</div><div className="analytics-main"><b>Overview</b><div className="stat-row"><span>$24,980<small>Total revenue</small></span><span>1,248<small>New users</small></span><span>8,642<small>Active users</small></span></div><div className="chart-line" /></div></div>;
  if (type === 'commerce') return <div className="project-visual visual-commerce"><b>Velox</b><span>Shop　 Men　 Women　 Accessories</span><div className="commerce-copy">Performance<br />meets design.<button>Shop collection　→</button></div><div className="bike">◯</div></div>;
  if (type === 'dashboard') return <div className="project-visual visual-dashboard"><b>◉ Gravit</b><span>Overview</span><div className="dashboard-stats"><b>24<small>Projects</small></b><b>128<small>Tasks</small></b><b>68%<small>Progress</small></b></div><div className="dashboard-list">Recent projects <i>Mobile app　 In progress</i><i>Design system　 Completed</i></div></div>;
  if (type === 'code') return <div className="project-visual visual-code"><span>1　<span className="pink">import</span> {'{ FastifyInstance }'} <span className="pink">from</span> {`'fastify'`}</span><span>3　<span className="pink">export default async function</span> routes(app)</span><span>4　 {`app.get('/api/v1/users', async (request, reply) => {`}</span><span>6　　const users = await getUsers()</span><span>8　　return reply.send({'{'} users {'}'})</span><span>9　{'}'})</span></div>;
  return <div className="project-visual visual-snippet"><b>Snippet Pro</b><span>Features　 Pricing　 Docs</span><div className="snippet-copy">Organize your code<br />snippets. Boost your<br />productivity.<button>Get started for free　→</button></div><div className="snippet-lines">▣  Create a new snippet<br />　{`const message = 'hello world'`}<br />　export default message</div></div>;
};

export const ProjectsGallery = () => {
  const [category, setCategory] = useState<Category>('All');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const visibleProjects = useMemo(() => {
    const filtered = category === 'All' ? projects : projects.filter((project) => project.category === category);
    return sortOrder === 'newest' ? filtered : [...filtered].reverse();
  }, [category, sortOrder]);

  return <section className="projects-gallery" aria-label="Project directory">
    <div className="project-controls">
      <div className="project-tabs" role="tablist" aria-label="Filter projects">
        {categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <label className="project-sort">Sort by:
        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} aria-label="Sort projects">
          <option value="newest">Newest</option><option value="featured">Featured</option>
        </select><ChevronDown aria-hidden="true" />
      </label>
    </div>
    <div className="project-list">
      {visibleProjects.map((project) => <article className="project-row" key={project.name}>
        <ProjectVisual type={project.visual} />
        <div className="project-copy"><p>{project.label}</p><h2>{project.name}</h2><p className="project-description">{project.description}</p><ul>{project.stack.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <Link className="project-link" href="/contact" aria-label={`Discuss ${project.name}`}><ArrowUpRight aria-hidden="true" /></Link>
      </article>)}
    </div>
    <aside className="project-cta"><Rocket aria-hidden="true" /><div><h2>Have a project in mind?</h2><p>Let’s build something great together.</p></div><Link href="/contact">Start a project <ArrowDown aria-hidden="true" /></Link></aside>
  </section>;
};
