import { IScoreConfig } from './Config';

export interface IScoreParams {
    removed: number;
    groupSize: number;
    hasSuperSpawn: boolean;
    perTile?: number;
}

export class ScoreCalculator {
    public static Calculate(config: IScoreConfig, params: IScoreParams): number {
        const perTile = params.perTile === undefined ? config.perTile : params.perTile;
        let points = params.removed * perTile;
        if (params.groupSize >= config.groupBonusStartSize) {
            points += (params.groupSize - config.groupBonusStartSize + 1) * config.groupBonusPerTile;
        }
        if (params.hasSuperSpawn) {
            points += config.superTileBonus;
        }
        return points;
    }
}
