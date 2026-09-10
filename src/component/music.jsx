import React, { useRef, useEffect } from 'react';
import './music.css';

const Music = ({
  segment,
  prompt,
  isGenerating,
  hasMusic,
  musicUrl,
  onGenerate
}) => {
  const audioRef = useRef(null);

  // musicUrl이 변경될 때 오디오 플레이어를 리로드
  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.load();
    }
  }, [musicUrl]);

  const handleGenerate = (event) => {
    event.stopPropagation();
    onGenerate(segment.id);
  };

  return (
    <div className="music-container">
      <div className="music-header">
        <div className="music-cut-time">
          {segment.startTime}초 ~ {segment.endTime}초
        </div>

        <div
          className={
            isGenerating
              ? 'music-status generating'
              : hasMusic
              ? 'music-status completed'
              : 'music-status'
          }
        >
          {isGenerating
            ? '음악 생성 중...'
            : hasMusic
            ? '생성 완료'
            : '음악 미생성'}
        </div>
      </div>

      {/* Prompt */}
      <div className="music-prompt-box">
        <div className="music-prompt-label">Prompt</div>
        <div className="music-prompt-text">{prompt}</div>
      </div>

      {/* 음악 생성 / 재생 */}
      <div className="music-action">
        {!hasMusic ? (
          <button
            className="generate-music-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '🎵 음악 생성 중...' : '🎵 음악 생성'}
          </button>
        ) : (
          <div className="music-player">
            <audio
              ref={audioRef} // ref 추가
              controls
              src={musicUrl}
              className="audio-player"
              onClick={(event) => event.stopPropagation()}
            />

            <button
              className="regenerate-music-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? '생성 중...' : '↻ 다시 생성'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Music;