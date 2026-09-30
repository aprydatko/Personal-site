---
title: How I Use AI as a Web Developer Without Losing Control of the Code
description: A practical AI-assisted development workflow for planning, generating, reviewing, testing, refactoring, and manually integrating code.
date: "2026-09-30"
category: Tools
readingTime: 9 min read
featured: true
published: true
---

AI is now part of my development workflow, but it is not the person responsible for the feature.

I use it to explore an approach, remove repetitive typing, find edge cases, and challenge my assumptions. I still decide what the feature means, where it belongs, which trade-offs are acceptable, and what code is allowed into the application.

The difference is important. “Generate a feature for me” treats the model as an owner. My workflow treats it as a fast, well-read collaborator whose work still needs review.

This is what that looks like in practice.

## A real example: adding an optimistic save flow

Imagine I need to add an editable profile form to an existing React application. The requirements are small but not trivial:

```text
Edit a display name and bio
Validate both fields
Show field-level errors
Disable duplicate submissions
Show a success state after saving
Keep the previous values if the request fails
```

The tempting prompt is:

```text
Build this profile form in React.
```

That prompt skips all the information that makes the implementation safe: the existing API contract, the project’s validation library, the design system, the error format, and the boundary between server and client code.

I split the work into six deliberate stages instead.

```text
Plan → Generate a small piece → Review → Test → Refactor → Integrate manually
```

The order matters. It keeps the model’s output close to a decision I have already made.

## 1. Planning comes before prompting

Before asking for code, I write a short implementation note. It does not need to be a formal specification. A few bullets are enough:

```text
Feature: editable profile form

Existing constraints:
- The page is a Server Component.
- The form itself can be a small Client Component.
- API errors use { fieldErrors, message }.
- Validation already uses Zod.
- Buttons and inputs come from the existing UI package.

Decisions:
- Keep form state local.
- Do not add a global store.
- Validate on submit and preserve server errors.
- The submit handler calls the existing updateProfile function.
```

This is where I make the architectural decisions. AI can help me compare alternatives, but it should not silently decide that a local form needs Redux, a new data-fetching library, or a second validation system.

I may ask for a plan at this point, but I ask for analysis rather than implementation:

```text
Given this feature and these project constraints, propose two implementation approaches.
For each one, list the state ownership, failure modes, testing strategy, and files it would touch.
Do not write code yet. Point out anything you need to inspect before making a recommendation.
```

The useful result is not the most elaborate plan. It is a list of assumptions I can confirm or reject.

## 2. Generation happens in small, reviewable slices

Once the plan is clear, I give AI one narrow task. For example, I might provide the existing type and ask for a validation schema:

```text
Create only the Zod schema for this profile form.

Requirements:
- displayName is required and 2–40 characters
- bio is optional and at most 160 characters
- preserve the existing error messages
- do not change any other files

After the code, explain which inputs you considered invalid and what you intentionally did not validate.
```

Then I inspect the result before continuing. If the schema is correct, I can ask for the next slice: a pure submit-state helper, a component, or tests.

Small prompts have two advantages:

1. The context is easier to keep accurate.
2. A wrong answer is cheap to discard.

I also ask the model to respect boundaries explicitly:

```text
Use the existing Button and TextField components. Do not introduce a new abstraction,
dependency, or folder. If the current API does not support this behavior, stop and say so.
```

That last sentence is surprisingly useful. A model that is allowed to invent missing infrastructure will usually do exactly that.

## 3. Review is a separate pass, not a glance

Generated code often looks convincing because it is syntactically complete. I review it in layers.

### First: does it solve the actual problem?

I compare the code with the requirements, not with the prompt. Does it preserve values after a failed request? Does it prevent a double submit? Does it show a server-side field error in the right field?

### Second: does it fit the codebase?

I check imports, naming, folder boundaries, existing patterns, and whether the new code duplicates an existing helper. A locally elegant solution can still be a poor addition if it ignores the project’s conventions.

### Third: what happens at the edges?

I look specifically for:

```text
empty input
very long input
slow requests
double clicks
network failures
unexpected response shapes
unmounted components
keyboard and screen-reader interaction
```

I often run a second prompt against the diff, but I give it a role with a narrow scope:

```text
Review this diff as a skeptical senior engineer.
Do not rewrite it. List only concrete correctness, security, accessibility,
or maintainability risks. For every finding, include a short reproduction or example.
```

I do not treat a clean review as proof that the code is correct. It is just another source of questions.

## 4. Tests are written to the behavior, not the generated implementation

AI is good at producing a first test matrix, but I decide what must be protected. For the profile form, the important cases are:

| Behavior | Expected result |
| --- | --- |
| Valid values | The update function receives normalized data |
| Empty display name | A field error is shown and no request is made |
| Server field error | The error appears beside the matching field |
| Network failure | Values remain editable and a general error is shown |
| Second click while saving | No second request is sent |
| Successful save | The success state is shown and the form is not duplicated |

I can ask AI to turn this table into tests, but I keep the table as the source of truth:

```text
Write tests for these six behaviors using the existing test utilities.
Do not test implementation details such as private state names or exact helper calls.
If a behavior cannot be tested through the rendered form, explain why before changing production code.
```

After generating tests, I run them immediately. A test that passes because it asserts the wrong thing is worse than a missing test; it creates false confidence.

I also ask the model to find missing cases only after I have a working baseline:

```text
Here are the requirements and current tests. Identify behaviors that are still unprotected.
Group them into must-have, useful, and probably unnecessary. Do not add tests yet.
```

This keeps test scope tied to product risk instead of maximizing the number of test files.

## 5. Refactoring comes after behavior is stable

The first implementation is allowed to be ordinary. I prefer a clear 60-line component over a premature form framework, generic async hook, or “reusable” abstraction used once.

Once the tests pass, I look for real duplication and awkward boundaries. This is a good moment to ask AI for options:

```text
The tests pass. Review this implementation for unnecessary complexity.
Suggest at most two refactorings. For each one, explain the problem it solves,
what new coupling it introduces, and how the current tests would protect it.
Do not refactor just to reduce line count.
```

I am especially careful with abstractions suggested by AI. A generic `useAsyncForm` hook may look reusable, but it can hide the exact error and loading behavior that makes this form understandable. Reuse is valuable when it removes a known repetition, not when it predicts an imaginary future.

After each refactor I run the tests again and inspect the diff. Refactoring is not a separate permission to change behavior.

## 6. Manual integration is where I regain ownership

I rarely paste a large generated response into the repository. Instead, I integrate it manually:

1. I create or select the target file myself.
2. I copy only the useful function or small component.
3. I adapt names, imports, types, and error handling to the surrounding code.
4. I remove comments that merely narrate obvious syntax.
5. I inspect the final diff before running the full checks.

Manual integration is not slower in the way it first appears. It forces me to answer basic questions while the change is still small:

```text
Why is this component client-side?
Who owns this state?
What is the actual failure contract?
Why does this dependency exist?
What would I change if the API returned a different error?
```

If I cannot answer those questions, the code is not ready to merge—even if all generated tests pass.

## My final verification loop

Before I consider the feature complete, I run the same checks I would run without AI:

```text
Format and lint
↓
Focused unit and integration tests
↓
Typecheck or production build
↓
Manual browser check
↓
Review the final diff
```

The browser check matters for frontend work. It catches details that unit tests may not: focus movement, disabled states, responsive layout, loading flashes, and error messages that technically exist but are hard to notice.

I also inspect the diff as a story. Does it contain only the feature? Did a generated import change an unrelated file? Did a refactor sneak in while I was fixing a test? A small, understandable diff is one of the best ways to keep AI-assisted work under control.

## What I do not delegate

There are decisions I may ask AI to discuss, but I do not outsource them:

```text
product requirements
architecture and data ownership
security boundaries
permissions and destructive actions
privacy-sensitive data handling
dependency selection
the final code review
```

I also avoid pasting secrets, private customer data, production credentials, or an entire repository into a model. Good prompts are specific enough to provide useful context without exposing information that is not needed for the task.

## The rule that keeps this useful

My rule is simple:

> Use AI to reduce typing and increase the number of questions I can ask—not to remove my responsibility for the answers.

The best workflow is not “AI writes everything” and it is not “never use AI.” It is a controlled loop in which the developer owns the plan, the boundaries, the review, the tests, and the integration.

AI can generate a plausible implementation in seconds. Engineering is still the work of deciding whether that implementation belongs in this codebase, under these constraints, with these failure modes.
