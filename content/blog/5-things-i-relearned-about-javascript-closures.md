---
title: "5 Things I Relearned About JavaScript Closures"
description: A compact refresher on JavaScript closures with small examples, practical rules, and common interview traps.
date: "2026-09-30"
category: JavaScript
readingTime: 5 min read
featured: false
published: true
---

Closures are one of those JavaScript topics that feels obvious until a small change in scope, timing, or a loop makes the output surprising.

The definition is simple:

> A closure is a function together with access to the variables from the lexical scope where that function was created.

The useful part is understanding what that means in real code. These are five things I regularly relearn when reviewing JavaScript.

## 1. A closure keeps a binding, not a frozen value

When a function closes over a variable, it does not copy the current value into the function. It keeps access to the variable itself.

    const createCounter = () => {
      let count = 0;

      return () => {
        count += 1;
        return count;
      };
    };

    const counter = createCounter();

    counter(); // 1
    counter(); // 2

The returned function still reaches count after createCounter has finished. The local variable is not destroyed just because the outer function returned.

The important distinction is:

    closure → access to a binding
    snapshot → copied value at one moment

This is why closures are useful for private state, factories, memoization, and callbacks that need to remember context.

You can also see the shared binding directly:

    let message = 'first';

    const readMessage = () => message;

    message = 'second';

    readMessage(); // "second"

The function reads the current value of message, not the value that existed when the function was created.

### Interview trap

Question: “What value does the closure store?”

Better answer: it retains access to the lexical environment. The exact behavior depends on whether the binding is later changed, shadowed, or replaced.

## 2. A loop with var and a loop with let creates different bindings

This is one of the most common closure questions:

    const callbacks = [];

    for (var i = 0; i < 3; i += 1) {
      callbacks.push(() => i);
    }

    callbacks.map((callback) => callback()); // [3, 3, 3]

var is function-scoped. The callbacks close over the same i binding. By the time they run, the loop has finished and i is 3.

With let, JavaScript creates a new binding for each loop iteration:

    const callbacks = [];

    for (let i = 0; i < 3; i += 1) {
      callbacks.push(() => i);
    }

    callbacks.map((callback) => callback()); // [0, 1, 2]

This is not because let magically evaluates the callback earlier. The callbacks still run later. They simply close over different per-iteration bindings.

### Interview trap

Replacing var with let fixes this specific loop behavior, but it does not make every closure problem disappear. A callback can still observe a value that changes later if it closes over a mutable binding outside the loop.

## 3. Closures explain stale state in asynchronous code

A closure can preserve the value from the function call where it was created. That is often useful, but it can also produce stale data.

    const createLogger = (userName) => {
      return () => {
        console.log('Hello, ' + userName);
      };
    };

    const logUser = createLogger('Ada');

    // Later, changing some other userName variable does not update this closure.
    logUser(); // Hello, Ada

In a React component, the same idea appears when an event handler closes over values from a particular render:

    const SearchButton = ({ query }) => {
      const handleClick = () => {
        search(query);
      };

      return <button onClick={handleClick}>Search</button>;
    };

The handler uses the query from the render that created it. React normally creates a new handler on the next render, but long-lived callbacks, timers, subscriptions, and effects can expose stale-closure bugs when dependencies are incomplete.

The fix depends on the desired behavior:

    - include changing values in the dependency list;
    - pass the latest value as an argument;
    - use a functional state update;
    - store mutable instance-like data in a ref when appropriate.

Do not fix every stale closure by making everything mutable. First decide whether the callback should use the value from creation time or the latest value at execution time.

### Interview trap

A closure is not automatically stale. It is stale only when the code expects a newer value but the callback intentionally or accidentally retains an older binding or render snapshot.

## 4. Closures and this are separate concepts

A closure captures lexical variables. It does not capture this in the same general way.

Arrow functions use lexical this:

    const user = {
      name: 'Ada',
      sayName: () => this.name,
    };

This does not make sayName use user as this. The arrow function does not get its own receiver from the object call.

A regular method can receive this from the call site:

    const user = {
      name: 'Ada',
      sayName() {
        return this.name;
      },
    };

    user.sayName(); // "Ada"

But extracting the method changes the call context:

    const sayName = user.sayName;

    sayName(); // undefined in strict mode

The closure may still access variables from its outer scope, but this follows its own rules. When debugging a callback, ask two separate questions:

    What lexical variables did this function close over?
    What is the value of this at the moment it is called?

### Interview trap

“Arrow functions capture this” is a useful shorthand, but the precise statement is that arrow functions do not bind their own this; they resolve it lexically from the surrounding scope.

## 5. A closure can keep data alive longer than expected

Closures are not a memory leak by themselves. They become a memory problem when a long-lived callback retains references to large objects or resources that are no longer needed.

    const createHandler = (largeData) => {
      return () => {
        return largeData.length;
      };
    };

    const handler = createHandler(largeArray);

As long as handler is reachable, the closed-over largeData may remain reachable too. The garbage collector can reclaim objects only when they are no longer reachable from the program.

This matters with:

    event listeners
    timers
    subscriptions
    caches
    queued callbacks
    global registries
    DOM nodes

The practical rule is to clean up the owner of the callback:

    remove event listeners
    clear timers
    unsubscribe from streams
    release references when a cache entry expires
    avoid closing over data larger than the callback needs

In a browser application, an event listener attached to a long-lived element can keep an entire object graph alive if its closure references that graph.

### Interview trap

The correct answer is not “closures cause memory leaks.” The correct answer is that a reachable closure can retain its captured environment, so lifecycle management still matters.

## A compact mental model

When a closure behaves unexpectedly, trace it with four questions:

1. Which lexical bindings can the function access?
2. Does it share those bindings with another callback?
3. When will the callback run, and what values may change before then?
4. How long will the callback remain reachable?

That model explains most closure puzzles without memorizing special cases.

## Final thoughts

The most important closure lessons are small:

    Functions retain access to bindings, not frozen values.
    var and let create different loop behavior.
    Asynchronous callbacks can observe old state.
    Lexical scope and this are different mechanisms.
    Long-lived closures can retain data until they are released.

Closures are not magic storage attached to a function. They are ordinary lexical scope that remains available because another function still needs it. Once that becomes the mental model, the interview puzzles become much less mysterious—and everyday callback code becomes easier to review.

