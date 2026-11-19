import { IBoosterConfigFile, IGameConfig } from '../core/Config';
import { ConfigValidator } from '../core/ConfigValidator';
import { GameSession } from '../core/GameSession';
import { IDialogManager } from './dialogs/IDialogManager';
import { ISceneManager } from './scenes/ISceneManager';

export class Root {
    private static _instance: Root = null;

    private _session: GameSession = null;
    private _dialogs: IDialogManager = null;
    private _scenes: ISceneManager = null;

    public static get Instance(): Root {
        if (!Root._instance) {
            Root._instance = new Root();
        }
        return Root._instance;
    }

    public get Session(): GameSession {
        return this._session;
    }

    public ResolveDialogManager(): IDialogManager {
        return this._dialogs;
    }

    public ResolveSceneManager(): ISceneManager {
        return this._scenes;
    }

    public get IsReady(): boolean {
        return this._session !== null;
    }

    public Initialize(
        config: IGameConfig,
        boosterConfig: IBoosterConfigFile,
        dialogs: IDialogManager,
        scenes: ISceneManager
    ): void {
        ConfigValidator.ValidateGame(config);
        ConfigValidator.ValidateBoosters(boosterConfig);
        this._dialogs = dialogs;
        this._scenes = scenes;
        this._session = new GameSession(config, boosterConfig);
    }
}
