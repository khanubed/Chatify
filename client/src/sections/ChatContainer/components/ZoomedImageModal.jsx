import React from "react";
import { X } from "lucide-react";

const ZoomedImageModal = ({ zoomedImage, setZoomedImage }) => {
  if (!zoomedImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm select-none animate-fade-in">
      <div className="absolute inset-0 cursor-zoom-out" onClick={() => setZoomedImage(null)} />
      <button
        onClick={() => setZoomedImage(null)}
        className="absolute top-6 right-6 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white transition-all cursor-pointer shadow-lg z-20"
      >
        <X size={24} />
      </button>
      <img
        src={zoomedImage}
        alt="Expanded visual preview"
        className="fixed z-10 w-[85vw] h-[80vh] object-contain pointer-events-none rounded-md shadow-2xl animate-scale-up"
      />
    </div>
  );
};

export default ZoomedImageModal;