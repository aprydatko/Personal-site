---
title: "Higher-Order Components in React: Reusing Component Behavior"
description: A practical guide to React Higher-Order Components, how wrapper functions enhance components, and when hooks, composition, or server boundaries are better alternatives.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

React components often need behavior that is useful in more than one place: authentication checks, loading states, feature flags, permissions, error handling, or analytics. A Higher-Order Component, usually abbreviated HOC, is one pattern for sharing that behavior.

A HOC is a function that receives a component and returns an enhanced component:

```text
withFeature(Component) → EnhancedComponent
```

The original component renders the feature UI. The HOC wraps it with additional behavior without editing its source code.

## What is a Higher-Order Component?

A Higher-Order Component is not a special React element. It is a JavaScript function whose input and output are components:

```tsx
const withLoading = <Props,>(
  Component: ComponentType<Props>,
) => {
  return (props: Props & { isLoading: boolean }) => {
    if (props.isLoading) return <Spinner />;

    return <Component {...props} />;
  };
};
```

The returned component decides whether to show a loading state or render the wrapped component. The wrapped component remains focused on its successful content.

Usage looks like this:

```tsx
const UserListWithLoading = withLoading(UserList);

<UserListWithLoading isLoading={loading} users={users} />;
```

The naming convention `withSomething` makes the enhancement visible at the call site.

## The problem HOCs solve

Without a shared abstraction, several components may repeat the same workflow:

```tsx
const Dashboard = ({ user }: Props) => {
  if (!user) return <LoginPrompt />;
  return <DashboardContent user={user} />;
};

const Reports = ({ user }: Props) => {
  if (!user) return <LoginPrompt />;
  return <ReportsContent user={user} />;
};
```

An authentication HOC can centralize the boundary:

```tsx
const withAuth = <Props,>(Component: ComponentType<Props>) => {
  return (props: Props) => {
    const user = useCurrentUser();

    if (!user) return <LoginPrompt />;

    return <Component {...props} user={user} />;
  };
};
```

In real TypeScript code, define the injected props separately so the public component does not require consumers to pass values supplied by the HOC:

```tsx
type InjectedUserProps = { user: User };

const withAuth = <Props extends InjectedUserProps>(
  Component: ComponentType<Props>,
) => {
  type ConsumerProps = Omit<Props, keyof InjectedUserProps>;

  return (props: ConsumerProps) => {
    const user = useCurrentUser();

    if (!user) return <LoginPrompt />;
    return <Component {...(props as Props)} user={user} />;
  };
};
```

The exact generic implementation may vary, but the contract should be clear: consumers provide what they own, and the HOC supplies what it injects.

## A HOC should be transparent

Most HOCs should pass unrelated props through unchanged:

```tsx
const withTracking = <Props,>(Component: ComponentType<Props>) => {
  return (props: Props) => {
    useEffect(() => {
      analytics.track('component_viewed');
    }, []);

    return <Component {...props} />;
  };
};
```

The wrapper should add one focused responsibility and preserve the wrapped component's normal behavior. Avoid silently renaming or transforming unrelated props because that makes the enhanced component difficult to reason about.

## Do not mutate the original component

This is an anti-pattern:

```tsx
const withLogging = (Component: ComponentType) => {
  Component.prototype.render = () => {
    // changed behavior
  };

  return Component;
};
```

Mutating the input component creates global side effects and makes the order of enhancements matter. Return a new component instead:

```tsx
const withLogging = <Props,>(Component: ComponentType<Props>) => {
  const LoggedComponent = (props: Props) => {
    console.debug('rendering component');
    return <Component {...props} />;
  };

  return LoggedComponent;
};
```

This keeps the original component reusable and makes the enhancement local to the returned value.

## Composition and order

HOCs can be composed:

```tsx
const EnhancedReports = withAuth(
  withLoading(
    withTracking(Reports),
  ),
);
```

Read the composition from the inside out. `Reports` is tracked, then wrapped with loading behavior, then protected by authentication.

The order matters. Tracking before authentication may count unauthenticated visits. Tracking after authentication may count only authorized views. Decide this deliberately and prefer named intermediate values when the stack becomes difficult to scan:

```tsx
const TrackedReports = withTracking(Reports);
const ReportsWithLoading = withLoading(TrackedReports);
const ProtectedReports = withAuth(ReportsWithLoading);
```

A composition helper can reduce nesting, but it should not hide important workflow order.

## Preserve useful component metadata

Wrapper components appear in React DevTools with generic names unless you assign a descriptive display name:

```tsx
const withLoading = <Props,>(Component: ComponentType<Props>) => {
  const WithLoading = (props: Props & { isLoading: boolean }) => {
    if (props.isLoading) return <Spinner />;
    return <Component {...props} />;
  };

  WithLoading.displayName = `withLoading(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WithLoading;
};
```

This small detail makes debugging a component tree much easier.

Static properties such as route metadata or custom component fields are not automatically copied to the wrapper. If a library relies on statics, use a well-tested hoisting utility or expose the metadata through an explicit API. Do not copy arbitrary properties without understanding their behavior.

## Refs need special treatment

Refs are not ordinary props. A HOC will not automatically forward a ref to the wrapped component:

```tsx
const withBorder = (Component: ComponentType) => (props: Props) => (
  <div className="border">
    <Component {...props} />
  </div>
);
```

If consumers need to focus the wrapped input or access an imperative API, use a ref-forwarding implementation appropriate to the React version and component contract. Be explicit about whether the ref targets the wrapper or the inner component; those are different APIs.

## HOCs and hooks

Hooks are usually the first alternative to consider in modern React:

```tsx
const Reports = () => {
  const user = useCurrentUser();
  const { loading, data } = useReports();

  if (!user) return <LoginPrompt />;
  if (loading) return <Spinner />;

  return <ReportsContent user={user} reports={data} />;
};
```

Hooks make dependencies visible inside the component and avoid an extra wrapper in the rendered tree. They are often easier to compose and type for application code.

HOCs remain useful when:

- A library needs to support class components.
- A cross-cutting boundary should wrap many components consistently.
- The enhancement should enforce a structural UI boundary.
- Existing code already uses an established HOC API.
- A component must be enhanced without modifying its implementation or adding hook calls to it.

Do not introduce a HOC just to move a few lines of state. A custom hook or a Container / Presentational split may communicate that responsibility more directly.

## HOCs and composition

Sometimes a wrapper component is clearer than a HOC:

```tsx
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const user = useCurrentUser();

  if (!user) return <LoginPrompt />;
  return <>{children}</>;
};

<ProtectedRoute>
  <Reports user={user} />
</ProtectedRoute>
```

Composition keeps the enhancement visible in JSX and is often a better choice when the wrapper has meaningful markup or when a feature is used in only one place. HOCs are more convenient when creating an enhanced component is part of a reusable API.

## HOCs and Server Components

In the Next.js App Router, a HOC that uses hooks, context, or event handlers belongs in the Client Component graph. Keep server-only data access outside the HOC and pass serializable data across the server/client boundary:

```tsx
// Server Component
export default async function ReportsPage() {
  const reports = await getReports();

  return <ReportsClient reports={reports} />;
}
```

```tsx
// Client Component
const ProtectedReports = withAuth(ReportsClient);
```

Do not import a server-only repository or secret-bearing module into a client HOC. The wrapper can coordinate browser behavior, while the server remains responsible for secure data access and authorization.

## Testing Higher-Order Components

Test the behavior boundary and the wrapped output separately. A loading HOC should show the loading UI while loading and render the wrapped component when ready. An auth HOC should render the fallback without a user and pass the expected user when authenticated.

Also test prop forwarding:

```tsx
render(<EnhancedCard title="Project" data-testid="card" />);

expect(screen.getByTestId('card')).toHaveTextContent('Project');
```

If the HOC injects callbacks or data, test that the wrapped component receives the right contract. Avoid testing implementation details such as the number of wrapper functions unless the structure itself is the public behavior.

## Common mistakes

### Recreating the enhanced component during render

Do not call a HOC inside another component's render function:

```tsx
// Avoid
const Page = () => {
  const Enhanced = withLoading(Results);
  return <Enhanced isLoading={false} />;
};
```

This creates a new component identity on every render and can reset state below it. Apply HOCs at module scope.

### Hiding too many dependencies

A component wrapped by five HOCs may have behavior that is difficult to discover. Prefer focused enhancements and document the public contract.

### Overwriting consumer props

If both the consumer and the HOC provide the same prop, define which value wins. Silent overwrites create surprising behavior and make types misleading.

### Losing refs or statics

Forward refs intentionally and preserve important metadata through an explicit, tested strategy.

### Using HOCs as a security boundary

An auth HOC can hide UI, but it cannot replace server-side authorization. Protect the data and mutation on the server as well.

## A practical checklist

Before creating a HOC, ask:

- Is the behavior shared by multiple components?
- Would a custom hook or wrapper component be clearer?
- Which props are injected, and which remain consumer-owned?
- Are all unrelated props forwarded?
- Does the wrapper need to support refs or static metadata?
- Is the HOC created at module scope?
- Is the enhancement safe across the server/client boundary?
- Can the wrapper behavior be tested independently?

## Final thoughts

Higher-Order Components are functions for enhancing components with reusable behavior. They can create strong boundaries around authentication, loading, tracking, and compatibility concerns, especially in libraries and legacy React code.

Modern application code often reaches for hooks or composition first because they keep dependencies and structure visible. HOCs are still a useful tool when the enhancement is naturally a wrapper-level concern. Keep them pure, preserve the component contract, handle refs and metadata deliberately, and make composition order easy to understand.
