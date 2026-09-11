---
title: "Structural and Architectural Patterns: Flux / Unidirectional Data Flow"
description: A practical guide to Flux and unidirectional data flow, including actions, stores, reducers, effects, selectors, and when one-way state updates improve frontend architecture.
date: "2026-09-11"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

Flux is an architectural pattern for managing application state through a one-way flow of data.

The core idea is simple:

```text
View → Action → Dispatcher / Store → New State → View
```

The View does not directly mutate shared state. It dispatches an action describing what happened. A store or reducer applies that action and produces new state. The View observes the updated state and renders again.

This is called unidirectional data flow because state moves through a predictable direction instead of being changed by arbitrary consumers.

## The problem Flux solves

Shared state becomes difficult to reason about when many components can mutate it directly:

```ts
cart.items.push(item);
cart.total += item.price;
header.updateCount(cart.items.length);
checkout.updateTotal(cart.total);
```

The code does not reveal who else depends on `cart`, whether all derived values were updated, or what caused the mutation. Bugs become order-dependent and difficult to reproduce.

Flux replaces direct mutation with a described event:

```ts
dispatch({
  type: 'cart/itemAdded',
  item,
});
```

The store applies the action in one place, and consumers derive their view from the resulting state.

## Actions describe events

An action is a serializable description of something that happened or was requested:

```ts
type CartAction =
  | { type: 'cart/itemAdded'; item: CartItem }
  | { type: 'cart/itemRemoved'; itemId: string }
  | { type: 'cart/cleared' };
```

Actions should describe facts or intentional commands with useful payloads. They should not contain UI objects, database clients, or arbitrary functions when the action needs to be logged, replayed, persisted, or inspected.

```ts
dispatch({
  type: 'cart/itemAdded',
  item: {
    id: product.id,
    name: product.name,
    price: product.price,
  },
});
```

The action is a boundary between an interaction and the state transition that handles it.

## Reducers calculate next state

A reducer is a pure function that receives the current state and an action and returns the next state:

```ts
type CartState = {
  items: CartItem[];
};

const cartReducer = (
  state: CartState,
  action: CartAction,
): CartState => {
  switch (action.type) {
    case 'cart/itemAdded':
      return { items: [...state.items, action.item] };
    case 'cart/itemRemoved':
      return {
        items: state.items.filter((item) => item.id !== action.itemId),
      };
    case 'cart/cleared':
      return { items: [] };
  }
};
```

The reducer does not mutate `state`, call an API, read the DOM, or show a notification. It calculates a new value from explicit inputs.

Pure reducers are easy to test:

```ts
const nextState = cartReducer(
  { items: [] },
  { type: 'cart/itemAdded', item },
);

expect(nextState.items).toEqual([item]);
```

## State is the source of truth

The View should render from state rather than maintain a second independent copy:

```tsx
const CartSummary = ({ state }: { state: CartState }) => (
  <p>{state.items.length} items</p>
);
```

Derived values should usually be calculated from state:

```ts
const selectCartTotal = (state: CartState) =>
  state.items.reduce((total, item) => total + item.price, 0);
```

Avoid storing `items`, `itemCount`, and `total` independently unless there is a strong reason. Duplicated state can become inconsistent when one transition updates only some of the values.

## The store

A store holds state, accepts actions, and notifies subscribers:

```ts
const createStore = <State, Action>(
  reducer: (state: State, action: Action) => State,
  initialState: State,
) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    dispatch(action: Action) {
      state = reducer(state, action);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
```

The store provides a controlled state boundary. In a production implementation, you may also need middleware, batching, error handling, serialization, or development tooling.

Do not assume every piece of state belongs in one global store. Local input state, temporary UI state, and server cache state often have different lifetimes and ownership.

## Dispatching actions

Components dispatch actions in response to user interaction:

```tsx
const AddToCartButton = ({ item, dispatch }: Props) => (
  <button
    onClick={() => dispatch({ type: 'cart/itemAdded', item })}
  >
    Add to cart
  </button>
);
```

The component does not update the cart directly. It reports intent, and the state layer decides how that intent changes the model.

This makes event flow easier to inspect and allows the same action to be dispatched from a button, keyboard shortcut, background event, or test.

## Effects and asynchronous work

Reducers should remain synchronous and pure. API calls, timers, storage, analytics, and navigation belong in effects or action-handling logic:

```ts
type UserAction =
  | { type: 'users/loadRequested' }
  | { type: 'users/loadSucceeded'; users: User[] }
  | { type: 'users/loadFailed'; message: string };

const loadUsers = async (dispatch: (action: UserAction) => void) => {
  dispatch({ type: 'users/loadRequested' });

  try {
    const users = await api.getUsers();
    dispatch({ type: 'users/loadSucceeded', users });
  } catch {
    dispatch({
      type: 'users/loadFailed',
      message: 'Unable to load users',
    });
  }
};
```

The request lifecycle is represented by actions. The reducer owns the state transitions, while the effect owns the external operation.

For complex workflows, put orchestration in an application service or command handler rather than making a reducer understand every integration.

## Modeling async state

A discriminated union keeps loading, success, and failure states consistent:

```ts
type UsersState =
  | { status: 'idle'; users: User[] }
  | { status: 'loading'; users: User[] }
  | { status: 'success'; users: User[] }
  | { status: 'error'; users: User[]; message: string };
```

The reducer can make transitions explicit:

```ts
const usersReducer = (
  state: UsersState,
  action: UserAction,
): UsersState => {
  switch (action.type) {
    case 'users/loadRequested':
      return { status: 'loading', users: state.users };
    case 'users/loadSucceeded':
      return { status: 'success', users: action.users };
    case 'users/loadFailed':
      return { status: 'error', users: state.users, message: action.message };
  }
};
```

The View can render each state without guessing which flags are compatible.

## Selectors keep Views focused

A selector reads or derives a piece of state:

```ts
const selectActiveUsers = (state: UsersState) =>
  state.users.filter((user) => user.active);

const selectUserCountLabel = (state: UsersState) =>
  `${selectActiveUsers(state).length} active users`;
```

Selectors give derived logic a named, testable boundary. They also let the store shape evolve without every View knowing where the data is stored.

For expensive derivations, memoize the selector carefully. Reference-based memoization depends on stable inputs, and stale cache results are possible when the cache key does not represent all dependencies. See [Memoization](/blog/memoization).

## Flux and server state

Not all state has the same ownership.

Client state includes local UI choices, draft input, open panels, and temporary interaction state. Server state comes from a remote source and has freshness, loading, caching, and synchronization concerns.

Putting every server response into a general client store can create manual cache invalidation and duplicate fetching logic. A server-state library or a focused repository/cache boundary may be more appropriate.

Use unidirectional flow where it clarifies ownership. Do not force remote data, form state, URL state, and ephemeral animation state into one global model merely for consistency.

## Flux and event sourcing

Flux actions and event sourcing both represent events, but they are not the same architecture.

In Flux, actions commonly drive an in-memory state transition and may be discarded after processing. In event sourcing, domain events are durable records that form the source of truth and can be replayed to reconstruct state.

```text
Flux action → current application state
Event-sourced event → durable event history → reconstructed state
```

A Flux-style action may be useful for UI state without requiring an event store, durable history, or replay semantics.

## Flux and MVC

MVC lets a Controller coordinate input, Model, and View. Flux emphasizes a single-direction state transition:

```text
MVC:  Controller ↔ Model ↔ View
Flux: View → Action → Store → View
```

The patterns can coexist. An MVC Controller can dispatch an action, and a Flux store can be used by an MVVM ViewModel. The useful distinction is whether the state flow is explicit and one-way, not which label a framework uses.

## Flux and MVVM

MVVM exposes ViewModel state and commands to a View. Flux exposes state transitions through actions and reducers.

| Pattern | Primary abstraction |
| --- | --- |
| MVVM | ViewModel state and commands. |
| Flux | Actions, store state, and reducers. |

MVVM can be natural for screen-focused behavior. Flux can be useful when many parts of an application need to observe and update shared state through a traceable event flow.

They can also be combined: a ViewModel can select data from a Flux store and dispatch actions on behalf of a View.

## Testing unidirectional data flow

Test reducers as pure state-transition functions:

```ts
it('removes an item from the cart', () => {
  const state = cartReducer(
    { items: [{ id: 'item-1', price: 10 }] },
    { type: 'cart/itemRemoved', itemId: 'item-1' },
  );

  expect(state.items).toEqual([]);
});
```

Test selectors against representative states. Test effects by providing fake APIs and asserting the sequence of dispatched actions:

```ts
it('dispatches a successful load', async () => {
  const dispatch = vi.fn();
  await loadUsers(dispatch);

  expect(dispatch).toHaveBeenNthCalledWith(1, {
    type: 'users/loadRequested',
  });
  expect(dispatch).toHaveBeenLastCalledWith({
    type: 'users/loadSucceeded',
    users: expect.any(Array),
  });
});
```

View tests should verify that state is rendered and interactions dispatch the expected actions. Keep reducer tests, effect tests, and component tests focused on their respective responsibilities.

## Common mistakes

### Mutating state in reducers

Mutation can make change detection, history, and testing unreliable. Return new state values or use a carefully controlled immutable update mechanism.

### Dispatching vague actions

Actions such as `{ type: 'update' }` provide little information. Use names that identify the feature and event, such as `cart/itemAdded` or `users/loadFailed`.

### Putting side effects in reducers

Reducers should not fetch, write storage, send analytics, or navigate. Effects and services should perform external work and dispatch the resulting actions.

### One giant global store

A massive store creates coupling and makes ownership unclear. Split state by feature or keep state local when it does not need to be shared.

### Storing all derived data

Duplicating totals, counts, filtered lists, and labels creates synchronization bugs. Prefer selectors and derived values unless there is a measured reason to cache them.

### Ignoring action ordering

Async requests can finish out of order. Include request IDs, cancellation, or version checks when an older response must not overwrite newer state.

### Treating Flux as a library requirement

Flux is a data-flow pattern, not a requirement to install a particular package. Use the smallest implementation that gives the application the desired traceability and ownership.

## A practical checklist

Before introducing unidirectional data flow, ask:

- Which state is shared enough to need a central owner?
- What events or commands can change it?
- Are actions specific and serializable enough to inspect?
- Can reducers remain pure and deterministic?
- Where do effects and asynchronous work live?
- Which values should be selectors rather than stored fields?
- How are stale responses, retries, and cancellation handled?
- Would local state, MVVM, or a simpler service be clearer for this feature?

## Final thoughts

Flux and unidirectional data flow make state changes explicit. Views dispatch actions, reducers or stores calculate new state, selectors derive what consumers need, and Views render the result.

Use the pattern when shared state, many update paths, or difficult-to-trace mutations create real complexity. Keep actions meaningful, reducers pure, effects separate, state scoped to its true owner, and the flow simple enough that a developer can follow one user interaction from event to updated View.
