import { game } from '../classes/GameState.js';

// badge helpers
export function markNew(el) {
    if (!el) return;
    const key = el.id;
    if (key && game.seenItems && game.seenItems[key] === true) return;
    if (el.dataset.seen === "true") return;
    el.dataset.new = "true";
    // if button and no badge span, create one
    if (el.tagName === 'BUTTON' && !el.classList.contains('tab-btn')) {
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

export function clearNew(el) {
    if (!el) return;
    const key = el.id;
    if (key) {
        if (!game.seenItems || typeof game.seenItems !== 'object') game.seenItems = {};
        game.seenItems[key] = true;
    }
    el.dataset.seen = "true";
    el.dataset.new = "false";
    const badge = el.querySelector('.btn-badge');
    if (badge) badge.style.display = 'none';
    updateTabBadges();
}

export function updateTabBadges() {
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
export function setVisible(el, visible) {
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
export function setAffordability(el, canAfford) {
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

export function showTabs() {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    if (tabs.style.display === 'block') return;
    tabs.style.display = 'block';

    const pray = document.getElementById('prayBtn');
    const actions = document.getElementById('tab-actions');
    if (pray && actions && pray.parentElement !== actions) {
        actions.insertBefore(pray, actions.firstChild);
    }

    const actionsBtn = document.querySelector('.tab-btn[data-tab="actions"]');
    if (actionsBtn) actionsBtn.classList.add('active');
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(c => c.style.display = (c.id === 'tab-actions') ? 'block' : 'none');
}

export function hideTabs() {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    if (tabs.style.display === 'none') return;
    tabs.style.display = 'none';

    const pray = document.getElementById('prayBtn');
    const main = document.getElementById('mainActions');
    if (pray && main && pray.parentElement !== main) {
        main.appendChild(pray);
    }
}

// Update button text while keeping any badge spans intact
export function setButtonLabel(el, label) {
    if (!el) return;
    const btnBadge = el.querySelector('.btn-badge');
    const tabBadge = el.querySelector('.tab-badge');

    el.textContent = label;

    if (btnBadge) el.appendChild(btnBadge);
    if (tabBadge) el.appendChild(tabBadge);
}