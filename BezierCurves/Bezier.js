const canvas = document.getElementById("bezier-canvas");
const context = canvas.getContext("2d");

const infoToggle = document.getElementById("info-toggle");
const infoModal = document.getElementById("info-modal");
const infoBackdrop = document.getElementById("info-backdrop");
const infoClose = document.getElementById("info-close");
const themeToggle = document.getElementById("theme-toggle");
const resetAllButton = document.getElementById("reset-all");
const createCurveButton = document.getElementById("create-curve");
const deleteCurveButton = document.getElementById("delete-curve");
const addPointButton = document.getElementById("add-point");
const deletePointButton = document.getElementById("delete-point");
const closeLoopButton = document.getElementById("close-loop");
const selectCurveButton = document.getElementById("select-curve");
const animateToggleButton = document.getElementById("animate-toggle");

const modeLabel = document.getElementById("mode-label");
const curveLabel = document.getElementById("curve-label");
const curveSummary = document.getElementById("curve-summary");

const state = {
    curves: [],
    selectedCurveId: null,
    selectedPointIndex: null,
    mode: "edit",
    draggingPoint: false,
    animationEnabled: false,
    animationProgress: 0,
    animationDirection: 1,
    nextCurveId: 1
};

const curveAccents = [
    "#73bed3",
    "#a8ca58",
    "#e8c170",
    "#b15a5a",
    "#8c3a60"
];

function openInfoModal() {
    infoModal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeInfoModal() {
    infoModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawScene();
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerpPoint(a, b, t) {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}

function getSelectedCurve() {
    return state.curves.find((curve) => curve.id === state.selectedCurveId) || null;
}

function clonePoint(point) {
    return { x: point.x, y: point.y };
}

function isClosedCurve(curve) {
    return Boolean(curve && curve.closed);
}

function getDistinctPointCount(curve) {
    if (!curve) {
        return 0;
    }

    return isClosedCurve(curve) ? Math.max(curve.points.length - 1, 0) : curve.points.length;
}

function syncClosedCurveEndpoints(curve) {
    if (!isClosedCurve(curve) || curve.points.length < 2) {
        return;
    }

    curve.points[curve.points.length - 1] = clonePoint(curve.points[0]);
}

function setMode(nextMode) {
    state.mode = nextMode;
    modeLabel.textContent = {
        edit: "Select curve",
        add: "Add point",
        delete: "Delete point"
    }[nextMode];

    [addPointButton, deletePointButton, selectCurveButton].forEach((button) => {
        button.classList.remove("is-active");
    });

    if (nextMode === "add") {
        addPointButton.classList.add("is-active");
    } else if (nextMode === "delete") {
        deletePointButton.classList.add("is-active");
    } else {
        selectCurveButton.classList.add("is-active");
    }
}

function resetWorkspace() {
    state.curves = [];
    state.selectedCurveId = null;
    state.selectedPointIndex = null;
    state.draggingPoint = false;
    state.animationEnabled = false;
    state.animationProgress = 0;
    state.animationDirection = 1;
    state.nextCurveId = 1;
    animateToggleButton.textContent = "Animate Off";
    setMode("edit");
    updateHud();
    updateButtonStates();
    drawScene();
}

function createDefaultCurve() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2 - 40;
    const offset = Math.min(width, height) * 0.14;

    const curve = {
        id: state.nextCurveId,
        name: `Curve ${state.nextCurveId}`,
        accent: curveAccents[(state.nextCurveId - 1) % curveAccents.length],
        closed: false,
        points: [
            { x: centerX - offset * 1.3, y: centerY + offset * 0.8 },
            { x: centerX - offset * 0.4, y: centerY - offset * 1.1 },
            { x: centerX + offset * 0.65, y: centerY + offset * 1.1 },
            { x: centerX + offset * 1.4, y: centerY - offset * 0.4 }
        ]
    };

    state.nextCurveId += 1;
    state.curves.push(curve);
    state.selectedCurveId = curve.id;
    state.selectedPointIndex = curve.points.length - 1;
    setMode("edit");
    updateHud();
    drawScene();
}

function deleteSelectedCurve() {
    if (!state.selectedCurveId) {
        return;
    }

    state.curves = state.curves.filter((curve) => curve.id !== state.selectedCurveId);
    state.selectedCurveId = state.curves.length ? state.curves[state.curves.length - 1].id : null;
    state.selectedPointIndex = null;
    state.animationEnabled = state.selectedCurveId !== null && state.animationEnabled;
    state.animationProgress = 0;
    animateToggleButton.textContent = state.animationEnabled ? "Animate On" : "Animate Off";
    setMode("edit");
    updateHud();
    drawScene();
}

function addPointToSelectedCurve(position) {
    const curve = getSelectedCurve();
    if (!curve) {
        return;
    }

    if (isClosedCurve(curve)) {
        curve.points.splice(curve.points.length - 1, 0, clonePoint(position));
        syncClosedCurveEndpoints(curve);
        state.selectedPointIndex = curve.points.length - 2;
    } else {
        curve.points.push(clonePoint(position));
        state.selectedPointIndex = curve.points.length - 1;
    }

    updateHud();
    drawScene();
}

function deletePointFromSelectedCurve(pointIndex) {
    const curve = getSelectedCurve();
    if (!curve || pointIndex === null || pointIndex < 0 || pointIndex >= curve.points.length) {
        return;
    }

    const minimumPoints = isClosedCurve(curve) ? 4 : 2;
    if (curve.points.length <= minimumPoints) {
        return;
    }

    if (isClosedCurve(curve)) {
        const lastIndex = curve.points.length - 1;

        if (pointIndex === 0 || pointIndex === lastIndex) {
            curve.points.shift();
            curve.points.pop();
            curve.points.push(clonePoint(curve.points[0]));
            state.selectedPointIndex = 0;
        } else {
            curve.points.splice(pointIndex, 1);
            syncClosedCurveEndpoints(curve);
            state.selectedPointIndex = Math.min(pointIndex, curve.points.length - 2);
        }
    } else {
        curve.points.splice(pointIndex, 1);
        state.selectedPointIndex = Math.min(pointIndex, curve.points.length - 1);
    }

    updateHud();
    drawScene();
}

function closeSelectedCurve() {
    const curve = getSelectedCurve();
    if (!curve || isClosedCurve(curve) || curve.points.length < 3) {
        return;
    }

    curve.closed = true;
    curve.points.push(clonePoint(curve.points[0]));
    state.selectedPointIndex = curve.points.length - 1;
    updateHud();
    updateButtonStates();
    drawScene();
}

function hitTestPoint(position) {
    const curve = getSelectedCurve();
    if (!curve) {
        return null;
    }

    for (let index = curve.points.length - 1; index >= 0; index -= 1) {
        if (distance(position, curve.points[index]) <= 12) {
            return index;
        }
    }

    return null;
}

function sampleCurvePoint(points, t) {
    let layer = points.map((point) => ({ ...point }));

    while (layer.length > 1) {
        const nextLayer = [];

        for (let index = 0; index < layer.length - 1; index += 1) {
            nextLayer.push(lerpPoint(layer[index], layer[index + 1], t));
        }

        layer = nextLayer;
    }

    return layer[0];
}

function hitTestCurve(position) {
    let bestHit = null;

    state.curves.forEach((curve) => {
        if (curve.points.length < 2) {
            return;
        }

        for (let step = 0; step <= 100; step += 1) {
            const candidate = sampleCurvePoint(curve.points, step / 100);
            const hitDistance = distance(position, candidate);

            if (hitDistance <= 14 && (!bestHit || hitDistance < bestHit.distance)) {
                bestHit = { curveId: curve.id, distance: hitDistance };
            }
        }
    });

    return bestHit;
}

function getConstructionLevels(points, t) {
    const levels = [points.map((point) => ({ ...point }))];

    while (levels[levels.length - 1].length > 1) {
        const previousLevel = levels[levels.length - 1];
        const nextLevel = [];

        for (let index = 0; index < previousLevel.length - 1; index += 1) {
            nextLevel.push(lerpPoint(previousLevel[index], previousLevel[index + 1], t));
        }

        levels.push(nextLevel);
    }

    return levels;
}

function drawGrid() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const rootStyles = getComputedStyle(document.body);
    const gridColor = rootStyles.getPropertyValue("--grid-color").trim();

    context.strokeStyle = gridColor;
    context.lineWidth = 1;

    for (let x = 0; x < width; x += 32) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    for (let y = 0; y < height; y += 32) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }
}

function drawControlPolygon(curve, isSelected) {
    if (curve.points.length < 2) {
        return;
    }

    context.beginPath();
    context.moveTo(curve.points[0].x, curve.points[0].y);

    for (let index = 1; index < curve.points.length; index += 1) {
        context.lineTo(curve.points[index].x, curve.points[index].y);
    }

    context.strokeStyle = isSelected ? curve.accent : `${curve.accent}88`;
    context.lineWidth = isSelected ? 2 : 1.5;
    context.setLineDash([8, 8]);
    context.stroke();
    context.setLineDash([]);
}

function drawBezierCurve(curve, isSelected) {
    if (curve.points.length < 2) {
        return;
    }

    context.beginPath();
    context.moveTo(curve.points[0].x, curve.points[0].y);

    for (let step = 1; step <= 160; step += 1) {
        const point = sampleCurvePoint(curve.points, step / 160);
        context.lineTo(point.x, point.y);
    }

    context.strokeStyle = curve.accent;
    context.lineWidth = isSelected ? 4 : 3;
    context.stroke();
}

function drawControlPoints(curve, isSelected) {
    curve.points.forEach((point, index) => {
        context.beginPath();
        context.arc(point.x, point.y, isSelected && state.selectedPointIndex === index ? 8 : 6, 0, Math.PI * 2);
        context.fillStyle = isSelected && state.selectedPointIndex === index ? curve.accent : "#ffffff";
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = curve.accent;
        context.stroke();
    });
}

function drawAnimationOverlay(curve) {
    if (!state.animationEnabled || !curve || curve.points.length < 2) {
        return;
    }

    const levels = getConstructionLevels(curve.points, state.animationProgress);
    const palette = ["#ffffff", "#d0da91", "#e8c170", "#cf573c", "#b15a5a"];

    for (let levelIndex = 1; levelIndex < levels.length; levelIndex += 1) {
        const level = levels[levelIndex];
        const color = palette[(levelIndex - 1) % palette.length];

        if (level.length > 1) {
            context.beginPath();
            context.moveTo(level[0].x, level[0].y);

            for (let index = 1; index < level.length; index += 1) {
                context.lineTo(level[index].x, level[index].y);
            }

            context.strokeStyle = `${color}aa`;
            context.lineWidth = 1.5;
            context.stroke();
        }

        level.forEach((point) => {
            context.beginPath();
            context.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
            context.fillStyle = color;
            context.fill();
        });
    }

    const finalPoint = levels[levels.length - 1][0];
    context.beginPath();
    context.arc(finalPoint.x, finalPoint.y, 7, 0, Math.PI * 2);
    context.fillStyle = curve.accent;
    context.fill();
}

function drawScene() {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawGrid();

    state.curves.forEach((curve) => {
        const isSelected = curve.id === state.selectedCurveId;
        drawControlPolygon(curve, isSelected);
        drawBezierCurve(curve, isSelected);
        drawControlPoints(curve, isSelected);
    });

    drawAnimationOverlay(getSelectedCurve());
}

function getPolygonLength(points) {
    let total = 0;

    for (let index = 1; index < points.length; index += 1) {
        total += distance(points[index - 1], points[index]);
    }

    return total;
}

function updateHud() {
    const curve = getSelectedCurve();

    if (!curve) {
        curveLabel.textContent = "None";
        curveSummary.textContent = "Create a curve to start drawing.";
        return;
    }

    curveLabel.textContent = curve.name;
    const shapeLabel = isClosedCurve(curve) ? "closed loop" : "open curve";
    curveSummary.textContent = `${getDistinctPointCount(curve)} control points | degree ${Math.max(curve.points.length - 1, 1)} | ${shapeLabel} | guide length ${getPolygonLength(curve.points).toFixed(1)} px`;
}

function updateButtonStates() {
    const selectedCurve = getSelectedCurve();
    const hasCurve = Boolean(selectedCurve);
    deleteCurveButton.disabled = !hasCurve;
    addPointButton.disabled = !hasCurve;
    deletePointButton.disabled = !hasCurve;
    closeLoopButton.disabled = !hasCurve || isClosedCurve(selectedCurve) || getDistinctPointCount(selectedCurve) < 3;
    selectCurveButton.disabled = !hasCurve;
    animateToggleButton.disabled = !hasCurve;

    if (!hasCurve) {
        animateToggleButton.textContent = "Animate Off";
    }
}

function handleCanvasPointerDown(event) {
    const position = getCanvasPoint(event);
    const curve = getSelectedCurve();

    if (state.mode === "add" && curve) {
        addPointToSelectedCurve(position);
        setMode("edit");
        updateButtonStates();
        return;
    }

    if (state.mode === "delete" && curve) {
        const hitPointIndex = hitTestPoint(position);

        if (hitPointIndex !== null) {
            deletePointFromSelectedCurve(hitPointIndex);
            updateButtonStates();
        }

        return;
    }

    const hitPointIndex = hitTestPoint(position);

    if (hitPointIndex !== null) {
        state.selectedPointIndex = hitPointIndex;
        state.draggingPoint = true;
        canvas.setPointerCapture(event.pointerId);
        updateHud();
        drawScene();
        return;
    }

    const hitCurve = hitTestCurve(position);

    if (hitCurve) {
        state.selectedCurveId = hitCurve.curveId;
        state.selectedPointIndex = null;
        updateHud();
        updateButtonStates();
        drawScene();
    }
}

function handleCanvasPointerMove(event) {
    if (!state.draggingPoint) {
        return;
    }

    const curve = getSelectedCurve();
    if (!curve || state.selectedPointIndex === null) {
        return;
    }

    curve.points[state.selectedPointIndex] = getCanvasPoint(event);

    if (isClosedCurve(curve)) {
        if (state.selectedPointIndex === 0) {
            syncClosedCurveEndpoints(curve);
        } else if (state.selectedPointIndex === curve.points.length - 1) {
            curve.points[0] = clonePoint(curve.points[state.selectedPointIndex]);
            syncClosedCurveEndpoints(curve);
        }
    }

    updateHud();
    drawScene();
}

function handleCanvasPointerUp(event) {
    state.draggingPoint = false;

    if (event && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }
}

function stepAnimation() {
    if (state.animationEnabled) {
        state.animationProgress += 0.008 * state.animationDirection;

        if (state.animationProgress >= 1) {
            state.animationProgress = 1;
            state.animationDirection = -1;
        } else if (state.animationProgress <= 0) {
            state.animationProgress = 0;
            state.animationDirection = 1;
        }

        drawScene();
    }

    window.requestAnimationFrame(stepAnimation);
}

function syncThemeUi() {
    const isLightMode = document.body.classList.contains("light-mode");
    themeToggle.textContent = isLightMode ? "Dark" : "Light";
    themeToggle.setAttribute("aria-label", isLightMode ? "Switch to dark mode" : "Switch to light mode");
    drawScene();
}

infoToggle.addEventListener("click", function () {
    openInfoModal();
});

infoClose.addEventListener("click", function () {
    closeInfoModal();
});

infoBackdrop.addEventListener("click", function () {
    closeInfoModal();
});

createCurveButton.addEventListener("click", function () {
    createDefaultCurve();
    updateButtonStates();
});

resetAllButton.addEventListener("click", function () {
    resetWorkspace();
});

deleteCurveButton.addEventListener("click", function () {
    deleteSelectedCurve();
    updateButtonStates();
});

addPointButton.addEventListener("click", function () {
    if (!getSelectedCurve()) {
        return;
    }

    setMode("add");
});

deletePointButton.addEventListener("click", function () {
    if (!getSelectedCurve()) {
        return;
    }

    setMode("delete");
});

closeLoopButton.addEventListener("click", function () {
    closeSelectedCurve();
});

selectCurveButton.addEventListener("click", function () {
    if (!getSelectedCurve()) {
        return;
    }

    setMode("edit");
});

animateToggleButton.addEventListener("click", function () {
    if (!getSelectedCurve()) {
        return;
    }

    state.animationEnabled = !state.animationEnabled;
    animateToggleButton.textContent = state.animationEnabled ? "Animate On" : "Animate Off";
    drawScene();
});

themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("light-mode");
    syncThemeUi();
});

canvas.addEventListener("pointerdown", handleCanvasPointerDown);
canvas.addEventListener("pointermove", handleCanvasPointerMove);
canvas.addEventListener("pointerup", handleCanvasPointerUp);
canvas.addEventListener("pointerleave", handleCanvasPointerUp);
canvas.addEventListener("pointercancel", handleCanvasPointerUp);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !infoModal.hidden) {
        closeInfoModal();
    }
});

setMode("edit");
updateHud();
updateButtonStates();
syncThemeUi();
resizeCanvas();
stepAnimation();
