import ForumPostCard from './ForumPostCard';
import ForumLoadMore from './ForumLoadMore';

const ForumGalleryView = ({ threads, firstMessages, guildId, availableTags, hasMore, loadingMore, onLoadMore }) => {
  return (
    <div className="grid grid-cols-2 gap-2 p-4 xl:grid-cols-4">
      {threads.map((thread) => (
        <ForumPostCard
          key={thread.id}
          thread={thread}
          firstMessage={firstMessages[thread.id]}
          guildId={guildId}
          availableTags={availableTags}
        />
      ))}
      {hasMore && <ForumLoadMore loading={loadingMore} onClick={onLoadMore} />}
    </div>
  );
};

export default ForumGalleryView;
