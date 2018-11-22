import { subscribeToTopics, unsubscribeFromTopics, createClient, connectClient, withEnv } from './mqtt-utils.js';
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
        if (!this.check()) {
            return;
        }
        if (this._subscribed) {
            return;
        }
        subscribeToTopics(this.client, this.topics, this.mqttEnv);
        this.client.on("message", this.onMqttMessage);
        this._subscribed = true;
    }
    unsubscribe() {
        if (!this.check()) {
            return;
        }
        if (!this._subscribed) {
            return;
        }
        unsubscribeFromTopics(this.client, this.topics, this.mqttEnv);
        this._subscribed = false;
    }
    addHandler(fn) {
        this._handlers.push(fn);
    }
    removeHandler(fn) {
        const i = this._handlers.indexOf(fn);
        if (i >= 0) {
            this._handlers.splice(i, 1);
        }
    }
    getTopicWithoutHash(topic) {
        const hasHashAtTheEnd = topic[topic.length - 1] === "#";
        return !hasHashAtTheEnd ? topic : topic.substr(0, topic.length - 1);
    }
    check() {
        if (!this._connected || !this.topics) {
            if (!this._connected) {
                throw new Error(`Client is not connected: Please call connectClient method first`);
            }
            if (!this.topics) {
                throw new Error(`There are no topics to subscribe`);
            }
            return false;
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
    }
}

export default Client;