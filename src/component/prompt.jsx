import React from 'react';
import './prompt.css';

const Prompt = ({
  segment,
  value,
  onChange
}) => {
  const handleChange = (e) => {
    onChange(
      segment.id,
      e.target.value
    );
  };

  return (
    <div className="prompt-container">

      <textarea
        className="prompt-input"
        value={value}
        onChange={handleChange}
        onClick={(e) =>
          e.stopPropagation()
        }
        placeholder="음악 생성 Prompt를 입력하세요."
      />

    </div>
  );
};

export default Prompt;