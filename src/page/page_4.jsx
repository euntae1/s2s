import React, {
  useRef
} from 'react';

import Header from '../component/header';
import UploadVideo from '../component/upload_video';
import Music from '../component/music';

import './page_4.css';

const EMPTY_ARRAY = [];

const Page4 = ({
  videoPreviewUrl,
  selectedFile,
  segments = EMPTY_ARRAY,
  musicSelectedIds = EMPTY_ARRAY,
  prompts = {},
  generatedMusic = {},
  generatingId = null,
  isLoading = false,
  error = '',
  onGenerate,
  onGoNext,
  onGoHome
}) => {
  const videoRef =
    useRef(null);


  // ============================================================
  // 컷 클릭 시 영상 이동
  // ============================================================

  const handleSegmentClick = (
    startTime
  ) => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const targetTime =
      Math.max(
        0,
        Number(startTime) - 1
      );

    video.currentTime =
      targetTime;

    video.play().catch(
      (error) => {
        console.log(
          'Video play failed:',
          error
        );
      }
    );
  };


  // ============================================================
  // 음악 생성 대상 컷
  // ============================================================

  const musicSegments =
    segments.filter(
      (segment) =>
        musicSelectedIds.includes(
          segment.id
        )
    );


  // ============================================================
  // 다음 단계
  // ============================================================

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

    if (
      notGenerated.length > 0
    ) {
      alert(
        '모든 컷의 음악이 생성될 때까지 기다려 주세요.'
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
        onGoHome={
          onGoHome
        }
      />

      <main className="content-container">

        {/* ======================================================
            왼쪽: 영상
        ====================================================== */}

        <section className="left-section">

          <UploadVideo
            videoRef={
              videoRef
            }

            initialPreviewUrl={
              videoPreviewUrl
            }

            selectedFile={
              selectedFile
            }
          />

        </section>


        {/* ======================================================
            오른쪽: 음악
        ====================================================== */}

        <section className="right-section">

          <div className="music-section">

            <div className="music-section-header">

              <h3 className="music-section-title">
                🎵 음악 생성
              </h3>

              <p className="music-section-description">
                컷과 Prompt를 확인하고
                생성된 음악을 확인하세요.
              </p>

            </div>


            {/* ==================================================
                전체 음악 생성 중
            ================================================== */}

            {isLoading && (
              <div className="music-loading">
                <div>
                  🎵 음악 생성 중...
                </div>

                <div>
                  잠시만 기다려 주세요.
                </div>
              </div>
            )}


            {/* ==================================================
                에러
            ================================================== */}

            {error && (
              <div className="music-error">
                {error}
              </div>
            )}


            <div className="music-list">

              {musicSegments.length ===
              0 ? (
                <div className="empty-music">
                  음악 생성 대상으로 선택된
                  컷이 없습니다.
                </div>
              ) : (
                musicSegments.map(
                  (segment) => {

                    const musicUrl =
                      generatedMusic[
                        segment.id
                      ];

                    const prompt =
                      prompts[
                        segment.id
                      ] || '';

                    const isGenerating =
                      generatingId ===
                      segment.id;

                    const hasMusic =
                      Boolean(
                        musicUrl
                      );

                    return (
                      <div
                        key={
                          segment.id
                        }
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
                            prompt
                          }

                          isGenerating={
                            isGenerating
                          }

                          hasMusic={
                            hasMusic
                          }

                          musicUrl={
  generatedMusic[segment.id]?.url || ''
}

                          onGenerate={
                            onGenerate
                          }
                        />

                      </div>
                    );
                  }
                )
              )}

            </div>

          </div>


          {/* ====================================================
              단계 이동
          ==================================================== */}

          <div className="step-button-container">

            <button
              className="previous-step-btn"
              onClick={() => {
                // 현재 구조에서는
                // 이전 단계 버튼을 사용하지 않는다.
              }}
              disabled={
                generatingId !==
                null
              }
            >
              ← 이전 단계
            </button>

            <button
              className="next-step-btn"
              onClick={
                handleNextStep
              }
              disabled={
                isLoading ||
                generatingId !==
                  null
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