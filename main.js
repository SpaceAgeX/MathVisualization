document.addEventListener('DOMContentLoaded', function () {
    const gridGroup = document.getElementById('graph-grid');
    const axesGroup = document.getElementById('graph-axes');
    const ticksGroup = document.getElementById('graph-ticks');
    const labelsGroup = document.getElementById('graph-labels');
    const ornamentsGroup = document.getElementById('graph-ornaments');

    const fillPath = document.getElementById('graph-fill');
    const lineGlowPath = document.getElementById('graph-line-glow');
    const linePath = document.getElementById('graph-line');

    const graphBackdrop = document.getElementById('graph-backdrop');
    const heroStage = document.querySelector('.hero-stage');
    const heroOverlay = document.querySelector('.hero-overlay');

    const palette = [
        { stroke: '#73bed3', fill: 'rgba(115, 190, 211, 0.12)' },
        { stroke: '#a8ca58', fill: 'rgba(168, 202, 88, 0.11)' },
        { stroke: '#b15a5a', fill: 'rgba(177, 90, 90, 0.12)' },
        { stroke: '#e6b34a', fill: 'rgba(230, 179, 74, 0.11)' },
        { stroke: '#8c3a60', fill: 'rgba(140, 58, 96, 0.11)' }
    ];

    const viewBox = { width: 1600, height: 900 };
    const padding = { top: 85, right: 70, bottom: 80, left: 70 };

    const graphBounds = {
        left: padding.left,
        right: viewBox.width - padding.right,
        top: padding.top + 20,
        bottom: viewBox.height - padding.bottom - 10
    };

    const xAxisY = viewBox.height * 0.6;
    const yAxisX = viewBox.width * 0.22;

    const animatedFunctions = [
        {
            name: 'sine-wave',
            colorIndex: 1,
            duration: 5200,
            fn: (x, t) => {
                const amplitude = 1.5 + Math.sin(t * 0.9) * 0.85;
                const frequency = 0.52 + (Math.sin(t * 0.55) + 1) * 0.42;
                const phase = t * 1.65;
                return amplitude * Math.sin(x * frequency + phase) + 0.28 * Math.cos(x * 1.35 - t * 0.9);
            }
        },
        {
            name: 'parabola-stretch',
            colorIndex: 0,
            duration: 5000,
            fn: (x, t) => {
                const a = 0.035 + (Math.sin(t * 1.1) + 1) * 0.055;
                const shiftX = Math.sin(t * 0.65) * 1.8;
                const shiftY = -2.4 + Math.cos(t * 0.8) * 0.95;
                return a * Math.pow(x - shiftX, 2) + shiftY;
            }
        },
        {
            name: 'quartic-morph',
            colorIndex: 2,
            duration: 5200,
            fn: (x, t) => {
                const a = 0.0018 + (Math.sin(t * 0.7) + 1) * 0.0014;
                const b = -0.11 + Math.cos(t * 0.95) * 0.065;
                const c = Math.sin(t * 0.55) * 0.85;
                return a * Math.pow(x, 4) + b * Math.pow(x, 2) + c;
            }
        },
        {
            name: 'cubic-drift',
            colorIndex: 3,
            duration: 5000,
            fn: (x, t) => {
                const a = 0.012 + (Math.sin(t * 0.9) + 1) * 0.01;
                const b = -0.28 + Math.cos(t * 0.8) * 0.18;
                const c = Math.sin(t * 0.55) * 1.3;
                return a * Math.pow(x, 3) + b * x + c;
            }
        },
        {
            name: 'hybrid-wave',
            colorIndex: 4,
            duration: 5400,
            fn: (x, t) => {
                const baseFreq = 0.38 + (Math.sin(t * 0.4) + 1) * 0.24;
                const amp = 1.2 + Math.cos(t * 0.9) * 0.7;
                const curve = -0.012 * Math.pow(x, 2) * (0.7 + 0.3 * Math.sin(t * 0.65));
                return amp * Math.sin((x + Math.sin(t) * 0.8) * baseFreq + t * 1.45) + curve + 0.45;
            }
        }
    ];

    let currentFunctionIndex = 0;
    let cycleStartTime = performance.now();
    let currentStrokeColor = palette[animatedFunctions[0].colorIndex].stroke;
    let currentFillColor = palette[animatedFunctions[0].colorIndex].fill;
    let targetStrokeColor = currentStrokeColor;
    let targetFillColor = currentFillColor;
    let functionChangeTime = performance.now();

    function createSvgElement(tagName) {
        return document.createElementNS('http://www.w3.org/2000/svg', tagName);
    }

    function addLine(group, x1, y1, x2, y2, color, width, className = '') {
        const line = createSvgElement('line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', width);
        if (className) line.setAttribute('class', className);
        group.appendChild(line);
        return line;
    }

    function addText(group, x, y, content, color, size, anchor = 'middle') {
        const text = createSvgElement('text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('fill', color);
        text.setAttribute('font-size', size);
        text.setAttribute('font-family', '"Trebuchet MS", "Segoe UI", sans-serif');
        text.setAttribute('text-anchor', anchor);
        text.textContent = content;
        group.appendChild(text);
        return text;
    }

    function drawGridAndAxes() {
        gridGroup.innerHTML = '';
        axesGroup.innerHTML = '';
        ticksGroup.innerHTML = '';
        labelsGroup.innerHTML = '';
        ornamentsGroup.innerHTML = '';

        const gridSpacing = 80;

        for (let x = 0; x <= viewBox.width; x += gridSpacing) {
            const color = x % (gridSpacing * 2) === 0
                ? 'rgba(115, 190, 211, 0.075)'
                : 'rgba(115, 190, 211, 0.05)';
            addLine(gridGroup, x, 0, x, viewBox.height, color, 1, x % (gridSpacing * 3) === 0 ? 'grid-pulse-line' : '');
        }

        for (let y = 0; y <= viewBox.height; y += gridSpacing) {
            const color = y % (gridSpacing * 2) === 0
                ? 'rgba(115, 190, 211, 0.075)'
                : 'rgba(115, 190, 211, 0.05)';
            addLine(gridGroup, 0, y, viewBox.width, y, color, 1, y % (gridSpacing * 3) === 0 ? 'grid-pulse-line' : '');
        }

        addLine(axesGroup, graphBounds.left, xAxisY, graphBounds.right, xAxisY, 'rgba(115, 190, 211, 0.3)', 1.35);
        addLine(axesGroup, yAxisX, graphBounds.top, yAxisX, graphBounds.bottom, 'rgba(115, 190, 211, 0.3)', 1.35);

        const arrowRight = createSvgElement('path');
        arrowRight.setAttribute('d', `M ${graphBounds.right - 12} ${xAxisY - 7} L ${graphBounds.right} ${xAxisY} L ${graphBounds.right - 12} ${xAxisY + 7}`);
        arrowRight.setAttribute('fill', 'none');
        arrowRight.setAttribute('stroke', 'rgba(115, 190, 211, 0.42)');
        arrowRight.setAttribute('stroke-width', '1.3');
        axesGroup.appendChild(arrowRight);

        const arrowUp = createSvgElement('path');
        arrowUp.setAttribute('d', `M ${yAxisX - 7} ${graphBounds.top + 12} L ${yAxisX} ${graphBounds.top} L ${yAxisX + 7} ${graphBounds.top + 12}`);
        arrowUp.setAttribute('fill', 'none');
        arrowUp.setAttribute('stroke', 'rgba(115, 190, 211, 0.42)');
        arrowUp.setAttribute('stroke-width', '1.3');
        axesGroup.appendChild(arrowUp);

        for (let x = graphBounds.left; x <= graphBounds.right; x += gridSpacing) {
            addLine(ticksGroup, x, xAxisY - 6, x, xAxisY + 6, 'rgba(115, 190, 211, 0.22)', 1);
        }

        for (let y = graphBounds.top; y <= graphBounds.bottom; y += gridSpacing) {
            addLine(ticksGroup, yAxisX - 6, y, yAxisX + 6, y, 'rgba(115, 190, 211, 0.22)', 1);
        }

        addText(labelsGroup, graphBounds.right - 18, xAxisY - 16, 'x', 'rgba(200, 230, 232, 0.65)', '22', 'end');
        addText(labelsGroup, yAxisX + 14, graphBounds.top + 28, 'y', 'rgba(200, 230, 232, 0.65)', '22', 'start');
        addText(labelsGroup, yAxisX - 14, xAxisY + 22, '0', 'rgba(200, 230, 232, 0.55)', '16', 'end');

        const scan = createSvgElement('rect');
        scan.setAttribute('x', '-200');
        scan.setAttribute('y', '0');
        scan.setAttribute('width', '160');
        scan.setAttribute('height', String(viewBox.height));
        scan.setAttribute('fill', 'url(#scan-gradient)');
        scan.setAttribute('class', 'graph-scan-line');
        ornamentsGroup.appendChild(scan);
    }

    function sampleFunction(fn, t, sampleCount = 320) {
        const minX = -10;
        const maxX = 10;
        const points = [];

        for (let i = 0; i <= sampleCount; i++) {
            const n = i / sampleCount;
            const x = minX + (maxX - minX) * n;
            const y = fn(x, t);
            points.push({ x, y });
        }

        return points;
    }

    function mapPoints(points) {
        const minX = -10;
        const maxX = 10;

        const yValues = points.map((point) => point.y);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);

        return points.map((point) => {
            const px = graphBounds.left + ((point.x - minX) / (maxX - minX)) * (graphBounds.right - graphBounds.left);
            const py = graphBounds.top + ((point.y - minY) / (maxY - minY || 1)) * (graphBounds.bottom - graphBounds.top);
            return { x: px, y: py };
        });
    }

    function buildLinePath(points) {
        return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    }

    function buildTopFillPath(points) {
        if (!points.length) return '';
        const left = points[0];
        const right = points[points.length - 1];

        let path = `M ${left.x.toFixed(2)} 0 `;
        path += `L ${right.x.toFixed(2)} 0 `;
        for (let i = points.length - 1; i >= 0; i--) {
            path += `L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} `;
        }
        path += `L ${left.x.toFixed(2)} 0 Z`;
        return path;
    }

    function hexToRgb(hex) {
        const clean = hex.replace('#', '');
        const value = parseInt(clean, 16);
        return {
            r: (value >> 16) & 255,
            g: (value >> 8) & 255,
            b: value & 255
        };
    }

    function rgbaStringToObj(str) {
        const match = str.match(/rgba?\(([^)]+)\)/);
        if (!match) return { r: 115, g: 190, b: 211, a: 0.12 };
        const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
        return {
            r: parts[0],
            g: parts[1],
            b: parts[2],
            a: parts[3] !== undefined ? parts[3] : 1
        };
    }

    function mixNumber(a, b, t) {
        return a + (b - a) * t;
    }

    function mixStrokeColor(from, to, t) {
        const a = hexToRgb(from);
        const b = hexToRgb(to);
        const r = Math.round(mixNumber(a.r, b.r, t));
        const g = Math.round(mixNumber(a.g, b.g, t));
        const bl = Math.round(mixNumber(a.b, b.b, t));
        return `rgb(${r}, ${g}, ${bl})`;
    }

    function mixFillColor(from, to, t) {
        const a = rgbaStringToObj(from);
        const b = rgbaStringToObj(to);
        const r = Math.round(mixNumber(a.r, b.r, t));
        const g = Math.round(mixNumber(a.g, b.g, t));
        const bl = Math.round(mixNumber(a.b, b.b, t));
        const alpha = mixNumber(a.a, b.a, t).toFixed(3);
        return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
    }

    function updateStrokeAndFillColors(now) {
        const transitionProgress = Math.min((now - functionChangeTime) / 700, 1);
        const eased = 1 - Math.pow(1 - transitionProgress, 3);

        const stroke = mixStrokeColor(currentStrokeColor, targetStrokeColor, eased);
        const fill = mixFillColor(currentFillColor, targetFillColor, eased);

        linePath.setAttribute('stroke', stroke);
        lineGlowPath.setAttribute('stroke', stroke);
        fillPath.setAttribute('fill', fill);

        if (transitionProgress >= 1) {
            currentStrokeColor = targetStrokeColor;
            currentFillColor = targetFillColor;
        }
    }

    function drawAnimatedGraph(now) {
        const currentConfig = animatedFunctions[currentFunctionIndex];
        const elapsed = now - cycleStartTime;
        const t = elapsed / 1000;

        if (elapsed >= currentConfig.duration) {
            currentFunctionIndex = (currentFunctionIndex + 1) % animatedFunctions.length;
            cycleStartTime = now;

            currentStrokeColor = targetStrokeColor;
            currentFillColor = targetFillColor;

            const nextConfig = animatedFunctions[currentFunctionIndex];
            targetStrokeColor = palette[nextConfig.colorIndex].stroke;
            targetFillColor = palette[nextConfig.colorIndex].fill;
            functionChangeTime = now;
        }

        updateStrokeAndFillColors(now);

        const activeConfig = animatedFunctions[currentFunctionIndex];
        const points = mapPoints(sampleFunction(activeConfig.fn, t));
        const lineD = buildLinePath(points);
        const fillD = buildTopFillPath(points);

        linePath.setAttribute('d', lineD);
        lineGlowPath.setAttribute('d', lineD);
        fillPath.setAttribute('d', fillD);

        const revealLength = linePath.getTotalLength();
        linePath.style.strokeDasharray = `${revealLength}`;
        lineGlowPath.style.strokeDasharray = `${revealLength}`;

        const introProgress = Math.min((now - cycleStartTime) / 1100, 1);
        const introEased = 1 - Math.pow(1 - introProgress, 3);
        const dashOffset = revealLength * (1 - introEased);

        linePath.style.strokeDashoffset = `${dashOffset}`;
        lineGlowPath.style.strokeDashoffset = `${dashOffset}`;
        fillPath.style.opacity = String(0.3 + introEased * 0.7);

        requestAnimationFrame(drawAnimatedGraph);
    }

    function updateScrollState() {
        const viewportHeight = window.innerHeight;
        const totalScrollable = Math.max(heroStage.offsetHeight - viewportHeight, 1);
        const rect = heroStage.getBoundingClientRect();
        const scrolled = Math.min(Math.max(-rect.top, 0), totalScrollable);
        const progress = scrolled / totalScrollable;

        const graphScale = 1 - progress * 0.18;
        const graphTranslateY = progress * -36;
        const graphOpacity = 1 - progress * 0.12;

        graphBackdrop.style.transform = `translateY(${graphTranslateY}px) scale(${graphScale})`;
        graphBackdrop.style.opacity = String(graphOpacity);

        const titleScale = 1 - progress * 0.12;
        const titleOpacity = 1 - progress * 0.82;
        heroOverlay.style.transform = `translateY(${progress * -24}px) scale(${titleScale})`;
        heroOverlay.style.opacity = String(Math.max(titleOpacity, 0));
    }

    drawGridAndAxes();

    const initialColors = palette[animatedFunctions[0].colorIndex];
    currentStrokeColor = initialColors.stroke;
    currentFillColor = initialColors.fill;
    targetStrokeColor = initialColors.stroke;
    targetFillColor = initialColors.fill;

    updateScrollState();
    requestAnimationFrame(drawAnimatedGraph);

    window.addEventListener('scroll', updateScrollState, { passive: true });

    window.addEventListener('resize', () => {
        drawGridAndAxes();
        updateScrollState();
    });

    document.querySelectorAll('.project-card').forEach((card) => {
        card.addEventListener('mousemove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            card.style.setProperty('--glow-x', `${x}px`);
            card.style.setProperty('--glow-y', `${y}px`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--glow-x', '50%');
            card.style.setProperty('--glow-y', '50%');
        });
    });
});