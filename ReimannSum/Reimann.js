const canvas = document.getElementById("riemann-canvas");
const context = canvas.getContext("2d");

const functionSelect = document.getElementById("function-select");
const functionFormula = document.getElementById("function-formula");
const riemannResultFormula = document.getElementById("riemann-result-formula");
const integralAntiderivativeFormula = document.getElementById("integral-antiderivative-formula");
const integralWorkFormula = document.getElementById("integral-work-formula");
const integralResultFormula = document.getElementById("integral-result-formula");
const transformControls = document.getElementById("transform-controls");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const riemannType = document.getElementById("riemann-type");
const rectangleCount = document.getElementById("rectangle-count");
const rectangleCountValue = document.getElementById("rectangle-count-value");
const lowerBoundInput = document.getElementById("lower-bound");
const upperBoundInput = document.getElementById("upper-bound");
const lowerBoundValue = document.getElementById("lower-bound-value");
const upperBoundValue = document.getElementById("upper-bound-value");
const signedAreaInput = document.getElementById("signed-area");
const infoToggle = document.getElementById("info-toggle");
const infoModal = document.getElementById("info-modal");
const infoBackdrop = document.getElementById("info-backdrop");
const infoClose = document.getElementById("info-close");
const themeToggle = document.getElementById("theme-toggle");

const FUNCTION_CONFIGS = {
    linear: {
        parentLabel: "y = x",
        defaults: { a: 1, b: 0 },
        fields: [
            { key: "a", label: "a", step: "0.1" },
            { key: "b", label: "b", step: "0.1" }
        ],
        evaluate(x, params) {
            return params.a * x + params.b;
        }
    },
    quadratic: {
        parentLabel: "y = x^2",
        defaults: { a: 1, b: 0, c: 0 },
        fields: [
            { key: "a", label: "a", step: "0.1" },
            { key: "b", label: "b", step: "0.1" },
            { key: "c", label: "c", step: "0.1" }
        ],
        evaluate(x, params) {
            return params.a * x * x + params.b * x + params.c;
        }
    },
    cubic: {
        parentLabel: "y = x^3",
        defaults: { a: 1, b: 0, c: 0, d: 0 },
        fields: [
            { key: "a", label: "a", step: "0.1" },
            { key: "b", label: "b", step: "0.1" },
            { key: "c", label: "c", step: "0.1" },
            { key: "d", label: "d", step: "0.1" }
        ],
        evaluate(x, params) {
            return params.a * x * x * x + params.b * x * x + params.c * x + params.d;
        }
    },
    quartic: {
        parentLabel: "y = x^4",
        defaults: { a: 1, b: 0, c: 0, d: 0, e: 0 },
        fields: [
            { key: "a", label: "a", step: "0.1" },
            { key: "b", label: "b", step: "0.1" },
            { key: "c", label: "c", step: "0.1" },
            { key: "d", label: "d", step: "0.1" },
            { key: "e", label: "e", step: "0.1" }
        ],
        evaluate(x, params) {
            return (
                params.a * Math.pow(x, 4) +
                params.b * Math.pow(x, 3) +
                params.c * x * x +
                params.d * x +
                params.e
            );
        }
    },
    sine: {
        parentLabel: "y = sin(x)",
        defaults: { a: 1, b: 1, c: 0, d: 0 },
        fields: [
            { key: "a", label: "a", step: "0.1" },
            { key: "b", label: "b", step: "0.1" },
            { key: "c", label: "c", step: "0.1" },
            { key: "d", label: "d", step: "0.1" }
        ],
        evaluate(x, params) {
            return params.a * Math.sin(params.b * x + params.c) + params.d;
        }
    },
    exponential: {
        parentLabel: "y = 2^x",
        defaults: { a: 1, b: 2, c: 0 },
        fields: [
            { key: "a", label: "a", step: "0.1" },
            { key: "b", label: "b", step: "0.1" },
            { key: "c", label: "c", step: "0.1" }
        ],
        evaluate(x, params) {
            return params.a * Math.pow(params.b, x) + params.c;
        }
    }
};

const state = {
    currentFunction: "linear",
    params: {},
    zoomIndex: 0,
    interaction: {
        isPointerDown: false,
        hoverPoint: null
    },
    riemann: {
        type: "left",
        rectangles: 10,
        lowerBound: -5,
        upperBound: 5,
        signedArea: true
    },
    view: {
        xMin: -5,
        xMax: 5,
        yMin: -15,
        yMax: 15
    }
};

const ZOOM_LEVELS = [5, 10, 20, 50];

function getCurrentConfig() {
    return FUNCTION_CONFIGS[state.currentFunction];
}

function resetParamsForCurrentFunction() {
    state.params = { ...getCurrentConfig().defaults };
}

function syncZoomUi() {
    zoomInButton.disabled = state.zoomIndex === 0;
    zoomOutButton.disabled = state.zoomIndex === ZOOM_LEVELS.length - 1;
}

function applyZoomLevel() {
    const halfRange = ZOOM_LEVELS[state.zoomIndex];
    state.view.xMin = -halfRange;
    state.view.xMax = halfRange;
    state.view.yMin = -halfRange * 3;
    state.view.yMax = halfRange * 3;
    state.riemann.lowerBound = clamp(state.riemann.lowerBound, state.view.xMin, state.view.xMax);
    state.riemann.upperBound = clamp(state.riemann.upperBound, state.view.xMin, state.view.xMax);
    if (state.riemann.lowerBound >= state.riemann.upperBound) {
        state.riemann.lowerBound = state.view.xMin;
        state.riemann.upperBound = state.view.xMax;
    }
    syncRiemannUi();
    updateRiemannResult();
    syncZoomUi();
    drawScene();
}

function evaluateFunction(x) {
    const config = getCurrentConfig();
    const { b } = state.params;

    if (state.currentFunction === "exponential" && b <= 0) {
        return Number.NaN;
    }

    return config.evaluate(x, state.params);
}

function calculateRiemannSum(type, rectangleCountValue, lowerBound, upperBound, signedArea, evaluateAtX) {
    // Use this function to calculate and return the value of the Riemann sum.
    // `type` will be "left", "right", or "middle".
    // `rectangleCountValue` is the number of rectangles in the approximation.
    // `lowerBound` and `upperBound` are the interval endpoints.
    // `signedArea` tells you whether areas below the x-axis should stay negative.
    // `evaluateAtX` is a callback for the current function, so you can call evaluateAtX(x).
    
    let sum = 0;
    const width = (upperBound - lowerBound) / rectangleCountValue;

    for (let rectangleIndex = 0; rectangleIndex < rectangleCountValue; rectangleIndex += 1) {
        const leftX = lowerBound + rectangleIndex * width;
        const rightX = leftX + width;
        let sampleX = leftX;

        if (type === "right") {
            sampleX = rightX;
        } else if (type === "middle") {
            sampleX = leftX + width / 2;
        }

        let rectangleArea = evaluateAtX(sampleX) * width;

        if (!signedArea) {
            rectangleArea = Math.abs(rectangleArea);
        }

        sum += rectangleArea;
    }

    return sum;
}

function visualizeRiemannSum(type, rectangleCountValue, lowerBound, upperBound, signedArea, evaluateAtX) {
    const rectangles = [];
    const width = (upperBound - lowerBound) / rectangleCountValue;

    for (let rectangleIndex = 0; rectangleIndex < rectangleCountValue; rectangleIndex += 1) {
        const leftX = lowerBound + rectangleIndex * width;
        const rightX = leftX + width;
        let sampleX = leftX;

        if (type === "right") {
            sampleX = rightX;
        } else if (type === "middle") {
            sampleX = leftX + width / 2;
        }

        if (!signedArea) {
            rectangles.push(Math.abs(evaluateAtX(sampleX)));
        } else {
            rectangles.push(evaluateAtX(sampleX));
        }
    }

    return { width, height: rectangles };
}

function drawRiemannRectangles() {
    const visualization = visualizeRiemannSum(
        state.riemann.type,
        state.riemann.rectangles,
        state.riemann.lowerBound,
        state.riemann.upperBound,
        state.riemann.signedArea,
        evaluateFunction
    );
    const { width, height: heights } = visualization;

    heights.forEach(function (rectangleHeight, index) {
        if (!Number.isFinite(rectangleHeight)) {
            return;
        }

        const leftX = state.riemann.lowerBound + index * width;
        const rightX = leftX + width;
        const topY = rectangleHeight >= 0 ? rectangleHeight : 0;
        const bottomY = rectangleHeight >= 0 ? 0 : rectangleHeight;
        const canvasLeft = toCanvasX(leftX);
        const canvasRight = toCanvasX(rightX);
        const canvasTop = toCanvasY(topY);
        const canvasBottom = toCanvasY(bottomY);
        const rectangleWidth = canvasRight - canvasLeft;
        const rectangleHeightOnCanvas = canvasBottom - canvasTop;
        const isPositive = rectangleHeight >= 0 || !state.riemann.signedArea;
        const fillColor = isPositive ? "rgba(98, 184, 92, 0.28)" : "rgba(206, 81, 81, 0.28)";
        const strokeColor = isPositive ? "rgb(98, 184, 92)" : "rgb(206, 81, 81)";

        context.fillStyle = fillColor;
        context.fillRect(canvasLeft, canvasTop, rectangleWidth, rectangleHeightOnCanvas);

        context.strokeStyle = strokeColor;
        context.lineWidth = 1.5;
        context.strokeRect(canvasLeft, canvasTop, rectangleWidth, rectangleHeightOnCanvas);
    });
}

function drawRiemannMarkers() {
    const visualization = visualizeRiemannSum(
        state.riemann.type,
        state.riemann.rectangles,
        state.riemann.lowerBound,
        state.riemann.upperBound,
        state.riemann.signedArea,
        evaluateFunction
    );
    const { width, height: heights } = visualization;
    const markerTop = toCanvasY(0) - 16;
    const markerBottom = toCanvasY(0) + 16;

    context.strokeStyle = getCssVar("--axis-color");
    context.lineWidth = 2;

    [state.riemann.lowerBound, state.riemann.upperBound].forEach(function (boundX) {
        const canvasX = toCanvasX(boundX);
        context.beginPath();
        context.moveTo(canvasX, markerTop);
        context.lineTo(canvasX, markerBottom);
        context.stroke();
    });

    heights.forEach(function (rectangleHeight, index) {
        if (!Number.isFinite(rectangleHeight)) {
            return;
        }

        const leftX = state.riemann.lowerBound + index * width;
        let sampleX = leftX;

        if (state.riemann.type === "right") {
            sampleX = leftX + width;
        } else if (state.riemann.type === "middle") {
            sampleX = leftX + width / 2;
        }

        const sampleY = evaluateFunction(sampleX);

        if (!Number.isFinite(sampleY)) {
            return;
        }

        const isPositive = sampleY >= 0 || !state.riemann.signedArea;
        context.fillStyle = isPositive ? "rgb(98, 184, 92)" : "rgb(206, 81, 81)";
        context.beginPath();
        context.arc(toCanvasX(sampleX), toCanvasY(sampleY), 4, 0, Math.PI * 2);
        context.fill();
    });
}

function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    drawScene();
}

function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function toCanvasX(x) {
    const width = canvas.clientWidth;
    const { xMin, xMax } = state.view;
    return ((x - xMin) / (xMax - xMin)) * width;
}

function toCanvasY(y) {
    const height = canvas.clientHeight;
    const { yMin, yMax } = state.view;
    return height - ((y - yMin) / (yMax - yMin)) * height;
}

function getGridStep(rangeSize) {
    if (rangeSize <= 10) {
        return 1;
    }

    if (rangeSize <= 20) {
        return 2;
    }

    if (rangeSize <= 40) {
        return 5;
    }

    if (rangeSize <= 100) {
        return 10;
    }

    return 20;
}

function fromCanvasX(canvasX) {
    const width = canvas.clientWidth;
    const { xMin, xMax } = state.view;
    return xMin + (canvasX / width) * (xMax - xMin);
}

function drawGrid() {
    const gridColor = getCssVar("--grid-color");
    const axisColor = getCssVar("--axis-color");
    const textColor = getCssVar("--muted-text");
    const xStep = getGridStep(state.view.xMax - state.view.xMin);
    const yStep = getGridStep(state.view.yMax - state.view.yMin);

    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.lineWidth = 1;
    context.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';

    const xStart = Math.ceil(state.view.xMin / xStep) * xStep;

    for (let x = xStart; x <= state.view.xMax; x += xStep) {
        const canvasX = toCanvasX(x);

        context.beginPath();
        context.moveTo(canvasX, 0);
        context.lineTo(canvasX, canvas.clientHeight);
        context.strokeStyle = x === 0 ? axisColor : gridColor;
        context.lineWidth = x === 0 ? 2 : 1;
        context.stroke();

        if (x !== 0) {
            context.fillStyle = textColor;
            context.fillText(String(x), canvasX + 4, toCanvasY(0) - 6);
        }
    }

    const yStart = Math.ceil(state.view.yMin / yStep) * yStep;

    for (let y = yStart; y <= state.view.yMax; y += yStep) {
        const canvasY = toCanvasY(y);

        context.beginPath();
        context.moveTo(0, canvasY);
        context.lineTo(canvas.clientWidth, canvasY);
        context.strokeStyle = y === 0 ? axisColor : gridColor;
        context.lineWidth = y === 0 ? 2 : 1;
        context.stroke();

        if (y !== 0) {
            context.fillStyle = textColor;
            context.fillText(String(y), toCanvasX(0) + 6, canvasY - 6);
        }
    }
}

function drawAxesLabels() {
    const textColor = getCssVar("--text-color");

    context.fillStyle = textColor;
    context.font = 'bold 14px "Trebuchet MS", "Segoe UI", sans-serif';

    context.fillText("x", canvas.clientWidth - 18, toCanvasY(0) - 8);
    context.fillText("y", toCanvasX(0) + 8, 18);
}

function drawFunctionCurve() {
    const accent = getCssVar("--tool-accent");
    const step = (state.view.xMax - state.view.xMin) / 600;
    let started = false;

    context.beginPath();
    context.lineWidth = 3;
    context.strokeStyle = accent;

    for (let x = state.view.xMin; x <= state.view.xMax; x += step) {
        const y = evaluateFunction(x);

        if (!Number.isFinite(y)) {
            started = false;
            continue;
        }

        const canvasX = toCanvasX(x);
        const canvasY = toCanvasY(y);

        if (!started) {
            context.moveTo(canvasX, canvasY);
            started = true;
        } else {
            context.lineTo(canvasX, canvasY);
        }
    }

    context.stroke();
}

function drawHoveredPoint() {
    if (!state.interaction.hoverPoint) {
        return;
    }

    const accent = getCssVar("--tool-accent");
    const textColor = getCssVar("--text-color");
    const point = state.interaction.hoverPoint;
    const canvasX = toCanvasX(point.x);
    const canvasY = toCanvasY(point.y);
    const label = `(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`;
    const paddingX = 8;
    const labelHeight = 24;
    const labelWidth = Math.max(78, context.measureText(label).width + paddingX * 2);
    const labelX = Math.min(canvas.clientWidth - labelWidth - 8, canvasX + 12);
    const labelY = Math.max(8, canvasY - 34);

    context.fillStyle = accent;
    context.beginPath();
    context.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(23, 32, 56, 0.88)";
    context.fillRect(labelX, labelY, labelWidth, labelHeight);

    context.strokeStyle = accent;
    context.lineWidth = 1;
    context.strokeRect(labelX, labelY, labelWidth, labelHeight);

    context.fillStyle = textColor;
    context.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';
    context.fillText(label, labelX + paddingX, labelY + 16);
}

function drawScene() {
    drawGrid();
    drawRiemannRectangles();
    drawRiemannMarkers();
    drawAxesLabels();
    drawFunctionCurve();
    drawHoveredPoint();
}

function openInfoModal() {
    infoModal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeInfoModal() {
    infoModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function syncThemeUi() {
    const isLightMode = document.body.classList.contains("light-mode");
    themeToggle.textContent = isLightMode ? "Dark" : "Light";
    themeToggle.setAttribute(
        "aria-label",
        isLightMode ? "Switch to dark mode" : "Switch to light mode"
    );
    drawScene();
}

function parseInputValue(rawValue, fallbackValue) {
    if (rawValue.trim() === "") {
        return fallbackValue;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function formatCoefficient(value) {
    return Number(value).toFixed(1);
}

function formatFormulaNumber(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatResultNumber(value) {
    const rounded = Math.round(value * 1000) / 1000;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatIntegralResultNumber(value) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function wrapDisplayMath(expression) {
    return `\\[ ${expression} \\]`;
}

function typesetMath(elements) {
    if (!window.MathJax || !window.MathJax.typesetPromise) {
        return;
    }

    if (window.MathJax.typesetClear) {
        window.MathJax.typesetClear(elements);
    }

    window.MathJax.typesetPromise(elements).catch(function (error) {
        console.error("MathJax typeset failed:", error);
    });
}

function isZero(value) {
    return Math.abs(value) < 0.0001;
}

function buildPolynomialFormula(terms) {
    return buildNamedPolynomialFormula("f(x)", terms);
}

function buildNamedPolynomialFormula(label, terms) {
    const visibleTerms = terms.filter(function (term) {
        return !isZero(term.coefficient);
    });

    if (visibleTerms.length === 0) {
        return `${label} = 0`;
    }

    const formattedTerms = visibleTerms.map(function (term, index) {
        const absCoefficient = Math.abs(term.coefficient);
        const sign = term.coefficient < 0 ? (index === 0 ? "-" : " - ") : (index === 0 ? "" : " + ");
        const coefficientText = term.hideOne && Math.abs(absCoefficient - 1) < 0.0001
            ? ""
            : formatFormulaNumber(absCoefficient);

        return `${sign}${coefficientText}${term.body}`;
    });

    return `${label} = ${formattedTerms.join("")}`;
}

function buildConstantFormula(value) {
    return buildNamedConstantFormula("f(x)", value);
}

function buildNamedConstantFormula(label, value) {
    return `${label} = ${formatFormulaNumber(value)}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function parseBoundValue(rawValue, fallbackValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
        return fallbackValue;
    }

    return clamp(parsed, state.view.xMin, state.view.xMax);
}

function getRiemannIndexMarkup() {
    switch (state.riemann.type) {
        case "left":
            return "i = 0";
        case "right":
            return "i = 1";
        case "middle":
            return "i = 0";
        default:
            return "i = 0";
    }
}

function getFunctionFormulaMarkup() {
    const params = state.params;

    switch (state.currentFunction) {
        case "linear":
            return buildPolynomialFormula([
                { coefficient: params.a, body: "x", hideOne: true },
                { coefficient: params.b, body: "", hideOne: false }
            ]);
        case "quadratic":
            return buildPolynomialFormula([
                { coefficient: params.a, body: "x^{2}", hideOne: true },
                { coefficient: params.b, body: "x", hideOne: true },
                { coefficient: params.c, body: "", hideOne: false }
            ]);
        case "cubic":
            return buildPolynomialFormula([
                { coefficient: params.a, body: "x^{3}", hideOne: true },
                { coefficient: params.b, body: "x^{2}", hideOne: true },
                { coefficient: params.c, body: "x", hideOne: true },
                { coefficient: params.d, body: "", hideOne: false }
            ]);
        case "quartic":
            return buildPolynomialFormula([
                { coefficient: params.a, body: "x^{4}", hideOne: true },
                { coefficient: params.b, body: "x^{3}", hideOne: true },
                { coefficient: params.c, body: "x^{2}", hideOne: true },
                { coefficient: params.d, body: "x", hideOne: true },
                { coefficient: params.e, body: "", hideOne: false }
            ]);
        case "sine":
            if (isZero(params.a)) {
                return buildConstantFormula(params.d);
            }

            return buildPolynomialFormula([
                {
                    coefficient: params.a,
                    body: `\\sin(${formatFormulaNumber(params.b)}x ${params.c < 0 ? "-" : "+"} ${formatFormulaNumber(Math.abs(params.c))})`,
                    hideOne: true
                },
                { coefficient: params.d, body: "", hideOne: false }
            ]);
        case "exponential":
            if (isZero(params.a)) {
                return buildConstantFormula(params.c);
            }

            return buildPolynomialFormula([
                {
                    coefficient: params.a,
                    body: `\\left(${formatFormulaNumber(params.b)}\\right)^{x}`,
                    hideOne: true
                },
                { coefficient: params.c, body: "", hideOne: false }
            ]);
        default:
            return "f(x) = x";
    }
}

function updateFunctionFormula() {
    functionFormula.innerHTML = wrapDisplayMath(getFunctionFormulaMarkup());
    typesetMath([functionFormula]);
}

function getIntegralNotationMarkup() {
    return `\\int_{${formatFormulaNumber(state.riemann.lowerBound)}}^{${formatFormulaNumber(state.riemann.upperBound)}} f(x)\\,dx`;
}

function getAntiderivativeDefinition() {
    const params = state.params;

    switch (state.currentFunction) {
        case "linear":
            return {
                formula: buildNamedPolynomialFormula("F(x)", [
                    { coefficient: params.a / 2, body: "x^{2}", hideOne: true },
                    { coefficient: params.b, body: "x", hideOne: true }
                ]),
                evaluate(x) {
                    return (params.a / 2) * x * x + params.b * x;
                }
            };
        case "quadratic":
            return {
                formula: buildNamedPolynomialFormula("F(x)", [
                    { coefficient: params.a / 3, body: "x^{3}", hideOne: true },
                    { coefficient: params.b / 2, body: "x^{2}", hideOne: true },
                    { coefficient: params.c, body: "x", hideOne: true }
                ]),
                evaluate(x) {
                    return (params.a / 3) * x * x * x + (params.b / 2) * x * x + params.c * x;
                }
            };
        case "cubic":
            return {
                formula: buildNamedPolynomialFormula("F(x)", [
                    { coefficient: params.a / 4, body: "x^{4}", hideOne: true },
                    { coefficient: params.b / 3, body: "x^{3}", hideOne: true },
                    { coefficient: params.c / 2, body: "x^{2}", hideOne: true },
                    { coefficient: params.d, body: "x", hideOne: true }
                ]),
                evaluate(x) {
                    return (
                        (params.a / 4) * Math.pow(x, 4) +
                        (params.b / 3) * Math.pow(x, 3) +
                        (params.c / 2) * x * x +
                        params.d * x
                    );
                }
            };
        case "quartic":
            return {
                formula: buildNamedPolynomialFormula("F(x)", [
                    { coefficient: params.a / 5, body: "x^{5}", hideOne: true },
                    { coefficient: params.b / 4, body: "x^{4}", hideOne: true },
                    { coefficient: params.c / 3, body: "x^{3}", hideOne: true },
                    { coefficient: params.d / 2, body: "x^{2}", hideOne: true },
                    { coefficient: params.e, body: "x", hideOne: true }
                ]),
                evaluate(x) {
                    return (
                        (params.a / 5) * Math.pow(x, 5) +
                        (params.b / 4) * Math.pow(x, 4) +
                        (params.c / 3) * Math.pow(x, 3) +
                        (params.d / 2) * x * x +
                        params.e * x
                    );
                }
            };
        case "sine":
            if (isZero(params.b)) {
                const constantValue = params.a * Math.sin(params.c) + params.d;
                return {
                    formula: buildNamedPolynomialFormula("F(x)", [
                        { coefficient: constantValue, body: "x", hideOne: true }
                    ]),
                    evaluate(x) {
                        return constantValue * x;
                    }
                };
            }

            return {
                formula: buildNamedPolynomialFormula("F(x)", [
                    {
                        coefficient: -params.a / params.b,
                        body: `\\cos(${formatFormulaNumber(params.b)}x ${params.c < 0 ? "-" : "+"} ${formatFormulaNumber(Math.abs(params.c))})`,
                        hideOne: true
                    },
                    { coefficient: params.d, body: "x", hideOne: true }
                ]),
                evaluate(x) {
                    return (-params.a / params.b) * Math.cos(params.b * x + params.c) + params.d * x;
                }
            };
        case "exponential":
            if (params.b <= 0) {
                return {
                    formula: "F(x) = \\mathrm{undefined\\ for\\ this\\ base}",
                    evaluate() {
                        return Number.NaN;
                    }
                };
            }

            if (Math.abs(params.b - 1) < 0.0001) {
                return {
                    formula: buildNamedPolynomialFormula("F(x)", [
                        { coefficient: params.a + params.c, body: "x", hideOne: true }
                    ]),
                    evaluate(x) {
                        return (params.a + params.c) * x;
                    }
                };
            }

            return {
                formula: buildNamedPolynomialFormula("F(x)", [
                    {
                        coefficient: params.a / Math.log(params.b),
                        body: `${formatFormulaNumber(params.b)}^{x}`,
                        hideOne: true
                    },
                    { coefficient: params.c, body: "x", hideOne: true }
                ]),
                evaluate(x) {
                    return (params.a * Math.pow(params.b, x)) / Math.log(params.b) + params.c * x;
                }
            };
        default:
            return {
                formula: "F(x) = \\frac{x^{2}}{2}",
                evaluate(x) {
                    return (x * x) / 2;
                }
            };
    }
}

function updateIntegralResult() {
    const antiderivative = getAntiderivativeDefinition();
    const lowerValue = antiderivative.evaluate(state.riemann.lowerBound);
    const upperValue = antiderivative.evaluate(state.riemann.upperBound);
    const definiteIntegral = upperValue - lowerValue;
    const integralMarkup = getIntegralNotationMarkup();

    const antiderivativeExpression = antiderivative.formula.includes("\\mathrm{undefined")
        ? antiderivative.formula
        : `${antiderivative.formula} + C`;

    integralAntiderivativeFormula.innerHTML = wrapDisplayMath(antiderivativeExpression);

    if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue) || !Number.isFinite(definiteIntegral)) {
        integralWorkFormula.innerHTML = wrapDisplayMath(`F(${formatFormulaNumber(state.riemann.upperBound)}) - F(${formatFormulaNumber(state.riemann.lowerBound)}) = ${integralMarkup}`);
        integralResultFormula.innerHTML = wrapDisplayMath(`${integralMarkup} = \\mathrm{Undefined}`);
        typesetMath([integralAntiderivativeFormula, integralWorkFormula, integralResultFormula]);
        return;
    }

    integralWorkFormula.innerHTML =
        wrapDisplayMath(`F(${formatFormulaNumber(state.riemann.upperBound)}) - F(${formatFormulaNumber(state.riemann.lowerBound)}) = ${integralMarkup} = ${formatIntegralResultNumber(upperValue)} - (${formatIntegralResultNumber(lowerValue)})`);
    integralResultFormula.innerHTML = wrapDisplayMath(`${integralMarkup} = ${formatIntegralResultNumber(definiteIntegral)}`);
    typesetMath([integralAntiderivativeFormula, integralWorkFormula, integralResultFormula]);
}

function updateRiemannResult() {
    const sum = calculateRiemannSum(
        state.riemann.type,
        state.riemann.rectangles,
        state.riemann.lowerBound,
        state.riemann.upperBound,
        state.riemann.signedArea,
        evaluateFunction
    );

    const formattedSum = Number.isFinite(sum) ? formatResultNumber(sum) : "Undefined";
    const upperIndex = state.riemann.type === "right"
        ? state.riemann.rectangles
        : state.riemann.rectangles - 1;
    riemannResultFormula.innerHTML = wrapDisplayMath(`\\sum_{${getRiemannIndexMarkup()}}^{${upperIndex}} f(x_i)\\Delta x = ${formattedSum}`);
    typesetMath([riemannResultFormula]);
    updateIntegralResult();
}

function buildTransformField(field) {
    const wrapper = document.createElement("div");
    wrapper.className = "transform-field";

    const label = document.createElement("label");
    label.setAttribute("for", `transform-${field.key}`);
    label.textContent = field.label;

    const valueText = document.createElement("div");
    valueText.className = "transform-value";
    valueText.textContent = formatCoefficient(state.params[field.key]);

    const input = document.createElement("input");
    input.id = `transform-${field.key}`;
    input.name = field.key;
    input.type = "range";
    input.min = "-10";
    input.max = "10";
    input.step = field.step;
    input.value = String(state.params[field.key]);

    input.addEventListener("input", function () {
        state.params[field.key] = parseInputValue(input.value, getCurrentConfig().defaults[field.key]);
        valueText.textContent = formatCoefficient(state.params[field.key]);
        updateFunctionFormula();
        updateRiemannResult();
        drawScene();
    });

    wrapper.append(label, valueText, input);
    return wrapper;
}

function renderTransformControls() {
    const config = getCurrentConfig();
    transformControls.innerHTML = "";
    updateFunctionFormula();

    config.fields.forEach(function (field) {
        transformControls.append(buildTransformField(field));
    });

    const hint = document.createElement("p");
    hint.className = "transform-hint";
    hint.textContent = "Move the sliders to update the graph.";
    transformControls.append(hint);
}

function syncRiemannUi() {
    riemannType.value = state.riemann.type;
    rectangleCount.value = String(state.riemann.rectangles);
    rectangleCountValue.textContent = String(state.riemann.rectangles);
    lowerBoundInput.min = String(state.view.xMin);
    lowerBoundInput.max = String(state.view.xMax);
    upperBoundInput.min = String(state.view.xMin);
    upperBoundInput.max = String(state.view.xMax);
    lowerBoundInput.value = state.riemann.lowerBound.toFixed(1);
    upperBoundInput.value = state.riemann.upperBound.toFixed(1);
    lowerBoundValue.textContent = state.riemann.lowerBound.toFixed(1);
    upperBoundValue.textContent = state.riemann.upperBound.toFixed(1);
    signedAreaInput.checked = state.riemann.signedArea;
}

function updateHoverPointFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = clamp(event.clientX - rect.left, 0, rect.width);
    const x = fromCanvasX(canvasX);
    const y = evaluateFunction(x);

    if (!Number.isFinite(y)) {
        state.interaction.hoverPoint = null;
    } else {
        state.interaction.hoverPoint = { x, y };
    }

    drawScene();
}

function clearHoverPoint() {
    state.interaction.hoverPoint = null;
    drawScene();
}

function setCurrentFunction(nextFunction) {
    state.currentFunction = nextFunction;
    resetParamsForCurrentFunction();
    renderTransformControls();
    updateRiemannResult();
    drawScene();
}

functionSelect.addEventListener("change", function () {
    setCurrentFunction(functionSelect.value);
});

zoomInButton.addEventListener("click", function () {
    if (state.zoomIndex === 0) {
        return;
    }

    state.zoomIndex -= 1;
    applyZoomLevel();
});

zoomOutButton.addEventListener("click", function () {
    if (state.zoomIndex === ZOOM_LEVELS.length - 1) {
        return;
    }

    state.zoomIndex += 1;
    applyZoomLevel();
});

riemannType.addEventListener("change", function () {
    state.riemann.type = riemannType.value;
    updateRiemannResult();
    drawScene();
});

rectangleCount.addEventListener("input", function () {
    state.riemann.rectangles = Number(rectangleCount.value);
    rectangleCountValue.textContent = rectangleCount.value;
    updateRiemannResult();
    drawScene();
});

lowerBoundInput.addEventListener("input", function () {
    const nextLower = parseBoundValue(lowerBoundInput.value, state.riemann.lowerBound);
    state.riemann.lowerBound = Math.min(nextLower, state.riemann.upperBound - 0.1);
    if (state.riemann.lowerBound < state.view.xMin) {
        state.riemann.lowerBound = state.view.xMin;
    }
    if (state.riemann.lowerBound >= state.riemann.upperBound) {
        state.riemann.lowerBound = state.riemann.upperBound - 0.1;
    }
    syncRiemannUi();
    updateRiemannResult();
    drawScene();
});

upperBoundInput.addEventListener("input", function () {
    const nextUpper = parseBoundValue(upperBoundInput.value, state.riemann.upperBound);
    state.riemann.upperBound = Math.max(nextUpper, state.riemann.lowerBound + 0.1);
    if (state.riemann.upperBound > state.view.xMax) {
        state.riemann.upperBound = state.view.xMax;
    }
    if (state.riemann.upperBound <= state.riemann.lowerBound) {
        state.riemann.upperBound = state.riemann.lowerBound + 0.1;
    }
    syncRiemannUi();
    updateRiemannResult();
    drawScene();
});

signedAreaInput.addEventListener("change", function () {
    state.riemann.signedArea = signedAreaInput.checked;
    updateRiemannResult();
    drawScene();
});

infoToggle.addEventListener("click", function () {
    openInfoModal();
});

infoClose.addEventListener("click", function () {
    closeInfoModal();
});

infoBackdrop.addEventListener("click", function () {
    closeInfoModal();
});

themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("light-mode");
    syncThemeUi();
});

canvas.addEventListener("mousedown", function (event) {
    state.interaction.isPointerDown = true;
    updateHoverPointFromPointer(event);
});

canvas.addEventListener("mousemove", function (event) {
    if (!state.interaction.isPointerDown) {
        return;
    }

    updateHoverPointFromPointer(event);
});

window.addEventListener("mouseup", function () {
    if (!state.interaction.isPointerDown) {
        return;
    }

    state.interaction.isPointerDown = false;
    clearHoverPoint();
});

canvas.addEventListener("mouseleave", function () {
    if (!state.interaction.isPointerDown) {
        clearHoverPoint();
    }
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !infoModal.hidden) {
        closeInfoModal();
    }
});

setCurrentFunction(state.currentFunction);
syncRiemannUi();
updateRiemannResult();
syncThemeUi();
syncZoomUi();
resizeCanvas();
