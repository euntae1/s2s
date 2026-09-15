import React, { useRef } from 'react';

import UploadVideo from '../component/upload_video';
import Music from '../component/music';
import Voice from '../component/voice';

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
  onGoHome,
  onGoPrevious,
  onVadComplete
}) => {
  const videoRef = useRef(null);

  const handleSegmentClick = (startTime) => {
    const video = videoRef.current;
    if (!video) return;

    const targetTime = Math.max(0, Number(startTime) - 1);
    video.currentTime = targetTime;
    video.play().catch((err) => console.log('Video play failed:', err));
  };

  const musicSegments = segments.filter((segment) =>
    musicSelectedIds.includes(segment.id)
  );

  const handleNextStep = () => {
    if (musicSegments.length === 0) {
      alert('음악 생성 대상 컷이 없습니다.');
      return;
    }

    const notGenerated = musicSegments.filter((segment) => {
      const rawMusic = generatedMusic[segment.id];
      const musicUrl =
        typeof rawMusic === 'string'
          ? rawMusic
          : rawMusic?.musicUrl || rawMusic?.url || null;
      return !musicUrl;
    });

    if (notGenerated.length > 0) {
      alert('모든 컷의 음악이 생성될 때까지 기다려 주세요.');
      return;
    }

    onGoNext(generatedMusic);
  };

  // Pure React.createElement (HTML 태그 기호 미사용으로 깨짐 현상 원천 차단)
  return React.createElement(
    'div',
    { className: 'page-container' },
    React.createElement(
      'main',
      { className: 'content-container' },
      React.createElement(
        'section',
        { className: 'left-section' },
        React.createElement(UploadVideo, {
          videoRef: videoRef,
          initialPreviewUrl: videoPreviewUrl,
          selectedFile: selectedFile
        }),
        React.createElement(Voice, {
          selectedFile: selectedFile,
          videoPreviewUrl: videoPreviewUrl,
          onVadComplete: onVadComplete
        })
      ),
      React.createElement(
        'section',
        { className: 'right-section' },
        React.createElement(
          'div',
          { className: 'music-section' },
          React.createElement(
            'div',
            { className: 'music-section-header' },
            React.createElement('h3', { className: 'music-section-title' }, '🎵 음악 생성'),
            React.createElement(
              'p',
              { className: 'music-section-description' },
              '컷과 Prompt를 확인하고 생성된 음악을 확인하세요.'
            )
          ),
          isLoading &&
            React.createElement(
              'div',
              { className: 'music-loading' },
              React.createElement('div', null, '🎵 음악 생성 중...'),
              React.createElement('div', null, '잠시만 기다려 주세요.')
            ),
          error && React.createElement('div', { className: 'music-error' }, error),
          React.createElement(
            'div',
            { className: 'music-list' },
            musicSegments.length === 0
              ? React.createElement(
                  'div',
                  { className: 'empty-music' },
                  '음악 생성 대상으로 선택된 컷이 없습니다.'
                )
              : musicSegments.map((segment) => {
                  const rawMusic = generatedMusic[segment.id];
                  const musicUrl =
                    typeof rawMusic === 'string'
                      ? rawMusic
                      : rawMusic?.musicUrl || rawMusic?.url || null;

                  const prompt = prompts[segment.id] || '';
                  const isGenerating = generatingId === segment.id;
                  const hasMusic = Boolean(musicUrl);

                  return React.createElement(
                    'div',
                    {
                      key: segment.id,
                      onClick: () => handleSegmentClick(segment.startTime)
                    },
                    React.createElement(Music, {
                      segment: segment,
                      prompt: prompt,
                      isGenerating: isGenerating,
                      hasMusic: hasMusic,
                      musicUrl: musicUrl,
                      onGenerate: onGenerate
                    })
                  );
                })
          )
        ),
        React.createElement(
          'div',
          { className: 'step-button-container' },
          React.createElement(
            'button',
            {
              className: 'previous-step-btn',
              onClick: onGoPrevious,
              disabled: generatingId !== null
            },
            '← 이전 단계'
          ),
          React.createElement(
            'button',
            {
              className: 'next-step-btn',
              onClick: handleNextStep,
              disabled: isLoading || generatingId !== null
            },
            '다음 단계 →'
          )
        )
      )
    )
  );
};

export default Page4;