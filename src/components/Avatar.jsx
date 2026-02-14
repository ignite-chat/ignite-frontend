const Avatar = ({ user, className = 'h-10' }) => {
  return false ? (
    <img
      className={`cursor-pointer rounded-full border-none bg-transparent ${className}`}
      src={user.avatar_url}
      alt={`${user.name} avatar`}
    />
  ) : (
    <div
      className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-gray-800 text-gray-300 ${className}`}
    >
      {user?.username?.slice(0, 1).toUpperCase()}
    </div>
  );
};

export default Avatar;
