---
title: "Structural and Architectural Patterns: MVC"
description: A practical guide to Model-View-Controller, how responsibilities flow through the pattern, and how to keep controllers, models, and views cohesive.
date: "2026-09-11"
category: Architecture
readingTime: 7 min read
featured: false
published: true
---

Model-View-Controller, or MVC, separates an application into three cooperating responsibilities:

- The Model represents application data and behavior.
- The View presents information to a user or consumer.
- The Controller receives input and coordinates the response.

The pattern creates a flow between input, application state, and presentation:

```text
Request or user action → Controller → Model
                                      ↓
                                  View / response
```

MVC is not a requirement that every file be named `Model`, `View`, or `Controller`. It is a way to assign responsibility so input handling, application behavior, and presentation do not collapse into one large component.

## The problem MVC solves

Without boundaries, a route or UI component can parse input, query a database, apply business rules, build HTML, and decide error responses all at once:

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.users.findByEmail(body.email);

  if (!user || user.password !== body.password) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  await db.sessions.create({ userId: user.id });
  return Response.json(`<h1>Welcome ${user.name}</h1>`);
}
```

The code is difficult to reuse, test, or change. A different client may need the same login operation with a JSON response instead of HTML.

MVC separates the entry point, application behavior, and presentation:

```ts
const result = await loginService.execute(input);
return loginView.render(result);
```

The Controller adapts input, the Model or service performs the operation, and the View creates the output.

## The Model

The Model represents the state and rules of the application. It can include:

- Domain entities and value objects.
- Repositories and persistence access.
- Application services and use cases.
- Validation and business invariants.
- Queries and commands that change or retrieve state.

The Model is not necessarily one class or one database table. It is the part of the system responsible for understanding and changing application data.

```ts
class Order {
  constructor(
    readonly id: string,
    private status: 'draft' | 'submitted',
  ) {}

  submit() {
    if (this.status !== 'draft') {
      throw new Error('Only draft orders can be submitted');
    }

    this.status = 'submitted';
  }
}
```

The model should not need to know whether the caller is an HTTP request, a background job, or a button click.

In a layered application, the Model area may use [Repositories](/blog/repository), [Services](/blog/service-layer), [DTOs](/blog/dto), and [Mappers](/blog/mapper). MVC is a higher-level arrangement that can contain these more focused patterns.

## The View

The View presents model data in a format appropriate for the consumer:

- An HTML template.
- A React component.
- A JSON response.
- A CLI table.
- An email template.
- A serialized message.

```tsx
type OrderViewProps = {
  order: {
    id: string;
    total: string;
    status: string;
  };
};

const OrderView = ({ order }: OrderViewProps) => (
  <section>
    <h1>Order {order.id}</h1>
    <p>Status: {order.status}</p>
    <p>Total: {order.total}</p>
  </section>
);
```

The View should focus on presentation. It may decide how to format a date or display an empty state, but it should not load unrelated data, authorize a user, or perform a payment.

Views can contain small presentation conditions. If a View becomes responsible for a large workflow, move that behavior into the Model or an application service and pass the result down.

## The Controller

The Controller receives an input event, translates it into an application operation, and selects the output representation:

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const input = parseCreateOrderRequest(body);

  const order = await createOrderService.execute(input);

  return Response.json(order, { status: 201 });
}
```

The controller is an adapter. It knows about HTTP request and response details, but the application service does not need to know about them.

A controller can also handle:

- Authentication context extraction.
- Route parameter parsing.
- Request DTO validation.
- Mapping domain errors to transport errors.
- Choosing a redirect, JSON response, or view.

Keep it thin enough that the workflow can be reused outside the transport layer.

## A complete request flow

Consider a request to publish an article:

```ts
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const actor = await requireAuthenticatedUser(request);

  try {
    const result = await publishArticle.execute({
      articleId: id,
      actorId: actor.id,
    });

    return Response.json(articleToResponse(result));
  } catch (error) {
    return toHttpErrorResponse(error);
  }
}
```

The flow is:

1. The Controller reads transport input and authentication context.
2. The Model-side use case checks permissions and domain rules.
3. Repositories load and save application data.
4. The Mapper creates a response DTO.
5. The Controller returns an HTTP response.

Each step has a reason to change. A new response format should not require rewriting the domain rule that decides whether an article may be published.

## MVC and application services

In small applications, the Controller may call a Repository directly. As workflows grow, an application service provides a useful Model-side boundary:

```ts
const publishArticle = createPublishArticleService({
  articles,
  permissions,
  clock,
});
```

The Controller should not coordinate multiple repositories, transaction rules, events, or external integrations itself. That coordination belongs in a [Service Layer](/blog/service-layer).

MVC does not replace other patterns. It gives them a place in the overall request flow.

## MVC variants

Different frameworks use MVC terms differently.

### Server-rendered MVC

A Controller receives a request, updates or queries the Model, and returns a server-rendered View:

```ts
const page = await dashboardService.load(input);
return render('dashboard', page);
```

### API MVC

The View is often a serializer or response DTO rather than an HTML template:

```ts
return Response.json(toUserResponse(user));
```

### Client-side MVC

A UI event is handled by a Controller-like action, application state changes in a Model or store, and the View re-renders from state.

### MVVM and related patterns

Some frontend frameworks use Model-View-ViewModel, presenter, store, or component architecture instead of classic MVC. The names differ, but the same question remains: where do input handling, state and rules, and presentation belong?

Do not force a framework's component model into a strict textbook MVC diagram if its data flow works differently. Use the underlying responsibility boundaries rather than the labels alone.

## MVC and unidirectional data flow

Modern UI applications often use unidirectional data flow:

```text
User action → Controller/action → state update → View render
```

This can be understood as an MVC variation where the Model or store is the source of truth and the View observes it. The important property is that state changes happen through defined actions rather than arbitrary mutations from every component.

```ts
const onSubmit = async (event: SubmitEvent) => {
  event.preventDefault();
  const result = await createProject.execute(readForm(event));
  projectStore.add(result);
};
```

The View renders `projectStore` state. The action coordinates the input and operation, while the service owns the application workflow.

## Testing MVC boundaries

Test each responsibility at its own level.

Controller tests should verify:

- Request input is parsed and validated.
- The correct service operation is invoked.
- Results and errors become the expected response.

Model or service tests should verify:

- Business rules and workflow sequencing.
- Repository and integration failures.
- Authorization and transaction behavior.

View tests should verify:

- Important data is displayed.
- Loading, empty, and error states render correctly.
- User actions call the expected callback or action.

```ts
it('maps a published article to its response', async () => {
  const service = {
    execute: vi.fn().mockResolvedValue({
      id: 'article-1',
      title: 'Architecture',
    }),
  };

  const response = await createArticleController(service).post(request);

  expect(service.execute).toHaveBeenCalled();
  expect(response.status).toBe(201);
});
```

Do not test the whole application only through controllers. A failing end-to-end test rarely tells you whether parsing, business rules, persistence, or rendering caused the problem.

## Common mistakes

### Fat controllers

A controller that contains queries, business rules, transactions, and formatting is a service with an HTTP dependency. Move application workflow into services and domain behavior into the Model.

### Anemic models with smart views

If Views calculate totals, decide permissions, or mutate shared state, the application becomes difficult to reuse outside that screen. Keep domain decisions out of presentation code.

### One model for every boundary

A database record, domain entity, request DTO, and view model often have different responsibilities. Use [Mappers](/blog/mapper) to translate between them.

### Controllers calling every dependency directly

When a controller coordinates users, orders, payments, events, and notifications, the application operation is not clearly owned. Give the workflow a Service Layer boundary.

### Treating MVC as folder naming

Creating `models`, `views`, and `controllers` directories does not create good architecture. Define ownership of decisions and data flow first.

### Over-abstracting tiny applications

For a small page with one query and one render, a direct route may be clearer than several layers. Introduce MVC boundaries when reuse, complexity, or independent change creates real pressure.

## A practical checklist

Before organizing a feature around MVC, ask:

- What is the input event and who adapts it?
- Which state and business rules belong to the Model side?
- What presentation does the View own?
- Is the Controller coordinating too much workflow?
- Are DTOs and mappers needed between boundaries?
- Can the Model-side operation run without HTTP or UI code?
- Do errors map cleanly to the current transport?
- Would a smaller direct implementation be clearer at this scale?

## Final thoughts

MVC separates input handling, application behavior, and presentation. The Controller adapts an event, the Model owns state and rules, and the View presents the result.

Use the pattern as a responsibility guide rather than a rigid folder structure. Keep controllers focused, keep business rules out of views, use services for meaningful workflows, map data deliberately, and let each layer change for its own reasons.
