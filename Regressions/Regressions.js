const canvas = document.getElementById("regression-canvas");
const context = canvas.getContext("2d");

const pointCountDisplay = document.getElementById("point-count");
const pointTableBody = document.getElementById("point-table-body");
const clearPointsButton = document.getElementById("clear-points");
const infoToggle = document.getElementById("info-toggle");
const infoModal = document.getElementById("info-modal");
const infoBackdrop = document.getElementById("info-backdrop");
const infoClose = document.getElementById("info-close");
const themeToggle = document.getElementById("theme-toggle");
const regressionTypeSelect = document.getElementById("regression-type");
const regressionVariablesContainer = document.getElementById("regression-variables");

const MAX_POINTS = 10;

const state = {
    points: [],
    view: {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10
    },
    regression: {
        type: null,
        coefficients: []
    }
};

function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function roundToTenth(value) {
    return Math.round(value * 10) / 10;
}

function formatPointValue(value) {
    return roundToTenth(value).toFixed(1);
}

function calculateRegressionVariables(regressionType, points) {
    if (points.length < 2) {
        return null;
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0, sumX3 = 0, sumX4 = 0, sumX2Y = 0;
    const n = points.length;

    for (const point of points) {
        const x = point.x;
        const y = point.y;
        const x2 = x * x;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x2;
        sumY2 += y * y;
        sumX3 += x2 * x;
        sumX4 += x2 * x2;
        sumX2Y += x2 * y;
    }

    let r, r2;

    switch (regressionType) {
        case "linear":
            if (n < 2) {
                return null;
            }
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // Calculate r (correlation coefficient)
            const numerator = n * sumXY - sumX * sumY;
            const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            r = denominator === 0 ? 0 : numerator / denominator;
            r2 = r * r;
            
            return {
                coefficients: [slope, intercept],
                r,
                r2,
                sums: { n, sumX, sumY, sumXY, sumX2 }
            };
        case "exponential":
            if (n < 2) {
                return null;
            }
            // Check if all y values are positive for ln(y)
            const allPositive = points.every(p => p.y > 0);
            if (!allPositive) {
                return null;
            }
            
            // Transform to linear: ln(y) = ln(a) + bx
            let sumLnY = 0, sumXLnY = 0;
            for (const point of points) {
                const lnY = Math.log(point.y);
                sumLnY += lnY;
                sumXLnY += point.x * lnY;
            }
            
            const b = (n * sumXLnY - sumX * sumLnY) / (n * sumX2 - sumX * sumX);
            const lnA = (sumLnY - b * sumX) / n;
            const a = Math.exp(lnA);
            
            // Calculate r² for exponential
            const meanY = sumY / n;
            const ssTotExp = sumY2 - n * meanY * meanY;
            let ssResExp = 0;
            for (const point of points) {
                const yPred = a * Math.exp(b * point.x);
                const residual = point.y - yPred;
                ssResExp += residual * residual;
            }
            r2 = ssTotExp === 0 ? 0 : 1 - (ssResExp / ssTotExp);
            
            return { coefficients: [a, b], r2, sums: { n, sumX, sumY, sumXY, sumX2, sumLnY, sumXLnY } };
        case "quadratic":
            if (n < 3) {
                return null;
            }
            const det = n * (sumX2 * sumX4 - sumX3 * sumX3) 
                      - sumX * (sumX * sumX4 - sumX3 * sumX2) 
                      + sumX2 * (sumX * sumX3 - sumX2 * sumX2);
            
            if (Math.abs(det) < 1e-10) {
                return null;
            }
            
            const detC = sumY * (sumX2 * sumX4 - sumX3 * sumX3) 
                       - sumXY * (sumX * sumX4 - sumX3 * sumX2) 
                       + sumX2Y * (sumX * sumX3 - sumX2 * sumX2);
            
            const detB = n * (sumXY * sumX4 - sumX2Y * sumX3) 
                       - sumX * (sumY * sumX4 - sumX2Y * sumX2) 
                       + sumX2 * (sumY * sumX3 - sumXY * sumX2);
            
            const detA = n * (sumX2 * sumX2Y - sumX3 * sumXY) 
                       - sumX * (sumX * sumX2Y - sumX3 * sumY) 
                       + sumX2 * (sumX * sumXY - sumX2 * sumY);
            
            const c = detC / det;
            const b_quad = detB / det;
            const a_quad = detA / det;
            
            // Calculate r² for quadratic
            const meanY_quad = sumY / n;
            const ssTot_quad = sumY2 - n * meanY_quad * meanY_quad;
            let ssRes_quad = 0;
            for (const point of points) {
                const x = point.x;
                const y = point.y;
                const yPred = a_quad * x * x + b_quad * x + c;
                const residual = y - yPred;
                ssRes_quad += residual * residual;
            }
            r2 = ssTot_quad === 0 ? 0 : 1 - (ssRes_quad / ssTot_quad);
            return {
                coefficients: [a_quad, b_quad, c],
                r2,
                sums: { n, sumX, sumY, sumXY, sumX2, sumY2, sumX3, sumX4, sumX2Y }
            };
        default:
            return null;
    }
}
function fmt2(num) {
    return parseFloat(num.toFixed(2));
}

function formatSummationsLatex(pairs, perLine = 3) {
    let lines = [];

    for (let i = 0; i < pairs.length; i += perLine) {
        const chunk = pairs.slice(i, i + perLine)
            .map(([label, value]) => `${label} \\approx ${fmt2(value)}`)
            .join(', \\quad');

        lines.push(`\\[ ${chunk} \\]`);
    }

    return lines.map(line => `<p class="support-copy">${line}</p>`).join('');
}

function formatRegressionVariables(type, result) {
    if (!result || typeof result !== "object") {
        if (type === "linear") {
            return '<p class="support-copy">Not enough points for linear regression (need at least 2 points).</p>';
        } else if (type === "quadratic") {
            return '<p class="support-copy">Not enough points for quadratic regression (need at least 3 points).</p>';
        } else if (type === "exponential") {
            return '<p class="support-copy">Not enough points for exponential regression (need at least 2 positive points).</p>';
        }
        return '<p class="support-copy">Variables needed for this regression will appear here.</p>';
    }

    const { coefficients, r, r2, sums } = result;
    const formatNum = (num) => Number(num.toFixed(4));
    const formatSumNum = (num) => Number(num.toFixed(2));

    let output = "";

    if (type === "linear" && coefficients.length >= 2) {
        const m = formatNum(coefficients[0]);
        const b = formatNum(coefficients[1]);

        output = `
            <p class="support-copy"><strong>Result:</strong></p>
            <p class="support-copy">\\[ y = ${m}x + ${b} \\]</p>
        `;

        if (r !== undefined && r2 !== undefined) {
            output += `<p class="support-copy">\\[
                r = ${formatNum(r)}, \\quad r^2 = ${formatNum(r2)}
            \\]</p>`;
        } else if (r2 !== undefined) {
            output += `<p class="support-copy">\\[ r^2 = ${formatNum(r2)} \\]</p>`;
        }

        output += `
            <br>
            <p class="support-copy"><strong>Step 1: Summations</strong></p>
            ${formatSummationsLatex([
                ["n", formatSumNum(sums.n)],
                ["\\sum x", formatSumNum(sums.sumX)],
                ["\\sum y", formatSumNum(sums.sumY)],
                ["\\sum x^2", formatSumNum(sums.sumX2)],
                ["\\sum xy", formatSumNum(sums.sumXY)]
            ], 3)}

            <br>
            <p class="support-copy"><strong>Step 2: Slope</strong></p>
            <p class="support-copy">\\[
                m = \\frac{n\\sum xy - (\\sum x)(\\sum y)}{n\\sum x^2 - (\\sum x)^2}
            \\]</p>
            <p class="support-copy">\\[ m = ${m} \\]</p>

            <br>
            <p class="support-copy"><strong>Step 3: Intercept</strong></p>
            <p class="support-copy">\\[
                b = \\frac{\\sum y - m\\sum x}{n}
            \\]</p>
            <p class="support-copy">\\[ b = ${b} \\]</p>
        `;

        return output;
    }

    if (type === "quadratic" && coefficients.length >= 3) {
        const a = formatNum(coefficients[0]);
        const b = formatNum(coefficients[1]);
        const c = formatNum(coefficients[2]);

        return `
            <p class="support-copy"><strong>Result:</strong></p>
            <p class="support-copy">\\[ y = ${a}x^2 + ${b}x + ${c} \\]</p>
            ${r2 !== undefined ? `<p class="support-copy">\\[ r^2 = ${formatNum(r2)} \\]</p>` : ""}
            <br>

            <p class="support-copy"><strong>Step 1: Summations</strong></p>
            ${formatSummationsLatex([
                ["n", formatSumNum(sums.n)],
                ["\\sum x", formatSumNum(sums.sumX)],
                ["\\sum y", formatSumNum(sums.sumY)],
                ["\\sum x^2", formatSumNum(sums.sumX2)],
                ["\\sum x^3", formatSumNum(sums.sumX3)],
                ["\\sum x^4", formatSumNum(sums.sumX4)],
                ["\\sum xy", formatSumNum(sums.sumXY)],
                ["\\sum x^2y", formatSumNum(sums.sumX2Y)]
            ], 2)}
            <br>

            <p class="support-copy"><strong>Step 2: System of Equations</strong></p>
            <p class="support-copy">\\[ \\sum y = a\\sum x^2 + b\\sum x + cn \\]</p>
            <p class="support-copy">\\[ \\sum xy = a\\sum x^3 + b\\sum x^2 + c\\sum x \\]</p>
            <p class="support-copy">\\[ \\sum x^2y = a\\sum x^4 + b\\sum x^3 + c\\sum x^2 \\]</p>
            <br>

            <p class="support-copy"><strong>Step 3: Solved System</strong></p>
            <p class="support-copy">\\[ a = ${a}, \\quad b = ${b}, \\quad c = ${c} \\]</p>
        `;
    }

    if (type === "exponential" && coefficients.length >= 2) {
        const a = formatNum(coefficients[0]);
        const b = formatNum(coefficients[1]);
        const lnA = formatNum(Math.log(coefficients[0]));

        return `
            <p class="support-copy"><strong>Result:</strong></p>
            <p class="support-copy">\\[ y = ${a}e^{${b}x} \\]</p>
            ${r2 !== undefined ? `<p class="support-copy">\\[ r^2 = ${formatNum(r2)} \\]</p>` : ""}
            <br>

            <p class="support-copy"><strong>Step 1: Linear Form</strong></p>
            <p class="support-copy">\\[ y = ae^{bx} \\]</p>
            <p class="support-copy">\\[ Y = bx + \\ln(a) \\]</p>
            <br>

            <p class="support-copy"><strong>Step 2: Summations</strong></p>
            ${formatSummationsLatex([
                ["n", formatSumNum(sums.n)],
                ["\\sum x", formatSumNum(sums.sumX)],
                ["\\sum \\ln(y)", formatSumNum(sums.sumLnY)],
                ["\\sum x^2", formatSumNum(sums.sumX2)],
                ["\\sum x\\ln(y)", formatSumNum(sums.sumXLnY)]
            ], 3)}
            <br>
            <p class="support-copy"><strong>Step 3: Regression Calculations</strong></p>
            <p class="support-copy">\\[
                b = \\frac{n\\sum x\\ln(y) - (\\sum x)(\\sum \\ln(y))}{n\\sum x^2 - (\\sum x)^2}
            \\]</p>
            <p class="support-copy">\\[ b = ${b} \\]</p>

            <p class="support-copy">\\[
                \\ln(a) = \\frac{\\sum \\ln(y) - b\\sum x}{n}
            \\]</p>
            <p class="support-copy">\\[ a = ${a} \\]</p>
        `;
    }

    return '<p class="support-copy">Variables needed for this regression will appear here.</p>';
}

function updateRegressionVariablesDisplay() {
    if (!regressionVariablesContainer) {
        return;
    }

    const { type, result } = state.regression;
    regressionVariablesContainer.innerHTML = formatRegressionVariables(type, result);

    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([regressionVariablesContainer]).catch(function (error) {
            console.error("MathJax typeset failed:", error);
        });
    }
}

function updateRegression() {
    const type = regressionTypeSelect?.value;
    const result = calculateRegressionVariables(type, state.points);
    state.regression = { type, result };
    updateRegressionVariablesDisplay();
    drawScene();
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

function fromCanvasX(canvasX) {
    const width = canvas.clientWidth;
    const { xMin, xMax } = state.view;
    return xMin + (canvasX / width) * (xMax - xMin);
}

function fromCanvasY(canvasY) {
    const height = canvas.clientHeight;
    const { yMin, yMax } = state.view;
    return yMax - (canvasY / height) * (yMax - yMin);
}

function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    drawScene();
}

function drawGrid() {
    const gridColor = getCssVar("--grid-color");
    const axisColor = getCssVar("--axis-color");
    const textColor = getCssVar("--muted-text");

    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.lineWidth = 1;
    context.font = '12px "Trebuchet MS", "Segoe UI", sans-serif';

    for (let x = state.view.xMin; x <= state.view.xMax; x += 1) {
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

    for (let y = state.view.yMin; y <= state.view.yMax; y += 1) {
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

function drawPoints() {
    const accent = getCssVar("--tool-accent");

    state.points.forEach(function (point) {
        context.fillStyle = accent;
        context.beginPath();
        context.arc(toCanvasX(point.x), toCanvasY(point.y), 5, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = getCssVar("--surface-color");
        context.lineWidth = 2;
        context.stroke();
    });
}

function drawRegression() {
    const { type, result } = state.regression;
    if (!type || !result || !result.coefficients || result.coefficients.length === 0) {
        return;
    }

    const coefficients = result.coefficients;
    context.strokeStyle = "green"; // Green regression line
    context.lineWidth = 3;
    context.beginPath();

    const { xMin, xMax } = state.view;
    const steps = 200; // Number of points to draw the curve
    let first = true;

    for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        let y;
        
        if (type === "linear" && coefficients.length >= 2) {
            y = coefficients[0] * x + coefficients[1];
        } else if (type === "quadratic" && coefficients.length >= 3) {
            y = coefficients[0] * x * x + coefficients[1] * x + coefficients[2];
        } else if (type === "exponential" && coefficients.length >= 2) {
            y = coefficients[0] * Math.exp(coefficients[1] * x);
        } else {
            return; // Unsupported type
        }

        if (y < state.view.yMin - 1 || y > state.view.yMax + 1) {
            continue; // Skip points outside view
        }

        const canvasX = toCanvasX(x);
        const canvasY = toCanvasY(y);

        if (first) {
            context.moveTo(canvasX, canvasY);
            first = false;
        } else {
            context.lineTo(canvasX, canvasY);
        }
    }

    context.stroke();
}

function drawScene() {
    drawGrid();
    drawAxesLabels();
    drawPoints();
    drawRegression();
}

function updatePointDisplays() {
    pointCountDisplay.textContent = `${state.points.length} / ${MAX_POINTS}`;

    const sortedPoints = state.points.slice().sort(function (pointA, pointB) {
        if (pointA.x === pointB.x) {
            return pointA.y - pointB.y;
        }

        return pointA.x - pointB.x;
    });

    pointTableBody.innerHTML = Array.from({ length: MAX_POINTS }, function (_, index) {
        const point = sortedPoints[index];

        if (!point) {
            return `<tr><td>${index + 1}</td><td class="point-table-empty">-</td><td class="point-table-empty">-</td><td></td></tr>`;
        }

        return `<tr><td>${index + 1}</td><td>${formatPointValue(point.x)}</td><td>${formatPointValue(point.y)}</td><td><button class="point-delete-button" type="button" data-point-id="${point.id}" aria-label="Delete point ${index + 1}">x</button></td></tr>`;
        })
        .join("");
}

function addPointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const rawX = fromCanvasX(clamp(event.clientX - rect.left, 0, rect.width));
    const rawY = fromCanvasY(clamp(event.clientY - rect.top, 0, rect.height));
    const point = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: clamp(roundToTenth(rawX), state.view.xMin, state.view.xMax),
        y: clamp(roundToTenth(rawY), state.view.yMin, state.view.yMax)
    };

    if (state.points.length >= MAX_POINTS) {
        state.points.shift();
    }

    state.points.push(point);
    updatePointDisplays();
    updateRegression();
}

function clearPoints() {
    state.points = [];
    updatePointDisplays();
    updateRegression();
}

function deletePointById(pointId) {
    state.points = state.points.filter(function (point) {
        return point.id !== pointId;
    });
    updatePointDisplays();
    updateRegression();
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

canvas.addEventListener("click", addPointFromEvent);
pointTableBody.addEventListener("click", function (event) {
    const deleteButton = event.target.closest(".point-delete-button");

    if (!deleteButton) {
        return;
    }

    deletePointById(deleteButton.dataset.pointId);
});
clearPointsButton.addEventListener("click", clearPoints);
infoToggle.addEventListener("click", openInfoModal);
infoClose.addEventListener("click", closeInfoModal);
infoBackdrop.addEventListener("click", closeInfoModal);
themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("light-mode");
    syncThemeUi();
});

if (regressionTypeSelect) {
    regressionTypeSelect.addEventListener("change", updateRegression);
}

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !infoModal.hidden) {
        closeInfoModal();
    }
});

window.addEventListener("resize", resizeCanvas);

updatePointDisplays();
syncThemeUi();
resizeCanvas();
updateRegression();
