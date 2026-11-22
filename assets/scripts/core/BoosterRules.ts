import { IBoosterConfig, IBoosterConfigFile, IEffectConfig } from './Config';
import { TileType } from './Tile';

export enum BoosterType {
    Teleport = 'teleport',
    Bomb = 'bomb'
}

export enum BoosterTargeting {
    Cell = 'cell',
    Pair = 'pair'
}

/** Правила бустеров и супер-тайлов из booster-config.json. */
export class BoosterRules {
    constructor(private _config: IBoosterConfigFile) {}

    public get Config(): IBoosterConfigFile {
        return this._config;
    }

    public GetBoosters(): IBoosterConfig[] {
        return this._config.boosters;
    }

    public GetBooster(type: BoosterType): IBoosterConfig {
        const found = this._config.boosters.filter((booster) => booster.type === type);
        return found.length > 0 ? found[0] : null;
    }

    public GetSuperEffect(type: TileType): IEffectConfig {
        if (!this._config.superTiles || !this._config.superTiles.effects) {
            return null;
        }
        return this._config.superTiles.effects[type] || null;
    }

    public GetSpawnTypes(groupSize: number): TileType[] {
        const rules = (this._config.superTiles && this._config.superTiles.spawnRules) || [];
        let matched: TileType[] = [];
        let threshold = 0;
        rules.forEach((rule) => {
            if (groupSize >= rule.minGroupSize && rule.minGroupSize > threshold) {
                threshold = rule.minGroupSize;
                matched = rule.types;
            }
        });
        return matched;
    }
}
