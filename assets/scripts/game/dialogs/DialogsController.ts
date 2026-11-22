import { Root } from '../Root';
import { EndDialogView, IEndDialogData } from './EndDialogView';
import { DialogType, IDialogOptions } from './IDialogManager';
import { StartDialogView } from './StartDialogView';

const START_TITLE = 'ВЗРЫВ ТАЙЛОВ';
const START_BUTTON = 'ИГРАТЬ';

type IDialogCallOptions = Omit<IDialogOptions, 'Configure'>;

export class DialogsController {
    public OpenStartDialog(onPlay: () => void, options: IDialogCallOptions = {}): boolean {
        return Root.Instance.ResolveDialogManager().OpenDialog(DialogType.StartDialog, {
            ...options,
            Configure: (view) => {
                const dialog = view as StartDialogView;
                dialog.SetTexts(START_TITLE, this.buildRulesText(), START_BUTTON);
                dialog.SetOnConfirm(onPlay);
            }
        });
    }

    public OpenEndDialog(data: IEndDialogData, onRestart: () => void, options: IDialogCallOptions = {}): boolean {
        return Root.Instance.ResolveDialogManager().OpenDialog(DialogType.EndDialog, {
            ...options,
            Configure: (view) => {
                const dialog = view as EndDialogView;
                dialog.SetResult(data);
                dialog.SetOnConfirm(onRestart);
            }
        });
    }

    public SetPauseHandler(handler: (paused: boolean) => void): void {
        Root.Instance.ResolveDialogManager().SetPauseHandler(handler);
    }

    public ClearPauseHandler(handler: (paused: boolean) => void): void {
        if (Root.Instance.IsReady) {
            Root.Instance.ResolveDialogManager().ClearPauseHandler(handler);
        }
    }

    private buildRulesText(): string {
        const game = Root.Instance.Context.Session;
        const config = game.Config;
        const match = config.match;
        const limits: string[] = [];
        if (match.movesLimit > 0) {
            limits.push(match.movesLimit + ' ходов');
        }
        if (match.timeLimitSeconds > 0) {
            limits.push(match.timeLimitSeconds + ' секунд');
        }
        const lines: string[] = [];
        lines.push('Уровень ' + game.Level + '.');
        lines.push('Цель: ' + match.targetScore + ' очков.');
        if (limits.length > 0) {
            lines.push('Лимиты: ' + limits.join(' и ') + '.');
        }
        lines.push('Жмите на группу из ' + config.board.minGroupSize + '+ тайлов одного цвета.');
        lines.push('Группа 5+ оставляет супер-тайл.');
        return lines.join('\n');
    }
}
