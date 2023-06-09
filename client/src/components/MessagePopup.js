import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { MdOpenInNew } from "react-icons/md";
import { GrEmoji } from "react-icons/gr";
import { BsSendFill } from "react-icons/bs";
import { AiOutlineGif } from "react-icons/ai";
import axios from "../axios";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { AnimatePresence, motion } from "framer-motion";
import { GiphyFetch } from "@giphy/js-fetch-api";
import Message from "./Message";
import useDebounce from "../hooks/useDebounce";
import ReactLoading from "react-loading";

const giphyFetch = new GiphyFetch("CXF6IIaPBwHC4p3hBfz1HUpUTEZNFiHm");

function MessagePopup({ currentChat, setCurrentChat, onlineUsers }) {
  const scrollRef = useRef();
  const [gifs, setGifs] = useState("");
  const [input, setInput] = useState("");
  const { user } = useContext(AuthContext);
  const [gifInput, setGifInput] = useState("");
  const { socket } = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [showGifs, setShowGifs] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [arrivalMessage, setArrivalMessage] = useState(null);

  const debounceSearchTerm = useDebounce(gifInput, 500);

  useEffect(() => {
    socket.on("getMessage", (data) => {
      console.log(data);
      if (data.type == "text") {
        setArrivalMessage({
          sender: data.senderId,
          text: data.text,
          type: "text",
          createdAt: Date.now(),
        });
      } else {
        setArrivalMessage({
          sender: data.senderId,
          url: data.url,
          type: "gif",
          createdAt: Date.now(),
        });
      }
    });
  }, []);

  useEffect(() => {
    arrivalMessage &&
      (currentChat?.conversation.sender._id == arrivalMessage.sender ||
        currentChat?.conversation.receiver._id == arrivalMessage.sender) &&
      setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage, currentChat.conversation]);

  useEffect(() => {
    const getMessages = async () => {
      try {
        const res = await axios.get(`/message/${currentChat.conversation._id}`);

        setMessages(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    getMessages();
  }, [currentChat]);

  useEffect(() => {
    const fetchGifs = async () => {
      setLoadingGifs(true);
      if (debounceSearchTerm) {
        const res = await giphyFetch.search(gifInput, {
          sort: "relevant",
          lang: "es",
          limit: 12,
        });

        setLoadingGifs(false);
        setGifs(res.data);
      } else {
        const res = await giphyFetch.trending({ limit: 12, type: "videos" });
        setLoadingGifs(false);
        setGifs(res.data);
      }
    };

    fetchGifs();
  }, [debounceSearchTerm]);

  const sendMessage = async (e) => {
    e.preventDefault();

    const receiverId =
      currentChat.conversation.sender._id != user._id
        ? currentChat.conversation.sender._id
        : currentChat.conversation.receiver._id;

    socket.emit("sendMessage", {
      senderId: user._id,
      receiverId,
      text: input,
      type: "text",
    });

    if (input !== "") {
      try {
        setMessages((prev) => [...prev, message]);
        setShowEmojis(false);

        const message = {
          conversationId: currentChat.conversation._id,
          sender: user._id,
          text: input,
          type: "text",
          url: "",
        };

        setInput("");
        await axios.post(`/message`, message);
      } catch (err) {
        console.log(err);
      }
    }
  };

  const sendGif = async (url) => {
    const receiverId =
      currentChat.conversation.sender._id != user._id
        ? currentChat.conversation.sender._id
        : currentChat.conversation.receiver._id;
    socket.emit("sendMessage", {
      senderId: user._id,
      receiverId,
      text: "",
      type: "gif",
      url,
    });

    if (url) {
      try {
        setMessages((prev) => [...prev, message]);
        setShowGifs(false);
        const message = {
          conversationId: currentChat.conversation._id,
          sender: user._id,
          url: url,
          type: "gif",
        };

        await axios.post(`/message`, message);
        setInput("");
      } catch (err) {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    scrollRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-screen z-[99999] flex flex-col fixed lg:absolute top-0 lg:top-auto lg:bottom-0 right-0 w-full lg:w-[500px] lg:h-96 rounded-tl-md lg:border-t-4 lg:border-l-4 border-bodyPrimary shadow-2xl bg-bodySecondary">
      <div className="flex items-center px-3 py-3 relative space-x-3 border-b-2 border-[#28343e]">
        <div className="relative">
          <div
            className={`absolute -right-0.5 -top-1 ${
              onlineUsers.includes(currentChat.user?._id)
                ? "bg-[#20da97] border-[2px] border-bodyPrimary"
                : "bg-transparent"
            } w-3 h-3 rounded-full `}
          ></div>
          <div
            style={{
              backgroundImage: `url(${currentChat.user?.profilePicture})`,
            }}
            className="w-8 h-8 bg-cover rounded-full"
          ></div>
        </div>
        <p className="flex-1">{currentChat.user?.username}</p>
        <MdOpenInNew
          className="text-xl cursor-pointer"
          color="#1da1f2"
          onClick={() => setCurrentChat(null)}
        />
      </div>

      <div className="flex-1 flex flex-col py-5 px-3 space-y-4 overflow-auto scrollbar scrollbar-w-0">
        {messages.map((message, index) => (
          <div
            key={index}
            ref={scrollRef}
            className={`space-y-2 w-48 ${
              message.sender !== currentChat.user._id && "self-end"
            }`}
          >
            <Message
              message={message}
              index={index}
              currentChat={currentChat}
            />
          </div>
        ))}
      </div>

      <form
        onSubmit={sendMessage}
        className="bg-[#28343e] p-2 flex items-center rounded-md m-3 relative space-x-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          type="text"
          placeholder="Type a message..."
          className="text-[16px] flex-1 bg-transparent outline-none placeholder-[#617484]"
        />
        <div
          onClick={() => {
            !showEmojis && setShowGifs(!showGifs);
          }}
        >
          <AiOutlineGif
            className="text-2xl cursor-pointer"
            color={!showGifs ? "#c7d6e5" : "#1da1f2"}
          />
        </div>

        <div
          onClick={() => {
            !showGifs && setShowEmojis(!showEmojis);
          }}
        >
          <GrEmoji
            className="text-xl cursor-pointer"
            color={!showEmojis ? "#c7d6e5" : "#1da1f2"}
          />
        </div>

        <button type="submit">
          <BsSendFill color="#1da1f2" />
        </button>
      </form>
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            initial={{ opacity: 1, y: 400 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, type: "tween" }}
            exit={{ opacity: 1, y: 400 }}
            className="border-[#2f3c47] rounded-sm relative h-[45vh] overflow-y-auto scrollbar-0 scrollbar"
          >
            <Picker
              data={data}
              onEmojiSelect={(e) => setInput(input + e.native)}
              emojiSize={20}
              dynamicWidth={true}
              previewPosition="none"
              searchPosition="none"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showGifs && (
          <motion.div
            initial={{ opacity: 1, y: 400 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, type: "tween" }}
            exit={{ opacity: 1, y: 400 }}
            className="border-[#2f3c47] flex flex-col h-[45vh] overflow-y-auto scrollbar scrollbar-0"
          >
            <input
              value={gifInput}
              onChange={(e) => setGifInput(e.target.value)}
              placeholder="Search GIFs"
              className="m-1 rounded-sm placeholder-[#617484] px-2 py-1 text-sm w-60 bg-[#28343e] outline-none"
            />
            {loadingGifs ? (
              <div className="flex flex-col space-y-2 items-center justify-center mt-5">
                <ReactLoading
                  type="spin"
                  color="white"
                  height={24}
                  width={24}
                />
                <p className="text-[14px]">GIF's are loading...</p>
              </div>
            ) : (
              <div className="flex items-center flex-wrap flex-1">
                {gifs.map((gif) => {
                  const url = gif.images.downsized_medium.url;
                  return (
                    <div
                      onClick={() => sendGif(url)}
                      key={gif.id}
                      className="cursor-pointer"
                    >
                      <img
                        src={url}
                        className="max-h-[80px] md:max-h-[100px] lg:max-h-[80px] lg:w-[152px] md:w-[216px] sm:w-[128px] w-[90px] rounded-sm m-1 object-cover"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(MessagePopup);
