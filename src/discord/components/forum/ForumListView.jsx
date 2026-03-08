import ForumPostRow from './ForumPostRow';
import ForumLoadMore from './ForumLoadMore';

const ForumListView = ({ threads, firstMessages, guildId, availableTags, hasMore, loadingMore, onLoadMore }) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {threads.map((thread) => (
        <ForumPostRow
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

export default ForumListView;
