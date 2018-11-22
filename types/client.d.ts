import { MqttClient, IClientOptions } from "mqtt";
export default class Client {
    serverUrl: string;
    mqttEnv: string;
    private mqttConnectOptions;
    client: MqttClient | null;
    private _connected;
    private _subscribed;
    private topics;
    private _handlers;
    private _actionHandler;
    constructor(serverUrl: string, mqttEnv: string, mqttConnectOptions?: Partial<IClientOptions>);
    connectClient(): Promise<void>;
    subscribeToTopics(topics?: string | string[]): void;
    unsubscribeFromTopics(topics?: string | string[]): void;
    getTopics(): string[];
    publish(topic: string, message: any): void;
    addHandler(fn: Function): void;
    addHandlerForAction(actionType: string, fn: Function): void;
    removeHandler(fn: Function): void;
    removeHandlerForAction(actionType: string, fn: Function): void;
    private getTopicWithoutHash;
    private onMqttMessage;
    private provideMessageToActionHandlers;
    private onClientClose;
    private assertConnected;
    destroy(): void;
}
