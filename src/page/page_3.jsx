import React, { useRef, useState, useEffect } from 'react';

import UploadVideo from '../component/upload_video';
import Prompt from '../component/prompt';

import './page_3.css';

const Page3 = ({
  videoPreviewUrl,
  selectedFile,
  segments = [],
  musicSelectedIds = [],
  scenePrompts = [],
  isLoading = false,
  inferenceTime = null,
  error = '',
  onGoPrevious,
  onGoNext,
  onGoHome
}) => {
  const videoRef = useRef(null);
  const [prompts, setPrompts] = useState({});

  useEffect(() => {
    if (!scenePrompts || !Array.isArray(scenePrompts)) return;

    const initialPrompts = {};
    scenePrompts.forEach((item) => {
      if (item.id !== undefined && item.id !== null) {
        initialPrompts[item.id] = item.prompt || '';
      }
    });

    setPrompts(initialPrompts);
  }, [scenePrompts]);

  const handlePromptChange = (id, value) => {
    setPrompts((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSegmentClick = (startTime) => {
    const video = videoRef.current;
    if (!video) return;

    const targetTime = Math.max(0, Number(startTime) - 1);
    video.currentTime = targetTime;
    video.play().catch((err) => console.log('Video play failed:', err));
  };

  const musicSegments = segments.filter((segment) =>
    musicSelectedIds.map(String).includes(String(segment.id))
  );

  const handleNextStep = () => {
    if (isLoading) return;
    if (!onGoNext) return;
    onGoNext(prompts);
  };

  return (
    <div className="page-container">
      <main className="content-container">
        <section className="left-section">
          <UploadVideo
            videoRef={videoRef}
            initialPreviewUrl={videoPreviewUrl}
            selectedFile={selectedFile}
          />

          <div className="loading-container">
            <div className="loading-text">
              {isLoading ? (
                <span>프롬프트 생성 중...</span>
              ) : error ? (
                <span>프롬프트 생성 실패</span>
              ) : inferenceTime !== null ? (
                <span>
                  프롬프트 생성 완료 · {Number(inferenceTime).toFixed(2)} 초
                </span>
              ) : (
                <span>프롬프트 생성 대기 중</span>
              )}
            </div>

            <div className="loading-bar-wrapper">
              <div
                className={`loading-bar-fill ${isLoading ? 'active' : ''}`}
                style={{
                  width: isLoading ? '70%' : error ? '0%' : '100%',
                  backgroundColor: error ? '#d32f2f' : '#4f46e5',
                  transition: isLoading ? 'none' : 'width 0.4s ease-in-out',
                  animation: isLoading ? undefined : 'none'
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: '10px', color: '#d32f2f', fontSize: '14px' }}>
              {error}
            </div>
          )}
        </section>

        <section className="right-section">
          {isLoading ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
            >
              Gemini가 장면을 분석하고
              <br />
              음악 생성 Prompt를 만들고 있습니다...
            </div>
          ) : (
            <div className="prompt-section">
              <h3 className="prompt-section-title">🎵 음악 생성 Prompt</h3>
              <p className="prompt-section-description">
                음악 생성이 선택된 컷의 Prompt를 확인하고 수정할 수 있습니다.
              </p>

              <div className="prompt-list">
                {musicSegments.length === 0 ? (
                  <div className="empty-prompt">
                    음악 생성 대상으로 선택된 컷이 없습니다.
                  </div>
                ) : (
                  musicSegments.map((segment) => (
                    <div
                      key={segment.id}
                      className="prompt-item"
                      onClick={() => handleSegmentClick(segment.startTime)}
                    >
                      <div className="prompt-time">
                        {segment.startTime}초 ~ {segment.endTime}초
                      </div>
                      <Prompt
                        segment={segment}
                        value={prompts[segment.id] || ''}
                        onChange={handlePromptChange}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="step-button-container">
            <button className="previous-step-btn" onClick={onGoPrevious} disabled={isLoading}>
              ← 이전 단계
            </button>
            <button
              className="next-step-btn"
              onClick={handleNextStep}
              disabled={isLoading || !!error}
            >
              {isLoading ? '생성 중...' : '다음 단계 →'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Page3;