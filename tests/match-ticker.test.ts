import { MatchTimer } from '../assets/scripts/core/MatchTimer';
import { MatchTicker } from '../assets/scripts/game/controllers/MatchTicker';
import { createClock } from './helpers';

/** Фейк планировщика: запоминает колбэк, интервал и снятие — без `cc`. */
function createScheduler() {
    const scheduler = {
        Scheduled: null as null | (() => void),
        Unscheduled: null as null | (() => void),
        Interval: 0,
        Schedule(callback: () => void, intervalSeconds: number): void {
            scheduler.Scheduled = callback;
            scheduler.Interval = intervalSeconds;
        },
        Unschedule(callback: () => void): void {
            scheduler.Unscheduled = callback;
        }
    };
    return scheduler;
}

describe('MatchTicker: ежесекундный тик таймера матча', () => {
    it('Start ставит тик на секунду и сразу отдаёт время в HUD', () => {
        const clock = createClock();
        const timer = new MatchTimer(180, clock.now);
        timer.Start();
        const scheduler = createScheduler();
        const onTime = jest.fn();
        const onExpired = jest.fn();
        const ticker = new MatchTicker(scheduler, () => timer, onTime, onExpired);

        ticker.Start();

        expect(scheduler.Scheduled).not.toBeNull();
        expect(scheduler.Interval).toBe(1);
        expect(onTime).toHaveBeenCalledWith(180, 180);
        expect(onExpired).not.toHaveBeenCalled();
    });

    it('каждый тик читает остаток у модели: время идёт', () => {
        const clock = createClock();
        const timer = new MatchTimer(180, clock.now);
        timer.Start();
        const scheduler = createScheduler();
        const onTime = jest.fn();
        const ticker = new MatchTicker(scheduler, () => timer, onTime, () => undefined);
        ticker.Start();

        clock.advance(30);
        expect(scheduler.Scheduled).not.toBeNull();
        (scheduler.Scheduled as () => void)();

        expect(onTime).toHaveBeenLastCalledWith(150, 180);
    });

    it('по истечении отдаёт нулевой остаток и сообщает о финале', () => {
        const clock = createClock();
        const timer = new MatchTimer(180, clock.now);
        timer.Start();
        const scheduler = createScheduler();
        const onTime = jest.fn();
        const onExpired = jest.fn();
        const ticker = new MatchTicker(scheduler, () => timer, onTime, onExpired);
        ticker.Start();

        clock.advance(181);
        (scheduler.Scheduled as () => void)();

        expect(onTime).toHaveBeenLastCalledWith(0, 180);
        expect(onExpired).toHaveBeenCalledTimes(1);
        expect(ticker.CanTick).toBe(true);
    });

    it('без лимита времени тик не ставится, время и финал не трогаются', () => {
        const clock = createClock();
        const timer = new MatchTimer(0, clock.now);
        timer.Start();
        const scheduler = createScheduler();
        const onTime = jest.fn();
        const onExpired = jest.fn();
        const ticker = new MatchTicker(scheduler, () => timer, onTime, onExpired);

        ticker.Start();
        ticker.Refresh();

        expect(scheduler.Scheduled).toBeNull();
        expect(ticker.CanTick).toBe(false);
        expect(onTime).not.toHaveBeenCalled();
        expect(onExpired).not.toHaveBeenCalled();
    });

    it('Stop снимает тот же колбэк, который был поставлен', () => {
        const clock = createClock();
        const timer = new MatchTimer(60, clock.now);
        timer.Start();
        const scheduler = createScheduler();
        const ticker = new MatchTicker(scheduler, () => timer, () => undefined, () => undefined);
        ticker.Start();
        const scheduled = scheduler.Scheduled;

        ticker.Stop();

        expect(scheduled).not.toBeNull();
        expect(scheduler.Unscheduled).toBe(scheduled);
    });

    it('после смены матча читает таймер новой сессии', () => {
        const clock = createClock();
        const first = new MatchTimer(180, clock.now);
        first.Start();
        let current = first;
        const scheduler = createScheduler();
        const onTime = jest.fn();
        const ticker = new MatchTicker(scheduler, () => current, onTime, () => undefined);
        ticker.Start();

        const nextClock = createClock();
        const second = new MatchTimer(10, nextClock.now);
        second.Start();
        current = second;
        ticker.Refresh();

        expect(onTime).toHaveBeenLastCalledWith(10, 10);
    });
});
