---
title: "Custom Hooks in React: Reusing Stateful Behavior"
description: A practical guide to React Custom Hooks, how to extract reusable stateful logic, design clear hook APIs, handle effects safely, and avoid common mistakes.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

React components are responsible for rendering user interfaces, but they often need behavior that should work in more than one place: tracking a window size, debouncing a search query, loading data, or managing form state.

Custom Hooks let you extract that stateful behavior into a reusable function. A hook can own state, effects, subscriptions, and derived values while leaving each component free to decide how the result should look.

```text
component → useFeature() → stateful behavior
```

The hook shares logic, not component state. Each component that calls a custom hook gets its own independent hook state unless the hook intentionally connects to shared state.

## What is a Custom Hook?

A Custom Hook is a function whose name starts with `use` and that calls one or more React Hooks:

```tsx
const useDocumentTitle = (title: string) => {
  useEffect(() => {
    document.title = title;
  }, [title]);
};
```

The hook does not render markup. It exposes values and actions for a component to consume:

```tsx
const ProfilePage = ({ user }: Props) => {
  useDocumentTitle(`${user.name} — Profile`);

  return <h1>{user.name}</h1>;
};
```

The component owns presentation. The hook owns the browser-side title effect.

## Why extract a hook?

A Custom Hook is useful when behavior is:

- Stateful and needed by more than one component.
- Hard to read when mixed into a large rendering component.
- Easy to describe with a focused input/output contract.
- Independent from a particular visual layout.
- Worth testing separately from the DOM structure.

The goal is not to move every line of a component into a hook. Extract behavior when the boundary makes ownership and reuse clearer.

## A useful hook API

Consider a debounced value hook:

```tsx
const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
};
```

The hook accepts the source value and delay, then returns the stabilized value:

```tsx
const SearchResults = ({ query }: { query: string }) => {
  const debouncedQuery = useDebouncedValue(query, 300);
  const results = useSearch(debouncedQuery);

  return <Results items={results} />;
};
```

The API is small and domain-neutral. It does not know whether the value came from a search box or a filter control.

## Follow the Rules of Hooks

Custom Hooks must follow the same rules as built-in Hooks:

- Call hooks only at the top level of a component or another custom hook.
- Do not call hooks inside loops, conditions, nested functions, or event handlers.
- Call hooks only from React function components or functions whose names start with `use`.

This is safe:

```tsx
const usePanelState = (initialOpen = false) => {
  const [open, setOpen] = useState(initialOpen);
  return { open, openPanel: () => setOpen(true), closePanel: () => setOpen(false) };
};
```

This is not:

```tsx
const usePanelState = (enabled: boolean) => {
  if (enabled) {
    const [open, setOpen] = useState(false);
    return { open, setOpen };
  }

  return { open: false, setOpen: () => undefined };
};
```

Conditional behavior should be expressed through values or effects, not by conditionally changing the order of hook calls.

## Return values and commands

A hook can return a value, an object, or a tuple. Use an object when the API has several named values or actions:

```tsx
type ToggleModel = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const useToggle = (initialOpen = false): ToggleModel => {
  const [open, setOpen] = useState(initialOpen);

  return {
    open,
    toggle: () => setOpen((current) => !current),
    close: () => setOpen(false),
  };
};
```

Commands are often better than exposing the setter directly. `close` expresses valid intent and leaves the hook free to add cleanup later.

Tuples are compact for simple, familiar contracts:

```tsx
const [isOpen, setIsOpen] = useToggle();
```

For larger APIs, named object properties are easier to read and extend without depending on positional order.

## Async hooks need explicit state

Data-fetching hooks should model loading, success, and error states deliberately:

```tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
```

An example hook can expose the state and a reload command:

```tsx
const useProjects = () => {
  const [state, setState] = useState<AsyncState<Project[]>>({ status: 'idle' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Request failed');
      setState({ status: 'success', data: await response.json() });
    } catch {
      setState({ status: 'error', message: 'Projects could not be loaded.' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
};
```

In production, also consider request cancellation or request identity checks so an old response cannot overwrite newer data. For caching, retries, pagination, and synchronization, a dedicated data-fetching library may be a better fit than maintaining infrastructure inside one hook.

## Dependencies are part of the contract

Effects and callbacks must list the reactive values they read. Omitting a dependency can create stale closures:

```tsx
const useGreeting = (name: string) => {
  useEffect(() => {
    console.log(`Hello, ${name}`);
  }, [name]);
};
```

Do not silence the hooks lint rule just to make an effect run less often. If a dependency causes unwanted work, restructure the effect, stabilize the dependency, or separate unrelated responsibilities.

A hook that accepts an object or callback should document whether callers need stable references. Better still, design the API around primitive values or make the hook handle identity carefully.

## Browser APIs and cleanup

Hooks are a natural place for subscriptions and browser APIs:

```tsx
const useOnlineStatus = () => {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
};
```

Every subscription, timer, observer, or external connection needs a cleanup path. Cleanup prevents memory leaks and avoids updating a component after its behavior is no longer needed.

When using Next.js Server Components, a hook that accesses `window`, `document`, or state must live in a Client Component module. Keep server-only data access out of the client hook module.

## Custom Hooks do not automatically share state

Calling the same hook twice creates two independent states:

```tsx
const FirstPanel = () => {
  const { open, toggle } = useToggle();
  return <Panel open={open} onToggle={toggle} />;
};

const SecondPanel = () => {
  const { open, toggle } = useToggle();
  return <Panel open={open} onToggle={toggle} />;
};
```

Opening the first panel does not open the second. If state must be shared, lift it to a common parent, use Context, or use a state-management solution appropriate to the scope.

The hook can still share the rules for updating that state; ownership and sharing are separate decisions.

## Hooks and the Container / Presentational pattern

A hook can become the behavioral part of a Container:

```tsx
const ProjectsContainer = () => {
  const model = useProjectsDirectory();

  return <ProjectsView {...model} />;
};
```

The hook coordinates filters, sorting, and actions. The View receives a focused model and renders it. This keeps the component tree declarative while making the behavior reusable in another presentation.

Compared with a Render Prop, a hook does not need to own a wrapper element or call a function supplied by the consumer. Compared with a Higher-Order Component, it keeps dependencies visible inside the component and avoids adding a wrapper to the tree.

## Testing Custom Hooks

Test pure calculations as ordinary functions whenever possible. For hooks that use state or effects, use a React-aware hook testing utility or render a small test component.

Useful cases include:

- Initial state and default options.
- State transitions after commands.
- Derived values.
- Effect setup and cleanup.
- Async success, error, and retry behavior.
- Cancellation and stale response handling.
- Behavior when inputs change.

Keep tests focused on the hook's public contract. The consumer should not need to know whether a value is held in `useState`, derived with `useMemo`, or synchronized through an effect.

## Common mistakes

### Extracting too little

A hook that only wraps one `useState` call may add a name without adding a useful abstraction. Extract a hook when it captures a meaningful behavior or contract.

### Extracting too much

An enormous hook that handles fetching, validation, analytics, navigation, and multiple unrelated forms becomes a hidden component. Keep hooks focused and compose smaller hooks.

### Returning unstable functions without need

Functions created on every render are usually fine, but they can cause unnecessary effects in consumers that depend on identity. Use `useCallback` when stable identity is part of the hook's useful contract or when measurement shows it matters.

### Treating `useEffect` as a general-purpose workflow

Effects synchronize React with external systems. Avoid using them to derive values that can be calculated during render or to chain ordinary event-driven application logic.

### Ignoring server rendering

A hook that reads browser globals during initial render can fail in a server environment. Use client boundaries and browser-safe initialization patterns.

### Reimplementing infrastructure

For complex server state, caching, retries, and mutations, use a mature library or existing application service rather than turning one custom hook into a data platform.

## A practical checklist

Before creating a Custom Hook, ask:

- Is this behavior stateful or connected to an external system?
- Is it reused, or does extraction make one component clearer?
- What is the smallest useful input/output contract?
- Should the hook return commands instead of raw setters?
- Are effect dependencies and cleanup correct?
- Does the hook need a Client Component boundary?
- Is state meant to be independent or shared?
- Would an established library solve the async or data problem more reliably?

## Final thoughts

Custom Hooks are React's most direct tool for reusing stateful behavior. They keep effects, subscriptions, transitions, and derived values out of rendering code while allowing each component to choose its own UI.

Design hooks around meaningful behavior, expose focused models and commands, clean up external resources, and keep server-only concerns out of client modules. A good hook makes a component easier to read without making the behavior harder to discover.
