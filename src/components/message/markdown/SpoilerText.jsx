import { useState } from 'react';

const SpoilerText = ({ children }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={() => setRevealed((v) => !v)}
      className={`cursor-pointer rounded px-0.5 transition-all ${
        revealed
          ? 'bg-gray-700/50'
          : 'bg-gray-500 text-transparent select-none [&_*]:!text-transparent'
      }`}
    >
      {children}
    </span>
  );
};

export default SpoilerText;
