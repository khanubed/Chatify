import React, { useState, useRef } from "react";

const MessageInput = () => {
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // 1. Intercept image selection to show preview instead of sending instantly
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result); // Stores base64 string for live UI display
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Clear out selection if user hits the cancel thumbnail cross
  const handleCancelImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 3. Consolidated Submit handling dispatcher
  const onFormSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() && !imagePreview) return;

    // Call your existing handler, passing text (as input or caption) and the image
    handleSendMessage({
      text: input.trim(),
      image: imagePreview,
    });

    // Reset fields after delivery dispatch
    setInput("");
    handleCancelImage();
  };

  return (
    <div className="relative w-full flex flex-col bg-transparent">
      
      {/* 🖼️ IMAGE PREVIEW FLUID OVERLAY BOX */}
      {imagePreview && (
        <div className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700/50 backdrop-blur-md rounded-t-xl mx-3 animate-fade-in">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600 shadow-md">
            <img 
              src={imagePreview} 
              alt="Selected preview" 
              className="object-cover w-full h-full" 
            />
            {/* Cancel Cross Button */}
            <button
              type="button"
              onClick={handleCancelImage}
              className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black/90 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center transition-all"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-blue-400 font-medium">Image selected</p>
            <p className="text-[11px] text-gray-400">Type below to append a caption</p>
          </div>
        </div>
      )}

      {/* 🎛️ CORE INPUT CONTROLS CONTAINER */}
      <div className="flex items-center gap-3 p-3 bg-transparent">
        <div className={`flex-1 flex items-center bg-gray-800/40 px-3 rounded-full border border-gray-700 transition-all ${imagePreview ? "rounded-tl-none rounded-tr-none border-t-none" : ""}`}>
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            onKeyDown={(e) => (e.key === "Enter" ? onFormSubmit(e) : null)}
            type="text"
            // Dynamic text placeholder shifting depending on current status state
            placeholder={imagePreview ? "Add a caption to this image..." : "Send a message..."}
            className="flex-1 text-sm p-3 bg-transparent border-none outline-none placeholder-gray-400 text-white"
          />
          
          {/* Managed hidden browser native file pointer upload interface */}
          <input
            ref={fileInputRef}
            onChange={handleImageChange}
            type="file"
            id="image"
            accept="image/png, image/jpeg"
            hidden
          />
          
          <label htmlFor="image">
            <img
              src={assets.gallery_icon}
              alt="gallery"
              className="w-5 mr-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            />
          </label>
        </div>
        
        <img
          onClick={onFormSubmit}
          src={assets.send_button}
          alt="submit"
          className="w-10 cursor-pointer hover:scale-105 transition-transform"
        />
      </div>
    </div>
  );
};

export default MessageInput;