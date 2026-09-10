import React from 'react';

import Header from '../component/header';
import Result from '../component/result';

import './page_5.css';

const Page5 = ({
  videoPreviewUrl,
  generatedMusic,
  onGoHome
}) => {
  return (
    <div className="page-container">

      <Header
        onGoHome={onGoHome}
      />

      <main className="page5-content">

        <Result
          videoPreviewUrl={
            videoPreviewUrl
          }
          generatedMusic={
            generatedMusic
          }
          onGoHome={
            onGoHome
          }
        />

      </main>

    </div>
  );
};

export default Page5;