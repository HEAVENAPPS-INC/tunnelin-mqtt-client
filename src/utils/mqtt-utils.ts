import mqtt, { MqttClient, IClientOptions } from "mqtt";

export function createClient(url: string, options: Partial<IClientOptions> = {}): MqttClient {
  return mqtt.connect(
    url,
    { keepalive: 60, ...options }
  );
}

export const connectClient = (client: MqttClient): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.on("connect", function() {
      resolve();
    });
    client.on("error", function(e: any) {
      reject(e);
    });
    client.on("offline", function() {
      reject(new Error("Offline"));
    });
  });
};

export function subscribeToTopics(client: MqttClient, topics: string[], env: string) {
  topics.forEach(topic => {
    const realTopic = withEnv(env)`${topic}`;
    // logger.info(`Subscribe to topic ${realTopic}`);
    client.subscribe(realTopic);
  });
}

export async function unsubscribeFromTopics(client: MqttClient, topics: string[], env: string) {
  topics.forEach(topic => {
    const realTopic = withEnv(env)`${topic}`;
    // logger.info(`Subscribe to topic ${realTopic}`);
    client.unsubscribe(realTopic);
  });
}

export const withEnv = (env: string) => (
  strings: TemplateStringsArray,
  ...interpolations: string[]
) =>
  strings.reduce((result, current, index) => {
    result += current;

    if (interpolations.hasOwnProperty(index)) {
      result += interpolations[index];
    }

    return result;
  }, `${env}/`);

export function publish(client: any, topic: string, message: any, env: string) {
  const realTopic = withEnv(env)`${topic}`;
  const publishMessage = JSON.stringify(message);
  // logger.info(`Publishing message: ${publishMessage} to ${realTopic}`);
  client.publish(realTopic, publishMessage);
}
