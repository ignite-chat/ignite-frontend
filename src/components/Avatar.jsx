const Avatar = ({ user, className = 'h-10' }) => {
  return user.avatar_url ? (
    <img
      className={`cursor-pointer rounded-full border-none bg-transparent select-none ${className}`}
      src={user.avatar_url}
      alt={`${user.name} avatar`}
    />
  ) : (
    <div
      className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-[#2b2d31] font-semibold text-gray-300 select-none ${className}`}
    >
      {user?.username?.slice(0, 1).toUpperCase()}
    </div>
  );
};

export default Avatar;
