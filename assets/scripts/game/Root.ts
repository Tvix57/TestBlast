import { IBoosterConfigFile, IFieldConfigFile, IGameConfig } from '../core/Config';
import { ConfigValidator } from '../core/ConfigValidator';
import { FieldLayout } from '../core/FieldLayout';
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

    public Reset(): void {
        this._context = null;
        this._dialogs = null;
        this._scenes = null;
    }

    public Initialize(
        config: IGameConfig,
        boosterConfig: IBoosterConfigFile,
        fieldConfigs: IFieldConfigFile,
        dialogs: IDialogManager,
        scenes: ISceneManager
    ): void {
        if (this._context) {
            throw new Error('Root: Initialize уже вызван (сначала Reset)');
        }
        ConfigValidator.ValidateGame(config);
        ConfigValidator.ValidateBoosters(boosterConfig);
        ConfigValidator.ValidateFields(fieldConfigs, config.board.minGroupSize);
        const fields = fieldConfigs.map((fieldConfig) => FieldLayout.FromConfig(fieldConfig, config.board));
        this._dialogs = dialogs;
        this._scenes = scenes;
        this._context = new GameContext(config, boosterConfig, fields);
    }
}
