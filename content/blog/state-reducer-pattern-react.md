---
title: "State Reducer Pattern in React: Customizable State Transitions"
description: A practical guide to the React State Reducer pattern, letting reusable components own default behavior while consumers customize state transitions safely.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

Reusable components usually need sensible default behavior. A menu opens when its trigger is clicked. A counter increments when its button is pressed. A combobox selects an option when the user chooses one.

Sooner or later, a consumer needs a variation: cap the counter, prevent a menu from closing, add analytics, or keep a panel open after selection. Adding a prop for every variation can make the component API grow without a clear limit.

The State Reducer pattern offers a controlled extension point. The component calculates a proposed state transition, then gives the consumer a chance to modify or replace that transition before it is committed:

```text
event → default reducer → consumer reducer → next state
```

The reusable component owns the normal workflow. The consumer customizes state transitions without copying the entire component.

## What is a State Reducer?

A reducer is a function that receives the current state and an action and returns the next state:

```tsx
type CounterState = { count: number };
type CounterAction = { type: 'increment' } | { type: 'decrement' };

const counterReducer = (
  state: CounterState,
  action: CounterAction,
): CounterState => {
  if (action.type === 'increment') {
    return { count: state.count + 1 };
  }

  return { count: state.count - 1 };
};
```

A State Reducer pattern exposes a reducer override as part of a reusable component's API:

```tsx
type CounterProps = {
  reducer?: (state: CounterState, action: CounterAction) => CounterState;
};
```

The component can use its default reducer unless the consumer supplies a custom one.

## A counter with a reducer extension point

The component owns state and dispatching, while the consumer can customize transitions:

```tsx
const defaultCounterReducer = (
  state: CounterState,
  action: CounterAction,
) => {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
  }
};

const Counter = ({ reducer = defaultCounterReducer }: CounterProps) => {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <div>
      <output>{state.count}</output>
      <button type="button" onClick={() => dispatch({ type: 'decrement' })}>
        −
      </button>
      <button type="button" onClick={() => dispatch({ type: 'increment' })}>
        +
      </button>
    </div>
  );
};
```

A consumer can add a maximum without reimplementing the buttons or state wiring:

```tsx
const cappedCounterReducer = (
  state: CounterState,
  action: CounterAction,
): CounterState => {
  const nextState = defaultCounterReducer(state, action);

  return { count: Math.min(nextState.count, 10) };
};

<Counter reducer={cappedCounterReducer} />;
```

The custom reducer composes with the default behavior and changes only the rule it owns.

## Why not add another prop?

For one variation, a prop may be the clearest solution:

```tsx
<Counter max={10} />
```

But a component with many independent exceptions can accumulate props such as `max`, `preventClose`, `onSelect`, `keepOpen`, `transformValue`, and `customTransition`. The API starts describing every possible policy the original author imagined.

A reducer gives advanced consumers one principled escape hatch. It is especially useful for component libraries where the author cannot predict every product requirement.

Use a named prop when the behavior is part of the common, discoverable API. Use a State Reducer when consumers need to customize transitions in ways that are related but difficult to enumerate.

## Actions are the public language of the component

The reducer contract is only as useful as its actions. Actions should describe meaningful events rather than internal implementation details:

```ts
type MenuAction =
  | { type: 'toggleMenu' }
  | { type: 'itemSelected'; itemId: string }
  | { type: 'escapePressed' };
```

This gives consumers stable extension points. An action like `setInternalFlag` exposes a detail that may change during a refactor.

The state should also be view-ready and focused:

```ts
type MenuState = {
  open: boolean;
  highlightedItemId: string | null;
};
```

Do not expose database records, DOM nodes, or unrelated application state through a component reducer.

## Preserve the default reducer

Most custom reducers should delegate to the default reducer and adjust the result:

```tsx
const analyticsReducer = (
  state: MenuState,
  action: MenuAction,
): MenuState => {
  const nextState = defaultMenuReducer(state, action);

  if (action.type === 'itemSelected') {
    analytics.track('menu_item_selected', { id: action.itemId });
  }

  return nextState;
};
```

For side effects such as analytics, a callback or effect may be more appropriate than a reducer. Reducers should stay pure when possible: same state and action should produce the same next state and no network calls.

The useful customization is usually a state decision:

```tsx
const keepOpenReducer = (state: MenuState, action: MenuAction) => {
  const nextState = defaultMenuReducer(state, action);

  if (action.type === 'itemSelected') {
    return { ...nextState, open: true };
  }

  return nextState;
};
```

## State Reducer and controlled state

These are related but different extension points.

Controlled state lets the parent own the current value:

```tsx
<Counter count={count} onCountChange={setCount} />
```

A State Reducer lets the parent customize how the component calculates its next internal state:

```tsx
<Counter reducer={cappedCounterReducer} />
```

A mature component may support both. In that case, define the precedence clearly:

1. The component creates a proposed next state through its reducer.
2. The controlled-state callback receives the proposed value.
3. The parent decides the value used for the next render.

Do not allow controlled props and internal state to disagree silently. Document which props are controlled, which are initial values, and when callbacks fire.

## A reducer enhancer for logging

Because reducers are functions, they can be decorated:

```tsx
const withLogging = <State, Action>(
  reducer: (state: State, action: Action) => State,
) => (state: State, action: Action): State => {
  const nextState = reducer(state, action);
  console.debug({ action, previousState: state, nextState });
  return nextState;
};
```

This can be useful in development or tests. Keep logging and diagnostics outside production paths when they are noisy or sensitive. Composition should remain easy to inspect; too many reducer enhancers can obscure where a transition came from.

## State Reducers and Compound Components

The State Reducer pattern works well with Compound Components. A parent such as `Menu` can coordinate state, while `Menu.Trigger`, `Menu.Item`, and `Menu.Content` dispatch semantic actions. Consumers can customize the transition policy without changing the child API:

```tsx
<Menu reducer={keepOpenReducer}>
  <Menu.Trigger>Actions</Menu.Trigger>
  <Menu.Content>
    <Menu.Item value="copy">Copy</Menu.Item>
    <Menu.Item value="share">Share</Menu.Item>
  </Menu.Content>
</Menu>
```

This keeps structure and policy separate. The compound children describe the interaction; the reducer controls what happens after it.

## State Reducers and custom hooks

A custom hook can expose the same extension point without rendering a wrapper:

```tsx
const useCounter = ({ reducer = defaultCounterReducer }: CounterProps = {}) => {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return {
    count: state.count,
    increment: () => dispatch({ type: 'increment' }),
    decrement: () => dispatch({ type: 'decrement' }),
  };
};
```

The hook owns state transitions, while the calling component chooses the UI. This is often the best fit for application code. A component-level reducer prop is particularly useful when distributing a reusable UI primitive or when the reducer contract is part of the public component API.

## Server and Client Components

Interactive reducers and `useReducer` belong in a Client Component. In Next.js, a Server Component can fetch serializable initial data and pass it to a client component that owns the reducer:

```tsx
// Server Component
export default async function CartPage() {
  const initialItems = await getCartItems();
  return <CartClient initialItems={initialItems} />;
}
```

Keep server-only repositories, secrets, and authorization logic outside the client reducer. A reducer can shape client state and coordinate UI transitions, but secure business rules must still be enforced in the server-side use case.

## Testing State Reducers

Reducers are unusually easy to test because they should be pure functions:

```tsx
it('caps the counter at ten', () => {
  const state = { count: 10 };

  expect(cappedCounterReducer(state, { type: 'increment' })).toEqual({
    count: 10,
  });
});
```

Test the default reducer and each custom policy independently. Then add a small integration test for the component to verify that the correct actions are dispatched by user interaction.

Useful reducer tests cover:

- Every supported action.
- Boundary values such as empty, first, and last items.
- Unknown or impossible actions.
- Custom transitions that delegate to the default reducer.
- Controlled-state callback behavior.
- Invariants such as “a closed menu has no highlighted item.”

## Common mistakes

### Performing side effects in reducers

Network requests, analytics, and storage writes make transitions harder to test and reason about. Keep reducers pure and trigger effects from commands or effects.

### Exposing unstable internal actions

Actions are part of the extension contract. Name them after user intent and preserve them across internal refactors.

### Replacing the default reducer completely

A custom reducer that copies the entire default reducer will drift as the component evolves. Delegate to the default reducer and adjust only the required transition.

### Combining incompatible policies

Two reducers may each be valid but conflict when composed. Document ordering and make invariant-preserving behavior the component's responsibility.

### Using a reducer for every prop variation

If a behavior is common and easy to understand, expose a direct prop. A reducer is an advanced escape hatch, not a substitute for a discoverable API.

### Trusting client reducers for security

Client state can be changed by the user. Reducers control UI behavior; they do not authorize actions or protect data.

## A practical checklist

Before exposing a State Reducer, ask:

- Is there a real need for consumer-defined state transitions?
- Are the state and action types small and meaningful?
- Can the default reducer remain pure and independently tested?
- Can custom reducers delegate instead of copying implementation?
- Which behavior belongs as a normal prop instead?
- Are controlled-state rules and precedence documented?
- Will reducer composition preserve component invariants?
- Are secure business rules enforced outside the client?

## Final thoughts

The State Reducer pattern gives reusable React components a principled customization point. The component owns the default workflow, while consumers can adjust state transitions without duplicating the component's rendering and event logic.

Keep reducers pure, make actions describe user intent, preserve invariants, and expose direct props for common behavior. Used carefully, a State Reducer makes a component flexible without turning its API into a list of special cases.
