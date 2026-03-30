# Technical Visualizations

A browser-based collection of interactive technical visualizations.

## Overview

Technical Visualization is a collection of interactive modules designed to make complex concepts intuitive through visual and hands-on exploration.

Each project focuses on a specific idea, ranging from mathematics and geometry to physics and computational systems, and turns it into a dynamic, explorable experience. Instead of relying on static formulas or explanations, users can directly interact with the underlying mechanics and observe how changes affect the system in real time.

## What Is Technical Visualization?

Technical Visualization is an ongoing project that brings together concepts from multiple technical fields into a single interactive environment. It is designed to bridge the gap between theory and implementation by emphasizing:

- real-time interaction
- visual intuition
- system-level understanding
- modular, expandable design

Each module acts as both a demonstration and a tool, allowing users to experiment, adjust parameters, and gain a deeper understanding of how the system behaves.

## Included Projects

- `Bezier Curves`
  Manipulate control points and explore smooth parametric curves.

- `Riemann Sum`
  Build functions, apply transformations, approximate area with left/right/midpoint Riemann sums, and view the rectangles on the graph.

- `Encryption`
  Placeholder page for an upcoming encryption visualization.

- `Gear Systems`
  Boilerplate mechanical workspace with tools for placing gears, motors, chains, and weights.

- `Regressions`
  Placeholder page with shared UI shell. Marked as `Comming Soon`.

## Project Structure

```text
TechnicalVisualizations/
|-- index.html
|-- styles.css
|-- palette.css
|-- main.js
|-- Public/
|-- BezierCurves/
|-- Encryption/
|-- GearSystems/
|-- ReimannSum/
`-- Regressions/
```

## Current Focus

The most developed project right now is `ReimannSum/`, which includes:

- parent function selection
- live function-variable sliders
- Riemann sum controls
- rendered rectangles and sample points
- signed/unsigned area handling
- graph zoom controls
- live formula and sum display

## Running Locally

This project is plain HTML, CSS, and JavaScript, so you can run it with any simple local server.

Examples:

```bash
# Python
python -m http.server
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser, but using a local server is usually the cleaner option.

## Notes

- The project intentionally uses simple vanilla web tech.
- `Regressions` is still a scaffold and currently shows a shared `Comming Soon` screen.
- The folder name `ReimannSum` is kept as-is to match the current project structure.
