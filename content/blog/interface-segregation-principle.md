---
title: "Interface Segregation Principle: Keep Contracts Focused"
description: A practical TypeScript guide to the Interface Segregation Principle using printers, scanners, and small client-specific interfaces.
date: "2026-09-09"
category: Architecture
readingTime: 5 min read
featured: false
published: true
---

The Interface Segregation Principle, or ISP, says:

> Clients should not be forced to depend on interfaces they do not use.

An interface is a contract. When one interface contains printing, scanning, faxing, and dozens of other operations, simple devices are forced to implement capabilities they do not support.

Small interfaces keep those contracts focused. Each client depends only on the behavior it actually needs.

## The oversized interface problem

Imagine one interface for every office device:

```ts
interface OfficeDevice {
  print(): void;
  scan(): void;
  fax(): void;
}
```

A basic laser printer does not scan or fax. Making it implement this interface leads to empty methods, fake behavior, or runtime errors:

```ts
class LaserPrinter implements OfficeDevice {
  print(): void {
    console.log('Printing document');
  }

  scan(): void {
    throw new Error('Scanning is not supported');
  }

  fax(): void {
    throw new Error('Faxing is not supported');
  }
}
```

The type says that every `OfficeDevice` can print, scan, and fax, but the implementation cannot keep that promise. The interface is too large for the clients and devices using it.

## Split the interface by capability

Instead, define one small interface for each operation:

```ts
interface Printable {
  print(): void;
}

interface Scannable {
  scan(): void;
}

interface Faxable {
  fax(): void;
}
```

Each device now implements only the capabilities it supports:

```ts
class LaserPrinter implements Printable {
  print(): void {
    console.log('Printing document');
  }
}

class Scanner implements Scannable {
  scan(): void {
    console.log('Scanning document');
  }
}

class MultifunctionPrinter implements Printable, Scannable, Faxable {
  print(): void {
    console.log('Printing document');
  }

  scan(): void {
    console.log('Scanning document');
  }

  fax(): void {
    console.log('Sending fax');
  }
}
```

The multifunction printer implements several focused contracts, while the simple devices remain simple.

## Let clients request only what they need

Functions should also depend on the smallest useful interface:

```ts
const printDocument = (device: Printable): void => {
  device.print();
};

const scanDocument = (device: Scannable): void => {
  device.scan();
};
```

Now every compatible device can be passed to the appropriate client:

```ts
const printer = new LaserPrinter();
const scanner = new Scanner();
const mfp = new MultifunctionPrinter();

printDocument(printer);
scanDocument(scanner);
printDocument(mfp);
scanDocument(mfp);
```

`printDocument` does not know or care whether a device can scan or fax. Its dependency is clear: it needs something printable.

## Why smaller interfaces help

### Less unnecessary code

Classes do not need placeholder methods for capabilities they do not support.

### Clearer dependencies

A function accepting `Printable` communicates more than one accepting `OfficeDevice`. The required capability is visible at the call site.

### Easier changes

Adding a new capability, such as copying, does not require changing every existing device. A new `Copyable` interface can be introduced independently.

### Better tests

Tests can use tiny fakes that implement only the operation under test:

```ts
const printable: Printable = {
  print: () => console.log('Test print'),
};

printDocument(printable);
```

## ISP is about clients, not just classes

The right interface boundary depends on how the code is used. Two methods may belong to the same implementation but still be separate contracts if different clients need them.

Avoid splitting interfaces mechanically. Split them when clients have different needs, when implementations support different capabilities, or when changes to one operation should not affect unrelated consumers.

## A useful design question

Ask:

> Does this client use every method in the interface it receives?

If not, the interface may be too broad. Extract the smaller contract that describes the client’s actual requirement.

## Final thoughts

The Interface Segregation Principle keeps abstractions honest. A laser printer should not pretend to be a scanner, and a printing function should not depend on scanning or faxing.

Focused interfaces make code easier to understand, implement, test, and change. When a contract has too many unrelated methods, split it around the capabilities that clients actually use...
