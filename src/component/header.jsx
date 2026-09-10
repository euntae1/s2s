import React from 'react';
import logoImg from './logo.png';
import './header.css';

const Header = ({ onGoHome }) => {
  return (
    <header className="header">
      <div 
        className="header-brand" 
        onClick={onGoHome} 
        style={{ cursor: 'pointer' }}
      >
        <img src={logoImg} alt="Logo" className="header-logo-small" />
        <span className="header-title">Scene to Sound</span>
      </div>
    </header>
  );
};

export default Header;