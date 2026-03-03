const DICE_NOTATION_REGEX = /^(\d+)d(\d+)$/i;

export function parseDiceNotation(notation) {
    if (typeof notation !== 'string') {
        throw new Error('Dice notation must be a string like 1d6.');
    }

    const trimmed = notation.trim();
    const match = DICE_NOTATION_REGEX.exec(trimmed);
    if (!match) {
        throw new Error(`Invalid dice notation: ${notation}`);
    }

    const count = Number.parseInt(match[1], 10);
    const sides = Number.parseInt(match[2], 10);

    if (!Number.isFinite(count) || !Number.isFinite(sides) || count <= 0 || sides <= 0) {
        throw new Error(`Invalid dice notation: ${notation}`);
    }

    return { notation: `${count}d${sides}`, count, sides };
}

export function rollDice(notation, options = {}) {
    const { count, sides } = parseDiceNotation(notation);
    const parsedBonus = Number.isFinite(options.bonus) ? options.bonus : 0;
    const bonus = Math.trunc(parsedBonus);

    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const baseTotal = rolls.reduce((sum, value) => sum + value, 0);
    const total = Math.max(0, baseTotal + bonus);

    return {
        notation: `${count}d${sides}`,
        count,
        sides,
        rolls,
        baseTotal,
        bonus,
        total
    };
}
