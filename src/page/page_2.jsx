import React, {
  useState,
  useRef,
  useEffect
} from 'react';

import Header from '../component/header';
import UploadVideo from '../component/upload_video';
import Cut from '../component/cut';

import './page_2.css';

const EMPTY_ARRAY = [];

const Page2 = ({
  videoPreviewUrl,
  selectedFile,
  initialSegments = EMPTY_ARRAY,
  initialMusicSelectedIds = EMPTY_ARRAY,
  isLoading = false,
  inferenceTime = null,
  error = '',
  onGoPrevious,
  onGoNext,
  onGoHome
}) => {

  const videoRef = useRef(null);

  const [
    segments,
    setSegments
  ] = useState(initialSegments);

  const [
    selectedIds,
    setSelectedIds
  ] = useState([]);

  const [
    musicSelectedIds,
    setMusicSelectedIds
  ] = useState(initialMusicSelectedIds);

  const [
    history,
    setHistory
  ] = useState([]);


  // ============================================================
  // 서버에서 컷 분석 결과가 들어오면 Page 2에 반영
  // ============================================================

  useEffect(() => {
    setSegments(initialSegments);
  }, [initialSegments]);


  // ============================================================
  // 초기 음악 생성 선택 상태 반영
  // ============================================================

  useEffect(() => {
    setMusicSelectedIds(initialMusicSelectedIds);
  }, [initialMusicSelectedIds]);


  // ============================================================
  // 컷 클릭 → 해당 위치부터 영상 재생
  // ============================================================

  const handleSegmentClick = (
    startTime
  ) => {

    const video =
      videoRef.current;

    if (!video) {
      console.log(
        'Video element not found'
      );

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
  // 컷 병합 체크
  // ============================================================

  const handleCheck = (
    e,
    id
  ) => {

    e.stopPropagation();

    setSelectedIds(
      (prev) => {

        if (prev.includes(id)) {

          return prev.filter(
            (item) =>
              item !== id
          );

        }

        return [
          ...prev,
          id
        ];
      }
    );
  };


  // ============================================================
  // 음악 생성 여부 체크
  // ============================================================

  const handleMusicCheck = (
    e,
    id
  ) => {

    e.stopPropagation();

    setMusicSelectedIds(
      (prev) => {

        if (prev.includes(id)) {

          return prev.filter(
            (item) =>
              item !== id
          );

        }

        return [
          ...prev,
          id
        ];
      }
    );
  };


  // ============================================================
  // 컷 병합
  // ============================================================

  const handleMerge = () => {

    if (
      selectedIds.length < 2
    ) {

      alert(
        '병합할 컷을 2개 이상 선택해 주세요.'
      );

      return;
    }


    const selectedSegments =
      segments.filter(
        (seg) =>
          selectedIds.includes(
            seg.id
          )
      );


    // 현재 상태 저장
    setHistory(
      (prev) => [
        ...prev,
        {
          segments: [
            ...segments
          ],
          musicSelectedIds: [
            ...musicSelectedIds
          ]
        }
      ]
    );


    const minStart =
      Math.min(
        ...selectedSegments.map(
          (s) =>
            s.startTime
        )
      );


    const maxEnd =
      Math.max(
        ...selectedSegments.map(
          (s) =>
            s.endTime
        )
      );


    const firstSelectedIndex =
      segments.findIndex(
        (seg) =>
          selectedIds.includes(
            seg.id
          )
      );


    const mergedSegment = {
      id: Date.now(),
      startTime:
        minStart,
      endTime:
        maxEnd
    };


    const newSegments =
      segments.filter(
        (seg) =>
          !selectedIds.includes(
            seg.id
          )
      );


    newSegments.splice(
      firstSelectedIndex,
      0,
      mergedSegment
    );


    // 선택된 컷 중 하나라도
    // 음악 생성 대상으로 되어 있었다면
    // 병합된 컷도 음악 생성 대상으로 유지
    const shouldGenerateMusic =
      selectedSegments.some(
        (seg) =>
          musicSelectedIds.includes(
            seg.id
          )
      );


    const newMusicSelectedIds =
      musicSelectedIds.filter(
        (id) =>
          !selectedIds.includes(
            id
          )
      );


    if (
      shouldGenerateMusic
    ) {

      newMusicSelectedIds.push(
        mergedSegment.id
      );

    }


    setSegments(
      newSegments
    );

    setSelectedIds([]);

    setMusicSelectedIds(
      newMusicSelectedIds
    );
  };


  // ============================================================
  // 실행 취소
  // ============================================================

  const handleUndo = () => {

    if (
      history.length === 0
    ) {

      alert(
        '되돌릴 수 있는 이전 상태가 없습니다.'
      );

      return;
    }


    const previousState =
      history[
        history.length - 1
      ];


    setSegments(
      previousState.segments
    );


    setSelectedIds([]);


    setMusicSelectedIds(
      previousState.musicSelectedIds
    );


    setHistory(
      (prev) =>
        prev.slice(
          0,
          -1
        )
    );
  };


  // ============================================================
  // Page 2 → Page 3
  // ============================================================

  const handleNextStep = () => {

    if (isLoading) {
      return;
    }


    if (
      musicSelectedIds.length === 0
    ) {

      const confirmMove =
        window.confirm(
          '음악 생성 대상으로 선택된 컷이 없습니다.\n그래도 다음 단계로 이동하시겠습니까?'
        );


      if (!confirmMove) {
        return;
      }
    }


    if (!onGoNext) {
      console.error(
        '❌ onGoNext 함수가 전달되지 않았습니다.'
      );

      return;
    }


    console.log(
      '➡️ Page 2 → Page 3'
    );

    console.log(
      '✂️ 현재 segments:',
      segments
    );

    console.log(
      '🎵 음악 생성 선택:',
      musicSelectedIds
    );


    onGoNext({
      segments,
      musicSelectedIds
    });
  };


  return (
    <div className="page-container">

      <Header
        onGoHome={
          onGoHome ||
          onGoPrevious
        }
      />


      <main className="content-container">

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


          <div className="loading-container">

            <div className="loading-text">

              {isLoading ? (

                <span>
                  장면 분석 중...
                </span>

              ) : error ? (

                <span>
                  분석 실패
                </span>

              ) : inferenceTime !== null ? (

                <span>
                  장면 분석 완료 ·{' '}
                  {inferenceTime.toFixed(2)}
                  초
                </span>

              ) : (

                <span>
                  장면 분석 대기 중
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
              컷 분할 분석 중...
            </div>

          ) : (

            <Cut
              segments={
                segments
              }

              selectedIds={
                selectedIds
              }

              musicSelectedIds={
                musicSelectedIds
              }

              onSegmentClick={
                handleSegmentClick
              }

              onCheck={
                handleCheck
              }

              onMusicCheck={
                handleMusicCheck
              }

              onMerge={
                handleMerge
              }

              onUndo={
                handleUndo
              }
            />

          )}


          <div className="step-button-container">

            <button
              className="previous-step-btn"
              onClick={
                onGoPrevious
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
                !!error ||
                segments.length === 0
              }
            >
              {isLoading
                ? '분석 중...'
                : '다음 단계 →'}
            </button>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Page2;