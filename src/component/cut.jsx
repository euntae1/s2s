import React from 'react';
import './cut.css';

const Cut = ({
  segments,
  selectedIds,
  musicSelectedIds,
  onSegmentClick,
  onCheck,
  onMusicCheck,
  onMerge,
  onUndo
}) => {
  return (
    <div className="cut-container">

      <div className="segment-box">

        <h3 className="segment-title">
          🎬 컷 분할 정보
        </h3>

        <div className="checkbox-guide">

          <div className="guide-item guide-left">
            <span className="guide-checkbox">
              □
            </span>

            <span>
              컷 병합 선택
            </span>
          </div>

          <div className="guide-item guide-right">
            <span>
              음악 생성 여부
            </span>

            <span className="guide-checkbox">
              □
            </span>
          </div>

        </div>

        <div className="segment-list">

          {segments.map((seg) => (
            <div
              key={seg.id}
              className="segment-item"
              onClick={() =>
                onSegmentClick(seg.startTime)
              }
            >

              {/* 왼쪽: 컷 병합 선택 */}
              <label
                className="cut-checkbox"
                title="이 컷을 병합 대상으로 선택"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(seg.id)}
                  onChange={(e) =>
                    onCheck(e, seg.id)
                  }
                />
              </label>

              {/* 가운데: 컷 시간 */}
              <span className="time-text">
                {seg.startTime}초 ~ {seg.endTime}초
              </span>

              {/* 오른쪽: 음악 생성 여부 */}
              <label
                className="music-checkbox"
                title="이 컷의 음악 생성 여부"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <input
                  type="checkbox"
                  checked={
                    musicSelectedIds.includes(seg.id)
                  }
                  onChange={(e) =>
                    onMusicCheck(e, seg.id)
                  }
                />
              </label>

            </div>
          ))}

        </div>

        <div className="cut-button-container">

          <button
            className="undo-btn"
            onClick={onUndo}
          >
            ↩ 되돌리기
          </button>

          <button
            className="merge-btn"
            onClick={onMerge}
          >
            선택한 컷 병합하기
          </button>

        </div>

      </div>

    </div>
  );
};

export default Cut;