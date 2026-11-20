import { IBlastStep, ICollapseStep, IRefillStep, IShuffleStep, ISwapStep } from './TurnResult';

export enum TurnStepType {
    Blast = 'blast',
    Collapse = 'collapse',
    Refill = 'refill',
    Shuffle = 'shuffle',
    Swap = 'swap'
}

export type ITurnStep = IBlastStep | ICollapseStep | IRefillStep | IShuffleStep | ISwapStep;
