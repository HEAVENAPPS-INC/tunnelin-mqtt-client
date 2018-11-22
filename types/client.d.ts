import { MqttClient, IClientOptions } from "mqtt";
export default class Client {
    serverUrl: string;
    topics: string[];
    mqttEnv: string;
    private mqttConnectOptions;
    private _connected;
    private _subscribed;
    client: MqttClient | null;
    private _handlers;
    private _actionHandler;
    constructor(serverUrl: string, topics: string[], mqttEnv: string, mqttConnectOptions?: Partial<IClientOptions>);
    connectClient(): Promise<void>;
    subscribe(): void;
    unsubscribe(): void;
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
