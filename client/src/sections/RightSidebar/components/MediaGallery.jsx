import React, { useContext, useState, useEffect } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { Film } from "lucide-react";

const MediaGallery = () => {
  const { messages } = useContext(ChatContext);
  const [sharedMedia, setSharedMedia] = useState([]);

  useEffect(() => {
    if (messages && Array.isArray(messages)) {
      const mediaFiles = messages
        .filter((msg) => msg.image || msg.video)
        .map((msg) => ({
          url: msg.image || msg.video,
          type: msg.image ? "image" : "video",
        }));

      setSharedMedia(mediaFiles);
    }
  }, [messages]);
  return (
    <div className="text-xs flex flex-col min-h-0 mt-2">
      <p className="text-gray-400 font-medium shrink-0">
        Shared Media ({sharedMedia.length})
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
        {sharedMedia.map((item, index) => (
          <div
            key={index}
            onClick={() => window.open(item.url, "_blank")}
            className="relative cursor-pointer aspect-square rounded overflow-hidden bg-black/20 border border-white/10 hover:border-blue-400 transition-all group"
          >
            {item.type === "image" ? (
              <img
                src={item.url}
                className="w-full h-full object-cover"
                alt="Shared graphic asset"
              />
            ) : (
              <div className="w-full h-full relative bg-slate-900">
                <video
                  src={`${item.url}#t=0.1`}
                  className="w-full h-full object-cover opacity-80"
                  muted
                  preload="metadata"
                  playsInline
                  controls={false}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                  <Film size={16} className="text-white drop-shadow" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaGallery;
