---
title: "Throttle"
description: How throttling limits how often a function runs during continuous activity, with patterns for scroll, resize, drag events, animation, and async work.
date: "2026-09-11"
category: Functional Programming
readingTime: 6 min read
featured: false
published: true
---

Throttling limits a function so it runs at most once during a chosen time interval.

When a throttled function is called repeatedly, it does not run for every call. It runs according to a fixed schedule, while later calls are either ignored or remembered for a trailing execution.

```ts
const throttle = <Args extends unknown[]>(
  operation: (...args: Args) => void,
  intervalMs: number,
) => {
  let lastRun = 0;

  return (...args: Args) => {
    const now = Date.now();

    if (now - lastRun < intervalMs) return;

    lastRun = now;
    operation(...args);
  };
};

const updateScrollPosition = throttle((position: number) => {
  renderProgress(position);
}, 100);
```

Throttling is useful when intermediate updates still matter, but processing every event would be wasteful. Common examples include scroll tracking, pointer movement, drag interactions, continuous resize updates, and telemetry.

## Throttle versus debounce

Both are higher-order functions that control when another function runs, but their timing goals differ.

| Technique | Behavior | Good for |
| --- | --- | --- |
| Throttle | Run at most once per interval during activity. | Scroll, drag, pointer movement. |
| Debounce | Run after activity pauses. | Search, validation, autosave. |

If a user scrolls for five seconds, throttling can update the interface throughout the scroll. Debouncing would wait until scrolling stops and then run once.

Choose throttle when the application needs periodic progress. Choose debounce when only the settled result matters. See [Debounce](/blog/debounce) for the complementary pattern.

## Leading-edge throttling

The basic implementation is leading-edge throttling: the first call runs immediately, and calls during the interval are ignored.

```ts
const handlePointerMove = throttle((event: PointerEvent) => {
  updatePosition(event.clientX, event.clientY);
}, 50);

canvas.addEventListener('pointermove', handlePointerMove);
```

Immediate response is usually important for drag and pointer interactions. A delay before the first update can make controls feel disconnected from the user's input.

## Trailing-edge throttling

A trailing-edge throttle remembers the latest call during the interval and runs it when the interval ends:

```ts
const createTrailingThrottle = <Args extends unknown[]>(
  operation: (...args: Args) => void,
  intervalMs: number,
) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latestArgs: Args | undefined;

  const run = (...args: Args) => {
    latestArgs = args;

    if (timer) return;

    timer = setTimeout(() => {
      timer = undefined;

      if (latestArgs) {
        const nextArgs = latestArgs;
        latestArgs = undefined;
        operation(...nextArgs);
      }
    }, intervalMs);
  };

  return run;
};
```

Trailing behavior ensures the last value in a burst is not lost. This is useful for resize or drag interactions where the final position should be processed even if it arrived during the interval.

## Leading and trailing together

Many throttle utilities support both edges:

- Run immediately on the first call.
- Limit calls during the interval.
- Run once more with the latest arguments when the interval ends.

This gives quick feedback and preserves the final state, but it also means a short burst may produce two calls. Document that behavior so callers do not assume exactly one call per burst.

## Throttling scroll events

Scroll events can fire frequently, even when the visible result only needs occasional updates:

```ts
const updateReadingProgress = throttle(() => {
  const documentHeight = document.body.scrollHeight - window.innerHeight;
  const progress = documentHeight === 0
    ? 0
    : window.scrollY / documentHeight;

  progressBar.style.transform = `scaleX(${progress})`;
}, 100);

window.addEventListener('scroll', updateReadingProgress, { passive: true });
```

Use a passive listener when the handler does not call `preventDefault`. This tells the browser that scrolling does not need to wait for the handler.

Always remove the same function reference during cleanup:

```ts
window.removeEventListener('scroll', updateReadingProgress);
```

## Throttling resize events

If a layout must update while the window is being resized, throttle recalculation rather than waiting until resizing ends:

```ts
const updateLayout = throttle(() => {
  layoutGrid();
}, 100);

window.addEventListener('resize', updateLayout);
```

If only the final layout matters, debounce may be simpler. If the layout must follow the interaction smoothly, `requestAnimationFrame` can align work with the browser's paint cycle.

## Throttling with `requestAnimationFrame`

For visual updates, a frame-based throttle can be more appropriate than a fixed millisecond interval:

```ts
const createFrameThrottle = <Args extends unknown[]>(
  operation: (...args: Args) => void,
) => {
  let frame: number | undefined;
  let latestArgs: Args | undefined;

  return (...args: Args) => {
    latestArgs = args;

    if (frame !== undefined) return;

    frame = requestAnimationFrame(() => {
      frame = undefined;

      if (latestArgs) {
        const nextArgs = latestArgs;
        latestArgs = undefined;
        operation(...nextArgs);
      }
    });
  };
};
```

This schedules at most one update per animation frame and uses the latest arguments. It is a good fit for pointer movement, drag previews, and visual transforms.

`requestAnimationFrame` is not a universal replacement for time-based throttling. Use a time interval for network requests, analytics, or work that should be limited independently of display refresh rate.

## Cancellation and cleanup

A throttle with trailing behavior may have pending work. Expose cancellation when the owner can disappear:

```ts
type CancelableThrottle<Args extends unknown[]> = {
  (...args: Args): void;
  cancel: () => void;
};

// A complete implementation should clear the timer and latest arguments.
```

Cancel pending callbacks when a component unmounts, a subscription closes, a drag ends, or a route changes. Otherwise, the callback may operate on stale state or retain objects longer than intended.

For a frame throttle, cancellation should call `cancelAnimationFrame` when a frame is pending.

## Throttling asynchronous work

Throttling controls how often an asynchronous operation starts. It does not cancel an operation already in flight:

```ts
const sendPosition = throttle(async (position: Position) => {
  await api.updatePosition(position);
}, 250);
```

If requests can finish out of order, protect the consumer from stale responses or use an abort signal. If the operation must never overlap, track the active promise and decide whether later calls should be dropped, queued, or replace the pending input.

```ts
let requestNumber = 0;

const sync = throttle(async (value: string) => {
  const currentRequest = ++requestNumber;
  const result = await api.sync(value);

  if (currentRequest === requestNumber) {
    showResult(result);
  }
}, 500);
```

The throttle controls start frequency. The request number controls which result is allowed to update the UI.

## Throttling analytics and telemetry

Telemetry can generate a large volume of events. Throttling can limit reports while retaining a representative latest value:

```ts
const reportViewport = createTrailingThrottle((viewport: Viewport) => {
  analytics.track('viewport_changed', viewport);
}, 1000);
```

Choose the policy carefully. For counts, dropping events may make totals inaccurate; batch them instead. For gauges such as position or viewport size, the latest value may be sufficient.

Throttling is not a substitute for a server-side rate limit. Enforce important limits at the boundary that owns the resource as well.

## Throttling and function composition

Throttle is a higher-order wrapper: it accepts an operation and returns a new operation with rate-limiting behavior.

```ts
const normalizePosition = (position: Position) => ({
  x: Math.round(position.x),
  y: Math.round(position.y),
});

const sendPosition = (position: Position) => api.send(normalizePosition(position));
const throttledSendPosition = throttle(sendPosition, 250);
```

This connects to [Function Composition](/blog/function-composition), but timing wrappers add state and lifecycle. Their interval, leading/trailing policy, cancellation, and error behavior are part of the resulting function's contract.

## Common mistakes

### Using debounce for continuous feedback

If the UI must update while the user scrolls, drags, or resizes, a trailing debounce can make it appear frozen until the interaction ends. Use throttle or animation-frame scheduling when periodic updates matter.

### Dropping the final value

A leading-only throttle can lose the last position or size in a burst. Add trailing behavior when the final state must be processed.

### Recreating the throttle wrapper

Each new wrapper has its own timer and state. Create it once for the intended component, subscription, or interaction lifetime.

### Assuming throttling cancels work

Throttling prevents some calls from starting. It does not stop requests, timers, or work that has already begun. Add cancellation or stale-result protection separately.

### Updating layout too often anyway

Throttling reduces frequency but does not make expensive layout work free. Avoid forced synchronous layout, batch reads and writes, and measure the remaining work.

### Choosing an arbitrary interval

A very long interval makes updates visibly stale; a very short one may not reduce enough work. Choose based on the interaction, rendering budget, network cost, and user perception.

## Testing throttled functions

Use fake timers or a controlled clock to test behavior deterministically:

```ts
it('runs at most once per interval', () => {
  vi.useFakeTimers();
  const operation = vi.fn();
  const throttled = createTrailingThrottle(operation, 100);

  throttled('a');
  throttled('b');
  expect(operation).not.toHaveBeenCalled();

  vi.advanceTimersByTime(100);
  expect(operation).toHaveBeenCalledTimes(1);
  expect(operation).toHaveBeenCalledWith('b');
});
```

Test leading and trailing calls separately, cancellation, interval boundaries, cleanup, async overlap, and error behavior when those features matter. Restore real timers after each test.

## A practical checklist

Before throttling an operation, ask:

- Do intermediate updates matter during continuous activity?
- Should the first call run immediately?
- Must the final value run after the interval?
- Would `requestAnimationFrame` fit visual work better?
- Can the wrapper be cancelled during cleanup?
- Do asynchronous calls need stale-result protection or no-overlap behavior?
- Is the interval based on UI responsiveness, CPU cost, network cost, or a rate limit?
- Can the timing and edge behavior be tested with fake timers?

## Final thoughts

Throttling limits a burst of activity to a controlled stream of updates. It is a useful boundary for scroll, resize, drag, pointer, telemetry, and other continuous events where every call is too expensive but waiting until the end is too slow.

Use it with an explicit edge policy, stable lifecycle, and cancellation strategy. Choose frame-based scheduling for visual updates, time-based throttling for resource limits, and debounce when only the settled result matters.
