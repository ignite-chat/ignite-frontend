const TypingDots = ({ className = '' }) => (
  <span className={`flex items-center gap-[2px] ${className}`}>
    <span className="size-[5px] animate-bounce rounded-full bg-white [animation-delay:0ms]" />
    <span className="size-[5px] animate-bounce rounded-full bg-white [animation-delay:150ms]" />
    <span className="size-[5px] animate-bounce rounded-full bg-white [animation-delay:300ms]" />
  </span>
);

export default TypingDots;
