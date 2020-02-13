if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.")
}
let db;
const dbName = "MyTestDatabase";
const request = window.indexedDB.open(dbName);
request.onerror = function(event) {
    // request.errorCode 에 대해 무언가를 한다!
    console.log("db error : ", request.errorCode)
    console.log("db error : ", event.target.errorCode)
};
request.onsuccess = function(event) {
    // request.result 에 대해 무언가를 한다!
    console.log("db onsuccess : ", request.result)
    db = request.result;
    getBy("444-44-4444").then((result) => {
        console.log(result)
    })
};

// This is what our customer data looks like.
const customerData = [
    { ssn: "444-44-4444", name: "Bill", age: 35, email: "bill@company.com" },
    { ssn: "555-55-5555", name: "Donna", age: 32, email: "donna@home.org" }
];

// This event is only implemented in recent browsers   
request.onupgradeneeded = function(event) { 
    console.log("onupgradeneeded")
    const db = event.target.result;
    
    // Create an objectStore for this database
    const objectStore = db.createObjectStore("customers", { keyPath: "ssn", autoIncrement : true});
    objectStore.createIndex("name", "name", { unique: false });
    objectStore.createIndex("email", "email", { unique: true });
    
    objectStore.transaction.oncomplete = function(event) {
        // Store values in the newly created objectStore.
        const customerObjectStore = db.transaction("customers", "readwrite").objectStore("customers");
        customerData.forEach(function(customer) {
            customerObjectStore.add(customer);
        });
    };
};


const getBy = async (key) => {
    return new Promise((resolve, reject) => {
        db.transaction("customers").objectStore("customers").get(key).onsuccess = function(event) {
            resolve(event.target.result);
        };
    })
}
const connect = () => {
    const socket = new WebSocket("ws://localhost:9001");
    
    socket.onopen = () => {
        console.log("on open")
        socket.send(JSON.stringify({type:"SUBSCRIBE", subscribe: "hello"}))
    }
    
    
    socket.onerror = (e) => {
        console.error("error : ", e)
        socket.close();
    }
    
    socket.onmessage = (e) => {
        const {data,type,target} = e;
        // console.log(convertMessageToObject(data));
    }
    
    socket.onclose = (e) => {
        console.error("closed : ", e.target.readyState)
        setTimeout(() => connect(), 3000)
    }
}
connect();

const convertMessageToObject = (data) => JSON.parse(data);

const sendMessage = () => {
    const dom = document.getElementById("input");
    socket.send(JSON.stringify({text: dom.value}))
}