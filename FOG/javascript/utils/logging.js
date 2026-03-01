// ===== LOGGING =====
function addLog(msg) {
    const logEl = document.getElementById("log");
    if (!logEl) return;
    const p = document.createElement("p");
    p.innerText = "• " + msg;
    p.style.opacity = '1';
    p.style.transition = `opacity ${game.logFadeDuration}ms ease`;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;

    // schedule fade and removal
    const lifetimeMs = (game.logMessageLifetime || 3) * 1000;
    setTimeout(() => {
        p.style.opacity = '0';
        setTimeout(() => { if (p.parentElement) p.remove(); }, game.logFadeDuration || 500);
    }, lifetimeMs);
}