import * as fs from 'fs';
import * as path from 'path';

import { Board } from '../assets/scripts/core/Board';
import { CeilType } from '../assets/scripts/core/Cell';
import { IBoosterConfigFile, IFieldConfig, IFieldConfigFile, IGameConfig } from '../assets/scripts/core/Config';
import { FieldLayout, IFieldLayout } from '../assets/scripts/core/FieldLayout';
import { GameContext } from '../assets/scripts/core/GameContext';
import { GameLevelBuilder } from '../assets/scripts/core/GameLevelBuilder';
import { GameSession } from '../assets/scripts/core/GameSession';
import { Random } from '../assets/scripts/core/Random';
import { IDialogManager } from '../assets/scripts/game/dialogs/IDialogManager';
import { ISceneManager, SceneType } from '../assets/scripts/game/scenes/ISceneManager';

const CONFIG_DIR = path.join(__dirname, '../assets/resources/config');

/** Реальные конфиги проекта: тесты проверяют то, что реально поставляется. */
export function loadGameConfig(): IGameConfig {
    return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'game-config.json'), 'utf8'));
}

/** Все варианты формы поля из `field-config.json`. */
export function loadFieldConfigs(): IFieldConfigFile {
    return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'field-config.json'), 'utf8'));
}

/** Первый вариант поля: для тестов, которым важна не форма, а остальная логика. */
export function loadFieldConfig(): IFieldConfig {
    return loadFieldConfigs()[0];
}

/** Конфиг бустеров: сейчас читается только валидатором в Root, механика вырезана. */
export function loadBoosterConfig(): IBoosterConfigFile {
    return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'booster-config.json'), 'utf8'));
}

/** Символы матрицы поля: цвета B/R/G/Y/P, точка — пусто. */
export const COLORS: { [key: string]: string } = {
    B: 'blue',
    R: 'red',
    G: 'green',
    Y: 'yellow',
    P: 'purple'
};

/** Часы модели по умолчанию: время стоит. Для проверок хода времени используйте `createClock()`. */
export const modelClock = (): number => 0;

/** Управляемые часы: время двигаем вручную, чтобы проверить метку окончания матча. */
export interface ITestClock {
    now: () => number;
    advance: (seconds: number) => void;
}

export function createClock(): ITestClock {
    let current = 0;
    return {
        now: () => current,
        advance: (seconds: number) => {
            current += seconds * 1000;
        }
    };
}

export interface IGameOptions {
    seed?: number;
    movesLimit?: number;
    timeLimitSeconds?: number;
    targetScore?: number;
    maxAttempts?: number;
    clock?: () => number;
    /** Конфиг поля: по умолчанию берётся `field-config.json` проекта. */
    field?: IFieldConfig;
}

export function createGame(options: IGameOptions = {}): GameSession {
    const config = loadGameConfig();
    config.match.movesLimit = options.movesLimit === undefined ? 0 : options.movesLimit;
    config.match.timeLimitSeconds = options.timeLimitSeconds === undefined ? 0 : options.timeLimitSeconds;
    if (options.targetScore !== undefined) {
        config.match.targetScore = options.targetScore;
    }
    if (options.maxAttempts !== undefined) {
        config.shuffle.maxAttempts = options.maxAttempts;
    }
    config.random.baseSeed = options.seed === undefined ? 7 : options.seed;
    applyField(config, options.field === undefined ? loadFieldConfig() : options.field);
    return GameSession.Create(config, loadBoosterConfig(), {
        Level: 1,
        FieldVariant: 0,
        Seed: config.random.baseSeed
    }, options.clock || modelClock);
}

export function fieldLayout(config: IGameConfig = loadGameConfig(), field: IFieldConfig = loadFieldConfig()): IFieldLayout {
    return FieldLayout.FromConfig(field, config.board);
}

/** Все варианты раскладок в порядке `field-config.json`. */
export function fieldLayouts(
    config: IGameConfig = loadGameConfig(),
    fields: IFieldConfig[] = loadFieldConfigs()
): IFieldLayout[] {
    return fields.map((field) => FieldLayout.FromConfig(field, config.board));
}

/** Переносит размеры и типы клеток из конфига поля в конфиг доски. */
export function applyField(config: IGameConfig, field: IFieldConfig): void {
    const layout = fieldLayout(config, field);
    config.board.rows = layout.Rows;
    config.board.columns = layout.Columns;
    config.board.cells = layout.Types;
}

/** Поле без готовых групп: соседние клетки всегда разных цветов. */
export function checkerboard(rows: number = 9, cols: number = 9): string[] {
    const lines: string[] = [];
    for (let row = 0; row < rows; row++) {
        let line = '';
        for (let col = 0; col < cols; col++) {
            line += (row + col) % 2 === 0 ? 'G' : 'Y';
        }
        lines.push(line);
    }
    return lines;
}

export function withCells(base: string[], cells: Array<[number, number, string]>): string[] {
    const lines = base.slice();
    cells.forEach(([row, col, symbol]) => {
        lines[row] = lines[row].substring(0, col) + symbol + lines[row].substring(col + 1);
    });
    return lines;
}

export function setBoard(board: Board, matrix: string[]): void {
    board.Clear();
    matrix.forEach((line, row) => {
        for (let col = 0; col < line.length; col++) {
            const symbol = line[col];
            if (symbol === '.') {
                continue;
            }
            board.SetTile(row, col, board.CreateTile(COLORS[symbol] || ''));
        }
    });
}

/** Стартует матч и подставляет подготовленное поле. */
export function startWithBoard(game: GameSession, matrix: string[]): void {
    game.Start();
    setBoard(game.Board, matrix);
}

export function countTiles(board: Board): number {
    let count = 0;
    for (let row = 0; row < board.Rows; row++) {
        for (let col = 0; col < board.Columns; col++) {
            if (board.GetTile(row, col)) {
                count++;
            }
        }
    }
    return count;
}

/** Точки по формуле проекта — чтобы тесты не дублировали числа. */
export function expectedPoints(config: IGameConfig, groupSize: number): number {
    const score = config.score;
    let points = groupSize * score.perTile;
    if (groupSize >= score.groupBonusStartSize) {
        points += (groupSize - score.groupBonusStartSize + 1) * score.groupBonusPerTile;
    }
    return points;
}

// --- Контракт ассетов (tests/assets.test.ts) ---

const ROOT_DIR = path.join(__dirname, '..');
export const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const UUID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Сжатие uuid в class id Cocos (совпадает с tools/build-assets.py). */
export function compressAssetUuid(value: string): string {
    const hexed = value.replace(/-/g, '');
    let out = hexed.slice(0, 5);
    for (let index = 5; index < hexed.length; index += 3) {
        const number = parseInt(hexed.slice(index, index + 3), 16);
        out += UUID_ALPHABET[number >> 6] + UUID_ALPHABET[number & 63];
    }
    return out;
}

export function walkFiles(directory: string, result: string[] = []): string[] {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            walkFiles(full, result);
        } else {
            result.push(full);
        }
    });
    return result;
}

export function readJson(file: string): any {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Локальные бэкапы автора (`* copy.ts`): не ассеты проекта, мета и типы для них не нужны. */
export function isBackupFile(file: string): boolean {
    return / copy/i.test(path.basename(file));
}

export function getAssetFiles(): string[] {
    return walkFiles(ASSETS_DIR, []).filter((file) => !isBackupFile(file));
}

export function getAssetMetaFiles(files: string[] = getAssetFiles()): string[] {
    return files.filter((file) => file.endsWith('.meta'));
}

export function collectAssetUuids(metaFiles: string[] = getAssetMetaFiles()): Set<string> {
    const uuids = new Set<string>();
    metaFiles.forEach((file) => {
        const meta = readJson(file);
        if (meta.uuid) {
            uuids.add(meta.uuid);
        }
        Object.keys(meta.subMetas || {}).forEach((key) => {
            const sub = meta.subMetas[key];
            if (sub && sub.uuid) {
                uuids.add(sub.uuid);
            }
        });
    });
    return uuids;
}

export function collectScriptClasses(files: string[] = getAssetFiles()): Map<string, string> {
    const classes = new Map<string, string>();
    files.filter((file) => file.endsWith('.ts')).forEach((file) => {
        const metaPath = file + '.meta';
        expect(fs.existsSync(metaPath)).toBe(true);
        const meta = readJson(metaPath);
        const relative = path.relative(path.join(ASSETS_DIR, 'scripts'), file);
        classes.set(compressAssetUuid(meta.uuid), relative);
    });
    return classes;
}

export function serializedAssetTargets(): string[] {
    return [
        path.join(ASSETS_DIR, 'scenes/Game.fire'),
        ...walkFiles(path.join(ASSETS_DIR, 'prefabs'), []).filter((file) => file.endsWith('.prefab'))
    ];
}

// --- Хелперы моделей ---

export function createBoard(config: IGameConfig, seed: number = 7): Board {
    Random.Reset(seed);
    return new Board(config.board);
}

/**
 * ASCII-маска → конфиг кастомного поля: `#` — блок, остальные символы — обычная ячейка.
 * В самом конфиге используются числа из enum `CeilType`, маска нужна только тестам.
 */
export function fieldFromMask(mask: string[]): IFieldConfig {
    return {
        version: 1,
        rows: mask.length,
        columns: mask[0].length,
        custom: true,
        board: mask.map((line) => line.split('').map((symbol) => (
            symbol === '#' ? CeilType.Blocked : CeilType.Normal
        )))
    };
}

/**
 * Доска по ASCII-маске: `#` — заблокированная ячейка, всё остальное — обычная.
 * Размеры строк/столбцов берутся из маски.
 */
export function createFieldBoard(lines: string[], seed: number = 7): Board {
    const config = loadGameConfig();
    applyField(config, fieldFromMask(lines));
    Random.Reset(seed);
    return new Board(config.board);
}

export function fillColors(repeatChance: number, seed: number): string[] {
    const config = loadGameConfig();
    config.board.repeatChance = repeatChance;
    return createBoard(config, seed).Fill().map((placement) => placement.Tile.Color);
}

export function colorsOf(game: GameSession): string {
    return game.Board.GetPlacements().map((placement) => placement.Tile.Color).join(',');
}

export function colorsOfSeed(seed: number): string {
    const game = createGame({ seed: seed });
    game.Start();
    return colorsOf(game);
}

export function createBuilder(baseSeed?: number): GameLevelBuilder {
    const config = loadGameConfig();
    return new GameLevelBuilder(config, baseSeed, fieldLayouts(config));
}

export function createLevelGame(baseSeed: number, level: number, fieldVariant: number): GameSession {
    const setup = createBuilder(baseSeed).Resolve(level, fieldVariant);
    const game = GameSession.Create(setup.Config, loadBoosterConfig(), setup);
    game.Start();
    return game;
}

export function createTestContext(baseSeed: number = 4242): GameContext {
    const config = loadGameConfig();
    return new GameContext(config, loadBoosterConfig(), fieldLayouts(config), baseSeed);
}

// --- Фейки видов и контроллеров ---

export function createBoardView() {
    return {
        Init: jest.fn(),
        SetClickHandler: jest.fn(),
        Build: jest.fn(() => Promise.resolve()),
        Lock: jest.fn(),
        Unlock: jest.fn(),
        PlayInvalid: jest.fn(() => Promise.resolve()),
        PlaySteps: jest.fn(() => Promise.resolve())
    };
}

/** Фейк вида тайла: считает позиции и отдаёт управляемые промисы анимаций. */
export function createTileView() {
    const view: any = {
        isValid: true,
        Cell: null,
        Tile: null,
        ClickHandler: null,
        Position: { x: 0, y: 0 },
        PlaceAt: jest.fn((x: number, y: number) => {
            view.Position = { x: x, y: y };
        }),
        SetCellSize: jest.fn(),
        SetTile: jest.fn((tile: any, cell: any) => {
            view.Tile = tile;
            view.Cell = cell;
        }),
        SetCell: jest.fn((cell: any) => {
            view.Cell = cell;
        }),
        ResetVisual: jest.fn(),
        ClearBinding: jest.fn(() => {
            view.Tile = null;
            view.Cell = null;
        }),
        CancelAnimations: jest.fn(),
        PlayAppear: jest.fn(() => Promise.resolve()),
        PlayBlast: jest.fn(() => Promise.resolve()),
        MoveTo: jest.fn(() => Promise.resolve()),
        PlaySpawnFall: jest.fn(() => Promise.resolve()),
        PlayShuffleMove: jest.fn(() => Promise.resolve()),
        PlayInvalid: jest.fn(() => Promise.resolve())
    };
    return view;
}

/** Фейк Cocos-вида поля: порты отрисовки `IBoardStage` без `cc`. */
export function createBoardStage(options: { width?: number; height?: number; scale?: number } = {}) {
    const stage = {
        GridSize: {
            width: options.width === undefined ? 990 : options.width,
            height: options.height === undefined ? 990 : options.height
        },
        Scale: options.scale === undefined ? 1 : options.scale,
        Created: [] as any[],
        Released: [] as any[],
        ClearCount: 0,
        Errors: [] as string[],
        CreateTileView(): any {
            const view = createTileView();
            stage.Created.push(view);
            return view;
        },
        ReleaseTileView(view: any): void {
            stage.Released.push(view);
        },
        ClearTiles(): void {
            stage.ClearCount++;
        },
        GetGridSize(): { width: number; height: number } {
            return stage.GridSize;
        },
        GetScale(): number {
            return stage.Scale;
        },
        ReportError(message: string): void {
            stage.Errors.push(message);
        }
    };
    return stage;
}

/** Вид, зарегистрированный на клетке: поиск по координатам среди созданных фейком. */
export function findTileViewAt(stage: ReturnType<typeof createBoardStage>, row: number, col: number) {
    return stage.Created.filter((view) => view.Cell && view.Cell.Row === row && view.Cell.Col === col)[0];
}


export function flushPromises(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

export interface IDeferred<T> {
    promise: Promise<T>;
    resolve: (value?: T) => void;
}

export function createDeferred<T>(): IDeferred<T> {
    let resolveFn: (value?: T) => void = () => undefined;
    const promise = new Promise<T>((resolve) => {
        resolveFn = (value?: T) => resolve(value as T);
    });
    return { promise: promise, resolve: resolveFn };
}

export function createHudView() {
    return {
        Bind: jest.fn(),
        SetTarget: jest.fn(),
        SetScore: jest.fn(),
        SetMoves: jest.fn(),
        SetTime: jest.fn()
    };
}

export function createDialogManager(): IDialogManager {
    return {
        OpenDialog: jest.fn(() => true),
        CloseTopDialog: jest.fn(() => true),
        CloseAllDialogs: jest.fn(),
        SetPauseHandler: jest.fn(),
        ClearPauseHandler: jest.fn()
    };
}

export function createSceneManager(): ISceneManager {
    return {
        OpenScene: jest.fn(() => null as any),
        CloseScene: jest.fn(() => true),
        CloseAllScenes: jest.fn(),
        GetCurrentSceneType: jest.fn(() => SceneType.MainScene),
        GetCurrentSceneNode: jest.fn(() => null as any)
    };
}

/** Дозаполнение «безопасными» цветами: групп не возникает (шахматка из двух цветов). */
export function fillWithoutGroups(game: GameSession): void {
    for (let row = 0; row < game.Board.Rows; row++) {
        for (let col = 0; col < game.Board.Columns; col++) {
            const color = (row + col) % 2 === 0 ? 'purple' : 'red';
            game.Board.SetTile(row, col, game.Board.CreateTile(color));
        }
    }
}

export function randomSeries(count: number): number[] {
    return new Array(count).fill(0).map(() => Random.Next());
}

