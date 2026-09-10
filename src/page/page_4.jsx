import React, {
  useRef,
  useState
} from 'react';

import Header from '../component/header';
import UploadVideo from '../component/upload_video';
import Music from '../component/music';

import './page_4.css';

const Page4 = ({
  videoPreviewUrl,
  selectedFile,
  segments,
  musicSelectedIds,
  prompts,
  onGoPrevious,
  onGoNext,
  onGoHome
}) => {
  const videoRef = useRef(null);

  // 현재 음악을 생성하고 있는 컷
  const [generatingId, setGeneratingId] =
    useState(null);

  // 생성 완료된 음악
  const [generatedMusic, setGeneratedMusic] =
    useState({});

  // 컷 클릭 시 영상 이동
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

  // 음악 생성
  const handleGenerateMusic = async (
    segmentId
  ) => {
    if (generatingId !== null) {
      return;
    }

    const segment =
      segments.find(
        (item) =>
          item.id === segmentId
      );

    if (!segment) {
      return;
    }

    setGeneratingId(segmentId);

    try {
      /*
       * 실제 음악 생성 API 연결 부분
       *
       * 나중에 Stable Audio 서버에
       * 요청을 보내면 됨.
       */

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 3000)
      );

      // 임시 테스트용 음악 URL
      const demoAudioUrl =
        'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a7346e.mp3';

      setGeneratedMusic((prev) => ({
        ...prev,
        [segmentId]: demoAudioUrl
      }));

    } catch (error) {
      console.error(
        'Music generation failed:',
        error
      );

      alert(
        '음악 생성 중 오류가 발생했습니다.'
      );

    } finally {
      setGeneratingId(null);
    }
  };

  // 음악 생성 대상으로 선택된 컷만
  const musicSegments =
    segments.filter(
      (segment) =>
        musicSelectedIds.includes(
          segment.id
        )
    );

  // 다음 단계
  const handleNextStep = () => {
    if (
      musicSegments.length === 0
    ) {
      alert(
        '음악 생성 대상 컷이 없습니다.'
      );

      return;
    }

    const notGenerated =
      musicSegments.filter(
        (segment) =>
          !generatedMusic[
            segment.id
          ]
      );

    if (notGenerated.length > 0) {
      alert(
        '모든 컷의 음악을 먼저 생성해 주세요.'
      );

      return;
    }

    onGoNext(
      generatedMusic
    );
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

        {/* 오른쪽: 음악 생성 */}
        <section className="right-section">

          <div className="music-section">

            <div className="music-section-header">

              <h3 className="music-section-title">
                🎵 음악 생성
              </h3>

              <p className="music-section-description">
                컷과 Prompt를 확인하고
                각 컷의 음악을 생성하세요.
              </p>

            </div>

            <div className="music-list">

              {musicSegments.length ===
              0 ? (
                <div className="empty-music">
                  음악 생성 대상으로 선택된
                  컷이 없습니다.
                </div>
              ) : (
                musicSegments.map(
                  (segment) => (
                    <div
                      key={segment.id}
                      onClick={() =>
                        handleSegmentClick(
                          segment.startTime
                        )
                      }
                    >

                      <Music
                        segment={
                          segment
                        }
                        prompt={
                          prompts[
                            segment.id
                          ] || ''
                        }
                        isGenerating={
                          generatingId ===
                          segment.id
                        }
                        hasMusic={
                          Boolean(
                            generatedMusic[
                              segment.id
                            ]
                          )
                        }
                        musicUrl={
                          generatedMusic[
                            segment.id
                          ] || ''
                        }
                        onGenerate={
                          handleGenerateMusic
                        }
                      />

                    </div>
                  )
                )
              )}

            </div>

          </div>

          {/* 단계 이동 버튼 */}
          <div className="step-button-container">

            <button
              className="previous-step-btn"
              onClick={onGoPrevious}
              disabled={
                generatingId !== null
              }
            >
              ← 이전 단계
            </button>

            <button
              className="next-step-btn"
              onClick={handleNextStep}
              disabled={
                generatingId !== null
              }
            >
              다음 단계 →
            </button>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Page4;