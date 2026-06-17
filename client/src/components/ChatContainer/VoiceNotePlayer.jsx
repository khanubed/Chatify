import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";

// Pre-generated premium waveform heights (simulating real audio frequency peaks)
const WAVEFORMS = [
  40, 60, 35, 70, 90, 45, 30, 60, 85, 100, 75, 50, 40, 65, 80, 95, 60, 45, 70,
  85, 100, 65, 40, 55, 75, 50, 30, 40,
];

const VoiceNotePlayer = ({ src, isMyMessage }) => {
  const audioRef = useRef(null);
  const waveformRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isDragging) setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    if (audio.readyState >= 2) handleLoadedMetadata();

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src, isDragging]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Calculates click or drag position over the waveform layout
  const handleWaveformInteraction = (e) => {
    if (!waveformRef.current || !duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));

    const targetTime = percentage * duration;
    setCurrentTime(targetTime);
    if (!isDragging) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    handleWaveformInteraction(e);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        audioRef.current.currentTime = currentTime;
        setIsDragging(false);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDragging, currentTime]);

  const cycleSpeed = (e) => {
    e.stopPropagation();
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const currentPercentage = (currentTime / duration) * 100 || 0;

  return (
    <div className="flex flex-col gap-1 p-3.5 w-[290px] md:w-[320px] select-none rounded-xl bg-black/15 backdrop-blur-sm border border-white/5 shadow-inner">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3.5">
        {/* Modernized Ripple Play Button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 shadow-lg transition-all duration-300 transform active:scale-90 hover:scale-105 ${
            isMyMessage
              ? "bg-blue-500 text-white hover:bg-blue-400 shadow-blue-500/20"
              : "bg-gray-800 text-blue-400 border border-gray-700/60 hover:bg-gray-700 shadow-black/40"
          }`}
        >
          {isPlaying ? (
            <Pause
              size={15}
              fill="currentColor"
              className="animate-in fade-in duration-200"
            />
          ) : (
            <Play
              size={15}
              fill="currentColor"
              className="ml-0.5 animate-in fade-in duration-200"
            />
          )}
        </button>

        {/* Dynamic Waveform Progress Track */}
        <div
          ref={waveformRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={(e) => isDragging && handleWaveformInteraction(e)}
          onTouchMove={(e) => isDragging && handleWaveformInteraction(e)}
          className="flex-1 flex items-center gap-[3px] h-10 cursor-pointer relative"
        >
          {WAVEFORMS.map((height, index) => {
            const barPercentage = (index / WAVEFORMS.length) * 100;
            const isActive = currentPercentage >= barPercentage;

            return (
              <div
                key={index}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isActive
                    ? isMyMessage
                      ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                      : "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.4)]"
                    : isMyMessage
                      ? "bg-white/20"
                      : "bg-gray-600/40"
                }`}
                style={{ height: `${height}%`, minHeight: "15%" }}
              />
            );
          })}
        </div>

        {/* Speed Adjustment Control Badge */}
        <button
          onClick={cycleSpeed}
          className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-full border transition-all shrink-0 ${
            isMyMessage
              ? "bg-white/10 hover:bg-white/20 border-white/10 text-white"
              : "bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-blue-400"
          }`}
        >
          {playbackRate}x
        </button>
      </div>

      {/* Sub-details layer containing time tracker indicators and mini status icons */}
      <div className="flex justify-between items-center px-1 mt-1 text-[10px] font-medium tracking-wide text-gray-400/80">
        <div className="flex items-center gap-1">
          <Mic
            size={11}
            className={isMyMessage ? "text-blue-300/70" : "text-gray-500"}
          />
          <span>{formatTime(currentTime)}</span>
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
