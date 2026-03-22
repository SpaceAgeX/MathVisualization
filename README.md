# Math Visualizations

A small browser-based collection of interactive math visualizations.

## Included Projects

- `Bezier Curves`
  Manipulate control points and explore smooth parametric curves.

- `Riemann Sum`
  Build functions, apply transformations, approximate area with left/right/midpoint Riemann sums, and view the rectangles on the graph.

- `Encryption`
  Placeholder page for an upcoming encryption visualization.

- `Regressions`
  Placeholder page with shared UI shell. Marked as `Comming Soon`.

## Project Structure

```text
MathVisualization/
|-- index.html
|-- styles.css
|-- palette.css
|-- main.js
|-- Public/
|-- BezierCurves/
|-- Encryption/
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
