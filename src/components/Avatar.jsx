const Avatar = ({ user, className = 'h-10' }) => {
  if (!user) {
    return (
      <div
        className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-gray-800 text-gray-300 ${className}`}
      >
        ?
      </div>
    );
  }

  return (
    user.avatar_url ? (
      <img
        className={`cursor-pointer border-none rounded-full bg-transparent ${className}`}
        src={user.avatar_url}
        alt={`${user.username || 'user'} avatar`}
      />
    ) : (
      <div
        className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-gray-800 text-gray-300 ${className}`}
      >
        {user?.username?.slice(0, 1).toUpperCase()}
      </div>
    )
  );
};

export default Avatar;
