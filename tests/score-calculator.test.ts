import { ScoreCalculator } from '../assets/scripts/core/ScoreCalculator';
import { loadGameConfig } from './helpers';

describe('ScoreCalculator: формула очков', () => {
    const score = loadGameConfig().score;

    it('базовые очки — по числу сгоревших клеток', () => {
        expect(ScoreCalculator.Calculate(score, { removed: 3, groupSize: 3, hasSuperSpawn: false }))
            .toBe(3 * score.perTile);
    });

    it('бонус за размер группы начинается с groupBonusStartSize', () => {
        const base = ScoreCalculator.Calculate(score, { removed: 4, groupSize: 4, hasSuperSpawn: false });
        const expected = 4 * score.perTile + (4 - score.groupBonusStartSize + 1) * score.groupBonusPerTile;

        expect(base).toBe(expected);
        expect(base).toBeGreaterThan(ScoreCalculator.Calculate(score, { removed: 4, groupSize: 3, hasSuperSpawn: false }));
    });

    it('появление супер-тайла добавляет superTileBonus', () => {
        const without = ScoreCalculator.Calculate(score, { removed: 5, groupSize: 5, hasSuperSpawn: false });
        const withSuper = ScoreCalculator.Calculate(score, { removed: 5, groupSize: 5, hasSuperSpawn: true });

        expect(withSuper - without).toBe(score.superTileBonus);
    });

    it('perTile переопределяет очки за клетку (эффекты бустеров)', () => {
        expect(ScoreCalculator.Calculate(score, {
            removed: 25, groupSize: 0, hasSuperSpawn: false, perTile: 15
        })).toBe(375);
    });

    it('группа меньше порога бонуса не добавляет очков', () => {
        expect(ScoreCalculator.Calculate(score, { removed: 1, groupSize: 1, hasSuperSpawn: false }))
            .toBe(score.perTile);
    });
});
