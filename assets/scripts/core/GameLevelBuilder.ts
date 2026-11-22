import { IBoardConfig, IGameConfig, ILevelsConfig, IMatchConfig, IRandomConfig } from './Config';
import { FieldLayout, IFieldLayout } from './FieldLayout';
import { IGameInfo } from './GameSession';

/** Готовая раскладка: паспорт матча (уровень/вариант поля/сид) + конфиг с числами уровня. */
export interface ILevelSetup extends IGameInfo {
    /** Конфиг игры с подставленной сложностью уровня. */
    Config: IGameConfig;
}

/**
 * Построитель уровней: (базовый сид, уровень, вариант поля) → конфиг + сид генератора.
 *
 * - В конфиге нет зашитого сида: `random.baseSeed = 0` означает «выбрать случайный
 *   базовый сид при запуске сессии». Он доступен как `BaseSeed`, поэтому любую
 *   раскладку можно воспроизвести, передав сид в конструктор.
 * - Сложность растёт по `levels.*`: больше цветов, выше цель, меньше ходов и времени.
 * - Сид раскладки — базовый сид плюс смещение уровня и варианта поля (см. `SeedFor`),
 *   поэтому у каждой раскладки своя последовательность `Random`.
 * - Формы поля приходят готовыми раскладками (`IFieldLayout[]`), которые строит
 *   `FieldLayout.FromConfig` после валидации конфигов: стандартная сетка или
 *   фигурные поля с заблокированными ячейками. Вариант выбирается номером
 *   `fieldVariant` по модулю количества раскладок.
 */
export class GameLevelBuilder {
    /** Длина участка сидов, отведённого одному уровню: варианты поля не пересекаются. */
    private static readonly VARIANTS_PER_LEVEL: number = 1000;

    private _config: IGameConfig;
    private _baseSeed: number;
    private _fields: IFieldLayout[];

    constructor(config: IGameConfig, baseSeed?: number, fields?: IFieldLayout[]) {
        this._config = config;
        const seed = baseSeed === undefined ? (config.random ? config.random.baseSeed : 0) : baseSeed;
        this._baseSeed = GameLevelBuilder.normalizeSeed(seed);
        this._fields = fields && fields.length
            ? fields
            : [FieldLayout.Standard(config.board.rows, config.board.columns)];
    }

    public get BaseSeed(): number {
        return this._baseSeed;
    }

    public get FieldCount(): number {
        return this._fields.length;
    }

    public Resolve(level: number, fieldVariant: number): ILevelSetup {
        const levelNumber = Math.max(1, Math.floor(level) || 1);
        const variantNumber = isFinite(fieldVariant) ? Math.max(0, Math.floor(fieldVariant) || 0) : 0;
        return {
            Level: levelNumber,
            FieldVariant: variantNumber,
            Seed: this.seedFor(levelNumber, variantNumber),
            Config: this.buildConfig(levelNumber, this._config.levels, variantNumber)
        };
    }

    public static RandomSeed(): number {
        return Math.floor(Date.now() * Math.random()) + 1;
    }

    private seedFor(level: number, fieldVariant: number): number {
        return this._baseSeed + level * GameLevelBuilder.VARIANTS_PER_LEVEL + fieldVariant;
    }

    private static normalizeSeed(seed: number): number {
        const value = Math.floor(Math.abs(seed));
        return isFinite(value) && value > 0 ? value : GameLevelBuilder.RandomSeed();
    }

    private buildConfig(level: number, levels: ILevelsConfig, fieldVariant: number): IGameConfig {
        return {
            version: this._config.version,
            board: this.buildBoardConfig(level, levels, fieldVariant),
            match: this.buildMatchConfig(level, levels),
            score: this._config.score,
            shuffle: this._config.shuffle,
            random: this.buildRandomConfig(),
            levels: levels,
            animation: this._config.animation
        };
    }

    private buildBoardConfig(level: number, levels: ILevelsConfig, fieldVariant: number): IBoardConfig {
        const board = this._config.board;
        const field = this.fieldFor(fieldVariant);
        return {
            columns: field.Columns,
            rows: field.Rows,
            cellGapRatio: board.cellGapRatio,
            minGroupSize: board.minGroupSize,
            repeatChance: GameLevelBuilder.resolveRepeatChance(board.repeatChance, level),
            colors: GameLevelBuilder.resolveColors(board.colors, levels, level),
            cells: field.Types
        };
    }

    private fieldFor(fieldVariant: number): IFieldLayout {
        return this._fields[fieldVariant % this._fields.length];
    }

    private buildMatchConfig(level: number, levels: ILevelsConfig): IMatchConfig {
        const match = this._config.match;
        return {
            targetScore: GameLevelBuilder.resolveTargetScore(match.targetScore, levels, level),
            movesLimit: GameLevelBuilder.resolveLimit(match.movesLimit, levels.movesPerLevel, levels.movesLimitMin, level),
            timeLimitSeconds: GameLevelBuilder.resolveLimit(match.timeLimitSeconds, levels.timePerLevel, levels.timeLimitMinSeconds, level)
        };
    }

    private buildRandomConfig(): IRandomConfig {
        return { baseSeed: this._baseSeed };
    }

    private static resolveColors(palette: string[], levels: ILevelsConfig, level: number): string[] {
        const ceiling = Math.min(levels.colorsMax, palette.length);
        const count = Math.min(ceiling, levels.colorsStart + (level - 1) * levels.colorsPerLevel);
        return palette.slice(0, Math.max(2, count));
    }

    private static resolveRepeatChance(base: number, level: number): number {
        return Math.max(0, base) / level;
    }

    private static resolveTargetScore(base: number, levels: ILevelsConfig, level: number): number {
        return Math.max(1, base + (level - 1) * levels.targetScorePerLevel);
    }

    private static resolveLimit(base: number, perLevel: number, min: number, level: number): number {
        if (base <= 0) {
            return 0;
        }
        return Math.max(min, base + (level - 1) * perLevel);
    }
}
