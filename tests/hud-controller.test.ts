import { HudController } from '../assets/scripts/game/controllers/HudController';
import { createGame, createHudView } from './helpers';

describe('HudController: одна подписка на три модели сессии', () => {
    it('до Start показывает нули, после Start — лимиты сессии', () => {
        const session = createGame({ seed: 1, movesLimit: 5, timeLimitSeconds: 60, targetScore: 500 });
        const view = createHudView();

        new HudController(view, session);

        expect(view.SetTarget).toHaveBeenCalledWith(500);
        expect(view.SetScore).toHaveBeenCalledWith(0);
        expect(view.SetMoves).toHaveBeenLastCalledWith(0, 0);
        expect(view.SetTime).toHaveBeenCalledWith(60, 60);

        session.Start();

        expect(view.SetMoves).toHaveBeenLastCalledWith(5, 5);
    });

    it('обновляет вид на события счёта, ходов и таймера', () => {
        const session = createGame({ seed: 2, movesLimit: 4, timeLimitSeconds: 60, targetScore: 500 });
        const view = createHudView();
        new HudController(view, session);
        session.Start();
        jest.clearAllMocks();

        session.Score.Add(25);
        session.Moves.Spend();
        session.Timer.Start();

        expect(view.SetScore).toHaveBeenCalledWith(25);
        expect(view.SetMoves).toHaveBeenCalledWith(3, 4);
        expect(view.SetTime).toHaveBeenCalledWith(60, 60);
    });

    it('Dispose отписывает все три модели сессии', () => {
        const session = createGame({ seed: 3, movesLimit: 2, timeLimitSeconds: 60, targetScore: 500 });
        session.Start();
        const view = createHudView();
        const hud = new HudController(view, session);
        hud.Dispose();
        jest.clearAllMocks();

        session.Score.Add(10);
        session.Moves.Spend();
        session.Timer.Expire();

        expect(view.SetScore).not.toHaveBeenCalled();
        expect(view.SetMoves).not.toHaveBeenCalled();
        expect(view.SetTime).not.toHaveBeenCalled();
    });
});
