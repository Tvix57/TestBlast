import { BoosterType } from './BoosterTypes';
import { IBoosterConfig, IBoosterConfigFile, IEffectConfig } from './Config';
import { TileType } from './Tile';

export { BoosterTargeting, BoosterType } from './BoosterTypes';

export class BoosterRules {
    private _byType: Map<BoosterType, IBoosterConfig> = new Map();
    private _effects: Map<string, IEffectConfig> = new Map();

    constructor(private _config: IBoosterConfigFile) {
        (this._config.boosters || []).forEach((booster) => {
            if (booster && booster.type && !this._byType.has(booster.type)) {
                this._byType.set(booster.type, booster);
            }
        });
        const effects = (this._config.superTiles && this._config.superTiles.effects) || {};
        Object.keys(effects).forEach((type) => this._effects.set(type, effects[type]));
    }

    public get Config(): IBoosterConfigFile {
        return this._config;
    }

    public GetBoosters(): IBoosterConfig[] {
        return this._config.boosters;
    }

    public GetBooster(type: BoosterType): IBoosterConfig {
        return this._byType.get(type) || null;
    }

    public GetSuperEffect(type: TileType): IEffectConfig {
        return this._effects.get(type) || null;
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
        return matched.slice();
    }
}
