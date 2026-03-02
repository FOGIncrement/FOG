function saveGame() {
    const saveData = {
        gameState,
        game
    };
    localStorage.setItem('fogGameSave', JSON.stringify(saveData));
    console.log('Game saved to localStorage');
}

function loadGame() {
    const saved = localStorage.getItem('fogGameSave');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // Restore gameState
            Object.assign(gameState, data.gameState);
            // Restore game
            Object.assign(game, data.game);
            console.log('Game loaded from localStorage');
            return true;
        } catch (e) {
            console.error('Failed to load save:', e);
            return false;
        }
    }
    return false;
}

function clearSave() {
    localStorage.removeItem('fogGameSave');
    console.log('Save cleared. Reloading...');
    location.reload();
}