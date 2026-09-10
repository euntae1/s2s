import React, { useState, useRef } from 'react';
import Header from '../component/header';
import UploadVideo from '../component/upload_video';
import Cut from '../component/cut';
import './page_2.css';

const Page2 = ({
  videoPreviewUrl,
  selectedFile,
  onGoPrevious,
  onGoNext
}) => {
  const videoRef = useRef(null);

  const [segments, setSegments] = useState([
    {
      id: 1,
      startTime: 2,
      endTime: 5
    },
    {
      id: 2,
      startTime: 5,
      endTime: 12
    },
    {
      id: 3,
      startTime: 12,
      endTime: 18
    },
    {
      id: 4,
      startTime: 18,
      endTime: 25
    }
  ]);

  // 왼쪽 체크박스
  // 컷 병합 선택
  const [selectedIds, setSelectedIds] = useState([]);

  // 오른쪽 체크박스
  // 음악 생성 여부
  // 초기값: 모든 컷 선택
  const [musicSelectedIds, setMusicSelectedIds] =
    useState([
      1,
      2,
      3,
      4
    ]);

  // 되돌리기용 이전 상태
  const [history, setHistory] = useState([]);

  // 컷 클릭
  const handleSegmentClick = (startTime) => {
    const video = videoRef.current;

    if (!video) {
      console.log('Video element not found');
      return;
    }

    const targetTime = Math.max(
      0,
      startTime - 1
    );

    video.currentTime = targetTime;

    video.play().catch((error) => {
      console.log(
        'Video play failed:',
        error
      );
    });
  };

  // 왼쪽 체크박스
  // 컷 병합 대상 선택
  const handleCheck = (e, id) => {
    e.stopPropagation();

    if (selectedIds.includes(id)) {
      setSelectedIds(
        selectedIds.filter(
          (item) => item !== id
        )
      );
    } else {
      setSelectedIds([
        ...selectedIds,
        id
      ]);
    }
  };

  // 오른쪽 체크박스
  // 음악 생성 여부 선택
  const handleMusicCheck = (e, id) => {
    e.stopPropagation();

    if (musicSelectedIds.includes(id)) {
      setMusicSelectedIds(
        musicSelectedIds.filter(
          (item) => item !== id
        )
      );
    } else {
      setMusicSelectedIds([
        ...musicSelectedIds,
        id
      ]);
    }
  };

  // 선택한 컷 병합
  const handleMerge = () => {
    if (selectedIds.length < 2) {
      alert(
        '병합할 컷을 2개 이상 선택해 주세요.'
      );
      return;
    }

    const selectedSegments =
      segments.filter(
        (seg) =>
          selectedIds.includes(seg.id)
      );

    // 병합 전 상태 저장
    setHistory((prev) => [
      ...prev,
      {
        segments: [...segments],
        musicSelectedIds: [
          ...musicSelectedIds
        ]
      }
    ]);

    const minStart = Math.min(
      ...selectedSegments.map(
        (s) => s.startTime
      )
    );

    const maxEnd = Math.max(
      ...selectedSegments.map(
        (s) => s.endTime
      )
    );

    const firstSelectedIndex =
      segments.findIndex(
        (seg) =>
          selectedIds.includes(seg.id)
      );

    const mergedSegment = {
      id: Date.now(),
      startTime: minStart,
      endTime: maxEnd
    };

    // 선택한 컷 제거
    const newSegments =
      segments.filter(
        (seg) =>
          !selectedIds.includes(seg.id)
      );

    // 첫 번째 선택 컷 위치에 병합된 컷 삽입
    newSegments.splice(
      firstSelectedIndex,
      0,
      mergedSegment
    );

    // 선택한 컷 중 하나라도
    // 음악 생성 대상이었다면
    // 병합된 컷도 음악 생성 대상으로 설정
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
          !selectedIds.includes(id)
      );

    if (shouldGenerateMusic) {
      newMusicSelectedIds.push(
        mergedSegment.id
      );
    }

    setSegments(newSegments);

    // 병합 후 왼쪽 체크박스 해제
    setSelectedIds([]);

    setMusicSelectedIds(
      newMusicSelectedIds
    );
  };

  // 되돌리기
  const handleUndo = () => {
    if (history.length === 0) {
      alert(
        '되돌릴 수 있는 이전 상태가 없습니다.'
      );
      return;
    }

    const previousState =
      history[history.length - 1];

    setSegments(
      previousState.segments
    );

    // 되돌린 후 컷 병합 선택은 전부 해제
    setSelectedIds([]);

    // 음악 생성 여부는 이전 상태 복원
    setMusicSelectedIds(
      previousState.musicSelectedIds
    );

    setHistory(
      history.slice(0, -1)
    );
  };

  // 다음 단계
  const handleNextStep = () => {
    if (musicSelectedIds.length === 0) {
      const confirmMove = window.confirm(
        '음악 생성 대상으로 선택된 컷이 없습니다.\n그래도 다음 단계로 이동하시겠습니까?'
      );

      if (!confirmMove) {
        return;
      }
    }

    onGoNext(
      segments,
      musicSelectedIds
    );
  };

  return (
    <div className="page-container">

      <Header
        onGoHome={() => onGoPrevious()}
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

          <div className="loading-container">

            <div className="loading-text">
              <span>
                장면 분석 및 음악 생성 중...
              </span>
            </div>

            <div className="loading-bar-wrapper">
              <div className="loading-bar-fill"></div>
            </div>

          </div>

        </section>

        {/* 오른쪽: 컷 분할 */}
        <section className="right-section">

          <Cut
            segments={segments}
            selectedIds={selectedIds}
            musicSelectedIds={
              musicSelectedIds
            }
            onSegmentClick={
              handleSegmentClick
            }
            onCheck={handleCheck}
            onMusicCheck={
              handleMusicCheck
            }
            onMerge={handleMerge}
            onUndo={handleUndo}
          />

          {/* 단계 이동 버튼 */}
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

export default Page2;