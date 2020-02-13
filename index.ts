import { App, HttpRequest, WebSocket, HttpResponse } from "uWebSockets.js"
import { generate } from "shortid";
import _ from "lodash";
import AWS from "aws-sdk";
import { MessageList, ReceiveMessageResult } from "aws-sdk/clients/sqs";
AWS.config.loadFromPath('./awsconfig.json');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const QUEUE_URL = "https://sqs.ap-northeast-2.amazonaws.com/658082685114/test";
sqs.listQueues((err, data) => {
    console.log(data);
})
let messageList = [];
const PARAMS = {
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: 10
};
const MessageEvent = {
    newMessage: "newMessage",
    deleteMessage: "deleteMessage",
    updateMessage: "updateMessage"
}

const onReceiveMessage = (messages: ReceiveMessageResult) => {
    if (!_.isNil(messages.Messages)) {
        messages.Messages.forEach(message => {
            console.log(message.Body);
            pushMessageToListAll(message.Body);
        });
    }
    return messages;
}

const pushMessageToListAll = (message: string | undefined) => {
    messageList.push(message === undefined ? "" : message)
}

const app = App()

app.ws("/*", {
    /* Options */
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60 * 5,
    // would be nice to have maxBackpressure to automatically close slow receivers

    /* Setting 1: merge messages in one, or keep them as separate WebSocket frames - mergePublishedMessages */
    /* Setting 2: compression on/off - cannot have dedicated compressor for pubsub yet */
    /* Setting 3: maxBackpressure - when we want to automatically terminate a slow receiver */
    /* Setting 4: send to all including us, or not? That's not a setting really just use ws.publish or global uWS.publish */

    /* Handlers */
    message: (ws: WebSocket, message: ArrayBuffer, isBinary: boolean) => {
        excuteMessage(ws, convertClientMessage(message));
    },

    open: (ws: WebSocket, req: HttpRequest) => {
        // ws.subscribe('home/sensors/#');
        console.log("open > ws", ws)
        // clients[generate()] = ws;
        clients.push(ws);
    },
    close: (ws: WebSocket, code: number, message: ArrayBuffer) => {
        console.log("close > ws", JSON.stringify(ws))
        console.log("close > code", code)
        console.log("close > message", convertClosedMessage(message))
    }
}).get("/test", (res: HttpResponse, req: HttpRequest) => {
    try {
        console.log(process.pid)
        for (let i = 0; i < 10; i++) {
            clients[0].publish(`hello`, JSON.stringify({ test: "hi", i }))
        }
        console.log("send")
        res.end("hi");
    } catch (e) {
        console.error(e, typeof e)
        if (typeof e === "string" && e === "Invalid access of closed uWS.WebSocket/SSLWebSocket.") {
            clients = []
        }
        if (clients[0] === undefined) {
            clients = []
        }
        res.end("error")
    }

}).listen(9001, (socket) => {
    if (socket) {
        console.log('Listening to port 9001', socket, typeof socket, Object.keys(socket));
    }
})
let clients: WebSocket[] = [];
const convertClientMessage = (message: ArrayBuffer): CustomMessage => JSON.parse(bufToString(message));
const convertClosedMessage = (message: ArrayBuffer): string => bufToString(message);
const bufToString = (buf: ArrayBuffer): string => {
    const enc = new TextDecoder("utf-8");
    const arrayBuffer: Uint8Array = new Uint8Array(buf);
    return enc.decode(arrayBuffer);
}

const addSubscribe = (ws: WebSocket, message: CustomMessage): void => {
    ws.subscribe(`${message.subscribe}`);
};

const excuteMessage = (ws: WebSocket, message: CustomMessage) => {
    switch (message.type) {
        case MessageType.SUBSCRIBE:
            addSubscribe(ws, message);
            break;
    }
}
interface CustomMessage {
    type: string;
    subscribe?: string;
}

enum MessageType {
    "SUBSCRIBE" = "SUBSCRIBE"
}
