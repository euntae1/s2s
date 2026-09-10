const HF_API_URL = 'https://euntaejang-video-cut.hf.space';
const COLAB_API_URL = 'https://shorthand-suitcase-undergo.ngrok-free.dev';

/**
 * [웹 최적화 유틸] 브라우저 Canvas/MediaRecorder를 활용한 영상 압축 및 해상도 다운스케일링
 * CLIP 및 Gemini 추론 정확도를 유지하면서 Hugging Face 업로드 속도를 극대화합니다.
 */
const compressVideoForCLIP = async (file, maxDimension = 640) => {
  return new Promise((resolve) => {
    console.log(`⚡ 영상 업로드 전용 경량화 시작 (원본: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30);
      let mediaRecorder;

      // MP4 호환 mimeType 감지 (H.264 / AVC1 기준)
      let selectedMimeType = 'video/mp4;codecs=avc1.42E01E';
      if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
        selectedMimeType = 'video/mp4';
      }

      try {
        if (MediaRecorder.isTypeSupported(selectedMimeType)) {
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: selectedMimeType,
            videoBitsPerSecond: 1500000 // 1.5 Mbps
          });
        } else {
          // 브라우저가 MP4 인코딩을 지원하지 않는 환경일 경우 기본 MediaRecorder 적용
          mediaRecorder = new MediaRecorder(stream);
        }
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeTypeUsed = mediaRecorder.mimeType || 'video/mp4';
        const compressedBlob = new Blob(chunks, { type: mimeTypeUsed });
        const compressedFile = new File([compressedBlob], 'compressed_video.mp4', {
          type: mimeTypeUsed
        });
        
        console.log(`🚀 영상 경량화 완료: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB (${mimeTypeUsed})`);
        URL.revokeObjectURL(video.src);
        resolve(compressedFile);
      };

      video.play();
      mediaRecorder.start();

      const processFrame = () => {
        if (video.ended || video.paused) {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(processFrame);
      };

      processFrame();
    };

    video.onerror = () => {
      console.warn('⚠️ 영상 경량화 중 오류 발생. 원본 파일을 그대로 사용합니다.');
      URL.revokeObjectURL(video.src);
      resolve(file);
    };
  });
};

/*
 * Signal 0: 컷 분할 분석 요청 (영상 압축 적용)
 */
export const analyzeVideoCuts = async (file) => {
  if (!file) {
    throw new Error('분석할 동영상 파일이 없습니다.');
  }

  console.log('🚀 Hugging Face 컷 분할 요청 시작');
  console.log('📡 요청 주소:', `${HF_API_URL}/predict`);

  // 클라이언트 측 영상 용량/해상도 경량화
  const optimizedFile = await compressVideoForCLIP(file);

  const formData = new FormData();
  formData.append('signal', '0');
  formData.append('video', optimizedFile);

  const response = await fetch(`${HF_API_URL}/predict`, {
    method: 'POST',
    body: formData
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Hugging Face 서버 오류 (${response.status}): ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Hugging Face 응답을 JSON으로 변환할 수 없습니다.');
  }

  console.log('✅ Hugging Face 응답:', data);

  if (data.status !== 'success') {
    throw new Error(data.message || '컷 분할에 실패했습니다.');
  }

  return {
    status: data.status,
    signal: data.signal,
    sessionId: data.session_id || null, // 서버 보관 영상 세션 ID 반환
    duration: data.duration,
    inferenceTime: data.inference_time,
    timelogs: data.timelogs || []
  };
};

/*
 * Signal 1: 장면별 음악 생성 프롬프트 추출 요청 (Session ID 재사용 가능)
 */
export const generateScenePrompts = async (file, timelogs, sessionId = null) => {
  if (!file && !sessionId) {
    throw new Error('분석할 동영상 파일 또는 session_id가 없습니다.');
  }

  if (!Array.isArray(timelogs)) {
    throw new Error('타임로그 데이터가 올바르지 않습니다.');
  }

  console.log('🤖 Gemini 장면 프롬프트 생성 시작');
  console.log('📡 요청 주소:', `${HF_API_URL}/predict`);

  timelogs.forEach((segment) => {
    console.log(
      `  Scene ${segment.id}: ${segment.startTime}s ~ ${segment.endTime}s musicSelected=${segment.musicSelected}`
    );
  });

  const formData = new FormData();
  formData.append('signal', '1');
  formData.append('timelogs', JSON.stringify(timelogs));

  // session_id가 존재하는 경우 비디오 전송 생략 (네트워크 대역폭 절약)
  if (sessionId) {
    formData.append('session_id', sessionId);
  } else if (file) {
    const optimizedFile = await compressVideoForCLIP(file);
    formData.append('video', optimizedFile);
  }

  const startTime = performance.now();

  const response = await fetch(`${HF_API_URL}/predict`, {
    method: 'POST',
    body: formData
  });

  const endTime = performance.now();

  console.log(
    `⏱️ Signal 1 전체 처리 시간: ${((endTime - startTime) / 1000).toFixed(2)}초`
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Hugging Face 서버 오류 (${response.status}): ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Hugging Face 응답을 JSON으로 변환할 수 없습니다.');
  }

  console.log('✅ Signal 1 Hugging Face 응답:', data);

  if (data.status !== 'success') {
    throw new Error(data.message || 'Gemini 프롬프트 생성에 실패했습니다.');
  }

  return {
    status: data.status,
    signal: data.signal,
    inferenceTime: data.inference_time,
    timelogs: data.timelogs || []
  };
};

/*
 * Stable Audio 음악 생성 요청
 */
export const generateMusic = async (prompt, duration) => {
  if (!prompt || !prompt.trim()) {
    throw new Error('음악 생성 Prompt가 없습니다.');
  }

  if (typeof duration !== 'number' || duration <= 0) {
    throw new Error('음악 생성 시간이 올바르지 않습니다.');
  }

  console.log('🎵 Stable Audio 음악 생성 요청 시작');
  console.log('📡 요청 주소:', `${COLAB_API_URL}/generate`);
  console.log('📝 Prompt:', prompt);
  console.log('⏱️ 음악 길이:', duration);

  const response = await fetch(`${COLAB_API_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      video_duration: duration
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Colab 음악 생성 서버 오류 (${response.status}): ${errorText}`);
  }

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error('Colab에서 빈 음악 파일이 반환되었습니다.');
  }

  console.log(`✅ 음악 생성 완료 (${(blob.size / 1024).toFixed(1)} KB)`);

  const musicUrl = URL.createObjectURL(blob);

  return {
    musicUrl,
    blob
  };
};

/*
 * 원본 영상 + 생성된 음악 → 최종 MP4 합성
 */
export const composeFinalVideo = async (videoFile, tracks) => {
  if (!videoFile) {
    throw new Error('원본 동영상이 없습니다.');
  }

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('합성할 음악이 없습니다.');
  }

  console.log('🎬 최종 영상 합성 요청 시작');
  console.log('📡 요청 주소:', `${COLAB_API_URL}/compose`);

  const formData = new FormData();
  formData.append('video', videoFile);

  const timelogs = tracks.map((track) => ({
    id: track.id,
    startTime: track.startTime,
    endTime: track.endTime
  }));

  formData.append('timelogs', JSON.stringify(timelogs));

  tracks.forEach((track) => {
    if (!track.blob) {
      throw new Error(`Scene ${track.id}의 음악 파일이 없습니다.`);
    }

    formData.append(
      `music_${track.id}`,
      track.blob,
      `music_${track.id}.wav`
    );
  });

  console.log('🎵 합성 대상 Scene:', timelogs);

  const response = await fetch(`${COLAB_API_URL}/compose`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Colab 영상 합성 서버 오류 (${response.status}): ${errorText}`);
  }

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error('Colab에서 최종 영상 파일이 반환되지 않았습니다.');
  }

  console.log(
    `✅ 최종 영상 다운로드 완료 (${(blob.size / 1024 / 1024).toFixed(2)} MB)`
  );

  const videoUrl = URL.createObjectURL(blob);

  return {
    videoUrl,
    blob
  };
};