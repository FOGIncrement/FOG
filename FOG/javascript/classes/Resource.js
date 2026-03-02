// Uh, so the thinking is we replace all those muhfuckin gatherWood(), stone, food functions, 
// and have this as a more generic class that can be used for all 3 resources. 
// It has the same methods, but they work based on the instance's properties instead of hardcoded values. 
// So we can just create 3 instances of this class for wood, stone, and food, and call their gather() methods when needed. This should make the code cleaner and more maintainable.

class Resource {
    constructor(name, amount, gatherCost, gatherAmount) {
        this.name = name;
        this.amount = amount;
        this.gatherCost = gatherCost;
        this.gatherAmount = gatherAmount;
    }

    canGather() {
        return gameState.progression.faith >= this.gatherCost;
    }

    gather() {
        if (!this.canGather()) return false;
        gameState.progression.faith -= this.gatherCost;
        this.amount += this.gatherAmount;
        return true;
    }

    spend(amount) {
        if (this.amount >= amount) {
            this.amount -= amount;
            return true;
        }
        return false;
    }
}