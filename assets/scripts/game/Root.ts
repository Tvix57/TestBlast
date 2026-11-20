import { IBoosterConfigFile, IGameConfig } from '../core/Config';
import { ConfigValidator } from '../core/ConfigValidator';
import { GameContext } from '../core/GameContext';
import { IDialogManager } from './dialogs/IDialogManager';
import { ISceneManager } from './scenes/ISceneManager';

export class Root {
    private static _instance: Root = null;

    private _context: GameContext = null;
    private _dialogs: IDialogManager = null;
    private _scenes: ISceneManager = null;

    public static get Instance(): Root {
        if (!Root._instance) {
            Root._instance = new Root();
        }
        return Root._instance;
    }

    public get Context(): GameContext {
        return this._context;
    }

    public ResolveDialogManager(): IDialogManager {
        return this._dialogs;
    }

    public ResolveSceneManager(): ISceneManager {
        return this._scenes;
    }

    public get IsReady(): boolean {
        return this._context !== null;
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
        this._context = new GameContext(config, boosterConfig);
    }
}
