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
  public client: MqttClient | null = null;

  private _subscribed: boolean = false;
  private topics: string[] = [];

  private _handlers: Function[] = [];
  private _actionHandler: { [key: string]: Function[] } = {};

  constructor(
    public serverUrl: string,
    public mqttEnv: string,
    private mqttConnectOptions: Partial<IClientOptions> = {}
  ) {}

  public async connectClient() {
    this.client = createClient(this.serverUrl, this.mqttConnectOptions);
    const connectFn = async () => {
      try {
        await connectClient(this.client!);
      } catch (e) {
        console.log(JSON.stringify(e));
      }
      if (!this.client!.connected) {
        setTimeout(connectFn, 1500);
      }
    };
    await connectFn();
    this.client.on("message", this.onMqttMessage);
  }

  public async endClient() {
    if (!this.connectClient) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.client!.end(undefined, resolve);
    });
  }

  public subscribeToTopics(topics: string | string[]) {
    let t = typeof topics === "string" ? [topics] : topics;
    if (t.length) {
      t = t.filter(topic => this.topics.indexOf(topic) === -1);
      subscribeToTopics(this.client!, t, this.mqttEnv);
      this.topics = [...this.topics, ...t];
      this._subscribed = true;
    }
  }

  public unsubscribeFromTopics(topics: string | string[]) {
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

  public getTopics() {
    return [...this.topics];
  }

  public publish(topic: string, message: any) {
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
      if (typeof handler === "function") {
        try {
          handler(topic, message, packet);
        } catch (e) {
          // handler throws error, not interested
        }
      }
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
        if (typeof handler === "function") {
          try {
            handler(topic, message, packet);
          } catch (e) {
            // handler throws error, not interested
          }
        }
      }
    }
  }

  public destroy() {
    try {
      this.unsubscribeFromTopics(this.topics);
    } catch (e) {}
    if (this.client!.connected) {
      this.client!.end();
    }
    this._subscribed = false;
    this.client = null;
    this._handlers = [];
    this._actionHandler = {};
  }
}
