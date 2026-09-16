import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import './result.css';

const Result = ({
  selectedFile,
  videoPreviewUrl,
  generatedMusic,
  segments,
  musicSelectedIds,
  vadTimeline = [],
  isLoading,
  error,
  onSave,
  onGoHome
}) => {
  const videoRef = useRef(null);
  const ffmpegRef = useRef(null);
  const resultUrlRef = useRef(null);

  const [resultVideoUrl, setResultVideoUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(
    '최종 영상을 준비하는 중입니다...'
  );

  const loadFFmpeg = async () => {
    if (ffmpegRef.current && ffmpegRef.current.loaded) {
      return ffmpegRef.current;
    }

    if (!ffmpegRef.current) {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
      ffmpegRef.current = ffmpeg;
    }

    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg.loaded) {
      setProcessingMessage('영상 처리 엔진을 불러오는 중입니다...');
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(baseURL + '/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL(baseURL + '/ffmpeg-core.wasm', 'application/wasm')
      });
      console.log('✅ FFmpeg 로드 완료');
    }
    return ffmpeg;
  };

  const getMusicBlob = async (music) => {
    if (!music) throw new Error('음악 데이터가 없습니다.');
    if (music instanceof Blob) return music;
    if (music.blob && music.blob instanceof Blob) return music.blob;

    let url = null;
    if (typeof music === 'string') url = music;
    else if (typeof music.musicUrl === 'string') url = music.musicUrl;
    else if (typeof music.url === 'string') url = music.url;
    else if (typeof music.musicUrl?.url === 'string') url = music.musicUrl.url;

    if (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('생성된 음악을 불러오지 못했습니다.');
      return await response.blob();
    }
    if (music instanceof ArrayBuffer) return new Blob([music], { type: 'audio/wav' });
    throw new Error('음악 파일 형식을 확인할 수 없습니다.');
  };

  // VAD volume 필터 식 
  const buildVadVolumeFilter = (currentMusicStart, currentMusicEnd, vadList) => {
    if (!vadList || vadList.length === 0) return 'volume=1.0';

    const overlappingVad = vadList.filter(
      (v) => v.end > currentMusicStart && v.start < currentMusicEnd
    );

    if (overlappingVad.length === 0) return 'volume=1.0';

    const conditions = overlappingVad.map((v) => {
      const relStart = Math.max(0, v.start - currentMusicStart).toFixed(2);
      const relEnd = Math.min(currentMusicEnd - currentMusicStart, v.end - currentMusicStart).toFixed(2);
      return 'between(t,' + relStart + ',' + relEnd + ')';
    });

    const enableExpr = conditions.join('+');
    return "volume=eval=frame:volume='if(" + enableExpr + ",0.3,1.0)'";
  };

  const composeVideo = useCallback(async () => {
    if (!videoPreviewUrl) throw new Error('원본 동영상이 없습니다.');
    if (!segments || !Array.isArray(segments)) throw new Error('영상 구간 정보가 없습니다.');
    if (!musicSelectedIds || musicSelectedIds.length === 0) throw new Error('음악이 적용될 컷이 없습니다.');
    if (!generatedMusic) throw new Error('생성된 음악 데이터가 없습니다.');

    setIsProcessing(true);
    setPlayError(false);

    try {
      const ffmpeg = await loadFFmpeg();

      setProcessingMessage('원본 영상을 불러오는 중입니다...');
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoPreviewUrl));

      const selectedSegments = segments
        .filter((segment) => musicSelectedIds.map(String).includes(String(segment.id)))
        .sort((a, b) => Number(a.startTime) - Number(b.startTime));

      if (selectedSegments.length === 0) throw new Error('음악을 적용할 구간이 없습니다.');

      setProcessingMessage('생성된 음악을 불러오는 중입니다...');
      const musicFiles = [];

      for (let i = 0; i < selectedSegments.length; i++) {
        const segment = selectedSegments[i];
        const music = generatedMusic[segment.id];

        if (!music) throw new Error('Scene ' + segment.id + '의 음악이 없습니다.');

        const musicBlob = await getMusicBlob(music);
        const fileName = 'music_' + i + '.wav';

        await ffmpeg.writeFile(fileName, await fetchFile(musicBlob));

        const startTime = Number(segment.startTime);
        const endTime = Number(segment.endTime);
        const duration = Math.max(0, endTime - startTime);

        musicFiles.push({ fileName, startTime, endTime, duration });
      }

      setProcessingMessage('VAD 음성 구간 감쇄 및 오디오 배치 중...');
      const filterParts = [];

      filterParts.push('[0:a]volume=1.0[orig_audio]');

      musicFiles.forEach((music, index) => {
        const delay = Math.max(0, Math.round(music.startTime * 1000));
        const duration = Math.max(0.01, music.duration);
        
        // VAD 구간 감쇄 (말소리 구간일 때 음악 음량을 0.1로 확실하게 축소)
        const volumeFilter = buildVadVolumeFilter(music.startTime, music.endTime, vadTimeline).replace('0.3', '0.3');

        filterParts.push(
          '[' + (index + 1) + ':a]' +
            'atrim=0:' + duration + ',' +
            'asetpts=PTS-STARTPTS,' +
            'adelay=' + delay + ':all=1,' +
            volumeFilter +
            '[music' + index + ']'
        );
      });

      const allMusicLabels = musicFiles.map((_, i) => '[' + 'music' + i + ']').join('');
      const mixInputsCount = musicFiles.length + 1;

      // 💡 [안정화] amix 필터 부하 최소화 설정
      const audioFilter =
        '[orig_audio]' + allMusicLabels +
        'amix=inputs=' + mixInputsCount + ':duration=first:normalize=0[finalaudio]';

      filterParts.push(audioFilter);
      const filterComplex = filterParts.join(';');

      setProcessingMessage('최종 영상을 합성하는 중입니다...');

      const args = ['-i', 'input.mp4'];
      musicFiles.forEach((music) => args.push('-i', music.fileName));

      args.push(
        '-filter_complex', filterComplex,
        '-map', '0:v:0?',
        '-map', '[finalaudio]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        'output.mp4' // 💡 moov atom 재배치(-movflags +faststart)를 제거하여 Aborted 에러 원천 차단
      );

      console.log('🎬 FFmpeg 원본+음악 합성 실행:', args);

      const exitCode = await ffmpeg.exec(args);
      if (exitCode !== 0) throw new Error('FFmpeg 영상 합성 실패 (exit code: ' + exitCode + ')');

      setProcessingMessage('최종 영상을 준비하는 중입니다...');

      const outputData = await ffmpeg.readFile('output.mp4');
      const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

      const outputUrl = URL.createObjectURL(outputBlob);
      resultUrlRef.current = outputUrl;
      setResultVideoUrl(outputUrl);

      // 파일 정리 (에러 방지용 try-catch 감싸기)
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('output.mp4');
        for (const music of musicFiles) {
          try { await ffmpeg.deleteFile(music.fileName); } catch (e) {}
        }
      } catch (cleanupError) {
        console.warn('FFmpeg 임시 파일 정리 경고:', cleanupError);
      }

      return outputUrl;
    } finally {
      setIsProcessing(false);
    }
  }, [videoPreviewUrl, generatedMusic, segments, musicSelectedIds, vadTimeline]);
  useEffect(() => {
    let cancelled = false;

    if (resultUrlRef.current || isProcessing) return;

    const startComposition = async () => {
      if (!videoPreviewUrl || !generatedMusic || !segments || !musicSelectedIds || musicSelectedIds.length === 0) return;
      try {
        await composeVideo();
        if (cancelled) return;
      } catch (compositionError) {
        if (cancelled) return;
        console.error('❌ 최종 영상 합성 실패:', compositionError);
      }
    };

    startComposition();
    return () => { cancelled = true; };
  }, [videoPreviewUrl, generatedMusic, segments, musicSelectedIds, composeVideo, isProcessing]);

  useEffect(() => {
    if (!resultVideoUrl || isProcessing) return;
    setPlayError(false);
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = async () => {
      try {
        video.currentTime = 0;
        await video.play();
      } catch (playErr) {
        setPlayError(true);
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    return () => video.removeEventListener('loadeddata', handleLoadedData);
  }, [resultVideoUrl, isProcessing]);

  const handleSave = async () => {
    if (!resultVideoUrl) return;
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(resultVideoUrl);
        return;
      }
      const response = await fetch(resultVideoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scene-to-sound-result.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (saveError) {
      alert('동영상 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoHome = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setResultVideoUrl(null);
    if (onGoHome) onGoHome();
  };

  return React.createElement(
    'div',
    { className: 'result-container' },
    React.createElement('h2', { className: 'result-title' }, '🎬 최종 결과물'),
    React.createElement(
      'p',
      { className: 'result-description' },
      isLoading || isProcessing
        ? processingMessage
        : error
        ? '최종 영상 생성 중 오류가 발생했습니다.'
        : '음악과 VAD 음량 조절이 완료된 최종 영상입니다.'
    ),
    React.createElement(
      'div',
      { className: 'result-video-wrapper' },
      isLoading || isProcessing
        ? React.createElement(
            'div',
            { className: 'no-result' },
            React.createElement('div', { className: 'result-loading-spinner' }),
            React.createElement('div', null, '최종 영상을 만드는 중입니다...')
          )
        : error
        ? React.createElement(
            'div',
            { className: 'no-result' },
            React.createElement('div', null, '❌ 최종 영상 생성 실패'),
            React.createElement('div', null, error)
          )
        : resultVideoUrl
        ? React.createElement(
            'div',
            null,
            React.createElement('video', {
              ref: videoRef,
              className: 'result-video',
              src: resultVideoUrl,
              controls: true,
              autoPlay: true,
              playsInline: true
            })
          )
        : React.createElement('div', { className: 'no-result' }, '합성 중입니다.')
    ),
    React.createElement(
      'div',
      { className: 'result-button-container' },
      React.createElement(
        'button',
        {
          className: 'save-result-btn',
          onClick: handleSave,
          disabled: isLoading || isProcessing || !resultVideoUrl || isSaving
        },
        isSaving ? '저장 중...' : '💾 저장하기'
      ),
      React.createElement(
        'button',
        {
          className: 'home-result-btn',
          onClick: handleGoHome,
          disabled: isSaving
        },
        '🏠 처음으로'
      )
    )
  );
};

export default Result;