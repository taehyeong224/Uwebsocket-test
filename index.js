const { App } = require("uWebSockets.js")
const AWS = require('aws-sdk');
AWS.config.loadFromPath('./awsconfig.json');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
console.log("config : ", AWS.config.credentials)
const QUEUE_URL = "https://sqs.ap-northeast-2.amazonaws.com/658082685114/test";

const app = App()
const VERSION = "1.0.0"
const clientSub = new WeakMap();
// const LATEST_MESSAGES = [];
let CLIENT_COUNT = 0;
const ROOM_SUBSCRIBE_COUNT = {};
app.ws("/*", {
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60 * 5,
    message: (ws, message, isBinary) => {
        excuteMessage(ws, convertClientMessage(message));
    },

    open: (ws, req) => {
        console.log("hello~")
        CLIENT_COUNT += 1;
        ws.subscribe(`notice`);
        ws.send(JSON.stringify({ type: MessageType.VERSION, value: VERSION }))
        app.publish(`notice`, JSON.stringify({ type: MessageType.CLIENT_COUNT, value: CLIENT_COUNT }))
    },
    close: (ws, code, message) => {
        console.log("close > ws", clients.get(ws))
        console.log("close > code", code)
        console.log("close > message", convertClosedMessage(message))
        CLIENT_COUNT -= 1;
        app.publish(`notice`, JSON.stringify({ type: MessageType.CLIENT_COUNT, value: CLIENT_COUNT }))
    }
}).post("/message", (res, req) => {
    try {
        readJson(res, (obj) => {
            try {
                console.log(obj);
                app.publish(obj.room, JSON.stringify({ type: MessageType.RECEIVE_MESSAGE, ...obj }))
                res.end('Thanks for this json!');
            } catch (e) {
                console.error("error : ", e)
                res.end("fail")
            }
        }, () => {
            /* Request was prematurely aborted or invalid or missing, stop reading */
            console.log('Invalid JSON or no data at all!');
        });
    } catch (e) {
        console.error(e, typeof e)
        res.end("error")
    }

}).listen(9001, (socket) => {
    if (socket) {
        console.log('Listening to port 9001', socket, typeof socket, Object.keys(socket));
    }
})
const clients = new WeakMap();
const convertClientMessage = message => JSON.parse(bufToString(message));
const convertClosedMessage = message => bufToString(message);
const bufToString = buf => {
    const enc = new TextDecoder("utf-8");
    const arrayBuffer = new Uint8Array(buf);
    return enc.decode(arrayBuffer);
}

const addSubscribe = (ws, {subscribe, userId}) => {
    ws.subscribe(subscribe);
    clientSub.set(ws, subscribe);
    app.publish(subscribe, JSON.stringify({ type: MessageType.CLIENT_COUNT, value: CLIENT_COUNT }))
    app.publish(subscribe, JSON.stringify({ type: MessageType.JOIN_ROOM, who: userId }))
};

const unSubscribe = (ws, {unsubscribe, userId}) => {
    ws.unsubscribe(unsubscribe);
    clientSub.delete(ws);
    app.publish(unsubscribe, JSON.stringify({ type: MessageType.LEAVE_ROOM, who: userId }))

}

const sendMessageToSQS = async message => {
    message["createdAt"] = Number(new Date())
    console.log(`sendMessageToSQS : ${JSON.stringify(message)}`)
    const sendResult = await sqs.sendMessage({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({ userId: message.data.userId, message: message.data.message, createdAt: message.createdAt, room: message.room }),
        DelaySeconds: 0,
    }).promise();
    console.log("sendResult : ", sendResult)
    console.log("MessageId : ", sendResult.MessageId)
}

const plusSubscribeCount = (subscribe) => {
    if (ROOM_SUBSCRIBE_COUNT[subscribe] === undefined) {
        ROOM_SUBSCRIBE_COUNT[subscribe] = 1;
    } else {
        ROOM_SUBSCRIBE_COUNT[subscribe] += 1;
    }
    app.publish(subscribe, JSON.stringify({ type: MessageType.ROOM_SUBSCRIBE_COUNT, value: ROOM_SUBSCRIBE_COUNT[subscribe] }))
}
const minusSubscribeCount = (subscribe) => {
    if (ROOM_SUBSCRIBE_COUNT[subscribe] === undefined || ROOM_SUBSCRIBE_COUNT[subscribe] === 0) {
        ROOM_SUBSCRIBE_COUNT[subscribe] = 0;
    } else {
        ROOM_SUBSCRIBE_COUNT[subscribe] -= 1;
    }
    app.publish(subscribe, JSON.stringify({ type: MessageType.ROOM_SUBSCRIBE_COUNT, value: ROOM_SUBSCRIBE_COUNT[subscribe] }))
}

const excuteMessage = (ws, message) => {
    switch (message.type) {
        case MessageType.SUBSCRIBE:
            addSubscribe(ws, {subscribe: message.subscribe, userId: message.userId});
            plusSubscribeCount(message.subscribe)
            break;
        case MessageType.SEND_MESSAGE:
            sendMessageToSQS(message);
            break;
        case MessageType.UNSUBSCRIBE:
            unSubscribe(ws, {unsubscribe: message.unsubscribe, userId: message.userId});
            minusSubscribeCount(message.subscribe)
            break;
    }
}

const MessageType = {
    SUBSCRIBE: "SUBSCRIBE",
    UNSUBSCRIBE: "UNSUBSCRIBE",
    RECEIVE_MESSAGE: "RECEIVE_MESSAGE",
    VERSION: "VERSION",
    SEND_MESSAGE: "SEND_MESSAGE",
    CLIENT_COUNT: "CLIENT_COUNT",
    ROOM_SUBSCRIBE_COUNT: "ROOM_SUBSCRIBE_COUNT",
    LEAVE_ROOM: "LEAVE_ROOM",
    JOIN_ROOM: "JOIN_ROOM",
}

/* Helper function for reading a posted JSON body */
function readJson(res, cb, err) {
    let buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
        let chunk = Buffer.from(ab);
        if (isLast) {
            let json;
            if (buffer) {
                try {
                    json = JSON.parse(Buffer.concat([buffer, chunk]));
                } catch (e) {
                    /* res.close calls onAborted */
                    res.close();
                    return;
                }
                cb(json);
            } else {
                try {
                    json = JSON.parse(chunk);
                } catch (e) {
                    /* res.close calls onAborted */
                    res.close();
                    return;
                }
                cb(json);
            }
        } else {
            if (buffer) {
                buffer = Buffer.concat([buffer, chunk]);
            } else {
                buffer = Buffer.concat([chunk]);
            }
        }
    });

    /* Register error cb */
    res.onAborted(err);
}