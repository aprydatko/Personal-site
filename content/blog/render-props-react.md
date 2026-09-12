---
title: "Render Props in React: Sharing Behavior Without Owning Markup"
description: A practical guide to the React Render Props pattern, using functions as props to share stateful behavior while leaving rendering decisions to the consumer.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

React components often need to share behavior without sharing the exact same interface. A data loader may be useful as a table, a list, or a chart. A mouse tracker may power a tooltip, a preview, or a custom cursor.

The Render Props pattern solves this by letting a component receive a function that decides what to render:

```tsx
<MouseTracker>
  {(position) => <CursorPreview position={position} />}
</MouseTracker>
```

The component owns the behavior and calls the render function with state. The consumer owns the markup.

## What is a Render Prop?

A render prop is a prop whose value is a function that returns React elements. The name `render` is common, but any function prop can serve the same purpose:

```tsx
<DataLoader
  render={(state) => <Results items={state.data} />}
/>
```

The function is a small rendering boundary. It receives view-ready data and can choose the appropriate layout, loading state, or fallback.

Render props are often implemented with `children`:

```tsx
<DataLoader>
  {(state) => <Results items={state.data} />}
</DataLoader>
```

This is sometimes called the function-as-children pattern. It is still a Render Props design because the child is a function supplied by the consumer.

## A simple behavior component

Here is a mouse tracker that does not know how its position should look:

```tsx
'use client';

type Position = { x: number; y: number };

type MouseTrackerProps = {
  children: (position: Position) => ReactNode;
};

const MouseTracker = ({ children }: MouseTrackerProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    setPosition({ x: event.clientX, y: event.clientY });
  };

  return <div onMouseMove={handleMouseMove}>{children(position)}</div>;
};
```

Different consumers can reuse the behavior:

```tsx
<MouseTracker>
  {({ x, y }) => (
    <p>
      Pointer: {x}, {y}
    </p>
  )}
</MouseTracker>
```

```tsx
<MouseTracker>
  {(position) => (
    <div style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
      Preview
    </div>
  )}
</MouseTracker>
```

The behavior component provides the event handling and state. It does not impose a visual design.

## Sharing asynchronous behavior

Render Props are also useful for exposing a consistent async state model:

```tsx
type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

type ResourceProps<T> = {
  load: () => Promise<T>;
  children: (state: AsyncState<T>) => ReactNode;
};
```

The implementation can handle loading, errors, and cancellation while the consumer decides how those states look:

```tsx
const Resource = <T,>({ load, children }: ResourceProps<T>) => {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    load()
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error', message: 'Unable to load data.' });
      });

    return () => {
      active = false;
    };
  }, [load]);

  return children(state);
};
```

The discriminated union prevents the consumer from accidentally reading `data` during an error or loading state.

## Render Props and separation of concerns

Render Props create a clear division of responsibility:

- The behavior component owns state, effects, event handling, and workflow transitions.
- The render function receives a focused, presentation-ready contract.
- The consumer owns layout, visual components, and accessibility markup.

This is closely related to the Container / Presentational pattern. A Render Prop component acts as a reusable container, while its function prop supplies the presentational layer inline.

The difference is that the consumer does not need to create a separate named View component for every rendering variation.

## Keep the render contract small

Expose the smallest useful state and actions:

```tsx
type PaginationModel = {
  page: number;
  pageCount: number;
  canGoNext: boolean;
  next: () => void;
  previous: () => void;
};
```

Avoid passing internal timers, raw API responses, or setters that consumers should not call directly. The render function should receive a model that describes what the interface needs.

```tsx
<Pagination total={120} pageSize={20}>
  {(model) => (
    <Pager
      page={model.page}
      pageCount={model.pageCount}
      onNext={model.next}
      onPrevious={model.previous}
    />
  )}
</Pagination>
```

Commands such as `next` and `previous` are often a better contract than exposing `setPage`, because the behavior component retains control over boundaries and transitions.

## TypeScript makes Render Props safer

Type the function explicitly so consumers get useful autocomplete and errors:

```tsx
type ToggleModel = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

type ToggleProps = {
  children: (model: ToggleModel) => ReactNode;
};
```

For generic data, put the type parameter on the component props:

```tsx
type ListState<T> = {
  items: T[];
  isEmpty: boolean;
};

type ListControllerProps<T> = {
  items: T[];
  children: (state: ListState<T>) => ReactNode;
};
```

This preserves the item type from the data source through to the render function instead of forcing consumers to cast values.

## Render Props versus custom hooks

Custom hooks are the modern alternative for sharing stateful behavior in many React applications:

```tsx
const useMousePosition = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // event subscription and cleanup
  return position;
};

const CursorPreview = () => {
  const position = useMousePosition();
  return <Preview position={position} />;
};
```

Hooks are often simpler when the consumer is already a component and the behavior does not need to provide a wrapper element. Render Props remain useful when:

- The behavior needs to own a lifecycle boundary or wrapper.
- The API should make the rendering contract explicit.
- The consumer needs several values and commands in one model.
- The feature is a reusable component with its own semantic structure.
- The behavior must be used in environments where hooks are inconvenient or unavailable.

Do not use a Render Prop only because a hook feels too small. Choose the API that makes ownership and composition easiest to understand.

## Render Props and Compound Components

Render Props and Compound Components can be combined. A parent can own state through context, while a render prop provides a custom slot for one part of the UI:

```tsx
<Menu>
  <Menu.Trigger>Account</Menu.Trigger>
  <Menu.Content>
    {({ close }) => <CustomMenuItems onSelect={close} />}
  </Menu.Content>
</Menu>
```

This is powerful, but layering multiple patterns can make the API difficult to learn. Start with one clear extension mechanism and add another only when real consumers need it.

## Performance considerations

The render function is usually created during every parent render. This is normal and rarely a problem for small interfaces. For expensive trees or high-frequency events:

- Keep the render function focused.
- Avoid updating state more often than the UI needs.
- Throttle or debounce pointer and search behavior when appropriate.
- Split expensive presentational sections into memoized components.
- Measure before introducing `useCallback` or `memo`.

Memoizing a render prop does not automatically prevent the behavior component from re-rendering. First identify which state changes and which subtree is expensive.

## Accessibility stays with the rendered UI

The behavior component can expose state and commands, but the consumer is responsible for rendering the correct semantics unless the component owns the semantic element itself.

For a disclosure, the render contract might include enough information to connect the button and panel:

```tsx
<Disclosure>
  {({ open, buttonProps, panelProps }) => (
    <>
      <button {...buttonProps}>Details</button>
      {open && <div {...panelProps}>More information</div>}
    </>
  )}
</Disclosure>
```

The behavior layer can provide stable IDs and `aria-expanded`, but consumers still need to preserve the props and choose an appropriate element. A flexible API should not make accessible usage difficult.

## Common mistakes

### Returning a wrapper the consumer cannot control

An unexpected `<div>` can break layout, tables, or semantic structure. Consider whether the component truly needs a wrapper, or expose a render function that lets the consumer supply the root element.

### Passing internal setters

Raw setters let consumers bypass invariants. Prefer focused commands that represent valid user intent.

### Mixing business rules into rendering

The render function should decide how to display state, not reimplement rules such as authorization, pricing, or data normalization.

### Ignoring async lifecycle

Requests can resolve after a component unmounts or after newer data has been requested. Use cleanup, cancellation, or request identity checks before updating state.

### Creating deeply nested functions

Nested Render Props can become hard to read:

```tsx
<ProviderA>{(a) => <ProviderB>{(b) => <View a={a} b={b} />}</ProviderB>}</ProviderA>
```

Combine related behavior in a hook or use context and named components when nesting starts to obscure the screen.

## A practical checklist

Before choosing Render Props, ask:

- What behavior should be shared?
- Does the consumer need to control the markup?
- What is the smallest view-ready model to expose?
- Should actions be commands rather than raw setters?
- Does a custom hook provide a simpler API?
- Who owns accessibility semantics and IDs?
- Could frequent updates make the render function expensive?
- Would named components or context make composition clearer?

## Final thoughts

Render Props let one component share behavior while another decides how that behavior appears. They are explicit, flexible, and useful for reusable interactive primitives, async state, and multiple presentations of the same model.

Modern React gives you several ways to share logic, especially custom hooks and Compound Components. Use Render Props when the rendering contract itself is the extension point, keep the model focused, protect invariants behind commands, and switch to a simpler pattern when nested functions stop improving clarity.
