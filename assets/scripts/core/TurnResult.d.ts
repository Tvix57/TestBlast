import { ITileMove, ITilePlacement, ITileSpawn } from './Board';
import { ICell } from './Cell';
import { GameResult } from './GameResult';
import { ITurnStep, TurnStepType } from './TurnStepType';

export interface IBlastStep {
    Type: TurnStepType.Blast;
    Primary: ICell[];
    Points: number;
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

export interface ITurnResult {
    Steps: ITurnStep[];
    Accepted: boolean;
    Score: number;
    MovesLeft: number;
    TimeLeft: number;
    Result: GameResult;
}
