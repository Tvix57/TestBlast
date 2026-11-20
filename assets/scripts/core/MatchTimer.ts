import { AbstractDispatcher } from './Dispatcher';

export interface ITimerHandler {
    OnTimeChanged(remainingSeconds: number, limitSeconds: number): void;
}

export class MatchTimer extends AbstractDispatcher<ITimerHandler> {
    private _limit: number = 0;
    private _remaining: number = 0;
    private _running: boolean = false;
    private _endsAtMs: number = 0;
    private _now: () => number;

    constructor(limitSeconds: number, now: () => number = () => Date.now()) {
        super();
        this._limit = Math.max(0, limitSeconds);
        this._remaining = this._limit;
        this._now = now;
    }

    public get IsEnabled(): boolean {
        return this._limit > 0;
    }

    public get Limit(): number {
        return this._limit;
    }

    public get EndsAtMs(): number {
        if (!this.IsEnabled) {
            return 0;
        }
        if (!this._running) {
            return this._now() + this._remaining * 1000;
        }
        return this._endsAtMs;
    }

    public get Remaining(): number {
        if (!this.IsEnabled) {
            return 0;
        }
        if (!this._running) {
            return this._remaining;
        }
        return Math.max(0, (this._endsAtMs - this._now()) / 1000);
    }

    public get IsExpired(): boolean {
        return this.IsEnabled && this.Remaining <= 0;
    }

    public Configure(limitSeconds: number): void {
        this._limit = Math.max(0, limitSeconds);
        this.Reset();
    }

    public Start(): void {
        this.run();
        this.post();
    }

    public Pause(): void {
        if (this._running) {
            this._remaining = this.Remaining;
        }
        this._running = false;
        this._endsAtMs = 0;
    }

    public Resume(): void {
        this.run();
    }

    private Reset(): void {
        this._remaining = this._limit;
        this._running = false;
        this._endsAtMs = 0;
        this.post();
    }

    public Expire(): void {
        if (!this.IsEnabled || this._remaining <= 0) {
            return;
        }
        this._remaining = 0;
        this._running = false;
        this._endsAtMs = 0;
        this.post();
    }

    private run(): void {
        this._running = this.IsEnabled && this._remaining > 0;
        this._endsAtMs = this._running ? this._now() + this._remaining * 1000 : 0;
    }

    private post(): void {
        this._dispatcher.Post((handler) => handler.OnTimeChanged(this._remaining, this._limit));
    }
}
