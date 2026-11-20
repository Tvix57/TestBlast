import { ITimerHandler, MatchTimer } from '../assets/scripts/core/MatchTimer';
import { createClock } from './helpers';

describe('MatchTimer', () => {
    it('без лимита таймер выключен и время не идёт', () => {
        const clock = createClock();
        const timer = new MatchTimer(0, clock.now);
        timer.Start();

        clock.advance(10);

        expect(timer.IsEnabled).toBe(false);
        expect(timer.IsExpired).toBe(false);
        expect(timer.Remaining).toBe(0);
    });

    it('Start запускает отсчёт: событие публикует лимит, остаток считается по часам', () => {
        const clock = createClock();
        const timer = new MatchTimer(180, clock.now);
        const seen: number[] = [];
        const handler: ITimerHandler = { OnTimeChanged: (remaining) => seen.push(remaining) };
        timer.AddHandler(handler);

        timer.Start();
        clock.advance(30);
        clock.advance(0.5);

        expect(seen).toEqual([180]);
        expect(timer.Remaining).toBeCloseTo(149.5);
    });

    it('Pause останавливает отсчёт, Resume возобновляет', () => {
        const clock = createClock();
        const timer = new MatchTimer(60, clock.now);
        timer.Start();
        clock.advance(10);

        timer.Pause();
        clock.advance(10);
        expect(timer.Remaining).toBe(50);

        timer.Resume();
        clock.advance(5);
        expect(timer.Remaining).toBe(45);
    });

    it('по истечении времени остаток равен нулю и не уходит в минус', () => {
        const clock = createClock();
        const timer = new MatchTimer(5, clock.now);
        timer.Start();

        clock.advance(3);
        clock.advance(10);

        expect(timer.Remaining).toBe(0);
        expect(timer.IsExpired).toBe(true);
        clock.advance(5);
        expect(timer.Remaining).toBe(0);
    });

    it('EndsAtMs — маяк окончания: в игре стоит, на паузе сдвигается и время стоит', () => {
        const clock = createClock();
        const timer = new MatchTimer(60, clock.now);
        timer.Start();
        const endsAtMs = timer.EndsAtMs;

        clock.advance(10);
        expect(timer.EndsAtMs).toBe(endsAtMs);
        expect(timer.Remaining).toBe(50);

        timer.Pause();
        expect(timer.Remaining).toBe(50);

        clock.advance(30);
        expect(timer.Remaining).toBe(50);
        expect(timer.EndsAtMs).toBe(clock.now() + 50 * 1000);

        timer.Resume();
        clock.advance(50);

        expect(timer.Remaining).toBe(0);
        expect(timer.IsExpired).toBe(true);
    });

    it('Expire обнуляет остаток и рассылает событие один раз', () => {
        const timer = new MatchTimer(30, createClock().now);
        const seen: number[] = [];
        timer.AddHandler({ OnTimeChanged: (remaining) => seen.push(remaining) });
        timer.Start();
        seen.length = 0;

        timer.Expire();

        expect(timer.Remaining).toBe(0);
        expect(timer.IsExpired).toBe(true);
        expect(seen).toEqual([0]);

        timer.Expire();
        expect(seen).toEqual([0]);
    });

    it('Configure сбрасывает остаток и останавливает отсчёт', () => {
        const clock = createClock();
        const timer = new MatchTimer(30, clock.now);
        timer.Start();
        clock.advance(10);
        expect(timer.Remaining).toBe(20);

        timer.Configure(30);
        expect(timer.Remaining).toBe(30);
        clock.advance(5);
        expect(timer.Remaining).toBe(30);

        timer.Configure(90);
        expect(timer.Limit).toBe(90);
        expect(timer.Remaining).toBe(90);
    });

    it('без лимита EndsAtMs равен нулю и Resume ничего не запускает', () => {
        const clock = createClock();
        const timer = new MatchTimer(0, clock.now);

        timer.Start();
        timer.Resume();
        clock.advance(10);

        expect(timer.EndsAtMs).toBe(0);
        expect(timer.Remaining).toBe(0);
        expect(timer.IsEnabled).toBe(false);
    });

    it('Resume до Start запускает отсчёт: таймер уже сконфигурирован', () => {
        const clock = createClock();
        const timer = new MatchTimer(30, clock.now);

        timer.Resume();
        clock.advance(5);

        expect(timer.Remaining).toBe(25);
        expect(timer.EndsAtMs).toBe(clock.now() + 25 * 1000);
    });

    it('Configure(0) выключает таймер, Expire без лимита не завершает отсчёт повторно', () => {
        const timer = new MatchTimer(30, createClock().now);
        const handler = { OnTimeChanged: jest.fn() };
        timer.AddHandler(handler);
        timer.Start();
        handler.OnTimeChanged.mockClear();

        timer.Configure(0);
        timer.Expire();

        expect(timer.IsEnabled).toBe(false);
        expect(timer.Remaining).toBe(0);
        expect(handler.OnTimeChanged).toHaveBeenCalledTimes(1);
        expect(handler.OnTimeChanged).toHaveBeenCalledWith(0, 0);
    });
});