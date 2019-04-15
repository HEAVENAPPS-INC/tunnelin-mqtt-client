import { subscribeToTopics, unsubscribeFromTopics, createClient, connectClient, publish, withEnv } from './mqtt-utils.js';
import 'mqtt';

class Client {
    constructor(serverUrl, mqttEnv, mqttConnectOptions = {}) {
        this.serverUrl = serverUrl;
        this.mqttEnv = mqttEnv;
        this.mqttConnectOptions = mqttConnectOptions;
        this.client = null;
        this._subscribed = false;
        this.topics = [];
        this._handlers = [];
        this._actionHandler = {};
        this.onMqttMessage = (topic, message, packet) => {
            const topics = this.topics
                .map(t => withEnv(this.mqttEnv) `${this.getTopicWithoutHash(t)}`)
                .filter(t => topic.indexOf(t) === 0);
            if (topics.length === 0) {
                return;
            }
            for (const handler of this._handlers) {
                if (typeof handler === "function") {
                    try {
                        handler(topic, message, packet);
                    }
                    catch (e) {
                        // handler throws error, not interested
                    }
                }
            }
            this.provideMessageToActionHandlers(topic, message, packet);
        };
    }
    async connectClient() {
        this.client = createClient(this.serverUrl, this.mqttConnectOptions);
        await connectClient(this.client);
        this.client.on("message", this.onMqttMessage);
    }
    async endClient() {
        if (!this.connectClient) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            this.client.end(undefined, resolve);
        });
    }
    subscribeToTopics(topics) {
        this.assertConnected();
        let t = typeof topics === "string" ? [topics] : topics;
        if (t.length) {
            t = t.filter(topic => this.topics.indexOf(topic) === -1);
            subscribeToTopics(this.client, t, this.mqttEnv);
            this.topics = [...this.topics, ...t];
            this._subscribed = true;
        }
    }
    unsubscribeFromTopics(topics) {
        this.assertConnected();
        const t = typeof topics === "string" ? [topics] : topics;
        if (t.length) {
            unsubscribeFromTopics(this.client, t, this.mqttEnv);
            for (const topic of t) {
                const i = this.topics.indexOf(topic);
                if (i >= 0) {
                    this.topics.splice(i, 1);
                }
            }
            this._subscribed = this._subscribed && this.topics.length > 0;
        }
    }
    getTopics() {
        return [...this.topics];
    }
    publish(topic, message) {
        this.assertConnected();
        publish(this.client, topic, message, this.mqttEnv);
    }
    addHandler(fn) {
        this._handlers.push(fn);
    }
    addHandlerForAction(actionType, fn) {
        this._actionHandler[actionType] = this._actionHandler[actionType] || [];
        this._actionHandler[actionType].push(fn);
    }
    removeHandler(fn) {
        const i = this._handlers.indexOf(fn);
        if (i >= 0) {
            this._handlers.splice(i, 1);
        }
    }
    removeHandlerForAction(actionType, fn) {
        const functions = this._actionHandler[actionType];
        if (!functions) {
            return;
        }
        const i = functions.indexOf(fn);
        if (i >= 0) {
            functions.splice(i, 1);
        }
        this._actionHandler[actionType] = functions;
    }
    getTopicWithoutHash(topic) {
        const hasHashAtTheEnd = topic[topic.length - 1] === "#";
        return !hasHashAtTheEnd ? topic : topic.substr(0, topic.length - 1);
    }
    provideMessageToActionHandlers(topic, message, packet) {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
        }
        catch (e) {
            // logger.warn(`'can not parse message from topic ${topic}, message: ${message}`);
        }
        if (!parsedMessage) {
            return;
        }
        const { type } = parsedMessage;
        if (type) {
            const actionHandlers = this._actionHandler[type] || [];
            for (const handler of actionHandlers) {
                if (typeof handler === "function") {
                    try {
                        handler(topic, message, packet);
                    }
                    catch (e) {
                        // handler throws error, not interested
                    }
                }
            }
        }
    }
    assertConnected() {
        if (!this.client.connected) {
            throw new Error(`Client is not connected: Please call connectClient method first`);
        }
    }
    destroy() {
        try {
            this.unsubscribeFromTopics(this.topics);
        }
        catch (e) { }
        if (this.client.connected) {
            this.client.end();
        }
        this._subscribed = false;
        this.client = null;
        this._handlers = [];
        this._actionHandler = {};
    }
}

export default Client;
