const VERSION = '1.0.0';
// const CHAT_SERVER_URL = `http://localhost:3000/chat`;
const CHAT_SERVER_URL = `http://52.79.172.143:3000/chat`;
// const WEB_SOCKET_URL = `ws://localhost:9001`;
const WEB_SOCKET_URL = `ws://52.79.172.143:9001`;
let socket;

function sendMessage() {
    const userId = document.getElementById("user").value;
    const message = document.getElementById("input").value;
    socket.send(JSON.stringify({type: MessageType.SEND_MESSAGE, data: {userId, message}}))
    addChatInList({ createdAt: Number(new Date()), userId, message: message })
}

if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.")
}
let db;
const dbName = "MyTestDatabase";
const request = window.indexedDB.open(dbName);
request.onerror = function (event) {
    // request.errorCode 에 대해 무언가를 한다!
    console.log("db error : ", request.errorCode)
    console.log("db error : ", event.target.errorCode)
};
request.onsuccess = function (event) {
    // request.result 에 대해 무언가를 한다!
    console.log("db onsuccess : ", request.result)
    db = request.result;
    getBy("444-44-4444").then((result) => {
        console.log(result)
        showIndexedDb(result)
    })
};

// This is what our customer data looks like.
const customerData = [
    { ssn: "444-44-4444", name: "Bill", age: 35, email: "bill@company.com" },
    { ssn: "555-55-5555", name: "Donna", age: 32, email: "donna@home.org" }
];

// This event is only implemented in recent browsers   
request.onupgradeneeded = function (event) {
    console.log("onupgradeneeded")
    const db = event.target.result;

    // Create an objectStore for this database
    const objectStore = db.createObjectStore("customers", { keyPath: "ssn", autoIncrement: true });
    objectStore.createIndex("name", "name", { unique: false });
    objectStore.createIndex("email", "email", { unique: true });

    objectStore.transaction.oncomplete = function (event) {
        // Store values in the newly created objectStore.
        const customerObjectStore = db.transaction("customers", "readwrite").objectStore("customers");
        customerData.forEach(function (customer) {
            customerObjectStore.add(customer);
        });
    };
};


const getBy = async (key) => {
    return new Promise((resolve, reject) => {
        db.transaction("customers").objectStore("customers").get(key).onsuccess = function (event) {
            resolve(event.target.result);
        };
    })
}
const connect = () => {
    socket = new WebSocket(WEB_SOCKET_URL);

    socket.onopen = () => {
        console.log("on open")
        socket.send(JSON.stringify({ type: "SUBSCRIBE", subscribe: "hello" }))
    }


    socket.onerror = (e) => {
        console.error("error : ", e)
        socket.close();
    }

    socket.onmessage = (e) => {
        try {
            const { data, type, target } = e;
            executeJob(convertMessageToObject(data));
        } catch (e) {
            console.error("onmessage error : ", e)
        }
    }

    socket.onclose = (e) => {
        console.error("closed : ", e.target.readyState)
        setTimeout(() => connect(), 3000)
    }
}
connect();

const convertMessageToObject = (data) => JSON.parse(data);

const executeJob = message => {
    switch (message.type) {
        case MessageType.RECEIVE_MESSAGE:
            if (!checkMessageIsMe(message.userId)) {
                addChatInList(message)
            }
            break;
        case MessageType.VERSION:
            console.log(`html version is ${VERSION}, server version is ${message.value}`)    
            break;
    }
}

const MessageType = {
    RECEIVE_MESSAGE: "RECEIVE_MESSAGE",
    VERSION: "VERSION",
    SEND_MESSAGE: "SEND_MESSAGE",
}
const checkMessageIsMe = (userId) => {
    const myId = document.getElementById("user").value;
    return userId === myId;
}
const addChatInList = (message) => {
    if (!message || !message.message) {
        throw new Error("no message");
    }
    const listDom = document.getElementById("chat-list");
    if (!listDom) {
        throw new Error("no chat-list");
    }
    const li = document.createElement("li")
    const text = document.createTextNode(`[${dayjs(message.createdAt).format("HH:mm")}] ${message.userId}: ${message.message}`);
    li.appendChild(text);
    listDom.appendChild(li);
}

const showIndexedDb = (data) => {
    const dom = document.getElementById("db-list");
    const text = document.createTextNode(JSON.stringify(data))
    dom.appendChild(text);
}