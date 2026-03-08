const ForumLoadMore = ({ loading, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mx-auto mt-2 rounded-md bg-[#2b2d31] px-6 py-2 text-sm text-gray-300 transition-colors hover:bg-[#32353b] disabled:opacity-50"
    >
      {loading ? (
        <div className="size-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
      ) : (
        'Load more'
      )}
    </button>
  );
};

export default ForumLoadMore;
