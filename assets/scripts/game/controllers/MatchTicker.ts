import { MatchTimer } from '../../core/MatchTimer';

/** Планировщик тика: в сцене — `cc.Component.schedule`, в тестах — фейк. */
export interface IMatchScheduler {
    Schedule(callback: () => void, intervalSeconds: number): void;
    Unschedule(callback: () => void): void;
}

export class MatchTicker {
    private static readonly INTERVAL_SECONDS: number = 1;

    private _scheduler: IMatchScheduler;
    private _readTimer: () => MatchTimer;
    private _onTime: (remainingSeconds: number, limitSeconds: number) => void;
    private _onExpired: () => void;
    private _tick: () => void;
    private _scheduled: boolean = false;

    constructor(
        scheduler: IMatchScheduler,
        readTimer: () => MatchTimer,
        onTime: (remainingSeconds: number, limitSeconds: number) => void,
        onExpired: () => void
    ) {
        this._scheduler = scheduler;
        this._readTimer = readTimer;
        this._onTime = onTime;
        this._onExpired = onExpired;
        this._tick = () => this.Refresh();
    }

    public get CanTick(): boolean {
        const timer = this._readTimer();
        return !!timer && timer.IsEnabled;
    }

    public Start(): void {
        if (!this.CanTick || this._scheduled) {
            return;
        }
        this._scheduled = true;
        this._scheduler.Schedule(this._tick, MatchTicker.INTERVAL_SECONDS);
        this.Refresh();
    }

    public Stop(): void {
        if (!this._scheduled) {
            return;
        }
        this._scheduled = false;
        this._scheduler.Unschedule(this._tick);
    }

    public Refresh(): void {
        const timer = this._readTimer();
        if (!timer || !timer.IsEnabled) {
            return;
        }
        this._onTime(timer.Remaining, timer.Limit);
        if (timer.IsExpired) {
            this._onExpired();
        }
    }
}
