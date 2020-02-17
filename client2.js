const VERSION = '1.0.0';
// const CHAT_SERVER_URL = `http://localhost:3000/chat`;
const CHAT_SERVER_URL = `http://52.79.172.143:3000/chat`;
// const WEB_SOCKET_URL = `ws://localhost:9001`;
const WEB_SOCKET_URL = `ws://52.79.172.143:9001`;
let socket;

function checkEnterKey() {
    if (event.keyCode == 13) {
        sendMessage()
    }
}
function sendMessage() {
    const userId = document.getElementById("user").value;
    const messageDom = document.getElementById("input");
    const message = messageDom.value;

    if (!userId || myroom === 0) {
        alert("정확히 입력해주세요")
        messageDom.value = ""
        return;
    }
    socket.send(JSON.stringify({ type: MessageType.SEND_MESSAGE, data: { userId, message, room: myroom } }))
    addChatInList({ createdAt: Number(new Date()), userId, message: message })
    messageDom.value = ""
}

function clearChat() {
    console.log("clear")
    const chatList = document.getElementById("chat-list");
    while (chatList.firstChild) {
        chatList.removeChild(chatList.firstChild);
    }
}
let myroom = "";
function setRoomTitle() {
    const dom = document.getElementById("room-title");
    dom.innerHTML = myroom;
}
function subscribe() {
    const userId = document.getElementById("user").value;
    if (!userId || userId === "") {
        alert("사용자 이름을 적어 주세요");
        return;
    }

    const roomDom = document.getElementById("room");
    if (!roomDom.value || roomDom.value === "") {
        alert("방 이름을 적어 주세요");
        return;
    }
    if (roomDom.value === myroom) {
        console.log("이미 접속 중")
        return;
    }
    if (myroom !== "") {
        socket.send(JSON.stringify({ type: MessageType.UNSUBSCRIBE, unsubscribe: myroom, userId }))
    }
    myroom = roomDom.value;
    socket.send(JSON.stringify({ type: MessageType.SUBSCRIBE, subscribe: roomDom.value, userId }))
    setRoomTitle();
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
    console.log(message.type)
    switch (message.type) {
        case MessageType.RECEIVE_MESSAGE:
            if (!checkMessageIsMe(message.userId)) {
                addChatInList(message)
            }
            break;
        case MessageType.VERSION:
            console.log(`html version is ${VERSION}, server version is ${message.value}`)
            break;
        case MessageType.CLIENT_COUNT:
            setClientCount(message);
            break;
        case MessageType.LEAVE_ROOM:
            showLeave(message.who);
            break;     
        case MessageType.JOIN_ROOM:
            showJoin(message.who);
            break;        
        case MessageType.ROOM_SUBSCRIBE_COUNT:
            setRoomSubscribeCount(message.value);
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
    JOIN_ROOM: "JOIN_ROOM"
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

const setClientCount = (message) => {
    const clientCountDom = document.getElementById("client-count")
    clientCountDom.innerHTML = `총 ${message.value} 명 접속 중`;
}

const setRoomSubscribeCount = (count) => {
    const roomSubCount = document.getElementById("room-sub-count")
    roomSubCount.innerHTML = `이 방에 ${count} 명 접속 중`;
}

const showIndexedDb = (data) => {
    const dom = document.getElementById("db-list");
    const text = document.createTextNode(JSON.stringify(data))
    dom.appendChild(text);
}

const showLeave = who => {
    const userId = document.getElementById("user").value;
    if (who === userId) {
        clearChat()
    }
    if (!who || who === "") {
        throw new Error("no who");
    }
    const listDom = document.getElementById("chat-list");
    if (!listDom) {
        throw new Error("no chat-list");
    }
    const li = document.createElement("li")
    const text = document.createTextNode(`[${dayjs().format("HH:mm")}] ${who} 님이 나가셨습니다.`);
    li.appendChild(text);
    listDom.appendChild(li);
}

const showJoin = who => {
    const userId = document.getElementById("user").value;
    if (who === userId) {
        clearChat()
    }
    if (!who || who === "") {
        throw new Error("no who");
    }
    const listDom = document.getElementById("chat-list");
    if (!listDom) {
        throw new Error("no chat-list");
    }
    const li = document.createElement("li")
    const text = document.createTextNode(`[${dayjs().format("HH:mm")}] ${who} 님이 들어오셨습니다.`);
    li.appendChild(text);
    listDom.appendChild(li);
}

