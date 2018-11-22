import { MqttClient, IClientOptions } from "mqtt";

import {
  subscribeToTopics,
  unsubscribeFromTopics,
  createClient,
  connectClient,
  publish,
  withEnv
} from "./utils/mqtt-utils";

export default class Client {
  private _connected: boolean = false;
  private _subscribed: boolean = false;
  public client: MqttClient | null = null;

  private _handlers: Function[] = [];
  private _actionHandler: { [key: string]: Function[] } = {};

  constructor(
    public serverUrl: string,
    public mqttEnv: string,
    public topics: string[] = [],
    private mqttConnectOptions: Partial<IClientOptions> = {}
  ) {}

  public async connectClient() {
    this.client = createClient(this.serverUrl, this.mqttConnectOptions);
    await connectClient(this.client);
    this._connected = true;
    this.client.on("close", this.onClientClose);
    this.client.on("message", this.onMqttMessage);
  }

  public subscribeToTopics(topics: string | string[] = this.topics) {
    this.assertConnected();
    const t = typeof topics === "string" ? [topics] : topics;
    if (t.length) {
      subscribeToTopics(this.client!, t, this.mqttEnv);
      this.topics = [...this.topics, ...t];
      this._subscribed = true;
    }
  }

  public unsubscribeFromTopics(topics: string | string[] = this.topics) {
    this.assertConnected();
    const t = typeof topics === "string" ? [topics] : topics;
    if (t.length) {
      unsubscribeFromTopics(this.client!, t, this.mqttEnv);
      for (const topic of t) {
        const i = this.topics.indexOf(topic);
        if (i >= 0) {
          this.topics.splice(i, 1);
        }
      }
      this._subscribed = this._subscribed && this.topics.length > 0;
    }
  }

  public publish(topic: string, message: any) {
    this.assertConnected();
    publish(this.client!, topic, message, this.mqttEnv);
  }

  public addHandler(fn: Function) {
    this._handlers.push(fn);
  }

  public addHandlerForAction(actionType: string, fn: Function) {
    this._actionHandler[actionType] = this._actionHandler[actionType] || [];
    this._actionHandler[actionType].push(fn);
  }

  public removeHandler(fn: Function) {
    const i = this._handlers.indexOf(fn);
    if (i >= 0) {
      this._handlers.splice(i, 1);
    }
  }

  public removeHandlerForAction(actionType: string, fn: Function) {
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

  private getTopicWithoutHash(topic: string) {
    const hasHashAtTheEnd = topic[topic.length - 1] === "#";
    return !hasHashAtTheEnd ? topic : topic.substr(0, topic.length - 1);
  }

  private onMqttMessage = (topic: string, message: string, packet: any) => {
    const topics = this.topics
      .map(t => withEnv(this.mqttEnv)`${this.getTopicWithoutHash(t)}`)
      .filter(t => topic.indexOf(t) === 0);
    if (topics.length === 0) {
      return;
    }
    for (const handler of this._handlers) {
      handler(topic, message, packet);
    }
    this.provideMessageToActionHandlers(topic, message, packet);
  };

  private provideMessageToActionHandlers(topic: string, message: string, packet: any) {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
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

  private onClientClose = () => {
    console.log("Client disconnected");
    this._connected = false;
  };

  private assertConnected() {
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

  public destroy() {
    try {
      this.unsubscribeFromTopics();
    } catch (e) {}
    if (this._connected) {
      this.client!.end();
    }
    this._connected = false;
    this._subscribed = false;
    this.client = null;
    this._handlers = [];
    this._actionHandler = {};
  }
}
