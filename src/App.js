import React, { useState } from 'react';

import Header from './component/header';

import Page1 from './page/page_1';
import Page2 from './page/page_2';
import Page3 from './page/page_3';
import Page4 from './page/page_4';
import Page5 from './page/page_5';

import './App.css';

function App() {
  const [currentPage, setCurrentPage] =
    useState(1);

  const [videoPreviewUrl, setVideoPreviewUrl] =
    useState('');

  const [selectedFile, setSelectedFile] =
    useState(null);

  // Page2에서 확정된 컷
  const [page2Segments, setPage2Segments] =
    useState([]);

  // Page2에서 음악 생성 대상으로 선택한 컷
  const [
    page2MusicSelectedIds,
    setPage2MusicSelectedIds
  ] = useState([]);

  // Page3에서 최종 수정된 Prompt
  const [finalPrompts, setFinalPrompts] =
    useState({});

  // Page4에서 생성된 음악
  const [generatedMusic, setGeneratedMusic] =
    useState({});

  // Page1 → Page2
  const handleGoNext = (
    previewUrl,
    file
  ) => {
    setVideoPreviewUrl(previewUrl);
    setSelectedFile(file);
    setCurrentPage(2);
  };

  // Page2 → Page1
  const handleGoPreviousFromPage2 =
    () => {
      setCurrentPage(1);
    };

  // Page2 → Page3
  const handleGoNextFromPage2 = (
    segments,
    musicSelectedIds
  ) => {
    setPage2Segments(segments);
    setPage2MusicSelectedIds(
      musicSelectedIds
    );

    setCurrentPage(3);
  };

  // Page3 → Page2
  const handleGoPreviousFromPage3 =
    () => {
      setCurrentPage(2);
    };

  // Page3 → Page4
  const handleGoNextFromPage3 = (
    prompts
  ) => {
    setFinalPrompts(prompts);
    setCurrentPage(4);
  };

  // Page4 → Page3
  const handleGoPreviousFromPage4 =
    () => {
      setCurrentPage(3);
    };

  // Page4 → Page5
  const handleGoNextFromPage4 = (
    music
  ) => {
    setGeneratedMusic(music);
    setCurrentPage(5);
  };

  // Page5 → Page4
  const handleGoPreviousFromPage5 =
    () => {
      setCurrentPage(4);
    };

  // 처음으로
  const handleGoHome = () => {
    setCurrentPage(1);
  };

  return (
    <div className="App">

      {currentPage === 1 && (
        <>
          <Header
            onGoHome={handleGoHome}
          />

          <Page1
            onNext={handleGoNext}
          />
        </>
      )}

      {currentPage === 2 && (
        <Page2
          videoPreviewUrl={
            videoPreviewUrl
          }
          selectedFile={
            selectedFile
          }
          onGoPrevious={
            handleGoPreviousFromPage2
          }
          onGoNext={
            handleGoNextFromPage2
          }
        />
      )}

      {currentPage === 3 && (
        <Page3
          videoPreviewUrl={
            videoPreviewUrl
          }
          selectedFile={
            selectedFile
          }
          segments={
            page2Segments
          }
          musicSelectedIds={
            page2MusicSelectedIds
          }
          onGoPrevious={
            handleGoPreviousFromPage3
          }
          onGoNext={
            handleGoNextFromPage3
          }
          onGoHome={
            handleGoHome
          }
        />
      )}

      {currentPage === 4 && (
        <Page4
          videoPreviewUrl={
            videoPreviewUrl
          }
          selectedFile={
            selectedFile
          }
          segments={
            page2Segments
          }
          musicSelectedIds={
            page2MusicSelectedIds
          }
          prompts={
            finalPrompts
          }
          onGoPrevious={
            handleGoPreviousFromPage4
          }
          onGoNext={
            handleGoNextFromPage4
          }
          onGoHome={
            handleGoHome
          }
        />
      )}

      {currentPage === 5 && (
        <Page5
          videoPreviewUrl={
            videoPreviewUrl
          }
          selectedFile={
            selectedFile
          }
          segments={
            page2Segments
          }
          musicSelectedIds={
            page2MusicSelectedIds
          }
          prompts={
            finalPrompts
          }
          generatedMusic={
            generatedMusic
          }
          onGoPrevious={
            handleGoPreviousFromPage5
          }
          onGoHome={
            handleGoHome
          }
        />
      )}

    </div>
  );
}

export default App;