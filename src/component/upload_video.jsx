import React, {
  useState,
  useEffect
} from 'react';

import './upload_video.css';


const UploadVideo = ({
  onNext,
  initialPreviewUrl = '',
  videoRef
}) => {

  const [
    selectedFile,
    setSelectedFile
  ] = useState(null);


  const [
    previewUrl,
    setPreviewUrl
  ] = useState(
    initialPreviewUrl
  );


  const [
    isDragging,
    setIsDragging
  ] = useState(false);


  useEffect(() => {

    setPreviewUrl(
      initialPreviewUrl
    );

  }, [
    initialPreviewUrl
  ]);


  // ------------------------------------------------------------
  // 파일 처리
  // ------------------------------------------------------------

  const processFile = (
    file
  ) => {

    if (
      file &&
      file.type.startsWith(
        'video/'
      )
    ) {

      setSelectedFile(
        file
      );


      const url =
        URL.createObjectURL(
          file
        );


      setPreviewUrl(
        url
      );

    } else {

      alert(
        '동영상 파일(.mp4, .mov 등)만 업로드 가능합니다.'
      );
    }
  };


  // ------------------------------------------------------------
  // 파일 선택
  // ------------------------------------------------------------

  const handleFileChange = (
    e
  ) => {

    processFile(
      e.target.files[0]
    );
  };


  // ------------------------------------------------------------
  // Drag Over
  // ------------------------------------------------------------

  const handleDragOver = (
    e
  ) => {

    e.preventDefault();

    setIsDragging(
      true
    );
  };


  // ------------------------------------------------------------
  // Drag Leave
  // ------------------------------------------------------------

  const handleDragLeave = (
    e
  ) => {

    e.preventDefault();

    setIsDragging(
      false
    );
  };


  // ------------------------------------------------------------
  // Drop
  // ------------------------------------------------------------

  const handleDrop = (
    e
  ) => {

    e.preventDefault();

    setIsDragging(
      false
    );


    processFile(
      e.dataTransfer.files[0]
    );
  };


  // ------------------------------------------------------------
  // 음악 생성 시작
  // ------------------------------------------------------------

  const handleUpload = () => {

    if (
      !selectedFile &&
      !previewUrl
    ) {

      alert(
        '업로드할 동영상을 선택해 주세요.'
      );

      return;
    }


    if (
      !selectedFile
    ) {

      alert(
        '분석할 동영상 파일을 다시 선택해 주세요.'
      );

      return;
    }


    if (onNext) {

      onNext(
        previewUrl,
        selectedFile
      );
    }
  };


  return (
    <div className="upload-box-container">

      <div
        className={
          `upload-box ${
            isDragging
              ? 'dragging'
              : ''
          }`
        }

        onDragOver={
          handleDragOver
        }

        onDragLeave={
          handleDragLeave
        }

        onDrop={
          handleDrop
        }
      >

        {previewUrl ? (

          <video
            ref={
              videoRef
            }

            src={
              previewUrl
            }

            controls

            className="video-preview"
          />

        ) : (

          <label
            htmlFor="video-input"
            className="upload-label"
          >

            <div className="upload-icon">
              📹
            </div>


            <p className="upload-text">
              동영상 파일을 이곳에 드래그하거나
            </p>


            <span className="upload-browse-btn">
              파일 찾기
            </span>

          </label>
        )}


        <input
          id="video-input"

          type="file"

          accept="video/*"

          onChange={
            handleFileChange
          }

          style={{
            display: 'none'
          }}
        />

      </div>


      {onNext && (

        <button
          className="upload-btn"

          onClick={
            handleUpload
          }
        >
          음악 생성 시작하기
        </button>

      )}

    </div>
  );
};


export default UploadVideo;