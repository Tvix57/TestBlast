import { GameSession } from '../../core/GameSession';

export class TextUtil {
    public static Plural(count: number, one: string, few: string, many: string): string {
        const mod100 = Math.abs(count) % 100;
        const mod10 = mod100 % 10;
        if (mod100 >= 11 && mod100 <= 14) {
            return many;
        }
        if (mod10 === 1) {
            return one;
        }
        if (mod10 >= 2 && mod10 <= 4) {
            return few;
        }
        return many;
    }

    public static BuildRules(game: GameSession): string {
        const config = game.Config;
        const match = config.match;
        const limits: string[] = [];
        if (match.movesLimit > 0) {
            limits.push(match.movesLimit + ' ' + TextUtil.Plural(match.movesLimit, 'ход', 'хода', 'ходов'));
        }
        if (match.timeLimitSeconds > 0) {
            limits.push(match.timeLimitSeconds + ' '
                + TextUtil.Plural(match.timeLimitSeconds, 'секунда', 'секунды', 'секунд'));
        }

        const lines: string[] = [];
        lines.push('Уровень ' + game.Level + '.');
        lines.push('Цель: ' + match.targetScore + ' очков.');
        if (limits.length > 0) {
            lines.push('Лимиты: ' + limits.join(' и ') + '.');
        }
        lines.push('Жмите на группу из ' + config.board.minGroupSize + '+ тайлов одного цвета.');

        const spawnRules = (game.Rules.Config.superTiles && game.Rules.Config.superTiles.spawnRules) || [];
        const minSuper = spawnRules.reduce((min, rule) => Math.min(min, rule.minGroupSize), Infinity);
        if (isFinite(minSuper)) {
            lines.push('Группа ' + minSuper + '+ оставляет супер-тайл.');
        }
        return lines.join('\n');
    }
}
