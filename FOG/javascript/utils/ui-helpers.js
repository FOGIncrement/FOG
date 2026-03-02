// badge helpers
function markNew(el) {
    if (!el) return;
    if (el.dataset.seen === "true") return;
    el.dataset.new = "true";
    // if button and no badge span, create one
    if (el.tagName === 'BUTTON') {
        let badge = el.querySelector('.btn-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'btn-badge';
            badge.style.display = 'inline-block';
            el.appendChild(badge);
        }
        badge.style.display = 'inline-block';
    }
    updateTabBadges();
}

function clearNew(el) {
    if (!el) return;
    el.dataset.seen = "true";
    el.dataset.new = "false";
    const badge = el.querySelector('.btn-badge');
    if (badge) badge.style.display = 'none';
    updateTabBadges();
}

function updateTabBadges() {
    document.querySelectorAll('.tab-btn').forEach(tab => {
        const name = tab.dataset.tab;
        const content = document.getElementById('tab-' + name);
        if (!content) return;
        // count new items (buttons or other elements flagged)
        const items = content.querySelectorAll('[data-new="true"]');
        const count = items.length;
        const tbadge = tab.querySelector('.tab-badge');
        if (tbadge) {
            if (count > 0) {
                tbadge.dataset.count = count;
                tbadge.style.display = 'inline-block';
            } else {
                delete tbadge.dataset.count;
                tbadge.style.display = 'none';
            }
        }
    });
}

// show/hide element and mark new when becoming visible
function setVisible(el, visible) {
    if (!el) return;
    if (visible) {
        if (el.style.display === 'none' || el.style.display === '') {
            // newly shown
            markNew(el);
        }
        el.style.display = 'inline-block';
    } else {
        el.style.display = 'none';
    }
}

// when a button (or element) is affordable/or usable, mark a new dot
// when it transitions from unaffordable->affordable. Also disables the
// element when not affordable.
function setAffordability(el, canAfford) {
    if (!el) return;
    // Initialize affordable state if not set
    if (el.dataset.affordable === undefined) {
        el.dataset.affordable = "false";
    }
    const prev = el.dataset.affordable === "true";
    // disabled state is inverse of affordability
    el.disabled = !canAfford;
    // if we're newly affordable, highlight it
    if (canAfford && !prev) {
        markNew(el);
    }
    el.dataset.affordable = canAfford ? "true" : "false";
}