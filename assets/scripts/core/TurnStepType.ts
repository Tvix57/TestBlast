import { IBlastStep, IDropTilesStep, IRefillStep, IShuffleStep } from './TurnResult';

export enum TurnStepType {
    Blast = 'blast',
    DropTiles = 'droptiles',
    Refill = 'refill',
    Shuffle = 'shuffle'
}

export type ITurnStep = IBlastStep | IDropTilesStep | IRefillStep | IShuffleStep;
