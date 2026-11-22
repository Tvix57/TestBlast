import { Board } from './Board';
import { BoosterInventory } from './BoosterInventory';
import { BoosterRules, BoosterTargeting, BoosterType } from './BoosterRules';
import { Cell, ICell } from './Cell';
import { IBoosterConfig, IBoosterConfigFile, IGameConfig } from './Config';
import { EffectFactory } from './effects/BoardEffect';
import { GameResult, GameState } from './GameResult';
import { MatchTimer } from './MatchTimer';
import { MovesCounter } from './MovesCounter';
import { Random } from './Random';
import { ScoreCounter } from './ScoreCounter';
import { TileType } from './Tile';
import {
    IBlastStep, IDropTilesStep, IRefillStep, IShuffleStep, ISuperSpawn, ISwapStep, ITurnResult
} from './TurnResult';
import { ITurnStep, TurnStepType } from './TurnStepType';

interface IChainResult {
    Ordered: ICell[];
    Chain: ICell[];
}

interface IMatchResult {
    Cells: ICell[];
    LargestSize: number;
    LargestCells: ICell[];
}

export interface IGameInfo {
    Level: number;
    FieldVariant: number;
    Seed: number;
}

export class GameSession {
    private _config: IGameConfig;
    private _boosterConfig: IBoosterConfigFile;
    private _rules: BoosterRules;
    private _board: Board;
    private _score: ScoreCounter;
    private _moves: MovesCounter;
    private _timer: MatchTimer;
    private _boosters: BoosterInventory;
    private _state: GameState = GameState.Waiting;
    private _result: GameResult = GameResult.None;
    private _paused: boolean = false;
    private _level: number;
    private _fieldVariant: number;
    private _seed: number;

    constructor(config: IGameConfig, boosterConfig: IBoosterConfigFile, info: IGameInfo, now?: () => number) {
        Random.Reset(info.Seed);
        this._config = config;
        this._boosterConfig = boosterConfig;
        this._rules = new BoosterRules(boosterConfig);
        this._level = info.Level;
        this._fieldVariant = info.FieldVariant;
        this._seed = info.Seed;
        this._board = new Board(config.board);
        this._score = new ScoreCounter();
        this._moves = new MovesCounter();
        this._timer = new MatchTimer(config.match.timeLimitSeconds, now);
        this._boosters = new BoosterInventory();
    }

    public static Create(config: IGameConfig, boosterConfig: IBoosterConfigFile, info: IGameInfo, now?: () => number): GameSession {
        return new GameSession(config, boosterConfig, info, now);
    }

    public get Board(): Board {
        return this._board;
    }

    public get Score(): ScoreCounter {
        return this._score;
    }

    public get Moves(): MovesCounter {
        return this._moves;
    }

    public get Timer(): MatchTimer {
        return this._timer;
    }

    public get Config(): IGameConfig {
        return this._config;
    }

    public get BoosterConfig(): IBoosterConfigFile {
        return this._boosterConfig;
    }

    public get Boosters(): BoosterInventory {
        return this._boosters;
    }

    public get Rules(): BoosterRules {
        return this._rules;
    }

    public get TargetScore(): number {
        return this._config.match.targetScore;
    }

    public get Level(): number {
        return this._level;
    }

    public get FieldVariant(): number {
        return this._fieldVariant;
    }

    public get Seed(): number {
        return this._seed;
    }

    public get State(): GameState {
        return this._state;
    }

    public get IsFinished(): boolean {
        return this._state === GameState.Finished;
    }

    public get Result(): GameResult {
        return this._result;
    }

    public Start(): void {
        this._state = GameState.Playing;
        this._result = GameResult.None;
        this._paused = false;
        this._score.Reset();
        this._moves.Configure(this._config.match.movesLimit);
        this._timer.Configure(this._config.match.timeLimitSeconds);
        this._timer.Start();
        this._boosters.Configure(this._rules.GetBoosters());
        this._board.Clear();
        this._board.Fill();
        this.ensureGroup();
    }

    public Pause(): void {
        if (this._state !== GameState.Playing || this._paused) {
            return;
        }
        this._paused = true;
        this._timer.Pause();
    }

    public Resume(): void {
        if (!this._paused) {
            return;
        }
        this._paused = false;
        if (this._state === GameState.Playing) {
            this._timer.Resume();
        }
    }

    public ExpireTimer(): void {
        if (!this.canPlay() || !this._timer.IsExpired) {
            return;
        }
        this._timer.Expire();
        this.finish(GameResult.Lose);
    }

    public ClickCell(row: number, col: number): ITurnResult {
        if (!this.canPlay()) {
            return this.createRejected();
        }
        const tile = this._board.GetTile(row, col);
        if (!tile) {
            return this.createRejected();
        }

        const center = Cell.Create(row, col);
        let primary: ICell[] = [];
        let groupSize = 0;
        let pointsPerTile = this._config.score.perTile;

        if (tile.IsSuper) {
            const effect = this._rules.GetSuperEffect(tile.Type);
            if (!effect) {
                return this.createRejected();
            }
            primary = this.collectCells(effect.shape, effect.radius, center);
            pointsPerTile = effect.scorePerTile;
        } else {
            primary = this._board.FindGroup(row, col);
            if (primary.length < this._config.board.minGroupSize) {
                return this.createRejected();
            }
            groupSize = primary.length;
        }

        const chain = this.resolveChain(primary);
        const spawnType = this.pickSpawnType(groupSize);
        const points = this.calculatePoints(chain.Ordered.length, groupSize, pointsPerTile, spawnType !== null);
        this.removeCells(chain.Ordered);
        const spawned = this.spawnSuperTile(row, col, spawnType);
        this._score.Add(points);
        this._moves.Spend();

        const steps: ITurnStep[] = [{
            Type: TurnStepType.Blast,
            Primary: primary,
            Chain: chain.Chain,
            Points: points,
            Spawned: spawned
        } as IBlastStep];
        this.dropTilesAndRefill(steps);
        this.resolveTurnEnd(steps);
        return this.createAccepted(steps);
    }

    public UseBooster(type: BoosterType, cells: ICell[]): ITurnResult {
        if (!this.canPlay()) {
            return this.createRejected();
        }
        const booster = this._rules.GetBooster(type);
        if (!booster || !cells || cells.length === 0) {
            return this.createRejected();
        }
        if (!this._boosters.CanSpend(type)) {
            return this.createRejected();
        }
        if (booster.targeting === BoosterTargeting.Pair) {
            return this.usePairBooster(booster, cells);
        }
        return this.useCellBooster(booster, cells);
    }

    private usePairBooster(booster: IBoosterConfig, cells: ICell[]): ITurnResult {
        if (cells.length < 2) {
            return this.createRejected();
        }
        const first = cells[0];
        const second = cells[1];
        if (Cell.Same(first, second)) {
            return this.createRejected();
        }
        const firstTile = this._board.GetTile(first.Row, first.Col);
        const secondTile = this._board.GetTile(second.Row, second.Col);
        if (!firstTile || !secondTile) {
            return this.createRejected();
        }
        if (!this._boosters.TrySpend(booster.type)) {
            return this.createRejected();
        }
        this._board.Swap(first, second);
        const steps: ITurnStep[] = [{
            Type: TurnStepType.Swap,
            First: first,
            Second: second,
            FirstTile: firstTile,
            SecondTile: secondTile
        } as ISwapStep];
        if (booster.usesMove) {
            this._moves.Spend();
        }
        const matched = this.collectSwapGroups(first, second);
        if (matched.LargestSize >= this._config.board.minGroupSize) {
            return this.resolveSwapBlast(steps, matched, second);
        }
        this.evaluateEnd();
        return this.createAccepted(steps);
    }

    private useCellBooster(booster: IBoosterConfig, cells: ICell[]): ITurnResult {
        const center = cells[0];
        if (!this._board.GetTile(center.Row, center.Col)) {
            return this.createRejected();
        }
        const effect = booster.effect;
        if (!effect) {
            return this.createRejected();
        }
        const primary = this.collectCells(effect.shape, effect.radius, center);
        const chain = this.resolveChain(primary);
        if (!this._boosters.TrySpend(booster.type)) {
            return this.createRejected();
        }
        const points = chain.Ordered.length * effect.scorePerTile;
        this.removeCells(chain.Ordered);
        this._score.Add(points);
        if (booster.usesMove) {
            this._moves.Spend();
        }
        const steps: ITurnStep[] = [
            {
                Type: TurnStepType.Blast,
                Primary: primary,
                Chain: chain.Chain,
                Points: points,
                Spawned: null
            } as IBlastStep,
            this.createDropTilesStep(),
            this.createRefillStep()
        ];
        this.resolveTurnEnd(steps);
        return this.createAccepted(steps);
    }

    private collectSwapGroups(first: ICell, second: ICell): IMatchResult {
        const visited = new Set<number>();
        const cells: ICell[] = [];
        const sources = [first, second];
        let largestSize = 0;
        let largestCells: ICell[] = [];
        sources.forEach((cell) => {
            const group = this._board.FindGroup(cell.Row, cell.Col);
            if (group.length < this._config.board.minGroupSize) {
                return;
            }
            if (group.length > largestSize) {
                largestSize = group.length;
                largestCells = group;
            }
            group.forEach((matched) => {
                const key = matched.Row * this._board.Columns + matched.Col;
                if (visited.has(key)) {
                    return;
                }
                visited.add(key);
                cells.push(matched);
            });
        });
        return { Cells: cells, LargestSize: largestSize, LargestCells: largestCells };
    }

    private resolveSwapBlast(steps: ITurnStep[], matched: IMatchResult, preferredCell: ICell): ITurnResult {
        const chain = this.resolveChain(matched.Cells);
        const spawnType = this.pickSpawnType(matched.LargestSize);
        const points = this.calculatePoints(
            chain.Ordered.length,
            matched.LargestSize,
            this._config.score.perTile,
            spawnType !== null
        );
        const spawnCell = this.resolveSpawnCell(matched, preferredCell);
        this.removeCells(chain.Ordered);
        const spawned = this.spawnSuperTile(spawnCell.Row, spawnCell.Col, spawnType);
        this._score.Add(points);
        steps.push({
            Type: TurnStepType.Blast,
            Primary: matched.Cells,
            Chain: chain.Chain,
            Points: points,
            Spawned: spawned
        } as IBlastStep);
        steps.push(this.createDropTilesStep());
        steps.push(this.createRefillStep());
        this.resolveTurnEnd(steps);
        return this.createAccepted(steps);
    }

    private resolveSpawnCell(matched: IMatchResult, preferredCell: ICell): ICell {
        const contains = (group: ICell[], cell: ICell): boolean => {
            return group.some((item) => Cell.Same(item, cell));
        };
        if (contains(matched.LargestCells, preferredCell)) {
            return preferredCell;
        }
        if (matched.LargestCells.length > 0) {
            return matched.LargestCells[0];
        }
        return preferredCell;
    }

    private canPlay(): boolean {
        return this._state === GameState.Playing && !this._paused;
    }

    private dropTilesAndRefill(steps: ITurnStep[]): void {
        steps.push(this.createDropTilesStep());
        steps.push(this.createRefillStep());
    }

    private createDropTilesStep(): ITurnStep {
        return {
            Type: TurnStepType.DropTiles,
            Moves: this._board.DropTiles()
        } as IDropTilesStep;
    }

    private createRefillStep(): ITurnStep {
        return {
            Type: TurnStepType.Refill,
            Spawns: this._board.Refill()
        } as IRefillStep;
    }

    private resolveTurnEnd(steps: ITurnStep[]): void {
        if (this.evaluateEnd() !== GameResult.None) {
            return;
        }
        if (this._board.HasGroup(this._config.board.minGroupSize)) {
            return;
        }
        if (!this.tryShuffle(steps)) {
            this.finish(GameResult.Lose);
        }
    }

    private ensureGroup(): void {
        const minGroup = this._config.board.minGroupSize;
        if (this._board.HasGroup(minGroup)) {
            return;
        }
        for (let attempt = 0; attempt < this._config.shuffle.maxAttempts; attempt++) {
            this._board.Shuffle();
            if (this._board.HasGroup(minGroup)) {
                return;
            }
        }
    }

    private removeCells(cells: ICell[]): void {
        cells.forEach((cell) => this._board.SetTile(cell.Row, cell.Col, null));
    }

    private calculatePoints(removedCount: number, groupSize: number, perTile: number, hasSuperSpawn: boolean): number {
        const score = this._config.score;
        let points = removedCount * perTile;
        if (groupSize >= score.groupBonusStartSize) {
            points += (groupSize - score.groupBonusStartSize + 1) * score.groupBonusPerTile;
        }
        if (hasSuperSpawn) {
            points += score.superTileBonus;
        }
        return points;
    }

    private collectCells(shape: string, radius: number, center: ICell): ICell[] {
        const effectCells = EffectFactory.Create(shape).GetCells(this._board, center, radius);
        const visited = new Set<number>();
        const result: ICell[] = [];
        effectCells.forEach((cell) => {
            const key = cell.Row * this._board.Columns + cell.Col;
            if (visited.has(key) || !this._board.GetTile(cell.Row, cell.Col)) {
                return;
            }
            visited.add(key);
            result.push(cell);
        });
        const centerKey = center.Row * this._board.Columns + center.Col;
        if (!visited.has(centerKey) && this._board.GetTile(center.Row, center.Col)) {
            result.push(center);
        }
        return result;
    }

    /** Удаляемые ячейки с раскрытием цепочки супер-тайлов. */
    private resolveChain(seeds: ICell[]): IChainResult {
        const ordered: ICell[] = [];
        const visited = new Set<number>();
        const fromEffect = new Set<number>();
        const seedKeys = new Set<number>();
        const keyOf = (cell: ICell): number => cell.Row * this._board.Columns + cell.Col;
        seeds.forEach((cell) => {
            seedKeys.add(keyOf(cell));
        });
        const queue = seeds.slice();
        while (queue.length > 0) {
            const cell = queue.shift();
            const key = keyOf(cell);
            if (visited.has(key)) {
                continue;
            }
            const tile = this._board.GetTile(cell.Row, cell.Col);
            if (!tile) {
                continue;
            }
            visited.add(key);
            ordered.push(cell);
            if (!tile.IsSuper) {
                continue;
            }
            const effect = this._rules.GetSuperEffect(tile.Type);
            if (!effect) {
                continue;
            }
            EffectFactory.Create(effect.shape).GetCells(this._board, cell, effect.radius).forEach((target) => {
                const targetKey = keyOf(target);
                if (visited.has(targetKey)) {
                    return;
                }
                fromEffect.add(targetKey);
                queue.push(target);
            });
        }
        const chain = ordered.filter((cell) => {
            const key = keyOf(cell);
            return fromEffect.has(key) && !seedKeys.has(key);
        });
        return { Ordered: ordered, Chain: chain };
    }

    private spawnSuperTile(row: number, col: number, type: TileType | null): ISuperSpawn {
        if (!type) {
            return null;
        }
        const tile = this._board.CreateTile(type);
        this._board.SetTile(row, col, tile);
        return { Cell: Cell.Create(row, col), Tile: tile, Type: type };
    }

    private pickSpawnType(groupSize: number): TileType | null {
        if (groupSize < this._config.board.minGroupSize) {
            return null;
        }
        const types = this._rules.GetSpawnTypes(groupSize);
        if (types.length === 0) {
            return null;
        }
        return types[Random.NextInt(types.length)];
    }

    private tryShuffle(steps: ITurnStep[]): boolean {
        const minGroup = this._config.board.minGroupSize;
        for (let attempt = 0; attempt < this._config.shuffle.maxAttempts; attempt++) {
            this._board.Shuffle();
            if (this._board.HasGroup(minGroup)) {
                steps.push({
                    Type: TurnStepType.Shuffle,
                    Placements: this._board.GetPlacements()
                } as IShuffleStep);
                return true;
            }
        }
        return false;
    }

    private evaluateEnd(): GameResult {
        if (this._state === GameState.Finished) {
            return this._result;
        }
        if (this._score.Get() >= this.TargetScore) {
            return this.finish(GameResult.Win);
        }
        if (this._moves.IsEnabled && this._moves.Left <= 0) {
            return this.finish(GameResult.Lose);
        }
        if (this._timer.IsExpired) {
            return this.finish(GameResult.Lose);
        }
        return GameResult.None;
    }

    private finish(result: GameResult): GameResult {
        if (this._state === GameState.Finished) {
            return this._result;
        }
        this._state = GameState.Finished;
        this._result = result;
        this._paused = false;
        this._timer.Pause();
        return result;
    }

    private createResult(steps: ITurnStep[], accepted: boolean): ITurnResult {
        return {
            Steps: steps,
            Accepted: accepted,
            Score: this._score.Get(),
            MovesLeft: this._moves.Left,
            TimeLeft: this._timer.Remaining,
            Result: this._result
        };
    }

    private createAccepted(steps: ITurnStep[]): ITurnResult {
        return this.createResult(steps, true);
    }

    private createRejected(): ITurnResult {
        return this.createResult([], false);
    }
}
