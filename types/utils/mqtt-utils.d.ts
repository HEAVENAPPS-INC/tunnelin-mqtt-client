import mqtt, { MqttClient, IClientOptions } from "mqtt";
export declare function createClient(url: string, options?: Partial<IClientOptions>): MqttClient;
export declare const connectClient: (client: mqtt.MqttClient) => Promise<void>;
export declare function subscribeToTopics(client: MqttClient, topics: string[], env: string): void;
export declare function unsubscribeFromTopics(client: MqttClient, topics: string[], env: string): Promise<void>;
export declare const withEnv: (env: string) => (strings: TemplateStringsArray, ...interpolations: string[]) => string;
export declare function publish(client: any, topic: string, message: any, env: string): void;
