import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import './upload_video.css';

const UploadVideo = ({ onNext, initialPreviewUrl = '', videoRef }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPreviewUrl(initialPreviewUrl);
  }, [initialPreviewUrl]);

  // 비디오를 0.5초 간격 정밀 이미지 프레임으로 추출하여 ZIP 바이너리로 반환
  const extractFramesToZip = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        try {
          const targetWidth = 480;
          const scale = targetWidth / video.videoWidth;
          const targetHeight = Math.round(video.videoHeight * scale);

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          const zip = new JSZip();
          const duration = video.duration;
          const sampleInterval = 0.5;
          let currentTime = 0;
          let frameIndex = 0;

          const seekToTime = (targetTime) => {
            return new Promise((res) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                res();
              };
              video.addEventListener('seeked', onSeeked);
              video.currentTime = targetTime;
            });
          };

          const framePromises = [];

          while (currentTime < duration) {
            await seekToTime(currentTime);
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

            // 따옴표 깨짐 방지를 위한 일반 문자열 결합 방식 (고유 파일명 보장)
            const paddedIndex = String(frameIndex).padStart(4, '0');
            const timeStr = currentTime.toFixed(2);
            const filename = 'frame_' + paddedIndex + '_' + timeStr + 's.jpg';

            const framePromise = new Promise((resBlob) => {
              canvas.toBlob(
                (blob) => {
                  zip.file(filename, blob);
                  resBlob();
                },
                'image/jpeg',
                0.8
              );
            });

            framePromises.push(framePromise);

            frameIndex++;
            currentTime += sampleInterval;

            const currentProgress = Math.min(100, Math.round((currentTime / duration) * 100));
            setProgress(currentProgress);
          }

          await Promise.all(framePromises);

          zip.file('meta.json', JSON.stringify({ duration: duration, total_frames: frameIndex }));

          const content = await zip.generateAsync({ type: 'blob' });
          
          // ZIP 파일명 생성도 안전한 문자열 결합 적용
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          const zipFileName = 'frames_' + cleanName + '.zip';
          const zipFile = new File([content], zipFileName, { type: 'application/zip' });

          console.log('✅ 브라우저 추출 완벽 성공: 총 ' + frameIndex + '개 프레임 패킹 완료');
          resolve(zipFile);
        } catch (err) {
          reject(err);
        }
      };

      video.onerror = (err) => {
        reject(err);
      };
    });
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      alert('동영상 파일(.mp4, .mov 등)만 업로드 가능합니다.');
    }
  };

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

  // '음악 생성 시작하기' 버튼을 누를 때 즉시 실시간 압축 및 백엔드 전송 진행
  const handleUpload = async () => {
    if (isProcessing) return;

    if (!selectedFile && !previewUrl) {
      alert('업로드할 동영상을 선택해 주세요.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);

      // 업로드 클릭 시점에 실시간으로 정밀 ZIP 생성
      const zipFile = await extractFramesToZip(selectedFile);

      setIsProcessing(false);
      setProgress(100);

      if (onNext) {
        // 완벽히 생성된 ZIP 파일을 벡엔드로 전송
        onNext(previewUrl, zipFile);
      }
    } catch (error) {
      console.error('프레임 압축 처리 오류:', error);
      alert('영상 처리 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

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
            {isProcessing && (
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
                <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>프레임 분석 패킹 중...</p>
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
          disabled={isProcessing}
          style={{
            opacity: isProcessing ? 0.5 : 1,
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? `전송 준비 중... (${progress}%)` : '음악 생성 시작하기'}
        </button>
      )}
    </div>
  );
};

export default UploadVideo;