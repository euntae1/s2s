import React, { useState } from 'react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ============================================================
  // Page 2
  // ============================================================
  const [page2Loading, setPage2Loading] = useState(false);
  const [page2InferenceTime, setPage2InferenceTime] = useState(null);
  const [page2Error, setPage2Error] = useState(null);
  const [segments, setSegments] = useState([]);
  const [musicSelectedIds, setMusicSelectedIds] = useState([]);

  // ============================================================
  // Page 3
  // ============================================================
  const [page3Loading, setPage3Loading] = useState(false);
  const [page3InferenceTime, setPage3InferenceTime] = useState(null);
  const [page3Error, setPage3Error] = useState(null);
  const [scenePrompts, setScenePrompts] = useState([]);

  // ============================================================
  // Page 4 음악 생성 상태
  // ============================================================
  const [generatedMusic, setGeneratedMusic] = useState({});
  const [musicGeneratingId, setMusicGeneratingId] = useState(null);
  const [musicGenerationLoading, setMusicGenerationLoading] = useState(false);
  const [musicGenerationError, setMusicGenerationError] = useState(null);

  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [finalVideoLoading, setFinalVideoLoading] = useState(false);
  const [finalVideoError, setFinalVideoError] = useState('');

  // ============================================================
  // Page 1 → Page 2
  // ============================================================
  const handleGoNext = async (previewUrl, file) => {
    if (!file) return;

    console.log('🎬 컷 분할 분석 시작');
    setVideoPreviewUrl(previewUrl);
    setSelectedFile(file);

    setPage2Loading(true);
    setPage2InferenceTime(null);
    setPage2Error(null);
    setSegments([]);
    setMusicSelectedIds([]);

    setCurrentPage(2);

    try {
      const startTime = performance.now();
      const result = await analyzeVideoCuts(file);
      const endTime = performance.now();
      const elapsedTime = Number(((endTime - startTime) / 1000).toFixed(2));

      console.log('✂️ 컷 분할 결과:', result);
      console.log(`⏱️ 실제 소요 시간: ${elapsedTime}초`);

      const newSegments = (result.timelogs || []).map((item) => ({
        id: String(item.id),
        startTime: item.startTime,
        endTime: item.endTime
      }));

      setSegments(newSegments);
      // 백엔드 추론시간(result.inferenceTime) 대신 클라이언트 실제 소요시간 전달
      setPage2InferenceTime(elapsedTime);
    } catch (error) {
      console.error('❌ 컷 분할 실패:', error);
      setPage2Error(error.message || '컷 분할에 실패했습니다.');
    } finally {
      setPage2Loading(false);
    }
  };

  // ============================================================
  // Page 2 → Page 3
  // ============================================================
  const handlePage2Next = async ({
    segments: currentSegments,
    musicSelectedIds: currentMusicSelectedIds
  }) => {
    if (!selectedFile) {
      setPage3Error('분석할 동영상 파일이 없습니다.');
      setCurrentPage(3);
      return;
    }

    console.log('🎵 Page 2 → Page 3');
    setSegments(currentSegments);
    setMusicSelectedIds(currentMusicSelectedIds);

    const timelogs = currentSegments.map((segment) => ({
      id: String(segment.id),
      startTime: segment.startTime,
      endTime: segment.endTime,
      musicSelected: currentMusicSelectedIds.map(String).includes(String(segment.id))
    }));

    setPage3Loading(true);
    setPage3InferenceTime(null);
    setPage3Error(null);
    setScenePrompts([]);

    setCurrentPage(3);

    try {
      const startTime = performance.now();
      const result = await generateScenePrompts(selectedFile, timelogs);
      const endTime = performance.now();
      const elapsedTime = Number(((endTime - startTime) / 1000).toFixed(2));

      console.log(`⏱️ 실제 Gemini 소요 시간: ${elapsedTime}초`);

      const mappedPrompts = (result.timelogs || []).map((item, index) => {
        const targetLog = timelogs[index];
        return {
          ...item,
          id: targetLog ? String(targetLog.id) : String(item.id),
          startTime: targetLog ? targetLog.startTime : item.startTime,
          endTime: targetLog ? targetLog.endTime : item.endTime,
          prompt: item.prompt || item.text || ''
        };
      });

      setScenePrompts(mappedPrompts);
      // 백엔드 추론시간 대신 클라이언트 실제 소요시간 전달
      setPage3InferenceTime(elapsedTime);
    } catch (error) {
      console.error('❌ Gemini 프롬프트 생성 실패:', error);
      setPage3Error(error.message || 'Gemini 프롬프트 생성에 실패했습니다.');
    } finally {
      setPage3Loading(false);
    }
  };

  // ============================================================
  // Page 3 → Page 4
  // ============================================================
  const handlePage3Next = async (editedPrompts) => {
    if (!editedPrompts) return;

    setScenePrompts((prevPrompts) =>
      prevPrompts.map((item) => ({
        ...item,
        prompt: editedPrompts[item.id] !== undefined ? editedPrompts[item.id] : item.prompt
      }))
    );

    const musicSegments = segments.filter((segment) =>
      musicSelectedIds.map(String).includes(String(segment.id))
    );

    if (musicSegments.length === 0) {
      alert('음악 생성 대상 컷이 없습니다.');
      return;
    }

    setMusicGenerationLoading(true);
    setMusicGenerationError(null);
    setGeneratedMusic({});

    setCurrentPage(4);

    try {
      for (const segment of musicSegments) {
        const prompt = editedPrompts[segment.id];

        if (!prompt || !prompt.trim()) continue;

        const duration = Number(segment.endTime) - Number(segment.startTime);

        setMusicGeneratingId(segment.id);

        const result = await generateMusic(prompt, duration);

        setGeneratedMusic((prev) => ({
          ...prev,
          [segment.id]: {
            url: result.musicUrl,
            blob: result.blob
          }
        }));
      }
    } catch (error) {
      console.error('❌ 음악 생성 실패:', error);
      setMusicGenerationError(error.message || '음악 생성 중 오류가 발생했습니다.');
      alert('음악 생성 중 오류가 발생했습니다.');
    } finally {
      setMusicGeneratingId(null);
      setMusicGenerationLoading(false);
    }
  };

  const handlePage4Next = () => {
    if (!selectedFile) {
      alert('원본 동영상이 없습니다.');
      return;
    }

    if (!musicSelectedIds || musicSelectedIds.length === 0) {
      alert('음악을 생성할 컷이 없습니다.');
      return;
    }

    const missingMusic = musicSelectedIds.filter((id) => !generatedMusic[id]);

    if (missingMusic.length > 0) {
      alert('모든 컷의 음악이 생성될 때까지 기다려 주세요.');
      return;
    }

    setFinalVideoUrl(null);
    setFinalVideoError('');
    setFinalVideoLoading(true);

    setCurrentPage(5);
  };

  // ============================================================
  // Page 4 음악 재생성
  // ============================================================
  const handleRegenerateMusic = async (segmentId) => {
    if (musicGeneratingId !== null) return;

    const segment = segments.find((item) => String(item.id) === String(segmentId));
    if (!segment) return;

    const prompt = scenePrompts.find((item) => String(item.id) === String(segmentId))?.prompt;

    if (!prompt || !prompt.trim()) {
      alert('음악 생성 Prompt가 없습니다.');
      return;
    }

    const duration = Number(segment.endTime) - Number(segment.startTime);

    setMusicGeneratingId(segmentId);
    setMusicGenerationError(null);

    try {
      const result = await generateMusic(prompt, duration);

      setGeneratedMusic((prev) => {
        if (prev[segmentId]?.url) {
          URL.revokeObjectURL(prev[segmentId].url);
        }
        return {
          ...prev,
          [segmentId]: {
            url: result.musicUrl,
            blob: result.blob
          }
        };
      });
    } catch (error) {
      console.error('❌ 음악 재생성 실패:', error);
      setMusicGenerationError(error.message || '음악 재생성 중 오류가 발생했습니다.');
      alert('음악 재생성 중 오류가 발생했습니다.');
    } finally {
      setMusicGeneratingId(null);
    }
  };

  const handleGoHome = () => setCurrentPage(1);
  const handleGoPrevious = () => setCurrentPage((prev) => Math.max(1, prev - 1));

  return (
    <div className="app">
      <Header onGoHome={handleGoHome} />

      {currentPage === 1 && (
        <Page1 onNext={handleGoNext} />
      )}

      {currentPage === 2 && (
        <Page2
          videoPreviewUrl={videoPreviewUrl}
          selectedFile={selectedFile}
          initialSegments={segments}
          initialMusicSelectedIds={musicSelectedIds}
          isLoading={page2Loading}
          inferenceTime={page2InferenceTime}
          error={page2Error}
          onGoNext={handlePage2Next}
          onGoPrevious={handleGoPrevious}
        />
      )}

      {currentPage === 3 && (
        <Page3
          videoPreviewUrl={videoPreviewUrl}
          selectedFile={selectedFile}
          segments={segments}
          musicSelectedIds={musicSelectedIds}
          scenePrompts={scenePrompts}
          isLoading={page3Loading}
          inferenceTime={page3InferenceTime}
          error={page3Error}
          onGoNext={handlePage3Next}
          onGoHome={handleGoHome}
          onGoPrevious={handleGoPrevious}
        />
      )}

      {currentPage === 4 && (
        <Page4
          videoPreviewUrl={videoPreviewUrl}
          selectedFile={selectedFile}
          segments={segments}
          musicSelectedIds={musicSelectedIds}
          prompts={Object.fromEntries(
            scenePrompts.map((item) => [item.id, item.prompt])
          )}
          generatedMusic={generatedMusic}
          generatingId={musicGeneratingId}
          isLoading={musicGenerationLoading}
          error={musicGenerationError}
          onGenerate={handleRegenerateMusic}
          onGoHome={handleGoHome}
          onGoNext={handlePage4Next}
          onGoPrevious={handleGoPrevious}
        />
      )}

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