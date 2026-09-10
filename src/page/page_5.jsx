import React from 'react';

// ❌ import Header 삭제
import Result from '../component/result';

import './page_5.css';

const Page5 = ({
  videoPreviewUrl,
  generatedMusic,
  finalVideoUrl,
  finalVideoLoading,
  finalVideoError,
  onSave,
  segments,
  musicSelectedIds,
  onGoHome
}) => {

  return (
    <div className="page-container">

      {/* ❌ <Header onGoHome={onGoHome} /> 태그 삭제 */}

      <main className="page5-content">

        <Result
          videoPreviewUrl={videoPreviewUrl}
          generatedMusic={generatedMusic}
          segments={segments}
          musicSelectedIds={musicSelectedIds}
          finalVideoUrl={finalVideoUrl}
          finalVideoLoading={finalVideoLoading}
          finalVideoError={finalVideoError}
          onSave={onSave}
          onGoHome={onGoHome}
        />

      </main>

    </div>
  );
};

export default Page5;