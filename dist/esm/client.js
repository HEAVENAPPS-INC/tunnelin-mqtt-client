import { subscribeToTopics, unsubscribeFromTopics, createClient, connectClient, publish, withEnv } from './mqtt-utils.js';
import 'mqtt';

class Client {
    constructor(serverUrl, topics, mqttEnv, mqttConnectOptions = {}) {
        this.serverUrl = serverUrl;
        this.topics = topics;
        this.mqttEnv = mqttEnv;
        this.mqttConnectOptions = mqttConnectOptions;
        this._connected = false;
        this._subscribed = false;
        this.client = null;
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
                handler(topic, message, packet);
            }
            this.provideMessageToActionHandlers(topic, message, packet);
        };
        this.onClientClose = () => {
            console.log("Client disconnected");
            this._connected = false;
        };
    }
    async connectClient() {
        this.client = createClient(this.serverUrl, this.mqttConnectOptions);
        await connectClient(this.client);
        this._connected = true;
        this.client.on("close", this.onClientClose);
    }
    subscribe() {
        this.assertConnected();
        if (this._subscribed) {
            return;
        }
        subscribeToTopics(this.client, this.topics, this.mqttEnv);
        this.client.on("message", this.onMqttMessage);
        this._subscribed = true;
    }
    unsubscribe() {
        this.assertConnected();
        if (!this._subscribed) {
            return;
        }
        unsubscribeFromTopics(this.client, this.topics, this.mqttEnv);
        this._subscribed = false;
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
                handler(topic, parsedMessage, packet);
            }
        }
    }
    assertConnected() {
        if (!this._connected || !this.topics) {
            if (!this._connected) {
                throw new Error(`Client is not connected: Please call connectClient method first`);
            }
            if (!this.topics) {
                throw new Error(`There are no topics to subscribe`);
            }
        }
        return true;
    }
    destroy() {
        try {
            this.unsubscribe();
        }
        catch (e) { }
        if (this._connected) {
            this.client.end();
        }
        this._connected = false;
        this._subscribed = false;
        this.client = null;
        this._handlers = [];
        this._actionHandler = {};
    }
}

export default Client;
