import { IBlastStep, IDropTilesStep, IRefillStep, IShuffleStep, ISwapStep } from './TurnResult';

export enum TurnStepType {
    Blast = 'blast',
    DropTiles = 'droptiles',
    Refill = 'refill',
    Shuffle = 'shuffle',
    Swap = 'swap'
}

export type ITurnStep = IBlastStep | IDropTilesStep | IRefillStep | IShuffleStep | ISwapStep;
