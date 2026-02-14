import { createContext, useContext, useState, useRef, useMemo } from 'react';

export const ChannelContext = createContext();
const ChannelInputContext = createContext();

const ChannelInputProvider = ({ children }) => {
  const [inputMessage, setInputMessage] = useState('');
  const inputRef = useRef(null);

  const value = useMemo(
    () => ({
      inputMessage,
      setInputMessage,
      inputRef,
    }),
    [inputMessage]
  );

  return <ChannelInputContext.Provider value={value}>{children}</ChannelInputContext.Provider>;
};

export const ChannelContextProvider = ({ children }) => {
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [replyingId, setReplyingId] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [memberListOpen, setMemberListOpen] = useState(true);

  const value = useMemo(
    () => ({
      channel,
      setChannel,
      messages,
      setMessages,
      editingId,
      setEditingId,
      replyingId,
      setReplyingId,
      pinnedMessages,
      setPinnedMessages,
      memberListOpen,
      setMemberListOpen,
    }),
    [channel, messages, editingId, replyingId, pinnedMessages, memberListOpen]
  );

  return (
    <ChannelContext.Provider value={value}>
      <ChannelInputProvider>{children}</ChannelInputProvider>
    </ChannelContext.Provider>
  );
};

export const useChannelContext = () => {
  const channelContext = useContext(ChannelContext);
  if (!channelContext) {
    throw new Error('useChannelContext must be used within a ChannelContextProvider');
  }
  return channelContext;
};

export const useChannelInputContext = () => {
  const inputContext = useContext(ChannelInputContext);
  if (!inputContext) {
    throw new Error('useChannelInputContext must be used within a ChannelContextProvider');
  }
  return inputContext;
};
