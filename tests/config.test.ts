import { ConfigValidator } from '../assets/scripts/core/ConfigValidator';
import { TileType } from '../assets/scripts/core/Tile';
import { loadBoosterConfig, loadFieldConfig, loadFieldConfigs, loadGameConfig } from './helpers';

describe('Валидация конфигов', () => {
    it('конфиги проекта проходят проверку', () => {
        expect(() => ConfigValidator.ValidateGame(loadGameConfig())).not.toThrow();
        expect(() => ConfigValidator.ValidateBoosters(loadBoosterConfig())).not.toThrow();
        expect(() => ConfigValidator.ValidateField(loadFieldConfig())).not.toThrow();
        expect(() => ConfigValidator.ValidateFields(loadFieldConfigs())).not.toThrow();
    });

    it('конфиг поля: стандартное поле и фигурное поле заданной формы', () => {
        const standard = loadFieldConfig();
        expect(standard.custom).toBe(false);
        expect(standard.rows).toBeGreaterThanOrEqual(2);
        expect(standard.columns).toBeGreaterThanOrEqual(2);

        const shaped = loadFieldConfig();
        shaped.custom = true;
        shaped.rows = 3;
        shaped.columns = 3;
        shaped.board = [[0, 1, 0], [0, 0, 0], [0, 1, 0]];
        expect(() => ConfigValidator.ValidateField(shaped)).not.toThrow();
    });

    it('битый конфиг поля даёт понятную ошибку', () => {
        const badRows = loadFieldConfig();
        badRows.rows = 1;
        expect(() => ConfigValidator.ValidateField(badRows)).toThrow(/field config: rows/);

        const noCustom = loadFieldConfig();
        delete (noCustom as any).custom;
        expect(() => ConfigValidator.ValidateField(noCustom)).toThrow(/custom must be a boolean/);

        const noBoard = loadFieldConfig();
        noBoard.custom = true;
        expect(() => ConfigValidator.ValidateField(noBoard)).toThrow(/board is missing/);

        const shortMatrix = loadFieldConfig();
        shortMatrix.custom = true;
        shortMatrix.rows = 3;
        shortMatrix.columns = 3;
        shortMatrix.board = [[0, 0, 0], [0, 0, 0]];
        expect(() => ConfigValidator.ValidateField(shortMatrix)).toThrow(/must contain 3 rows/);

        const unknownType = loadFieldConfig();
        unknownType.custom = true;
        unknownType.rows = 2;
        unknownType.columns = 3;
        unknownType.board = [[0, 0, 0], [0, 0, 7]];
        expect(() => ConfigValidator.ValidateField(unknownType)).toThrow(/unknown cell type 7/);

        const noPlayable = loadFieldConfig();
        noPlayable.custom = true;
        noPlayable.rows = 2;
        noPlayable.columns = 2;
        noPlayable.board = [[1, 1], [1, 1]];
        expect(() => ConfigValidator.ValidateField(noPlayable)).toThrow(/no playable cells/);

        const badRowLength = loadFieldConfig();
        badRowLength.custom = true;
        badRowLength.rows = 2;
        badRowLength.columns = 3;
        badRowLength.board = [[0, 0, 0], [0, 0]];
        expect(() => ConfigValidator.ValidateField(badRowLength)).toThrow(/board row 1 must contain 3 numbers/);

        const stringRows = loadFieldConfig();
        stringRows.custom = true;
        stringRows.rows = 2;
        stringRows.columns = 3;
        (stringRows as any).board = ['...', '...'];
        expect(() => ConfigValidator.ValidateField(stringRows)).toThrow(/board row 0 must contain 3 numbers/);

        const notMatrix = loadFieldConfig();
        notMatrix.custom = true;
        (notMatrix as any).board = '...';
        expect(() => ConfigValidator.ValidateField(notMatrix)).toThrow(/board must be a matrix/);

        const emptyBoard = loadFieldConfig();
        emptyBoard.custom = true;
        emptyBoard.board = [];
        expect(() => ConfigValidator.ValidateField(emptyBoard)).toThrow(/board is missing/);

        const fractionalRows = loadFieldConfig();
        fractionalRows.rows = 2.5;
        expect(() => ConfigValidator.ValidateField(fractionalRows)).toThrow(/must be an integer >= 2/);

        const infiniteColumns = loadFieldConfig();
        infiniteColumns.columns = Infinity;
        expect(() => ConfigValidator.ValidateField(infiniteColumns)).toThrow(/must be an integer >= 2/);
    });

    it('field-config — непустой массив вариантов, ошибка указывает индекс', () => {
        expect(() => ConfigValidator.ValidateFields([])).toThrow(/list of field variants is empty/);
        expect(() => (ConfigValidator as any).ValidateFields('not a list')).toThrow(/list of field variants is empty/);

        const variants = loadFieldConfigs();
        variants[1].rows = 1;
        expect(() => ConfigValidator.ValidateFields(variants)).toThrow(/field config\[1\]: rows/);
    });

    it('валидатор поля не мутирует конфиг', () => {
        const field = loadFieldConfig();
        field.custom = true;
        field.rows = 2;
        field.columns = 2;
        field.board = [[0, 1], [1, 0]];
        const snapshot = JSON.parse(JSON.stringify(field));

        ConfigValidator.ValidateField(field);

        expect(field).toEqual(snapshot);
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
        ['fallDuration', 'blastDuration', 'spawnDuration', 'boardAppearStagger'].forEach((key) => {
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
        fewColors.board.colors = [TileType.Blue];
        expect(() => ConfigValidator.ValidateGame(fewColors)).toThrow(/colors/);

        const unknownColor = loadGameConfig();
        unknownColor.board.colors = [TileType.Blue, 'orange' as TileType];
        expect(() => ConfigValidator.ValidateGame(unknownColor)).toThrow(/unknown tile type/);

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

        const noStagger = loadGameConfig();
        delete (noStagger.animation as any).boardAppearStagger;
        expect(() => ConfigValidator.ValidateGame(noStagger)).toThrow(/boardAppearStagger/);

        const negativeStagger = loadGameConfig();
        negativeStagger.animation.boardAppearStagger = -0.01;
        expect(() => ConfigValidator.ValidateGame(negativeStagger)).toThrow(/boardAppearStagger/);

        const stringStagger = loadGameConfig();
        (stringStagger.animation as any).boardAppearStagger = '0.012';
        expect(() => ConfigValidator.ValidateGame(stringStagger)).toThrow(/boardAppearStagger/);
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

        const fractionalBoard = loadGameConfig();
        fractionalBoard.board.rows = 9.5;
        expect(() => ConfigValidator.ValidateGame(fractionalBoard)).toThrow(/board.rows must be an integer/);
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

        const unknownSuper = loadBoosterConfig();
        (unknownSuper.superTiles.spawnRules[0].types as any) = ['nope'];
        expect(() => ConfigValidator.ValidateBoosters(unknownSuper)).toThrow(/unknown super tile type/);
    });

    it('поле, где группа недостижима, отклоняется при известном minGroupSize', () => {
        const isolated = loadFieldConfig();
        isolated.custom = true;
        isolated.rows = 5;
        isolated.columns = 5;
        isolated.board = [
            [0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 0, 1, 0]
        ];

        expect(() => ConfigValidator.ValidateField(isolated, 'field config[1]', 3))
            .toThrow(/largest playable area 1 is smaller than board\.minGroupSize 3/);
    });

    it('поле с областью нужного размера проходит проверку', () => {
        const pairs = loadFieldConfig();
        pairs.custom = true;
        pairs.rows = 2;
        pairs.columns = 4;
        pairs.board = [[0, 0, 1, 1], [0, 0, 1, 1]];

        expect(() => ConfigValidator.ValidateField(pairs, 'field config', 2)).not.toThrow();
        expect(() => ConfigValidator.ValidateField(pairs, 'field config', 5))
            .toThrow(/largest playable area 4/);
    });

    it('стандартное поле проверяется по площади', () => {
        const tiny = loadFieldConfig();
        tiny.rows = 2;
        tiny.columns = 2;

        expect(() => ConfigValidator.ValidateField(tiny, 'field config', 3)).not.toThrow();
        expect(() => ConfigValidator.ValidateField(tiny, 'field config', 5))
            .toThrow(/largest playable area 4/);
    });

    it('конфиги проекта проходят проверку с minGroupSize из game-config', () => {
        const game = loadGameConfig();

        expect(() => ConfigValidator.ValidateFields(loadFieldConfigs(), game.board.minGroupSize)).not.toThrow();
    });

    it('валидатор не мутирует конфиг', () => {
        const config = loadGameConfig();
        const snapshot = JSON.parse(JSON.stringify(config));

        ConfigValidator.ValidateGame(config);

        expect(config).toEqual(snapshot);
    });

    it('score: обязательные бонусные поля проверяются', () => {
        const negativeBonus = loadGameConfig();
        negativeBonus.score.groupBonusPerTile = -1;
        expect(() => ConfigValidator.ValidateGame(negativeBonus)).toThrow(/groupBonusPerTile/);

        const negativeSuper = loadGameConfig();
        negativeSuper.score.superTileBonus = -5;
        expect(() => ConfigValidator.ValidateGame(negativeSuper)).toThrow(/superTileBonus/);

        const noStart = loadGameConfig();
        delete (noStart.score as any).groupBonusStartSize;
        expect(() => ConfigValidator.ValidateGame(noStart)).toThrow(/groupBonusStartSize/);
    });

    it('shuffle.maxAttempts должен быть целым >= 1', () => {
        const zero = loadGameConfig();
        zero.shuffle.maxAttempts = 0;
        expect(() => ConfigValidator.ValidateGame(zero)).toThrow(/maxAttempts/);

        const fractional = loadGameConfig();
        fractional.shuffle.maxAttempts = 1.5;
        expect(() => ConfigValidator.ValidateGame(fractional)).toThrow(/maxAttempts/);
    });

    it('animation: каждая длительность — число >= 0, easing непустой', () => {
        const negativeSwap = loadGameConfig();
        negativeSwap.animation.swapDuration = -0.1;
        expect(() => ConfigValidator.ValidateGame(negativeSwap)).toThrow(/animation\.swapDuration/);

        const noBlast = loadGameConfig();
        delete (noBlast.animation as any).blastDuration;
        expect(() => ConfigValidator.ValidateGame(noBlast)).toThrow(/animation\.blastDuration/);

        const noEasing = loadGameConfig();
        noEasing.animation.fallEasing = '';
        expect(() => ConfigValidator.ValidateGame(noEasing)).toThrow(/fallEasing/);
    });

    it('board.colors не должен содержать дубликатов', () => {
        const duplicate = loadGameConfig();
        duplicate.board.colors = [duplicate.board.colors[0], duplicate.board.colors[0]];

        expect(() => ConfigValidator.ValidateGame(duplicate)).toThrow(/duplicates/);
    });

    it('version обязателен в game- и booster-конфиге', () => {
        const noGameVersion = loadGameConfig();
        delete (noGameVersion as any).version;
        expect(() => ConfigValidator.ValidateGame(noGameVersion)).toThrow(/version/);

        const noBoosterVersion = loadBoosterConfig();
        delete (noBoosterVersion as any).version;
        expect(() => ConfigValidator.ValidateBoosters(noBoosterVersion)).toThrow(/version/);
    });

    it('бустеры: дубликаты типов и неизвестные формы отклоняются', () => {
        const duplicate = loadBoosterConfig();
        duplicate.boosters.push({ ...duplicate.boosters[0] });
        expect(() => ConfigValidator.ValidateBoosters(duplicate)).toThrow(/duplicate types/);

        const badShape = loadBoosterConfig();
        badShape.boosters[1].effect.shape = 'rhombus';
        expect(() => ConfigValidator.ValidateBoosters(badShape)).toThrow(/unknown shape "rhombus"/);

        const badSuperShape = loadBoosterConfig();
        badSuperShape.superTiles.effects.bomb.shape = 'spiral';
        expect(() => ConfigValidator.ValidateBoosters(badSuperShape)).toThrow(/unknown shape "spiral"/);
    });
});
