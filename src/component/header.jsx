import React from 'react';
import logoImg from './logo.png';
import './header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-brand">
        <img src={logoImg} alt="Logo" className="header-logo-small" />
        <span className="header-title">Scene to Sound</span>
      </div>
    </header>
  );
};

export default Header;