---
title: "Headless Components in React: Behavior Without a Visual Skin"
description: A practical guide to Headless Components, separating interaction logic and accessibility from visual markup so the same behavior can support many designs.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

Reusable UI often has two different kinds of value. The first is behavior: keyboard navigation, focus management, selection state, positioning, validation, and event handling. The second is presentation: markup, spacing, colors, typography, and visual states.

A Headless Component provides the first without imposing the second. It gives consumers an interaction model and accessibility behavior, while consumers choose the HTML structure and styling.

```text
headless component → state + behavior + accessibility contract
consumer → markup + styling + visual design
```

This makes one behavior adaptable to different products, design systems, and platforms.

## What is a Headless Component?

A headless component has no fixed visual appearance, or only a minimal structural shell. It exposes state, actions, and accessibility props for the consumer to render:

```tsx
const { open, triggerProps, panelProps } = useDisclosure();

return (
  <>
    <button {...triggerProps}>Details</button>
    {open && <div {...panelProps}>Additional information</div>}
  </>
);
```

The hook above is one possible headless API. A headless component can also use a render prop, Compound Components, or a slot-based interface. The defining characteristic is the separation of behavior from visual treatment.

## The problem with opinionated components

A ready-made modal might provide excellent behavior but force a particular card, overlay, and close button design. A team may then override styles, replace internal markup, or fork the component.

That creates a difficult choice:

- Use the component and fight its visual assumptions.
- Rebuild the component and risk missing keyboard, focus, or screen-reader behavior.

A headless primitive addresses both concerns. The behavior can be shared while the presentation remains local to the product or design system.

## A disclosure example

The headless behavior can expose a small model:

```tsx
type DisclosureModel = {
  open: boolean;
  toggle: () => void;
  close: () => void;
  triggerProps: {
    id: string;
    'aria-controls': string;
    'aria-expanded': boolean;
    onClick: () => void;
  };
  panelProps: {
    id: string;
    'aria-labelledby': string;
    hidden: boolean;
  };
};
```

The consumer can render a plain disclosure:

```tsx
const Help = () => {
  const disclosure = useDisclosure();

  return (
    <section>
      <button {...disclosure.triggerProps}>How does delivery work?</button>
      <div {...disclosure.panelProps}>
        Delivery usually takes two business days.
      </div>
    </section>
  );
};
```

The same model can power an animated accordion, a compact mobile layout, or a branded help card. The behavior API remains stable while the markup changes.

## Accessibility is part of the headless contract

Headless does not mean “unstyled and accessibility-free.” A good headless component owns the behavior that must remain consistent:

- Correct roles and ARIA relationships.
- Keyboard navigation and activation.
- Focus movement and restoration.
- Unique IDs connecting related elements.
- Disabled and selected states.
- Escape-key and outside-interaction behavior where appropriate.

The consumer still has responsibilities. It must render the supplied props on suitable elements, preserve semantic structure, provide visible labels, and avoid turning a button into a clickable `div`.

For complex patterns such as menus, dialogs, listboxes, and comboboxes, use the relevant WAI-ARIA pattern as a design constraint. Automated checks help, but keyboard and screen-reader testing are still necessary.

## Render Props as a headless API

A render prop can make the headless model explicit:

```tsx
<Disclosure>
  {({ open, triggerProps, panelProps }) => (
    <div className={open ? 'card card--open' : 'card'}>
      <button {...triggerProps}>Show details</button>
      {!panelProps.hidden && <div {...panelProps}>Details</div>}
    </div>
  )}
</Disclosure>
```

The behavior component controls the contract, while the consumer controls all markup and styling. This is useful when the component needs a lifecycle boundary or when the render model is the main extension point.

## Custom Hooks as headless primitives

For application code, a custom hook is often the lightest headless implementation:

```tsx
const useTabs = (defaultValue: string) => {
  const [value, setValue] = useState(defaultValue);

  return {
    value,
    getTriggerProps: (triggerValue: string) => ({
      'aria-selected': value === triggerValue,
      onClick: () => setValue(triggerValue),
      role: 'tab',
    }),
    getPanelProps: (panelValue: string) => ({
      hidden: value !== panelValue,
      role: 'tabpanel',
    }),
  };
};
```

The hook does not know whether tabs will be rendered as buttons in a horizontal bar, links in a sidebar, or cards in a mobile view. It exposes interaction state and props that the view adapts.

For a library, named getters such as `getTriggerProps` can be useful, but they must return stable, documented contracts. Do not expose every internal event or DOM detail.

## Compound Components and headless design

Headless behavior can use a Compound Components API:

```tsx
<Select value={value} onValueChange={setValue}>
  <Select.Trigger>Choose a role</Select.Trigger>
  <Select.Content>
    <Select.Option value="developer">Developer</Select.Option>
    <Select.Option value="designer">Designer</Select.Option>
  </Select.Content>
</Select>
```

The API is headless when the parts allow consumers to control their markup and visual classes while the parent coordinates selection, focus, and keyboard behavior.

These patterns describe different dimensions:

| Pattern | Main purpose |
| --- | --- |
| Headless Component | Share behavior without prescribing visuals. |
| Compound Components | Compose related parts through a readable API. |
| Custom Hook | Reuse stateful logic without rendering a wrapper. |
| Render Prop | Let a consumer render from a behavior model. |

They can be combined, but combining patterns increases the learning surface. Start with the smallest API that supports the real use case.

## Controlled and uncontrolled headless state

Reusable primitives often support both modes. Uncontrolled usage keeps selection inside the component:

```tsx
<Tabs defaultValue="overview">...</Tabs>
```

Controlled usage lets the parent synchronize selection with a URL, router, or external state:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>...</Tabs>
```

When implementing both, make the contract explicit. The component should never silently switch modes, and `onValueChange` should communicate requested changes rather than pretending it owns a controlled value.

## Styling strategies

Headless components can support styling without owning a visual system:

- Consumers pass `className` or style props.
- State is exposed through data attributes such as `data-open` or `data-highlighted`.
- Render props expose booleans and values for conditional markup.
- Slot props allow class names and attributes on specific parts.
- CSS selectors style state attributes consistently across applications.

Data attributes are especially useful:

```tsx
<button {...triggerProps} data-open={open ? '' : undefined}>
  Details
</button>
```

The consumer can style `[data-open]` without knowing how the component stores state. Keep state attributes semantic and stable; they are part of the styling contract.

## Headless Components and design systems

A design system can layer a visual component on top of a headless primitive:

```tsx
const BrandedDialog = (props: DialogProps) => (
  <Dialog {...props}>
    <Dialog.Overlay className="brand-overlay" />
    <Dialog.Content className="brand-dialog" />
  </Dialog>
);
```

The headless layer provides behavior and accessibility. The branded layer provides defaults for a particular product. This lets the same primitive support several brands without copying focus and keyboard logic.

Keep the two contracts distinct. A branded component can be opinionated; the headless primitive should remain focused on behavior.

## Server and Client Components

Interactive headless primitives use state, effects, event handlers, or browser APIs, so they belong in the Client Component graph in Next.js. A Server Component can still provide static data and render the client primitive at the point of interaction:

```tsx
// Server Component
export default async function FiltersPage() {
  const options = await getFilterOptions();
  return <FiltersClient options={options} />;
}
```

Keep server-only repositories and secrets out of the headless module. The client primitive may manage selection and focus, while secure filtering and authorization remain on the server.

## Testing headless behavior

Test the headless layer as behavior, not as a screenshot. Useful tests include:

- The initial open or selected state.
- Click, keyboard, and Escape interactions.
- Focus movement and restoration.
- Correct ARIA attributes and relationships.
- Controlled state callbacks.
- Disabled and unavailable options.
- Outside interactions and cleanup.
- Stable IDs and state attributes.

Then test one or more visual consumers for correct markup and styling. This avoids repeating all keyboard and state-transition tests for every visual skin.

For accessibility-sensitive primitives, run keyboard tests in a real browser and include automated accessibility checks as one part of the verification strategy.

## Common mistakes

### Calling a component headless because it has few styles

Headless means the consumer controls visual structure and presentation. A lightly styled component with fixed markup is simply a minimally styled component.

### Leaving accessibility to every consumer

If every consumer must recreate focus management and ARIA relationships, the abstraction has not shared the most important behavior. Own the reusable accessibility logic centrally.

### Returning too many implementation details

An API that exposes internal refs, event ordering, and state setters becomes hard to evolve. Return semantic state and commands.

### Using the wrong HTML element

Consumers can misuse flexible APIs. Document the expected element for each prop set and make valid semantic usage the easiest path.

### Overabstracting a simple control

A plain input or button often does not need a headless layer. Introduce one when behavior is complex, repeated, or needs multiple visual implementations.

### Forgetting focus management

Menus, dialogs, popovers, and comboboxes are not accessible just because they have ARIA attributes. Focus behavior is part of the interaction model.

## A practical checklist

Before building a Headless Component, ask:

- Which behavior should be shared independently of visual design?
- What accessibility responsibilities belong in the primitive?
- Should the API be a hook, render prop, compound component, or combination?
- Which elements and props must consumers use correctly?
- Should state be controlled, uncontrolled, or both?
- What stable state attributes or callbacks should be public?
- How will keyboard and focus behavior be tested?
- Would an established accessible primitive already solve this problem?

## Final thoughts

Headless Components separate the hard, reusable parts of interaction from the visible skin of the interface. They let teams build different designs on top of one reliable behavior and accessibility contract.

The best headless APIs are small, semantic, and difficult to misuse. Keep visual decisions with the consumer, keep focus and keyboard behavior with the primitive, support controlled state when external coordination matters, and use a simpler component when the interaction does not justify the abstraction.
