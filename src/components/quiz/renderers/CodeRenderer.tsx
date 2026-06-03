import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface CodeConfig {
  type: 'code';
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

const CodeRenderer: React.FC<{ config: CodeConfig }> = ({ config }) => {
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-gray-700 shadow-md">
      <div className="bg-gray-800 text-gray-400 text-xs px-4 py-2 border-b border-gray-700 flex justify-between">
        <span className="font-mono">{config.language || 'text'}</span>
      </div>
      <SyntaxHighlighter
        language={config.language || 'text'}
        style={vscDarkPlus}
        showLineNumbers={config.showLineNumbers !== false}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.85rem' }}
      >
        {config.code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeRenderer;
