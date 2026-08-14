// Uh, so the thinking is we replace all those muhfuckin gatherWood(), stone, food functions, 
// and have this as a more generic class that can be used for all 3 resources. 
// It has the same methods, but they work based on the instance's properties instead of hardcoded values. 
// So we can just create 3 instances of this class for wood, stone, and food, and call their gather() methods when needed. This should make the code cleaner and more maintainable.
import { gameState } from './GameState.js';

export class Resource {
    constructor(name, amount, gatherCost, gatherAmount, cap = Infinity) {
        this.name = name;
        this.amount = amount;
        this.gatherCost = gatherCost;
        this.gatherAmount = gatherAmount;
        this.cap = cap;
    }

    canGather() {
        return gameState.progression.faith >= this.gatherCost;
    }

    // Adds up to `amount`, clamped to the storage cap. Returns how much was
    // actually added (less than requested, or 0, if storage was near/at cap).
    add(amount) {
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        const room = Math.max(0, this.cap - this.amount);
        const applied = Math.min(amount, room);
        this.amount += applied;
        return applied;
    }

    gather() {
        if (!this.canGather()) return false;
        gameState.progression.faith -= this.gatherCost;
        const amountToAdd = typeof this.gatherAmount === 'function' ? this.gatherAmount() : this.gatherAmount;
        const applied = this.add(amountToAdd);
        return applied;
    }

    spend(amount) {
        if (this.amount >= amount) {
            this.amount -= amount;
            return true;
        }
        return false;
    }
}