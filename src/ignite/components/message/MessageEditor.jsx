import { useState, useRef, useEffect } from 'react';

const MessageEditor = ({ initialContent, onSave, onCancel }) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    if (content && content !== initialContent) {
      onSave(content);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  return (
    <div className="my-2 w-full">
      <div className="mb-1 flex items-center rounded-lg bg-gray-600 px-4 py-2">
        <textarea
          ref={textareaRef}
          className="max-h-[50vh] w-full resize-none overflow-hidden border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          autoFocus
        />
      </div>
      <p className="text-xs text-gray-400">
        escape to{' '}
        <button onClick={onCancel} className="text-primary hover:underline">
          cancel
        </button>{' '}
        • enter to{' '}
        <button onClick={handleSubmit} className="text-primary hover:underline">
          save
        </button>
      </p>
    </div>
  );
};

export default MessageEditor;
