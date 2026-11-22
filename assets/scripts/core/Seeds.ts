/**
 * Единые правила сида: одно место для нормализации и раскладки по уровням.
 * Разделены два смысла нуля: «нет сида у генератора» (→ 1) и «выбрать базовый сид»
 * (→ случайный), чтобы не расходиться между `Random` и `GameLevelBuilder`.
 */
export class Seeds {
    /** Диапазон состояния MINSTD: [1, MODULUS - 1]. */
    private static readonly STATE_RANGE: number = 2147483646;

    /** Сид для `Random.Reset`: 0/NaN/∞ → 1, иначе |floor| по модулю диапазона. */
    public static ForRandom(seed: number): number {
        const value = Math.floor(Math.abs(seed));
        return isFinite(value) ? 1 + (value % Seeds.STATE_RANGE) : 1;
    }

    /** Базовый сид раскладки: 0/NaN/∞ означают «выбрать случайный». */
    public static ForBase(seed: number): number {
        const value = Math.floor(Math.abs(seed));
        return isFinite(value) && value > 0 ? value : Seeds.Random();
    }

    /** Сид уровня: базовый + уровень + вариант поля (варианты не пересекаются с уровнями). */
    public static ForLevel(base: number, level: number, variant: number, variantsPerLevel: number): number {
        const levelNumber = Math.max(1, Math.floor(level) || 1);
        const variantNumber = isFinite(variant) ? Math.max(0, Math.floor(variant) || 0) : 0;
        return Seeds.ForRandom(base) + levelNumber * variantsPerLevel + variantNumber % variantsPerLevel;
    }

    /** Случайный базовый сид для `baseSeed = 0` в конфиге. */
    public static Random(): number {
        return Math.floor(Date.now() * Math.random()) + 1;
    }
}
