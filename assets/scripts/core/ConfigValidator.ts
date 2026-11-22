import { BoosterTargeting, BoosterType } from './BoosterTypes';
import { Cell, CeilType } from './Cell';
import { IBoosterConfigFile, IEffectConfig, IFieldConfig, IFieldConfigFile, IGameConfig } from './Config';
import { EffectFactory } from './effects/BoardEffect';
import { COLOR_TILE_TYPES, SUPER_TILE_TYPES, TileType } from './Tile';

export class ConfigValidator {
    public static ValidateGame(config: IGameConfig): void {
        ConfigValidator.require(config, 'game config');
        ConfigValidator.requireNumber(config.match, 'match.targetScore', config.match && config.match.targetScore, 1);
        ConfigValidator.requireNumber(config.match, 'match.movesLimit', config.match && config.match.movesLimit, 0);
        ConfigValidator.requireNumber(config.match, 'match.timeLimitSeconds', config.match && config.match.timeLimitSeconds, 0);
        ConfigValidator.requireInteger(config.board, 'board.columns', config.board && config.board.columns, 2);
        ConfigValidator.requireInteger(config.board, 'board.rows', config.board && config.board.rows, 2);
        ConfigValidator.requireNumber(config.board, 'board.cellGapRatio', config.board && config.board.cellGapRatio, 0);
        ConfigValidator.requireNumber(config.board, 'board.minGroupSize', config.board && config.board.minGroupSize, 2);
        ConfigValidator.requireRange(config.board, 'board.repeatChance', config.board && config.board.repeatChance, 0, 1);
        ConfigValidator.requireNumber(config.score, 'score.perTile', config.score && config.score.perTile, 1);
        ConfigValidator.requireNumber(config.score, 'score.groupBonusStartSize', config.score && config.score.groupBonusStartSize, 0);
        ConfigValidator.requireNumber(config.score, 'score.groupBonusPerTile', config.score && config.score.groupBonusPerTile, 0);
        ConfigValidator.requireNumber(config.score, 'score.superTileBonus', config.score && config.score.superTileBonus, 0);
        ConfigValidator.requireNumber(config, 'version', config.version, 1);
        if (!config.board || !config.board.colors || config.board.colors.length < 2) {
            throw new Error('game config: board.colors must contain at least 2 colors');
        }
        config.board.colors.forEach((type) => {
            if (COLOR_TILE_TYPES.indexOf(type) < 0) {
                throw new Error('game config: unknown tile type "' + type + '" in board.colors (known: '
                    + COLOR_TILE_TYPES.join(', ') + ')');
            }
        });
        if (new Set(config.board.colors).size !== config.board.colors.length) {
            throw new Error('game config: board.colors must not contain duplicates');
        }
        if (!config.shuffle) {
            throw new Error('game config: shuffle section is missing');
        }
        ConfigValidator.requireInteger(config.shuffle, 'shuffle.maxAttempts', config.shuffle.maxAttempts, 1);
        if (!config.animation) {
            throw new Error('game config: animation section is missing');
        }
        ConfigValidator.validateAnimation(config);
        ConfigValidator.validateRandom(config);
        ConfigValidator.validateLevels(config);
    }

    private static validateAnimation(config: IGameConfig): void {
        const animation = config.animation;
        ConfigValidator.requireNumber(animation, 'animation.boardAppearStagger', animation && animation.boardAppearStagger, 0);
        const numeric = [
            'swapDuration', 'fallDuration', 'blastDuration', 'blastScale', 'blastStagger',
            'spawnDuration', 'superSpawnDuration', 'shuffleDuration', 'invalidShakeDuration',
            'invalidShakeOffset', 'boardAppearDuration'
        ];
        numeric.forEach((field) => {
            ConfigValidator.requireNumber(animation, 'animation.' + field, animation && (animation as any)[field], 0);
        });
        if (typeof animation.fallEasing !== 'string' || animation.fallEasing.length === 0) {
            throw new Error('animation.fallEasing must be a non-empty string');
        }
    }

    private static validateRandom(config: IGameConfig): void {
        if (!config.random) {
            throw new Error('game config: random section is missing');
        }
        if (typeof config.random.baseSeed !== 'number' || isNaN(config.random.baseSeed) || config.random.baseSeed < 0) {
            throw new Error('game config: random.baseSeed must be a number >= 0 (0 — random seed per session)');
        }
    }

    private static validateLevels(config: IGameConfig): void {
        if (!config.levels) {
            throw new Error('game config: levels section is missing');
        }
        const levels = config.levels;
        ConfigValidator.requireNumber(levels, 'game config: levels.colorsStart', levels.colorsStart, 2);
        ConfigValidator.requireNumber(levels, 'game config: levels.colorsMax', levels.colorsMax, 2);
        ConfigValidator.requireNumber(levels, 'game config: levels.movesLimitMin', levels.movesLimitMin, 0);
        ConfigValidator.requireNumber(levels, 'game config: levels.timeLimitMinSeconds', levels.timeLimitMinSeconds, 0);
        ConfigValidator.requireSignedNumber(levels, 'game config: levels.colorsPerLevel', levels.colorsPerLevel);
        ConfigValidator.requireSignedNumber(levels, 'game config: levels.targetScorePerLevel', levels.targetScorePerLevel);
        ConfigValidator.requireSignedNumber(levels, 'game config: levels.movesPerLevel', levels.movesPerLevel);
        ConfigValidator.requireSignedNumber(levels, 'game config: levels.timePerLevel', levels.timePerLevel);
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

    public static ValidateFields(configs: IFieldConfigFile, minGroupSize: number = 0): void {
        if (!Array.isArray(configs) || configs.length === 0) {
            throw new Error('field config: list of field variants is empty');
        }
        for (let index = 0; index < configs.length; index++) {
            ConfigValidator.ValidateField(configs[index], 'field config[' + index + ']', minGroupSize);
        }
    }

    public static ValidateField(config: IFieldConfig, name: string = 'field config', minGroupSize: number = 0): void {
        ConfigValidator.require(config, name);
        ConfigValidator.requireInteger(config, name + ': rows', config && config.rows, 2);
        ConfigValidator.requireInteger(config, name + ': columns', config && config.columns, 2);
        if (typeof config.custom !== 'boolean') {
            throw new Error(name + ': custom must be a boolean (false — standard grid, true — board matrix)');
        }
        if (!config.custom) {
            ConfigValidator.requirePlayableArea(config.rows * config.columns, minGroupSize, name);
            return;
        }
        const board = ConfigValidator.requireBoard(config, name);
        if (ConfigValidator.countPlayable(board) === 0) {
            throw new Error(name + ': board has no playable cells');
        }
        ConfigValidator.requirePlayableArea(ConfigValidator.largestPlayableArea(board), minGroupSize, name);
    }

    private static requirePlayableArea(area: number, minGroupSize: number, name: string): void {
        if (minGroupSize > 1 && area < minGroupSize) {
            throw new Error(name + ': largest playable area ' + area
                + ' is smaller than board.minGroupSize ' + minGroupSize);
        }
    }

    private static largestPlayableArea(board: number[][]): number {
        const visited: boolean[][] = board.map((line) => line.map(() => false));
        let largest = 0;
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (visited[row][col] || !Cell.CanHoldType(board[row][col])) {
                    continue;
                }
                let size = 0;
                const queue: number[][] = [[row, col]];
                visited[row][col] = true;
                while (queue.length > 0) {
                    const [currentRow, currentCol] = queue.shift();
                    size++;
                    const neighbours = [
                        [currentRow - 1, currentCol], [currentRow + 1, currentCol],
                        [currentRow, currentCol - 1], [currentRow, currentCol + 1]
                    ];
                    neighbours.forEach(([nextRow, nextCol]) => {
                        if (!board[nextRow] || board[nextRow][nextCol] === undefined) {
                            return;
                        }
                        if (visited[nextRow][nextCol] || !Cell.CanHoldType(board[nextRow][nextCol])) {
                            return;
                        }
                        visited[nextRow][nextCol] = true;
                        queue.push([nextRow, nextCol]);
                    });
                }
                largest = Math.max(largest, size);
            }
        }
        return largest;
    }

    private static requireBoard(config: IFieldConfig, name: string): number[][] {
        const board = config.board;
        if (board === undefined || board === null) {
            throw new Error(name + ': board is missing (custom: true requires board)');
        }
        if (!Array.isArray(board)) {
            throw new Error(name + ': board must be a matrix of numbers');
        }
        if (board.length === 0) {
            throw new Error(name + ': board is missing (custom: true requires board)');
        }
        if (board.length !== config.rows) {
            throw new Error(name + ': board must contain ' + config.rows + ' rows (got ' + board.length + ')');
        }
        board.forEach((line, row) => {
            if (!Array.isArray(line) || line.length !== config.columns) {
                throw new Error(name + ': board row ' + row + ' must contain ' + config.columns + ' numbers');
            }
            line.forEach((type, col) => {
                if (!ConfigValidator.isCeilType(type)) {
                    throw new Error(name + ': unknown cell type ' + type + ' at board[' + row + '][' + col
                        + '] (known: ' + ConfigValidator.knownCeilTypes() + ')');
                }
            });
        });
        return board;
    }

    private static countPlayable(board: number[][]): number {
        let playable = 0;
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (Cell.CanHoldType(board[row][col])) {
                    playable++;
                }
            }
        }
        return playable;
    }

    private static isCeilType(type: number): boolean {
        return typeof type === 'number' && (CeilType as any)[type] !== undefined;
    }

    private static knownCeilTypes(): string {
        return Object.keys(CeilType)
            .filter((key) => isNaN(Number(key)))
            .map((key) => (CeilType as any)[key] + ' — ' + key.toLowerCase())
            .join(', ');
    }

    public static ValidateBoosters(config: IBoosterConfigFile): void {
        ConfigValidator.require(config, 'booster config');
        if (!config.boosters || config.boosters.length === 0) {
            throw new Error('booster config: boosters list is empty');
        }
        ConfigValidator.requireNumber(config, 'booster config: version', config.version, 1);
        ConfigValidator.requireShapes(config.boosters.filter((item) => item && item.effect)
            .map((item) => item.effect), 'booster config: boosters[].effect');
        const types = config.boosters.map((booster) => booster && booster.type).filter((type) => !!type);
        if (new Set(types).size !== types.length) {
            throw new Error('booster config: boosters must not contain duplicate types');
        }
        config.boosters.forEach((booster) => {
            if (!booster.type) {
                throw new Error('booster config: booster.type is missing');
            }
            if (!ConfigValidator.isBoosterType(booster.type)) {
                throw new Error('booster config: unknown booster type "' + booster.type + '" (add it to BoosterType)');
            }
            if (!ConfigValidator.isBoosterTargeting(booster.targeting)) {
                throw new Error('booster config: unknown targeting "' + booster.targeting + '" (add it to BoosterTargeting)');
            }
            if (booster.targeting === BoosterTargeting.Cell && !booster.effect) {
                throw new Error('booster config: booster "' + booster.type + '" has no effect');
            }
        });
        if (!config.superTiles || !config.superTiles.effects) {
            throw new Error('booster config: superTiles.effects is missing');
        }
        Object.keys(config.superTiles.effects).forEach((type) => {
            if (SUPER_TILE_TYPES.indexOf(type as TileType) < 0) {
                throw new Error('booster config: unknown super tile type "' + type
                    + '" in superTiles.effects (add it to TileType)');
            }
        });
        ConfigValidator.requireShapes(Object.keys(config.superTiles.effects)
            .map((type) => config.superTiles.effects[type]), 'booster config: superTiles.effects');
        const spawnRules = config.superTiles.spawnRules || [];
        spawnRules.forEach((rule) => {
            (rule.types || []).forEach((type) => {
                if (SUPER_TILE_TYPES.indexOf(type) < 0) {
                    throw new Error('booster config: unknown super tile type "' + type
                        + '" in superTiles.spawnRules (add it to TileType)');
                }
            });
        });
    }

    private static requireShapes(effects: IEffectConfig[], name: string): void {
        const known = EffectFactory.KnownShapes();
        effects.forEach((effect) => {
            if (!effect || known.indexOf(effect.shape) < 0) {
                throw new Error(name + ': unknown shape "' + (effect && effect.shape)
                    + '" (known: ' + known.join(', ') + ')');
            }
        });
    }

    private static isBoosterType(type: string): boolean {
        return Object.keys(BoosterType).some((key) => BoosterType[key] === type);
    }

    private static isBoosterTargeting(targeting: string): boolean {
        return Object.keys(BoosterTargeting).some((key) => BoosterTargeting[key] === targeting);
    }

    private static require(value: any, name: string): void {
        if (!value) {
            throw new Error(name + ' is missing');
        }
    }

    private static requireNumber(section: any, name: string, value: number, min: number): void {
        ConfigValidator.require(section, name + ' section');
        if (typeof value !== 'number' || isNaN(value) || value < min) {
            throw new Error(name + ' must be a number >= ' + min);
        }
    }

    private static requireInteger(section: any, name: string, value: number, min: number): void {
        ConfigValidator.require(section, name + ' section');
        if (typeof value !== 'number' || !isFinite(value) || !Number.isInteger(value) || value < min) {
            throw new Error(name + ' must be an integer >= ' + min);
        }
    }

    private static requireRange(section: any, name: string, value: number, min: number, max: number): void {
        ConfigValidator.require(section, name + ' section');
        if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
            throw new Error(name + ' must be a number in [' + min + ', ' + max + ']');
        }
    }

    private static requireSignedNumber(section: any, name: string, value: number): void {
        ConfigValidator.require(section, name + ' section');
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(name + ' must be a number');
        }
    }
}
