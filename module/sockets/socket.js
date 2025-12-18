export default class Socket {
    constructor() {
        this.initialized = false;
        this.callbacks = {};
    }

    /** Initialize the singleton instance and set up listeners */
    static initialize() {
        Socket._instance._initialize();
    }

    _initialize() {
        if (this.initialized) return;

        game.socket.on('system.ova', (data) => {
            this._handleMessage(data);
        });

        this.initialized = true;
    }

    /** Handle incoming socket messages */
    _handleMessage(data) {
        const callback = this.callbacks[data.event];
        if (callback) callback(data.data);
    }

    /** Emit a message to all clients */
    static emit(eventName, data) {
        game.socket.emit('system.ova', {
            event: eventName,
            data: data
        });
    }

    /** Register a callback for a socket event */
    static on(eventName, callback) {
        Socket._instance._on(eventName, callback);
    }

    _on(eventName, callback) {
        this.callbacks[eventName] = callback;
    }
}

/** Singleton instance */
Socket._instance = new Socket();