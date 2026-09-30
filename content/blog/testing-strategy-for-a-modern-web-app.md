---
title: Testing Strategy for a Modern Web App
description: How to combine unit, integration, component, end-to-end, visual regression, contract, and smoke tests into a reliable testing strategy.
date: "2026-09-30"
category: Engineering
readingTime: 9 min read
featured: false
published: true
---

A modern web application is too large to protect with one kind of test.

Unit tests are fast but narrow. End-to-end tests prove that real user journeys work but are slower and more fragile. Visual regression tests catch unexpected UI changes, while contract tests protect the boundary between services. Each test type answers a different question.

The goal is not to maximize coverage numbers. The goal is to build a set of fast and trustworthy feedback loops that catch important failures at the right level.

A useful starting point is:

    Unit → Integration → Component → E2E
              ↓          ↓          ↓
          Contract   Visual regression   Smoke

These categories overlap in real projects. A component test may include integration with a router. An E2E test may also be a smoke test when it checks only a critical path. The names matter less than being clear about what each test proves and what it does not.

## The questions a testing strategy should answer

Before choosing tools, define the questions the team needs answered:

    Does this calculation or business rule work for edge cases?
    Do our modules collaborate correctly?
    Does the UI render the right states and respond to user input?
    Can a real user complete the important journeys?
    Did a CSS or component change alter the intended appearance?
    Do independently deployed services still agree on their API?
    Is the deployed application alive and able to serve a critical request?

Each question points to a different test boundary. If one test suite is trying to answer all of them, it will probably become slow, expensive, or difficult to diagnose.

## 1. Unit tests: is this piece of logic correct?

A unit test checks a small piece of behavior in isolation. The unit might be a pure function, a domain service, a parser, a pricing rule, or a state transition.

For example, an order total calculator can be tested without a database, HTTP server, browser, or React:

    describe('calculateOrderTotal', () => {
      it('applies a discount before tax', () => {
        const total = calculateOrderTotal({
          subtotal: 100,
          discount: 10,
          taxRate: 0.2,
        });

        expect(total).toBe(108);
      });
    });

Good unit tests are:

    fast
    deterministic
    focused on one behavior
    easy to diagnose
    independent from network and filesystem state

Unit tests are the best place for business rules that can be expressed without infrastructure. They make edge cases cheap to explore:

    zero values
    rounding
    invalid transitions
    empty collections
    permission rules
    time boundaries
    duplicate input

The most common mistake is testing implementation details instead of behavior. A test that asserts which private helper ran may fail during a harmless refactor while missing a real business regression.

Unit tests are not enough on their own. A collection of correct functions can still be wired together incorrectly, use the wrong database query, or render an unusable interface.

## 2. Integration tests: do our modules collaborate correctly?

An integration test checks multiple real parts of the application working together. It may include a database, queue, filesystem, HTTP handler, or several application modules.

A useful example is a registration flow executed against a test database:

    submit registration request
    → validate input
    → hash password
    → insert user
    → create verification token
    → return response

The test is not trying to prove every internal line. It proves that the important modules agree on data shapes, transactions, error handling, and side effects.

Integration tests are especially valuable around:

    database repositories
    authentication and sessions
    payment adapters
    file uploads
    message queues
    background jobs
    API route handlers
    cache behavior

Use real infrastructure when the infrastructure itself is part of the risk. A repository test that mocks the database client cannot catch a wrong SQL query, an incorrect transaction boundary, or a missing index. A good compromise is to use isolated test resources, such as a temporary database or container, and reset them between tests.

Integration tests cost more than unit tests, so keep them focused on boundaries. Do not rebuild the entire product in every test.

## 3. Component tests: does the UI behave as a user-facing unit?

A component test renders a UI component and interacts with it through user-visible behavior. It is more complete than a unit test for a formatting function but smaller than a full browser journey.

A form component test might:

    render the form
    → enter invalid values
    → submit
    → check field-level messages
    → enter valid values
    → submit
    → check the success state

A useful component test asks what a user can observe:

    Is the button disabled while saving?
    Is the error associated with the correct field?
    Does keyboard navigation work?
    Does a closed dialog stay out of the accessibility tree?
    Is the empty state shown when there are no results?
    Does the component handle a rejected request?

Component tests should use accessible queries and realistic interactions. Prefer selecting a button by its role and name over finding a specific CSS class. This keeps the test aligned with the interface contract.

Component tests are a good place to cover state combinations that are awkward to verify manually:

    loading
    empty
    success
    validation error
    server error
    permission denied
    partial data
    retry available

They should not attempt to prove that the entire application routes correctly or that the production database has the right schema. Those belong to broader test levels.

## 4. End-to-end tests: can a real user complete the journey?

An end-to-end test runs the application through a real browser or browser-like environment. It exercises the system across its major boundaries: routing, frontend code, API handlers, authentication, database, and external integrations.

A critical purchase journey could be:

    open product page
    → add item to cart
    → sign in
    → enter shipping details
    → complete checkout
    → see confirmation

E2E tests provide strong confidence because they test the system as it is actually assembled. They are the closest automated check to a real user experience.

They are also slower and more fragile. A failure can come from the browser, application, test data, network, timing, or an external provider. Keep the suite focused on high-value journeys:

    sign in
    registration
    core creation or editing flow
    checkout or payment
    permissions
    critical search or navigation
    recovery from an important error

Avoid using E2E tests for every validation rule or visual variation. Those cases are cheaper and easier to diagnose at the unit or component level.

A reliable E2E test controls its data. It creates the account, project, or order it needs, uses stable selectors, waits for meaningful application state instead of arbitrary timeouts, and cleans up after itself.

## 5. Visual regression tests: did the interface change visually?

Functional tests can pass while the interface is visibly broken. A button can still submit a form after its text is clipped. A card can still render after its image pushes the layout below the fold. A responsive navigation can still contain all links while covering the content on a small screen.

Visual regression tests compare screenshots against approved baselines. They are useful for:

    design-system components
    navigation and shell layouts
    forms and dialogs
    responsive breakpoints
    marketing pages
    data-dense tables
    loading and empty states

A visual diff is not automatically a bug. Fonts, browser versions, dates, animations, and network-loaded images can create noise. Make screenshots deterministic by freezing time, disabling animations where appropriate, using stable data, and waiting for fonts and images to finish loading.

Visual tests should be selective. A screenshot of every page after every change can create maintenance work instead of confidence. Start with shared components and the pages whose layout is commercially or operationally important.

The key question is:

    Is this visual change intentional?

The test cannot answer that. A developer still needs to review and approve meaningful baseline changes.

## 6. Contract tests: do systems still agree?

A contract test protects an agreement between two separately developed or deployed systems. The consumer expects a particular request and response shape; the provider must continue to satisfy it.

For a frontend and backend, the contract might describe:

    HTTP method and URL
    required parameters
    response fields
    error format
    authentication behavior
    pagination rules
    nullable values

Contract tests are particularly useful for:

    frontend and backend teams working independently
    microservices
    public APIs
    mobile clients
    third-party integrations
    event-driven systems

They catch a different class of problem from integration tests. An integration test may prove that the provider works with its own database. A contract test proves that the provider still returns what the consumer expects.

Keep the contract close to the boundary and make it executable when possible. A generated client or shared schema can help, but shared types alone are not proof that the deployed systems are compatible. The provider must still be checked against the expectations of its consumers.

## 7. Smoke tests: is the deployed system basically alive?

A smoke test is a small, high-signal check that confirms the application is running and a critical path is available. It is often executed after deployment, during health monitoring, or before a larger test suite.

A smoke suite might check:

    the homepage returns a successful response
    the health endpoint reports required dependencies
    a user can load the sign-in page
    an authenticated user can open the dashboard
    a critical API endpoint accepts a valid request
    a deployment can serve static assets

Smoke tests should be short and stable. They are not a replacement for E2E coverage, and they should not try to validate every product rule. Their job is to answer:

    Is this environment usable enough for the next check?

A smoke test that takes twenty minutes or depends on a large collection of test data is no longer a smoke test. Keep it small enough to run frequently.

## How the levels fit together

A balanced strategy usually has more tests at the lower levels and fewer at the expensive levels:

    Many unit tests
    A healthy set of integration and component tests
    A focused set of contract and visual tests
    A small number of critical E2E and smoke tests

This is often called the test pyramid, but modern web applications are not shaped by one perfect diagram. Frontend-heavy products may need many component and visual tests. Distributed systems may need more contract tests. The shape should follow the failure modes of the architecture.

A useful way to assign a test is:

| Risk | Best first boundary |
| --- | --- |
| Business rule is wrong | Unit |
| Repository or module wiring is wrong | Integration |
| User interface state is wrong | Component |
| A critical journey is broken | E2E |
| Layout or styling changed unexpectedly | Visual regression |
| Two systems disagree | Contract |
| Deployment is unavailable | Smoke |

## A practical test workflow

For a new feature, I usually work through the boundaries in this order:

1. Write unit tests for important domain rules.
2. Add integration tests for database, API, or external-service boundaries.
3. Add component tests for loading, success, error, and interaction states.
4. Add or update a contract test if another system consumes the interface.
5. Add a visual regression case for shared or high-risk UI.
6. Add an E2E test only if the feature is part of a critical user journey.
7. Run a smoke test after deployment.

Not every feature needs all seven types. A small internal calculation may need unit tests only. A new checkout flow may need every level because it combines money, permissions, external services, and a high-value user journey.

## What to measure

Coverage percentage is useful as a signal, but it is not a complete quality metric. I also track:

    test duration
    flaky test rate
    time to diagnose failures
    escaped defects
    percentage of critical journeys covered
    mutation or fault-detection results where appropriate
    how often tests are skipped or rewritten during refactoring

A test suite that reports 95% line coverage but fails randomly is not providing 95% confidence. A smaller suite with clear failures and strong boundary coverage may be more valuable.

Tests are part of the architecture. If everything requires an end-to-end browser test, the application may have weak boundaries. If every service is difficult to unit test, its dependencies may be too entangled. Test friction is often useful feedback about design.

## Common mistakes

### Using E2E tests for every behavior

This creates slow feedback and failures that are difficult to locate. Move pure rules and isolated UI states down to cheaper boundaries.

### Mocking every dependency

Mocks can make tests fast, but excessive mocking removes the behavior you actually need to verify. Use real implementations at boundaries where integration risk is high.

### Treating snapshots as visual testing

A serialized component snapshot can show that a render tree changed, but it does not prove that the layout looks correct in a browser. Use screenshot comparison for visual behavior.

### Letting smoke tests become a second E2E suite

Smoke tests should verify availability, not repeat the entire product test plan.

### Ignoring test data

Unstable shared accounts, reused records, current dates, and external services are common causes of flaky tests. Make data explicit, isolated, and repeatable.

### Measuring only coverage

Coverage can show which code was executed, not whether the assertions protected meaningful behavior. Review test quality and failure detection, not only percentages.

## Final thoughts

A modern testing strategy is a collection of deliberate boundaries:

    Unit tests protect logic.
    Integration tests protect collaboration.
    Component tests protect interface behavior.
    E2E tests protect critical journeys.
    Visual regression tests protect appearance.
    Contract tests protect agreements.
    Smoke tests protect deployment confidence.

The best strategy is not the one with the most tests. It is the one that catches important failures early, explains failures clearly, and gives the team confidence to change the system.

Choose the cheapest test that can prove the behavior. Move up to a broader test when the risk is about integration, the browser, deployment, or an independently evolving system. That balance keeps the feedback loop fast without pretending that one level can see everything.

