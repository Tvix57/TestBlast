/**
 * Минимальная заглушка `cc` для Jest: покрывает только то, что читается при загрузке
 * компонентов `game/` (декораторы и базовый класс). Ноды, твины и префабы не эмулируются —
 * тесты вызывают чистую логику компонентов напрямую.
 */
class Component {}

function ccclass(target) {
    // `@ccclass` без аргументов — декоратор класса; `@ccclass('Name')` — фабрика.
    if (typeof target === 'function') {
        return target;
    }
    return (klass) => klass;
}

function property() {
    return () => undefined;
}

/** Цепочка твина для тестов: `call`-колбэки выполняются при `start()`. */
class Tween {
    constructor() {
        this._calls = [];
    }
    to() { return this; }
    by() { return this; }
    delay() { return this; }
    call(callback) { this._calls.push(callback); return this; }
    start() {
        const calls = this._calls.slice();
        this._calls.length = 0;
        calls.forEach((callback) => callback());
        return this;
    }
}

Tween.stopAllByTarget = () => undefined;

global.cc = {
    _decorator: { ccclass, property },
    Component,
    Node: { EventType: { TOUCH_END: 'touchend' } },
    Prefab: class Prefab {},
    Label: class Label {},
    Button: class Button {},
    Sprite: class Sprite {},
    SpriteAtlas: class SpriteAtlas {},
    JsonAsset: class JsonAsset {},
    Float: 'Float',
    Integer: 'Integer',
    Enum: (value) => value,
    error: () => undefined,
    warn: () => undefined,
    Tween,
    tween: () => new Tween(),
    v3: (x, y, z) => ({ x, y, z })
};

