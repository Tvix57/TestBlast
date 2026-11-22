import { TextUtil } from '../assets/scripts/game/dialogs/TextUtil';
import { createGame } from './helpers';

describe('TextUtil: правила и склонения из конфигов', () => {
    it('подставляет лимиты с правильными склонениями', () => {
        const one = createGame({ movesLimit: 1, timeLimitSeconds: 1, targetScore: 100 });
        expect(TextUtil.BuildRules(one)).toContain('1 ход и 1 секунда');

        const few = createGame({ movesLimit: 3, timeLimitSeconds: 22, targetScore: 100 });
        expect(TextUtil.BuildRules(few)).toContain('3 хода и 22 секунды');

        const many = createGame({ movesLimit: 11, timeLimitSeconds: 37, targetScore: 100 });
        expect(TextUtil.BuildRules(many)).toContain('11 ходов и 37 секунд');
    });

    it('берёт порог супер-тайла из spawnRules, а не из литерала', () => {
        const game = createGame({ targetScore: 500 });
        const text = TextUtil.BuildRules(game);
        const minSuper = game.Rules.Config.superTiles.spawnRules
            .reduce((min, rule) => Math.min(min, rule.minGroupSize), Infinity);

        expect(text).toContain('Группа ' + minSuper + '+ оставляет супер-тайл.');
        expect(text).toContain('Уровень ' + game.Level + '.');
        expect(text).toContain('Цель: ' + game.Config.match.targetScore + ' очков.');
        expect(text).toContain('из ' + game.Config.board.minGroupSize + '+ тайлов');
    });

    it('без лимитов строка «Лимиты» не выводится', () => {
        const game = createGame({ movesLimit: 0, timeLimitSeconds: 0, targetScore: 100 });

        expect(TextUtil.BuildRules(game)).not.toContain('Лимиты:');
    });

    it('Plural покрывает 11–14 и нули', () => {
        expect(TextUtil.Plural(0, 'ход', 'хода', 'ходов')).toBe('ходов');
        expect(TextUtil.Plural(1, 'ход', 'хода', 'ходов')).toBe('ход');
        expect(TextUtil.Plural(4, 'ход', 'хода', 'ходов')).toBe('хода');
        expect(TextUtil.Plural(12, 'ход', 'хода', 'ходов')).toBe('ходов');
        expect(TextUtil.Plural(21, 'ход', 'хода', 'ходов')).toBe('ход');
        expect(TextUtil.Plural(22, 'ход', 'хода', 'ходов')).toBe('хода');
    });
});
