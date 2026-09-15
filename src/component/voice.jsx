import React, { useState, useEffect } from 'react';
import './voice.css';

const Voice = ({ selectedFile, videoPreviewUrl, onVadComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState(null);

  const extractAudioAsWav = async (videoBlob) => {
    const arrayBuffer = await videoBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    
    const renderedBuffer = await offlineCtx.startRendering();
    return bufferToWav(renderedBuffer);
  };

  const bufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let channels = [];
    let offset = 0;
    let pos = 0;

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(out, pos, 'RIFF'); pos += 4;
    out.setUint32(pos, length - 8, true); pos += 4;
    writeString(out, pos, 'WAVE'); pos += 4;
    writeString(out, pos, 'fmt '); pos += 4;
    out.setUint32(pos, 16, true); pos += 4;
    out.setUint16(pos, 1, true); pos += 2;
    out.setUint16(pos, numOfChan, true); pos += 2;
    out.setUint32(pos, sampleRate, true); pos += 4;
    out.setUint32(pos, sampleRate * 2 * numOfChan, true); pos += 4;
    out.setUint16(pos, numOfChan * 2, true); pos += 2;
    out.setUint16(pos, 16, true); pos += 2;
    writeString(out, pos, 'data'); pos += 4;
    out.setUint32(pos, length - pos - 4, true); pos += 4;

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([out.buffer], { type: 'audio/wav' });
  };

  useEffect(() => {
    let isSubscribed = true;

    const runVadAuto = async () => {
      if (!videoPreviewUrl && !selectedFile) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('🚀 [VAD] 진입 시 자동 분석 시작...');
        
        let targetBlob = null;
        if (videoPreviewUrl) {
          const res = await fetch(videoPreviewUrl);
          targetBlob = await res.blob();
        } else if (selectedFile) {
          targetBlob = selectedFile;
        }

        if (!targetBlob) {
          throw new Error('미디어 데이터를 읽을 수 없습니다.');
        }

        const audioWavBlob = await extractAudioAsWav(targetBlob);
        const formData = new FormData();
        formData.append('file', audioWavBlob, 'extracted_audio.wav');

        const response = await fetch('https://euntaejang-vad.hf.space/transcribe_audio', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`서버 응답 오류 (status: ${response.status})`);
        }

        const vadData = await response.json();
        console.log('✅ [VAD 응답 수신]:', vadData);

        let detectedTimeline = [];
        if (vadData && vadData.status === 'success') {
          detectedTimeline = vadData.timeline || [];
          console.log(`🔥 [VAD 성공] 총 ${detectedTimeline.length}개 구간 감지됨!`);
        }

        if (isSubscribed) {
          setTimeline(detectedTimeline);
          if (onVadComplete) onVadComplete(detectedTimeline);
        }

      } catch (err) {
        console.error('❌ [VAD 오류]:', err.message);
        if (isSubscribed) {
          setError('분석 실패 (기본 음량 적용)');
          if (onVadComplete) onVadComplete([]);
        }
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    runVadAuto();

    return () => {
      isSubscribed = false;
    };
  }, [selectedFile, videoPreviewUrl]);

  return React.createElement(
    'div',
    { className: 'voice-container' },
    React.createElement('h4', { className: 'voice-title' }, '🎙️ 음성 활동 감지 (VAD)'),

    isLoading
      ? React.createElement(
          'div',
          { className: 'voice-loading' },
          React.createElement('div', { className: 'voice-spinner' }),
          React.createElement('span', null, '영상 내 말소리 구간을 분석하는 중입니다...')
        )
      : error
      ? React.createElement('div', { className: 'voice-error' }, '⚠️ ' + error)
      : timeline.length === 0
      ? React.createElement(
          'div',
          { className: 'voice-empty' },
          '감지된 말소리 구간이 없습니다. (음악 음량 100% 유지)'
        )
      : React.createElement(
          'div',
          { className: 'voice-result-box' },
          React.createElement(
            'p',
            { className: 'voice-summary' },
            '총 ',
            React.createElement('strong', null, timeline.length + '개'),
            '의 말소리 구간 감지됨'
          ),
          React.createElement(
            'div',
            { className: 'voice-timeline-list' },
            timeline.map((seg, idx) =>
              React.createElement(
                'span',
                { key: idx, className: 'voice-badge' },
                '🗣️ ' + seg.start + '초 ~ ' + seg.end + '초'
              )
            )
          )
        )
  );
};

export default Voice;