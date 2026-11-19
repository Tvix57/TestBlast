import { BoosterTargeting, BoosterType } from './BoosterRules';
import { IBoosterConfigFile, IGameConfig } from './Config';

export class ConfigValidator {
    public static ValidateGame(config: IGameConfig): void {
        ConfigValidator.Require(config, 'game config');
        ConfigValidator.RequireNumber(config.match, 'match.targetScore', config.match && config.match.targetScore, 1);
        ConfigValidator.RequireNumber(config.match, 'match.movesLimit', config.match && config.match.movesLimit, 0);
        ConfigValidator.RequireNumber(config.match, 'match.timeLimitSeconds', config.match && config.match.timeLimitSeconds, 0);
        ConfigValidator.RequireNumber(config.board, 'board.columns', config.board && config.board.columns, 2);
        ConfigValidator.RequireNumber(config.board, 'board.rows', config.board && config.board.rows, 2);
        ConfigValidator.RequireNumber(config.board, 'board.cellGapRatio', config.board && config.board.cellGapRatio, 0);
        ConfigValidator.RequireNumber(config.board, 'board.minGroupSize', config.board && config.board.minGroupSize, 2);
        ConfigValidator.RequireNumber(config.score, 'score.perTile', config.score && config.score.perTile, 1);
        if (!config.board || !config.board.colors || config.board.colors.length < 2) {
            throw new Error('game config: board.colors must contain at least 2 colors');
        }
        if (!config.shuffle) {
            throw new Error('game config: shuffle section is missing');
        }
        if (!config.animation) {
            throw new Error('game config: animation section is missing');
        }
        ConfigValidator.ValidateRandom(config);
        ConfigValidator.ValidateLevels(config);
    }

    private static ValidateRandom(config: IGameConfig): void {
        if (!config.random) {
            throw new Error('game config: random section is missing');
        }
        if (typeof config.random.baseSeed !== 'number' || isNaN(config.random.baseSeed) || config.random.baseSeed < 0) {
            throw new Error('game config: random.baseSeed must be a number >= 0 (0 — random seed per session)');
        }
    }

    private static ValidateLevels(config: IGameConfig): void {
        if (!config.levels) {
            throw new Error('game config: levels section is missing');
        }
        const levels = config.levels;
        ConfigValidator.RequireNumber(levels, 'game config: levels.colorsStart', levels.colorsStart, 2);
        ConfigValidator.RequireNumber(levels, 'game config: levels.colorsMax', levels.colorsMax, 2);
        ConfigValidator.RequireNumber(levels, 'game config: levels.movesLimitMin', levels.movesLimitMin, 0);
        ConfigValidator.RequireNumber(levels, 'game config: levels.timeLimitMinSeconds', levels.timeLimitMinSeconds, 0);
        ConfigValidator.RequireSignedNumber(levels, 'game config: levels.colorsPerLevel', levels.colorsPerLevel);
        ConfigValidator.RequireSignedNumber(levels, 'game config: levels.targetScorePerLevel', levels.targetScorePerLevel);
        ConfigValidator.RequireSignedNumber(levels, 'game config: levels.movesPerLevel', levels.movesPerLevel);
        ConfigValidator.RequireSignedNumber(levels, 'game config: levels.timePerLevel', levels.timePerLevel);
        if (levels.colorsMax < levels.colorsStart) {
            throw new Error('game config: levels.colorsMax must be >= levels.colorsStart');
        }
        const paletteSize = config.board ? config.board.colors.length : 0;
        if (levels.colorsStart > paletteSize || levels.colorsMax > paletteSize) {
            throw new Error('game config: levels.colorsStart/colorsMax must be <= board.colors.length (' + paletteSize + ')');
        }
        if (config.match && config.match.movesLimit > 0 && levels.movesLimitMin > config.match.movesLimit) {
            throw new Error('game config: levels.movesLimitMin must be <= match.movesLimit');
        }
        if (config.match && config.match.timeLimitSeconds > 0 && levels.timeLimitMinSeconds > config.match.timeLimitSeconds) {
            throw new Error('game config: levels.timeLimitMinSeconds must be <= match.timeLimitSeconds');
        }
    }

    public static ValidateBoosters(config: IBoosterConfigFile): void {
        ConfigValidator.Require(config, 'booster config');
        if (!config.boosters || config.boosters.length === 0) {
            throw new Error('booster config: boosters list is empty');
        }
        config.boosters.forEach((booster) => {
            if (!booster.type) {
                throw new Error('booster config: booster.type is missing');
            }
            if (!ConfigValidator.IsBoosterType(booster.type)) {
                throw new Error('booster config: unknown booster type "' + booster.type + '" (add it to BoosterType)');
            }
            if (!ConfigValidator.IsBoosterTargeting(booster.targeting)) {
                throw new Error('booster config: unknown targeting "' + booster.targeting + '" (add it to BoosterTargeting)');
            }
            if (booster.targeting === BoosterTargeting.Cell && !booster.effect) {
                throw new Error('booster config: booster "' + booster.type + '" has no effect');
            }
        });
        if (!config.superTiles || !config.superTiles.effects) {
            throw new Error('booster config: superTiles.effects is missing');
        }
    }

    private static IsBoosterType(type: string): boolean {
        return Object.keys(BoosterType).some((key) => BoosterType[key] === type);
    }

    private static IsBoosterTargeting(targeting: string): boolean {
        return Object.keys(BoosterTargeting).some((key) => BoosterTargeting[key] === targeting);
    }

    private static Require(value: any, name: string): void {
        if (!value) {
            throw new Error(name + ' is missing');
        }
    }

    private static RequireNumber(section: any, name: string, value: number, min: number): void {
        ConfigValidator.Require(section, name + ' section');
        if (typeof value !== 'number' || isNaN(value) || value < min) {
            throw new Error(name + ' must be a number >= ' + min);
        }
    }

    private static RequireSignedNumber(section: any, name: string, value: number): void {
        ConfigValidator.Require(section, name + ' section');
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(name + ' must be a number');
        }
    }
}
