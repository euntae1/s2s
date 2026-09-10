import React, {
  useState
} from 'react';

import './result.css';

const Result = ({
  videoPreviewUrl,
  generatedMusic,
  onGoHome
}) => {
  const [isProcessing, setIsProcessing] =
    useState(false);

  // 최종 영상 저장
  const handleSave = async () => {
    if (!videoPreviewUrl) {
      alert(
        '저장할 동영상이 없습니다.'
      );

      return;
    }

    setIsProcessing(true);

    try {
      /*
       * 실제 최종 영상 합성 API 연결 부분
       *
       * 현재는 원본 영상을 다운로드하는
       * 임시 동작으로 구성.
       *
       * 나중에는 서버에서
       *
       * 원본 영상
       * +
       * 각 컷의 음악
       * ↓
       * 최종 합성 영상
       *
       * 을 만들어서 반환하면 됨.
       */

      const response =
        await fetch(
          videoPreviewUrl
        );

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href = url;
      link.download =
        'scene-to-sound-result.mp4';

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      window.URL.revokeObjectURL(
        url
      );

    } catch (error) {
      console.error(
        'Video save failed:',
        error
      );

      alert(
        '동영상 저장 중 오류가 발생했습니다.'
      );

    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="result-container">

      <h2 className="result-title">
        🎬 최종 결과물
      </h2>

      <p className="result-description">
        음악이 적용된 최종 영상을 확인하세요.
      </p>

      {/* 최종 결과 영상 */}
      <div className="result-video-wrapper">

        {videoPreviewUrl ? (
          <video
            className="result-video"
            src={videoPreviewUrl}
            controls
          />
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
          disabled={isProcessing}
        >
          {isProcessing
            ? '저장 중...'
            : '💾 저장하기'}
        </button>

        <button
          className="home-result-btn"
          onClick={onGoHome}
          disabled={isProcessing}
        >
          🏠 처음으로
        </button>

      </div>

    </div>
  );
};

export default Result;