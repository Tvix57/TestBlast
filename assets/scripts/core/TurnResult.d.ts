import { ITileMove, ITilePlacement, ITileSpawn } from './Board';
import { ICell } from './Cell';
import { GameResult } from './GameResult';
import { Tile, TileType } from './Tile';
import { ITurnStep, TurnStepType } from './TurnStepType';

export interface ISuperSpawn {
    Cell: ICell;
    Tile: Tile;
    Type: TileType;
}

export interface IBlastStep {
    Type: TurnStepType.Blast;
    Primary: ICell[];
    Chain: ICell[];
    Points: number;
    Spawned: ISuperSpawn | null;
}

export interface IDropTilesStep {
    Type: TurnStepType.DropTiles;
    Moves: ITileMove[];
}

export interface IRefillStep {
    Type: TurnStepType.Refill;
    Spawns: ITileSpawn[];
}

export interface IShuffleStep {
    Type: TurnStepType.Shuffle;
    Placements: ITilePlacement[];
}

export interface ISwapStep {
    Type: TurnStepType.Swap;
    First: ICell;
    Second: ICell;
    FirstTile: Tile;
    SecondTile: Tile;
}

export interface ITurnResult {
    Steps: ITurnStep[];
    Accepted: boolean;
    Score: number;
    MovesLeft: number;
    TimeLeft: number;
    Result: GameResult;
}
