import { Minus, Square, X } from '@phosphor-icons/react';

const WindowControlButton = ({ icon: Icon, onClick, variant = 'default', ariaLabel }) => {
  const colorClasses =
    variant === 'close'
      ? 'text-gray-400 hover:text-gray-200 hover:bg-red-900'
      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700';

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`flex size-8 items-center justify-center transition-colors duration-100 ${colorClasses}`}
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <Icon className="size-5" weight="thin" />
    </button>
  );
};

function WindowBar() {
  const isMac = !window.IgniteNative || window.IgniteNative.platform === 'darwin';

  return (
    <div
      className="relative flex h-8 items-center justify-center bg-[#121214]"
      style={{
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        zIndex: 100,
      }}
    >
      {/* Centered app name */}
      <div className="text-sm font-semibold text-gray-100">Ignite</div>

      {/* Window controls - hidden on macOS where native traffic lights are used */}
      {!isMac && (
        <div className="absolute right-0 flex">
          <WindowControlButton
            icon={Minus}
            onClick={() => window.IgniteNative.minimize()}
            ariaLabel="Minimize"
          />
          <WindowControlButton
            icon={Square}
            onClick={() => window.IgniteNative.maximize()}
            ariaLabel="Maximize"
          />
          <WindowControlButton
            icon={X}
            onClick={() => window.IgniteNative.close()}
            variant="close"
            ariaLabel="Close"
          />
        </div>
      )}
    </div>
  );
}

export default WindowBar;
