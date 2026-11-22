import { Seeds } from '../assets/scripts/core/Seeds';

describe('Seeds: единая нормализация сида', () => {
    it('ForRandom: 0/NaN/∞ → 1, число приводится к диапазону', () => {
        expect(Seeds.ForRandom(0)).toBe(1);
        expect(Seeds.ForRandom(NaN)).toBe(1);
        expect(Seeds.ForRandom(Infinity)).toBe(1);
        expect(Seeds.ForRandom(7)).toBe(8);
        expect(Seeds.ForRandom(-7)).toBe(8);
        expect(Seeds.ForRandom(2147483646)).toBe(1);
    });

    it('ForBase: 0 → случайный, положительный — как есть', () => {
        const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
        const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
        try {
            expect(Seeds.ForBase(0)).toBe(501);
        } finally {
            now.mockRestore();
            random.mockRestore();
        }
        expect(Seeds.ForBase(42)).toBe(42);
    });

    it('ForLevel: вариант не пересекается со следующим уровнем', () => {
        const collision = Seeds.ForLevel(100, 1, 1000, 1000);
        const nextLevel = Seeds.ForLevel(100, 2, 0, 1000);

        expect(collision).toBe(nextLevel - 1000);
        expect(Seeds.ForLevel(100, 1, 3, 1000)).toBe(Seeds.ForLevel(100, 1, 3, 1000));
        expect(Seeds.ForLevel(100, 0, -5, 1000)).toBe(Seeds.ForLevel(100, 1, 0, 1000));
    });
});
