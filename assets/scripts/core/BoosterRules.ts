import { IBoosterConfig, IBoosterConfigFile } from './Config';

export enum BoosterType {
    Teleport = 'teleport',
    Bomb = 'bomb'
}

export enum BoosterTargeting {
    Cell = 'cell',
    Pair = 'pair'
}

export class BoosterRules {
    constructor(private _config: IBoosterConfigFile) {}

    public get Config(): IBoosterConfigFile {
        return this._config;
    }

    public GetBoosters(): IBoosterConfig[] {
        return this._config.boosters;
    }

    public GetBooster(type: string): IBoosterConfig {
        const found = this._config.boosters.filter((booster) => booster.type === type);
        return found.length > 0 ? found[0] : null;
    }
}
