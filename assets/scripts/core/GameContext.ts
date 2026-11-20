import { IBoosterConfigFile, IGameConfig } from './Config';
import { GameSession } from './GameSession';
import { ILevelSetup, GameLevelBuilder } from './GameLevelBuilder';

export class GameContext {
    private _levelBuilder: GameLevelBuilder;
    private _boosterConfig: IBoosterConfigFile;
    private _session: GameSession;

    constructor(config: IGameConfig, boosterConfig: IBoosterConfigFile, baseSeed?: number) {
        this._levelBuilder = new GameLevelBuilder(config, baseSeed);
        this._boosterConfig = boosterConfig;
        this._session = this.Open(1, 0);
    }

    public get Session(): GameSession {
        return this._session;
    }

    public get LevelBuilder(): GameLevelBuilder {
        return this._levelBuilder;
    }

    public NextLevel(): GameSession {
        return this.Open(this._session.Level + 1, 0);
    }

    public RestartLevel(): GameSession {
        return this.Open(this._session.Level, this._session.FieldVariant + 1);
    }

    private Open(level: number, fieldVariant: number): GameSession {
        const setup: ILevelSetup = this._levelBuilder.Resolve(level, fieldVariant);
        this._session = GameSession.Create(setup.Config, this._boosterConfig, setup);
        return this._session;
    }
}
