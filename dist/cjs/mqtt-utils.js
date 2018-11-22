'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var mqtt = _interopDefault(require('mqtt'));

function createClient(url, options = {}) {
    return mqtt.connect(url, Object.assign({ keepalive: 60 }, options));
}
const connectClient = (client) => {
    return new Promise((resolve, reject) => {
        client.on("connect", function () {
            resolve();
        });
        client.on("error", function (e) {
            reject(e);
        });
    });
};
function subscribeToTopics(client, topics, env) {
    topics.forEach(topic => {
        const realTopic = withEnv(env) `${topic}`;
        // logger.info(`Subscribe to topic ${realTopic}`);
        client.subscribe(realTopic);
    });
}
async function unsubscribeFromTopics(client, topics, env) {
    topics.forEach(topic => {
        const realTopic = withEnv(env) `${topic}`;
        // logger.info(`Subscribe to topic ${realTopic}`);
        client.unsubscribe(realTopic);
    });
}
const withEnv = (env) => (strings, ...interpolations) => strings.reduce((result, current, index) => {
    result += current;
    if (interpolations.hasOwnProperty(index)) {
        result += interpolations[index];
    }
    return result;
}, `${env}/`);
function publish(client, topic, message, env) {
    const realTopic = withEnv(env) `${topic}`;
    const publishMessage = JSON.stringify(message);
    // logger.info(`Publishing message: ${publishMessage} to ${realTopic}`);
    client.publish(realTopic, publishMessage);
}

exports.createClient = createClient;
exports.connectClient = connectClient;
exports.subscribeToTopics = subscribeToTopics;
exports.unsubscribeFromTopics = unsubscribeFromTopics;
exports.withEnv = withEnv;
exports.publish = publish;
