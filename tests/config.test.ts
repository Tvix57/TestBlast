import { ConfigValidator } from '../assets/scripts/core/ConfigValidator';
import { loadBoosterConfig, loadGameConfig } from './helpers';

describe('Валидация конфигов', () => {
    it('конфиги проекта проходят проверку', () => {
        expect(() => ConfigValidator.ValidateGame(loadGameConfig())).not.toThrow();
        expect(() => ConfigValidator.ValidateBoosters(loadBoosterConfig())).not.toThrow();
    });

    it('значения конфига в допустимых пределах', () => {
        const config = loadGameConfig();
        expect(config.match.targetScore).toBeGreaterThan(0);
        expect(config.match.movesLimit).toBeGreaterThanOrEqual(0);
        expect(config.match.timeLimitSeconds).toBeGreaterThanOrEqual(0);
        expect(config.board.colors.length).toBeGreaterThanOrEqual(2);
        expect(config.board.columns).toBeGreaterThanOrEqual(2);
        expect(config.board.rows).toBeGreaterThanOrEqual(2);
        expect(config.board.repeatChance).toBeGreaterThanOrEqual(0);
        expect(config.board.repeatChance).toBeLessThanOrEqual(1);
        expect(config.shuffle.maxAttempts).toBeGreaterThanOrEqual(1);
        ['swapDuration', 'fallDuration', 'blastDuration', 'spawnDuration'].forEach((key) => {
            expect(typeof config.animation[key]).toBe('number');
        });
    });

    it('битый game-config даёт понятную ошибку', () => {
        const noMatch = loadGameConfig();
        delete (noMatch as any).match;
        expect(() => ConfigValidator.ValidateGame(noMatch)).toThrow(/match/);

        const zeroTarget = loadGameConfig();
        zeroTarget.match.targetScore = 0;
        expect(() => ConfigValidator.ValidateGame(zeroTarget)).toThrow(/targetScore/);

        const fewColors = loadGameConfig();
        fewColors.board.colors = ['blue'];
        expect(() => ConfigValidator.ValidateGame(fewColors)).toThrow(/colors/);

        const levelsBeyondPalette = loadGameConfig();
        levelsBeyondPalette.levels.colorsMax = levelsBeyondPalette.board.colors.length + 1;
        expect(() => ConfigValidator.ValidateGame(levelsBeyondPalette)).toThrow(/board.colors.length/);

        const minMovesAboveBase = loadGameConfig();
        minMovesAboveBase.levels.movesLimitMin = minMovesAboveBase.match.movesLimit + 1;
        expect(() => ConfigValidator.ValidateGame(minMovesAboveBase)).toThrow(/movesLimitMin/);

        const minTimeAboveBase = loadGameConfig();
        minTimeAboveBase.levels.timeLimitMinSeconds = minTimeAboveBase.match.timeLimitSeconds + 1;
        expect(() => ConfigValidator.ValidateGame(minTimeAboveBase)).toThrow(/timeLimitMinSeconds/);

        const repeatAboveOne = loadGameConfig();
        repeatAboveOne.board.repeatChance = 1.5;
        expect(() => ConfigValidator.ValidateGame(repeatAboveOne)).toThrow(/repeatChance/);

        const repeatBelowZero = loadGameConfig();
        repeatBelowZero.board.repeatChance = -0.1;
        expect(() => ConfigValidator.ValidateGame(repeatBelowZero)).toThrow(/repeatChance/);

        const noRepeatChance = loadGameConfig();
        delete (noRepeatChance.board as any).repeatChance;
        expect(() => ConfigValidator.ValidateGame(noRepeatChance)).toThrow(/repeatChance/);
    });

    it('отсутствие обязательных секций и полей ловится до запуска матча', () => {
        const noBoard = loadGameConfig();
        delete (noBoard as any).board;
        expect(() => ConfigValidator.ValidateGame(noBoard)).toThrow(/board.columns/);

        const noScore = loadGameConfig();
        delete (noScore as any).score;
        expect(() => ConfigValidator.ValidateGame(noScore)).toThrow(/score.perTile/);

        const noShuffle = loadGameConfig();
        delete (noShuffle as any).shuffle;
        expect(() => ConfigValidator.ValidateGame(noShuffle)).toThrow(/shuffle/);

        const noAnimation = loadGameConfig();
        delete (noAnimation as any).animation;
        expect(() => ConfigValidator.ValidateGame(noAnimation)).toThrow(/animation/);

        const noRandom = loadGameConfig();
        delete (noRandom as any).random;
        expect(() => ConfigValidator.ValidateGame(noRandom)).toThrow(/random/);

        const noLevels = loadGameConfig();
        delete (noLevels as any).levels;
        expect(() => ConfigValidator.ValidateGame(noLevels)).toThrow(/levels/);
    });

    it('проверяет границы полей поля, счёта и уровней', () => {
        const badGap = loadGameConfig();
        badGap.board.cellGapRatio = -0.1;
        expect(() => ConfigValidator.ValidateGame(badGap)).toThrow(/cellGapRatio/);

        const badGroup = loadGameConfig();
        badGroup.board.minGroupSize = 1;
        expect(() => ConfigValidator.ValidateGame(badGroup)).toThrow(/minGroupSize/);

        const badPerTile = loadGameConfig();
        badPerTile.score.perTile = 0;
        expect(() => ConfigValidator.ValidateGame(badPerTile)).toThrow(/perTile/);

        const badSeed = loadGameConfig();
        badSeed.random.baseSeed = -1;
        expect(() => ConfigValidator.ValidateGame(badSeed)).toThrow(/baseSeed/);

        const badColorsStart = loadGameConfig();
        badColorsStart.levels.colorsStart = 1;
        expect(() => ConfigValidator.ValidateGame(badColorsStart)).toThrow(/colorsStart/);

        const invertedPalette = loadGameConfig();
        invertedPalette.levels.colorsStart = 4;
        invertedPalette.levels.colorsMax = 3;
        expect(() => ConfigValidator.ValidateGame(invertedPalette)).toThrow(/colorsMax/);

        const badSignedStep = loadGameConfig();
        badSignedStep.levels.colorsPerLevel = NaN;
        expect(() => ConfigValidator.ValidateGame(badSignedStep)).toThrow(/colorsPerLevel/);
    });

    it('шаги сложности знаковые: баланс сам задаёт направление', () => {
        const tuning = loadGameConfig();
        tuning.levels.colorsPerLevel = -1;
        tuning.levels.targetScorePerLevel = -50;

        expect(() => ConfigValidator.ValidateGame(tuning)).not.toThrow();
    });

    it('битый booster-config даёт понятную ошибку', () => {
        const noEffect = loadBoosterConfig();
        delete noEffect.boosters[1].effect;
        expect(() => ConfigValidator.ValidateBoosters(noEffect)).toThrow(/effect/);

        const noSuperEffects = loadBoosterConfig();
        delete (noSuperEffects.superTiles as any).effects;
        expect(() => ConfigValidator.ValidateBoosters(noSuperEffects)).toThrow(/superTiles/);

        const emptyBoosters = loadBoosterConfig();
        emptyBoosters.boosters = [];
        expect(() => ConfigValidator.ValidateBoosters(emptyBoosters)).toThrow(/empty/);

        const unknownType = loadBoosterConfig();
        (unknownType.boosters[0] as any).type = 'nope';
        expect(() => ConfigValidator.ValidateBoosters(unknownType)).toThrow(/unknown booster type/);

        const unknownTargeting = loadBoosterConfig();
        (unknownTargeting.boosters[0] as any).targeting = 'area';
        expect(() => ConfigValidator.ValidateBoosters(unknownTargeting)).toThrow(/unknown targeting/);
    });

    it('валидатор не мутирует конфиг', () => {
        const config = loadGameConfig();
        const snapshot = JSON.parse(JSON.stringify(config));

        ConfigValidator.ValidateGame(config);

        expect(config).toEqual(snapshot);
    });
});
