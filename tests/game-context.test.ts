import { GameContext } from '../assets/scripts/core/GameContext';
import { createTestContext, loadBoosterConfig, loadGameConfig } from './helpers';

const BASE_SEED = 4242;

describe('GameContext: переходы между матчами', () => {
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('стартует с уровня 1, варианта поля 0 и воспроизводимого сида', () => {
        const context = createTestContext();

        expect(context.Session.Level).toBe(1);
        expect(context.Session.FieldVariant).toBe(0);
        expect(context.Session.Seed).toBe(context.LevelBuilder.Resolve(1, 0).Seed);
        expect(context.LevelBuilder.BaseSeed).toBe(BASE_SEED);
        expect(context.Session.Config.random.baseSeed).toBe(BASE_SEED);
    });

    it('бустер-конфиг доходит до конструктора матча', () => {
        const context = createTestContext();

        expect(context.Session.BoosterConfig).toEqual(loadBoosterConfig());
        expect(context.NextLevel().BoosterConfig).toEqual(loadBoosterConfig());
    });

    it('NextLevel повышает уровень, сбрасывает вариант поля и меняет сложность/сид', () => {
        const context = createTestContext();
        const first = context.Session;

        const next = context.NextLevel();

        expect(next).not.toBe(first);
        expect(next.Level).toBe(2);
        expect(next.FieldVariant).toBe(0);
        expect(next.Seed).not.toBe(first.Seed);
        expect(next.Config.match.targetScore)
            .toBe(first.Config.match.targetScore + loadGameConfig().levels.targetScorePerLevel);
    });

    it('RestartLevel оставляет уровень, увеличивает вариант поля и даёт другое поле', () => {
        const context = createTestContext();
        const first = context.Session;

        const restarted = context.RestartLevel();

        expect(restarted).not.toBe(first);
        expect(restarted.Level).toBe(first.Level);
        expect(restarted.FieldVariant).toBe(first.FieldVariant + 1);
        expect(restarted.Seed).not.toBe(first.Seed);
        expect(restarted.Config.match.targetScore).toBe(first.Config.match.targetScore);
    });

    it('без базового сида контекст выбирает случайный, но воспроизводимый внутри себя', () => {
        const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
        const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0.25);
        try {
            const context = new GameContext(loadGameConfig(), loadBoosterConfig());

            expect(context.LevelBuilder.BaseSeed).toBe(251);
            expect(context.Session.Seed).toBe(context.LevelBuilder.Resolve(1, 0).Seed);
        } finally {
            now.mockRestore();
            random.mockRestore();
        }
    });

    it('прогрессия воспроизводима: одинаковый базовый сид — одинаковые матчи', () => {
        const first = createTestContext();
        const second = createTestContext();

        first.RestartLevel();
        second.RestartLevel();
        first.NextLevel();
        second.NextLevel();

        expect({
            level: first.Session.Level,
            fieldVariant: first.Session.FieldVariant,
            seed: first.Session.Seed
        }).toEqual({
            level: second.Session.Level,
            fieldVariant: second.Session.FieldVariant,
            seed: second.Session.Seed
        });
    });
});
