import { useState } from 'react';

const MessageEditor = ({ initialContent, onSave, onCancel }) => {
  const [content, setContent] = useState(initialContent);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (content && content !== initialContent) {
      onSave(content);
    } else {
      onCancel();
    }
  };

  return (
    <div className="my-2 w-full">
      <div className="mb-1 flex items-center rounded-lg bg-gray-600 px-4 py-2">
        <form onSubmit={handleSubmit} className="w-full">
          <input
            className="w-full border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
        </form>
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
