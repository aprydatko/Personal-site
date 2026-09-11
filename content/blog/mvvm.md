---
title: "Structural and Architectural Patterns: MVVM"
description: A practical guide to Model-View-ViewModel, how to separate presentation state from UI components, and when MVVM improves frontend architecture.
date: "2026-09-11"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

Model-View-ViewModel, or MVVM, separates application data, UI presentation, and the stateful logic that connects them.

The three parts are:

- The Model represents application data, domain rules, and external services.
- The View renders the user interface and forwards user interaction.
- The ViewModel exposes view-ready state and commands without requiring the View to understand the underlying workflow.

```text
User interaction ↔ View ↔ ViewModel ↔ Model
```

The ViewModel is the defining part of the pattern. It adapts application state into the form a View needs and coordinates actions triggered by that View.

## The problem MVVM solves

A component can become difficult to maintain when it owns rendering, form state, data loading, error handling, filtering, and application rules at once:

```tsx
const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  // fetching, filtering, retrying, and rendering all live together
  return <div>{/* large component */}</div>;
};
```

The component may work initially, but the same behavior becomes difficult to reuse in another screen, test without a browser, or change without affecting layout code.

MVVM extracts presentation state and actions into a ViewModel:

```ts
type UsersViewModel = {
  state: {
    users: User[];
    search: string;
    loading: boolean;
    error?: string;
  };
  actions: {
    setSearch: (value: string) => void;
    reload: () => Promise<void>;
  };
};
```

The View renders the state and invokes actions. It does not need to know how users are loaded or how errors are translated.

## The Model

The Model is the application side of the feature. It may include:

- Domain entities and rules.
- Repositories and API clients.
- Application services and use cases.
- Persistence and external integrations.
- Shared application state.

```ts
type UserRepository = {
  findAll: () => Promise<User[]>;
};

const loadUsers = (repository: UserRepository) =>
  repository.findAll();
```

The Model should not know whether a View is a React component, a mobile screen, or a command-line interface. It exposes application capabilities rather than presentation-specific state.

In a layered application, the Model side may use [Repositories](/blog/repository), [Service Layer](/blog/service-layer), [DTOs](/blog/dto), and [Mappers](/blog/mapper). MVVM describes how a feature connects that application side to a View; it does not replace these patterns.

## The View

The View is responsible for presentation and user interaction:

```tsx
type UsersViewProps = {
  model: UsersViewModel;
};

const UsersView = ({ model }: UsersViewProps) => (
  <section>
    <input
      value={model.state.search}
      onChange={(event) => model.actions.setSearch(event.target.value)}
    />

    {model.state.loading && <p>Loading users…</p>}
    {model.state.error && <p role="alert">{model.state.error}</p>}

    <ul>
      {model.state.users.map((user) => (
        <li key={user.id}>{user.displayName}</li>
      ))}
    </ul>
  </section>
);
```

The View binds controls to ViewModel state and commands. It may choose markup, layout, accessibility attributes, and visual states, but it should not own the feature's data-loading workflow.

## The ViewModel

The ViewModel exposes a presentation-oriented interface:

```ts
const createUsersViewModel = (
  repository: UserRepository,
): UsersViewModel => {
  let users: User[] = [];
  let search = '';

  return {
    get state() {
      return {
        users: users.filter((user) =>
          user.displayName.toLowerCase().includes(search.toLowerCase()),
        ),
        search,
        loading: false,
      };
    },
    actions: {
      setSearch(value) {
        search = value;
      },
      async reload() {
        users = await repository.findAll();
      },
    },
  };
};
```

The ViewModel can expose:

- View-ready values.
- Derived values such as filtered lists or button labels.
- Loading, error, and empty states.
- Commands such as `save`, `reload`, or `submit`.
- Validation messages.
- Navigation or dialog intents.

It should not expose the entire repository, database record, or framework internals to the View.

## Observable state and updates

MVVM is commonly associated with data binding: when ViewModel state changes, the View updates. Different frameworks implement this in different ways:

- React uses state and subscriptions to trigger renders.
- Vue uses reactive refs and computed values.
- Angular uses signals, observables, or change detection.
- Mobile frameworks may use observable properties or binding objects.

The mechanism is less important than the contract: the View observes ViewModel state and sends user actions back through ViewModel commands.

With React, a hook can provide the ViewModel behavior:

```tsx
const useUsersViewModel = (repository: UserRepository) => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      setUsers(await repository.findAll());
    } catch {
      setError('Unable to load users');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const visibleUsers = users.filter((user) =>
    user.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  return {
    state: { users: visibleUsers, search, loading, error },
    actions: { setSearch, reload },
  };
};
```

The hook is a framework-specific ViewModel implementation. The View still only renders its state and invokes its actions.

## Commands and user intent

A ViewModel command represents an action the View can request:

```ts
type CheckoutViewModel = {
  state: {
    submitting: boolean;
    error?: string;
  };
  commands: {
    submit: () => Promise<void>;
  };
};
```

The command can validate input, call a service, update state, and expose a result appropriate for the View:

```ts
const createCheckoutViewModel = (checkout: CheckoutService) => {
  let submitting = false;
  let error: string | undefined;

  return {
    get state() {
      return { submitting, error };
    },
    commands: {
      async submit(input: CheckoutInput) {
        submitting = true;
        error = undefined;

        try {
          await checkout.complete(input);
        } catch {
          error = 'Checkout could not be completed';
        } finally {
          submitting = false;
        }
      },
    },
  };
};
```

The ViewModel translates technical failures into presentation-level state. It should not decide the database schema or construct a framework-specific HTTP response.

## Derived state

A ViewModel is a good place for values derived from application state:

```ts
const canSubmit = (
  email: string,
  password: string,
  submitting: boolean,
) => email.includes('@') && password.length >= 12 && !submitting;
```

The View can bind directly to `canSubmit` instead of repeating validation logic in markup. Derived state should be deterministic and cheap, or explicitly memoized when calculation is expensive.

Do not store every derived value as independent mutable state. Duplicated state can become inconsistent:

```ts
// Prefer computing this from items.
const itemCount = items.length;
```

Store a value when it represents independent state or when a deliberate caching strategy makes the tradeoff worthwhile.

## ViewModel and navigation

Navigation can be represented as an intent rather than performed directly inside a View:

```ts
type Navigation = {
  goTo: (path: string) => void;
};

const createProfileViewModel = ({ navigation, save }: Dependencies) => ({
  async saveProfile(input: ProfileInput) {
    const profile = await save(input);
    navigation.goTo(`/profiles/${profile.id}`);
  },
});
```

Whether navigation belongs inside the ViewModel depends on the application. It is useful when the navigation is part of the feature workflow and needs to be tested. Keep the navigation dependency abstract so the ViewModel does not depend on a browser or router implementation directly.

## MVVM and forms

Forms are a natural fit for MVVM because they have presentation state, validation, submission, and error handling:

```ts
type SignInViewModel = {
  state: {
    email: string;
    password: string;
    submitting: boolean;
    error?: string;
  };
  commands: {
    setEmail: (value: string) => void;
    setPassword: (value: string) => void;
    submit: () => Promise<void>;
  };
};
```

The View binds fields to state and events to commands. The ViewModel owns validation and calls the authentication service. This keeps the View declarative and makes submission behavior testable without rendering the form.

Do not put every form concern into a global ViewModel. Form state usually has a local lifetime and should be owned by the screen or workflow that uses it.

## MVVM and asynchronous state

Async state should be modeled explicitly:

```ts
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; value: T }
  | { status: 'error'; message: string };
```

This prevents contradictory flags such as `loading: true` and `error: 'Failed'` being handled inconsistently. The View can render based on the state discriminant:

```tsx
switch (model.state.status) {
  case 'idle':
    return <EmptyState />;
  case 'loading':
    return <Spinner />;
  case 'success':
    return <Results items={model.state.value} />;
  case 'error':
    return <ErrorMessage message={model.state.message} />;
}
```

The ViewModel decides when transitions occur and how technical errors become user-facing messages.

## MVVM versus MVC

MVC and MVVM both separate presentation from application behavior, but their emphasis differs.

In MVC, the Controller receives an event and coordinates the Model and View. In MVVM, the View binds to a ViewModel that exposes state and commands.

| Pattern | Main presentation boundary |
| --- | --- |
| MVC | Controller coordinates input, Model, and View. |
| MVVM | View binds to ViewModel state and commands. |

MVC often fits request-response server applications. MVVM is especially useful for interactive screens with local state, derived values, validation, and asynchronous transitions.

Modern applications can combine them: an HTTP Controller invokes a service, while a client-side MVVM ViewModel consumes the API result and manages screen state.

## Testing ViewModels

ViewModels can be tested without rendering a View:

```ts
it('exposes a filtered user list', () => {
  const model = createUsersViewModel({
    findAll: async () => [
      { id: '1', displayName: 'Ada' },
      { id: '2', displayName: 'Grace' },
    ],
  });

  model.actions.setSearch('grace');

  expect(model.state.users).toEqual([
    { id: '2', displayName: 'Grace' },
  ]);
});
```

Test commands, validation, loading transitions, errors, retries, cancellation, and navigation intents independently from the View. View tests should focus on binding and rendering rather than repeating all workflow tests.

Framework hooks may require a rendering or test utility, but keep the core ViewModel logic framework-independent when that makes the design clearer.

## Common mistakes

### A ViewModel that mirrors the entire domain model

The ViewModel should expose what the View needs, not every field and method available in the domain. A screen-specific representation is often clearer than a universal wrapper.

### Business rules in the ViewModel

Presentation validation and derived labels belong naturally in a ViewModel. Rules that must hold for every caller—such as whether an order may be submitted—belong in the domain or application service.

### Too much state duplication

Storing source data, filtered data, counts, labels, and flags independently increases synchronization work. Keep source state authoritative and derive the rest.

### A global ViewModel for local screen state

Global state can make unrelated screens coupled and make cleanup difficult. Keep state local unless multiple parts of the application genuinely share ownership.

### ViewModel depending directly on UI widgets

A ViewModel should expose state and commands, not query the DOM, manipulate component instances, or assume a particular markup structure.

### Ignoring lifecycle and stale async results

An unmounted screen should not update state, and an earlier request should not overwrite a newer one. Use cancellation, request IDs, or framework-supported lifecycle handling.

### Calling it MVVM because a component has hooks

Hooks or observables alone do not create MVVM. The useful boundary is whether presentation state and commands are intentionally separated from rendering.

## A practical checklist

Before introducing MVVM, ask:

- Does the screen have enough stateful interaction to justify a ViewModel?
- What state should the View observe?
- Which values are derived rather than independently stored?
- Which actions or commands can the View request?
- Which rules belong in the domain or service layer instead?
- How are loading, error, empty, and success states represented?
- What is the ViewModel lifetime and who cleans it up?
- Can its behavior be tested without rendering the View?

## Final thoughts

MVVM gives interactive screens a focused presentation boundary. The View renders state and forwards actions, the ViewModel coordinates presentation behavior, and the Model owns application data and rules.

Use it when a screen has meaningful local state, derived values, asynchronous workflows, or repeated presentation logic. Keep ViewModels screen-focused, keep domain rules below them, model async states explicitly, and expose commands rather than leaking infrastructure into the View.
