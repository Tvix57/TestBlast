import { Board } from './Board';
import { BoosterInventory } from './BoosterInventory';
import { BoosterRules, BoosterType } from './BoosterRules';
import { ICell } from './Cell';
import { IBoosterConfigFile, IGameConfig } from './Config';
import { GameResult, GameState } from './GameResult';
import { MatchTimer } from './MatchTimer';
import { MovesCounter } from './MovesCounter';
import { Random } from './Random';
import { ScoreCounter } from './ScoreCounter';
import { ITurnResult, ITurnStep } from './TurnResult';
import { TurnResolver } from './TurnResolver';

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
    private _resolver: TurnResolver;
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
        this._resolver = new TurnResolver(
            this._board, config, this._rules, this._score, this._moves, this._boosters,
            (steps: ITurnStep[]) => this.resolveTurnEnd(steps),
            () => this.evaluateEnd()
        );
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
        this._resolver.EnsureGroup();
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
        const outcome = this._resolver.Click(row, col);
        return outcome.Accepted ? this.createAccepted(outcome.Steps) : this.createRejected();
    }

    public UseBooster(type: BoosterType, cells: ICell[]): ITurnResult {
        if (!this.canPlay()) {
            return this.createRejected();
        }
        const outcome = this._resolver.UseBooster(type, cells);
        return outcome.Accepted ? this.createAccepted(outcome.Steps) : this.createRejected();
    }

    private canPlay(): boolean {
        return this._state === GameState.Playing && !this._paused;
    }

    private resolveTurnEnd(steps: ITurnStep[]): void {
        if (this.evaluateEnd() !== GameResult.None) {
            return;
        }
        if (this._board.HasAvailableMove(this._config.board.minGroupSize)) {
            return;
        }
        if (!this._resolver.TryShuffle(steps)) {
            this.finish(GameResult.Lose);
        }
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
