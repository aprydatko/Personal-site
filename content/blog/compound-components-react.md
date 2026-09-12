---
title: "Compound Components in React: Flexible APIs for Related UI"
description: A practical guide to the React Compound Components pattern, using shared context to coordinate related pieces while keeping the consumer API expressive and composable.
date: "2026-09-12"
category: Frontend
readingTime: 8 min read
featured: false
published: true
---

Some UI components are not really single elements. A tabs interface has a list, triggers, and panels. A disclosure has a button and content. A menu has a trigger, items, and sometimes groups or separators.

One way to build these interfaces is to expose a large component with many configuration props. Another is to let consumers compose the related pieces themselves:

```tsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="overview">Project summary</Tabs.Panel>
  <Tabs.Panel value="activity">Recent activity</Tabs.Panel>
</Tabs>
```

This is the Compound Components pattern. The components work together as one feature, but the consumer controls their composition and layout.

## What are Compound Components?

Compound Components are a group of components that share an implicit relationship and coordinate through a parent component, usually with React Context.

The parent owns shared state and behavior. The child components consume the context they need:

```text
Tabs
├── Tabs.List
├── Tabs.Trigger
└── Tabs.Panel
```

The API communicates structure without forcing one fixed markup layout. `Tabs.Trigger` knows it belongs to a tabs system, but it does not need to receive the selected tab, the setter, and every accessibility attribute as individual props from the page.

## The problem with prop-heavy components

A configurable component often starts like this:

```tsx
<Tabs
  items={items}
  activeId="overview"
  onActiveChange={setActiveId}
  renderTrigger={(item) => <CustomTrigger item={item} />}
  renderPanel={(item) => <CustomPanel item={item} />}
/>
```

This can be appropriate for a data-driven component, but it becomes awkward when consumers need different ordering, custom wrappers, or content that is not naturally represented by one item array.

Compound Components move the structure into JSX. The API becomes more readable and each part gets a focused responsibility.

## A minimal compound API

The parent component can provide shared state through context:

```tsx
type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error('Tabs components must be used inside <Tabs>');
  }

  return context;
};

const Tabs = ({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};
```

The custom hook fails early when a child is rendered outside its parent. That turns a confusing `null` access into a clear development error.

## Child components consume only what they need

The trigger reads the active value and changes it when clicked:

```tsx
const TabsTrigger = ({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) => {
  const tabs = useTabsContext();
  const selected = tabs.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => tabs.setValue(value)}
    >
      {children}
    </button>
  );
};
```

The panel can use the same context without receiving state through several intermediate components:

```tsx
const TabsPanel = ({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) => {
  const tabs = useTabsContext();

  if (tabs.value !== value) return null;

  return (
    <div role="tabpanel" tabIndex={0}>
      {children}
    </div>
  );
};
```

In a production tabs component, the parent and children should also generate matching IDs and connect triggers to panels with `aria-controls` and `aria-labelledby`. The pattern does not replace accessibility work; it gives the related pieces a place to coordinate it.

## Attaching a readable API

A common API style attaches child components to the parent:

```tsx
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Panel = TabsPanel;
```

Consumers can then write `Tabs.Trigger` instead of importing every implementation detail separately. In TypeScript, define the compound component type explicitly when necessary:

```tsx
type TabsComponent = React.FC<TabsProps> & {
  List: typeof TabsList;
  Trigger: typeof TabsTrigger;
  Panel: typeof TabsPanel;
};

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
}) as TabsComponent;
```

`Object.assign` keeps the public API close to the implementation and preserves good autocomplete for consumers.

## Controlled and uncontrolled compound components

Like ordinary form controls, compound components can support both uncontrolled and controlled usage.

Uncontrolled usage lets the component manage its own initial state:

```tsx
<Tabs defaultValue="overview">
  {/* ... */}
</Tabs>
```

Controlled usage lets the parent own the state:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* ... */}
</Tabs>
```

The implementation should avoid switching between modes after initialization. A useful rule is:

```ts
const isControlled = valueProp !== undefined;
const value = isControlled ? valueProp : internalValue;
```

When controlled, the component requests a change through `onValueChange`; the parent decides whether to accept it. This makes the component work inside URL-synchronized state, routers, or larger workflows.

## Context is not a license to hide everything

Context removes prop drilling, but it also hides dependencies. A child that consumes a large context becomes coupled to every value in it and may re-render whenever any value changes.

Keep the context narrow and split it when state changes at different frequencies:

```tsx
type MenuState = { open: boolean };
type MenuActions = { openMenu: () => void; closeMenu: () => void };
```

Separate state and actions can make the contract clearer. For especially large or frequently updated systems, use a selector-based state solution or pass stable props to the parts that need them.

## Validation and child composition

Compound components should validate relationships that are essential to correctness. For example, a `Tabs.Panel` should have a `value`, and a `Tabs.Trigger` should reference a corresponding panel.

Some validation can happen during development:

```tsx
if (process.env.NODE_ENV !== 'production' && !value) {
  throw new Error('<Tabs.Trigger> requires a value prop');
}
```

Avoid making the parent inspect arbitrary children unless the feature truly requires it. A component that depends on child order, clones every child, and injects many props can become more fragile than the prop-based design it replaced.

## Server and Client Components

Interactive Compound Components usually need a Client Component boundary because they use state, context, and event handlers. In the Next.js App Router, keep data fetching and static page structure on the server, then render the interactive compound component where needed:

```tsx
// Server Component
export default async function SettingsPage() {
  const settings = await getSettings();

  return <SettingsTabs settings={settings} />;
}
```

The client-side tabs component can receive serializable settings and manage selection locally. Avoid importing server-only data access into the client module graph.

## Compound Components and composition

The pattern works well with React composition. Consumers can place custom content inside a panel, add wrappers, or create their own small compound child:

```tsx
<Menu>
  <Menu.Trigger>Account</Menu.Trigger>
  <Menu.Content>
    <Menu.Item href="/profile">Profile</Menu.Item>
    <Menu.Separator />
    <LogoutMenuItem />
  </Menu.Content>
</Menu>
```

The parent coordinates open state and keyboard behavior. The consumer decides which items exist and how the menu fits into the surrounding layout.

## When the pattern is a good fit

Use Compound Components when:

- Several UI pieces must share state or keyboard behavior.
- Consumers need control over structure and ordering.
- A fixed list of configuration props would make the API unwieldy.
- The parts have a meaningful relationship, such as trigger/content or list/item.
- You want a readable, declarative component API.

It is especially useful for tabs, accordions, menus, popovers, comboboxes, field groups, and multi-step workflows.

## When not to use it

A single component with a small props interface is often better when:

- There is no shared state between child parts.
- The component is genuinely simple.
- The content is entirely data-driven and has one stable layout.
- Context would hide more information than it removes.
- Consumers do not need to customize the structure.

Do not create a compound API merely because dot notation looks elegant. A pattern is worthwhile when it reduces coupling and improves the consumer experience.

## Common mistakes

### Context without a clear contract

If the context exposes every internal flag and setter, child components become dependent on implementation details. Expose only the state and actions the public parts need.

### Ignoring keyboard behavior

Tabs, menus, and comboboxes need more than click handlers. Implement focus management, keyboard navigation, and appropriate WAI-ARIA relationships—or use a mature accessible primitive as the foundation.

### Allowing invalid child relationships

If a trigger has no matching panel, the interface can become confusing or inaccessible. Decide which relationships are required and make failures easy to diagnose.

### Overusing `cloneElement`

Cloning children to inject hidden props can make types and behavior difficult to follow. Context or explicit child props are often clearer.

### Re-rendering every child unnecessarily

Context updates can re-render all consumers. Keep context values stable where possible and split large contexts when profiling shows a real cost.

## A practical checklist

Before introducing Compound Components, ask:

- Which pieces genuinely share state or behavior?
- What should the parent coordinate?
- What is the smallest useful context contract?
- Which child relationships are required?
- How will keyboard and screen-reader behavior work?
- Should the component support controlled and uncontrolled modes?
- Would a simple component or an established accessible primitive be clearer?

## Final thoughts

Compound Components turn related UI pieces into a small declarative language. The parent owns coordination, the children expose focused roles, and the consumer controls composition.

The pattern is most valuable when a feature has shared state and multiple meaningful parts. Keep the context narrow, treat accessibility as part of the component contract, support controlled usage when external coordination matters, and avoid adding a compound API where ordinary props would be simpler.
