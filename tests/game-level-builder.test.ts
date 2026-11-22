import { GameSession } from '../assets/scripts/core/GameSession';
import { GameLevelBuilder } from '../assets/scripts/core/GameLevelBuilder';
import { CeilType } from '../assets/scripts/core/Cell';
import { IFieldConfig } from '../assets/scripts/core/Config';
import { Random } from '../assets/scripts/core/Random';
import {
    colorsOf, createBuilder, createLevelGame, fieldLayout, fieldLayouts, loadBoosterConfig, loadGameConfig
} from './helpers';

const BASE_SEED = 777;

describe('GameLevelBuilder: сиды', () => {
    it('в конфиге нет зашитого сида, baseSeed = 0 даёт случайный сид сессии', () => {
        expect(loadGameConfig().random.baseSeed).toBe(0);

        const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
        const random = jest
            .spyOn(Math, 'random')
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.2);
        try {
            const first = createBuilder();
            const second = createBuilder();

            expect(first.BaseSeed).toBe(101);
            expect(second.BaseSeed).toBe(201);
            expect(first.BaseSeed).not.toBe(second.BaseSeed);
        } finally {
            now.mockRestore();
            random.mockRestore();
        }
    });

    it('базовый сид нормализуется: отрицательный и дробный приводятся к целому положительному', () => {
        expect(createBuilder(-777).BaseSeed).toBe(777);
        expect(createBuilder(12.9).BaseSeed).toBe(12);
    });

    it('нулевой, NaN и Infinity базовый сид заменяются случайным', () => {
        const random = jest
            .spyOn(Math, 'random')
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.1);
        const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
        try {
            expect(createBuilder(0).BaseSeed).toBe(101);
            expect(createBuilder(NaN).BaseSeed).toBe(101);
            expect(createBuilder(Infinity).BaseSeed).toBe(101);
        } finally {
            now.mockRestore();
            random.mockRestore();
        }
    });

    it('без секции random выбирает случайный базовый сид', () => {
        const config = loadGameConfig();
        delete (config as any).random;
        const random = jest.spyOn(Math, 'random').mockReturnValueOnce(0.5);
        const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
        try {
            const builder = new GameLevelBuilder(config);

            expect(builder.BaseSeed).toBe(501);
            expect(builder.Resolve(1, 0).Config.random.baseSeed).toBe(501);
        } finally {
            now.mockRestore();
            random.mockRestore();
        }
    });

    it('Resolve нормализует уровень и вариант поля к неотрицательным целым', () => {
        const builder = createBuilder(BASE_SEED);

        const zero = builder.Resolve(0, -5);
        const fraction = builder.Resolve(2.9, 1.8);
        const infinite = builder.Resolve(1, Infinity);

        expect(zero.Level).toBe(1);
        expect(zero.FieldVariant).toBe(0);
        expect(zero.Seed).toBe(builder.Resolve(1, 0).Seed);
        expect(fraction.Level).toBe(2);
        expect(fraction.FieldVariant).toBe(1);
        expect(fraction.Seed).toBe(builder.Resolve(2, 1).Seed);
        expect(infinite.FieldVariant).toBe(0);
        expect(infinite.Seed).toBe(builder.Resolve(1, 0).Seed);
    });

    it('одинаковые (сид, уровень, раскладка) дают одинаковый сид раскладки', () => {
        const first = createBuilder(BASE_SEED).Resolve(3, 2);
        const second = createBuilder(BASE_SEED).Resolve(3, 2);

        expect(first.Seed).toBe(second.Seed);
        expect(first.Config.board.colors).toEqual(second.Config.board.colors);
    });

    it('Resolve прокидывает базовый сид уровня в random.baseSeed', () => {
        const setup = createBuilder(BASE_SEED).Resolve(4, 3);

        expect(setup.Config.random.baseSeed).toBe(BASE_SEED);
        expect(setup.Config.levels).toEqual(loadGameConfig().levels);
    });

    it('каждый уровень и каждая раскладка получают разный сид', () => {
        const builder = createBuilder(BASE_SEED);
        const seeds = [
            builder.Resolve(1, 0).Seed,
            builder.Resolve(2, 0).Seed,
            builder.Resolve(3, 0).Seed,
            builder.Resolve(1, 1).Seed,
            builder.Resolve(1, 2).Seed
        ];

        expect(new Set(seeds).size).toBe(seeds.length);
    });

    it('участки уровней не пересекаются: вариант 999 ещё не совпадает с началом следующего уровня', () => {
        const builder = createBuilder(BASE_SEED);

        expect(builder.Resolve(1, 999).Seed).not.toBe(builder.Resolve(2, 0).Seed);
    });

    it('соседние уровни не выдают совпадающих чисел', () => {
        const builder = createBuilder(BASE_SEED);
        const firstSeed = builder.Resolve(1, 0).Seed;
        const secondSeed = builder.Resolve(2, 0).Seed;
        const thirdSeed = builder.Resolve(1, 1).Seed;

        Random.Reset(firstSeed);
        const values = new Array(50).fill(0).map(() => Random.Next());

        Random.Reset(secondSeed);
        values.forEach((value) => expect(Random.Next()).not.toBe(value));

        Random.Reset(thirdSeed);
        values.forEach((value) => expect(Random.Next()).not.toBe(value));
    });

    it('поле меняется на новом варианте поля того же уровня', () => {
        const builder = createBuilder(BASE_SEED);
        const firstSetup = builder.Resolve(1, 0);
        const secondSetup = builder.Resolve(1, 1);
        const first = GameSession.Create(firstSetup.Config, loadBoosterConfig(), firstSetup);
        first.Start();
        const second = GameSession.Create(secondSetup.Config, loadBoosterConfig(), secondSetup);
        second.Start();

        expect(colorsOf(first)).not.toBe(colorsOf(second));
    });

    it('матч хранит свой уровень, вариант поля и сид', () => {
        const setup = createBuilder(BASE_SEED).Resolve(3, 2);
        const game = GameSession.Create(setup.Config, loadBoosterConfig(), setup);

        expect(game.Level).toBe(3);
        expect(game.FieldVariant).toBe(2);
        expect(game.Seed).toBe(setup.Seed);
    });
});

describe('GameLevelBuilder: сложность растёт от уровня', () => {
    const config = loadGameConfig();
    const builder = new GameLevelBuilder(config, BASE_SEED);

    it('число цветов растёт до потолка, но не выше палитры', () => {
        const levels = [1, 2, 3, 4, 9];
        const counts = levels.map((level) => builder.Resolve(level, 0).Config.board.colors.length);
        const expected = levels.map((level) =>
            Math.min(
                config.board.colors.length,
                config.levels.colorsMax,
                config.levels.colorsStart + (level - 1) * config.levels.colorsPerLevel
            )
        );

        expect(counts).toEqual(expected);
        expect(Math.max.apply(null, counts)).toBeLessThanOrEqual(config.board.colors.length);
    });

    it('отрицательный colorsPerLevel сужает палитру, но не ниже двух цветов', () => {
        const narrow = loadGameConfig();
        narrow.levels.colorsPerLevel = -1;

        const setup = new GameLevelBuilder(narrow, BASE_SEED).Resolve(100, 0);

        expect(setup.Config.board.colors.length).toBe(2);
    });

    it('палитра уровня не выходит за board.colors даже при большом colorsMax', () => {
        const greedy = loadGameConfig();
        greedy.levels.colorsMax = greedy.board.colors.length + 10;

        const setup = new GameLevelBuilder(greedy, BASE_SEED).Resolve(100, 0);

        expect(setup.Config.board.colors).toEqual(greedy.board.colors);
    });

    it('цель уровня не опускается до нуля при отрицательном targetScorePerLevel', () => {
        const falling = loadGameConfig();
        falling.levels.targetScorePerLevel = -falling.match.targetScore;

        const setup = new GameLevelBuilder(falling, BASE_SEED).Resolve(100, 0);

        expect(setup.Config.match.targetScore).toBe(1);
    });

    it('цель по очкам растёт на targetScorePerLevel за уровень', () => {
        expect(builder.Resolve(1, 0).Config.match.targetScore).toBe(config.match.targetScore);
        expect(builder.Resolve(2, 0).Config.match.targetScore).toBe(config.match.targetScore + config.levels.targetScorePerLevel);
        expect(builder.Resolve(4, 0).Config.match.targetScore).toBe(config.match.targetScore + 3 * config.levels.targetScorePerLevel);
    });

    it('вероятность повтора падает с уровнем: repeatChance / уровень', () => {
        expect(builder.Resolve(1, 0).Config.board.repeatChance).toBeCloseTo(config.board.repeatChance, 10);
        expect(builder.Resolve(2, 0).Config.board.repeatChance).toBeCloseTo(config.board.repeatChance / 2, 10);
        expect(builder.Resolve(5, 0).Config.board.repeatChance).toBeCloseTo(config.board.repeatChance / 5, 10);
    });

    it('лимиты ходов и времени падают, но не ниже минимума', () => {
        expect(builder.Resolve(1, 0).Config.match.movesLimit).toBe(config.match.movesLimit);
        expect(builder.Resolve(2, 0).Config.match.movesLimit).toBe(config.match.movesLimit + config.levels.movesPerLevel);
        expect(builder.Resolve(100, 0).Config.match.movesLimit).toBe(config.levels.movesLimitMin);
        expect(builder.Resolve(100, 0).Config.match.timeLimitSeconds).toBe(config.levels.timeLimitMinSeconds);
    });

    it('лимит 0 остаётся «без лимита» на любом уровне', () => {
        const free = loadGameConfig();
        free.match.movesLimit = 0;
        free.match.timeLimitSeconds = 0;

        const setup = new GameLevelBuilder(free, BASE_SEED).Resolve(50, 0);

        expect(setup.Config.match.movesLimit).toBe(0);
        expect(setup.Config.match.timeLimitSeconds).toBe(0);
    });

    it('Resolve не мутирует исходный конфиг', () => {
        const original = loadGameConfig();
        const snapshot = JSON.parse(JSON.stringify(original));

        new GameLevelBuilder(original, BASE_SEED).Resolve(5, 3);

        expect(original).toEqual(snapshot);
    });

    it('типы клеток из конфига поля попадают в конфиг доски на всех уровнях', () => {
        const field: IFieldConfig = {
            version: 1,
            rows: 2,
            columns: 3,
            custom: true,
            board: [[0, 1, 0], [0, 0, 0]]
        };
        const config = loadGameConfig();
        const shaped = new GameLevelBuilder(config, BASE_SEED, [fieldLayout(config, field)]);

        const first = shaped.Resolve(1, 0).Config.board;
        const later = shaped.Resolve(7, 3).Config.board;

        expect(first.rows).toBe(2);
        expect(first.columns).toBe(3);
        expect(first.cells).toEqual([
            [CeilType.Normal, CeilType.Blocked, CeilType.Normal],
            [CeilType.Normal, CeilType.Normal, CeilType.Normal]
        ]);
        expect(later.cells).toEqual(first.cells);
    });

    it('вариант поля выбирается по модулю количества раскладок', () => {
        const config = loadGameConfig();
        const fields = fieldLayouts(config);
        const builder = new GameLevelBuilder(config, BASE_SEED, fields);

        expect(builder.FieldCount).toBe(fields.length);
        expect(builder.Resolve(1, 0).Config.board.cells).toBeNull();
        expect(builder.Resolve(1, 1).Config.board.cells).toEqual(fields[1].Types);
        expect(builder.Resolve(1, fields.length).Config.board.cells).toBeNull();
    });

    it('без конфига поля остаётся обычная сетка из game-config', () => {
        const config = loadGameConfig();

        const board = new GameLevelBuilder(config, BASE_SEED).Resolve(1, 0).Config.board;

        expect(board.rows).toBe(config.board.rows);
        expect(board.columns).toBe(config.board.columns);
        expect(board.cells).toBeNull();
    });

    it('матч строится только из цветов уровня', () => {
        const setup = builder.Resolve(1, 0);
        const game = createLevelGame(BASE_SEED, 1, 0);

        expect(setup.Config.board.colors.length).toBe(config.levels.colorsStart);
        game.Board.GetPlacements().forEach((placement) => {
            expect(setup.Config.board.colors).toContain(placement.Tile.Type);
        });
    });

    it('конфиг уровня не делит секции с исходным конфигом', () => {
        const source = loadGameConfig();
        const levelBuilder = new GameLevelBuilder(source, BASE_SEED);
        const setup = levelBuilder.Resolve(2, 0);

        setup.Config.score.perTile = 999;
        setup.Config.levels.colorsMax = 99;
        setup.Config.animation.swapDuration = 99;
        setup.Config.shuffle.maxAttempts = 99;

        expect(source.score.perTile).not.toBe(999);
        expect(source.levels.colorsMax).not.toBe(99);
        expect(source.animation.swapDuration).not.toBe(99);
        expect(source.shuffle.maxAttempts).not.toBe(99);
    });
});
