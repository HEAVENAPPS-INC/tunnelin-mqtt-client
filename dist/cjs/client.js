'use strict';

var mqttUtils = require('./mqtt-utils.js');
require('mqtt');

class Client {
    constructor(serverUrl, mqttEnv, mqttConnectOptions = {}) {
        this.serverUrl = serverUrl;
        this.mqttEnv = mqttEnv;
        this.mqttConnectOptions = mqttConnectOptions;
        this.client = null;
        this._connected = false;
        this._subscribed = false;
        this.topics = [];
        this._handlers = [];
        this._actionHandler = {};
        this.onMqttMessage = (topic, message, packet) => {
            const topics = this.topics
                .map(t => mqttUtils.withEnv(this.mqttEnv) `${this.getTopicWithoutHash(t)}`)
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
            this._connected = false;
        };
    }
    async connectClient() {
        this.client = mqttUtils.createClient(this.serverUrl, this.mqttConnectOptions);
        await mqttUtils.connectClient(this.client);
        this._connected = true;
        this.client.on("close", this.onClientClose);
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
            mqttUtils.subscribeToTopics(this.client, t, this.mqttEnv);
            this.topics = [...this.topics, ...t];
            this._subscribed = true;
        }
    }
    unsubscribeFromTopics(topics) {
        this.assertConnected();
        const t = typeof topics === "string" ? [topics] : topics;
        if (t.length) {
            mqttUtils.unsubscribeFromTopics(this.client, t, this.mqttEnv);
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
        mqttUtils.publish(this.client, topic, message, this.mqttEnv);
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
        if (!this._connected) {
            throw new Error(`Client is not connected: Please call connectClient method first`);
        }
    }
    destroy() {
        try {
            this.unsubscribeFromTopics(this.topics);
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

module.exports = Client;
