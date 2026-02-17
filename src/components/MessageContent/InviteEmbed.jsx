import { useState, useEffect } from 'react';
import { InvitesService } from '../../services/invites.service';
import InvitePreviewCard from '../Invite/InvitePreviewCard';

const InviteEmbed = ({ code }) => {
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    InvitesService.getInvitePreview(code)
      .then(setInvite)
      .catch(() => {});
  }, [code]);

  if (!invite) return null;

  return <InvitePreviewCard invite={invite} code={code} />;
};

export default InviteEmbed;
