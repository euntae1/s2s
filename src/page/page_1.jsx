import React from 'react';
import Header from '../component/header';
import UploadVideo from '../component/upload_video';
import logoImg from '../component/logo.png';
import './page_1.css';

const Page1 = () => {
  return (
    <div className="page-container">
      <Header />

      <main className="content-container">
        {/* 왼쪽 영역: 로고 이미지 + 박스 없는 글씨 */}
        <section className="left-section">
          <div className="logo-box">
            <img src={logoImg} alt="Scene to Sound Logo" className="main-logo-large" />
          </div>
          <h1 className="main-brand-text">
            Scene to Sound
          </h1>
        </section>

        {/* 오른쪽 영역: 업로드 박스 + 버튼 */}
        <section className="right-section">
          <UploadVideo />
        </section>
      </main>
    </div>
  );
};

export default Page1;