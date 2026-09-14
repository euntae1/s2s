import React, { useState, useEffect } from 'react';
import './upload_video.css';

const UploadVideo = ({ onNext, initialPreviewUrl = '', videoRef }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPreviewUrl(initialPreviewUrl);
  }, [initialPreviewUrl]);

  // ------------------------------------------------------------
  // 순수 브라우저 API(Canvas + MediaRecorder) 기반 동영상 압축 (480p, 15fps)
  // ------------------------------------------------------------
  const compressVideoWithCanvas = (file) => {
    return new Promise((resolve, reject) => {
      setIsCompressing(true);
      setProgress(0);

      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        // 480p 해상도 스케일링 계산
        const targetWidth = 480;
        const scale = targetWidth / video.videoWidth;
        const targetHeight = Math.round(video.videoHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Canvas 스트림 추출 (15 fps 설정)
        const stream = canvas.captureStream(15);
        
        let mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/mp4';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 500000 // 500kbps (분석용 경량화)
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const compressedFileObj = new File(
            [blob],
            `compressed_\({file.name.replace(/\.[^/.]+\)/, '')}.${mimeType === 'video/webm' ? 'webm' : 'mp4'}`,
            { type: mimeType }
          );
          
          setIsCompressing(false);
          setProgress(100);
          console.log(`✅ 브라우저 압축 완료: \({(file.size / 1024 / 1024).toFixed(2)}MB ->\){(compressedFileObj.size / 1024 / 1024).toFixed(2)}MB`);
          resolve(compressedFileObj);
        };

        // 비디오 재생 시작 및 프레임 렌더링
        video.play().then(() => {
          recorder.start();

          const processFrame = () => {
            if (video.ended || video.paused) {
              if (recorder.state !== 'inactive') recorder.stop();
              return;
            }

            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            
            const currentProgress = Math.min(
              100,
              Math.round((video.currentTime / video.duration) * 100)
            );
            setProgress(isNaN(currentProgress) ? 0 : currentProgress);

            requestAnimationFrame(processFrame);
          };

          processFrame();
        }).catch((err) => {
          setIsCompressing(false);
          reject(err);
        });
      };

      video.onerror = (err) => {
        setIsCompressing(false);
        reject(err);
      };
    });
  };

  // ------------------------------------------------------------
  // 파일 처리 및 압축 트리거
  // ------------------------------------------------------------
  const processFile = async (file) => {
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setCompressedFile(null);

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      try {
        const compressed = await compressVideoWithCanvas(file);
        setCompressedFile(compressed);
      } catch (error) {
        console.error('⚠️ Canvas 압축 실패, 원본 파일 사용:', error);
        setCompressedFile(file);
        setIsCompressing(false);
      }
    } else {
      alert('동영상 파일(.mp4, .mov 등)만 업로드 가능합니다.');
    }
  };

  // ------------------------------------------------------------
  // 이벤트 핸들러
  // ------------------------------------------------------------
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // ------------------------------------------------------------
  // 업로드 / 다음 단계 진행
  // ------------------------------------------------------------
  const handleUpload = () => {
    if (isCompressing) return;

    if (!selectedFile && !previewUrl) {
      alert('업로드할 동영상을 선택해 주세요.');
      return;
    }

    const finalFile = compressedFile || selectedFile;

    if (!finalFile) {
      alert('분석할 동영상 파일을 다시 선택해 주세요.');
      return;
    }

    if (onNext) {
      onNext(previewUrl, finalFile);
    }
  };

  // ------------------------------------------------------------
  // 렌더링
  // ------------------------------------------------------------
  return (
    <div className="upload-box-container">
      <div
        className={`upload-box ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="preview-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="video-preview"
            />
            {isCompressing && (
              <div
                className="compression-overlay"
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '8px',
                  zIndex: 10
                }}
              >
                <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>업로드 중...</p>
                <div
                  style={{
                    width: '70%',
                    height: '10px',
                    backgroundColor: '#444',
                    borderRadius: '5px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      backgroundColor: '#4f46e5',
                      transition: 'width 0.2s'
                    }}
                  />
                </div>
                <span style={{ marginTop: '6px', fontSize: '14px' }}>{progress}%</span>
              </div>
            )}
          </div>
        ) : (
          <label htmlFor="video-input" className="upload-label">
            <div className="upload-icon">📹</div>
            <p className="upload-text">동영상 파일을 이곳에 드래그하거나</p>
            <span className="upload-browse-btn">파일 찾기</span>
          </label>
        )}

        <input
          id="video-input"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {onNext && (
        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={isCompressing}
          style={{
            opacity: isCompressing ? 0.5 : 1,
            cursor: isCompressing ? 'not-allowed' : 'pointer',
            backgroundColor: isCompressing ? '#888' : undefined
          }}
        >
          {isCompressing ? `업로드 중... (${progress}%)` : '음악 생성 시작하기'}
        </button>
      )}
    </div>
  );
};

export default UploadVideo;