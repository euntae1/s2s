import React, {
  useRef,
  useState,
  useEffect
} from 'react';

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


  // ============================================================
  // 각 컷의 Prompt
  // ============================================================

  const [
    prompts,
    setPrompts
  ] = useState({});


  // ============================================================
  // Gemini 결과가 들어오면 Prompt 상태에 반영
  // ============================================================

  useEffect(() => {

    if (
      !scenePrompts ||
      !Array.isArray(scenePrompts)
    ) {
      return;
    }


    const initialPrompts = {};


    scenePrompts.forEach(
      (item) => {

        if (
          item.id !== undefined &&
          item.id !== null
        ) {

          initialPrompts[item.id] =
            item.prompt || '';

        }

      }
    );


    setPrompts(
      initialPrompts
    );

  }, [
    scenePrompts
  ]);


  // ============================================================
  // Prompt 수정
  // ============================================================

  const handlePromptChange = (
    id,
    value
  ) => {

    setPrompts(
      (prev) => ({
        ...prev,
        [id]: value
      })
    );
  };


  // ============================================================
  // 컷 클릭 → 해당 위치부터 영상 재생
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
  // 음악 생성 대상만 표시
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

    if (isLoading) {
      return;
    }


    if (!onGoNext) {
      return;
    }


    onGoNext(
      prompts
    );
  };


  return (
    <div className="page-container">



      <main className="content-container">

        {/* ====================================================
            왼쪽: 영상
        ==================================================== */}

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


          {/* ==================================================
              Gemini 프롬프트 생성 로딩
          ================================================== */}

          <div className="loading-container">

            <div className="loading-text">

              {isLoading ? (

                <span>
                  프롬프트 생성 중...
                </span>

              ) : error ? (

                <span>
                  프롬프트 생성 실패
                </span>

              ) : inferenceTime !== null ? (

                <span>
                  프롬프트 생성 완료 ·{' '}
                  {inferenceTime.toFixed(2)}
                  초
                </span>

              ) : (

                <span>
                  프롬프트 생성 대기 중
                </span>

              )}

            </div>


            <div className="loading-bar-wrapper">

              <div
                className="loading-bar-fill"
                style={{
                  width:
                    isLoading
                      ? '70%'
                      : error
                        ? '0%'
                        : '100%',

                  transform:
                    'none'
                }}
              />

            </div>

          </div>


          {error && (
            <div
              style={{
                marginTop: '10px',
                color: '#d32f2f',
                fontSize: '14px'
              }}
            >
              {error}
            </div>
          )}

        </section>


        {/* ====================================================
            오른쪽: Prompt
        ==================================================== */}

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

              <h3 className="prompt-section-title">
                🎵 음악 생성 Prompt
              </h3>


              <p className="prompt-section-description">
                음악 생성이 선택된 컷의 Prompt를
                확인하고 수정할 수 있습니다.
              </p>


              <div className="prompt-list">

                {musicSegments.length === 0 ? (

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
                          segment={
                            segment
                          }

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

          )}


          {/* ==================================================
              단계 이동
          ================================================== */}

          <div className="step-button-container">

            <button
              className="previous-step-btn"
              onClick={
                onGoPrevious
              }
              disabled={
                isLoading
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
                !!error
              }
            >
              {isLoading
                ? '생성 중...'
                : '다음 단계 →'}
            </button>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Page3;