"use client";
import { useState } from "react";

export interface CodeSample {
  label: string;
  code: string;
}

export default function CodeTabs({
  samples,
  note,
}: {
  samples: CodeSample[];
  note?: string;
}) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(samples[active].code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };

  return (
    <div className="code-tabs">
      <div className="code-tabs-bar">
        <div className="code-tabs-tabs">
          {samples.map((s, i) => (
            <button
              key={s.label}
              type="button"
              className={i === active ? "active" : ""}
              onClick={() => setActive(i)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type="button" className="code-copy" onClick={copy}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>
        <code>{samples[active].code}</code>
      </pre>
      {note ? <p className="code-note">{note}</p> : null}
    </div>
  );
}
