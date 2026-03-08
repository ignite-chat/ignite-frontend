import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiscordChannelsStore } from '../../store/discord-channels.store';
import { useDiscordUsersStore } from '../../store/discord-users.store';

const useNavigateToThread = (thread, guildId, author) => {
  const navigate = useNavigate();

  return useCallback(() => {
    useDiscordChannelsStore.getState().addChannel({
      id: thread.id,
      type: thread.type,
      guild_id: thread.guild_id || guildId,
      name: thread.name,
      parent_id: thread.parent_id,
      last_message_id: thread.last_message_id,
    });

    if (author) {
      useDiscordUsersStore.getState().addUser(author);
    }

    navigate(`/discord/${guildId}/${thread.id}`);
  }, [thread, guildId, author, navigate]);
};

export default useNavigateToThread;
