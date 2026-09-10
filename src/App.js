import React, { useState } from 'react';
import Header from './component/header';
import Page1 from './page/page_1';
import Page2 from './page/page_2';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState(1);

  const handleGoHome = () => setCurrentPage(1);
  const handleGoNext = () => setCurrentPage(2);

  return (
    <div className="App">
      <Header onGoHome={handleGoHome} />
      {currentPage === 1 && <Page1 onNext={handleGoNext} />}
      {currentPage === 2 && <Page2 />}
    </div>
  );
}

export default App;