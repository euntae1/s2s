import React, {
  useState
} from 'react';

import Header from './component/header';

import Page1 from './page/page_1';
import Page2 from './page/page_2';
import Page3 from './page/page_3';
import Page4 from './page/page_4';
import Page5 from './page/page_5';

import {
  analyzeVideoCuts,
  generateScenePrompts,
  generateMusic
} from './api/hf';

import './App.css';

function App() {

  const [
    currentPage,
    setCurrentPage
  ] = useState(1);

  const [
    videoPreviewUrl,
    setVideoPreviewUrl
  ] = useState(null);

  const [
    selectedFile,
    setSelectedFile
  ] = useState(null);


  // ============================================================
  // Page 2
  // ============================================================

  const [
    page2Loading,
    setPage2Loading
  ] = useState(false);

  const [
    page2InferenceTime,
    setPage2InferenceTime
  ] = useState(null);

  const [
    page2Error,
    setPage2Error
  ] = useState(null);

  const [
    segments,
    setSegments
  ] = useState([]);

  const [
    musicSelectedIds,
    setMusicSelectedIds
  ] = useState([]);


  // ============================================================
  // Page 3
  // ============================================================

  const [
    page3Loading,
    setPage3Loading
  ] = useState(false);

  const [
    page3InferenceTime,
    setPage3InferenceTime
  ] = useState(null);

  const [
    page3Error,
    setPage3Error
  ] = useState(null);

  const [
    scenePrompts,
    setScenePrompts
  ] = useState([]);


  // ============================================================
  // Page 4
  // 음악 생성 상태
  // ============================================================

  const [
    generatedMusic,
    setGeneratedMusic
  ] = useState({});

  const [
    musicGeneratingId,
    setMusicGeneratingId
  ] = useState(null);

  const [
    musicGenerationLoading,
    setMusicGenerationLoading
  ] = useState(false);

  const [
    musicGenerationError,
    setMusicGenerationError
  ] = useState(null);

    const [finalVideoUrl, setFinalVideoUrl] = useState(null);
const [finalVideoLoading, setFinalVideoLoading] = useState(false);
const [finalVideoError, setFinalVideoError] = useState('');

  // ============================================================
  // Page 1 → Page 2
  // ============================================================

  const handleGoNext = async (
    previewUrl,
    file
  ) => {
    if (!file) {
      return;
    }

    console.log(
      '🎬 컷 분할 분석 시작'
    );

    setVideoPreviewUrl(
      previewUrl
    );

    setSelectedFile(file);

    setPage2Loading(true);
    setPage2InferenceTime(null);
    setPage2Error(null);
    setSegments([]);
    setMusicSelectedIds([]);

    setCurrentPage(2);

    try {
      const startTime =
        performance.now();

      const result =
        await analyzeVideoCuts(file);

      const endTime =
        performance.now();

      const elapsedTime =
        (endTime - startTime) /
        1000;

      console.log(
        '✂️ 컷 분할 결과:',
        result
      );

      console.log(
        `⏱️ 실제 소요 시간: ${elapsedTime.toFixed(
          2
        )}초`
      );

      const newSegments =
        (result.timelogs || []).map(
          (item) => ({
            id: item.id,
            startTime:
              item.startTime,
            endTime:
              item.endTime
          })
        );

      setSegments(
        newSegments
      );

      setPage2InferenceTime(
        result.inferenceTime
      );

    } catch (error) {
      console.error(
        '❌ 컷 분할 실패:',
        error
      );

      setPage2Error(
        error.message ||
          '컷 분할에 실패했습니다.'
      );

    } finally {
      setPage2Loading(false);
    }
  };


  // ============================================================
  // Page 2 → Page 3
  // ============================================================

  const handlePage2Next = async ({
    segments: currentSegments,
    musicSelectedIds:
      currentMusicSelectedIds
  }) => {
    if (!selectedFile) {
      setPage3Error(
        '분석할 동영상 파일이 없습니다.'
      );

      setCurrentPage(3);
      return;
    }

    console.log(
      '🎵 Page 2 → Page 3'
    );

    console.log(
      '🎵 음악 생성 선택:',
      currentMusicSelectedIds
    );

    setMusicSelectedIds(
      currentMusicSelectedIds
    );

    const timelogs =
      currentSegments.map(
        (segment) => ({
          id: segment.id,
          startTime:
            segment.startTime,
          endTime:
            segment.endTime,
          musicSelected:
            currentMusicSelectedIds.includes(
              segment.id
            )
        })
      );

    console.log(
      '📋 Signal 1 전송 데이터:',
      timelogs
    );

    setPage3Loading(true);
    setPage3InferenceTime(null);
    setPage3Error(null);
    setScenePrompts([]);

    setCurrentPage(3);

    try {
      const startTime =
        performance.now();

      const result =
        await generateScenePrompts(
          selectedFile,
          timelogs
        );

      const endTime =
        performance.now();

      console.log(
        `⏱️ Gemini 전체 처리 시간: ${(
          (endTime - startTime) /
          1000
        ).toFixed(2)}초`
      );

      console.log(
        '🤖 Gemini 결과:',
        result
      );

      setScenePrompts(
        result.timelogs || []
      );

      setPage3InferenceTime(
        result.inferenceTime
      );

    } catch (error) {
      console.error(
        '❌ Gemini 프롬프트 생성 실패:',
        error
      );

      setPage3Error(
        error.message ||
          'Gemini 프롬프트 생성에 실패했습니다.'
      );

    } finally {
      setPage3Loading(false);
    }
  };


  // ============================================================
  // Page 3 → Page 4
  // Prompt 수정 완료
  // → Colab 음악 생성
  // ============================================================

 // App.js 의 handlePage3Next 함수 수정
const handlePage3Next = async (editedPrompts) => {
  console.log('🎵 Page 3 → 음악 생성 시작');
  console.log('📝 수정된 Prompt:', editedPrompts);

  if (!editedPrompts) {
    return;
  }

  // 💡 [핵심 해결 방법] 사용자가 수정한 프롬프트로 scenePrompts 상태를 업데이트!
  setScenePrompts((prevPrompts) =>
    prevPrompts.map((item) => ({
      ...item,
      prompt: editedPrompts[item.id] !== undefined ? editedPrompts[item.id] : item.prompt
    }))
  );

  const musicSegments = segments.filter((segment) =>
    musicSelectedIds.includes(segment.id)
  );

  if (musicSegments.length === 0) {
    alert('음악 생성 대상 컷이 없습니다.');
    return;
  }

  setMusicGenerationLoading(true);
  setMusicGenerationError(null);
  setGeneratedMusic({});

  // Page 4로 이동
  setCurrentPage(4);

  try {
    for (const segment of musicSegments) {
      const prompt = editedPrompts[segment.id];

      if (!prompt || !prompt.trim()) {
        console.warn(`⚠️ Scene ${segment.id} Prompt가 없습니다.`);
        continue;
      }

      const duration =
        Number(segment.endTime) - Number(segment.startTime);

      setMusicGeneratingId(segment.id);

      const result = await generateMusic(prompt, duration);

      setGeneratedMusic((prev) => ({
        ...prev,
        [segment.id]: {
          url: result.musicUrl,
          blob: result.blob
        }
      }));

      console.log(`✅ Scene ${segment.id} 음악 생성 완료`);
    }
  } catch (error) {
    console.error('❌ 음악 생성 실패:', error);
    setMusicGenerationError(
      error.message || '음악 생성 중 오류가 발생했습니다.'
    );
    alert('음악 생성 중 오류가 발생했습니다.');
  } finally {
    setMusicGeneratingId(null);
    setMusicGenerationLoading(false);
  }
};
// page4 -> page5
const handlePage4Next = () => {
  console.log('🎬 Page 4 → Page 5 이동');

  if (!selectedFile) {
    alert('원본 동영상이 없습니다.');
    return;
  }

  if (!musicSelectedIds || musicSelectedIds.length === 0) {
    alert('음악을 생성할 컷이 없습니다.');
    return;
  }

  const missingMusic = musicSelectedIds.filter(
    (id) => !generatedMusic[id]
  );

  if (missingMusic.length > 0) {
    alert('모든 컷의 음악이 생성될 때까지 기다려 주세요.');
    return;
  }

  console.log('🎵 모든 음악 생성 완료');
  console.log('🎬 Page 5에서 최종 영상 합성을 시작합니다.');

  setFinalVideoUrl(null);
  setFinalVideoError('');
  setFinalVideoLoading(true);

  // 최종 영상 합성은 Page 5의 Result.jsx에서
  // ffmpeg.wasm을 이용해 브라우저에서 처리
  setCurrentPage(5);
};
  // ============================================================
  // Page 4
  // 특정 음악 재생성
  // ============================================================

  const handleRegenerateMusic =
    async (segmentId) => {
      if (
        musicGeneratingId !==
        null
      ) {
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

      const prompt =
        scenePrompts.find(
          (item) =>
            item.id === segmentId
        )?.prompt;

      if (
        !prompt ||
        !prompt.trim()
      ) {
        alert(
          '음악 생성 Prompt가 없습니다.'
        );
        return;
      }

      const duration =
        Number(
          segment.endTime
        ) -
        Number(
          segment.startTime
        );

      console.log(
        `🔄 Scene ${segmentId} 음악 재생성`
      );

      console.log(
        '📝 Prompt:',
        prompt
      );

      console.log(
        '⏱️ Duration:',
        duration
      );

      setMusicGeneratingId(
        segmentId
      );

      setMusicGenerationError(
        null
      );

      try {
        const result =
          await generateMusic(
            prompt,
            duration
          );

        setGeneratedMusic(
          (prev) => {
            const oldUrl =
              prev[segmentId];

            if (oldUrl) {
              if (
  generatedMusic[segmentId]?.url
) {
  URL.revokeObjectURL(
    generatedMusic[segmentId].url
  );
}
            }

            return {
              ...prev,
              [segmentId]:
                result.musicUrl
            };
          }
        );

        console.log(
          `✅ Scene ${segmentId} 음악 교체 완료`
        );

      } catch (error) {
        console.error(
          '❌ 음악 재생성 실패:',
          error
        );

        setMusicGenerationError(
          error.message ||
            '음악 재생성 중 오류가 발생했습니다.'
        );

        alert(
          '음악 재생성 중 오류가 발생했습니다.'
        );

      } finally {
        setMusicGeneratingId(
          null
        );
      }
    };


  // ============================================================
  // Page 이동
  // ============================================================

  const handleGoHome = () => {
    setCurrentPage(1);
  };
const handleGoPrevious = () => {
  setCurrentPage((prev) => Math.max(1, prev - 1));
};

  return (
    <div className="app">

      <Header
        onGoHome={
          handleGoHome
        }
      />


      {/* ======================================================
          Page 1
      ====================================================== */}

      {currentPage === 1 && (
        <Page1
          onNext={
            handleGoNext
          }
        />
      )}


      {/* ======================================================
          Page 2
      ====================================================== */}

      {currentPage === 2 && (
        <Page2
          videoPreviewUrl={
            videoPreviewUrl
          }
          selectedFile={
            selectedFile
          }
          initialSegments={
            segments
          }
          initialMusicSelectedIds={
            musicSelectedIds
          }
          isLoading={
            page2Loading
          }
          inferenceTime={
            page2InferenceTime
          }
          error={
            page2Error
          }
          onGoNext={
            handlePage2Next
          }
          onGoPrevious={handleGoPrevious} /* 👈 추가 */
        />
      )}


      {/* ======================================================
          Page 3
      ====================================================== */}

      {currentPage === 3 && (
        <Page3
          videoPreviewUrl={
            videoPreviewUrl
          }

          selectedFile={
            selectedFile
          }

          segments={
            segments
          }

          musicSelectedIds={
            musicSelectedIds
          }

          scenePrompts={
            scenePrompts
          }

          isLoading={
            page3Loading
          }

          inferenceTime={
            page3InferenceTime
          }

          error={
            page3Error
          }

          onGoNext={
            handlePage3Next
          }

          onGoHome={
            handleGoHome
          }
          onGoPrevious={handleGoPrevious} /* 👈 추가 */
        />
      )}


      {/* ======================================================
          Page 4
      ====================================================== */}

      {currentPage === 4 && (
        <Page4
          videoPreviewUrl={
            videoPreviewUrl
          }

          selectedFile={
            selectedFile
          }

          segments={
            segments
          }

          musicSelectedIds={
            musicSelectedIds
          }

          prompts={
            Object.fromEntries(
              scenePrompts.map(
                (item) => [
                  item.id,
                  item.prompt
                ]
              )
            )
          }

          generatedMusic={
            generatedMusic
          }

          generatingId={
            musicGeneratingId
          }

          isLoading={
            musicGenerationLoading
          }

          error={
            musicGenerationError
          }

          onGenerate={
            handleRegenerateMusic
          }

          onGoHome={
            handleGoHome
          }

          onGoNext={handlePage4Next}
          onGoPrevious={handleGoPrevious} /* 👈 추가 */
        />
      )}


      {/* ======================================================
          Page 5
      ====================================================== */}

      {currentPage === 5 && (
        <Page5
  videoPreviewUrl={videoPreviewUrl}
  generatedMusic={generatedMusic}
  finalVideoUrl={finalVideoUrl}
  finalVideoLoading={finalVideoLoading}
  finalVideoError={finalVideoError}
  onGoHome={handleGoHome}
  segments={segments}
musicSelectedIds={musicSelectedIds}
/>
      )}

    </div>
  );
}

export default App;