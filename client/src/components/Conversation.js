import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

function Conversation({ conversation, setCurrentChat, onlineUsers }) {
  const [user, setUser] = useState(null);
  const { user: currentUser } = useContext(AuthContext);

  useEffect(() => {
    const friendId = conversation.members.find((m) => m !== currentUser._id);

    const getUser = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8800/api/users/${friendId}`
        );
        setUser(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    getUser();
  }, []);

  return (
    <div
      onClick={() => setCurrentChat({ conversation, user })}
      className="flex items-center cursor-pointer space-x-3"
    >
      <div className="relative">
        <div
          className={`absolute -right-0.5 -top-1 ${
            onlineUsers.includes(user?._id) ? "bg-[#20da97]" : "bg-[#abc3c9]"
          } w-3 h-3 rounded-full border-[2px] border-bodyPrimary`}
        ></div>
        <div
          style={{ backgroundImage: `url(${user?.profilePicture})` }}
          className="w-8 h-8 bg-cover rounded-full"
        ></div>
      </div>
      <p className="text-[14.5px] ml-2">{user?.username}</p>
    </div>
  );
}

export default Conversation;
