import { useState, useEffect } from 'react';
import { useInvitesStore } from '@/ignite/store/invites.store';
import InvitePreviewCard from '@/ignite/components/invite/InvitePreviewCard';

const InviteEmbed = ({ code }) => {
  const cachedInvite = useInvitesStore((s) => s.invites[code]);
  const fetchInvite = useInvitesStore((s) => s.fetchInvite);
  const [invite, setInvite] = useState(cachedInvite ?? null);

  useEffect(() => {
    if (cachedInvite) {
      setInvite(cachedInvite);
      return;
    }
    fetchInvite(code)
      .then(setInvite)
      .catch(() => {});
  }, [code, cachedInvite, fetchInvite]);

  if (!invite) return null;

  return <InvitePreviewCard invite={invite} code={code} />;
};

export default InviteEmbed;
