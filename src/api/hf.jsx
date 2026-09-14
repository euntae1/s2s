const HF_API_URL = 'https://euntaejang-video-cut.hf.space';
const COLAB_API_URL = 'https://shorthand-suitcase-undergo.ngrok-free.dev';

/**
 * 1. 컷 분할 분석 요청 (원본 영상 전송 -> 타임로그 및 session_id 획득)
 */
export const analyzeVideoCuts = async (file) => {
  if (!file) {
    throw new Error('분석할 동영상 파일이 없습니다.');
  }

  console.log('🚀 Hugging Face 컷 분할 요청 시작');
  console.log('📡 요청 주소:', HF_API_URL + '/predict');

  const formData = new FormData();
  formData.append('video', file);

  const response = await fetch(HF_API_URL + '/predict', {
    method: 'POST',
    body: formData
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error('Hugging Face 서버 오류 ' + response.status + ': ' + text);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Hugging Face 응답을 JSON으로 변환할 수 없습니다.');
  }

  console.log('✅ Hugging Face 컷 분할 응답:', data);

  if (data.status !== 'success') {
    throw new Error(data.message || '컷 분할에 실패했습니다.');
  }

  return {
    status: data.status,
    type: data.type,
    sessionId: data.session_id || null,
    duration: data.duration,
    inferenceTime: data.inference_time,
    timelogs: data.timelogs || []
  };
};

/**
 * 2. 장면별 음악 생성 프롬프트 추출 요청 (timelogs 전달 -> Gemini 분석)
 */
export const generateScenePrompts = async (file, timelogs, sessionId = null) => {
  if (!file && !sessionId) {
    throw new Error('분석할 동영상 파일 또는 session_id가 없습니다.');
  }

  if (!Array.isArray(timelogs) || timelogs.length === 0) {
    throw new Error('타임로그 데이터가 올바르지 않거나 비어 있습니다.');
  }

  console.log('🤖 Gemini 장면 프롬프트 생성 시작');
  console.log('📡 요청 주소:', HF_API_URL + '/predict');

  timelogs.forEach((segment) => {
    console.log(
      '  Scene ' + segment.id + ': ' + segment.startTime + 's ~ ' + segment.endTime + 's'
    );
  });

  const formData = new FormData();
  formData.append('timelogs', JSON.stringify(timelogs));

  if (sessionId) {
    formData.append('session_id', sessionId);
  } else if (file) {
    formData.append('video', file);
  }

  const startTime = performance.now();

  const response = await fetch(HF_API_URL + '/predict', {
    method: 'POST',
    body: formData
  });

  const endTime = performance.now();

  console.log(
    '⏱️ 프롬프트 분석 전체 처리 시간: ' + ((endTime - startTime) / 1000).toFixed(2) + '초'
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error('Hugging Face 서버 오류 ' + response.status + ': ' + text);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Hugging Face 응답을 JSON으로 변환할 수 없습니다.');
  }

  console.log('✅ Gemini 프롬프트 응답:', data);

  if (data.status !== 'success') {
    throw new Error(data.message || 'Gemini 프롬프트 생성에 실패했습니다.');
  }

  return {
    status: data.status,
    type: data.type,
    inferenceTime: data.inference_time,
    timelogs: data.timelogs || []
  };
};

/**
 * 3. Stable Audio 음악 생성 요청 (Colab 연동)
 */
export const generateMusic = async (prompt, duration) => {
  if (!prompt || !prompt.trim()) {
    throw new Error('음악 생성 Prompt가 없습니다.');
  }

  if (typeof duration !== 'number' || duration <= 0) {
    throw new Error('음악 생성 시간이 올바르지 않습니다.');
  }

  console.log('🎵 Stable Audio 음악 생성 요청 시작');
  console.log('📡 요청 주소:', COLAB_API_URL + '/generate');
  console.log('📝 Prompt:', prompt);
  console.log('⏱️ 음악 길이:', duration);

  const response = await fetch(COLAB_API_URL + '/generate', {
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
    throw new Error('Colab 음악 생성 서버 오류 ' + response.status + ': ' + errorText);
  }

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error('Colab에서 빈 음악 파일이 반환되었습니다.');
  }

  console.log('✅ 음악 생성 완료 (' + (blob.size / 1024).toFixed(1) + ' KB)');

  const musicUrl = URL.createObjectURL(blob);

  return {
    musicUrl,
    blob
  };
};

/**
 * 4. 원본 영상 + 생성된 음악 → 최종 MP4 합성 (Colab 연동)
 */
export const composeFinalVideo = async (videoFile, tracks) => {
  if (!videoFile) {
    throw new Error('원본 동영상이 없습니다.');
  }

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('합성할 음악이 없습니다.');
  }

  console.log('🎬 최종 영상 합성 요청 시작');
  console.log('📡 요청 주소:', COLAB_API_URL + '/compose');

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
      throw new Error('Scene ' + track.id + '의 음악 파일이 없습니다.');
    }

    formData.append(
      'music_' + track.id,
      track.blob,
      'music_' + track.id + '.wav'
    );
  });

  console.log('🎵 합성 대상 Scene:', timelogs);

  const response = await fetch(COLAB_API_URL + '/compose', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('Colab 영상 합성 서버 오류 ' + response.status + ': ' + errorText);
  }

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error('Colab에서 최종 영상 파일이 반환되지 않았습니다.');
  }

  console.log(
    '✅ 최종 영상 다운로드 완료 (' + (blob.size / 1024 / 1024).toFixed(2) + ' MB)'
  );

  const videoUrl = URL.createObjectURL(blob);

  return {
    videoUrl,
    blob
  };
};