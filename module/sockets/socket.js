export default class Socket {
    constructor() {
        this.initialized = false;
        this.callbacks = {};
    }

    static initialize() {
        Socket._instance._initialize();
    }

    _initialize() {
        if (!this.initialized) {
            game.socket.on('system.ova', (data) => {
                Socket._instance._handleMessage(data);
            });
            this.initialized = true;
        }
    }

    _handleMessage(data) {
        if (this.callbacks[data.event]) {
            this.callbacks[data.event](data.data);
        }
    }

    static emit(eventName, data) {
        const message = {
            event: eventName,
            data: data
        }
        game.socket.emit('system.ova', message);
    }

    static on(eventName, callback) {
        Socket._instance._on(eventName, callback);
    }

    _on(eventName, callback) {
        this.callbacks[eventName] = callback;
    }
}
Socket._instance = new Socket();