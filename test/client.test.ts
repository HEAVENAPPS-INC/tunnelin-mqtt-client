import Client from "../src/client";

let mqttServer = `mqtt://mqtt.haffollc.com`;
let mqttEnv = `development`;

test("basic", async () => {
  expect(true).toBe(true);
});

test("test client", async () => {
  const client = new Client(mqttServer, mqttEnv);
  try {
    await client.connectClient();
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
  expect(false).toBe(true);
});
