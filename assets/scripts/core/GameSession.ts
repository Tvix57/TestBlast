import { Board } from './Board';
import { ICell } from './Cell';
import { IBoosterConfigFile, IGameConfig } from './Config';
import { GameResult, GameState } from './GameResult';
import { MatchTimer } from './MatchTimer';
import { MovesCounter } from './MovesCounter';
import { Random } from './Random';
import { ScoreCounter } from './ScoreCounter';
import { IBlastStep, IDropTilesStep, IRefillStep, IShuffleStep, ITurnResult } from './TurnResult';
import { ITurnStep, TurnStepType } from './TurnStepType';

export interface IGameInfo {
    Level: number;
    FieldVariant: number;
    Seed: number;
}

export class GameSession {
    private _config: IGameConfig;
    private _boosterConfig: IBoosterConfigFile;
    private _board: Board;
    private _score: ScoreCounter;
    private _moves: MovesCounter;
    private _timer: MatchTimer;
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
        this._level = info.Level;
        this._fieldVariant = info.FieldVariant;
        this._seed = info.Seed;
        this._board = new Board(config.board);
        this._score = new ScoreCounter();
        this._moves = new MovesCounter();
        this._timer = new MatchTimer(config.match.timeLimitSeconds, now);
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
        const group = this._board.FindGroup(row, col);
        if (group.length < this._config.board.minGroupSize) {
            return this.createRejected();
        }

        const steps: ITurnStep[] = [];
        this.blastGroup(group, steps);
        this.dropTilesAndRefill(steps);
        this.resolveTurnEnd(steps);
        return this.createAccepted(steps);
    }

    private canPlay(): boolean {
        return this._state === GameState.Playing && !this._paused;
    }

    private blastGroup(cells: ICell[], steps: ITurnStep[]): void {
        const points = this.calculatePoints(cells.length);
        this.removeCells(cells);
        this._score.Add(points);
        this._moves.Spend();
        const step: IBlastStep = {
            Type: TurnStepType.Blast,
            Primary: cells,
            Points: points
        };
        steps.push(step);
    }

    private dropTilesAndRefill(steps: ITurnStep[]): void {
        const dropTiles: IDropTilesStep = {
            Type: TurnStepType.DropTiles,
            Moves: this._board.DropTiles()
        };
        steps.push(dropTiles);
        const refill: IRefillStep = {
            Type: TurnStepType.Refill,
            Spawns: this._board.Refill()
        };
        steps.push(refill);
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

    private calculatePoints(groupSize: number): number {
        const score = this._config.score;
        let points = groupSize * score.perTile;
        if (groupSize >= score.groupBonusStartSize) {
            points += (groupSize - score.groupBonusStartSize + 1) * score.groupBonusPerTile;
        }
        return points;
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
