import { BoosterTargeting, BoosterType } from './BoosterRules';
import { CeilType } from './Cell';
import { TileType } from './Tile';

export interface IFieldDimensions {
    rows: number;
    columns: number;
}

export interface IBoardConfig extends IFieldDimensions {
    cellGapRatio: number;
    minGroupSize: number;
    repeatChance: number;
    colors: TileType[];
    cells?: CeilType[][] | null;
}

export interface IFieldConfig extends IFieldDimensions {
    version: number;
    custom: boolean;
    board?: number[][];
}

export type IFieldConfigFile = IFieldConfig[];

export interface IMatchConfig {
    targetScore: number;
    movesLimit: number;
    timeLimitSeconds: number;
}

export interface IScoreConfig {
    perTile: number;
    groupBonusStartSize: number;
    groupBonusPerTile: number;
    superTileBonus: number;
}

export interface IShuffleConfig {
    maxAttempts: number;
}

export interface IRandomConfig {
    baseSeed: number;
}

export interface ILevelsConfig {
    colorsStart: number;
    colorsPerLevel: number;
    colorsMax: number;
    targetScorePerLevel: number;
    movesPerLevel: number;
    movesLimitMin: number;
    timePerLevel: number;
    timeLimitMinSeconds: number;
}

export interface IAnimationConfig {
    swapDuration: number;
    fallDuration: number;
    fallEasing: string;
    blastDuration: number;
    blastScale: number;
    blastStagger: number;
    spawnDuration: number;
    superSpawnDuration: number;
    shuffleDuration: number;
    invalidShakeDuration: number;
    invalidShakeOffset: number;
    boardAppearDuration: number;
    boardAppearStagger: number;
}

export interface IGameConfig {
    version: number;
    board: IBoardConfig;
    match: IMatchConfig;
    score: IScoreConfig;
    shuffle: IShuffleConfig;
    random: IRandomConfig;
    levels: ILevelsConfig;
    animation: IAnimationConfig;
}

export interface IEffectConfig {
    shape: string;
    radius: number;
    scorePerTile: number;
}

export interface IBoosterConfig {
    type: BoosterType;
    title: string;
    targeting: BoosterTargeting;
    charges: number;
    usesMove: boolean;
    effect?: IEffectConfig;
}

export interface ISuperTileRule {
    minGroupSize: number;
    types: TileType[];
}

export interface ISuperTilesConfig {
    spawnRules: ISuperTileRule[];
    effects: { [type: string]: IEffectConfig };
}

export interface IBoosterConfigFile {
    version: number;
    boosters: IBoosterConfig[];
    superTiles: ISuperTilesConfig;
}
