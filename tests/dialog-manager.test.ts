import { DialogManagerComponent } from '../assets/scripts/game/dialogs/DialogManagerComponent';

/** Фейк view в стеке: для паузы менеджеру достаточно `Type`, `Options` и методов удаления. */
function createPauseView(): any {
    return {
        Type: 0,
        Options: { PauseGame: true },
        MarkClosing: () => true,
        StopAnimations: () => undefined,
        node: null
    };
}

function pushView(manager: DialogManagerComponent, view: any): void {
    (manager as any)._dialogStack.push(view);
}

describe('DialogManagerComponent: обработчик паузы снимается только свой', () => {
    it('SetPauseHandler сразу сообщает об уже открытой паузе', () => {
        const manager = new DialogManagerComponent();
        pushView(manager, createPauseView());
        const handler = jest.fn();

        manager.SetPauseHandler(handler);

        expect(handler).toHaveBeenCalledWith(true);
    });

    it('ClearPauseHandler чужого обработчика не снимает текущий', () => {
        const manager = new DialogManagerComponent();
        pushView(manager, createPauseView());
        const first = jest.fn();
        const second = jest.fn();
        manager.SetPauseHandler(first);
        manager.SetPauseHandler(second);

        manager.ClearPauseHandler(first);
        manager.CloseAllDialogs();

        expect(second).toHaveBeenCalledWith(false);
        expect(first).toHaveBeenCalledTimes(1);
    });

    it('снятый обработчик больше не получает переходы паузы', () => {
        const manager = new DialogManagerComponent();
        pushView(manager, createPauseView());
        const handler = jest.fn();
        manager.SetPauseHandler(handler);
        manager.ClearPauseHandler(handler);

        manager.CloseAllDialogs();

        expect(handler).toHaveBeenCalledTimes(1);
    });
});
