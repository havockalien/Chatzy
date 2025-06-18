import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat() {
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();
  const wsRef = useRef(null);

  // 🧠 Connect only once
  useEffect(() => {
    connectToWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  function connectToWs() {
    if (wsRef.current) return; // Prevent reconnecting if already connected

    const socket = new WebSocket("ws://localhost:4040/ws");
    wsRef.current = socket;

    socket.addEventListener("open", () => {
      console.log("✅ WebSocket connected");
    });

    socket.addEventListener("message", handleMessage);

    socket.addEventListener("close", () => {
      console.log("❌ WebSocket disconnected.");
      // No reconnection attempt here
    });

    socket.addEventListener("error", (err) => {
      console.error("⚠️ WebSocket error:", err);
    });
  }

  function showOnlinePeople(peopleList) {
    const peopleMap = {};
    peopleList.forEach(({ userId, username }) => {
      if (userId !== id) {
        peopleMap[userId] = username;
      }
    });
    setOnlinePeople(peopleMap);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);

    if (messageData.type === "online-users") {
      showOnlinePeople(messageData.online);
    } else if (messageData.type === "message") {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, messageData]);
      }
    }
  }

  function logout() {
    axios.post("/logout").then(() => {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
      setId(null);
      setUsername(null);
    });
  }

  function sendMessage(ev, file = null) {
    if (ev) ev.preventDefault();

    const message = {
      recipient: selectedUserId,
      text: newMessageText,
      file,
    };

    // ✅ Check WebSocket connection status
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("❌ WebSocket not open. Message not sent.");
      return;
    }

    if (file) {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          file: file.name,
          _id: Date.now(),
          uploading: true,
        },
      ]);
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          _id: Date.now(),
        },
      ]);
    }
  }

  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (!id) return;

    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offline = {};
      offlinePeopleArr.forEach((p) => {
        offline[p._id] = p;
      });
      setOfflinePeople(offline);
    });
  }, [onlinePeople, id]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  const messagesWithoutDupes = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-black w-1/4 flex flex-col">
        <div className="flex-grow">
          <Logo />
          {Object.keys(onlinePeople).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={true}
              username={onlinePeople[userId]}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
          {Object.keys(offlinePeople).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId].username}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-2 text-sm text-gray-600 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>

            {username}
          </span>
          <button
            onClick={logout}
            className="text-bg bg-blue-500 py-1 px-2 text-white rounded-sm"
          >
            logout
          </button>
        </div>
      </div>
      <div className="flex flex-col bg-black w-3/4 p-10 pt-0 pb-0 border border-gray-500">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full items-center justify-center">
              <div className="text-gray-300">
                &larr; Select a person from the sidebar
              </div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      className={`inline-block p-2 my-2 rounded-md text-sm ${
                        message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-600 text-white"
                      }`}
                    >
                      {message.text}
                      {message.file && (
                        <div>
                          <a
                            target="_blank"
                            className="flex items-center gap-1 border-b"
                            href={
                              axios.defaults.baseURL +
                              "/uploads/" +
                              message.file
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18.97 3.659a2.25..."
                                clipRule="evenodd"
                              />
                            </svg>
                            {message.file}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessageText}
              onChange={(ev) => setNewMessageText(ev.target.value)}
              placeholder="Type your message here"
              className="bg-white flex-grow border rounded-sm p-2"
            />
            <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200">
              <input type="file" className="hidden" onChange={sendFile} />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                />
              </svg>
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
