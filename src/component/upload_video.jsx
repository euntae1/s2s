import React, { useState } from 'react';
import './upload_video.css';

const UploadVideo = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // 파일 정품 검증 및 처리 함수
  const processFile = (file) => {
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      alert('동영상 파일(.mp4, .mov, .webm 등)만 업로드 가능합니다.');
    }
  };

  // 1. 클릭으로 파일 선택 시
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  // 2. 드래그 이벤트 핸들러
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
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  // 3. 업로드된 비디오 제거 (X 버튼 클릭)
  const handleRemoveVideo = (e) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl); // 메모리 해제
    }
    setSelectedFile(null);
    setPreviewUrl('');
  };

  // 음악 생성 시작 버튼 이벤트
  const handleUpload = () => {
    if (!selectedFile) {
      alert('업로드할 동영상을 선택해 주세요.');
      return;
    }
    console.log('백엔드로 전송할 동영상 파일:', selectedFile);
    // TODO: 백엔드 API 연동 위치
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
          <div className="video-preview-wrapper">
            <button
              type="button"
              className="remove-video-btn"
              onClick={handleRemoveVideo}
              title="동영상 제거"
            >
              ✕
            </button>
            <video src={previewUrl} controls className="video-preview" />
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

      <button className="upload-btn" onClick={handleUpload}>
        음악 생성 시작하기
      </button>
    </div>
  );
};

export default UploadVideo;