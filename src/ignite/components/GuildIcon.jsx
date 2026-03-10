const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL;

const GuildIcon = ({ guild, size = 8, className = '' }) => {
  const px = size * 4;
  const sizeStyle = { width: px, height: px, fontSize: px * 0.4 };
  const initials = (guild.name || '').slice(0, 2);

  if (guild.icon_file_id) {
    return (
      <img
        src={`${CDN_BASE}/icons/${guild.icon_file_id}`}
        alt={guild.name}
        title={guild.name}
        className={`rounded-full object-cover ${className}`}
        style={sizeStyle}
      />
    );
  }

  return (
    <div
      title={guild.name}
      className={`flex items-center justify-center rounded-full bg-[#2b2d31] text-gray-300 select-none ${className}`}
      style={sizeStyle}
    >
      {initials}
    </div>
  );
};

export default GuildIcon;
