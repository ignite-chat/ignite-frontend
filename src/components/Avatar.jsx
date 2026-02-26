const Avatar = ({ user, className = '', size = null, showStatus = false, showOffline = false }) => {
  const isOnline = user?.status === 'online';
  const isOffline = user?.status === 'offline';

  const sizeStyle = size ? { width: size, height: size } : undefined;

  const avatarContent = user.avatar_url ? (
    <img
      className={`cursor-pointer rounded-full border-none bg-transparent select-none`}
      style={sizeStyle}
      src={user.avatar_url}
      alt={`${user.name} avatar`}
    />
  ) : (
    <div
      className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-[#2b2d31] font-semibold text-gray-300 select-none ${className}`}
      style={sizeStyle}
    >
      {user?.username?.slice(0, 1).toUpperCase()}
    </div>
  );

  const showOnlineDot = showStatus && isOnline;
  const showOfflineDot = showOffline && isOffline;

  if (!showOnlineDot && !showOfflineDot) {
    return avatarContent;
  }

  const dotBaseSize = size || 32;
  const dotOuterSize = Math.min(24, Math.max(14, Math.round(dotBaseSize * 0.42)));
  const gap = dotOuterSize >= 20 ? 4 : 2;
  const dotInnerSize = dotOuterSize - gap * 2;
  const dotOffset = -Math.round(dotOuterSize * 0.08);

  return (
    <div className={`relative ${className}`} style={sizeStyle}>
      {avatarContent}
      {showOnlineDot && (
        <div
          className="absolute z-10 flex items-center justify-center rounded-full bg-[#1a1a1d]"
          style={{ width: dotOuterSize, height: dotOuterSize, bottom: dotOffset, right: dotOffset }}
        >
          <div
            className="rounded-full bg-green-600"
            style={{ width: dotInnerSize, height: dotInnerSize }}
          />
        </div>
      )}
      {showOfflineDot && (
        <div
          className="absolute z-10 flex items-center justify-center rounded-full bg-[#1a1a1d]"
          style={{ width: dotOuterSize, height: dotOuterSize, bottom: dotOffset, right: dotOffset }}
        >
          <div
            className="rounded-full"
            style={{
              width: dotInnerSize,
              height: dotInnerSize,
              borderWidth: gap,
              borderStyle: 'solid',
              borderColor: '#6b7280',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Avatar;
