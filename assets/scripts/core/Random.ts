import { Seeds } from './Seeds';

/**
 * Детерминированный генератор псевдослучайных чисел — простой линейный конгруэнтный
 * (Lehmer / MINSTD). Сид приходит из паспорта матча (`GameSession`), поэтому поле
 * и перемешивания воспроизводимы, а `Math.random()` в логике не используется.
 *
 * Одновременно идёт только один матч, поэтому состояние генератора одно на процесс:
 * экземпляры не создаются, а методы вызываются статически. Перед стартом матча
 * последовательность перезапускается через `Reset` сидом из паспорта матча.
 *
 * Устройство: каждое следующее состояние — это `(состояние * MULTIPLIER) % MODULUS`
 * с параметрами MINSTD, а число в [0, 1) — состояние, делённое на `MODULUS`.
 * Произведение не превышает 2^53, поэтому JavaScript считает его точно: ни битовые
 * операторы, ни `Math.imul` не нужны.
 */
export class Random {
    /** Параметры алгоритма MINSTD: модуль и множитель. */
    private static readonly MODULUS: number = 2147483647;
    private static readonly MULTIPLIER: number = 48271;

    /** Текущее состояние, всегда в [1, MODULUS - 1]; до первого `Reset` равно 1. */
    private static _state: number = 1;

    /** Перезапуск последовательности: 0/NaN/∞ в проекте означают «сида нет» и заменяются на 1. */
    public static Reset(seed: number): void {
        Random._state = Seeds.ForRandom(seed);
    }

    /** Следующее число в [0, 1). */
    public static Next(): number {
        Random._state = (Random._state * Random.MULTIPLIER) % Random.MODULUS;
        return Random._state / Random.MODULUS;
    }

    public static NextInt(maxExclusive: number): number {
        if (maxExclusive <= 0) {
            return 0;
        }
        return Math.floor(Random.Next() * maxExclusive);
    }
}

