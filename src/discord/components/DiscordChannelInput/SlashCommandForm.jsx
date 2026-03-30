import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { sendSlashCommand } from './plugins/SlashCommandPlugin';

const OPTION_TYPE_PLACEHOLDER = {
  3: 'text',
  4: 'number',
  5: 'true or false',
  6: 'user ID',
  7: 'channel ID',
  8: 'role ID',
  9: 'ID',
  10: 'number',
};

export default function SlashCommandForm({ command, application, channelId, guildId, onClose }) {
  const options = command.options || [];
  const [values, setValues] = useState(() =>
    Object.fromEntries(options.map((o) => [o.name, '']))
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef([]);
  const containerRef = useRef(null);

  // Reset values & focus when command changes
  useEffect(() => {
    setValues(Object.fromEntries((command.options || []).map((o) => [o.name, ''])));
    setFocusedIndex(0);
    inputRefs.current = [];
  }, [command.id]);

  // Focus the first input on mount / command change — double rAF ensures DOM is painted
  useEffect(() => {
    const tryFocus = () => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      } else {
        // Refs may not be attached yet on first render, retry once
        requestAnimationFrame(() => inputRefs.current[0]?.focus());
      }
    };
    requestAnimationFrame(tryFocus);
  }, [command.id]);

  const handleSubmit = useCallback(() => {
    const missing = options.filter((o) => o.required && !values[o.name]);
    if (missing.length > 0) return;

    const optionValues = options
      .filter((o) => values[o.name] !== '')
      .map((o) => {
        let value = values[o.name];
        if (o.type === 4) value = parseInt(value, 10);
        else if (o.type === 10) value = parseFloat(value);
        else if (o.type === 5) value = value === 'true';
        return { type: o.type, name: o.name, value };
      });

    sendSlashCommand(channelId, guildId, command, application, optionValues);
    onClose();
  }, [command, application, channelId, guildId, options, values, onClose]);

  const handleKeyDown = useCallback((e, index) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const next = e.shiftKey
        ? (index - 1 + options.length) % options.length
        : (index + 1) % options.length;
      setFocusedIndex(next);
      inputRefs.current[next]?.focus();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowRight') {
      const el = inputRefs.current[index];
      const val = values[options[index]?.name] || '';
      const atEnd = el?.selectionStart === val.length && el?.selectionEnd === val.length;
      if (atEnd && index < options.length - 1) {
        e.preventDefault();
        setFocusedIndex(index + 1);
        const next = inputRefs.current[index + 1];
        next?.focus();
        // Place cursor at start of next input
        requestAnimationFrame(() => next?.setSelectionRange?.(0, 0));
      }
    } else if (e.key === 'ArrowLeft') {
      const el = inputRefs.current[index];
      const cursorAtStart = el?.selectionStart === 0 && el?.selectionEnd === 0;
      if (cursorAtStart && index > 0) {
        e.preventDefault();
        setFocusedIndex(index - 1);
        const prev = inputRefs.current[index - 1];
        const prevLen = (values[options[index - 1]?.name] || '').length;
        prev?.focus();
        // Place cursor at end of previous input
        requestAnimationFrame(() => prev?.setSelectionRange?.(prevLen, prevLen));
      }
    } else if (e.key === 'Backspace') {
      const currentValue = values[options[index]?.name] || '';
      const el = inputRefs.current[index];
      const cursorAtStart = el?.selectionStart === 0 && el?.selectionEnd === 0;

      if (currentValue === '' || cursorAtStart) {
        if (index === 0) {
          // Backspace on empty/cursor-at-start of first param → close
          e.preventDefault();
          onClose();
        } else if (currentValue === '') {
          // Backspace on empty non-first param → move to previous
          e.preventDefault();
          setFocusedIndex(index - 1);
          inputRefs.current[index - 1]?.focus();
        }
      }
    }
  }, [handleSubmit, onClose, options, values]);

  const setRef = useCallback((el, index) => {
    inputRefs.current[index] = el;
  }, []);

  // The currently focused option — used for the description tooltip
  const focusedOption = options[focusedIndex];

  return (
    <div ref={containerRef} className="relative flex min-h-[54px] w-full items-start">
      {/* Parameter description tooltip — shown above the input */}
      {focusedOption && (focusedOption.description || focusedOption.required) && (
        <div className="absolute bottom-full left-0 right-0 z-10 mb-1">
          <div className="inline-flex max-w-full items-start gap-2 rounded bg-[#111214] px-3 py-2 shadow-lg">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">{focusedOption.name}</span>
                {focusedOption.required && (
                  <span className="text-[10px] text-red-400">Required</span>
                )}
                <span className="text-[10px] text-gray-500">
                  {OPTION_TYPE_PLACEHOLDER[focusedOption.type] || 'value'}
                </span>
              </div>
              {focusedOption.description && (
                <p className="mt-0.5 text-xs text-gray-400">{focusedOption.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inline command + parameters */}
      <div className="flex min-h-[54px] flex-1 flex-wrap items-center gap-1 px-3 py-2">
        {/* Command pill — click to dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded bg-[#5865f2]/20 px-1.5 py-0.5 text-sm font-medium text-[#8a9cff] transition-colors hover:bg-[#5865f2]/30"
        >
          /{command.name}
        </button>

        {/* Parameter fields inline */}
        {options.map((opt, i) => (
          <span
            key={opt.name}
            className={`inline-flex shrink-0 items-center rounded px-1 py-0.5 transition-colors ${
              focusedIndex === i ? 'bg-white/10' : 'bg-white/5'
            }`}
          >
            <span className={`mr-1 text-xs ${opt.required ? 'text-[#f47b67]' : 'text-gray-500'}`}>
              {opt.name}:
            </span>
            {opt.choices && opt.choices.length > 0 ? (
              <select
                ref={(el) => setRef(el, i)}
                value={values[opt.name]}
                onChange={(e) => setValues((v) => ({ ...v, [opt.name]: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onFocus={() => setFocusedIndex(i)}
                className="h-5 min-w-[60px] cursor-pointer appearance-none border-none bg-transparent text-sm text-gray-200 outline-none"
              >
                <option value="" className="bg-[#1e1f22]">Select...</option>
                {opt.choices.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#1e1f22]">{c.name}</option>
                ))}
              </select>
            ) : opt.type === 5 ? (
              <select
                ref={(el) => setRef(el, i)}
                value={values[opt.name]}
                onChange={(e) => setValues((v) => ({ ...v, [opt.name]: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onFocus={() => setFocusedIndex(i)}
                className="h-5 min-w-[50px] cursor-pointer appearance-none border-none bg-transparent text-sm text-gray-200 outline-none"
              >
                <option value="" className="bg-[#1e1f22]">...</option>
                <option value="true" className="bg-[#1e1f22]">True</option>
                <option value="false" className="bg-[#1e1f22]">False</option>
              </select>
            ) : (
              <input
                ref={(el) => setRef(el, i)}
                type={opt.type === 4 || opt.type === 10 ? 'number' : 'text'}
                value={values[opt.name]}
                onChange={(e) => setValues((v) => ({ ...v, [opt.name]: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onFocus={() => setFocusedIndex(i)}
                placeholder={OPTION_TYPE_PLACEHOLDER[opt.type] || 'value'}
                size={Math.max((values[opt.name]?.length || 0) + 1, (OPTION_TYPE_PLACEHOLDER[opt.type] || 'value').length)}
                className="h-5 min-w-[40px] border-none bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-600"
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
