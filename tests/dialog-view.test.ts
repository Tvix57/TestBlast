import { DialogView } from '../assets/scripts/game/dialogs/DialogView';
import { DialogType } from '../assets/scripts/game/dialogs/IDialogManager';

function createView(): any {
    const view: any = new DialogView();
    view.node = { active: true };
    view.mask = null;
    view.panel = null;
    return view;
}

describe('DialogView: порядок подтверждения и закрытия', () => {
    it('действие выполняется после закрытия диалога', () => {
        const view = createView();
        const order: string[] = [];
        view.SetOnConfirm(() => order.push('confirm'));
        view.SetOnCloseRequest((onClosed) => {
            order.push('close');
            if (onClosed) {
                onClosed();
            }
        });
        view.SetOpenInfo(DialogType.StartDialog, {});

        view.confirm();

        expect(order).toEqual(['close', 'confirm']);
    });

    it('повторный confirm не дублирует действие', () => {
        const view = createView();
        const confirm = jest.fn();
        view.SetOnConfirm(confirm);
        view.SetOnCloseRequest((onClosed) => {
            if (onClosed) {
                onClosed();
            }
        });
        view.SetOpenInfo(DialogType.EndDialog, {});

        view.confirm();
        view.confirm();

        expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('без менеджера Close скрывает окно и затем вызывает действие', () => {
        const view = createView();
        const order: string[] = [];
        view.SetOnConfirm(() => order.push('confirm'));
        view.SetOpenInfo(DialogType.StartDialog, {});

        view.confirm();

        expect(view.node.active).toBe(false);
        expect(order).toEqual(['confirm']);
    });
});
