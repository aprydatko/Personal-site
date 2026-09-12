---
title: "Error Boundaries in React: Failing Gracefully"
description: A practical guide to React Error Boundaries, isolating rendering failures, designing useful fallbacks, recovering safely, and handling errors across Next.js routes.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

A rendering error in one component should not always turn the entire application into a blank screen. A chart can fail while the rest of a dashboard remains useful. A recommendation widget can be unavailable while the article is still readable.

React Error Boundaries provide that isolation. They catch errors thrown while rendering a descendant tree and replace the failed region with a fallback interface:

```text
descendant throws → Error Boundary → fallback UI
```

An Error Boundary is both a technical safety net and a product decision. It defines what part of the interface can fail independently and what users can do next.

## What does an Error Boundary catch?

An Error Boundary catches errors during:

- Rendering a descendant component.
- Constructing a descendant class component.
- Lifecycle methods of a descendant class component.

It does not automatically catch every possible error. Errors in event handlers, asynchronous callbacks, server code, or the boundary component itself need separate handling.

```tsx
const handleClick = async () => {
  try {
    await saveSettings();
  } catch {
    setError('Settings could not be saved.');
  }
};
```

Use local `try` / `catch` for event-driven work. Use an Error Boundary for unexpected rendering failures.

## Creating a class Error Boundary

React's built-in Error Boundary API is implemented with a class component:

```tsx
'use client';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

`getDerivedStateFromError` updates state so the next render shows the fallback. The boundary should stay small; its purpose is to contain failure, not to become a second application shell.

## Logging errors separately

Use `componentDidCatch` for reporting diagnostics:

```tsx
class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    errorReporter.capture(error, {
      componentStack: info.componentStack,
    });
  }

  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
```

Reporting should not expose sensitive user data or make the fallback depend on the logging service. If reporting fails, the user still needs a usable fallback.

## Choose the boundary scope carefully

A boundary around the entire application protects against a catastrophic blank screen:

```tsx
<ErrorBoundary fallback={<ApplicationError /> }>
  <App />
</ErrorBoundary>
```

But a single large boundary also means one rendering error replaces everything. Smaller boundaries isolate independent regions:

```tsx
<PageLayout>
  <ArticleBody />
  <ErrorBoundary fallback={<RecommendationsUnavailable />}>
    <Recommendations />
  </ErrorBoundary>
</PageLayout>
```

Useful boundary locations include route segments, dashboard widgets, optional sidebars, third-party integrations, and areas that can recover independently.

The boundary should match the user's mental model. If a widget can fail without affecting the main task, isolate it. If the page cannot be meaningful without a failed component, use a broader fallback.

## Design a useful fallback

A fallback should explain the problem at the right level and offer a recovery path:

```tsx
const WidgetError = ({ onRetry }: { onRetry: () => void }) => (
  <section role="alert" aria-labelledby="widget-error-title">
    <h2 id="widget-error-title">This widget is unavailable</h2>
    <p>Try again, or continue using the rest of the dashboard.</p>
    <button type="button" onClick={onRetry}>
      Try again
    </button>
  </section>
);
```

Avoid showing raw stack traces or implementation details to users. Provide technical details in logs and a friendly message in the interface.

The fallback should preserve the surrounding layout when possible. A replacement with a completely different height can cause another distracting layout shift.

## Recovery and reset

Once a boundary catches an error, it remains in its error state until it is reset or unmounted. A retry needs to reset the boundary and often refresh the data or change the failing input.

A resettable boundary can accept a `resetKey`:

```tsx
type ResettableProps = ErrorBoundaryProps & {
  resetKey?: string | number;
};

class ResettableBoundary extends Component<ResettableProps, ErrorBoundaryState> {
  state = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: ResettableProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

In practice, use a well-tested boundary utility when its reset and fallback APIs fit the application. Resetting should not blindly repeat a deterministic failure forever. Change the input, reload the data, navigate away, or offer a full-page refresh when appropriate.

## Error Boundaries versus loading and async errors

An Error Boundary is not a replacement for explicit request state. A failed `fetch` inside an effect will not automatically be caught by a rendering boundary:

```tsx
useEffect(() => {
  fetch('/api/projects')
    .then((response) => response.json())
    .catch(() => setStatus('error'));
}, []);
```

Represent expected request failures as loading, success, and error states. Reserve Error Boundaries for unexpected exceptions during rendering or component lifecycle work.

Similarly, a Suspense fallback handles waiting, while an Error Boundary handles failure. The two work well together:

```tsx
<ErrorBoundary fallback={<SectionError />}>
  <Suspense fallback={<SectionSkeleton />}>
    <SlowSection />
  </Suspense>
</ErrorBoundary>
```

This gives users a distinct experience for “not ready yet” and “could not render.”

## Next.js route-level error boundaries

The Next.js App Router supports an `error.tsx` file convention for route-segment errors. The file is a Client Component and receives the error and a reset function:

```tsx
// app/projects/error.tsx
'use client';

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main role="alert">
      <h1>Projects could not be loaded</h1>
      <p>Something went wrong while rendering this page.</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}
```

The route boundary is a convenient recovery surface, but it does not remove the need for local error states around expected mutations or data requests. Use the smallest boundary that preserves a meaningful user task.

For a root-level failure, Next.js also supports a global error file. Treat it as the last-resort shell and keep it dependency-light.

## Error boundaries and server errors

Client Error Boundaries do not replace server-side error handling. Server Components, route handlers, server actions, and database calls need their own validation, logging, authorization, and error responses.

A server-rendered error can reach a route error boundary, but the secure cause should not be sent to the browser. Return a safe user-facing message and keep detailed diagnostics on the server.

The same principle applies to authorization: hiding a component behind a client boundary is not access control. Enforce permissions where the data or mutation is protected.

## Error boundaries and event handlers

Errors thrown directly from an event handler are not caught by the nearest rendering Error Boundary:

```tsx
const handleSubmit = () => {
  throw new Error('Submission failed');
};
```

Handle expected failures at the event boundary:

```tsx
const handleSubmit = async () => {
  setStatus('saving');

  try {
    await submitForm(values);
    setStatus('saved');
  } catch {
    setStatus('error');
  }
};
```

If an unexpected event error must reach a boundary, capture it in state and render that state deliberately. Do not use a boundary as a substitute for normal error handling.

## Testing Error Boundaries

Test the failure contract with a component that throws during render:

```tsx
const BrokenWidget = () => {
  throw new Error('Widget failed');
};

render(
  <ErrorBoundary fallback={<p role="alert">Unavailable</p>}>
    <BrokenWidget />
  </ErrorBoundary>,
);

expect(screen.getByRole('alert')).toHaveTextContent('Unavailable');
```

Also test:

- Errors are reported without breaking the fallback.
- A retry resets the boundary when recovery is possible.
- An isolated failure leaves neighboring content usable.
- Expected request errors render their normal error state.
- Fallbacks have accessible names and recovery controls.
- Sensitive implementation details are not shown to users.

Keep test output quiet by mocking expected error reporting. Verify the public user experience rather than private lifecycle calls.

## Common mistakes

### One boundary around everything

A global safety net is useful, but it should not be the only boundary. Isolate optional regions so one failure does not erase unrelated work.

### Using a boundary for expected API failures

Request failures should become explicit UI state with retry or recovery. A boundary is for unexpected rendering failures.

### Showing a blank fallback

An empty box gives users no explanation and no next action. Include a concise message and a meaningful recovery path.

### Retrying without changing anything

If the same deterministic render error happens every time, an automatic retry only repeats the failure. Reset after a data refresh, input change, or navigation when that can actually affect the cause.

### Logging sensitive data

Component stacks and error metadata can contain private information. Minimize reports, scrub payloads, and apply retention controls.

### Treating the boundary as security

Client fallback behavior does not protect server data or actions. Authorization belongs at the server and application-service boundaries.

## A practical checklist

Before adding an Error Boundary, ask:

- What class of error should this boundary catch?
- What is the smallest meaningful region it should isolate?
- What can the user still do if the region fails?
- Is this an expected request error that belongs in explicit state instead?
- How will retry or reset change the failing conditions?
- Are errors logged safely without exposing sensitive data?
- Does the fallback preserve layout and accessibility?
- Are server-side validation and authorization still enforced?

## Final thoughts

Error Boundaries keep rendering failures from becoming full-application failures. They give a product a way to isolate broken regions, explain what happened, and offer recovery while preserving everything that still works.

Use boundaries at meaningful route and feature boundaries, distinguish unexpected render errors from expected async failures, keep fallbacks useful and accessible, and treat server-side handling as a separate responsibility. Graceful failure is not hiding errors—it is giving users the clearest safe path forward.
