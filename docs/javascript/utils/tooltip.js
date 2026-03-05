function splitLines(value) {
    if (typeof value !== 'string') return [];
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

export function setTooltipContent(el, summary, stats) {
    if (!el) return;

    if (typeof summary === 'string' && summary.trim()) {
        el.dataset.tooltipSummary = summary.trim();
    } else {
        delete el.dataset.tooltipSummary;
    }

    if (typeof stats === 'string' && stats.trim()) {
        el.dataset.tooltipStats = stats.trim();
    } else {
        delete el.dataset.tooltipStats;
    }

    if (typeof el.title === 'string' && el.title) {
        el.dataset.nativeTitleBackup = el.title;
    }
    el.removeAttribute('title');
}

export function initTooltips() {
    const tooltipEl = document.getElementById('gameTooltip');
    if (!tooltipEl) return;

    tooltipEl.style.position = 'fixed';
    tooltipEl.style.left = '0px';
    tooltipEl.style.top = '0px';
    tooltipEl.style.zIndex = '99999';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.display = 'none';

    const titleEl = document.getElementById('gameTooltipTitle');
    const summaryEl = document.getElementById('gameTooltipSummary');
    const statsEl = document.getElementById('gameTooltipStats');

    let activeEl = null;
    let mouseDown = false;
    let lastPointer = { x: 0, y: 0 };
    let pendingTarget = null;
    let showTimer = null;

    const SHOW_DELAY_MS = 80;
    const TOOLTIP_TARGET_SELECTOR = '[data-tooltip-summary], [data-tooltip-stats]';

    function clearShowTimer() {
        if (showTimer) {
            clearTimeout(showTimer);
            showTimer = null;
        }
    }

    function hasTooltipContent(target) {
        return Boolean(target?.dataset?.tooltipSummary || target?.dataset?.tooltipStats);
    }

    function getTooltipTarget(node) {
        return node?.closest?.(TOOLTIP_TARGET_SELECTOR) || null;
    }

    function positionTooltip(pointerX, pointerY) {
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const margin = 8;
        const offset = 14;

        let left = pointerX + offset;
        if (left + tooltipRect.width > window.innerWidth - margin) {
            left = pointerX - tooltipRect.width - offset;
        }
        left = Math.max(margin, left);

        let top = pointerY + offset;
        const maxTop = Math.max(margin, window.innerHeight - tooltipRect.height - margin);
        top = Math.min(Math.max(margin, top), maxTop);

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    }

    function renderTooltip(target) {
        const lines = splitLines(target.dataset.tooltipSummary);
        const statsLines = splitLines(target.dataset.tooltipStats);

        const title = lines[0] || target.innerText?.trim() || 'Details';
        const summaryBody = lines.slice(1).join('\n');

        titleEl.textContent = title;
        summaryEl.textContent = summaryBody || ' '; // keeps spacing stable
        statsEl.textContent = statsLines.join('\n');

        summaryEl.style.display = summaryBody ? 'block' : 'none';
        statsEl.style.display = statsLines.length ? 'block' : 'none';
    }

    function showTooltip(target) {
        if (!target || mouseDown || !hasTooltipContent(target)) return;
        activeEl = target;
        renderTooltip(target);
        tooltipEl.style.display = 'block';
        positionTooltip(lastPointer.x, lastPointer.y);
    }

    function scheduleShow(target) {
        if (!target || mouseDown || !hasTooltipContent(target)) return;
        pendingTarget = target;
        clearShowTimer();
        showTimer = setTimeout(() => {
            if (pendingTarget === target && !mouseDown) {
                showTooltip(target);
            }
            showTimer = null;
        }, SHOW_DELAY_MS);
    }

    function hideTooltip() {
        clearShowTimer();
        pendingTarget = null;
        activeEl = null;
        tooltipEl.style.display = 'none';
    }

    document.addEventListener('pointermove', (event) => {
        lastPointer = { x: event.clientX, y: event.clientY };
        if (activeEl) {
            if (!activeEl.isConnected || !activeEl.matches(':hover')) {
                hideTooltip();
                return;
            }
            positionTooltip(lastPointer.x, lastPointer.y);
        }
    }, true);

    document.addEventListener('pointerover', (event) => {
        const target = getTooltipTarget(event.target);
        if (!target) return;
        scheduleShow(target);
    }, true);

    document.addEventListener('pointerout', (event) => {
        const target = getTooltipTarget(event.target);
        if (!target) return;
        const nextTarget = getTooltipTarget(event.relatedTarget);
        if (activeEl === target && nextTarget !== target) hideTooltip();
    }, true);

    document.addEventListener('pointerdown', (event) => {
        if (!getTooltipTarget(event.target)) return;
        mouseDown = true;
        hideTooltip();
    }, true);

    document.addEventListener('pointerup', () => {
        mouseDown = false;
        const hovered = document.querySelector(`${TOOLTIP_TARGET_SELECTOR}:hover`);
        if (hovered) scheduleShow(hovered);
    }, true);

    window.addEventListener('mouseout', (event) => {
        if (!event.relatedTarget) {
            hideTooltip();
        }
    }, true);

    window.addEventListener('blur', () => {
        hideTooltip();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) hideTooltip();
    });

    window.addEventListener('scroll', () => {
        if (activeEl && tooltipEl.style.display === 'block') positionTooltip(lastPointer.x, lastPointer.y);
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (activeEl && tooltipEl.style.display === 'block') positionTooltip(lastPointer.x, lastPointer.y);
    });
}
