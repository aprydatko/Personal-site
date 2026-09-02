import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-sm uppercase tracking-widest text-primary">
            Arthur Prydatko
          </p>
          <ThemeToggle />
        </div>
        <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight sm:text-7xl">
          A clean starting point.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Build your next page with the color and typography system defined in Tailwind.
        </p>
      </div>
    </main>
  );
}
