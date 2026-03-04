const AvatarStack = ({ avatars, maxVisible = 3, size = 16 }) => {
  const visible = avatars.slice(0, maxVisible);
  const remaining = avatars.length - maxVisible;

  return (
    <div className="flex items-center" style={{ marginRight: remaining > 0 ? 0 : undefined }}>
      {visible.map((avatar, i) => (
        <img
          key={avatar.key || i}
          src={avatar.src}
          alt=""
          className="rounded-full border-1 border-[#121214] object-cover"
          style={{
            width: size,
            height: size,
            marginLeft: i > 0 ? -(size / 4) : 0,
            zIndex: visible.length - i,
            position: 'relative',
          }}
        />
      ))}
      {remaining > 0 && (
        <span
          className="flex items-center justify-center rounded-full border-2 border-[#121214] bg-[#2b2d31] text-gray-300"
          style={{
            width: size,
            height: size,
            marginLeft: -(size / 4),
            fontSize: size * 0.45,
            fontWeight: 700,
            position: 'relative',
            zIndex: 0,
          }}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
};

export default AvatarStack;
