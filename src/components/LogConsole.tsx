import React, { useEffect, useRef } from 'react';

interface Props {
  lines: string[];
}

const LogConsole: React.FC<Props> = ({ lines }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="sm-log-wrap">
      <div className="sm-log-gutter">
        {lines.map((_, i) => (
          <div key={i} className="sm-log-line-num">
            {i + 1}
          </div>
        ))}
        {lines.length === 0 && <div className="sm-log-line-num">1</div>}
      </div>
      <pre className="sm-log-body">
        {lines.length === 0 ? (
          <span className="sm-log-placeholder">暂无操作日志</span>
        ) : (
          lines.map((line, i) => {
            let cls = 'sm-log-line';
            if (line.includes('[ERROR]')) cls += ' sm-log-line--err';
            else if (line.includes('[SUCCESS]')) cls += ' sm-log-line--ok';
            else if (line.includes('[WARNING]')) cls += ' sm-log-line--warn';
            return (
              <div key={i} className={cls}>
                {line}
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </pre>
    </div>
  );
};

export default LogConsole;
