import React, {
  useState,
  useRef,
  useEffect
} from 'react';

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

  const [segments, setSegments] = useState(initialSegments);
  const [selectedIds, setSelectedIds] = useState([]);
  const [musicSelectedIds, setMusicSelectedIds] = useState(initialMusicSelectedIds);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setSegments(initialSegments);
    setMusicSelectedIds(initialSegments.map((seg) => seg.id));
  }, [initialSegments]);

  useEffect(() => {
    setMusicSelectedIds(initialMusicSelectedIds);
  }, [initialMusicSelectedIds]);

  const handleSegmentClick = (startTime) => {
    const video = videoRef.current;
    if (!video) return;

    const targetTime = Math.max(0, Number(startTime) - 1);
    video.currentTime = targetTime;
    video.play().catch((err) => console.log('Video play failed:', err));
  };

  const handleCheck = (e, id) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMusicCheck = (e, id) => {
    e.stopPropagation();
    setMusicSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMerge = () => {
    if (selectedIds.length < 2) {
      alert('병합할 컷을 2개 이상 선택해 주세요.');
      return;
    }

    const selectedSegments = segments.filter((seg) => selectedIds.includes(seg.id));

    setHistory((prev) => [
      ...prev,
      {
        segments: [...segments],
        musicSelectedIds: [...musicSelectedIds]
      }
    ]);

    const minStart = Math.min(...selectedSegments.map((s) => s.startTime));
    const maxEnd = Math.max(...selectedSegments.map((s) => s.endTime));
    const firstSelectedIndex = segments.findIndex((seg) => selectedIds.includes(seg.id));

    const mergedSegment = {
      id: Date.now(),
      startTime: minStart,
      endTime: maxEnd
    };

    const newSegments = segments.filter((seg) => !selectedIds.includes(seg.id));
    newSegments.splice(firstSelectedIndex, 0, mergedSegment);

    const shouldGenerateMusic = selectedSegments.some((seg) => musicSelectedIds.includes(seg.id));
    const newMusicSelectedIds = musicSelectedIds.filter((id) => !selectedIds.includes(id));

    if (shouldGenerateMusic) {
      newMusicSelectedIds.push(mergedSegment.id);
    }

    setSegments(newSegments);
    setSelectedIds([]);
    setMusicSelectedIds(newMusicSelectedIds);
  };

  const handleUndo = () => {
    if (history.length === 0) {
      alert('되돌릴 수 있는 이전 상태가 없습니다.');
      return;
    }

    const previousState = history[history.length - 1];
    setSegments(previousState.segments);
    setSelectedIds([]);
    setMusicSelectedIds(previousState.musicSelectedIds);
    setHistory((prev) => prev.slice(0, -1));
  };

  const handleNextStep = () => {
    if (isLoading) return;

    if (musicSelectedIds.length === 0) {
      const confirmMove = window.confirm(
        '음악 생성 대상으로 선택된 컷이 없습니다.\n그래도 다음 단계로 이동하시겠습니까?'
      );
      if (!confirmMove) return;
    }

    if (!onGoNext) return;

    onGoNext({ segments, musicSelectedIds });
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
                <span>장면 분석 중...</span>
              ) : error ? (
                <span>분석 실패</span>
              ) : inferenceTime !== null ? (
                <span>
                  장면 분석 완료 · {Number(inferenceTime).toFixed(2)} 초
                </span>
              ) : (
                <span>장면 분석 대기 중</span>
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
              컷 분할 분석 중...
            </div>
          ) : (
            <Cut
              segments={segments}
              selectedIds={selectedIds}
              musicSelectedIds={musicSelectedIds}
              onSegmentClick={handleSegmentClick}
              onCheck={handleCheck}
              onMusicCheck={handleMusicCheck}
              onMerge={handleMerge}
              onUndo={handleUndo}
            />
          )}

          <div className="step-button-container">
            <button className="previous-step-btn" onClick={onGoPrevious}>
              ← 이전 단계
            </button>
            <button
              className="next-step-btn"
              onClick={handleNextStep}
              disabled={isLoading || !!error || segments.length === 0}
            >
              {isLoading ? '분석 중...' : '다음 단계 →'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Page2;