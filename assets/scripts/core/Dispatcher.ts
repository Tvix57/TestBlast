/**
 * Рассылка событий модели подписчикам (контроллеры слоя представления).
 */
export class Dispatcher<T> {
    private _handlers: T[] = [];

    public AddObserver(handler: T): void {
        if (this._handlers.indexOf(handler) !== -1) {
            return;
        }
        this._handlers.push(handler);
    }

    public RemoveObserver(handler: T): void {
        const index = this._handlers.indexOf(handler);
        if (index !== -1) {
            this._handlers.splice(index, 1);
        }
    }

    public RemoveAll(): void {
        this._handlers.length = 0;
    }

    public Post(post: (handler: T) => void): void {
        this._handlers.slice().forEach(post);
    }
}

export abstract class AbstractDispatcher<T> {
    protected _dispatcher: Dispatcher<T> = new Dispatcher<T>();

    public AddHandler(handler: T): void {
        this._dispatcher.AddObserver(handler);
    }

    public RemoveHandler(handler: T): void {
        this._dispatcher.RemoveObserver(handler);
    }

    public RemoveAll(): void {
        this._dispatcher.RemoveAll();
    }
}

