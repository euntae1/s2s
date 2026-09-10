import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  FFmpeg
} from '@ffmpeg/ffmpeg';

import {
  fetchFile,
  toBlobURL
} from '@ffmpeg/util';

import './result.css';


const Result = ({
  videoPreviewUrl,
  generatedMusic,
  segments,
  musicSelectedIds,
  isLoading,
  error,
  onSave,
  onGoHome
}) => {

  const videoRef = useRef(null);

  const ffmpegRef = useRef(null);

  const resultUrlRef = useRef(null);

  const [resultVideoUrl, setResultVideoUrl] =
    useState(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [playError, setPlayError] =
    useState(false);

  const [processingMessage, setProcessingMessage] =
    useState('최종 영상을 준비하는 중입니다...');


  /*
   * FFmpeg 초기화
   */
  const loadFFmpeg = async () => {

    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }

    const ffmpeg =
      new FFmpeg();

    ffmpeg.on(
      'log',
      ({ message }) => {

        console.log(
          '[FFmpeg]',
          message
        );

      }
    );

    ffmpegRef.current =
      ffmpeg;

    setProcessingMessage(
      '영상 처리 엔진을 불러오는 중입니다...'
    );

    const baseURL =
      'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

    await ffmpeg.load({

      coreURL:
        await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          'text/javascript'
        ),

      wasmURL:
        await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          'application/wasm'
        )

    });

    console.log(
      '✅ FFmpeg 로드 완료'
    );

    return ffmpeg;
  };


  /*
   * 음악 Blob 가져오기
   */
  const getMusicBlob = async (
    music
  ) => {

    if (!music) {
      throw new Error(
        '음악 데이터가 없습니다.'
      );
    }


    /*
     * generatedMusic[id]가
     *
     * {
     *   blob,
     *   musicUrl
     * }
     *
     * 형태인 경우
     */

    if (music.blob) {

      return music.blob;

    }


    /*
     * URL만 존재하는 경우
     */

    if (music.musicUrl) {

      const response =
        await fetch(
          music.musicUrl
        );

      if (!response.ok) {

        throw new Error(
          '생성된 음악을 불러오지 못했습니다.'
        );

      }

      return await response.blob();

    }


    /*
     * url이라는 이름을 사용하는 경우
     */

    if (music.url) {

      const response =
        await fetch(
          music.url
        );

      if (!response.ok) {

        throw new Error(
          '생성된 음악을 불러오지 못했습니다.'
        );

      }

      return await response.blob();

    }


    /*
     * generatedMusic[id] 자체가
     * Blob인 경우
     */

    if (music instanceof Blob) {

      return music;

    }


    throw new Error(
      '음악 파일 형식을 확인할 수 없습니다.'
    );
  };


  /*
   * 최종 영상 합성
   */
const composeVideo = useCallback(async () => {
    if (!videoPreviewUrl) {

      throw new Error(
        '원본 동영상이 없습니다.'
      );

    }


    if (
      !segments ||
      !Array.isArray(segments)
    ) {

      throw new Error(
        '영상 구간 정보가 없습니다.'
      );

    }


    if (
      !musicSelectedIds ||
      musicSelectedIds.length === 0
    ) {

      throw new Error(
        '음악이 적용될 컷이 없습니다.'
      );

    }


    if (!generatedMusic) {

      throw new Error(
        '생성된 음악 데이터가 없습니다.'
      );

    }


    setIsProcessing(true);

    setPlayError(false);

    try {

      /*
       * FFmpeg 로드
       */

      const ffmpeg =
        await loadFFmpeg();


      /*
       * 원본 영상 저장
       */

      setProcessingMessage(
        '원본 영상을 불러오는 중입니다...'
      );

      await ffmpeg.writeFile(
        'input.mp4',
        await fetchFile(
          videoPreviewUrl
        )
      );


      /*
       * 음악이 적용되는 구간 정렬
       */

      const selectedSegments =
        segments
          .filter(
            (segment) =>
              musicSelectedIds.includes(
                segment.id
              )
          )
          .sort(
            (a, b) =>
              Number(a.startTime) -
              Number(b.startTime)
          );


      if (
        selectedSegments.length === 0
      ) {

        throw new Error(
          '음악을 적용할 구간이 없습니다.'
        );

      }


      console.log(
        '🎵 음악 적용 구간:',
        selectedSegments
      );


      /*
       * 음악 파일 저장
       */

      setProcessingMessage(
        '생성된 음악을 불러오는 중입니다...'
      );


      const musicFiles = [];


      for (
        let i = 0;
        i < selectedSegments.length;
        i++
      ) {

        const segment =
          selectedSegments[i];

        const music =
          generatedMusic[
            segment.id
          ];


        if (!music) {

          throw new Error(
            `Scene ${segment.id}의 음악이 없습니다.`
          );

        }


        const musicBlob =
          await getMusicBlob(
            music
          );


        const fileName =
          `music_${i}.wav`;


        await ffmpeg.writeFile(
          fileName,
          await fetchFile(
            musicBlob
          )
        );


        const startTime =
          Number(
            segment.startTime
          );

        const endTime =
          Number(
            segment.endTime
          );

        const duration =
          Math.max(
            0,
            endTime - startTime
          );


        musicFiles.push({

          fileName,

          startTime,

          duration

        });


        console.log(
          `🎵 Scene ${segment.id}`,
          `${startTime}s ~ ${endTime}s`,
          `(${duration}s)`
        );

      }


      /*
       * FFmpeg filter 생성
       *
       * 각 음악을
       *
       * 0초부터 재생하는 것이 아니라
       *
       * 해당 Scene의 startTime에 맞춰
       * delay를 적용한다.
       */

      setProcessingMessage(
        '장면별 음악을 영상에 배치하는 중입니다...'
      );


      const filterParts = [];


      musicFiles.forEach(
        (
          music,
          index
        ) => {

          const delay =
            Math.max(
              0,
              Math.round(
                music.startTime * 1000
              )
            );


          const duration =
            Math.max(
              0.01,
              music.duration
            );


          filterParts.push(
            `[${index + 1}:a]` +
            `atrim=0:${duration},` +
            `asetpts=PTS-STARTPTS,` +
            `adelay=${delay}:all=1,` +
            `volume=0.8` +
            `[music${index}]`
          );

        }
      );


      /*
       * 원본 영상의 기존 오디오는 유지하면서
       * 생성 음악을 믹싱한다.
       *
       * 원본 영상에 오디오가 없는 경우를
       * 고려해서 먼저 시도한다.
       */

      const musicLabels =
        musicFiles
          .map(
            (_, index) =>
              `[music${index}]`
          )
          .join('');


      const mixInputs =
        `[0:a]` +
        musicLabels;


      const audioFilter =
        `${mixInputs}` +
        `amix=inputs=${musicFiles.length + 1}:` +
        `duration=longest:` +
        `dropout_transition=0:` +
        `normalize=0,` +
        `alimiter=limit=0.95` +
        `[finalaudio]`;


      filterParts.push(
        audioFilter
      );


      const filterComplex =
        filterParts.join(';');


      console.log(
        '🎬 FFmpeg filter:',
        filterComplex
      );


      /*
       * 최종 영상 생성
       */

      setProcessingMessage(
        '최종 영상을 합성하는 중입니다...'
      );


      const args = [

        '-i',
        'input.mp4'

      ];


      /*
       * 음악 입력 추가
       */

      musicFiles.forEach(
        (music) => {

          args.push(
            '-i',
            music.fileName
          );

        }
      );


      args.push(

        '-filter_complex',
        filterComplex,

        '-map',
        '0:v:0',

        '-map',
        '[finalaudio]',

        '-c:v',
        'copy',

        '-c:a',
        'aac',

        '-b:a',
        '192k',

        '-shortest',

        '-movflags',
        '+faststart',

        'output.mp4'

      );


      console.log(
        '🎬 FFmpeg 실행:',
        args
      );


      const exitCode =
        await ffmpeg.exec(
          args
        );


      if (exitCode !== 0) {

        throw new Error(
          `FFmpeg 영상 합성 실패 (exit code: ${exitCode})`
        );

      }


      /*
       * 결과 파일 읽기
       */

      setProcessingMessage(
        '최종 영상을 준비하는 중입니다...'
      );


      const outputData =
        await ffmpeg.readFile(
          'output.mp4'
        );


      const outputBlob =
        new Blob(
          [outputData.buffer],
          {
            type:
              'video/mp4'
          }
        );


      /*
       * 기존 결과 URL 제거
       */

      if (
        resultUrlRef.current
      ) {

        URL.revokeObjectURL(
          resultUrlRef.current
        );

      }


      const outputUrl =
        URL.createObjectURL(
          outputBlob
        );


      resultUrlRef.current =
        outputUrl;


      setResultVideoUrl(
        outputUrl
      );


      console.log(
        '✅ 최종 영상 생성 완료'
      );

      console.log(
        '📦 최종 영상 크기:',
        `${(
          outputBlob.size /
          1024 /
          1024
        ).toFixed(2)} MB`
      );


      /*
       * FFmpeg 임시 파일 삭제
       */

      try {

        await ffmpeg.deleteFile(
          'input.mp4'
        );

        await ffmpeg.deleteFile(
          'output.mp4'
        );


        for (
          const music of musicFiles
        ) {

          await ffmpeg.deleteFile(
            music.fileName
          );

        }

      } catch (
        cleanupError
      ) {

        console.warn(
          'FFmpeg 임시 파일 삭제 실패:',
          cleanupError
        );

      }


      return outputUrl;

      } finally {

    setIsProcessing(false);

  }

}, [
  videoPreviewUrl,
  generatedMusic,
  segments,
  musicSelectedIds
]);


  /*
   * Page 5 진입 후
   * 최종 영상 자동 합성
   */
useEffect(() => {

  let cancelled = false;

  const startComposition = async () => {

    if (
      !videoPreviewUrl ||
      !generatedMusic ||
      !segments ||
      !musicSelectedIds ||
      musicSelectedIds.length === 0
    ) {
      return;
    }

    if (
      resultUrlRef.current
    ) {
      return;
    }

    try {

      await composeVideo();

      if (cancelled) {
        return;
      }

    } catch (compositionError) {

      if (cancelled) {
        return;
      }

      console.error(
        '❌ 최종 영상 합성 실패:',
        compositionError
      );

    }

  };

  startComposition();

  return () => {

    cancelled = true;

  };

}, [
  videoPreviewUrl,
  generatedMusic,
  segments,
  musicSelectedIds,
  composeVideo
]);

  /*
   * 최종 영상 자동 재생
   */

  useEffect(() => {

    if (
      !resultVideoUrl ||
      isProcessing
    ) {

      return;

    }


    setPlayError(false);


    const video =
      videoRef.current;


    if (!video) {

      return;

    }


    const handleLoadedData =
      async () => {

        try {

          video.currentTime = 0;

          await video.play();

          console.log(
            '▶️ 최종 영상 자동 재생 시작'
          );

        } catch (
          playError
        ) {

          console.warn(
            '자동 재생이 차단되었습니다:',
            playError
          );

          setPlayError(true);

        }

      };


    video.addEventListener(
      'loadeddata',
      handleLoadedData
    );


    return () => {

      video.removeEventListener(
        'loadeddata',
        handleLoadedData
      );

    };

  }, [
    resultVideoUrl,
    isProcessing
  ]);


  /*
   * 최종 영상 저장
   */

  const handleSave = async () => {

    if (!resultVideoUrl) {

      alert(
        '저장할 최종 동영상이 없습니다.'
      );

      return;

    }


    setIsSaving(true);


    try {

      /*
       * App.js에서 저장 함수를
       * 전달한 경우 사용
       */

      if (onSave) {

        await onSave(
          resultVideoUrl
        );

        return;

      }


      /*
       * 기본 다운로드
       */

      const response =
        await fetch(
          resultVideoUrl
        );


      if (!response.ok) {

        throw new Error(
          '최종 영상을 불러오지 못했습니다.'
        );

      }


      const blob =
        await response.blob();


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          'a'
        );


      link.href =
        url;

      link.download =
        'scene-to-sound-result.mp4';


      document.body.appendChild(
        link
      );


      link.click();


      document.body.removeChild(
        link
      );


      URL.revokeObjectURL(
        url
      );


      console.log(
        '💾 최종 영상 저장 완료'
      );

    } catch (
      saveError
    ) {

      console.error(
        'Video save failed:',
        saveError
      );


      alert(
        '동영상 저장 중 오류가 발생했습니다.'
      );

    } finally {

      setIsSaving(false);

    }

  };


  /*
   * 처음으로
   */

  const handleGoHome = () => {

    if (
      isProcessing
    ) {

      const confirmed =
        window.confirm(
          '현재 최종 영상을 만드는 중입니다. 처음으로 돌아가시겠습니까?'
        );


      if (!confirmed) {

        return;

      }

    }


    if (
      resultUrlRef.current
    ) {

      URL.revokeObjectURL(
        resultUrlRef.current
      );

      resultUrlRef.current =
        null;

    }


    setResultVideoUrl(
      null
    );


    if (onGoHome) {

      onGoHome();

    }

  };


  /*
   * 컴포넌트 종료 시
   * Object URL 정리
   */

  useEffect(() => {

    return () => {

      if (
        resultUrlRef.current
      ) {

        URL.revokeObjectURL(
          resultUrlRef.current
        );

        resultUrlRef.current =
          null;

      }

    };

  }, []);


  const showingLoading =
    isLoading ||
    isProcessing;


  const showingError =
    !!error;


  return (
    <div className="result-container">

      <h2 className="result-title">
        🎬 최종 결과물
      </h2>


      <p className="result-description">

        {showingLoading

          ? processingMessage

          : showingError

          ? '최종 영상 생성 중 오류가 발생했습니다.'

          : '음악이 적용된 최종 영상을 확인하세요.'

        }

      </p>


      {/* 최종 영상 */}

      <div className="result-video-wrapper">

        {showingLoading ? (

          <div className="no-result">

            <div
              className="result-loading-spinner"
            />

            <div>
              최종 영상을 만드는 중입니다...
            </div>

            <div>
              잠시만 기다려 주세요.
            </div>

          </div>

        ) : showingError ? (

          <div className="no-result">

            <div>
              ❌ 최종 영상 생성 실패
            </div>

            <div>
              {error}
            </div>

          </div>

        ) : resultVideoUrl ? (

          <div>

            <video
              ref={videoRef}
              className="result-video"
              src={resultVideoUrl}
              controls
              autoPlay
              playsInline
              preload="auto"
            />

            {playError && (

              <p
                className="result-play-message"
              >
                ▶ 자동 재생이 차단되었습니다.
                재생 버튼을 눌러 영상을 시작해주세요.
              </p>

            )}

          </div>

        ) : (

          <div className="no-result">

            최종 결과물이 없습니다.

          </div>

        )}

      </div>


      {/* 버튼 */}

      <div className="result-button-container">

        <button
          className="save-result-btn"
          onClick={handleSave}
          disabled={
            showingLoading ||
            showingError ||
            !resultVideoUrl ||
            isSaving
          }
        >

          {isSaving

            ? '저장 중...'

            : '💾 저장하기'

          }

        </button>


        <button
          className="home-result-btn"
          onClick={handleGoHome}
          disabled={
            isSaving
          }
        >

          🏠 처음으로

        </button>

      </div>

    </div>
  );
};

export default Result;