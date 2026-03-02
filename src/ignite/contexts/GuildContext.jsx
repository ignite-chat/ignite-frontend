/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';

export const GuildContext = createContext();

export const GuildContextProvider = ({ children }) => {
  const { guildId } = useParams();

  return (
    <GuildContext.Provider
      value={{
        guildId,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
};

export const useGuildContext = () => {
  const guildContext = useContext(GuildContext);
  if (!guildContext) {
    throw new Error('useGuildContext must be used within a GuildContextProvider');
  }
  return guildContext;
};
