import { GameSession } from '../../core/GameSession';
import { EndDialogView, IEndDialogData } from './EndDialogView';
import { DialogType, IDialogManager, IDialogOptions } from './IDialogManager';
import { StartDialogView } from './StartDialogView';
import { TextUtil } from './TextUtil';

const START_TITLE = 'ВЗРЫВ ТАЙЛОВ';
const START_BUTTON = 'ИГРАТЬ';

type IDialogCallOptions = Omit<IDialogOptions, 'Configure'>;

export class DialogsController {
    constructor(
        private _dialogs: IDialogManager,
        private _getSession: () => GameSession
    ) {}

    public OpenStartDialog(onPlay: () => void, options: IDialogCallOptions = {}): boolean {
        return this._dialogs.OpenDialog(DialogType.StartDialog, {
            ...options,
            Configure: (view) => {
                const dialog = view as StartDialogView;
                dialog.SetTexts(START_TITLE, this.buildRulesText(), START_BUTTON);
                dialog.SetOnConfirm(onPlay);
            }
        });
    }

    public OpenEndDialog(data: IEndDialogData, onRestart: () => void, options: IDialogCallOptions = {}): boolean {
        return this._dialogs.OpenDialog(DialogType.EndDialog, {
            ...options,
            Configure: (view) => {
                const dialog = view as EndDialogView;
                dialog.SetResult(data);
                dialog.SetOnConfirm(onRestart);
            }
        });
    }

    public SetPauseHandler(handler: (paused: boolean) => void): void {
        this._dialogs.SetPauseHandler(handler);
    }

    public ClearPauseHandler(handler: (paused: boolean) => void): void {
        this._dialogs.ClearPauseHandler(handler);
    }

    private buildRulesText(): string {
        return TextUtil.BuildRules(this._getSession());
    }
}
