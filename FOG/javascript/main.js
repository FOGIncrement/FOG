// ===== DOM LOADED =====
document.addEventListener("DOMContentLoaded", () => {
    // Try to load saved game first
    loadGame();
    
    initTabs();

    const buttons = [
        ["prayBtn", pray],
        ["gatherWoodBtn", gatherWood],
        ["gatherStoneBtn", gatherStone],
        ["gatherFoodBtn", gatherFood],
        ["buildShelterBtn", buildShelter],
        ["preachBtn", preach],
        ["trainingTechBtn", training],
        ["feedFollowersBtn", feedFollowers],
        ["trainHuntersBtn", trainHunters],
        ["buildRitualCircleBtn", () => {
            if (gameState.progression.faith >= 50 && game.ritualCircleBuilt < 1) {
                gameState.progression.faith -= 50;
                game.ritualCircleBuilt = 1;
                gameState.progression.faithPerFollower += 0.005;
                updateUI();
                saveGame();
            }
        }]
    ];

    buttons.forEach(([id, fn]) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("click", fn);
            // hover listener to clear new indicator
            el.addEventListener('mouseenter', () => {
                if (el.dataset.new === 'true') clearNew(el);
            });
        }
    });

    setInterval(gameTick, 1000);
    updateUI();
    saveGame();
});

// ===== TABS =====
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function activate(tabName) {
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
        tabContents.forEach(c => c.style.display = (c.id === `tab-${tabName}`) ? 'block' : 'none');
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => activate(btn.dataset.tab));
    });

    // default active tab: actions
    activate('actions');
}

function showTabs() {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    if (tabs.style.display === 'block') return;
    tabs.style.display = 'block';

    // move pray button into actions tab if present
    const pray = document.getElementById('prayBtn');
    const actions = document.getElementById('tab-actions');
    if (pray && actions && pray.parentElement !== actions) {
        actions.insertBefore(pray, actions.firstChild);
    }

    // ensure Actions tab selected
    const actionsBtn = document.querySelector('.tab-btn[data-tab="actions"]');
    if (actionsBtn) actionsBtn.classList.add('active');
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(c => c.style.display = (c.id === 'tab-actions') ? 'block' : 'none');
}

function hideTabs() {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    if (tabs.style.display === 'none') return;
    tabs.style.display = 'none';

    // move pray button back to main actions container
    const pray = document.getElementById('prayBtn');
    const main = document.getElementById('mainActions');
    if (pray && main && pray.parentElement !== main) {
        main.appendChild(pray);
    }
}
