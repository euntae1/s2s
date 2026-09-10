import React, {
  useRef,
  useState
} from 'react';

import Header from '../component/header';
import UploadVideo from '../component/upload_video';
import Prompt from '../component/prompt';

import './page_3.css';

const Page3 = ({
  videoPreviewUrl,
  selectedFile,
  segments,
  musicSelectedIds,
  onGoPrevious,
  onGoNext,
  onGoHome
}) => {
  const videoRef = useRef(null);

  // 각 컷의 Prompt
  const [prompts, setPrompts] = useState(() => {
    const initialPrompts = {};

    segments.forEach((segment) => {
      if (
        musicSelectedIds.includes(
          segment.id
        )
      ) {
        initialPrompts[segment.id] =
          'Generate instrumental background music that matches the scene.';
      }
    });

    return initialPrompts;
  });

  // Prompt 수정
  const handlePromptChange = (
    id,
    value
  ) => {
    setPrompts((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  // 컷 클릭
  const handleSegmentClick = (
    startTime
  ) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const targetTime = Math.max(
      0,
      startTime - 1
    );

    video.currentTime =
      targetTime;

    video.play().catch((error) => {
      console.log(
        'Video play failed:',
        error
      );
    });
  };

  // 음악 생성 대상만 표시
  const musicSegments =
    segments.filter(
      (segment) =>
        musicSelectedIds.includes(
          segment.id
        )
    );

  // 다음 단계
  const handleNextStep = () => {
    onGoNext(prompts);
  };

  return (
    <div className="page-container">

      <Header
        onGoHome={onGoHome}
      />

      <main className="content-container">

        {/* 왼쪽: 영상 */}
        <section className="left-section">

          <UploadVideo
            videoRef={videoRef}
            initialPreviewUrl={
              videoPreviewUrl
            }
            selectedFile={
              selectedFile
            }
          />

        </section>

        {/* 오른쪽: Prompt */}
        <section className="right-section">

          <div className="prompt-section">

            <h3 className="prompt-section-title">
              🎵 음악 생성 Prompt
            </h3>

            <p className="prompt-section-description">
              음악 생성이 선택된 컷의 Prompt를
              확인하고 수정할 수 있습니다.
            </p>

            <div className="prompt-list">

              {musicSegments.length ===
              0 ? (
                <div className="empty-prompt">
                  음악 생성 대상으로 선택된
                  컷이 없습니다.
                </div>
              ) : (
                musicSegments.map(
                  (segment) => (
                    <div
                      key={segment.id}
                      className="prompt-item"
                      onClick={() =>
                        handleSegmentClick(
                          segment.startTime
                        )
                      }
                    >

                      <div className="prompt-time">
                        {segment.startTime}초 ~{' '}
                        {segment.endTime}초
                      </div>

                      <Prompt
                        segment={segment}
                        value={
                          prompts[
                            segment.id
                          ] || ''
                        }
                        onChange={
                          handlePromptChange
                        }
                      />

                    </div>
                  )
                )
              )}

            </div>

          </div>

          {/* 단계 이동 */}
          <div className="step-button-container">

            <button
              className="previous-step-btn"
              onClick={onGoPrevious}
            >
              ← 이전 단계
            </button>

            <button
              className="next-step-btn"
              onClick={handleNextStep}
            >
              다음 단계 →
            </button>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Page3;